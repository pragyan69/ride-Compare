import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { money } from "@/lib/catalog";
import { productEdits, type ProductEdit } from "@/lib/product-edits";
import { allCards, type StoreCard } from "@/lib/shop";
import { setPrice, setStatus } from "../actions";
import styles from "../admin.module.css";

const PER_PAGE = 60;
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

type Row = StoreCard & { edit?: ProductEdit; status: "unreviewed" | "approved" | "hidden"; importedPrice: number };
const STATUSES = ["all", "unreviewed", "approved", "hidden"] as const;
const isEdited = (r: Row) => Boolean(r.edit && (r.edit.name || r.edit.price || r.edit.image || r.edit.sizes || r.edit.category));
const ISSUES: { value: string; label: string; test: (r: Row) => boolean }[] = [
  { value: "sizes", label: "Sizes guessed", test: (r) => r.flags.includes("sizes guessed") },
  { value: "photo", label: "Photo swapped", test: (r) => r.flags.includes("photo swapped") },
  { value: "single", label: "Only one source store", test: (r) => r.others.length <= 1 },
  { value: "edited", label: "Edited", test: isEdited },
  { value: "note", label: "Has a note", test: (r) => Boolean(r.edit?.note) },
];
const SORTS: Record<string, (a: Row, b: Row) => number> = {
  "": () => 0,
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  updated: (a, b) => (b.edit?.updatedAt ?? "").localeCompare(a.edit?.updatedAt ?? ""),
};

export default async function AdminProducts({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const [cards, edits] = await Promise.all([allCards(), productEdits()]);
  const rows: Row[] = cards.map((c) => {
    const edit = edits[c.id];
    const shown = edit ? { ...c, name: edit.name ?? c.name, price: edit.price ?? c.price, image: edit.image ?? c.image, category: edit.category ?? c.category } : c;
    return { ...shown, edit, status: edit?.status ?? "unreviewed", importedPrice: c.price };
  });

  const status = STATUSES.find((s) => s === one(sp.status)) ?? "all";
  const cat = one(sp.category) ?? "";
  const issue = ISSUES.find((i) => i.value === one(sp.issue));
  const words = (one(sp.q) ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const sortKey = one(sp.sort) ?? "";
  const base = rows.filter(
    (r) => (!cat || r.category === cat) && (!issue || issue.test(r)) && words.every((w) => `${r.brand} ${r.name} ${r.id}`.toLowerCase().includes(w)),
  );
  const items = base.filter((r) => status === "all" || r.status === status).sort(SORTS[sortKey] ?? SORTS[""]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, s === "all" ? base.length : base.filter((r) => r.status === s).length]));
  const categories = [...new Set(rows.map((r) => r.category))].sort();

  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(one(sp.page)) || 1));
  const shown = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const href = (patch: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, category: cat, issue: issue?.value, q: words.join(" "), sort: sortKey, ...patch }))
      if (v && v !== "all" && !(k === "page" && Number(v) === 1)) q.set(k, String(v));
    return `/admin/products?${q}`;
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 className={styles.h1}>Products</h1>
        <Link href="/admin/products/new" className={styles.btn} style={{ marginLeft: "auto" }}>
          + Add product
        </Link>
      </div>
      <p className={styles.sub}>
        Check each product&apos;s photo, name, price and sizes. Approve the good ones; hide anything wrong and it leaves the store at once.
      </p>

      <form className={styles.tools} action="/admin/products">
        <input name="q" defaultValue={words.join(" ")} placeholder="Search name, brand or ID" aria-label="Search" />
        <select name="category" defaultValue={cat} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select name="issue" defaultValue={issue?.value ?? ""} aria-label="Needs checking">
          <option value="">Any issue</option>
          {ISSUES.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sortKey} aria-label="Sort">
          <option value="">Catalogue order</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="updated">Recently edited</option>
        </select>
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <button type="submit">Apply</button>
        {(cat || issue || words.length || sortKey) && (
          <Link href={href({ category: undefined, issue: undefined, q: undefined, sort: undefined, page: undefined })} className={`${styles.btn} ${styles.btnGhost}`}>
            Reset
          </Link>
        )}
      </form>

      <nav className={styles.chips} aria-label="Review status">
        {STATUSES.map((s) => (
          <Link key={s} href={href({ status: s, page: undefined })} aria-current={status === s ? "page" : undefined}>
            {s[0].toUpperCase() + s.slice(1)}
            <span>{counts[s].toLocaleString("en-IN")}</span>
          </Link>
        ))}
      </nav>

      {shown.length > 0 && (
        <div className={styles.bulk}>
          <span>
            Showing {((page - 1) * PER_PAGE + 1).toLocaleString("en-IN")}–{((page - 1) * PER_PAGE + shown.length).toLocaleString("en-IN")} of{" "}
            {items.length.toLocaleString("en-IN")}
          </span>
          <form action={setStatus}>
            {shown.map((r) => (
              <input key={r.id} type="hidden" name="id" value={r.id} />
            ))}
            <button type="submit" name="status" value="approved" className={`${styles.btn} ${styles.btnGhost}`}>
              Approve all {shown.length} on this page
            </button>
          </form>
        </div>
      )}

      <div className={styles.grid}>
        {shown.map((r) => (
          <article key={r.id} className={styles.card} data-status={r.status}>
            <Link href={`/admin/products/${encodeURIComponent(r.id)}`} className={styles.thumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.image} alt="" loading="lazy" referrerPolicy="no-referrer" />
              <span className={styles.badge} data-status={r.status}>
                {r.status}
              </span>
            </Link>
            <div className={styles.info}>
              <small>{r.brand}</small>
              <Link href={`/admin/products/${encodeURIComponent(r.id)}`}>{r.name}</Link>
              <form action={setPrice} className={styles.priceEdit}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="imported" value={r.importedPrice} />
                <label>
                  <span>₹</span>
                  <input name="price" type="number" min={1} step={1} defaultValue={r.price} aria-label={`Price of ${r.brand} ${r.name}`} required />
                </label>
                <button type="submit">Save</button>
                {r.mrp && <s>{money(r.mrp)}</s>}
              </form>
              <span className={styles.muted} style={{ fontSize: 12 }}>
                {r.category}
                {r.sizes.length > 0 && ` · ${r.sizes.join(", ")}`}
              </span>
              {(r.flags.length > 0 || r.edit?.note || isEdited(r)) && (
                <span className={styles.flags}>
                  {r.flags.map((f) => (
                    <span key={f}>{f}</span>
                  ))}
                  {isEdited(r) && <span data-kind="edit">edited</span>}
                  {r.edit?.note && <span data-kind="edit">note</span>}
                </span>
              )}
            </div>
            <form action={setStatus} className={styles.actions}>
              <input type="hidden" name="id" value={r.id} />
              {r.status === "approved" ? (
                <button type="submit" name="status" value="unreviewed">
                  Unapprove
                </button>
              ) : (
                <button type="submit" name="status" value="approved" style={{ color: "var(--brand)" }}>
                  ✓ Approve
                </button>
              )}
              {r.status === "hidden" ? (
                <button type="submit" name="status" value="unreviewed">
                  Unhide
                </button>
              ) : (
                <button type="submit" name="status" value="hidden" style={{ color: "var(--warn)" }}>
                  Hide
                </button>
              )}
            </form>
          </article>
        ))}
      </div>
      {shown.length === 0 && <p className={styles.panel}>Nothing matches these filters.</p>}

      {pages > 1 && (
        <nav className={styles.pager} aria-label="Pages">
          {page > 1 ? <Link href={href({ page: page - 1 })}>Previous</Link> : <span />}
          <span>
            Page {page} of {pages.toLocaleString("en-IN")}
          </span>
          {page < pages ? <Link href={href({ page: page + 1 })}>Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}
