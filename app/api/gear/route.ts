import { catalogue, snapshot } from "@/lib/catalog-server";
import { rankedOffers, type Product } from "@/lib/catalog";

const pageSize = 24;
const cheapest = (p: Product) => rankedOffers(p)[0]?.price ?? Infinity;

/** Filters the catalog on the server so the browser only downloads one page of products.
 *  Serves what RideCompare stocks (the curated catalogue) unless `all=1` asks for everything the crawler tracks. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const all = sp.get("all") === "1";
  const { products, stores, summary } = await (all ? snapshot() : catalogue());
  const category = sp.get("category") ?? "All gear";
  const q = (sp.get("q") ?? "").toLowerCase().trim();
  const brands = sp.getAll("brand");
  const store = sp.get("store") ?? "all";
  const stock = sp.get("stock") === "1";
  const multi = sp.get("multi") === "1";
  const max = Number(sp.get("max")) || 0;
  const sort = sp.get("sort") ?? "featured";
  const page = Math.max(1, Number(sp.get("page")) || 1);

  // Everything except the brand filter, so the brand list keeps its counts while brands are ticked.
  const base = products.filter(
    (p) =>
      (category === "All gear" || p.category === category) &&
      (store === "all" || p.offers.some((o) => o.storeId === store)) &&
      (!stock || p.offers.some((o) => o.inStock === true)) &&
      (!multi || p.offers.length > 1) &&
      (!max || p.offers.some((o) => o.price <= max)) &&
      (!q || `${p.name} ${p.brand} ${p.category} ${p.variant}`.toLowerCase().includes(q)),
  );
  const rows = brands.length ? base.filter((p) => brands.includes(p.brand)) : base;
  if (sort === "low") rows.sort((a, b) => cheapest(a) - cheapest(b));
  if (sort === "high") rows.sort((a, b) => cheapest(b) - cheapest(a));
  if (sort === "stores") rows.sort((a, b) => b.offers.length - a.offers.length);

  const brandCounts = new Map<string, number>();
  for (const p of base) if (p.brand !== "Unspecified") brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + 1);
  const storeIds = new Set(products.flatMap((p) => p.offers.map((o) => o.storeId)));

  return Response.json(
    {
      total: rows.length,
      totalProducts: products.length,
      scope: all ? "all" : "catalogue",
      catalogProductCount: all ? products.length : (summary?.catalogProductCount ?? products.length),
      curatedCount: all ? (await catalogue()).products.length : products.length,
      page,
      pageSize,
      products: rows.slice((page - 1) * pageSize, page * pageSize),
      brands: [...brandCounts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
      stores: stores.filter((s) => storeIds.has(s.id)).sort((a, b) => a.name.localeCompare(b.name)),
      generatedAt: summary?.generatedAt,
    },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" } },
  );
}
