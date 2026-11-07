import type { Metadata } from "next";
import Link from "next/link";
import { storeCards, type StoreCard } from "@/lib/shop";
import { FilterBar, type Facet } from "./filter-bar";
import { PRICES } from "@/lib/menu";
import { categoryCounts, filterStore, SORTS, PER_PAGE, one, type Params } from "@/lib/store-query";
import { InfiniteGrid } from "./infinite-grid";
import styles from "./store.module.css";

export const metadata: Metadata = {
  title: "Shop riding gear and bike parts | GearCircle",
  description: "Riding gear and motorcycle parts with free delivery across India. Pay by UPI, card or netbanking.",
  robots: { index: false }, // pre-launch
};

type Props = { searchParams: Promise<Params> };
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

export default async function StorePage({ searchParams }: Props) {
  const sp = await searchParams;
  const all = await storeCards();
  const counts = categoryCounts(all);
  const categories = [...counts].sort((a, b) => b[1] - a[1]);

  const { cat, brand, bike, size, price, words, pool, items } = filterStore(all, counts, sp);

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

  // The first batch renders on the server; the grid fetches the rest as the shopper scrolls.
  const shown = items.slice(0, PER_PAGE);
  const query = new URLSearchParams();
  for (const k of ["category", "q", "brand", "bike", "size", "price", "sort"]) {
    const v = one(sp[k]);
    if (v) query.set(k, v);
  }
  // Tabs switch category and reset the filters that belong to the old one; the pager keeps everything.
  const href = (c: string | undefined) => {
    const q = new URLSearchParams();
    if (c) q.set("category", c);
    if (words.length) q.set("q", words.join(" "));
    if (c === cat) {
      for (const [k, v] of Object.entries({ brand, bike, size, price: price?.value, sort: one(sp.sort) })) if (v) q.set(k, v);
    }
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

      {shown.length > 0 ? (
        <InfiniteGrid key={query.toString()} first={shown} total={items.length} query={query.toString()} />
      ) : (
        <p className={styles.empty}>Nothing matches. Try a shorter search or another category.</p>
      )}
    </main>
  );
}
