"use client";
import { useSyncExternalStore } from "react";

/** A cart line keeps what the cart page shows; checkout re-prices every line on the server. */
export type CartLine = { id: string; size: string | null; qty: number; name: string; brand: string; image: string; price: number };

const KEY = "rc-cart";
const listeners = new Set<() => void>();
let cache: CartLine[] | undefined;

const isLine = (v: unknown): v is CartLine =>
  typeof v === "object" && v !== null && typeof (v as CartLine).id === "string" && typeof (v as CartLine).qty === "number";

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter(isLine) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // private mode: the cart still works for this tab
  }
  listeners.forEach((l) => l());
}

const same = (a: Pick<CartLine, "id" | "size">, b: Pick<CartLine, "id" | "size">) => a.id === b.id && a.size === b.size;

export const cart = {
  add(line: CartLine) {
    const lines = read();
    const hit = lines.find((l) => same(l, line));
    write(hit ? lines.map((l) => (same(l, line) ? { ...l, qty: Math.min(9, l.qty + line.qty) } : l)) : [...lines, line]);
  },
  setQty(line: Pick<CartLine, "id" | "size">, qty: number) {
    write(qty < 1 ? read().filter((l) => !same(l, line)) : read().map((l) => (same(l, line) ? { ...l, qty: Math.min(9, qty) } : l)));
  },
  clear() {
    write([]);
  },
  /** Applies server prices; drops lines the store no longer sells. Returns how many were dropped. */
  reprice(quotes: { id: string; size: string | null; price: number | null; name?: string; brand?: string; image?: string }[]) {
    const lines = read();
    let dropped = 0, changed = false;
    const next = lines.flatMap((l): CartLine[] => {
      const q = quotes.find((x) => same(x, l));
      if (!q) return [l];
      if (q.price === null) {
        dropped++;
        return [];
      }
      const fresh = { ...l, price: q.price, name: q.name ?? l.name, brand: q.brand ?? l.brand, image: q.image ?? l.image };
      changed ||= fresh.price !== l.price || fresh.name !== l.name || fresh.image !== l.image;
      return [fresh];
    });
    if (dropped || changed) write(next);
    return dropped;
  },
};

const empty: CartLine[] = [];
export function useCart() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => empty,
  );
}
