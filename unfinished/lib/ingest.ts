/** Row normalisation and storage shared by the crawler engine and feed imports.
 * Deduplication: every observed listing is mapped to a product key. Validated
 * barcodes match first; otherwise brand + normalised name + variant. Listings
 * that cannot be identified confidently stay store-specific so unrelated
 * products are never merged. One offer per store per product is kept. */
import type { RawRow, Site } from "./adapters/types";
import { brand as normalizeBrand, categorize, detectBike, gtin, matchName, norm, slug, GENERIC_VARIANTS } from "./rules";

const CHUNK = 80;

async function sha1(text: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type NormalizedRow = {
  key: string; matchType: string; name: string; brand: string; category: string; variant: string; image: string; bike: { label: string; make: string } | null;
  variantCount: number | null; price: number; mrp: number | null; inStock: boolean | null; url: string; sourceId: string; variantId: string | null;
};

/** Turns raw adapter rows into catalog rows with stable product keys. */
export async function normalizeRows(site: Site, rows: RawRow[]): Promise<NormalizedRow[]> {
  const out = new Map<string, NormalizedRow>();
  const barcodeOwners = new Map<string, string>();
  for (const r of rows) {
    const g = gtin(r.barcode || "");
    if (g) { const owner = barcodeOwners.get(g); if (owner && owner !== r.sourceId) barcodeOwners.set(g, "__conflict__"); else if (!owner) barcodeOwners.set(g, r.sourceId); }
  }
  for (const r of rows) {
    if (!(r.price > 0) || !r.name || !r.url) continue;
    const category = categorize(r.name, r.kind || "", r.tags || "");
    if (!category) continue;
    const b = normalizeBrand(r.brand, r.name, site.brand || "");
    const variant = r.variant || "Standard";
    const generic = GENERIC_VARIANTS.has(variant.toLowerCase());
    let key: string, matchType: string;
    const g = gtin(r.barcode || "");
    const name = matchName(r.name, b);
    if (g && b !== "Unspecified" && barcodeOwners.get(g) !== "__conflict__") { key = `gtin-${slug(b)}-${g}`; matchType = "barcode"; }
    else if (r.id) { key = r.id; matchType = "feed"; }
    else if (b !== "Unspecified" && (!generic || name.split(" ").length >= 3)) { key = "exact-" + (await sha1(`${norm(b)}|${name}|${generic ? "" : norm(variant)}`)).slice(0, 20); matchType = "exact"; }
    else { key = `${site.id}-${r.sourceId}`; matchType = "retailer"; }
    const row: NormalizedRow = {
      key, matchType, name: r.name, brand: b, category, variant: generic && variant.toLowerCase() === "default title" ? "Standard" : variant, image: r.image || "",
      bike: detectBike(r.name), variantCount: r.variantCount ?? null, price: r.price, mrp: r.mrp ?? null, inStock: r.inStock, url: r.url, sourceId: r.sourceId, variantId: r.variantId ?? null,
    };
    const existing = out.get(key);
    if (!existing || row.price < existing.price) out.set(key, row);
  }
  return [...out.values()];
}

function chunks<T>(arr: T[], size: number) { const out: T[][] = []; for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out; }

/** Writes normalised rows for one store, recording price changes and
 * recomputing per-product aggregates. Returns the number of rows written. */
export async function ingest(db: D1Database, site: { id: string; name: string }, rows: NormalizedRow[], runId: string, source = "crawl") {
  if (!rows.length) return 0;
  const now = Date.now();
  const ids = rows.map((r) => `${site.id}:${r.key}`);
  const previous = new Map<string, number>();
  for (const part of chunks(ids, CHUNK)) {
    const r = await db.prepare(`SELECT id, price FROM offers WHERE id IN (${part.map(() => "?").join(",")})`).bind(...part).all<{ id: string; price: number }>();
    for (const row of r.results) previous.set(row.id, row.price);
  }
  const statements: D1PreparedStatement[] = [];
  const upsertOffer = db.prepare(`INSERT INTO offers (id, store_id, product_id, store_name, price, mrp, shipping, in_stock, url, image, checked_at, source, source_id, variant_id, run_id)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET price=excluded.price, mrp=excluded.mrp, in_stock=excluded.in_stock, url=excluded.url, image=excluded.image, checked_at=excluded.checked_at, source=excluded.source, source_id=excluded.source_id, variant_id=excluded.variant_id, run_id=excluded.run_id, store_name=excluded.store_name`);
  const upsertProduct = db.prepare(`INSERT INTO products (id, name, brand, category, variant, image, variant_count, match_type, bike, bike_make, search, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET image=CASE WHEN products.image='' THEN excluded.image ELSE products.image END, variant_count=COALESCE(products.variant_count, excluded.variant_count), bike=COALESCE(products.bike, excluded.bike), bike_make=COALESCE(products.bike_make, excluded.bike_make), updated_at=excluded.updated_at`);
  const history = db.prepare("INSERT INTO price_history (product_id, store_id, price, seen_at) VALUES (?, ?, ?, ?)");
  for (const r of rows) {
    const id = `${site.id}:${r.key}`;
    const search = `${r.name} ${r.brand} ${r.category} ${r.variant} ${r.bike?.label || ""} ${r.bike?.make || ""}`.toLowerCase().replace(/\s+/g, " ");
    statements.push(upsertProduct.bind(r.key, r.name, r.brand, r.category, r.variant, r.image, r.variantCount, r.matchType, r.bike?.label || null, r.bike?.make || null, search, now));
    statements.push(upsertOffer.bind(id, site.id, r.key, site.name, r.price, r.mrp, r.inStock === null ? null : r.inStock ? 1 : 0, r.url, r.image || null, now, source, r.sourceId, r.variantId, runId));
    const before = previous.get(id);
    if (before === undefined || Math.abs(before - r.price) >= 0.5) statements.push(history.bind(r.key, site.id, r.price, now));
  }
  for (const part of chunks(statements, 100)) await db.batch(part);
  await recomputeAggregates(db, rows.map((r) => r.key), now);
  return rows.length;
}

export async function recomputeAggregates(db: D1Database, productIds: string[], now = Date.now()) {
  const unique = [...new Set(productIds)];
  for (const part of chunks(unique, CHUNK)) {
    const marks = part.map(() => "?").join(",");
    await db.batch([
      db.prepare(`UPDATE products SET
        min_price = COALESCE((SELECT MIN(price) FROM offers o WHERE o.product_id = products.id AND o.in_stock IS NOT 0), (SELECT MIN(price) FROM offers o WHERE o.product_id = products.id)),
        mrp = (SELECT MAX(mrp) FROM offers o WHERE o.product_id = products.id),
        offer_count = (SELECT COUNT(*) FROM offers o WHERE o.product_id = products.id),
        store_count = (SELECT COUNT(DISTINCT store_id) FROM offers o WHERE o.product_id = products.id),
        best_store_id = (SELECT store_id FROM offers o WHERE o.product_id = products.id ORDER BY (o.in_stock IS NOT 0) DESC, o.price ASC LIMIT 1),
        best_store_name = (SELECT store_name FROM offers o WHERE o.product_id = products.id ORDER BY (o.in_stock IS NOT 0) DESC, o.price ASC LIMIT 1),
        best_url = (SELECT url FROM offers o WHERE o.product_id = products.id ORDER BY (o.in_stock IS NOT 0) DESC, o.price ASC LIMIT 1),
        in_stock = (SELECT MAX(CASE WHEN in_stock = 1 THEN 1 WHEN in_stock IS NULL THEN 0 ELSE 0 END) FROM offers o WHERE o.product_id = products.id),
        spread = (SELECT COALESCE(MAX(price) - MIN(price), 0) FROM offers o WHERE o.product_id = products.id AND o.in_stock IS NOT 0),
        updated_at = ?
        WHERE id IN (${marks})`).bind(now, ...part),
      db.prepare(`UPDATE products SET discount = CASE WHEN mrp IS NOT NULL AND min_price IS NOT NULL AND mrp > min_price THEN CAST(ROUND((mrp - min_price) * 100.0 / mrp) AS INTEGER) ELSE 0 END WHERE id IN (${marks})`).bind(...part),
      db.prepare(`DELETE FROM products WHERE offer_count = 0 AND id IN (${marks})`).bind(...part),
    ]);
  }
}

