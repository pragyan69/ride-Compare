/** Owner-only manual refresh. Accepts a signed-in owner session or, when the
 * REFRESH_TOKEN variable is configured, `Authorization: Bearer <token>` so an
 * external scheduler can drive the same engine if cron triggers are not
 * available on the host. Body (optional JSON): { pages?: number, stores?: string[], force?: boolean, seconds?: number }. */
import { env } from "cloudflare:workers";
import { json, failure, guard } from "@/lib/api";
import { runRefresh, DEFAULT_PAGE_BUDGET } from "@/lib/refresh";

export async function POST(req: Request) {
  try {
    const token = (env as { REFRESH_TOKEN?: string }).REFRESH_TOKEN;
    const header = req.headers.get("authorization") || "";
    if (!(token && header === `Bearer ${token}`)) await guard(req);
    const db = (env as { DB?: D1Database }).DB;
    if (!db) throw new Error("The catalog database is unavailable.");
    let body: { pages?: number; stores?: string[]; force?: boolean; seconds?: number } = {};
    try { body = await req.json(); } catch { /* no body */ }
    const summary = await runRefresh({
      db, trigger: "manual",
      pageBudget: Math.min(Math.max(Number(body.pages) || DEFAULT_PAGE_BUDGET, 1), 200),
      storeIds: Array.isArray(body.stores) ? body.stores.map(String) : undefined,
      force: Boolean(body.force),
      maxMs: Math.min(Math.max(Number(body.seconds) || 240, 30), 600) * 1000,
      log: (m) => console.log(`[refresh] ${m}`),
    });
    return json(summary);
  } catch (e) { return failure(e); }
}
