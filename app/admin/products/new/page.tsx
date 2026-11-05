import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { allCards } from "@/lib/shop";
import { NewProductForm } from "./form";
import styles from "../../admin.module.css";

export default async function NewProduct() {
  await requireAdmin();
  const cards = await allCards();
  const categories = [...new Set(cards.map((c) => c.category))].sort();
  const brands = [...new Set(cards.map((c) => c.brand))].sort();
  return (
    <>
      <p className={styles.crumbs}>
        <Link href="/admin/products">Products</Link> / New
      </p>
      <h1 className={styles.h1} style={{ marginTop: 6 }}>
        Add a product
      </h1>
      <p className={styles.sub}>For gear you sell that isn&apos;t in the catalogue. It shows in the store as soon as you save, unless you pick Hidden.</p>
      <div style={{ maxWidth: 760, marginTop: 16 }}>
        <NewProductForm categories={categories} brands={brands} />
      </div>
    </>
  );
}
