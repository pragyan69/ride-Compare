import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { money } from "@/lib/catalog";
import { listOrders } from "@/lib/orders";
import { productEdits } from "@/lib/product-edits";
import { allCards } from "@/lib/shop";
import styles from "./admin.module.css";

export default async function AdminHome() {
  await requireAdmin();
  const [cards, edits, orders] = await Promise.all([allCards(), productEdits(), listOrders()]);
  const status = (id: string) => edits[id]?.status ?? "unreviewed";
  const approved = cards.filter((c) => status(c.id) === "approved").length;
  const hidden = cards.filter((c) => status(c.id) === "hidden").length;
  const sizes = cards.filter((c) => c.flags.includes("sizes guessed") && status(c.id) === "unreviewed").length;
  const photos = cards.filter((c) => c.flags.includes("photo swapped") && status(c.id) === "unreviewed").length;
  const paid = orders.filter((o) => o.status !== "pending" && o.status !== "cancelled");
  const toShip = orders.filter((o) => o.status === "paid" || o.status === "packed").length;
  const stats = [
    { n: cards.length - hidden, label: "Live in the store", href: "/admin/products" },
    { n: cards.length - approved - hidden, label: "Waiting for review", href: "/admin/products?status=unreviewed", tone: "warn" },
    { n: approved, label: "Approved", href: "/admin/products?status=approved", tone: "good" },
    { n: hidden, label: "Hidden", href: "/admin/products?status=hidden" },
    { n: sizes, label: "Unreviewed with guessed sizes", href: "/admin/products?status=unreviewed&issue=sizes", tone: "warn" },
    { n: photos, label: "Unreviewed with a swapped photo", href: "/admin/products?status=unreviewed&issue=photo", tone: "warn" },
  ];
  return (
    <>
      <h1 className={styles.h1}>Dashboard</h1>
      <p className={styles.sub}>{cards.length.toLocaleString("en-IN")} products imported from the catalogue.</p>
      <div className={styles.stats}>
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={styles.stat} data-tone={s.tone}>
            <b>{s.n.toLocaleString("en-IN")}</b>
            <span>{s.label}</span>
          </Link>
        ))}
      </div>
      <div className={styles.stats}>
        <Link href="/admin/orders" className={styles.stat}>
          <b>{orders.length}</b>
          <span>Orders</span>
        </Link>
        <Link href="/admin/orders" className={styles.stat} data-tone={toShip ? "warn" : undefined}>
          <b>{toShip}</b>
          <span>Paid, not shipped yet</span>
        </Link>
        <Link href="/admin/orders" className={styles.stat} data-tone="good">
          <b>{money(paid.reduce((s, o) => s + o.total, 0))}</b>
          <span>Paid order value</span>
        </Link>
      </div>
      <div className={styles.panel}>
        <h2>How review works</h2>
        <p>
          Every imported product is live unless you hide it. Approving marks it as checked; hiding takes it off the store straight away. Edits to name,
          price, sizes, category or photo stay when the catalogue is re-imported.
        </p>
      </div>
    </>
  );
}
