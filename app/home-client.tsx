"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { money } from "@/lib/catalog";
import { ProductImage } from "@/components/product-card";
import styles from "./home.module.css";

export type Pick = { id: string; name: string; brand: string; image: string; price: number; mrp: number | null; storeName: string; stores: number };

const href = (p: Pick) => `/product/${encodeURIComponent(p.id)}`;

/** Full-width promo banner: slides change every 7s, pause on hover, arrows and dots to jump. */
export function HeroBanner({ slides }: { slides: ReactNode[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  useEffect(() => {
    if (paused || n < 2) return;
    const t = setTimeout(() => setI((x) => (x + 1) % n), 7000);
    return () => clearTimeout(t);
  }, [i, paused, n]);
  return (
    <div className={styles.banner} data-dark onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)}>
      {slides.map((s, k) => (
        <div key={k} className={styles.slide} data-active={k === i} aria-hidden={k !== i} inert={k !== i}>
          {s}
        </div>
      ))}
      {n > 1 && (
        <>
          <button className={styles.bannerArrow} data-side="prev" aria-label="Previous banner" onClick={() => setI((i - 1 + n) % n)}>
            <ChevronLeft size={20} />
          </button>
          <button className={styles.bannerArrow} data-side="next" aria-label="Next banner" onClick={() => setI((i + 1) % n)}>
            <ChevronRight size={20} />
          </button>
          <div className={styles.dots}>
            {slides.map((_, k) => (
              <button key={k} aria-label={`Banner ${k + 1}`} aria-current={k === i} onClick={() => setI(k)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
export function TabbedRow({ tabs, light = false }: { tabs: { name: string; items: Pick[] }[]; light?: boolean }) {
  const [active, setActive] = useState(0);
  return (
    <>
      <div className={`${styles.tabs} ${light ? styles.tabsLight : ""}`} role="tablist">
        {tabs.map((t, i) => (
          <button key={t.name} role="tab" aria-selected={i === active} onClick={() => setActive(i)}>
            {t.name}
          </button>
        ))}
      </div>
      <div className={`${styles.row} ${light ? styles.rowLight : ""}`} role="tabpanel">
        {tabs[active].items.map((p) => (
          <Link key={p.id} href={href(p)} className={styles.rowCard}>
            <span className={styles.rowImage}>
              <ProductImage p={p} />
            </span>
            <strong>{p.brand}</strong>
            <span className={styles.rowName}>{p.name}</span>
            <span className={styles.rowPrice}>
              <b>{money(p.price)}</b>
              {p.mrp && p.mrp > p.price * 1.05 && <s>{money(p.mrp)}</s>}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
