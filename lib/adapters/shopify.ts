/** Shopify public catalog: GET /products.json?limit=250&page=N. Every product
 * becomes one row for its cheapest available variant (all variants are counted
 * in variantCount). compare_at_price becomes the MRP. */
import { Blocked, type Adapter, type RawRow } from "./types";
import { clean } from "../rules";

type Variant = { id: number; title: string; price: string; compare_at_price: string | null; available: boolean; barcode: string | null };
type Product = { id: number; title: string; handle: string; vendor: string; product_type: string; tags: string[] | string; images: { src: string }[]; variants: Variant[] };

const money = (v: unknown) => { const n = Number(String(v ?? "").replace(/[₹,\s]/g, "")); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null; };

export const adapter: Adapter = {
  platform: "shopify",
  async fetchPage(site, page, ctx) {
    const limit = site.pageSize || 250;
    const { status, data } = await ctx.fetchJson<{ products?: Product[] }>(`${site.url}/products.json?limit=${limit}&page=${page}`);
    if (status !== 200 || !data || !Array.isArray(data.products)) throw new Blocked(`Public catalog feed unavailable (HTTP ${status})`);
    const rows: RawRow[] = [];
    for (const item of data.products) {
      const title = clean(item.title);
      if (!title) continue;
      const valid = (item.variants || []).map((v) => ({ v, price: money(v.price) })).filter((x): x is { v: Variant; price: number } => x.price !== null);
      if (!valid.length) continue;
      valid.sort((a, b) => Number(!a.v.available) - Number(!b.v.available) || a.price - b.price);
      const { v, price } = valid[0];
      let variant = clean(v.title);
      if (!variant || variant.toLowerCase() === "default title") variant = "Standard";
      const mrp = money(v.compare_at_price);
      rows.push({
        sourceId: String(item.id),
        name: title,
        brand: clean(item.vendor),
        kind: clean(item.product_type),
        tags: Array.isArray(item.tags) ? item.tags.join(" ") : clean(item.tags),
        variant,
        image: item.images?.[0]?.src || "",
        price,
        mrp: mrp && mrp > price ? mrp : null,
        inStock: Boolean(v.available),
        url: `${site.url}/products/${item.handle}?variant=${v.id}`,
        variantId: String(v.id),
        variantCount: valid.length,
        barcode: clean(v.barcode),
      });
    }
    return { rows, done: data.products.length < limit };
  },
};
