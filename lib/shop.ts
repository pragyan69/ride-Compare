import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Product } from "./catalog";
import { findProduct, productPhotos } from "./catalog-server";
import { productEdits, type CustomProduct, type ProductEdit } from "./product-edits";

/** One row of public/data/shop-items.json (built by scripts/build-shop-items.py). `image` overrides the catalog photo. Products missing from the
 * nightly catalog carry their own name, brand, category, image and MRP. */
type Entry = {
  id: string;
  price: number;
  sizes: string[];
  name?: string;
  brand?: string;
  category?: string;
  image?: string;
  mrp?: number | null;
  store?: string;
  bikes?: string[];
  sizesGuessed?: true;
  photoSwapped?: true;
};

/** One product we sell ourselves: our price next to what other stores charge for the same thing. */
export type StoreItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  photos: string[];
  price: number;
  mrp: number | null;
  sizes: string[];
  /** Motorcycles a part fits, as named in the catalogue. Empty for riding gear. */
  bikes: string[];
  others: { store: string; price: number }[];
  /** Import warnings shown in the admin: sizes were a default run, or the store's main photo showed another colour. */
  flags: ("sizes guessed" | "photo swapped")[];
};

/** What a listing card and the filters need; skips the photo lookup. */
export type StoreCard = Omit<StoreItem, "photos">;

let entries: Promise<Map<string, Entry>> | undefined;
const listed = () =>
  (entries ??= readFile(path.join(process.cwd(), "public/data/shop-items.json"), "utf8").then(
    (t) => new Map((JSON.parse(t) as Entry[]).map((e) => [e.id, e])),
  ));

// Some stores shout ("IX AIRBAG U03 (BLACK ORANGE)"); model codes and two-letter codes stay upper case.
const tidy = (s: string) =>
  /[a-z]/.test(s) ? s : s.toLowerCase().replace(/\b[a-z0-9]+\b/g, (w) => (/\d/.test(w) || w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)));
const withoutBrand = (name: string, brand: string) =>
  tidy(brand === "Unspecified" ? name : name.replace(new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"), ""));

const flagsOf = (e: Entry): StoreCard["flags"] => [...(e.sizesGuessed ? (["sizes guessed"] as const) : []), ...(e.photoSwapped ? (["photo swapped"] as const) : [])];

function card(e: Entry, p: Product | undefined): StoreCard | undefined {
  if (!p) {
    if (!e.name || !e.brand || !e.category || !e.image) return undefined;
    return {
      id: e.id, name: withoutBrand(e.name, e.brand), brand: e.brand, category: e.category, image: e.image, price: e.price,
      mrp: e.mrp && e.mrp > e.price ? e.mrp : null, sizes: e.sizes, bikes: e.bikes ?? [], others: [], flags: flagsOf(e),
    };
  }
  const image = e.image ?? p.image; // the build picks the product's own photo when a store reused another colour's
  if (!image) return undefined;
  const mrps = p.offers.map((o) => o.mrp ?? 0).filter((m) => m > e.price);
  return {
    id: p.id,
    name: withoutBrand(p.name, p.brand),
    brand: p.brand,
    category: p.category,
    image,
    price: e.price,
    mrp: mrps.length ? Math.max(...mrps) : null,
    sizes: e.sizes,
    bikes: e.bikes ?? [],
    flags: flagsOf(e),
    others: p.offers
      .filter((o) => o.inStock)
      .map((o) => ({ store: o.storeName, price: Math.round(o.price) }))
      .sort((a, b) => a.price - b.price)
      .filter((o, i, all) => all.findIndex((x) => x.store === o.store) === i),
  };
}

let cards: Promise<StoreCard[]> | undefined;

/** Every imported product before admin edits, in catalogue order. Built once per server instance. */
export function importedCards() {
  cards ??= listed().then(async (m) => {
    const out: StoreCard[] = [];
    for (const e of m.values()) {
      const c = card(e, await findProduct(e.id));
      if (c) out.push(c);
    }
    return out;
  });
  return cards;
}

const edited = (c: StoreCard, x: ProductEdit | undefined): StoreCard =>
  x ? { ...c, name: x.name ?? c.name, price: x.price ?? c.price, image: x.image ?? c.image, sizes: x.sizes ?? c.sizes, category: x.category ?? c.category } : c;

const customCard = (id: string, c: CustomProduct): StoreCard => ({
  id, name: c.name, brand: c.brand, category: c.category, image: c.photos[0], price: c.price, mrp: c.mrp && c.mrp > c.price ? c.mrp : null,
  sizes: c.sizes, bikes: [], others: [], flags: [],
});

/** Every product before edits: the catalogue import, then products added in the admin. */
export async function allCards() {
  const [imported, edits] = await Promise.all([importedCards(), productEdits()]);
  const added = Object.entries(edits).flatMap(([id, x]) => (x.custom ? [customCard(id, x.custom)] : []));
  return [...imported, ...added];
}

/** What shoppers see: admin edits applied, hidden products left out. */
export async function storeCards() {
  const [all, edits] = await Promise.all([allCards(), productEdits()]);
  return all.flatMap((c) => (edits[c.id]?.status === "hidden" ? [] : [edited(c, edits[c.id])]));
}

/** The product before edits, with every photo we have for it and the source store data. */
async function base(id: string) {
  const x = (await productEdits())[id];
  if (x?.custom) {
    const c = customCard(id, x.custom);
    return { card: c, photos: (lead: string) => [...new Set([lead, ...x.custom!.photos])], offers: [] as Product["offers"], fallbackStore: undefined };
  }
  const e = (await listed()).get(id);
  if (!e) return undefined;
  const p = await findProduct(id);
  const c = card(e, p);
  if (!c) return undefined;
  const extra = p ? await productPhotos(p) : [];
  return {
    card: c,
    // A build-time photo choice means the catalogue's main photo shows another colour; drop it from the shop.
    photos: (lead: string) => [...new Set([lead, ...extra.filter((u) => !(e.image && p && u === p.image))])],
    offers: p?.offers ?? [],
    fallbackStore: e.store,
  };
}

export async function storeItem(id: string): Promise<StoreItem | undefined> {
  const b = await base(id);
  const x = (await productEdits())[id];
  if (!b || x?.status === "hidden") return undefined;
  const shown = edited(b.card, x);
  return { ...shown, photos: b.photos(shown.image) };
}

/** Everything the admin needs to check one product: the shopper's view, the original, the edit and the source offers. */
export async function adminProduct(id: string) {
  const b = await base(id);
  if (!b) return undefined;
  const edit = (await productEdits())[id];
  const shown = edited(b.card, edit);
  return {
    imported: b.card,
    shown,
    edit,
    custom: edit?.custom,
    photos: [...new Set([b.card.image, ...b.photos(shown.image)])],
    offers: b.offers.map((o) => ({ store: o.storeName, price: o.price, mrp: o.mrp, inStock: o.inStock, variant: o.variant, url: o.url, checkedAt: o.checkedAt })),
    fallbackStore: b.fallbackStore,
  };
}
