"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Check, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import styles from "./store.module.css";

export type Facet = { key: string; label: string; all: string; options: { value: string; label: string }[] };
type Tab = "filters" | "sort";

/**
 * Culture Circle style "Filters & Sort": a button that opens a sidebar (a bottom sheet on phones)
 * with a Filters tab and a Sort tab. Picks are drafts until Apply, then they go into the URL.
 */
export function FilterBar({ facets, active, total }: { facets: Facet[]; active: number; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState(false);
  const [sortFacet, ...filterFacets] = facets;
  const sorted = params.get("sort") ?? "";

  const open = (t: Tab) => {
    setDraft(Object.fromEntries(facets.map((f) => [f.key, params.get(f.key) ?? ""])));
    setPhone(window.matchMedia("(max-width:640px)").matches);
    setTab(t);
  };
  const apply = (next: Record<string, string>) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    q.delete("page");
    router.push(`${pathname}?${q}`, { scroll: false });
    setTab(null);
  };
  const pick = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: d[key] === value ? "" : value }));
  const picked = filterFacets.filter((f) => draft[f.key]).length;

  return (
    <>
      <button type="button" className={styles.fsBtn} onClick={() => open("filters")} data-on={active || sorted ? "" : undefined}>
        <SlidersHorizontal size={18} aria-hidden /> Filters &amp; Sort{active > 0 && <span>{active}</span>}
      </button>

      <div className={styles.mBar}>
        <button type="button" onClick={() => open("sort")} data-on={sorted ? "" : undefined}>
          <ArrowUpDown size={18} aria-hidden /> Sort
        </button>
        <button type="button" onClick={() => open("filters")} data-on={active ? "" : undefined}>
          <SlidersHorizontal size={18} aria-hidden /> Filters{active > 0 && <span>{active}</span>}
        </button>
      </div>

      <Sheet open={tab !== null} onOpenChange={(o) => !o && setTab(null)}>
        <SheetContent side={phone ? "bottom" : "left"} className={styles.fsPanel}>
          <SheetTitle className="sr-only">Filters and sort</SheetTitle>
          <SheetDescription className="sr-only">{total.toLocaleString("en-IN")} products match</SheetDescription>
          <div className={styles.fsTabs} role="tablist">
            {(["filters", "sort"] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {t === "filters" ? "Filters" : "Sort"}
              </button>
            ))}
          </div>

          <div className={styles.fsBody}>
            {tab === "sort" ? (
              <ul className={styles.sortList}>
                {[{ value: "", label: sortFacet.all }, ...sortFacet.options].map((o) => (
                  <li key={o.value}>
                    <button type="button" aria-pressed={sorted === o.value} onClick={() => apply({ sort: o.value })}>
                      {o.label}
                      {sorted === o.value && <Check size={18} aria-hidden />}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              filterFacets.map((f) => (
                <details key={f.key} className={styles.fsGroup} open={Boolean(draft[f.key])}>
                  <summary>
                    {f.label}
                    {draft[f.key] && <em>{f.options.find((o) => o.value === draft[f.key])?.label.replace(/ \(\d+\)$/, "")}</em>}
                    <ChevronRight size={18} aria-hidden />
                  </summary>
                  <div className={styles.fsOptions}>
                    {f.options.map((o) => (
                      <button key={o.value} type="button" aria-pressed={draft[f.key] === o.value} onClick={() => pick(f.key, o.value)}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </details>
              ))
            )}
          </div>

          {tab === "filters" && (
            <div className={styles.fsFoot}>
              <button type="button" className={styles.fsClear} disabled={!picked} onClick={() => setDraft((d) => Object.fromEntries(Object.keys(d).map((k) => [k, k === "sort" ? d[k] : ""])))}>
                Clear all
              </button>
              <button type="button" className={styles.fsApply} onClick={() => apply(draft)}>
                Apply filter
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
