/** Products with their offers for a list of ids (compare page). */
import { productsByIds, offersByProducts } from "@/lib/db";

export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8);
  try {
    const products = await productsByIds(ids);
    const offers = await offersByProducts(products.map((p) => p.id));
    return Response.json({ products, offers }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Unavailable" }, { status: 503 });
  }
}
