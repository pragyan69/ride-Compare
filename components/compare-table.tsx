"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useCompare } from "./compare";
import type { OfferRow, ProductRow } from "@/lib/db";

const money = (v: number | null | undefined) => (v === null || v === undefined ? "—" : "₹" + Math.round(v).toLocaleString("en-IN"));
type Loaded = { key: string; products: ProductRow[]; offers: OfferRow[] };

export function CompareTable() {
  const { ids, remove, clear } = useCompare();
  const key = ids.join(",");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`/api/products?ids=${encodeURIComponent(key)}`)
      .then((r) => r.json() as Promise<{ products?: ProductRow[]; offers?: OfferRow[] }>)
      .then((d) => { if (!cancelled) setLoaded({ key, products: d.products || [], offers: d.offers || [] }); })
      .catch(() => { if (!cancelled) setLoaded({ key, products: [], offers: [] }); });
    return () => { cancelled = true; };
  }, [key]);
  if (!key) return <div className="empty"><b>Nothing to compare yet</b>Open <Link href="/gear" style={{ textDecoration: "underline" }}>the catalog</Link> and tap “+ Compare” on a few products.</div>;
  if (!loaded || loaded.key !== key) return <p className="fine">Loading your selection…</p>;
  const rows = loaded.products;
  if (!rows.length) return <div className="empty"><b>Those products are no longer listed</b><button type="button" className="btn btn-small" onClick={clear}>Clear selection</button></div>;
  const offersFor = (id: string) => loaded.offers.filter((o) => o.product_id === id);
  const cheapest = Math.min(...rows.map((p) => p.min_price ?? Infinity));
  return (
    <>
      <div className="actions" style={{ marginBottom: 12 }}><button className="btn btn-small" type="button" onClick={clear}>Clear selection</button></div>
      <div className="compare-wrap">
        <table className="compare-table">
          <tbody>
            <tr><th scope="row">Product</th>{rows.map((p) => <td key={p.id}>{p.image && <img src={p.image} alt="" referrerPolicy="no-referrer" />}<Link href={`/product/${p.id}`}><b>{p.name}</b></Link><br /><small>{p.brand} · {p.variant}</small><br /><button type="button" className="btn btn-small btn-ghost" onClick={() => remove(p.id)}>Remove</button></td>)}</tr>
            <tr><th scope="row">Lowest price</th>{rows.map((p) => <td key={p.id}><b style={{ color: p.min_price === cheapest ? "#134d3c" : undefined }}>{money(p.min_price)}</b>{p.min_price === cheapest && rows.length > 1 ? " · cheapest" : ""}</td>)}</tr>
            <tr><th scope="row">MRP / discount</th>{rows.map((p) => <td key={p.id}>{p.mrp ? `${money(p.mrp)} · ${p.discount}% off` : "Not listed"}</td>)}</tr>
            <tr><th scope="row">Category</th>{rows.map((p) => <td key={p.id}>{p.category}{p.bike ? ` · ${p.bike}` : ""}</td>)}</tr>
            <tr><th scope="row">Stores</th>{rows.map((p) => <td key={p.id}>{offersFor(p.id).map((o) => <div key={o.id}><a href={o.url} target="_blank" rel="noreferrer nofollow">{o.store_name}</a> {money(o.price)}{o.in_stock === 0 ? " (out of stock)" : ""}</div>)}</td>)}</tr>
            <tr><th scope="row">Availability</th>{rows.map((p) => <td key={p.id}>{p.in_stock === 1 ? "In stock" : "Check at store"}</td>)}</tr>
            <tr><th scope="row">Buy</th>{rows.map((p) => <td key={p.id}>{p.best_url && <a className="btn btn-primary btn-small" href={p.best_url} target="_blank" rel="noreferrer nofollow">Buy at {p.best_store_name}</a>}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
