"use server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createOrder, getOrder, updateOrder, type OrderLine } from "@/lib/orders";
import { storeItem } from "@/lib/shop";

const checkoutSchema = z.object({
  lines: z.array(z.object({ id: z.string(), size: z.string().nullable(), qty: z.number().int().min(1).max(9) })).min(1).max(30),
  customer: z.object({
    name: z.string().trim().min(2, "Enter your full name"),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number"),
    email: z.string().trim().email("Enter a valid email"),
    address: z.string().trim().min(8, "Enter your full address"),
    city: z.string().trim().min(2, "Enter your city"),
    state: z.string().trim().min(2, "Enter your state"),
    pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit pincode"),
  }),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutResult =
  | { kind: "error"; message: string }
  | { kind: "razorpay"; orderId: string; key: string; razorpayOrderId: string; amount: number }
  | { kind: "test"; orderId: string; amount: number };

const razorpayKeys = () => {
  const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  return key && secret ? { key, secret } : undefined;
};

/** Prices every line from our own list (never from the browser), saves the order, and opens a payment. */
export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { kind: "error", message: parsed.error.issues[0]?.message ?? "Check your details" };
  const lines: OrderLine[] = [];
  for (const l of parsed.data.lines) {
    const item = await storeItem(l.id);
    if (!item) return { kind: "error", message: "An item in your cart is no longer available. Remove it and try again." };
    if (item.sizes.length ? !l.size || !item.sizes.includes(l.size) : l.size !== null)
      return { kind: "error", message: `Pick a size for ${item.name}.` };
    lines.push({ id: item.id, name: item.name, brand: item.brand, image: item.image, size: l.size, qty: l.qty, price: item.price });
  }
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const keys = razorpayKeys();
  if (!keys) {
    if (process.env.NODE_ENV === "production") return { kind: "error", message: "Payments are not switched on yet." };
    const order = await createOrder({ lines, total, customer: parsed.data.customer });
    return { kind: "test", orderId: order.id, amount: total };
  }
  const order = await createOrder({ lines, total, customer: parsed.data.customer });
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${keys.key}:${keys.secret}`).toString("base64")}` },
    body: JSON.stringify({ amount: total * 100, currency: "INR", receipt: order.id }),
  });
  const body: unknown = await res.json().catch(() => null);
  const rzpId = typeof body === "object" && body !== null && "id" in body && typeof body.id === "string" ? body.id : undefined;
  if (!res.ok || !rzpId) return { kind: "error", message: "Could not start the payment. Please try again." };
  await updateOrder(order.id, { payment: { provider: "razorpay", razorpayOrderId: rzpId } });
  return { kind: "razorpay", orderId: order.id, key: keys.key, razorpayOrderId: rzpId, amount: total };
}

/** Razorpay signs order_id|payment_id with our secret; only a matching signature marks the order paid. */
export async function confirmPayment(orderId: string, paymentId: string, signature: string) {
  const keys = razorpayKeys();
  const order = await getOrder(orderId);
  if (!keys || !order || order.payment?.provider !== "razorpay") return false;
  const want = createHmac("sha256", keys.secret).update(`${order.payment.razorpayOrderId}|${paymentId}`).digest("hex");
  const ok = want.length === signature.length && timingSafeEqual(Buffer.from(want), Buffer.from(signature));
  if (ok) await updateOrder(orderId, { status: "paid", payment: { ...order.payment, paymentId } });
  return ok;
}

/** Local testing only: with no Razorpay keys and outside production, the test button marks an order paid. */
export async function confirmTestPayment(orderId: string) {
  if (razorpayKeys() || process.env.NODE_ENV === "production") return false;
  return Boolean(await updateOrder(orderId, { status: "paid", payment: { provider: "test" } }));
}

/** Current price and details for each cart line, so the cart never shows a stale or edited price. */
export async function quoteCart(lines: { id: string; size: string | null }[]) {
  return Promise.all(
    lines.slice(0, 30).map(async (l) => {
      const item = await storeItem(l.id);
      return item ? { id: l.id, size: l.size, price: item.price, name: item.name, brand: item.brand, image: item.image } : { id: l.id, size: l.size, price: null };
    }),
  );
}
