/** Search-box typeahead: a few matching products and brands. */
import { suggest } from "@/lib/db";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  try {
    return Response.json(await suggest(q), { headers: { "Cache-Control": "public, max-age=120" } });
  } catch {
    return Response.json({ products: [], brands: [] });
  }
}
