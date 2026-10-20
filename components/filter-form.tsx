"use client";
import { useRef, useState } from "react";

type BrandOption = { name: string; n: number };

/** The listing filter form. Server-rendered groups come in through `top` and
 * `bottom`; the brand group lives here so the brand search works without a
 * round trip. Changing any control submits the form (a GET to /gear). */
export function FilterForm({ top, bottom, brands, selected, hidden }: { top: React.ReactNode; bottom: React.ReactNode; brands: BrandOption[]; selected: string; hidden: [string, string][] }) {
  const form = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const lower = query.trim().toLowerCase();
  const visible = lower ? brands.filter((b) => b.name.toLowerCase().includes(lower)) : brands;
  return (
    <form ref={form} action="/gear" method="get" onChange={(e) => { const t = e.target as unknown as HTMLInputElement; if (t.tagName === "SELECT" || t.type === "checkbox" || t.type === "radio") form.current?.requestSubmit(); }}>
      {hidden.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {top}
      {brands.length > 0 && (
        <div className="fgroup">
          <label htmlFor="f-brand-search">Brand</label>
          <input id="f-brand-search" type="search" placeholder="Find a brand…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="brand-list">
            <label className="check"><input type="radio" name="brand" value="" defaultChecked={!selected} /> All brands</label>
            {visible.map((b) => <label key={b.name} className="check"><input type="radio" name="brand" value={b.name} defaultChecked={selected === b.name} /> {b.name}<small>{b.n.toLocaleString("en-IN")}</small></label>)}
            {!visible.length && <span className="fine">No brand matches “{query}”.</span>}
          </div>
        </div>
      )}
      {bottom}
    </form>
  );
}
