"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/catalog";
import { cart } from "@/lib/cart";
import { useFreshCart } from "../use-fresh-cart";
import { confirmPayment, confirmTestPayment, placeOrder, type CheckoutInput } from "../actions";
import styles from "../store.module.css";

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayCheckout = { open: () => void };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayCheckout;
  }
}

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const fields: { name: keyof CheckoutInput["customer"]; label: string; type?: string; full?: boolean; area?: boolean; mode?: "numeric" | "tel" | "email" }[] = [
  { name: "name", label: "Full name", full: true },
  { name: "phone", label: "Mobile number", type: "tel", mode: "tel" },
  { name: "email", label: "Email", type: "email", mode: "email" },
  { name: "address", label: "Address (house, street, area)", full: true, area: true },
  { name: "city", label: "City" },
  { name: "state", label: "State" },
  { name: "pincode", label: "Pincode", mode: "numeric" },
];

export default function CheckoutPage() {
  const { lines, notice } = useFreshCart();
  const router = useRouter();
  const [error, setError] = useState("");
  const [test, setTest] = useState<{ orderId: string; amount: number } | null>(null);
  const [pending, start] = useTransition();
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  const finish = (orderId: string) => {
    cart.clear();
    router.push(`/store/order/${orderId}`);
  };

  const submit = (form: FormData) => {
    setError("");
    const customer = Object.fromEntries(fields.map((f) => [f.name, String(form.get(f.name) ?? "")])) as CheckoutInput["customer"];
    start(async () => {
      const res = await placeOrder({ lines: lines.map(({ id, size, qty }) => ({ id, size, qty })), customer });
      if (res.kind === "error") return setError(res.message);
      if (res.kind === "test") return setTest({ orderId: res.orderId, amount: res.amount });
      if (!(await loadRazorpay()) || !window.Razorpay) return setError("Could not load the payment window. Check your connection.");
      new window.Razorpay({
        key: res.key,
        order_id: res.razorpayOrderId,
        amount: res.amount * 100,
        currency: "INR",
        name: "GearCircle",
        description: `Order ${res.orderId}`,
        prefill: { name: customer.name, email: customer.email, contact: customer.phone },
        theme: { color: "#178a03" },
        handler: async (r: RazorpayResponse) => {
          if (await confirmPayment(res.orderId, r.razorpay_payment_id, r.razorpay_signature)) finish(res.orderId);
          else setError("We could not confirm the payment. If money was taken, message us with order " + res.orderId);
        },
      }).open();
    });
  };

  if (lines.length === 0 && !test)
    return (
      <main className={`wrap ${styles.page}`}>
        <h1 className={styles.title}>Checkout</h1>
        <div className={styles.empty}>
          <p>Your cart is empty.</p>
          <Button asChild style={{ marginTop: 16 }}><Link href="/store">Browse the store</Link></Button>
        </div>
      </main>
    );

  return (
    <main className={`wrap ${styles.page}`}>
      <h1 className={styles.title}>Checkout</h1>
      {notice && <p className={styles.hint} role="status">{notice}</p>}
      <div className={styles.two}>
        <form className={styles.form} onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }}>
          <h2>Delivery details</h2>
          {fields.map((f) => (
            <label key={f.name} className={`${styles.field} ${f.full ? styles.full : ""}`}>
              {f.label}
              {f.area ? (
                <textarea name={f.name} required autoComplete="street-address" />
              ) : (
                <input name={f.name} type={f.type ?? "text"} inputMode={f.mode} required autoComplete={f.name === "name" ? "name" : f.name === "phone" ? "tel" : f.name === "pincode" ? "postal-code" : f.name} />
              )}
            </label>
          ))}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <Button type="submit" disabled={pending || Boolean(test)} className={styles.cta} style={{ gridColumn: "1/-1", height: 54, borderRadius: 14, fontWeight: 800 }}>
            {pending ? "Starting payment…" : `Pay ${money(total)}`}
          </Button>
        </form>
        <aside className={styles.summary}>
          <h2>Your order</h2>
          {lines.map((l) => (
            <div key={`${l.id}:${l.size}`} className={styles.miniLine}>
              <span>{l.qty} × {l.brand} {l.name}{l.size ? ` (${l.size})` : ""}</span>
              <b>{money(l.price * l.qty)}</b>
            </div>
          ))}
          <div className={styles.sumRow}><span>Delivery</span><span>Free</span></div>
          <div className={styles.sumTotal}><span>Total</span><span>{money(total)}</span></div>
          {test && (
            <div className={styles.testPay}>
              <b>Test payment: {money(test.amount)}</b>
              <p>Razorpay keys are not added yet, so this is a pretend payment that only works on a dev machine. Order {test.orderId}.</p>
              <div>
                <Button onClick={() => start(async () => { if (await confirmTestPayment(test.orderId)) finish(test.orderId); else setError("Test payment is off."); })}>
                  Pay (test)
                </Button>
                <Button variant="outline" onClick={() => setTest(null)}>Cancel</Button>
              </div>
            </div>
          )}
          <p className={styles.small}>Payments by Razorpay: UPI, cards, netbanking.</p>
        </aside>
      </div>
    </main>
  );
}
