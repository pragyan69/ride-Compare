"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Headphones, MessageCircle, Truck } from "lucide-react";

const INSTAGRAM = "https://www.instagram.com/ridecompare26/";
// Digits only with country code, e.g. 919876543210. The WhatsApp row only shows once this is set.
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP;

/** Headset button in the header that opens a small support menu. */
export function SupportMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="support" ref={root}>
      <button type="button" className="support-btn" aria-label="Support" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        <Headphones size={20} aria-hidden />
      </button>
      {open && (
        <div className="support-menu" role="menu">
          <p>Support</p>
          {WHATSAPP && (
            <a role="menuitem" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
              <MessageCircle size={20} aria-hidden /> WhatsApp us <ChevronRight size={18} aria-hidden />
            </a>
          )}
          <a role="menuitem" href={INSTAGRAM} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            <MessageCircle size={20} aria-hidden /> Message us on Instagram <ChevronRight size={18} aria-hidden />
          </a>
          <Link role="menuitem" href="/store/track" onClick={() => setOpen(false)}>
            <Truck size={20} aria-hidden /> Track order <ChevronRight size={18} aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
