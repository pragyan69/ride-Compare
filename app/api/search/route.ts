/** JSON search used by the WebMCP tools and the compare page. Same filters as /gear. */
import { searchProducts } from "@/lib/db";

export async function GET(req: Request) {
  const s = new URL(req.url).searchParams;
  try {
    const result = await searchProducts({
      q: s.get("q") || undefined, category: s.get("category") || undefined, brand: s.get("brand") || undefined, store: s.get("store") || undefined,
      bike: s.get("bike") || undefined, sort: s.get("sort") || undefined, maxPrice: Number(s.get("maxPrice")) || undefined,
      inStock: s.get("inStock") === "1", multi: s.get("multi") === "1", deals: s.get("deals") === "1", page: Number(s.get("page")) || 1, size: Number(s.get("size")) || 24,
    });
    return Response.json(result, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Search unavailable." }, { status: 503 });
  }
}
