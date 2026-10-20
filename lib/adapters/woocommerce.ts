/** WooCommerce Store API: GET /wp-json/wc/store/v1/products?per_page=100&page=N.
 * The X-WP-Total header gives the retailer-reported total. Sites whose
 * robots.txt forbids per_page use the default page size (site.pageSize=10 and
 * no per_page parameter). regular_price becomes the MRP. */
import { Blocked, type Adapter, type RawRow } from "./types";
import { clean } from "../rules";

type Term = { name: string };
type Product = {
  id: number; name: string; type: string; variation: string; sku: string; permalink: string; parent: number;
  is_in_stock: boolean; is_password_protected?: boolean;
  prices: { price: string; regular_price: string; sale_price: string; currency_code: string; currency_minor_unit: number; price_range: { min_amount: string; max_amount: string } | null };
  images: { src: string }[]; brands?: Term[]; categories?: Term[]; tags?: Term[];
  attributes?: { name: string; terms: Term[] }[]; variations?: unknown[];
};

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#8211;/g, "–").replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;|&#8221;/g, '"').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]+>/g, " ");

export const adapter: Adapter = {
  platform: "woocommerce",
  async fetchPage(site, page, ctx) {
    const perPage = site.pageSize || 100;
    const query = site.pageSize && site.pageSize <= 10 ? `?page=${page}` : `?per_page=${perPage}&page=${page}`;
    const { status, data, headers } = await ctx.fetchJson<Product[]>(`${site.url}/wp-json/wc/store/v1/products${query}`);
    if (status === 400 && page > 1) return { rows: [], done: true };
    if (status !== 200 || !Array.isArray(data)) throw new Blocked(`Public Store API unavailable (HTTP ${status})`);
    const total = Number(headers.get("x-wp-total")) || null;
    const totalPages = Number(headers.get("x-wp-totalpages")) || null;
    const rows: RawRow[] = [];
    for (const item of data) {
      if (item.is_password_protected) continue;
      const p = item.prices;
      if (!p || p.currency_code !== "INR") continue;
      const unit = 10 ** (Number(p.currency_minor_unit) || 0);
      const toMoney = (v: string | undefined | null) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round((n / unit) * 100) / 100 : null; };
      const price = toMoney(p.price_range?.min_amount) ?? toMoney(p.price);
      if (!price) continue;
      const mrp = toMoney(p.regular_price);
      const name = clean(decode(item.name));
      if (!name) continue;
      const attrs = item.attributes || [];
      const brandAttr = attrs.find((a) => /^(brand|manufacturer|vendor)$/i.test(a.name));
      const brandText = item.brands?.[0]?.name || brandAttr?.terms?.[0]?.name || "";
      const variant = clean(decode(item.variation || "")) || (item.type === "variable" ? "Check size / colour at store" : "Standard");
      rows.push({
        sourceId: String(item.id),
        name,
        brand: clean(decode(brandText)),
        kind: (item.categories || []).map((c) => decode(c.name)).join(" "),
        tags: (item.tags || []).map((t) => decode(t.name)).join(" "),
        variant,
        image: item.images?.[0]?.src || "",
        price,
        mrp: mrp && mrp > price ? mrp : null,
        inStock: typeof item.is_in_stock === "boolean" ? item.is_in_stock : null,
        url: item.permalink,
        variantId: null,
        variantCount: item.variations?.length || null,
        barcode: "",
      });
    }
    const done = totalPages ? page >= totalPages : data.length < perPage;
    return { rows, done, total };
  },
};
