import type { Metadata } from "next";
import Link from "next/link";
import { storeCards, type StoreCard } from "@/lib/shop";
import { FilterBar, type Facet } from "./filter-bar";
import { ProductTile } from "./card";
import { PRICES } from "@/lib/menu";
import styles from "./store.module.css";

export const metadata: Metadata = {
  title: "Shop riding gear and bike parts | GearCircle",
  description: "Riding gear and motorcycle parts with free delivery across India. Pay by UPI, card or netbanking.",
  robots: { index: false }, // pre-launch
};

const PER_PAGE = 48;
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const off = (c: StoreCard) => (c.mrp ? (c.mrp - c.price) / c.mrp : 0);
// Listed by the most other sellers first: the closest thing we have to "what riders buy".
const SORTS: { value: string; label: string; by: (a: StoreCard, b: StoreCard) => number }[] = [
  { value: "", label: "Recommended", by: (a, b) => b.others.length - a.others.length },
  { value: "price-asc", label: "Price: low to high", by: (a, b) => a.price - b.price },
  { value: "price-desc", label: "Price: high to low", by: (a, b) => b.price - a.price },
  { value: "discount", label: "Biggest discount", by: (a, b) => off(b) - off(a) },
];
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

export default async function StorePage({ searchParams }: Props) {
  const sp = await searchParams;
  const all = await storeCards();
  const counts = new Map<string, number>();
  for (const c of all) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
  const categories = [...counts].sort((a, b) => b[1] - a[1]);

  const cat = one(sp.category);
  const brand = one(sp.brand);
  const bike = one(sp.bike);
  const size = one(sp.size);
  const price = PRICES.find((p) => p.value === one(sp.price));
  const sort = SORTS.find((x) => x.value === one(sp.sort)) ?? SORTS[0];
  const words = (one(sp.q) ?? "").toLowerCase().split(/\s+/).filter(Boolean);

  // Category and search narrow the pool; the dropdowns only offer what is in it.
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

  const tally = (keys: (c: StoreCard) => string[]) => {
    const m = new Map<string, number>();
    for (const c of pool) for (const k of keys(c)) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const sizeOrder = (v: string) => (SIZE_ORDER.includes(v) ? SIZE_ORDER.indexOf(v) : 100 + (parseInt(v.replace(/\D/g, ""), 10) || 0));
  const facets: Facet[] = [
    { key: "sort", label: "Sort", all: "Recommended", options: SORTS.slice(1).map(({ value, label }) => ({ value, label })) },
    { key: "brand", label: "Brand", all: "All brands", options: tally((c) => [c.brand]).map(([v, n]) => ({ value: v, label: `${v} (${n})` })) },
    {
      key: "price",
      label: "Price",
      all: "Any price",
      options: PRICES.filter((p) => pool.some((c) => c.price >= p.min && c.price < p.max)).map(({ value, label }) => ({ value, label })),
    },
  ];
  const sizes = tally((c) => c.sizes).sort((a, b) => sizeOrder(a[0]) - sizeOrder(b[0]));
  if (sizes.length) facets.push({ key: "size", label: "Size", all: "Any size", options: sizes.map(([v, n]) => ({ value: v, label: `${v} (${n})` })) });
  const bikes = tally((c) => c.bikes);
  if (bikes.length) facets.push({ key: "bike", label: "Fits bike", all: "Any bike", options: bikes.map(([v, n]) => ({ value: v, label: `${v} (${n})` })) });
  const activeFilters = [brand, bike, size, price].filter(Boolean).length;

  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(one(sp.page)) || 1));
  const shown = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  // Tabs switch category and reset the filters that belong to the old one; the pager keeps everything.
  const href = (c: string | undefined, p = 1) => {
    const q = new URLSearchParams();
    if (c) q.set("category", c);
    if (words.length) q.set("q", words.join(" "));
    if (c === cat) {
      for (const [k, v] of Object.entries({ brand, bike, size, price: price?.value, sort: one(sp.sort) })) if (v) q.set(k, v);
    }
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `/store?${s}` : "/store";
  };

  return (
    <main className={`wrap ${styles.page}`} data-listing>
      <header className={styles.hero}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden>/</span>
          <Link href="/store">Shop</Link>
          {cat && counts.has(cat) && (
            <>
              <span aria-hidden>/</span>
              <span>{cat}</span>
            </>
          )}
        </nav>
        <h1>{words.length ? `Results for “${words.join(" ")}”` : bike ? `Parts for the ${bike}` : brand ? `${brand}` : cat && counts.has(cat) ? cat : "All products"}</h1>
        <p>
          Showing {items.length.toLocaleString("en-IN")} {items.length === 1 ? "result" : "results"}
        </p>
      </header>

      <div className={styles.chipRow}>
      <FilterBar facets={facets} active={activeFilters} total={items.length} />
      <nav className={styles.tabs} aria-label="Store categories">
        <Link href={href(undefined)} aria-current={!cat ? "page" : undefined}>
          All
        </Link>
        {/* The picked category comes first so it is on screen on phones. */}
        {[...categories].sort((a, b) => Number(b[0] === cat) - Number(a[0] === cat)).map(([c, n]) => (
          <Link key={c} href={href(c)} aria-current={cat === c ? "page" : undefined}>
            {c}{!words.length && <span>{n.toLocaleString("en-IN")}</span>}
          </Link>
        ))}
      </nav>
      </div>

      <div className={styles.grid}>
        {shown.map((it) => (
          <ProductTile key={it.id} it={it} />
        ))}
      </div>
      {shown.length === 0 && <p className={styles.empty}>Nothing matches. Try a shorter search or another category.</p>}

      {pages > 1 && (
        <nav className={styles.pager} aria-label="Pages">
          {page > 1 ? <Link href={href(cat, page - 1)}>Previous</Link> : <span />}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={href(cat, page + 1)}>Next</Link> : <span />}
        </nav>
      )}
    </main>
  );
}
