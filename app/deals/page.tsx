import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { checkedLabel, money, type Offer, type Product } from "@/lib/catalog";
import { snapshot } from "@/lib/catalog-server";
import { query } from "@/lib/db";
import styles from "./page.module.css";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Motorcycle gear deals in India, checked nightly | RideCompare",
  description: "Real price drops we recorded and discounts against each store's listed MRP. No coupons, no bank offers.",
};

const tabs: { slug: string; label: string; includes: string[] }[] = [
  { slug: "", label: "All", includes: [] },
  { slug: "helmets", label: "Helmets", includes: ["Helmets"] },
  { slug: "jackets", label: "Jackets", includes: ["Jackets"] },
  { slug: "gloves", label: "Gloves", includes: ["Gloves"] },
  { slug: "pants", label: "Pants", includes: ["Pants"] },
  { slug: "boots", label: "Boots", includes: ["Boots"] },
  { slug: "luggage", label: "Luggage", includes: ["Luggage"] },
  { slug: "riding-apparel", label: "Riding Apparel", includes: ["Riding Apparel"] },
  { slug: "protection", label: "Protection", includes: ["Protection"] },
  { slug: "electronics", label: "Electronics", includes: ["Electronics"] },
  { slug: "accessories", label: "Accessories", includes: ["Helmet Accessories", "Bike Accessories", "Maintenance & Parts"] },
];

const perSection = 48;
const minOff = 10;
const maxOff = 80;

type Deal = { p: Product; o: Offer; pct: number };
type DropRow = { product_id: string; store_id: string; price: string; prev_price: string; checked_at: Date };
type SteadyRow = { product_id: string; store_id: string; price: string; mrp: string };

/** Latest recorded price per (product, store) that is below the one recorded before it, in the last 30 days. */
const dropsSql = `
WITH h AS (
  SELECT product_id, store_id, price, in_stock, checked_at,
         LAG(price) OVER w AS prev_price,
         ROW_NUMBER() OVER (PARTITION BY product_id, store_id ORDER BY checked_at DESC) AS rn
  FROM price_history
  WINDOW w AS (PARTITION BY product_id, store_id ORDER BY checked_at)
)
SELECT product_id, store_id, price::text AS price, prev_price::text AS prev_price, checked_at
FROM h
WHERE rn = 1 AND in_stock IS TRUE AND prev_price IS NOT NULL AND price < prev_price
  AND checked_at > now() - interval '30 days'
ORDER BY (prev_price - price) / prev_price DESC
LIMIT 2000`;

/** (product, store) pairs whose current price and MRP have not changed for 60+ days. Stock-only changes do not reset the run. */
const steadySql = `
WITH h AS (
  SELECT product_id, store_id, price, mrp, checked_at,
         LAG(price) OVER w AS prev_price, LAG(mrp) OVER w AS prev_mrp,
         ROW_NUMBER() OVER w AS n,
         ROW_NUMBER() OVER (PARTITION BY product_id, store_id ORDER BY checked_at DESC) AS rn
  FROM price_history
  WHERE product_id = ANY($1::text[])
  WINDOW w AS (PARTITION BY product_id, store_id ORDER BY checked_at)
),
runs AS (
  SELECT product_id, store_id, MAX(checked_at) AS since
  FROM h
  WHERE n = 1 OR price IS DISTINCT FROM prev_price OR mrp IS DISTINCT FROM prev_mrp
  GROUP BY product_id, store_id
)
SELECT h.product_id, h.store_id, h.price::text AS price, h.mrp::text AS mrp
FROM h JOIN runs USING (product_id, store_id)
WHERE h.rn = 1 AND h.mrp IS NOT NULL AND runs.since <= now() - interval '60 days'`;

const key = (productId: string, storeId: string) => `${productId}\u0000${storeId}`;
const dayLabel = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);

async function priceDrops(byId: Map<string, Product>) {
  let rows: DropRow[];
  try {
    rows = await query<DropRow>(dropsSql);
  } catch {
    return []; // History is optional; the page works from the snapshot alone.
  }
  const drops: (Deal & { was: number; since: Date })[] = [];
  for (const r of rows) {
    const p = byId.get(r.product_id);
    const o = p?.offers.find((x) => x.storeId === r.store_id);
    const price = Number(r.price), was = Number(r.prev_price);
    // Only show it if the snapshot still lists that store at the dropped price.
    if (!p || !o || o.inStock !== true || o.price !== price) continue;
    drops.push({ p, o, pct: Math.round(((was - price) / was) * 100), was, since: new Date(r.checked_at) });
  }
  return drops;
}

function belowMrp(products: Product[], skip: Set<string>) {
  const deals: Deal[] = [];
  for (const p of products) {
    if (skip.has(p.id)) continue;
    let best: Deal | undefined;
    for (const o of p.offers) {
      if (o.inStock !== true || !o.mrp || o.mrp <= o.price) continue;
      const pct = Math.round(((o.mrp - o.price) / o.mrp) * 100);
      if (pct < minOff || pct > maxOff) continue;
      if (!best || pct > best.pct) best = { p, o, pct };
    }
    if (best) deals.push(best);
  }
  return deals.sort((a, b) => b.pct - a.pct);
}

async function steadyPairs(deals: Deal[]) {
  if (!deals.length) return new Set<string>();
  try {
    const rows = await query<SteadyRow>(steadySql, [[...new Set(deals.map((d) => d.p.id))]]);
    return new Set(rows.map((r) => `${key(r.product_id, r.store_id)}\u0000${Number(r.price)}\u0000${Number(r.mrp)}`));
  } catch {
    return new Set<string>();
  }
}

/** Card shows the deal's own store price, not the cheapest store overall. */
const only = (d: Deal): Product => ({ ...d.p, offers: [d.o] });

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const raw = (await searchParams).category;
  const tab = tabs.find((t) => t.slug === (Array.isArray(raw) ? raw[0] : raw)) ?? tabs[0];
  const inTab = (p: Product) => !tab.includes.length || tab.includes.includes(p.category);

  const data = await snapshot();
  const byId = new Map(data.products.map((p) => [p.id, p]));

  const allDrops = await priceDrops(byId);
  const dropIds = new Set(allDrops.map((d) => d.p.id));
  const allMrp = belowMrp(data.products, dropIds);

  const seen = new Set<string>();
  const drops = allDrops.filter((d) => inTab(d.p) && !seen.has(d.p.id) && seen.add(d.p.id)).slice(0, perSection);
  const mrp = allMrp.filter((d) => inTab(d.p)).slice(0, perSection);
  const steady = await steadyPairs(mrp);
  const anyDeals = allDrops.length > 0 || allMrp.length > 0;

  return (
    <main className="wrap">
      <section className="hero hero-small">
        <h1>Deals that hold up</h1>
        <p>
          A deal here is either a price drop we recorded ourselves or a price at least {minOff}% under the store&apos;s listed MRP. We
          leave out coupons, bank offers and cashback, and we skip anything claiming more than {maxOff}% off.
        </p>
        {data.summary?.generatedAt && <p className={styles.checked}>Prices last checked {checkedLabel(data.summary.generatedAt)}</p>}
      </section>

      {anyDeals && (
        <nav className={`categories ${styles.tabs}`} aria-label="Deal categories">
          {tabs.map((t) => (
            <Link key={t.label} href={t.slug ? `/deals?category=${t.slug}` : "/deals"} aria-current={t === tab ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
      )}

      {!anyDeals ? (
        <div className={`empty ${styles.empty}`}>
          <h2>No deals to show yet</h2>
          <p>
            We are collecting each store&apos;s MRP and recording price changes every night. Deals will show up here after the next
            update.
          </p>
          <Button asChild size="lg"><Link href="/gear">
            Browse all gear
          </Link></Button>
        </div>
      ) : !drops.length && !mrp.length ? (
        <div className={`empty ${styles.empty}`}>
          <h2>No {tab.label.toLowerCase()} deals right now</h2>
          <p>Nothing in this category is below its usual price or the store&apos;s MRP today.</p>
          <Button asChild size="lg"><Link href="/deals">
            See all deals
          </Link></Button>
        </div>
      ) : (
        <>
          {drops.length > 0 && (
            <section className={styles.section} aria-labelledby="drops">
              <div className={styles.head}>
                <h2 id="drops">Price drops we saw</h2>
                <p>The store lowered its price in the last 30 days, compared with the price we recorded before.</p>
              </div>
              <div className="grid">
                {drops.map((d) => (
                  <ProductCard
                    key={key(d.p.id, d.o.storeId)}
                    p={only(d)}
                    note={`Down ${money(d.was - d.o.price)} since ${dayLabel(d.since)} at ${d.o.storeName}`}
                  />
                ))}
              </div>
            </section>
          )}
          {mrp.length > 0 && (
            <section className={styles.section} aria-labelledby="mrp">
              <div className={styles.head}>
                <h2 id="mrp">Below the store&apos;s MRP</h2>
                <p>
                  Compared with the store&apos;s listed MRP, which we can&apos;t verify. &ldquo;Always at this price&rdquo; means the price
                  and MRP haven&apos;t changed in 60 days or more, so the MRP is probably set high.
                </p>
              </div>
              <div className="grid">
                {mrp.map((d) => (
                  <ProductCard
                    key={key(d.p.id, d.o.storeId)}
                    p={only(d)}
                    note={
                      <>
                        {d.pct}% below listed MRP at {d.o.storeName}
                        {steady.has(`${key(d.p.id, d.o.storeId)}\u0000${d.o.price}\u0000${d.o.mrp}`) && (
                          <span className={styles.steady}>Always at this price</span>
                        )}
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
