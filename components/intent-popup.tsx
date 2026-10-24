"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const KEY = "rc-intent-seen";
// Visitors on these pages already said what they want.
const SKIP = /^\/(gear|bikes|product|kit|deals|compare|build)/;

const choices = [
  { href: "/gear", label: "Riding gear", hint: "Helmets, jackets, gloves, boots", img: "/banners/now-960.webp", pos: "68% 50%" },
  { href: "/bikes", label: "Bike parts", hint: "Crash guards, exhausts, racks, filters", img: "/banners/track-960.webp", pos: "62% 50%" },
];

function seen() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
}

/** Asks first-time visitors, after a little scrolling, whether they are shopping for gear or parts. Shown once. */
export function IntentPopup() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (SKIP.test(path) || seen()) return;
    const onScroll = () => {
      if (window.scrollY < 500) return;
      window.removeEventListener("scroll", onScroll);
      setOpen(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [path]);

  const close = (o: boolean) => {
    setOpen(o);
    if (!o) markSeen();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="intent flex flex-col gap-0 border-white/10 p-7 sm:max-w-[620px]" data-dark onOpenAutoFocus={(e) => e.preventDefault()}>
        <p className="intent-kicker">Quick one</p>
        <DialogTitle className="intent-title">What are you shopping for?</DialogTitle>
        <DialogDescription className="intent-sub">We&apos;ll take you straight to the best prices across Indian stores.</DialogDescription>
        <div className="intent-grid">
          {choices.map((c) => (
            <Link key={c.href} href={c.href} className="intent-card" onClick={() => close(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- small static covers, already sized */}
              <img src={c.img} alt="" style={{ objectPosition: c.pos }} />
              <span className="intent-shade" />
              <span className="intent-text">
                <strong>{c.label}</strong>
                <small>{c.hint}</small>
              </span>
            </Link>
          ))}
        </div>
        <button className="intent-skip" onClick={() => close(false)}>
          Just browsing
        </button>
      </DialogContent>
    </Dialog>
  );
}
