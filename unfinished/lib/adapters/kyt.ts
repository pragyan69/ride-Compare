/** KYT India: an Angular SPA at www.kytindia.com whose data comes from an
 * unauthenticated Laravel JSON API at https://kytindia.com/server/public/api
 * (discovered in the main bundle; every call is a POST with a JSON body and
 * needs no token or cookie).
 *
 * Endpoint: POST products/get-all-product_list-master-data  body {}
 *   -> { data: [{ id, name, sub_category_name, model_series_name, cost: { mrp },
 *                 img: [relative paths], url, is_active, stocks: { items: [{ size, units }], total_units } }],
 *        servercode: "SUCCESS" }
 * One ~190 KB response holds the whole catalog (~260 items), so page 1 returns
 * every row with done=true and later pages return nothing without a request.
 * The public pages use products/get-product_list-with-sub_category, which
 * returns exactly the is_active=1 subset of this list (verified), so hidden
 * items are dropped here the same way.
 *
 * Known limits: cost.mrp is the only price KYT shows (no sale price), so mrp is
 * null. The stock table currently reports 0 units for every size of every
 * helmet and the SPA then hides "add to cart", so inStock is false until the
 * retailer maintains stock; sizes with units become the variant label. Images
 * live under https://kytindia.com/server/public/uploads/ and product pages are
 * {site.url}/product/<uuid> (Angular route product/:products_id). */
import { Blocked, type Adapter, type RawRow } from "./types";

const API_BASE = "https://kytindia.com/server/public/api";
const STORAGE_BASE = "https://kytindia.com/server/public/uploads/";

type Item = {
  id: string;
  name?: string;
  sub_category_name?: string;
  model_series_name?: string;
  cost?: { mrp?: number | string | null } | null;
  img?: string[] | null;
  url?: string | null;
  is_active?: number | boolean | null;
  stocks?: { items?: { size?: string; units?: number | string | null }[] | null; total_units?: number | string | null } | null;
};
type Response = { data?: Item[]; servercode?: string };

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

export const adapter: Adapter = {
  platform: "kyt",
  async fetchPage(site, page, ctx) {
    if (page > 1) return { rows: [], done: true };
    const { status, data } = await ctx.fetchJson<Response>(`${API_BASE}/products/get-all-product_list-master-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Origin: site.url, Referer: `${site.url}/` },
      body: "{}",
    });
    if (status !== 200 || !data || !Array.isArray(data.data)) throw new Blocked(`KYT product API unavailable (HTTP ${status})`);
    if (data.servercode && data.servercode !== "SUCCESS") throw new Blocked(`KYT product API answered ${data.servercode}`);

    const brand = site.brand || "KYT";
    const base = site.url.replace(/\/$/, "");
    const rows: RawRow[] = [];
    for (const item of data.data) {
      // Public listings show only is_active === 1 (null/0 are hidden; verified per sub-category).
      if (!item || !item.id || Number(item.is_active) !== 1) continue;
      const name = clean(item.name);
      if (!name) continue;
      const price = Number(item.cost?.mrp);
      if (!Number.isFinite(price) || price <= 0) continue;

      const sizes = (item.stocks?.items || []).filter((s) => s && clean(s.size));
      const available = sizes.filter((s) => Number(s.units) > 0).map((s) => clean(s.size));
      const totalUnits = Number(item.stocks?.total_units ?? available.length);
      // KYT sells through dealers and reports zero units online for every helmet,
    // so stock is reported as unknown unless the API shows units.
    const inStock = item.stocks && (totalUnits > 0 || available.length > 0) ? true : null;
      const img = (item.img || []).find((p) => clean(p));
      const series = clean(item.model_series_name);
      const sub = clean(item.sub_category_name);

      rows.push({
        sourceId: item.id,
        name,
        brand,
        kind: ["Helmet", sub, series].filter(Boolean).join(" / "),
        tags: clean(item.url),
        variant: available.length ? available.join(", ") : "Standard",
        image: img ? STORAGE_BASE + encodeURI(img.replace(/^\/+/, "")) : "",
        price,
        mrp: null,
        inStock,
        url: `${base}/product/${item.id}`,
        variantId: null,
        variantCount: sizes.length || null,
        barcode: "",
      });
    }
    return { rows, done: true, total: rows.length };
  },
};
