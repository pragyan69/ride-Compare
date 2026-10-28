import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { curatedOnly, type Product, type Retailer } from "./catalog";

export type Snapshot = { products: Product[]; stores: Retailer[]; summary?: { generatedAt: string; catalogProductCount?: number } };

let cached: Promise<Snapshot> | undefined;

/** The nightly catalog snapshot, read once per server instance. */
export function snapshot() {
  cached ??= readFile(path.join(process.cwd(), "public/data/catalog.json"), "utf8").then((t) => JSON.parse(t) as Snapshot);
  return cached;
}

let curated: Promise<Snapshot> | undefined;

/** The curated catalogue: the products RideCompare stocks (public/data/curated.json). Falls back to the full snapshot. */
export function catalogue() {
  curated ??= readFile(path.join(process.cwd(), "public/data/curated.json"), "utf8")
    .then((t) => JSON.parse(t) as Snapshot)
    .catch(async () => {
      const s = await snapshot();
      return { ...s, products: curatedOnly(s.products) };
    });
  return curated;
}

let photos: Promise<Record<string, string[]>> | undefined;

/** Every photo the store published for a product, falling back to the catalog's single image. */
export async function productPhotos(p: Pick<Product, "id" | "image">) {
  photos ??= readFile(path.join(process.cwd(), "public/data/images.json"), "utf8")
    .then((t) => JSON.parse(t) as Record<string, string[]>);
  return (await photos)[p.id] ?? (p.image ? [p.image] : []);
}

export async function findProduct(id: string) {
  return (await snapshot()).products.find((p) => p.id === id);
}

export const productPath = (p: Pick<Product, "id">) => `/product/${encodeURIComponent(p.id)}`;
