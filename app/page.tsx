import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";
import { BadgeCheck, History, Scale, ShieldCheck } from "lucide-react";
import { snapshot } from "@/lib/catalog-server";
import { money, rankedOffers, type Product } from "@/lib/catalog";
import { ProductImage } from "@/components/product-card";
import { buildKits, buildPools } from "@/lib/kit";
import { bikeIndex, findBike } from "@/lib/bikes";
import { TopTen, TabbedRow, HeroBanner, type Pick } from "./home-client";
import { RaceLine } from "@/components/fx/race-line";
import { MovieCards, type MovieKit } from "@/components/fx/movie-cards";
import { Tread } from "@/components/fx/tread";
import fx from "@/components/fx/fx.module.css";
import reelKits from "@/lib/reel-kits.json";
import styles from "./home.module.css";

export const revalidate = 21600;

const knownBrands = [
  "Rynox",
  "ViaTerra",
  "Axor",
  "LS2",
  "SMK",
  "MT Helmets",
  "AGV",
  "Alpinestars",
  "Solace",
  "Raida",
  "Steelbird",
  "Studds",
  "KYT",
  "HJC",
  "Korda",
  "DSG",
  "Spidi",
  "Acerbis",
];
const notGear = /visor|pad|liner|lock|spoiler|cover|pinlock|peak|cheek|strap|cleaner|spray|sticker|mount|intercom|kids|balaclava|slider|plate|spare|mechanism|screw|bolt|replacement|accessor/i;
const categoryTiles = [
  { name: "Helmets", match: /^(?!.*\b(back ?pack|bag)\b).*helmet/i },
  { name: "Jackets", match: /jacket/i },
  { name: "Gloves", match: /glove/i },
  { name: "Boots", match: /boot|shoe/i },
  { name: "Pants", match: /^(?!.*\brain\b).*(riding|touring|kevlar|armou?r|mesh).*(pant|jean|trouser)/i },
  { name: "Luggage", match: /bag|pannier|saddle/i },
  { name: "Protection", match: /protector|armou?r|guard/i },
];

const good = (p: Product) =>
  knownBrands.includes(p.brand) && p.image.includes("cdn.shopify.com") && p.offers.some((o) => o.inStock === true) && !notGear.test(p.name);
const model = (p: Product) => `${p.brand}|${p.name.toLowerCase().replace(/\s*[-(].*$/, "")}`;

function toPick(p: Product): Pick {
  const o = rankedOffers(p)[0];
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    image: p.image,
    price: o.price,
    mrp: o.mrp ?? null,
    storeName: o.storeName,
    stores: p.offers.length,
  };
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
  const { products, stores } = await snapshot();
  const price = (p: Product) => rankedOffers(p)[0].price;

  const helmets = products
    .filter((p) => p.category === "Helmets" && good(p) && /helmet/i.test(p.name) && price(p) >= 3000 && price(p) <= 25000)
    .sort((a, b) => b.offers.length - a.offers.length || price(b) - price(a));
  const topTen = pickVaried(helmets, 10, 2).map(toPick);

  const tiles = categoryTiles.map((t) => ({
    ...t,
    count: products.filter((p) => p.category === t.name).length,
    product:
      products.find((p) => p.category === t.name && good(p) && t.match.test(p.name)) ??
      products.find((p) => p.category === t.name && p.image.includes("cdn.shopify.com") && t.match.test(p.name)),
  }));
  // The pitch in one picture: real products sold at several stores, with what you save by picking the cheapest.

  const brandCounts = new Map<string, number>();
  for (const p of products) brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1);
  const brandTotal = [...brandCounts.keys()].filter((b) => b !== "Unspecified").length;

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

  // In-stock offers at least 10% under the store's own MRP (capped at 80%, beyond that the MRP is usually made up).
  const dealOf = (p: Product) => {
    const o = rankedOffers(p).find((x) => x.inStock === true && x.mrp && x.mrp > x.price);
    if (!o || !o.mrp) return null;
    const pct = Math.round(((o.mrp - o.price) / o.mrp) * 100);
    return pct >= 10 && pct <= 80 ? pct : null;
  };
  const dealCats = ["Helmets", "Jackets", "Gloves", "Boots", "Luggage"];
  const dealTabs = dealCats
    .map((c) => ({
      name: c,
      items: pickVaried(
        products
          .filter((p) => p.category === c && good(p) && (categoryTiles.find((t) => t.name === c)?.match.test(p.name) ?? true) && dealOf(p) !== null)
          .sort((a, b) => dealOf(b)! - dealOf(a)!),
        12,
        2,
      ).map(toPick),
    }))
    .filter((t) => t.items.length >= 4);
  const topDeal = Math.max(0, ...products.filter(good).map((p) => dealOf(p) ?? 0));

  const logoFor = (b: string) => {
    const slug = b.toLowerCase().replace(/\s+/g, "-");
    return existsSync(path.join(process.cwd(), "public/brand-logos", `${slug}.png`)) ? `/brand-logos/${slug}.png` : null;
  };
  const brandGrid = [...brandCounts]
    .filter(([b]) => b !== "Unspecified")
    .map(([b, n]) => ({ name: b, n, logo: logoFor(b) }))
    .sort((a, b) => Number(!!b.logo) - Number(!!a.logo) || b.n - a.n)
    .slice(0, 20);

  const touring = /touring|adventure|waterproof|\bwp\b|all.?season|rally|tour/i;
  const roadTabs = ["Jackets", "Gloves", "Boots", "Luggage", "Helmets"]
    .map((c) => ({ name: c, items: pickVaried(products.filter((p) => p.category === c && good(p) && touring.test(`${p.name} ${p.variant}`)), 12, 3).map(toPick) }))
    .filter((t) => t.items.length >= 4);
  const kit = buildKits(buildPools(products), 20000, "city", ["Helmet", "Jacket", "Gloves"]).kits[0];
  const bikes = [...bikeIndex(products)]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 12)
    .map(([slug, list]) => ({ bike: findBike(slug)!, count: list.length }));
  const byId = new Map(products.map((p) => [p.id, p]));
  const movieKits: MovieKit[] = Object.values(reelKits)
    .filter((k) => k.cover && k.items.length > 1 && !("movie" in k && k.movie === false))
    .map((k) => ({
      code: k.code,
      title: k.title,
      cover: k.cover!,
      premium: k.premium,
      total: k.items.reduce((sum, i) => sum + (byId.has(i.id) ? price(byId.get(i.id)!) : 0), 0),
    }));
  const slides = [
    <div key="now" className={`${styles.slideBody} ${styles.slideNow}`}>
      {/* Pre-sized WebP banners, faster than on-the-fly optimisation; phones get the portrait version. */}
      <picture>
        <source media="(max-width: 760px)" srcSet="/banners/now-m640.webp 640w, /banners/now-m1080.webp 1080w" sizes="100vw" />
        <img src="/banners/now-1920.webp" srcSet="/banners/now-960.webp 960w, /banners/now-1920.webp 1920w" sizes="100vw" alt="" fetchPriority="high" className={styles.nowBg} />
      </picture>
      <div className={`wrap ${styles.slideInner}`}>
        <div className={styles.nowText}>
          <p className={styles.nowBrand}>RideCompare</p>
          <h1 className={styles.nowTitle}>Now</h1>
          <p className={styles.nowSub}>Lowest price, checked tonight</p>
          <p className={styles.nowLead}>{storeList.length} Indian stores, {products.length.toLocaleString("en-IN")} products</p>
          <Button asChild variant="glass" size="xl" className="mt-8"><Link href="/gear">
            Get your kit tonight
          </Link></Button>
        </div>
      </div>
    </div>,
    <div key="track" className={`${styles.slideBody} ${styles.slideTrack}`}>
      <picture>
        <source media="(max-width: 760px)" srcSet="/banners/track-m640.webp 640w, /banners/track-m1080.webp 1080w" sizes="100vw" />
        <img src="/banners/track-1920.webp" srcSet="/banners/track-960.webp 960w, /banners/track-1920.webp 1920w" sizes="100vw" alt="" className={styles.trackBg} />
      </picture>
      <div className={`wrap ${styles.slideInner}`}>
        <div className={styles.trackText}>
          <p className={styles.trackKicker}>Track day ready</p>
          <h2 className={styles.trackTitle}>
            Built for <em>the track.</em>
          </h2>
          <p className={styles.slideLead}>Race helmets, leathers, sliders and back protectors, at tonight&apos;s lowest price.</p>
          <Button asChild variant="neon" size="xl" className="mt-7">
            <Link href="/gear?q=race">
              Shop track gear
            </Link>
          </Button>
        </div>
      </div>
    </div>,
  ].filter(Boolean);

  const tileTone = ["#f3f3f2", "#ecfde6", "#f3f3f2", "#f3f3f2", "#ecfde6", "#f3f3f2", "#ecfde6", "#f3f3f2"];

  return (
    <main>
      <RaceLine />
      <div className={styles.ticker} aria-hidden>
        <div>
          {[...ticker, ...ticker, ...ticker].map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>

      <HeroBanner slides={slides} />

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

      <Tread />

      {/* Movie looks */}
      {movieKits.length > 0 && (
        <section className={`${styles.section} ${styles.moviesBlock}`}>
          <div className={`wrap ${styles.sectionHead}`}>
            <div>
              <h2>
                Ride like <em>the movies.</em>
              </h2>
              <p className={styles.sectionSub}>Iconic biker looks from our reels, rebuilt with real gear for a fraction of the price.</p>
            </div>
          </div>
          <MovieCards kits={movieKits} />
        </section>
      )}

      {/* Deals tile + tabs */}
      {dealTabs.length > 0 && (
        <section className={`wrap ${styles.section} ${styles.dealSplit}`}>
          <Link href="/deals" className={styles.dealTile}>
            <span className={styles.dealTileKicker}>Tonight&apos;s</span>
            <span className={styles.dealTileTitle}>Deals</span>
            <span className={styles.dealTileSub}>Up to {topDeal}% below MRP</span>
          </Link>
          <div className={styles.dealRight}>
            <div className={styles.sectionHead}>
              <h2 className={styles.plainH}>Below the store&apos;s MRP</h2>
              <Button asChild variant="outline" size="sm"><Link href="/deals">
                View all
              </Link></Button>
            </div>
            <TabbedRow tabs={dealTabs} light />
          </div>
        </section>
      )}

      {/* Built for the road */}
      {roadTabs.length > 0 && (
        <section className={styles.band} data-dark>
          <div className="wrap">
            <div className={styles.bandHead}>
              <div>
                <h2>
                  Built for <em>the road.</em>
                </h2>
                <p>Touring and adventure gear: waterproof, all-season, made for long days.</p>
              </div>
              <Button asChild variant="light" size="lg"><Link href="/gear?q=touring">
                View all
              </Link></Button>
            </div>
            <TabbedRow tabs={roadTabs} />
          </div>
        </section>
      )}

      {/* Category mosaic */}
      <section className={`${styles.section} ${styles.mosaicWrap}`}>
        <div className={styles.mosaic}>
          {tiles.map((t, i) => (
            <Link
              key={t.name}
              href={`/gear?category=${encodeURIComponent(t.name)}`}
              className={styles.tile}
              data-i={i}
              style={{ background: tileTone[i % tileTone.length] }}
            >
              <span className={styles.tileName}>{t.name}</span>
              <span className={styles.tileImage}>{t.product && <ProductImage p={t.product} />}</span>
              <small>{t.count.toLocaleString("en-IN")} products</small>
            </Link>
          ))}
        </div>
      </section>

      <Tread />

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
            Shop by motorcycle
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
            <Button asChild size="lg"><Link href="/build">
              Build yours
            </Link></Button>
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

      {/* Brands */}
      <section className={`wrap ${styles.section} ${styles.brandsBlock}`}>
        <small className={styles.centerKicker}>Shop from the</small>
        <h2 className={styles.centerH}>Top brands at the lowest prices</h2>
        <div className={`${fx.marquee} ${styles.brandMarquee}`}>
          {[brandGrid.slice(0, 10), brandGrid.slice(10)].map((row, r) => (
            <ul key={r} className={`${fx.marqueeRow} ${styles.brandRow}`} data-reverse={r === 1}>
              {[...row, ...row].map((b, i) => (
                <li key={`${b.name}-${i}`} aria-hidden={i >= row.length || undefined}>
                  <Link href={`/gear?brand=${encodeURIComponent(b.name)}`} title={`${b.name}: ${b.n.toLocaleString("en-IN")} products`} tabIndex={i >= row.length ? -1 : undefined}>
                    {b.logo ? <Image src={b.logo} alt={b.name} width={120} height={60} /> : <span>{b.name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
        <Button asChild variant="outline" size="lg" className="mt-8"><Link href="/brands">
          View all brands
        </Link></Button>
      </section>

      <Tread />

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
