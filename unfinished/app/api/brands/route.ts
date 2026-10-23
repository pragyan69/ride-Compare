import { brandDirectory } from "@/lib/db";

export async function GET() {
  try {
    const rows = await brandDirectory();
    return Response.json(rows.map((b) => ({ name: b.name, products: b.n })), { headers: { "Cache-Control": "public, max-age=300" } });
  } catch { return Response.json([]); }
}
