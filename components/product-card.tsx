"use client";
import { useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { money, rankedOffers, type Product } from "@/lib/catalog";

/** Store photos are often 1500-3000px wide. Shopify's CDN resizes on request; other stores go through
 *  wsrv.nl, a free resizing cache. If that fails we fall back to the store's original photo. */
function sized(src: string, width: number) {
  if (/cdn\.shopify\.com|\/cdn\/shop\//.test(src)) {
    const url = new URL(src);
    url.searchParams.set("width", String(width));
    return url.toString();
  }
  // Only stores that serve large originals and allow wsrv to fetch them (Big Bad Bikes blocks it; its photos are small).
  if (/customelements\.in|helmetracing\.in/.test(src)) return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&output=webp&q=80`;
  return src;
}

export function ProductImage({ p, width = 600 }: { p: Pick<Product, "image">; width?: number }) {
  // 0: resized copy, 1: store original, 2: give up and show the placeholder
  const [attempt, setAttempt] = useState(0);
  if (!p.image || attempt > 1) return <Package className="image-missing" size={40} strokeWidth={1} aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- product photos come from many store CDNs
    <img
      src={attempt === 0 ? sized(p.image, width) : p.image}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setAttempt((a) => a + 1)}
    />
  );
}

/** Grid card used on every listing page. `note` replaces the store line, e.g. "29% below MRP". */
export function ProductCard({ p, note }: { p: Product; note?: React.ReactNode }) {
  const offers = rankedOffers(p);
  const o = offers[0];
  return (
    <Link className="card" href={`/product/${encodeURIComponent(p.id)}`}>
      <span className="card-image">
        <ProductImage p={p} />
      </span>
      <span className="card-body">
        <span className="card-brand">{p.brand === "Unspecified" ? p.category : p.brand}</span>
        <span className="card-name">{p.name}</span>
        <span className="card-variant">{p.variant}</span>
        <span className="card-price">
          <strong>{money(o.price)}</strong>
          {o.mrp && o.mrp > o.price && <s>{money(o.mrp)}</s>}
          {o.inStock === false && <em>Out of stock</em>}
        </span>
        <span className="card-store">{note ?? (offers.length > 1 ? `Lowest of ${offers.length} stores` : o.storeName)}</span>
      </span>
    </Link>
  );
}
