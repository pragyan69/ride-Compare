"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Check, SlidersHorizontal, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import styles from "./store.module.css";

export type Facet = { key: string; label: string; all: string; options: { value: string; label: string }[] };

/**
 * Sort and filter dropdowns. Each change rewrites the URL (and drops the page number), so results are shareable.
 * Phones get a Culture Circle style Sort | Filters bar pinned to the bottom, each opening a sheet.
 */
export function FilterBar({ facets, active, total }: { facets: Facet[]; active: number; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState<"sort" | "filters" | null>(null);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  const clear = () => {
    const next = new URLSearchParams();
    for (const k of ["category", "q", "sort"]) {
      const v = params.get(k);
      if (v) next.set(k, v);
    }
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  const select = (f: Facet) => (
    <select value={params.get(f.key) ?? ""} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label}>
      <option value="">{f.all}</option>
      {f.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  const clearButton = active > 0 && (
    <button type="button" className={styles.clear} onClick={clear}>
      <X size={14} aria-hidden /> Clear {active > 1 ? `${active} filters` : "filter"}
    </button>
  );
  const [sortFacet, ...filterFacets] = facets;
  const sorted = params.get("sort") ?? "";

  return (
    <>
      <div className={styles.filters}>
        {facets.map((f) => (
          <label key={f.key} className={styles.filter} data-on={params.get(f.key) ? "" : undefined}>
            <span className="sr-only">{f.label}</span>
            {select(f)}
          </label>
        ))}
        {clearButton}
      </div>

      <div className={styles.mBar}>
        <button type="button" onClick={() => setOpen("sort")} data-on={sorted ? "" : undefined}>
          <ArrowUpDown size={18} aria-hidden /> Sort
        </button>
        <button type="button" onClick={() => setOpen("filters")} data-on={active ? "" : undefined}>
          <SlidersHorizontal size={18} aria-hidden /> Filters{active > 0 && <span>{active}</span>}
        </button>
      </div>

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="bottom" className={styles.sheet}>
          <SheetTitle className={styles.sheetTitle}>{open === "sort" ? "Sort by" : "Filters"}</SheetTitle>
          <SheetDescription className="sr-only">{open === "sort" ? "Choose how products are ordered" : "Narrow the products"}</SheetDescription>
          {open === "sort" ? (
            <ul className={styles.sortList}>
              {[{ value: "", label: sortFacet.all }, ...sortFacet.options].map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    aria-pressed={sorted === o.value}
                    onClick={() => {
                      set("sort", o.value);
                      setOpen(null);
                    }}
                  >
                    {o.label}
                    {sorted === o.value && <Check size={18} aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.sheetFilters}>
              {filterFacets.map((f) => (
                <label key={f.key} className={styles.filter} data-on={params.get(f.key) ? "" : undefined}>
                  <span>{f.label}</span>
                  {select(f)}
                </label>
              ))}
              <div className={styles.sheetActions}>
                {clearButton}
                <button type="button" className={styles.show} onClick={() => setOpen(null)}>
                  Show {total.toLocaleString("en-IN")} products
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
