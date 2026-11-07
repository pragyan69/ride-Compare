import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOrder } from "@/lib/orders";
import styles from "../store.module.css";

export const metadata: Metadata = { title: "Track your order | GearCircle Store", robots: { index: false } };

type Props = { searchParams: Promise<{ id?: string | string[] }> };

/** Type the order number from the confirmation page and jump to its status. */
export default async function TrackPage({ searchParams }: Props) {
  const raw = (await searchParams).id;
  const id = (Array.isArray(raw) ? raw[0] : raw)?.trim().toUpperCase() ?? "";
  const order = id ? await getOrder(id) : undefined;
  if (order) redirect(`/store/order/${encodeURIComponent(order.id)}`);
  return (
    <main className={`wrap ${styles.page}`}>
      <div className={styles.done}>
        <h1>Track your order</h1>
        <p>Enter the order number from your confirmation, like GC-1A2B3C4D.</p>
        <form action="/store/track" className={styles.trackForm}>
          <input name="id" defaultValue={id} placeholder="GC-XXXXXXXX" aria-label="Order number" autoCapitalize="characters" required />
          <button type="submit">Track</button>
        </form>
        {id && <p className={styles.hint}>We couldn&apos;t find order {id}. Check the number, or message us on Instagram.</p>}
      </div>
    </main>
  );
}
