/** Idempotent D1 schema. Sites applies drizzle/ migrations at publish time;
 * this runs the same statements with IF NOT EXISTS so local previews and
 * fresh databases work without a migration step. */
export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, website TEXT NOT NULL, platform TEXT NOT NULL, brand TEXT,
    enabled INTEGER NOT NULL DEFAULT 1, builtin INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'pending', note TEXT,
    product_count INTEGER NOT NULL DEFAULT 0, reported_total INTEGER, pages INTEGER NOT NULL DEFAULT 0,
    run_id TEXT, next_page INTEGER NOT NULL DEFAULT 1, run_started_at INTEGER, run_rows INTEGER NOT NULL DEFAULT 0,
    last_run_at INTEGER, last_success_at INTEGER, feed_url TEXT, lock_until INTEGER, run_errors INTEGER NOT NULL DEFAULT 0, run_skipped INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, brand TEXT NOT NULL, category TEXT NOT NULL, variant TEXT NOT NULL,
    image TEXT NOT NULL DEFAULT '', variant_count INTEGER, match_type TEXT, bike TEXT, bike_make TEXT, search TEXT NOT NULL,
    min_price REAL, mrp REAL, discount INTEGER NOT NULL DEFAULT 0, offer_count INTEGER NOT NULL DEFAULT 0,
    store_count INTEGER NOT NULL DEFAULT 0, best_store_id TEXT, best_store_name TEXT, best_url TEXT,
    in_stock INTEGER, spread REAL NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY, store_id TEXT NOT NULL, product_id TEXT NOT NULL, store_name TEXT NOT NULL,
    price REAL NOT NULL, mrp REAL, shipping REAL, in_stock INTEGER, url TEXT NOT NULL, image TEXT,
    checked_at INTEGER NOT NULL, source TEXT NOT NULL, source_id TEXT, variant_id TEXT, run_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, product_id TEXT NOT NULL, store_id TEXT NOT NULL, price REAL NOT NULL, seen_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, started_at INTEGER NOT NULL, finished_at INTEGER, trigger_kind TEXT NOT NULL,
    pages INTEGER NOT NULL DEFAULT 0, row_count INTEGER NOT NULL DEFAULT 0, stores TEXT NOT NULL DEFAULT '', note TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS products_category ON products(category, min_price)`,
  `CREATE INDEX IF NOT EXISTS products_brand ON products(brand)`,
  `CREATE INDEX IF NOT EXISTS products_bike ON products(bike)`,
  `CREATE INDEX IF NOT EXISTS products_discount ON products(discount)`,
  `CREATE INDEX IF NOT EXISTS products_store_count ON products(store_count)`,
  `CREATE INDEX IF NOT EXISTS offers_product ON offers(product_id)`,
  `CREATE INDEX IF NOT EXISTS offers_store_run ON offers(store_id, run_id)`,
  `CREATE INDEX IF NOT EXISTS price_history_product ON price_history(product_id, seen_at)`,
];

/** Columns added after the first release; each runs once and is ignored when present. */
const COLUMN_UPGRADES = ["ALTER TABLE stores ADD COLUMN lock_until INTEGER", "ALTER TABLE stores ADD COLUMN run_errors INTEGER NOT NULL DEFAULT 0", "ALTER TABLE stores ADD COLUMN run_skipped INTEGER NOT NULL DEFAULT 0"];

let schemaReady: Promise<void> | null = null;
/** Creates missing tables, indexes and columns once per isolate. */
export function ensureSchema(db: D1Database) {
  if (!schemaReady) schemaReady = (async () => {
    await db.batch(SCHEMA_STATEMENTS.map((s) => db.prepare(s)));
    for (const sql of COLUMN_UPGRADES) { try { await db.prepare(sql).run(); } catch (e) { if (!/duplicate column/i.test(String(e))) throw e; } }
  })().catch((e) => { schemaReady = null; throw e; });
  return schemaReady;
}
