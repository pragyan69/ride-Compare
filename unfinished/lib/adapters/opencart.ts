/** OpenCart 3 storefront with the Journal 3 theme (BikeGear).
 *
 * Endpoint: GET {site.url}/index.php?route=product/catalog&page=N — the
 * store's "Latest Products" listing, which covers the whole catalog (about
 * 30,000 items). bikegear.in/robots.txt (User-agent: *) disallows every URL
 * carrying limit=, sort= or order=, so the store's default page size (20) is
 * the only permitted size: roughly 1,500 pages. Each page is ~1.9 MB
 * uncompressed because the theme inlines ~1.3 MB of CSS (about 130 KB gzipped
 * on the wire). The listing's JSON-LD carries no product data (ItemList is
 * empty) so the HTML cards are parsed instead; product pages are never fetched.
 *
 * Each `.product-layout` card inside `.main-products` gives data-product-id,
 * name, product URL, lazy image (data-src), brand ("Brand:" stat), price as
 * price-new/price-old (sale, old = MRP) or price-normal, and the cart button
 * carries "Out Of Stock" when the item cannot be bought. Variants are not shown
 * on listings (every price is a "from" price), so rows are "Standard". The
 * retailer total and page count come from "Showing A to B of T (P Pages)".
 *
 * site.start may point at a category or manufacturer listing instead; the
 * page parameter is appended to it. site.pageSize adds &limit= and is only
 * safe on stores whose robots.txt allows it (the context throws Blocked
 * otherwise). */
import { Blocked, type Adapter, type RawRow } from "./types";

const DEFAULT_PAGE_SIZE = 20;

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}

/** "₹52,335.09" -> 52335.09; null when there is no usable number. */
function money(text: string | undefined): number | null {
  if (!text) return null;
  const digits = decode(text).replace(/[^\d.]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function attr(card: string, re: RegExp): string {
  const m = card.match(re);
  return m ? m[1] : "";
}

function listingUrl(site: { url: string; start?: string; pageSize?: number }, page: number): string {
  const base = (site.start && /^https?:\/\//.test(site.start) ? site.start : `${site.url.replace(/\/$/, "")}/index.php?route=product/catalog`).replace(/[?&]page=\d+/g, "");
  const sep = base.includes("?") ? "&" : "?";
  const limit = site.pageSize && site.pageSize !== DEFAULT_PAGE_SIZE ? `${sep}limit=${site.pageSize}&page=${page}` : `${sep}page=${page}`;
  return base + limit;
}

/** Resolves a card href to a canonical product URL on the store's host. */
function productUrl(href: string, id: string, origin: string, host: string): string {
  const raw = decode(href).trim();
  try {
    const u = new URL(raw, origin + "/");
    if (u.hostname.replace(/^www\./, "") !== host.replace(/^www\./, "")) throw new Error("foreign host");
    if (/route=product\/product/.test(u.search)) {
      const pid = u.searchParams.get("product_id") || id;
      return `${origin}/index.php?route=product/product&product_id=${pid}`;
    }
    u.hash = "";
    for (const k of ["sort", "order", "limit", "page"]) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return `${origin}/index.php?route=product/product&product_id=${id}`;
  }
}

export const adapter: Adapter = {
  platform: "opencart",
  async fetchPage(site, page, ctx) {
    const origin = new URL(site.url).origin;
    const host = new URL(site.url).hostname;
    const pageSize = site.pageSize || DEFAULT_PAGE_SIZE;
    const url = listingUrl(site, page);
    const { status, text } = await ctx.fetchText(url);
    if (status === 404 && page > 1) return { rows: [], done: true };
    if (status !== 200) throw new Blocked(`Catalog listing unavailable (HTTP ${status})`);

    // Only the main grid; Journal side modules also render .product-layout cards.
    const gridStart = text.indexOf('class="main-products');
    const gridEnd = gridStart >= 0 ? text.indexOf('class="pagination"', gridStart) : -1;
    const grid = gridStart >= 0 ? text.slice(gridStart, gridEnd > 0 ? gridEnd : undefined) : text;

    const starts: number[] = [];
    const cardRe = /<div class="product-layout[^"]*"/g;
    for (let m = cardRe.exec(grid); m; m = cardRe.exec(grid)) starts.push(m.index);
    const cards = starts.map((s, i) => grid.slice(s, i + 1 < starts.length ? starts[i + 1] : undefined));

    const showing = text.match(/Showing\s+\d+\s+to\s+\d+\s+of\s+(\d+)\s*\((\d+)\s+Pages?\)/i);
    const total = showing ? Number(showing[1]) : null;
    const pages = showing ? Number(showing[2]) : null;

    if (!cards.length) {
      if (page > 1 && (pages === null || page > pages)) return { rows: [], done: true, total };
      if (page === 1 && !/product-layout/.test(text)) throw new Error("No product cards found on the catalog listing; the theme markup may have changed");
    }

    const rows: RawRow[] = [];
    for (const card of cards) {
      const id = attr(card, /data-product-id="(\d+)"/) || attr(card, /name="product_id"\s+value="(\d+)"/);
      const nameMatch = card.match(/<div class="name">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const name = clean(decode(nameMatch?.[2] || attr(card, /class="product-img[^"]*"\s+title="([^"]*)"/)));
      if (!name) continue;
      const href = nameMatch?.[1] || attr(card, /<a href="([^"]+)" class="product-img/);
      const sourceId = id || href.replace(/^.*\//, "") || name;

      const priceNew = money(attr(card, /class="price-new">([^<]+)</));
      const priceOld = money(attr(card, /class="price-old">([^<]+)</));
      const priceNormal = money(attr(card, /class="price-normal">([^<]+)</));
      const price = priceNew ?? priceNormal ?? priceOld;
      if (!price) continue;
      const mrp = priceNew && priceOld && priceOld > priceNew ? priceOld : null;

      const brand = clean(decode(attr(card, /<span class="stats-label">\s*Brand:\s*<\/span>\s*<span>([\s\S]*?)<\/span>/)));
      const image = decode(attr(card, /<img[^>]+class="[^"]*img-first[^"]*"[^>]*data-src="([^"]+)"/) || attr(card, /data-src="(https?:\/\/[^"\s]+)"/) || attr(card, /<img[^>]+src="(https?:\/\/[^"\s]+)"/));
      const outOfStock = /aria-label="Out Of Stock"|title="Out Of Stock"|>\s*Out Of Stock\s*</i.test(card);

      rows.push({
        sourceId,
        name,
        brand,
        kind: "",
        tags: "",
        variant: "Standard",
        image,
        price,
        mrp,
        inStock: !outOfStock,
        url: productUrl(href, id, origin, host),
        variantId: null,
        variantCount: null,
        barcode: "",
      });
    }

    const done = pages !== null ? page >= pages : cards.length < pageSize;
    return { rows, done, total };
  },
};
