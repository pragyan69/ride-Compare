"use client";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/catalog";
import styles from "./page.module.css";

export type BuyItem = { slot: string; label: string; name: string; store: string; price: number; url: string };

/** Phone bar: tapping it opens every piece with its store button, so one tap always does something visible. */
export function BuyBar({ total, items }: { total: number; items: BuyItem[] }) {
  return (
    <Sheet>
      <SheetTrigger className={styles.stickyBar}>
        <span>
          Full kit <strong>{money(total)}</strong>
        </span>
        <span className={styles.stickyCta}>Buy the full kit</span>
      </SheetTrigger>
      <SheetContent side="bottom" className={styles.buySheet}>
        <SheetTitle>Buy the full kit</SheetTitle>
        <SheetDescription>Each piece at tonight&apos;s lowest price. Every button opens that store.</SheetDescription>
        <ul className={styles.buyList}>
          {items.map((i) => (
            <li key={i.slot}>
              <span className={styles.buyLabel}>
                <small>{i.label}</small>
                {i.name}
              </span>
              <Button asChild size="sm">
                <a href={i.url} target="_blank" rel="noopener noreferrer nofollow" data-ph-capture-attribute-store-click={i.store} data-ph-capture-attribute-price={i.price}>
                  {i.store} {money(i.price)}
                </a>
              </Button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
