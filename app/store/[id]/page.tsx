import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { storeCards, storeItem } from "@/lib/shop";
import { Gallery } from "@/app/product/[id]/gallery";
import { BuyBox } from "./buy-box";
import { ProductTile } from "../card";
import styles from "../store.module.css";

type Props = { params: Promise<{ id: string }> };

const INSTAGRAM = "https://www.instagram.com/ridecompare26/";

async function load(params: Props["params"]) {
  const { id } = await params;
  try {
    return await storeItem(decodeURIComponent(id));
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const it = await load(params);
  return { title: it ? `${it.brand} ${it.name} | GearCircle Store` : "GearCircle Store", robots: { index: false } };
}

export default async function StoreProduct({ params }: Props) {
  const it = await load(params);
  if (!it) redirect("/store");
  const cards = await storeCards();
  const others = cards.filter((c) => c.id !== it.id);
  const sameBrand = others.filter((c) => c.brand === it.brand && c.category === it.category).slice(0, 10);
  const similar = others.filter((c) => c.category === it.category && c.brand !== it.brand && Math.abs(c.price - it.price) <= it.price * 0.5).slice(0, 10);

  const facts = [
    { k: "Brand", v: it.brand },
    { k: "Category", v: it.category },
    it.sizes.length ? { k: "Sizes", v: it.sizes.length > 3 ? `${it.sizes[0]} to ${it.sizes.at(-1)}` : it.sizes.join(", ") } : it.bikes.length ? { k: "Fits", v: `${it.bikes.length} bike${it.bikes.length > 1 ? "s" : ""}` } : { k: "Size", v: "One size" },
  ];
  const faq = [
    it.sizes.length > 0 && {
      q: "Which size should I pick?",
      a: "Go by the brand's own size chart. If you're between two sizes, message us on Instagram with your measurements and we'll help you choose before you pay.",
    },
    it.bikes.length > 0 && {
      q: "Will this fit my bike?",
      a: `It's listed for: ${it.bikes.join(", ")}. If your bike isn't on the list, send us the model and year on Instagram and we'll check.`,
    },
    { q: "How do I pay?", a: "UPI, debit and credit cards, and netbanking, all through Razorpay." },
    { q: "Does delivery cost extra?", a: "No. Delivery is free anywhere in India." },
    { q: "Who do I talk to if something's wrong?", a: "Message us on Instagram. A person on our team replies, not a bot." },
  ].filter((x): x is { q: string; a: string } => Boolean(x));

  return (
    <main className={`wrap ${styles.page}`} data-pdp>
      <div className={styles.top}>
        <div className={styles.media}>
          <Gallery photos={it.photos} name={`${it.brand} ${it.name}`} />
        </div>

        <div className={styles.side}>
          <section className={styles.panel}>
            <p className={styles.trail}>
              <Link href={`/store?category=${encodeURIComponent(it.category)}`}>{it.category}</Link>
              <span aria-hidden> · </span>
              <Link href={`/store?brand=${encodeURIComponent(it.brand)}`}>{it.brand}</Link>
            </p>
            <h1 className={styles.name}>{it.name}</h1>
            <dl className={styles.facts}>
              {facts.map((f) => (
                <div key={f.k}>
                  <dt>{f.k}</dt>
                  <dd>{f.v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={styles.panel}>
            <BuyBox item={{ id: it.id, name: it.name, brand: it.brand, image: it.image, price: it.price, mrp: it.mrp, sizes: it.sizes }} instagram={INSTAGRAM} />
          </section>

          <section className={styles.panel}>
            <h2 className={styles.eyebrow}>Product information</h2>
            <dl className={styles.specs}>
              <div><dt>Brand</dt><dd>{it.brand}</dd></div>
              <div><dt>Category</dt><dd>{it.category}</dd></div>
              {it.sizes.length > 0 && <div><dt>Sizes</dt><dd>{it.sizes.join(", ")}</dd></div>}
              {it.bikes.length > 0 && <div><dt>Fits</dt><dd>{it.bikes.join(", ")}</dd></div>}
            </dl>

            <h2 className={styles.eyebrow} style={{ marginTop: 28 }}>Most asked questions</h2>
            <div className={styles.faq}>
              {faq.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>
                    {f.q}
                    <ChevronDown size={18} aria-hidden />
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>

      {sameBrand.length > 0 && (
        <section className={styles.rail}>
          <h2 className={styles.eyebrow}>More {it.category.toLowerCase()} from {it.brand}</h2>
          <div className={styles.railTrack}>
            {sameBrand.map((c) => <ProductTile key={c.id} it={c} />)}
          </div>
        </section>
      )}
      {similar.length > 0 && (
        <section className={styles.rail}>
          <h2 className={styles.eyebrow}>Similar {it.category.toLowerCase()}</h2>
          <div className={styles.railTrack}>
            {similar.map((c) => <ProductTile key={c.id} it={c} />)}
          </div>
        </section>
      )}
    </main>
  );
}
