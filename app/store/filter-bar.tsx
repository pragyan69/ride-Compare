"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import styles from "./store.module.css";

export type Facet = { key: string; label: string; all: string; options: { value: string; label: string }[] };

/** Sort and filter dropdowns. Each change rewrites the URL (and drops the page number), so results are shareable. */
export function FilterBar({ facets, active }: { facets: Facet[]; active: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
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
  return (
    <div className={styles.filters}>
      {facets.map((f) => (
        <label key={f.key} className={styles.filter} data-on={params.get(f.key) ? "" : undefined}>
          <span className="sr-only">{f.label}</span>
          <select value={params.get(f.key) ?? ""} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label}>
            <option value="">{f.all}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {active > 0 && (
        <button type="button" className={styles.clear} onClick={clear}>
          <X size={14} aria-hidden /> Clear {active > 1 ? `${active} filters` : "filter"}
        </button>
      )}
    </div>
  );
}
