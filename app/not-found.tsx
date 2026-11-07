import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Truck } from "lucide-react";

export const metadata: Metadata = { title: "Page not found | GearCircle", robots: { index: false } };

/** A full-face helmet that stands in for the 0 in 404. */
function Helmet() {
  return (
    <svg viewBox="0 0 200 200" className="nf-helmet" aria-hidden>
      <path d="M100 18c-48 0-82 36-82 86 0 28 8 50 20 64h124c12-14 20-36 20-64 0-50-34-86-82-86Z" fill="#0d0f0e" />
      <path d="M34 92c6-34 34-58 72-58 30 0 52 14 62 36l-50 8c-26 4-56 8-84 14Z" fill="#2cf005" />
      <path d="M30 104c30-8 82-16 140-20 4 10 6 20 6 32-46 2-102 8-144 16-2-10-3-18-2-28Z" fill="#1b1f1d" />
      <path d="M44 112c32-6 74-10 116-12" stroke="#2cf005" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".6" />
      <path d="M38 168h124l-6 14H44Z" fill="#2cf005" />
      <circle cx="156" cy="146" r="7" fill="#2cf005" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <main className="wrap nf">
      <div className="nf-code" aria-label="404">
        <span>4</span>
        <Helmet />
        <span>4</span>
      </div>
      <h1>This page took a wrong turn</h1>
      <p>The link is old or the product has sold out. Let&apos;s get you back on the road.</p>
      <div className="nf-actions">
        <Link href="/" className="nf-home">
          Back to home
        </Link>
        <Link href="/store" className="nf-shop">
          Shop all gear
        </Link>
      </div>
      <div className="nf-help">
        <span>Need help?</span>
        <div>
          <a href="https://www.instagram.com/ridecompare26/" target="_blank" rel="noopener noreferrer">
            <MessageCircle size={18} aria-hidden /> Message us on Instagram
          </a>
          <Link href="/store/track">
            <Truck size={18} aria-hidden /> Track an order
          </Link>
        </div>
      </div>
    </main>
  );
}
