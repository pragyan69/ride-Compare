import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { money } from "@/lib/catalog";
import { adminProduct, allCards } from "@/lib/shop";
import { ProductForm } from "./form";
import { deleteProduct } from "../../actions";
import styles from "../../admin.module.css";

type Props = { params: Promise<{ id: string }> };

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function AdminProduct({ params }: Props) {
  await requireAdmin();
  const id = decodeURIComponent((await params).id);
  const a = await adminProduct(id);
  if (!a) notFound();
  const categories = [...new Set((await allCards()).map((c) => c.category))].sort();
  const { imported: i, shown: s } = a;
  const status = a.edit?.status ?? "unreviewed";
  const inStock = a.offers.filter((o) => o.inStock);
  const cheapest = inStock.length ? Math.min(...inStock.map((o) => o.price)) : null;

  return (
    <>
      <p className={styles.crumbs}>
        <Link href="/admin/products">Products</Link> / {s.brand}
      </p>
      <h1 className={styles.h1} style={{ marginTop: 6 }}>
        {s.brand} {s.name}
      </h1>
      <p className={styles.sub}>
        {id} · {status === "hidden" ? "Hidden from the store" : <Link href={`/store/${encodeURIComponent(id)}`} target="_blank">Open in store ↗</Link>}
        {a.edit && ` · last edited ${when(a.edit.updatedAt)}`}
      </p>

      <div className={styles.detail}>
        <div>
          <div className={styles.hero}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.image} alt="" referrerPolicy="no-referrer" />
          </div>
          {s.flags.length > 0 && (
            <div className={styles.panel}>
              <h2>Check before approving</h2>
              {s.flags.includes("photo swapped") && <p>The store&apos;s main photo showed another colour, so the import picked this one. Make sure it matches the name.</p>}
              {s.flags.includes("sizes guessed") && <p>No sizes could be read from the stores, so these are the usual run for the category. Confirm which sizes you can supply.</p>}
            </div>
          )}
          <div className={styles.panel}>
            <h2>Source stores</h2>
            <p>
              Where this product comes from. Our price: <b>{money(s.price)}</b>
              {cheapest !== null && cheapest !== s.price && <> · cheapest in stock: <b>{money(Math.round(cheapest))}</b></>}
            </p>
            {a.custom ? (
              <>
                <p className={styles.muted}>Added by hand in the admin, so there are no source stores.</p>
                <form action={deleteProduct} style={{ marginTop: 12 }}>
                  <input type="hidden" name="id" value={id} />
                  <button type="submit" className={`${styles.btn} ${styles.btnBad}`}>
                    Delete this product
                  </button>
                </form>
              </>
            ) : a.offers.length ? (
              <table className={styles.table} style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Price</th>
                    <th>Variant</th>
                    <th>Stock</th>
                    <th>Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {[...a.offers]
                    .sort((x, y) => x.price - y.price)
                    .map((o) => (
                      <tr key={o.url}>
                        <td>
                          <a href={o.url} target="_blank" rel="noopener noreferrer">
                            {o.store}
                          </a>
                        </td>
                        <td>
                          <b>{money(Math.round(o.price))}</b>
                          {o.mrp ? <div className={styles.muted}>MRP {money(Math.round(o.mrp))}</div> : null}
                        </td>
                        <td className={styles.muted}>{o.variant || "—"}</td>
                        <td>{o.inStock ? "In stock" : o.inStock === false ? <span className={styles.muted}>Out</span> : "?"}</td>
                        <td className={styles.muted}>{when(o.checkedAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <p className={styles.muted}>Only in the catalogue file{a.fallbackStore ? `, cheapest at ${a.fallbackStore}` : ""}. No live store data.</p>
            )}
          </div>
        </div>

        <ProductForm
          id={id}
          status={status}
          shown={{ name: s.name, price: s.price, image: s.image, sizes: s.sizes, category: s.category, note: a.edit?.note ?? "" }}
          imported={{ name: i.name, price: i.price, image: i.image, sizes: i.sizes, category: i.category }}
          photos={a.photos}
          categories={categories}
          custom={a.custom && { brand: a.custom.brand, mrp: a.custom.mrp, photos: a.custom.photos }}
        />
      </div>
    </>
  );
}
