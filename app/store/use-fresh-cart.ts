"use client";
import { useEffect, useState } from "react";
import { cart, useCart } from "@/lib/cart";
import { quoteCart } from "./actions";

/** The cart, re-priced against the server once per change of lines. `notice` says if anything was removed. */
export function useFreshCart() {
  const lines = useCart();
  const [notice, setNotice] = useState("");
  const key = lines.map((l) => `${l.id}:${l.size}`).join("|");
  useEffect(() => {
    if (!key) return;
    let live = true;
    quoteCart(lines.map(({ id, size }) => ({ id, size }))).then((quotes) => {
      if (!live) return;
      const dropped = cart.reprice(quotes);
      if (dropped) setNotice(`${dropped} item${dropped > 1 ? "s are" : " is"} no longer available and ${dropped > 1 ? "were" : "was"} removed.`);
    });
    return () => {
      live = false;
    };
    // re-quote only when the set of lines changes, not on qty edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { lines, notice };
}
