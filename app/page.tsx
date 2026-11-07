import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";
import { ChevronRight, Crown, Mountain, TrendingUp, Wrench, type LucideIcon } from "lucide-react";
import { ProductImage } from "@/components/product-card";
import { storeCards, type StoreCard } from "@/lib/shop";
import { TopTen, TabbedRow, HeroBanner, type Pick } from "./home-client";
import { RaceLine } from "@/components/fx/race-line";
import { Tread } from "@/components/fx/tread";
import fx from "@/components/fx/fx.module.css";
import styles from "./home.module.css";

export const revalidate = 21600;

const notGear = /visor|pad|liner|lock|spoiler|cover|pinlock|peak|cheek|strap|cleaner|spray|sticker|mount|intercom|kids|balaclava|slider|plate|spare|mechanism|screw|bolt|replacement|accessor/i;
const shop = (q: Record<string, string>) => `/store?${new URLSearchParams(q)}`;
const model = (c: StoreCard) => `${c.brand}|${c.name.toLowerCase().replace(/\s*[-(].*$/, "")}`;
// Listed by the most other sellers = what riders buy most.
const popular = (a: StoreCard, b: StoreCard) => b.others.length - a.others.length || b.price - a.price;

function toPick(c: StoreCard): Pick {
  const off = c.mrp ? Math.round(((c.mrp - c.price) / c.mrp) * 100) : 0;
  return { id: c.id, name: c.name, brand: c.brand, image: c.image, price: c.price, mrp: c.mrp, note: off >= 5 ? `${off}% off` : c.category };
}

/** One listing per model, at most `perBrand` per brand, so rows don't fill up with one brand's sizes. */
function pickVaried(list: StoreCard[], take: number, perBrand = 2) {
  const seen = new Set<string>();
  const brands = new Map<string, number>();
  const out: StoreCard[] = [];
  for (const c of list) {
    if (out.length === take) break;
    if (seen.has(model(c)) || (brands.get(c.brand) || 0) >= perBrand) continue;
    seen.add(model(c));
    brands.set(c.brand, (brands.get(c.brand) || 0) + 1);
    out.push(c);
  }
  return out;
}

export default async function Home() {
  const all = await storeCards();
  const gear = all.filter((c) => !notGear.test(c.name));
  const inCat = (cat: string) => gear.filter((c) => c.category === cat);
  const rows = (cats: string[], pick: (cat: string) => StoreCard[], perBrand = 2) =>
    cats.map((name) => ({ name, items: pickVaried(pick(name), 12, perBrand).map(toPick) })).filter((t) => t.items.length >= 4);

  const topTen = pickVaried(inCat("Helmets").sort(popular), 10, 2).map(toPick);
  const trendingTabs = rows(["Helmets", "Jackets", "Boots", "Pants", "Gloves"], (c) => inCat(c).sort(popular));
  const partsTabs = rows(["Bike Accessories", "Maintenance & Parts", "Luggage", "Electronics"], (c) => inCat(c).sort(popular));
  const premiumBrands = ["AGV", "Shoei", "Arai", "Alpinestars", "Dainese", "HJC", "Shark", "Rev'it", "Klim", "Akrapovic"];
  const premiumTabs = rows(premiumBrands, (b) => gear.filter((c) => c.brand === b).sort(popular), 12).slice(0, 6);
  const touring = /touring|adventure|waterproof|\bwp\b|all.?season|rally|tour/i;
  const roadTabs = rows(["Jackets", "Gloves", "Boots", "Luggage", "Helmets"], (c) => inCat(c).filter((x) => touring.test(x.name)), 3);

  const counts = new Map<string, number>();
  for (const c of all) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
  const tiles = [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, count]) => ({ name, count, product: inCat(name).sort(popular)[0] }));

  const brandCounts = new Map<string, number>();
  for (const c of all) if (c.brand !== "Unspecified") brandCounts.set(c.brand, (brandCounts.get(c.brand) ?? 0) + 1);
  const logoFor = (b: string) => {
    const slug = b.toLowerCase().replace(/\s+/g, "-");
    return existsSync(path.join(process.cwd(), "public/brand-logos", `${slug}.png`)) ? `/brand-logos/${slug}.png` : null;
  };
  const brandGrid = [...brandCounts]
    .map(([name, n]) => ({ name, n, logo: logoFor(name) }))
    .sort((a, b) => Number(!!b.logo) - Number(!!a.logo) || b.n - a.n)
    .slice(0, 20);

  const total = all.length.toLocaleString("en-IN");
  const ticker = [`${total} products`, "Free delivery across India", "UPI, cards, netbanking", `${brandCounts.size} brands`, "Parts for 60+ bikes"];

  const slides = [
    <div key="now" className={`${styles.slideBody} ${styles.slideNow}`}>
      {/* Pre-sized WebP banners, faster than on-the-fly optimisation; phones get the portrait version. */}
      <picture>
        <source media="(max-width: 760px)" srcSet="/banners/now-m640.webp 640w, /banners/now-m1080.webp 1080w" sizes="100vw" />
        <img src="/banners/now-1920.webp" srcSet="/banners/now-960.webp 960w, /banners/now-1920.webp 1920w" sizes="100vw" alt="" fetchPriority="high" className={styles.nowBg} />
      </picture>
      <div className={`wrap ${styles.slideInner}`}>
        <div className={styles.nowText}>
          <p className={styles.nowBrand}>GearCircle</p>
          <h1 className={styles.nowTitle}>Now</h1>
          <p className={styles.nowSub}>Riding gear and bike parts, delivered</p>
          <p className={styles.nowLead}>{total} products, free delivery across India</p>
          <Button asChild variant="glass" size="xl" className="mt-8">
            <Link href="/store">Shop now</Link>
          </Button>
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
          <p className={styles.slideLead}>Race helmets, leathers, boots and exhausts from the brands racers use.</p>
          <Button asChild variant="neon" size="xl" className="mt-7">
            <Link href={shop({ q: "race" })}>Shop track gear</Link>
          </Button>
        </div>
      </div>
    </div>,
  ];

  const tileTone = ["#fff1e6", "#e8f0ff", "#ecfdf3", "#f5ecff", "#fff8db", "#ffe9ef", "#e6fbff", "#f3f3f2"];

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

      {topTen.length >= 5 && (
        <section className={styles.paper}>
          <div className="wrap">
            <h2 className={styles.topTitle}>
              <span className={styles.outline}>TOP 10</span>
              <span className={styles.script}>helmets</span>
            </h2>
            <p className={styles.topSub}>Full-face and modular helmets from brands riders trust.</p>
            <TopTen items={topTen} />
          </div>
        </section>
      )}

      {trendingTabs.length > 0 && (
        <Feature tone="sunset" art={["Fresh", "drops"]} line="What riders are buying this week" href="/store" pick={trendingTabs[0].items[0]}>
          <Head icon={TrendingUp} tone="sunset" eyebrow="What's new" title="Trending in riding gear" sub="What riders buy most." href="/store" />
          <TabbedRow tabs={trendingTabs} light />
        </Feature>
      )}

      <Tread />

      {premiumTabs.length > 0 && (
        <Feature tone="electric" art={["Race", "grade"]} line="The helmets and leathers racers use" href="/store" pick={premiumTabs[0].items[0]}>
          <Head icon={Crown} tone="electric" eyebrow="Premium brands" title={<>Shop <em>premium.</em></>} sub="AGV, Shoei, Arai, Alpinestars, Dainese and more." href="/store" />
          <TabbedRow tabs={premiumTabs} light />
        </Feature>
      )}

      {partsTabs.length > 0 && (
        <section className={`wrap ${styles.section}`}>
          <Head icon={Wrench} tone="mint" eyebrow="For your motorcycle" title={<>Parts and <em>accessories.</em></>} sub="Crash guards, exhausts, racks, luggage and more." href={shop({ category: "Bike Accessories" })} />
          <TabbedRow tabs={partsTabs} light />
        </section>
      )}

      {roadTabs.length > 0 && (
        <Feature tone="sand" art={["Go", "further"]} line="Waterproof, all-season gear for long days" href={shop({ q: "touring" })} pick={roadTabs[0].items[0]} flip>
          <Head icon={Mountain} tone="sand" eyebrow="Touring and adventure" title={<>Built for <em>the road.</em></>} sub="Waterproof, all-season gear made for long days." href={shop({ q: "touring" })} />
          <TabbedRow tabs={roadTabs} light />
        </Feature>
      )}

      <section className={`${styles.section} ${styles.mosaicWrap}`}>
        <div className={styles.mosaic}>
          {tiles.map((t, i) => (
            <Link key={t.name} href={shop({ category: t.name })} className={styles.tile} data-i={i} style={{ background: tileTone[i % tileTone.length] }}>
              <span className={styles.tileName}>{t.name}</span>
              <span className={styles.tileImage}>{t.product && <ProductImage p={t.product} />}</span>
              <small>{t.count.toLocaleString("en-IN")} products</small>
            </Link>
          ))}
        </div>
      </section>

      <Tread />

      <section className={`wrap ${styles.section} ${styles.brandsBlock}`}>
        <small className={styles.centerKicker}>Shop from the</small>
        <h2 className={styles.centerH}>Top brands</h2>
        <div className={`${fx.marquee} ${styles.brandMarquee}`}>
          {[brandGrid.slice(0, 10), brandGrid.slice(10)].map((row, r) => (
            <ul key={r} className={`${fx.marqueeRow} ${styles.brandRow}`} data-reverse={r === 1}>
              {[...row, ...row].map((b, i) => (
                <li key={`${b.name}-${i}`} aria-hidden={i >= row.length || undefined}>
                  <Link href={shop({ brand: b.name })} title={`${b.name}: ${b.n.toLocaleString("en-IN")} products`} tabIndex={i >= row.length ? -1 : undefined}>
                    {b.logo ? <Image src={b.logo} alt={b.name} width={120} height={60} /> : <span>{b.name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
        <Button asChild variant="outline" size="lg" className="mt-8">
          <Link href="/store">Shop all products</Link>
        </Button>
      </section>
    </main>
  );
}

type Tone = "sunset" | "electric" | "mint" | "sand";

/** Culture Circle style section head: icon disc, small eyebrow, title, grey sub line, View all on the right. */
function Head({ icon: Icon, eyebrow, title, sub, href, tone }: { icon?: LucideIcon; eyebrow: string; title: React.ReactNode; sub?: string; href?: string; tone?: Tone }) {
  return (
    <div className={styles.ccHead} data-tone={tone}>
      {Icon && (
        <span className={styles.ccIcon} aria-hidden>
          <Icon size={24} strokeWidth={1.75} />
        </span>
      )}
      <div className={styles.ccHeadText}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
        {sub && <p className={styles.ccSub}>{sub}</p>}
      </div>
      {href && (
        <Link href={href} className={styles.ccViewAll}>
          View all <ChevronRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}

/** A tall colour banner beside a section, like Culture Circle's "Cultured Kids Club" block. */
function Feature({ tone, art, line, href, pick, flip, children }: { tone: Tone; art: [string, string]; line: string; href: string; pick?: Pick; flip?: boolean; children: React.ReactNode }) {
  return (
    <section className={`wrap ${styles.section} ${styles.feature}`} data-flip={flip || undefined}>
      <Link href={href} className={styles.featureArt} data-tone={tone}>
        <span className={styles.featureWord}>
          {art[0]}
          <br />
          {art[1]}
        </span>
        <span className={styles.featureLine}>{line}</span>
        {pick && (
          <span className={styles.featurePick}>
            <ProductImage p={pick} />
          </span>
        )}
        <span className={styles.featureCta}>
          Shop now <ChevronRight size={16} aria-hidden />
        </span>
      </Link>
      <div className={styles.featureBody}>{children}</div>
    </section>
  );
}
