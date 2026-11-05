import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { money } from "@/lib/catalog";
import { listOrders, ORDER_STATUSES } from "@/lib/orders";
import { setOrderStatus } from "../actions";
import styles from "../admin.module.css";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function AdminOrders() {
  await requireAdmin();
  const orders = await listOrders();
  return (
    <>
      <h1 className={styles.h1}>Orders</h1>
      <p className={styles.sub}>
        Newest first. Move each paid order along as you pack and ship it; the customer&apos;s order page shows the same status.
      </p>
      {orders.length === 0 && <p className={styles.panel}>No orders yet.</p>}
      {orders.map((o) => (
        <section key={o.id} className={styles.order}>
          <div className={styles.orderHead}>
            <b>{o.id}</b>
            <span className={styles.pill} data-s={o.status}>
              {o.status}
            </span>
            <span className={styles.muted}>{when(o.createdAt)}</span>
            <span className={styles.muted}>{o.payment?.provider === "test" ? "Test payment" : o.payment?.provider === "razorpay" ? `Razorpay ${o.payment.paymentId ?? "(not paid)"}` : "No payment yet"}</span>
            <form action={setOrderStatus}>
              <input type="hidden" name="id" value={o.id} />
              <select name="status" defaultValue={o.status} aria-label={`Status of ${o.id}`}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <button type="submit" className={styles.btn}>
                Update
              </button>
            </form>
          </div>
          <div className={styles.orderBody}>
            <div>
              {o.lines.map((l) => (
                <div key={`${l.id}:${l.size}`} className={styles.line}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.image} alt="" referrerPolicy="no-referrer" />
                  <span>
                    <Link href={`/admin/products/${encodeURIComponent(l.id)}`}>
                      {l.brand} {l.name}
                    </Link>
                    <div className={styles.muted}>
                      {l.qty} × {money(l.price)}
                      {l.size && ` · size ${l.size}`}
                    </div>
                  </span>
                  <b>{money(l.qty * l.price)}</b>
                </div>
              ))}
              <div className={styles.line} style={{ borderTop: "1px solid var(--line)", marginTop: 6 }}>
                <span>Total</span>
                <b>{money(o.total)}</b>
              </div>
            </div>
            <div>
              <b>{o.customer.name}</b>
              <div>
                <a href={`tel:+91${o.customer.phone}`}>+91 {o.customer.phone}</a> · <a href={`mailto:${o.customer.email}`}>{o.customer.email}</a>
              </div>
              <p className={styles.muted} style={{ marginTop: 6 }}>
                {o.customer.address}, {o.customer.city}, {o.customer.state} {o.customer.pincode}
              </p>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
