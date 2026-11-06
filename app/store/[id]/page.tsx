import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { money } from "@/lib/catalog";
import { storeItem } from "@/lib/shop";
import { Gallery } from "@/app/product/[id]/gallery";
import { BuyBox } from "./buy-box";
import styles from "../store.module.css";

type Props = { params: Promise<{ id: string }> };

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
  const off = it.mrp ? Math.round(((it.mrp - it.price) / it.mrp) * 100) : 0;
  return (
    <main className={`wrap ${styles.page}`} data-pdp>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href="/store">Store</Link>
        <span aria-hidden>/</span>
        <span>{it.category}</span>
      </nav>
      <div className={styles.top}>
        <Gallery photos={it.photos} name={`${it.brand} ${it.name}`} />
        <div>
          <div className={styles.brand}>{it.brand}</div>
          <h1 className={styles.name}>{it.name}</h1>
          <div className={styles.priceRow}>
            <span className={styles.price}>{money(it.price)}</span>
            {it.mrp && <s className={styles.mrp}>{money(it.mrp)}</s>}
            {off > 0 && <span className={styles.badge}>{off}% off</span>}
          </div>
          <p className={styles.tax}>Inclusive of all taxes</p>
          <BuyBox item={{ id: it.id, name: it.name, brand: it.brand, image: it.image, price: it.price, sizes: it.sizes }} />
          <div className={styles.trust}>
            <div><b>Secure payment</b>UPI, cards and netbanking via Razorpay</div>
            <div><b>Free delivery</b>Ships across India</div>
            <div><b>Real help</b>Message us on Instagram, a person replies</div>
          </div>
        </div>
      </div>
    </main>
  );
}
