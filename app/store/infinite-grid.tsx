"use client";
import { useEffect, useRef, useState } from "react";
import type { StoreCard } from "@/lib/shop";
import { ProductTile } from "./card";
import styles from "./store.module.css";

/** The shop grid. The server sends the first 48; more load as the bottom comes into view. */
export function InfiniteGrid({ first, total, query }: { first: StoreCard[]; total: number; query: string }) {
  const [items, setItems] = useState(first);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const page = useRef(1);
  const end = useRef<HTMLDivElement>(null);
  const done = items.length >= total;

  const more = async () => {
    if (state === "loading" || done) return;
    setState("loading");
    try {
      const q = new URLSearchParams(query);
      q.set("page", String(page.current + 1));
      const r = await fetch(`/api/store-items?${q}`);
      if (!r.ok) throw new Error(String(r.status));
      const data: { items: StoreCard[] } = await r.json();
      page.current += 1;
      setItems((have) => {
        const seen = new Set(have.map((c) => c.id));
        return [...have, ...data.items.filter((c) => !seen.has(c.id))];
      });
      setState("idle");
    } catch {
      setState("error");
    }
  };

  // Start loading a little before the shopper reaches the end.
  useEffect(() => {
    const el = end.current;
    if (!el || done || state !== "idle") return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && more(), { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  });

  return (
    <>
      <div className={styles.grid}>
        {items.map((it) => (
          <ProductTile key={it.id} it={it} />
        ))}
        {state === "loading" && Array.from({ length: 5 }, (_, i) => <div key={i} className={styles.skeleton} aria-hidden />)}
      </div>
      <div ref={end} className={styles.more}>
        <span>
          Showing {items.length.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
        </span>
        {!done && <progress value={items.length} max={total} aria-hidden />}
        {state === "error" && (
          <button type="button" onClick={() => { setState("idle"); }}>
            Couldn&apos;t load more. Try again
          </button>
        )}
      </div>
    </>
  );
}
