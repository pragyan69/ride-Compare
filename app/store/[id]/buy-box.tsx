"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ChevronRight, CreditCard, Headphones, MessageCircle, ShieldCheck, Truck, Wrench } from "lucide-react";
import { cart } from "@/lib/cart";
import { money } from "@/lib/catalog";
import styles from "../store.module.css";
import { SizeGuide } from "./size-guide";

type Props = {
  item: { id: string; name: string; brand: string; category: string; image: string; price: number; mrp: number | null; sizes: string[] };
  instagram: string;
};

export function BuyBox({ item, instagram }: Props) {
  const router = useRouter();
  const [size, setSize] = useState<string | null>(item.sizes.length === 1 ? item.sizes[0] : null);
  const [state, setState] = useState<"idle" | "needSize" | "added">("idle");
  const off = item.mrp ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;

  const add = () => {
    if (item.sizes.length && !size) {
      setState("needSize");
      return false;
    }
    cart.add({ id: item.id, size: item.sizes.length ? size : null, qty: 1, name: item.name, brand: item.brand, image: item.image, price: item.price });
    setState("added");
    return true;
  };

  return (
    <div className={styles.box}>
      {item.sizes.length > 0 && (
        <div>
          <div className={styles.sizeHead}>
            <span>
              Selected: <b>{size ?? "pick a size"}</b>
            </span>
            <SizeGuide category={item.category} brand={item.brand} />
          </div>
          <div className={styles.sizes} role="group" aria-label="Size" data-missing={state === "needSize" || undefined}>
            {item.sizes.map((s) => (
              <button key={s} type="button" aria-pressed={size === s} onClick={() => { setSize(s); setState("idle"); }}>
                {s}
              </button>
            ))}
          </div>
          {state === "needSize" && <p className={styles.hint}>Pick a size first.</p>}
        </div>
      )}

      <div>
        <div className={styles.priceRow}>
          <span className={styles.price}>{money(item.price)}</span>
          {item.mrp && <s className={styles.mrp}>{money(item.mrp)}</s>}
          {off > 0 && (
            <span className={styles.badge}>
              <ArrowDown size={13} aria-hidden />
              {off}%
            </span>
          )}
        </div>
        <p className={styles.tax}>Inclusive of all taxes. Free delivery across India.</p>
      </div>

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
        <button type="button" className={styles.buyNow} onClick={() => add() && router.push("/store/checkout")}>
          Buy now
        </button>
        <button type="button" className={styles.addCart} onClick={add}>
          Add to cart
        </button>
      </div>

      <ul className={styles.perkList}>
        <li><Truck size={18} aria-hidden /> Free delivery anywhere in India</li>
        <li><CreditCard size={18} aria-hidden /> Pay by UPI, card or netbanking</li>
        <li>
          <a href={instagram} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={18} aria-hidden /> Questions? A person replies on Instagram <ChevronRight size={16} aria-hidden />
          </a>
        </li>
      </ul>

      <div>
        <h2 className={styles.eyebrow}>Shop with confidence</h2>
        <div className={styles.confidence}>
          <div><ShieldCheck size={20} aria-hidden /><span>Secure checkout<small>Payments run through Razorpay</small></span></div>
          <div><Truck size={20} aria-hidden /><span>Free delivery<small>No minimum order</small></span></div>
          <div><Headphones size={20} aria-hidden /><span>Real support<small>Talk to a rider, not a bot</small></span></div>
          <div><Wrench size={20} aria-hidden /><span>Fit check<small>Ask before you buy</small></span></div>
        </div>
      </div>
    </div>
  );
}
