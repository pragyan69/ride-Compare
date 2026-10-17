import { Pool } from "pg";

const globalForDb = globalThis as unknown as { pool?: Pool; schema?: Promise<unknown> };

function pool() {
  if (!process.env.DATABASE_URL) throw new Error("The catalog database is temporarily unavailable. Please try again.");
  globalForDb.pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 10_000 });
  return globalForDb.pool;
}

const schema = `
CREATE TABLE IF NOT EXISTS retailers (id text PRIMARY KEY, data text NOT NULL);
CREATE TABLE IF NOT EXISTS listings (id text PRIMARY KEY, store_id text NOT NULL, product_id text NOT NULL, data text NOT NULL);
CREATE TABLE IF NOT EXISTS price_history (product_id text NOT NULL, store_id text NOT NULL, price numeric(12,2) NOT NULL, mrp numeric(12,2), in_stock boolean, checked_at timestamptz NOT NULL, PRIMARY KEY (product_id, store_id, checked_at));
`;

/** Runs a query after making sure the tables exist (once per server instance). */
export async function query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
  globalForDb.schema ??= pool().query(schema).catch((e) => { globalForDb.schema = undefined; throw e; });
  await globalForDb.schema;
  return (await pool().query<T>(sql, params)).rows;
}
