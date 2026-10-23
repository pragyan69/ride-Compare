/** Collection engine. Runs inside the Worker on a cron trigger or from the
 * owner-only /api/refresh route. Each call spends a page budget on the stalest
 * enabled stores, resuming any store that was mid-way through its catalog.
 *
 * Deduplication: every observed listing is mapped to a product key. Validated
 * barcodes match first; otherwise brand + normalised name + variant. Listings
 * that cannot be identified confidently stay store-specific so unrelated
 * products are never merged. One offer per store per product is kept; when a
 * store's pass completes, offers it no longer lists are removed. */
import sitesFile from "../crawler/sites.json";
import { ADAPTERS, Blocked, type Site } from "./adapters";
import { createContext } from "./adapters/http";
import { ingest, normalizeRows, recomputeAggregates } from "./ingest";
import { ensureSchema } from "./schema";

export type RefreshOptions = {
  db: D1Database;
  trigger: "cron" | "manual" | "local";
  /** Catalog pages to fetch in this invocation across all stores. */
  pageBudget?: number;
  /** A store is refreshed again once this many milliseconds have passed. */
  intervalMs?: number;
  /** Refresh these stores regardless of age. */
  storeIds?: string[];
  /** Wall-clock budget; no new page starts after this many milliseconds. */
  maxMs?: number;
  force?: boolean;
  log?: (m: string) => void;
  fetchImpl?: typeof fetch;
};

export { ingest, normalizeRows, recomputeAggregates } from "./ingest";

export type RefreshSummary = { pages: number; rows: number; stores: { id: string; status: string; pages: number; rows: number; note?: string }[]; durationMs: number };

const SITES = sitesFile as Site[];

export const DEFAULT_INTERVAL_MS = 2 * 60 * 60 * 1000;
export const DEFAULT_PAGE_BUDGET = 40;
/** Some stores take over 30 s per page, so invocations also stop on time. */
export const DEFAULT_MAX_MS = 4 * 60 * 1000;

/** Keeps the stores table in step with crawler/sites.json without touching run state. */
export async function syncRegistry(db: D1Database) {
  const upsert = db.prepare(`INSERT INTO stores (id, name, website, platform, brand, enabled, builtin, status, note)
    VALUES (?, ?, ?, ?, ?, ?, 1, 'pending', ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, website=excluded.website, platform=excluded.platform, brand=excluded.brand, enabled=excluded.enabled, builtin=1,
      note=CASE WHEN excluded.enabled = 0 THEN excluded.note ELSE stores.note END, status=CASE WHEN excluded.enabled = 0 THEN 'blocked' ELSE stores.status END`);
  await db.batch(SITES.map((s) => upsert.bind(s.id, s.name, s.url, s.platform, s.brand || null, s.enabled === false ? 0 : 1, s.note || null)));
}

type StoreState = { id: string; run_id: string | null; next_page: number; run_rows: number; last_success_at: number | null; pages: number; enabled: number; platform: string; lock_until: number | null; run_errors: number; run_skipped: number };
/** Attempts per page before the page is skipped for this pass. */
const MAX_RUN_ERRORS = 3;
/** Skipped pages per pass before the pass is abandoned (host is down). */
const MAX_SKIPPED = 5;
/** A store stays locked this long after its last page unless released. */
const LOCK_MS = 10 * 60 * 1000;
/** Stores read at the same time; each host is still paced separately. */
const CONCURRENCY = 4;

export async function runRefresh(options: RefreshOptions): Promise<RefreshSummary> {
  const { db } = options;
  const log = options.log || (() => {});
  const started = Date.now();
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const shared = { budget: options.pageBudget ?? DEFAULT_PAGE_BUDGET };
  const deadline = started + (options.maxMs ?? DEFAULT_MAX_MS);
  const outOfTime = () => Date.now() > deadline;
  await ensureSchema(db);
  await syncRegistry(db);
  const states = (await db.prepare("SELECT id, run_id, next_page, run_rows, last_success_at, pages, enabled, platform, lock_until, run_errors, run_skipped FROM stores").all<StoreState>()).results;
  const byId = new Map(states.map((s) => [s.id, s]));
  const due = SITES.filter((site) => {
    const s = byId.get(site.id);
    if (!s || site.enabled === false || !ADAPTERS[site.platform]) return false;
    if (s.lock_until && s.lock_until > started) return false;
    if (options.storeIds?.length && !options.storeIds.includes(site.id)) return false;
    if (options.force || s.run_id) return true;
    return !s.last_success_at || started - s.last_success_at >= intervalMs;
  }).sort((a, b) => {
    const sa = byId.get(a.id)!, sb = byId.get(b.id)!;
    return Number(Boolean(sb.run_id)) - Number(Boolean(sa.run_id)) || (sa.last_success_at || 0) - (sb.last_success_at || 0);
  });
  const summary: RefreshSummary = { pages: 0, rows: 0, stores: [], durationMs: 0 };

  async function processStore(site: Site) {
    const state = byId.get(site.id)!;
    const adapter = ADAPTERS[site.platform];
    const result = { id: site.id, status: "running", pages: 0, rows: 0, note: undefined as string | undefined };
    const lock = await db.prepare("UPDATE stores SET lock_until = ? WHERE id = ? AND (lock_until IS NULL OR lock_until < ?)").bind(Date.now() + LOCK_MS, site.id, Date.now()).run();
    if (!lock.meta.changes) { log(`${site.id}: locked by another run`); return; }
    const release = () => db.prepare("UPDATE stores SET lock_until = NULL WHERE id = ?").bind(site.id).run();
    const offerCount = async () => (await db.prepare("SELECT COUNT(*) AS n FROM offers WHERE store_id = ?").bind(site.id).first<{ n: number }>())?.n || 0;
    let runId = state.run_id;
    let page = runId ? state.next_page : 1;
    let runRows = runId ? state.run_rows : 0;
    let attempts = runId ? state.run_errors || 0 : 0;
    let skipped = runId ? state.run_skipped || 0 : 0;
    if (!runId) {
      runId = `${started.toString(36)}-${site.id}`;
      await db.prepare("UPDATE stores SET run_id = ?, next_page = 1, run_rows = 0, run_errors = 0, run_skipped = 0, run_started_at = ?, status = CASE WHEN product_count > 0 THEN status ELSE 'running' END, last_run_at = ? WHERE id = ?").bind(runId, started, started, site.id).run();
    }
    const abandon = async (note: string, restricted: boolean) => {
      const count = await offerCount();
      const status = restricted && !(runRows > 0 || state.pages > 0 || count > 0) ? "restricted" : "partial";
      await db.prepare("UPDATE stores SET run_id = NULL, lock_until = NULL, run_errors = 0, run_skipped = 0, status = ?, note = ?, product_count = ?, last_run_at = ?, last_success_at = CASE WHEN ? > 0 THEN ? ELSE last_success_at END WHERE id = ?").bind(status, note, count, Date.now(), runRows, Date.now(), site.id).run();
      result.status = status; result.note = note;
    };
    let ctx;
    try {
      ctx = await createContext(site.url, { log, fetchImpl: options.fetchImpl });
      shared.budget--;
    } catch (e) {
      const note = e instanceof Blocked ? e.message : `Could not read robots.txt: ${(e as Error).message}`;
      if (e instanceof Blocked) await abandon(note, true);
      else { await db.prepare("UPDATE stores SET lock_until = NULL, note = ?, last_run_at = ? WHERE id = ?").bind(note, Date.now(), site.id).run(); result.status = "retry"; result.note = note; }
      summary.stores.push(result);
      return;
    }
    let finished = false;
    while (shared.budget > 0 && !outOfTime()) {
      let pageResult;
      try {
        pageResult = await adapter.fetchPage(site, page, ctx);
      } catch (e) {
        if (e instanceof Blocked) { log(`${site.id}: ${e.message}`); await abandon(e.message, true); finished = true; break; }
        attempts++;
        const note = `Page ${page}: ${(e as Error).message}`.slice(0, 300);
        log(`${site.id}: ${note} (attempt ${attempts})`);
        if (attempts >= MAX_RUN_ERRORS) {
          // The page stays unreadable: move on and keep older offers at the end of the pass.
          skipped++; attempts = 0; page++;
          if (skipped >= MAX_SKIPPED) { await abandon(`${skipped} pages could not be read; the store seems unavailable. ${note}`, false); finished = true; break; }
          await db.prepare("UPDATE stores SET next_page = ?, run_errors = 0, run_skipped = ?, note = ?, last_run_at = ?, lock_until = ? WHERE id = ?").bind(page, skipped, note, Date.now(), Date.now() + LOCK_MS, site.id).run();
          continue;
        }
        await db.prepare("UPDATE stores SET run_errors = ?, next_page = ?, run_rows = ?, note = ?, last_run_at = ?, lock_until = ? WHERE id = ?").bind(attempts, page, runRows, note, Date.now(), Date.now() + LOCK_MS, site.id).run();
        if (outOfTime()) { result.status = "retry"; result.note = note; finished = true; await release(); break; }
        continue; // retry the same page now
      }
      attempts = 0;
      shared.budget--; page++; result.pages++; summary.pages++;
      const rows = await normalizeRows(site, pageResult.rows);
      const written = await ingest(db, site, rows, runId);
      runRows += written; result.rows += written; summary.rows += written;
      if (pageResult.done) {
        if (!skipped) {
          const stale = await db.prepare("SELECT product_id FROM offers WHERE store_id = ? AND run_id IS NOT ? AND source = 'crawl'").bind(site.id, runId).all<{ product_id: string }>();
          if (stale.results.length) {
            await db.prepare("DELETE FROM offers WHERE store_id = ? AND run_id IS NOT ? AND source = 'crawl'").bind(site.id, runId).run();
            await recomputeAggregates(db, stale.results.map((s) => s.product_id));
          }
        }
        const count = await offerCount();
        const now = Date.now();
        const note = skipped ? `${skipped} page${skipped > 1 ? "s" : ""} could not be read in this pass; earlier offers were kept.` : pageResult.note || null;
        await db.prepare("UPDATE stores SET run_id = NULL, lock_until = NULL, run_errors = 0, run_skipped = 0, next_page = 1, run_rows = 0, status = 'collected', note = ?, product_count = ?, reported_total = ?, pages = ?, last_run_at = ?, last_success_at = ? WHERE id = ?")
          .bind(note, count, pageResult.total ?? null, page - 1, now, now, site.id).run();
        result.status = "collected"; result.note = note || undefined; finished = true;
        log(`${site.id}: collected ${count} offers in ${page - 1} pages${skipped ? `, ${skipped} skipped` : ""}`);
        break;
      }
      await db.prepare("UPDATE stores SET next_page = ?, run_rows = ?, last_run_at = ?, lock_until = ?, run_errors = 0 WHERE id = ?").bind(page, runRows, Date.now(), Date.now() + LOCK_MS, site.id).run();
    }
    if (!finished) { result.status = "in-progress"; await release(); log(`${site.id}: paused at page ${page} (${outOfTime() ? "time" : "page"} budget spent)`); }
    summary.stores.push(result);
  }

  const queue = [...due];
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length && shared.budget > 0 && !outOfTime()) {
      const site = queue.shift()!;
      try { await processStore(site); } catch (e) {
        log(`${site.id}: ${(e as Error).message}`);
        await db.prepare("UPDATE stores SET lock_until = NULL, note = ?, last_run_at = ? WHERE id = ?").bind(`Engine error: ${(e as Error).message}`.slice(0, 300), Date.now(), site.id).run();
        summary.stores.push({ id: site.id, status: "retry", pages: 0, rows: 0, note: (e as Error).message });
      }
    }
  }));
  summary.durationMs = Date.now() - started;
  await db.prepare("INSERT INTO runs (started_at, finished_at, trigger_kind, pages, row_count, stores, note) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(started, Date.now(), options.trigger, summary.pages, summary.rows, summary.stores.map((s) => `${s.id}:${s.status}`).join(","), due.length ? null : "nothing due").run();
  return summary;
}
