"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/catalog";
import { cart } from "@/lib/cart";
import { useFreshCart } from "../use-fresh-cart";
import styles from "../store.module.css";

export default function CartPage() {
  const { lines, notice } = useFreshCart();
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  return (
    <main className={`wrap ${styles.page}`}>
      <h1 className={styles.title}>Your cart</h1>
      {notice && <p className={styles.hint} role="status">{notice}</p>}
      {lines.length === 0 ? (
        <div className={styles.empty}>
          <p>Your cart is empty.</p>
          <Button asChild className={styles.cta} style={{ marginTop: 16 }}>
            <Link href="/store">Browse the store</Link>
          </Button>
        </div>
      ) : (
        <div className={styles.two}>
          <div className={styles.lines}>
            {lines.map((l) => (
              <div key={`${l.id}:${l.size}`} className={styles.line}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.image ? <img src={l.image} alt="" referrerPolicy="no-referrer" /> : <span />}
                <div>
                  <Link href={`/store/${encodeURIComponent(l.id)}`} className={styles.lineName}>
                    {l.brand} {l.name}
                  </Link>
                  <div className={styles.lineMeta}>{l.size ? `Size ${l.size} · ` : ""}{money(l.price)} each</div>
                  <div className={styles.qty}>
                    <button type="button" aria-label="One less" onClick={() => cart.setQty(l, l.qty - 1)}>−</button>
                    <span>{l.qty}</span>
                    <button type="button" aria-label="One more" onClick={() => cart.setQty(l, l.qty + 1)}>+</button>
                  </div>
                </div>
                <div className={styles.lineRight}>
                  {money(l.price * l.qty)}
                  <button type="button" className={styles.remove} onClick={() => cart.setQty(l, 0)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <aside className={styles.summary}>
            <h2>Order summary</h2>
            <div className={styles.sumRow}><span>Items</span><span>{money(total)}</span></div>
            <div className={styles.sumRow}><span>Delivery</span><span>Free</span></div>
            <div className={styles.sumTotal}><span>Total</span><span>{money(total)}</span></div>
            <Button asChild className={styles.cta}>
              <Link href="/store/checkout">Checkout</Link>
            </Button>
            <p className={styles.small}>Prices are confirmed at checkout.</p>
          </aside>
        </div>
      )}
    </main>
  );
}
