/** Magento 2 storefront GraphQL: POST /graphql with the public products query.
 * Used for Store4Riders. 50 products per page; url_key + url_suffix form the
 * product URL. regular_price becomes the MRP. */
import { Blocked, type Adapter, type RawRow } from "./types";
import { clean } from "../rules";

type Item = {
  name: string; sku: string; url_key: string; url_suffix: string | null; stock_status: string; __typename: string;
  image: { url: string } | null; categories: { name: string }[] | null;
  price_range: { minimum_price: { regular_price: { value: number }; final_price: { value: number; currency: string } } };
};

export const adapter: Adapter = {
  platform: "magento-graphql",
  async fetchPage(site, page, ctx) {
    const pageSize = site.pageSize || 50;
    const query = `{ products(filter:{}, pageSize:${pageSize}, currentPage:${page}){ total_count page_info{ total_pages } items{ name sku url_key url_suffix stock_status __typename image{url} categories{name} price_range{minimum_price{regular_price{value} final_price{value currency}}} } } }`;
    const { status, data } = await ctx.fetchJson<{ data?: { products?: { total_count: number; page_info: { total_pages: number }; items: Item[] } }; errors?: { message: string }[] }>(`${site.url}/graphql`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ query }),
    });
    const products = data?.data?.products;
    if (status !== 200 || !products) throw new Blocked(`Storefront GraphQL unavailable (HTTP ${status}${data?.errors?.[0] ? ": " + data.errors[0].message : ""})`);
    const rows: RawRow[] = [];
    for (const item of products.items || []) {
      const fp = item.price_range?.minimum_price?.final_price;
      if (!fp || fp.currency !== "INR" || !(fp.value > 0)) continue;
      const name = clean(item.name);
      if (!name) continue;
      const mrp = item.price_range.minimum_price.regular_price?.value || null;
      rows.push({
        sourceId: item.sku || item.url_key,
        name,
        brand: "",
        kind: (item.categories || []).map((c) => c.name).join(" "),
        variant: item.__typename === "ConfigurableProduct" ? "Check size / colour at store" : "Standard",
        image: item.image?.url || "",
        price: fp.value,
        mrp: mrp && mrp > fp.value ? mrp : null,
        inStock: item.stock_status === "IN_STOCK" ? true : item.stock_status === "OUT_OF_STOCK" ? false : null,
        url: `${site.url}/${item.url_key}${item.url_suffix ?? ".html"}`,
        variantId: null,
        variantCount: null,
        barcode: "",
      });
    }
    const totalPages = products.page_info?.total_pages || 1;
    return { rows, done: page >= totalPages, total: products.total_count };
  },
};
