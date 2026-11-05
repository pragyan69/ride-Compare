"use client";
import { useActionState, useState } from "react";
import { money } from "@/lib/catalog";
import { saveProduct } from "../../actions";
import styles from "../../admin.module.css";

type Fields = { name: string; price: number; image: string; sizes: string[]; category: string };

export function ProductForm({
  id,
  status,
  shown,
  imported,
  photos,
  categories,
  custom,
}: {
  id: string;
  status: "unreviewed" | "approved" | "hidden";
  shown: Fields & { note: string };
  imported: Fields;
  photos: string[];
  categories: string[];
  /** Set for hand-added products: brand, MRP and photo links become editable too. */
  custom?: { brand: string; mrp: number | null; photos: string[] };
}) {
  const [result, action, pending] = useActionState(saveProduct, null);
  const [image, setImage] = useState(shown.image);
  const was = (changed: boolean, value: string) => changed && <em> (import: {value})</em>;
  return (
    <form action={action} className={styles.form}>
      <h2>Review and edit</h2>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="imported" value={JSON.stringify(imported)} />
      {custom && <input type="hidden" name="custom" value="1" />}

      <div className={`${styles.field} ${styles.full}`}>
        Status
        <div className={styles.status} role="radiogroup" aria-label="Status">
          {(["approved", "unreviewed", "hidden"] as const).map((s) => (
            <label key={s}>
              <input type="radio" name="status" value={s} defaultChecked={status === s} />
              {s === "approved" ? "✓ Approved" : s === "hidden" ? "Hidden" : "Unreviewed"}
            </label>
          ))}
        </div>
      </div>

      <label className={`${styles.field} ${styles.full}`}>
        <span>Name{was(shown.name !== imported.name, imported.name)}</span>
        <input name="name" defaultValue={shown.name} maxLength={200} />
      </label>

      {custom && (
        <>
          <label className={styles.field}>
            Brand
            <input name="brand" defaultValue={custom.brand} required maxLength={60} />
          </label>
          <label className={styles.field}>
            <span>
              MRP (₹)<em> optional, shown crossed out</em>
            </span>
            <input name="mrp" type="number" min={1} step={1} defaultValue={custom.mrp ?? ""} />
          </label>
        </>
      )}

      <label className={styles.field}>
        <span>Price (₹){was(shown.price !== imported.price, money(imported.price))}</span>
        <input name="price" type="number" min={1} step={1} defaultValue={shown.price} required />
      </label>

      <label className={styles.field}>
        <span>Category{was(shown.category !== imported.category, imported.category)}</span>
        <select name="category" defaultValue={shown.category}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      <label className={`${styles.field} ${styles.full}`}>
        <span>
          Sizes, comma separated{was(shown.sizes.join() !== imported.sizes.join(), imported.sizes.join(", ") || "none")}
          <em> Leave empty for one-size items.</em>
        </span>
        <input name="sizes" defaultValue={shown.sizes.join(", ")} placeholder="S, M, L, XL" />
      </label>

      <div className={`${styles.field} ${styles.full}`}>
        <span>
          Main photo ({photos.length}){was(image !== imported.image, "a different photo")}
        </span>
        <input type="hidden" name="image" value={image} />
        <div className={styles.pick}>
          {photos.map((u, n) => (
            <label key={u} title={u}>
              <input type="radio" name="photo" checked={image === u} onChange={() => setImage(u)} aria-label={`Photo ${n + 1}`} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" loading="lazy" referrerPolicy="no-referrer" />
              {u === imported.image && <small>{custom ? "first" : "import"}</small>}
            </label>
          ))}
        </div>
      </div>

      {custom && (
        <label className={`${styles.field} ${styles.full}`}>
          <span>
            Photo links<em> one per line, https only. Pick the main photo above after saving.</em>
          </span>
          <textarea name="photos" defaultValue={custom.photos.join("\n")} rows={4} />
        </label>
      )}

      <label className={`${styles.field} ${styles.full}`}>
        <span>Note for the team</span>
        <textarea name="note" defaultValue={shown.note} maxLength={1000} placeholder="e.g. supplier confirmed M and L only" />
      </label>

      <div className={`${styles.saveRow} ${styles.full}`}>
        <button type="submit" className={styles.btn} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        {result && (
          <span className={result.ok ? styles.ok : styles.err} role="status">
            {result.message}
          </span>
        )}
      </div>
    </form>
  );
}
