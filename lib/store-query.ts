import "server-only";
import { PRICES } from "./menu";
import type { StoreCard } from "./shop";

export const PER_PAGE = 48;
export type Params = Record<string, string | string[] | undefined>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const off = (c: StoreCard) => (c.mrp ? (c.mrp - c.price) / c.mrp : 0);
// Listed by the most other sellers first: the closest thing we have to "what riders buy".
export const SORTS: { value: string; label: string; by: (a: StoreCard, b: StoreCard) => number }[] = [
  { value: "", label: "Recommended", by: (a, b) => b.others.length - a.others.length },
  { value: "price-asc", label: "Price: low to high", by: (a, b) => a.price - b.price },
  { value: "price-desc", label: "Price: high to low", by: (a, b) => b.price - a.price },
  { value: "discount", label: "Biggest discount", by: (a, b) => off(b) - off(a) },
];

/** The shop's search, category and filter rules, shared by the page and the load-more endpoint. */
export function filterStore(all: StoreCard[], counts: Map<string, number>, sp: Params) {
  const cat = one(sp.category);
  const brand = one(sp.brand);
  const bike = one(sp.bike);
  const size = one(sp.size);
  const price = PRICES.find((p) => p.value === one(sp.price));
  const sort = SORTS.find((x) => x.value === one(sp.sort)) ?? SORTS[0];
  const words = (one(sp.q) ?? "").toLowerCase().split(/\s+/).filter(Boolean);

  // Category and search narrow the pool; the filters only offer what is in it.
  const pool = all.filter(
    (c) => (!cat || !counts.has(cat) || c.category === cat) && words.every((w) => `${c.brand} ${c.name} ${c.category}`.toLowerCase().includes(w)),
  );
  const items = pool
    .filter(
      (c) =>
        (!brand || c.brand === brand) &&
        (!bike || c.bikes.includes(bike)) &&
        (!size || c.sizes.includes(size)) &&
        (!price || (c.price >= price.min && c.price < price.max)),
    )
    .sort(sort.by);
  return { cat, brand, bike, size, price, sort, words, pool, items };
}

export const categoryCounts = (all: StoreCard[]) => {
  const counts = new Map<string, number>();
  for (const c of all) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
  return counts;
};
