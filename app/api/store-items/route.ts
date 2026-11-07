import { storeCards } from "@/lib/shop";
import { categoryCounts, filterStore, PER_PAGE } from "@/lib/store-query";

/** The next batch of shop products for infinite scroll. Same query string as /store, plus ?page=. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams);
  const page = Math.max(1, Math.min(10_000, Number(sp.page) || 1));
  const all = await storeCards();
  const { items } = filterStore(all, categoryCounts(all), sp);
  const start = (page - 1) * PER_PAGE;
  return Response.json({ items: items.slice(start, start + PER_PAGE), total: items.length });
}
