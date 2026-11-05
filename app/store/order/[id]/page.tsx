import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/catalog";
import { getOrder, type Order } from "@/lib/orders";
import styles from "../../store.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order | GearCircle Store", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const paid = order.status !== "pending";
  const cancelled = order.status === "cancelled";
  const step: Record<Order["status"], string> = {
    pending: "is saved but not paid yet.",
    paid: "is confirmed.",
    packed: "is packed.",
    shipped: "is on its way.",
    delivered: "was delivered.",
    cancelled: "was cancelled.",
  };
  return (
    <main className={`wrap ${styles.page}`}>
      <div className={styles.done}>
        <div className={styles.tick} aria-hidden>{cancelled ? "×" : paid ? "✓" : "…"}</div>
        <h1>{cancelled ? "Order cancelled" : paid ? "Order placed!" : "Waiting for payment"}</h1>
        <p>
          Order <b>{order.id}</b> {step[order.status]}
        </p>
        {order.payment?.provider === "test" && <p className={styles.small}>Paid with the test button (no real money).</p>}
        <div className={styles.lines}>
          {order.lines.map((l) => (
            <div key={`${l.id}:${l.size}`} className={styles.miniLine}>
              <span>{l.qty} × {l.brand} {l.name}{l.size ? ` (${l.size})` : ""}</span>
              <b>{money(l.price * l.qty)}</b>
            </div>
          ))}
          <div className={styles.sumTotal}><span>Total</span><span>{money(order.total)}</span></div>
        </div>
        <p className={styles.small}>Delivering to {order.customer.name}, {order.customer.address}, {order.customer.city} {order.customer.pincode}</p>
        <Button asChild style={{ marginTop: 20 }}><Link href="/store">Keep shopping</Link></Button>
      </div>
    </main>
  );
}
