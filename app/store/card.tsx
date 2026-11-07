import Link from "next/link";
import { Plus } from "lucide-react";
import { money } from "@/lib/catalog";
import type { StoreCard } from "@/lib/shop";
import styles from "./store.module.css";

/** One product tile, used by the shop grid and the rails on a product page. */
export function ProductTile({ it }: { it: StoreCard }) {
  return (
    <Link href={`/store/${encodeURIComponent(it.id)}`} className={styles.card}>
      <div className={styles.cardImg}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={it.image} alt="" loading="lazy" referrerPolicy="no-referrer" />
        <span className="card-plus" aria-hidden>
          <Plus size={18} strokeWidth={1.75} />
        </span>
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardBrand}>{it.brand}</span>
        <span className={styles.cardName}>{it.name}</span>
        <span className={styles.cardPrice}>
          {money(it.price)}
          {it.mrp && <s>{money(it.mrp)}</s>}
        </span>
      </div>
    </Link>
  );
}
