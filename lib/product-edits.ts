import "server-only";
import { cache } from "react";
import { query } from "./db";

/** A product added by hand in the admin, not from the catalogue. Edits apply on top of it like any other. */
export type CustomProduct = { name: string; brand: string; category: string; price: number; mrp: number | null; sizes: string[]; photos: string[] };

/** What an admin decided about one product. Sits on top of the catalogue import, so a re-import keeps it. */
export type ProductEdit = {
  status?: "approved" | "hidden";
  custom?: CustomProduct;
  name?: string;
  price?: number;
  image?: string;
  sizes?: string[];
  category?: string;
  note?: string;
  updatedAt: string;
};

/** All edits, read once per request: on serverless each request may hit a different instance, so nothing is kept between requests. */
export const productEdits = cache(async (): Promise<Record<string, ProductEdit>> => {
  const rows = await query<{ id: string; data: ProductEdit }>("SELECT id, data FROM product_edits");
  return Object.fromEntries(rows.map((r) => [r.id, r.data]));
});

/** Deletes a hand-added product. Catalogue products can only be hidden, so a re-import can't bring back a mistake. */
export async function deleteCustom(id: string) {
  const rows = await query("DELETE FROM product_edits WHERE id = $1 AND data ? 'custom' RETURNING id", [id]);
  return rows.length > 0;
}

/** Merges `patch` into each product's edit. Fields set to undefined are removed (back to the catalogue value). */
export async function saveEdits(ids: string[], patch: Omit<ProductEdit, "updatedAt">) {
  if (!ids.length) return;
  const current = await query<{ id: string; data: ProductEdit }>("SELECT id, data FROM product_edits WHERE id = ANY($1)", [ids]);
  const byId = new Map(current.map((r) => [r.id, r.data]));
  const updatedAt = new Date().toISOString();
  const rows = ids.map((id) => {
    const next: ProductEdit = { ...byId.get(id), ...patch, updatedAt };
    for (const k of Object.keys(next) as (keyof ProductEdit)[]) if (next[k] === undefined) delete next[k];
    return [id, JSON.stringify(next)];
  });
  await query(
    `INSERT INTO product_edits (id, data, updated_at)
     SELECT id, data::jsonb, now() FROM unnest($1::text[], $2::text[]) AS t(id, data)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [rows.map((r) => r[0]), rows.map((r) => r[1])],
  );
}
