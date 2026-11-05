"use client";
import { useActionState, useState } from "react";
import { createProduct } from "../../actions";
import styles from "../../admin.module.css";

export function NewProductForm({ categories, brands }: { categories: string[]; brands: string[] }) {
  const [result, action, pending] = useActionState(createProduct, null);
  const [photos, setPhotos] = useState("");
  const links = photos.split(/\s+/).filter((u) => /^https:\/\/\S+$/.test(u));
  return (
    <form action={action} className={styles.form}>
      <label className={`${styles.field} ${styles.full}`}>
        Name
        <input name="name" required minLength={3} maxLength={200} placeholder="K1 S Grazie Vale Helmet" />
      </label>
      <label className={styles.field}>
        Brand
        <input name="brand" required maxLength={60} list="brands" placeholder="AGV" />
        <datalist id="brands">
          {brands.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </label>
      <label className={styles.field}>
        Category
        <select name="category" defaultValue="Helmets">
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Price (₹)
        <input name="price" type="number" min={1} step={1} required placeholder="29500" />
      </label>
      <label className={styles.field}>
        <span>
          MRP (₹)<em> optional, shown crossed out</em>
        </span>
        <input name="mrp" type="number" min={1} step={1} placeholder="35000" />
      </label>
      <label className={`${styles.field} ${styles.full}`}>
        <span>
          Sizes, comma separated<em> leave empty for one-size items</em>
        </span>
        <input name="sizes" placeholder="S, M, L, XL" />
      </label>
      <label className={`${styles.field} ${styles.full}`}>
        <span>
          Photo links<em> one per line, https only. The first is the main photo.</em>
        </span>
        <textarea name="photos" rows={4} required value={photos} onChange={(e) => setPhotos(e.target.value)} placeholder="https://cdn.shopify.com/…/helmet-front.jpg" />
      </label>
      {links.length > 0 && (
        <div className={`${styles.pick} ${styles.full}`} aria-label="Photo preview">
          {links.map((u, i) => (
            <label key={u + i} title={u}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" referrerPolicy="no-referrer" />
              {i === 0 && <small>main</small>}
            </label>
          ))}
        </div>
      )}
      <div className={`${styles.field} ${styles.full}`}>
        Status
        <div className={styles.status} role="radiogroup" aria-label="Status">
          {(["approved", "unreviewed", "hidden"] as const).map((s) => (
            <label key={s}>
              <input type="radio" name="status" value={s} defaultChecked={s === "approved"} />
              {s === "approved" ? "✓ Approved" : s === "hidden" ? "Hidden" : "Unreviewed"}
            </label>
          ))}
        </div>
      </div>
      <div className={`${styles.saveRow} ${styles.full}`}>
        <button type="submit" className={styles.btn} disabled={pending}>
          {pending ? "Adding…" : "Add product"}
        </button>
        {result?.error && (
          <span className={styles.err} role="alert">
            {result.error}
          </span>
        )}
      </div>
    </form>
  );
}
