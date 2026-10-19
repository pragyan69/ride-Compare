"use client";
import { useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { money, rankedOffers, type Product } from "@/lib/catalog";

/** Shopify's CDN resizes on request; store photos are often 1500-3000px wide. */
function sized(src: string, width: number) {
  if (!/cdn\.shopify\.com|\/cdn\/shop\//.test(src)) return src;
  const url = new URL(src);
  url.searchParams.set("width", String(width));
  return url.toString();
}

export function ProductImage({ p, width = 600 }: { p: Pick<Product, "image">; width?: number }) {
  const [broken, setBroken] = useState(false);
  return p.image && !broken ? (
    // eslint-disable-next-line @next/next/no-img-element -- product photos come from many store CDNs
    <img src={sized(p.image, width)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  ) : (
    <Package className="image-missing" size={40} strokeWidth={1} aria-hidden />
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
