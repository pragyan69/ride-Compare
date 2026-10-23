"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Suggestion = { products: { id: string; name: string; brand: string; category: string; image: string; min_price: number | null }[]; brands: { name: string; n: number }[] };
const money = (v: number | null) => (v === null ? "" : "₹" + Math.round(v).toLocaleString("en-IN"));

export function SearchBox({ compact = false, initial = "" }: { compact?: boolean; initial?: string }) {
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Suggestion | null>(null);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal }).then((r) => r.json() as Promise<Suggestion>).then((d) => { setData(d); setOpen(true); }).catch(() => {});
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const hasSuggestions = open && data && (data.products.length > 0 || data.brands.length > 0);
  return (
    <div className="search" ref={box}>
      <form action="/gear" method="get" role="search" onSubmit={(e) => { e.preventDefault(); setOpen(false); router.push(`/gear?q=${encodeURIComponent(value.trim())}`); }}>
        <span aria-hidden="true">🔍</span>
        <input name="q" value={value} onChange={(e) => { setValue(e.target.value); if (e.target.value.trim().length < 2) setData(null); }} onFocus={() => data && setOpen(true)} placeholder={compact ? "Search helmets, jackets, brands, bikes…" : "Search a helmet, jacket, brand or your bike…"} aria-label="Search motorcycle gear" autoComplete="off" />
        {value && <button type="button" className="btn btn-ghost btn-small" aria-label="Clear search" onClick={() => { setValue(""); setData(null); }}>×</button>}
        <button type="submit">Search</button>
      </form>
      {hasSuggestions && (
        <div className="suggest" role="listbox">
          {data!.brands.map((b) => <Link key={b.name} href={`/gear?brand=${encodeURIComponent(b.name)}`} onClick={() => setOpen(false)}><span className="suggest-brand">{b.name}</span><small>{b.n.toLocaleString("en-IN")} listings</small></Link>)}
          {data!.products.map((p) => <Link key={p.id} href={`/product/${p.id}`} onClick={() => setOpen(false)}>{p.image ? <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span style={{ width: 36 }} />}<span>{p.name}<br /><span style={{ fontSize: 12, color: "#66736b" }}>{p.brand} · {p.category}</span></span><small>{money(p.min_price)}</small></Link>)}
          <Link href={`/gear?q=${encodeURIComponent(value.trim())}`} onClick={() => setOpen(false)}><span>See all results for “{value.trim()}”</span></Link>
        </div>
      )}
    </div>
  );
}
