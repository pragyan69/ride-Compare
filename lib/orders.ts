import "server-only";
import { randomUUID } from "node:crypto";
import { query } from "./db";

export type OrderLine = { id: string; name: string; brand: string; image: string; size: string | null; qty: number; price: number };
export type Customer = { name: string; phone: string; email: string; address: string; city: string; state: string; pincode: string };
export type Payment = { provider: "razorpay"; razorpayOrderId: string; paymentId?: string } | { provider: "test" };
export const ORDER_STATUSES = ["pending", "paid", "packed", "shipped", "delivered", "cancelled"] as const;
export type Order = {
  id: string;
  createdAt: string;
  lines: OrderLine[];
  total: number;
  customer: Customer;
  /** pending = not paid yet; paid onwards is the fulfilment trail an admin moves it along. */
  status: (typeof ORDER_STATUSES)[number];
  payment?: Payment;
};

export async function createOrder(o: Omit<Order, "id" | "createdAt" | "status">): Promise<Order> {
  const order: Order = { ...o, id: `GC-${randomUUID().slice(0, 8).toUpperCase()}`, createdAt: new Date().toISOString(), status: "pending" };
  await query("INSERT INTO store_orders (id, data, created_at) VALUES ($1, $2::jsonb, $3)", [order.id, JSON.stringify(order), order.createdAt]);
  return order;
}

/** Newest first. */
export async function listOrders() {
  return (await query<{ data: Order }>("SELECT data FROM store_orders ORDER BY created_at DESC")).map((r) => r.data);
}

export async function getOrder(id: string) {
  return (await query<{ data: Order }>("SELECT data FROM store_orders WHERE id = $1", [id]))[0]?.data;
}

/** Merges the patch in one statement, so two updates can't overwrite each other. */
export async function updateOrder(id: string, patch: Partial<Pick<Order, "status" | "payment">>) {
  const rows = await query<{ data: Order }>("UPDATE store_orders SET data = data || $2::jsonb WHERE id = $1 RETURNING data", [id, JSON.stringify(patch)]);
  return rows[0]?.data;
}
