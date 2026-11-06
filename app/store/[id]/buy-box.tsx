"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cart } from "@/lib/cart";
import { money } from "@/lib/catalog";
import styles from "../store.module.css";

type Props = { item: { id: string; name: string; brand: string; image: string; price: number; sizes: string[] } };

export function BuyBox({ item }: Props) {
  const router = useRouter();
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<"idle" | "needSize" | "added">("idle");

  const add = () => {
    if (item.sizes.length && !size) {
      setState("needSize");
      return false;
    }
    cart.add({ id: item.id, size: item.sizes.length ? size : null, qty, name: item.name, brand: item.brand, image: item.image, price: item.price });
    setState("added");
    return true;
  };

  return (
    <div className={styles.box}>
      {item.sizes.length > 0 && (
        <div>
          <div className={styles.label}>Size</div>
          <div className={styles.sizes} role="group" aria-label="Size">
            {item.sizes.map((s) => (
              <button key={s} type="button" aria-pressed={size === s} onClick={() => { setSize(s); setState("idle"); }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className={styles.label}>Quantity</div>
        <div className={styles.qty}>
          <button type="button" aria-label="One less" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span aria-live="polite">{qty}</span>
          <button type="button" aria-label="One more" onClick={() => setQty((q) => Math.min(9, q + 1))}>+</button>
        </div>
      </div>
      {state === "needSize" && <p className={styles.hint}>Pick a size first.</p>}
      {state === "added" && (
        <div className={styles.added}>
          Added to your cart <Link href="/store/cart">View cart</Link>
        </div>
      )}
      <div className={styles.actions}>
        <span className={styles.barPrice}>
          {money(item.price)}
          <small>{size ? `Size ${size}` : item.sizes.length ? "Pick a size" : "Free delivery"}</small>
        </span>
        <Button variant="outline" onClick={add}>Add to cart</Button>
        <Button onClick={() => add() && router.push("/store/checkout")}>Buy now</Button>
      </div>
    </div>
  );
}
