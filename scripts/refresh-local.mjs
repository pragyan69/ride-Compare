#!/usr/bin/env node
/** Drives the catalog refresh against a running local preview until every
 * enabled store has been collected. Usage:
 *   node scripts/refresh-local.mjs [--base http://127.0.0.1:5173] [--pages 30] [--stores a,b] [--force] [--max-calls 200]
 * The local preview signs the request in with the Sites development cookie. */
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "1"] : [])).filter((x) => x.length));
const base = args.base || "http://127.0.0.1:5173";
// Node's fetch gives up after five minutes without response headers, so keep each call short.
const pages = Math.min(Number(args.pages) || 40, 80);
// Server-side wall clock; one slow page (up to 90 s) may follow, which still fits inside the client limit.
const seconds = 170;
const maxCalls = Number(args["max-calls"]) || 200;
const stores = args.stores ? args.stores.split(",") : undefined;

const signin = await fetch(`${base}/signin-with-chatgpt?return_to=%2F`, { redirect: "manual" });
const cookie = (signin.headers.get("set-cookie") || "").split(";")[0];
if (!cookie) { console.error("Could not obtain the local sign-in cookie; is the dev server running?"); process.exit(1); }

for (let call = 1; call <= maxCalls; call++) {
  const started = Date.now();
  const r = await fetch(`${base}/api/refresh`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ pages, stores, seconds, force: args.force === "1" && call === 1 }) });
  const s = await r.json();
  if (!r.ok) { console.error("refresh failed:", s.error || r.status); process.exit(1); }
  const line = s.stores.map((x) => `${x.id}:${x.status}(${x.pages}p/${x.rows}r${x.note ? " " + x.note.slice(0, 60) : ""})`).join(" ");
  console.log(`[${call}] ${s.pages} pages, ${s.rows} rows, ${Math.round((Date.now() - started) / 1000)}s ${line || "nothing due"}`);
  if (!s.stores.length || s.stores.every((x) => x.status !== "in-progress" && x.status !== "retry") && s.pages === 0) break;
  if (s.stores.every((x) => x.status !== "in-progress" && x.status !== "retry") && !stores) {
    // Everything that was due finished; one more pass confirms nothing is left.
    const again = await fetch(`${base}/api/refresh`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ pages: 1 }) });
    const t = await again.json();
    if (!t.stores.length) break;
  }
}
const status = await fetch(`${base}/api/status`, { headers: { Cookie: cookie } }).then((r) => r.json());
for (const st of status.stores) if (st.status !== "pending") console.log(`${st.id.padEnd(16)} ${st.status.padEnd(12)} ${String(st.product_count).padStart(6)} offers ${st.note ? "· " + st.note.slice(0, 90) : ""}`);
