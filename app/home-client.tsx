"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { money } from "@/lib/catalog";
import { ProductImage } from "@/components/product-card";
import styles from "./home.module.css";

export type Pick = { id: string; name: string; brand: string; image: string; price: number; mrp: number | null; storeName: string; stores: number };

const href = (p: Pick) => `/product/${encodeURIComponent(p.id)}`;

/** Centre product large, neighbours shrinking out to the sides. */
export function TopTen({ items }: { items: Pick[] }) {
  const [i, setI] = useState(0);
  const n = items.length;
  const move = (d: number) => setI((x) => (x + d + n) % n);
  const current = items[i];
  return (
    <div className={styles.topTen}>
      <div className={styles.stage} aria-live="polite">
        {[-2, -1, 0, 1, 2].map((offset) => {
          const p = items[(i + offset + n) % n];
          return (
            <Link
              key={`${p.id}-${offset}`}
              href={href(p)}
              className={styles.stageItem}
              data-offset={offset}
              tabIndex={offset === 0 ? 0 : -1}
              aria-hidden={offset !== 0}
              onClick={(e) => {
                if (offset !== 0) {
                  e.preventDefault();
                  move(offset);
                }
              }}
            >
              <ProductImage p={p} />
            </Link>
          );
        })}
      </div>
      <div className={styles.topControls}>
        <button aria-label="Previous helmet" onClick={() => move(-1)}>
          <ChevronLeft size={20} />
        </button>
        <div className={styles.topCard}>
          <div className={styles.topCardBody}>
            <span className={styles.rank}>#{i + 1}</span>
            <strong>{current.brand}</strong>
            <span className={styles.topName}>{current.name}</span>
            <span className={styles.topPrice}>
              <b>{money(current.price)}</b>
              {current.mrp && current.mrp > current.price && <s>{money(current.mrp)}</s>}
              <small>at {current.storeName}</small>
            </span>
          </div>
          <Link href={href(current)} className={styles.topCardButton}>
            {current.stores > 1 ? `Compare ${current.stores} stores` : "See price and details"}
          </Link>
        </div>
        <button aria-label="Next helmet" onClick={() => move(1)}>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

/** Category tabs over a horizontally scrolling row of white product cards. */
export function TabbedRow({ tabs }: { tabs: { name: string; items: Pick[] }[] }) {
  const [active, setActive] = useState(0);
  return (
    <>
      <div className={styles.tabs} role="tablist">
        {tabs.map((t, i) => (
          <button key={t.name} role="tab" aria-selected={i === active} onClick={() => setActive(i)}>
            {t.name}
          </button>
        ))}
      </div>
      <div className={styles.row} role="tabpanel">
        {tabs[active].items.map((p) => (
          <Link key={p.id} href={href(p)} className={styles.rowCard}>
            <span className={styles.rowImage}>
              <ProductImage p={p} />
            </span>
            <strong>{p.brand}</strong>
            <span className={styles.rowName}>{p.name}</span>
            <b>{money(p.price)}</b>
          </Link>
        ))}
      </div>
    </>
  );
}

const budgets = [10000, 20000, 40000, 75000];
const rides = [
  { id: "city", label: "City" },
  { id: "touring", label: "Touring" },
  { id: "track", label: "Track" },
  { id: "offroad", label: "Off-road" },
];

/** Two taps to a kit: pick a budget and a riding style, then hand off to /build. */
export function QuickBuild() {
  const [budget, setBudget] = useState(20000);
  const [ride, setRide] = useState("city");
  return (
    <div className={styles.quick}>
      <p className={styles.quickTitle}>Build your kit in two taps</p>
      <div className={styles.quickRow} role="group" aria-label="Budget">
        {budgets.map((b) => (
          <button key={b} aria-pressed={budget === b} onClick={() => setBudget(b)}>
            ₹{b / 1000}k
          </button>
        ))}
      </div>
      <div className={styles.quickRow} role="group" aria-label="How you ride">
        {rides.map((r) => (
          <button key={r.id} aria-pressed={ride === r.id} onClick={() => setRide(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      <Link href={`/build?budget=${budget}&style=${ride}`} className={styles.quickGo}>
        Build my ₹{budget.toLocaleString("en-IN")} kit <ArrowRight size={18} aria-hidden />
      </Link>
    </div>
  );
}
