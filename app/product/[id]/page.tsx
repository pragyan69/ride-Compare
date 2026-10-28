import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { checkedLabel, money, rankedOffers, type Offer, type Product } from "@/lib/catalog";
import { catalogue, findProduct, productPhotos } from "@/lib/catalog-server";
import { query } from "@/lib/db";
import { Gallery } from "./gallery";
import { PriceChart, dateLabel, type HistoryPoint } from "./price-chart";
import styles from "./page.module.css";

export const revalidate = 86400; // the catalog refreshes once a night
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

const displayName = (p: Product) => (p.brand === "Unspecified" ? p.name : `${p.brand} ${p.name}`);
const stockLabel = (o: Offer) => (o.inStock === true ? "In stock" : o.inStock === false ? "Out of stock" : "Check stock at store");
const belowMrp = (o: Offer) => (o.mrp && o.mrp > o.price ? Math.round(((o.mrp - o.price) / o.mrp) * 100) : 0);

async function load(params: Props["params"]) {
  const { id } = await params;
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    notFound();
  }
  return findProduct(decoded);
}

const hasMoved = (points: HistoryPoint[]) => {
  const byStore = new Map<string, Set<number>>();
  for (const pt of points) byStore.set(pt.storeId, (byStore.get(pt.storeId) ?? new Set()).add(pt.price));
  return [...byStore.values()].some((prices) => prices.size > 1);
};

type HistoryRow = { store_id: string; price: string; mrp: string | null; in_stock: boolean | null; checked_at: Date };

/** Recorded price changes, or null when the database can't be reached (the page still renders). */
async function history(productId: string): Promise<{ points: HistoryPoint[]; now: number } | null> {
  try {
    const rows = await query<HistoryRow>(
      "SELECT store_id, price, mrp, in_stock, checked_at FROM price_history WHERE product_id = $1 ORDER BY checked_at",
      [productId],
    );
    const points = rows.map((r) => ({
      storeId: r.store_id,
      price: Number(r.price),
      mrp: r.mrp === null ? null : Number(r.mrp),
      inStock: r.in_stock,
      at: new Date(r.checked_at).getTime(),
    }));
    return { points, now: Date.now() };
  } catch (e) {
    console.error(`price_history lookup failed for ${productId}`, e);
    return null;
  }
}

function related(p: Product, all: Product[]) {
  const seen = new Set([`${p.brand}|${p.name}`]);
  const pick = (match: (q: Product) => boolean, out: Product[]) => {
    for (const q of all) {
      if (out.length >= 8) break;
      const key = `${q.brand}|${q.name}`;
      if (seen.has(key) || !match(q)) continue;
      seen.add(key);
      out.push(q);
    }
    return out;
  };
  return pick((q) => q.category === p.category, pick((q) => q.brand === p.brand && q.category === p.category, []));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load(params);
  if (!p) return { title: "Product not found | RideCompare" };
  const offers = rankedOffers(p);
  const n = offers.length;
  return {
    title: `${displayName(p)} price in India | RideCompare`,
    description: `${displayName(p)} (${p.variant}) from ${money(offers[0].price)} at ${offers[0].storeName}. Prices compared across ${n} ${n === 1 ? "store" : "stores"} in India.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const p = await load(params);
  if (!p) notFound();
  const [data, hist, photos] = await Promise.all([catalogue(), history(p.id), productPhotos(p)]);
  const offers = rankedOffers(p);
  const lowest = offers.length > 1 && offers[0].inStock !== false && offers[0].price < offers[1].price ? offers[0] : undefined;
  const prices = p.offers.map((o) => o.price);
  const storeName = (id: string) => p.offers.find((o) => o.storeId === id)?.storeName ?? data.stores.find((s) => s.id === id)?.name ?? id;
  const more = related(p, data.products);
  // No recorded history yet: start the chart from tonight's checked prices instead of leaving it empty.
  const chartPoints: HistoryPoint[] = hist?.points.length
    ? hist.points
    : p.offers
        .map((o) => ({ storeId: o.storeId, price: o.price, mrp: o.mrp ?? null, inStock: o.inStock, at: Date.parse(o.checkedAt) }))
        .filter((pt) => Number.isFinite(pt.at));
  const chartNow = hist?.now ?? Math.max(...chartPoints.map((pt) => pt.at));
  const name = displayName(p);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    ...(p.brand !== "Unspecified" && { brand: { "@type": "Brand", name: p.brand } }),
    category: p.category,
    ...(photos.length > 0 && { image: photos }),
    description: `${name}, ${p.variant}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: p.offers.length,
    },
  };

  return (
    <main className={`wrap ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        <Link href="/gear">Gear</Link>
        <span aria-hidden>/</span>
        <Link href={`/gear?category=${encodeURIComponent(p.category)}`}>{p.category}</Link>
        {p.brand !== "Unspecified" && (
          <>
            <span aria-hidden>/</span>
            <Link href={`/gear?brand=${encodeURIComponent(p.brand)}`}>{p.brand}</Link>
          </>
        )}
      </nav>

      <section className={styles.top}>
        <Gallery photos={photos} name={name} />

        <div className={styles.info}>
          {p.brand !== "Unspecified" && <p className={styles.brand}>{p.brand}</p>}
          <h1 className={styles.name}>{p.name}</h1>
          <p className={styles.variant}>
            {offers.length > 1 ? p.category : `${p.variant} · ${p.category}`}
          </p>

          <h2 className={styles.sectionTitle}>
            {offers.length > 1 ? `Prices at ${offers.length} stores` : "Price"}
          </h2>
          <ul className={styles.offers}>
            {offers.map((o) => {
              const off = belowMrp(o);
              const isLowest = o === lowest;
              return (
                <li key={`${o.storeId}-${o.url}`} className={isLowest ? styles.lowest : undefined}>
                  <div className={styles.offerMain}>
                    <strong className={styles.store}>
                      {o.storeName}
                      {isLowest && <span className={styles.badge}>Lowest price</span>}
                    </strong>
                    {offers.length > 1 && o.variant && !["Standard", "Check size / colour at store"].includes(o.variant) && <span>{o.variant}</span>}
                    <span className={o.inStock === false ? styles.out : o.inStock ? styles.in : undefined}>{stockLabel(o)}</span>
                    <span className={styles.checked}>Price checked {checkedLabel(o.checkedAt)}</span>
                  </div>
                  <div className={styles.offerPrice}>
                    <b>{money(o.price)}</b>
                    {off > 0 && o.mrp && (
                      <span>
                        <s>{money(o.mrp)}</s> {off}% below MRP
                      </span>
                    )}
                  </div>
                  <Button asChild size="lg" variant={isLowest || offers.length === 1 ? "default" : "outline"} className="store-cta">
                    <a href={o.url} target="_blank" rel="noopener noreferrer nofollow" data-ph-capture-attribute-store-click={o.storeName} data-ph-capture-attribute-price={o.price}>
                      Go to store
                    </a>
                  </Button>
                </li>
              );
            })}
          </ul>
          <p className={styles.honesty}>
            Price for the size and colour listed. Other sizes and colours can cost more or less. Shipping and coupons aren&apos;t included.
          </p>
        </div>
      </section>

      {chartPoints.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.heading}>Price history</h2>
          <PriceChart points={chartPoints} storeName={storeName} now={chartNow} />
          {!hasMoved(chartPoints) && <p className={styles.muted}>No price change since {dateLabel(Math.min(...chartPoints.map((pt) => pt.at)))}.</p>}
        </section>
      )}

      {more.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.heading}>More {p.category.toLowerCase()}</h2>
          <div className="grid">
            {more.map((q) => (
              <ProductCard key={q.id} p={q} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
