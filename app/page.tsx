import Link from "next/link";
import { ArrowRight, ChevronRight, Scale, History, ShieldCheck, BadgeCheck } from "lucide-react";
import { snapshot } from "@/lib/catalog-server";
import { checkedLabel, money, rankedOffers, type Product } from "@/lib/catalog";
import { buildKits, buildPools } from "@/lib/kit";
import { bikeIndex, findBike } from "@/lib/bikes";
import { ProductImage } from "@/components/product-card";
import { TopTen, TabbedRow, QuickBuild, type Pick } from "./home-client";
import styles from "./home.module.css";

export const revalidate = 21600;

const knownBrands = ["Rynox", "ViaTerra", "Axor", "LS2", "SMK", "MT Helmets", "AGV", "Alpinestars", "Solace", "Raida", "Steelbird", "Studds", "KYT", "HJC", "Korda", "DSG", "Spidi", "Acerbis"];
const notGear = /visor|pad|liner|lock|spoiler|cover|pinlock|peak|cheek|strap|cleaner|spray|sticker|mount|intercom|kids|balaclava/i;
const categoryTiles = [
  { name: "Helmets", match: /helmet/i },
  { name: "Jackets", match: /jacket/i },
  { name: "Gloves", match: /glove/i },
  { name: "Boots", match: /boot|shoe/i },
  { name: "Pants", match: /pant|jean|trouser/i },
  { name: "Luggage", match: /bag|pannier|saddle/i },
  { name: "Protection", match: /protector|armou?r|guard/i },
  { name: "Bike Accessories", match: /guard|rack|light/i },
];

const good = (p: Product) =>
  knownBrands.includes(p.brand) && p.image.includes("cdn.shopify.com") && p.offers.some((o) => o.inStock === true) && !notGear.test(p.name);
const model = (p: Product) => `${p.brand}|${p.name.toLowerCase().replace(/\s*[-(].*$/, "")}`;

function toPick(p: Product): Pick {
  const o = rankedOffers(p)[0];
  return { id: p.id, name: p.name, brand: p.brand, image: p.image, price: o.price, mrp: o.mrp ?? null, storeName: o.storeName, stores: p.offers.length };
}

/** One listing per model, at most `perBrand` per brand, so rows don't fill up with one brand's sizes. */
function pickVaried(list: Product[], take: number, perBrand = 2) {
  const seen = new Set<string>();
  const brands = new Map<string, number>();
  const out: Product[] = [];
  for (const p of list) {
    if (out.length === take) break;
    if (seen.has(model(p)) || (brands.get(p.brand) || 0) >= perBrand) continue;
    seen.add(model(p));
    brands.set(p.brand, (brands.get(p.brand) || 0) + 1);
    out.push(p);
  }
  return out;
}

export default async function Home() {
  const { products, stores, summary } = await snapshot();
  const price = (p: Product) => rankedOffers(p)[0].price;

  const helmets = products
    .filter((p) => p.category === "Helmets" && good(p) && /helmet/i.test(p.name) && price(p) >= 3000 && price(p) <= 25000)
    .sort((a, b) => b.offers.length - a.offers.length || price(b) - price(a));
  const topTen = pickVaried(helmets, 10, 2).map(toPick);

  const tiles = categoryTiles.map((t) => ({
    ...t,
    count: products.filter((p) => p.category === t.name).length,
    product: products.find((p) => p.category === t.name && good(p) && t.match.test(p.name)),
  }));
  // The pitch in one picture: real products sold at several stores, with what you save by picking the cheapest.
  const candidates = new Map(
    products
      .filter((p) => ["Helmets", "Jackets", "Gloves", "Boots"].includes(p.category) && good(p))
      .map((p) => {
        const offers = rankedOffers(p).filter((o) => o.inStock !== false).slice(0, 3);
        return { p, offers, save: offers.length > 1 ? offers[offers.length - 1].price - offers[0].price : 0 };
      })
      .filter((c) => c.save >= 200 && c.save < c.offers[0].price)
      .sort((a, b) => b.save - a.save)
      .map((c) => [c.p, c] as const),
  );
  const compares = pickVaried([...candidates.keys()], 3, 1).map((p) => candidates.get(p)!);

  const touring = /touring|adventure|waterproof|\bwp\b|all.?season|rally|tour/i;
  const roadTabs = ["Jackets", "Gloves", "Boots", "Luggage", "Helmets"]
    .map((c) => ({ name: c, items: pickVaried(products.filter((p) => p.category === c && good(p) && touring.test(`${p.name} ${p.variant}`)), 12, 3).map(toPick) }))
    .filter((t) => t.items.length >= 4);

  const brandCounts = new Map<string, number>();
  for (const p of products) brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1);
  const brands = knownBrands.filter((b) => brandCounts.has(b));
  const brandTotal = [...brandCounts.keys()].filter((b) => b !== "Unspecified").length;

  const kit = buildKits(buildPools(products), 20000, "city", ["Helmet", "Jacket", "Gloves"]).kits[0];
  const bikes = [...bikeIndex(products)]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 12)
    .map(([slug, list]) => ({ bike: findBike(slug)!, count: list.length }));

  const storeCounts = new Map<string, number>();
  for (const p of products) for (const o of p.offers) storeCounts.set(o.storeId, (storeCounts.get(o.storeId) || 0) + 1);
  const storeList = stores
    .filter((s) => storeCounts.has(s.id))
    .map((s) => ({ ...s, count: storeCounts.get(s.id)! }))
    .sort((a, b) => b.count - a.count);

  const ticker = [
    `${products.length.toLocaleString("en-IN")} products`,
    `${storeList.length} Indian stores`,
    "Prices checked every night",
    "No fake discounts",
    `${brandTotal} brands`,
    "Parts for 60+ bikes",
  ];

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.ticker} aria-hidden>
          <div>
            {[...ticker, ...ticker, ...ticker].map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>
        <div className={`wrap ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <h1>Gear up for less.</h1>
            <p className={styles.heroLead}>Same helmet, different price. We check {storeList.length} stores every night.</p>
            <QuickBuild />
            <Link href="/gear" className={styles.heroGhost}>
              Or browse all {products.length.toLocaleString("en-IN")} products
            </Link>
          </div>
          {compares.length > 0 && (
            <div className={styles.deck}>
              {compares.map(({ p, offers, save }, i) => (
                <Link key={p.id} href={`/product/${encodeURIComponent(p.id)}`} className={styles.compare} data-i={i} tabIndex={i === 0 ? 0 : -1} aria-hidden={i !== 0}>
                  <span className={styles.compareImage}>
                    <span className={styles.compareTag}>Same item · {offers.length} stores</span>
                    <ProductImage p={p} />
                  </span>
                  <span className={styles.compareBody}>
                    <small>{p.brand}</small>
                    <strong>{p.name}</strong>
                    <span className={styles.compareRows}>
                      {offers.map((o, j) => (
                        <span key={o.storeId} data-low={j === 0}>
                          {o.storeName}
                          <b>{money(o.price)}</b>
                        </span>
                      ))}
                    </span>
                    <span className={styles.compareSave}>Save {money(save)} at {offers[0].storeName}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
        {summary && <p className={styles.heroStamp}>Checked {checkedLabel(summary.generatedAt)}</p>}
      </section>

      {/* Top 10 */}
      {topTen.length >= 5 && (
        <section className={styles.paper}>
          <div className="wrap">
            <h2 className={styles.topTitle}>
              <span className={styles.outline}>TOP 10</span>
              <span className={styles.script}>helmets</span>
            </h2>
            <p className={styles.topSub}>Full-face and modular helmets from brands riders trust, at tonight&apos;s lowest price.</p>
            <TopTen items={topTen} />
          </div>
        </section>
      )}

      {/* Built for the road */}
      {roadTabs.length > 0 && (
        <section className={styles.band}>
          <div className="wrap">
            <div className={styles.bandHead}>
              <div>
                <h2>
                  Built for <em>the road.</em>
                </h2>
                <p>Touring and adventure gear: waterproof, all-season, made for long days.</p>
              </div>
              <Link href="/gear?q=touring" className={styles.bandButton}>
                View all <ChevronRight size={18} aria-hidden />
              </Link>
            </div>
            <div className={styles.circles}>
              {brands.map((b) => (
                <Link key={b} href={`/gear?brand=${encodeURIComponent(b)}`} title={`${b} gear`} data-long={b.length > 7 || undefined}>
                  {b}
                </Link>
              ))}
            </div>
            <TabbedRow tabs={roadTabs} />
          </div>
        </section>
      )}

      {/* Categories */}
      <section className={`wrap ${styles.section}`}>
        <div className={styles.sectionHead}>
          <h2>Shop by category</h2>
          <Link href="/gear" className={styles.viewAll}>
            View all <ChevronRight size={16} aria-hidden />
          </Link>
        </div>
        <div className={styles.categories}>
          {tiles.map((t) => (
            <Link key={t.name} href={`/gear?category=${encodeURIComponent(t.name)}`} className={styles.category}>
              <span className={styles.categoryImage}>{t.product && <ProductImage p={t.product} />}</span>
              <span className={styles.categoryName}>{t.name}</span>
              <small>{t.count.toLocaleString("en-IN")} products</small>
            </Link>
          ))}
        </div>
      </section>

      {/* Bikes */}
      <section className={`wrap ${styles.section} ${styles.split}`}>
        <Link href="/bikes" className={styles.poster}>
          <span>
            Fits
            <br />
            your
            <br />
            bike
          </span>
          <small>
            Shop by motorcycle <ArrowRight size={16} aria-hidden />
          </small>
        </Link>
        <div className={styles.bikes}>
          <h2>Parts and accessories for your motorcycle</h2>
          <p>Crash guards, racks, exhausts and more, matched to the bike named in each listing.</p>
          <ul>
            {bikes.map(({ bike, count }) => (
              <li key={bike.slug}>
                <Link href={`/bikes/${bike.slug}`}>
                  <span>
                    {bike.make} <b>{bike.model}</b>
                  </span>
                  <small>{count}</small>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Kit */}
      {kit && (
        <section className={`wrap ${styles.section} ${styles.kitSection}`}>
          <div className={styles.kitText}>
            <h2>
              Your whole kit, <em>on budget.</em>
            </h2>
            <p>
              Tell us your budget and how you ride. We split it across helmet, jacket, gloves, pants and boots, and pick from what&apos;s in stock tonight.
              Here&apos;s ₹20,000 for city riding:
            </p>
            <Link href="/build" className="primary-button">
              Build yours <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className={styles.receipt}>
            {kit.picks.map((pick) => (
              <Link key={pick.piece} href={`/product/${encodeURIComponent(pick.item.id)}`} className={styles.receiptRow}>
                <span className={styles.receiptImage}>
                  <ProductImage p={pick.item} />
                </span>
                <span className={styles.receiptName}>
                  <small>{pick.piece}</small>
                  {pick.item.brand} {pick.item.name.replace(new RegExp(`^${pick.item.brand}\\s+`, "i"), "")}
                </span>
                <b>{money(pick.item.price)}</b>
              </Link>
            ))}
            <div className={styles.receiptTotal}>
              <span>Total</span>
              <b>{money(kit.total)}</b>
            </div>
          </div>
        </section>
      )}

      {/* Honest */}
      <section id="honest" className={styles.honest}>
        <div className="wrap">
          <h2>How we keep it honest</h2>
          <ul>
            <li>
              <Scale size={24} aria-hidden />
              <strong>Ranked by price and stock</strong>
              <p>The cheapest in-stock store comes first. If we ever show a paid spot, it will say Sponsored.</p>
            </li>
            <li>
              <History size={24} aria-hidden />
              <strong>Our own price history</strong>
              <p>We record every price change, so a discount is measured against real past prices, not just the MRP a store prints.</p>
            </li>
            <li>
              <ShieldCheck size={24} aria-hidden />
              <strong>No invented safety claims</strong>
              <p>We only mention CE, ISI, DOT or ECE when the store&apos;s own listing says it. Check the label before you buy.</p>
            </li>
            <li>
              <BadgeCheck size={24} aria-hidden />
              <strong>Like for like</strong>
              <p>Prices are for the exact size and colour shown, and stores only sit side by side when it&apos;s the same product.</p>
            </li>
          </ul>
        </div>
      </section>

      {/* Stores */}
      <section id="stores" className={`wrap ${styles.section}`}>
        <div className={styles.sectionHead}>
          <h2>Stores we check every night</h2>
        </div>
        <ul className={styles.stores}>
          {storeList.map((s, i) => (
            <li key={s.id} className={i >= 6 ? styles.more : undefined}>
              <Link href={`/gear?store=${encodeURIComponent(s.id)}`}>
                <span>{s.name}</span>
                <small>{s.count.toLocaleString("en-IN")} products</small>
              </Link>
            </li>
          ))}
        </ul>
        <p className={styles.storeNote}>Amazon, Flipkart and a few brand stores block automated price checks, so they aren&apos;t here yet.</p>
      </section>
    </main>
  );
}
