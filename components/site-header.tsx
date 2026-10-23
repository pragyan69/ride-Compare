"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Zap } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "./ui/button";

const nav = [
  { href: "/gear", label: "All gear" },
  { href: "/deals", label: "Deals", hot: true },
  { href: "/gear?category=Helmets", label: "Helmets" },
  { href: "/gear?category=Jackets", label: "Jackets" },
  { href: "/gear?category=Gloves", label: "Gloves" },
  { href: "/gear?category=Boots", label: "Boots" },
  { href: "/gear?category=Luggage", label: "Luggage" },
  { href: "/bikes", label: "By bike" },
  { href: "/brands", label: "Brands" },
];
const hints = ["Himalayan 450 crash guard", "LS2 helmet under 10k", "waterproof riding gloves", "Rynox tail bag", "chain lube"];

export function SiteHeader() {
  const path = usePathname();
  const [hint, setHint] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  // Aceternity "resizable navbar": past the first 80px the bar shrinks into a floating glass pill.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 80));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % hints.length), 2600);
    return () => clearInterval(t);
  }, []);
  const active = (href: string) => !href.includes("?") && (path.startsWith(href) || (href === "/gear" && path.startsWith("/product")));
  return (
    <>
      <header className="site-header" data-scrolled={scrolled || undefined}>
        <div className="wrap header-inner">
          <div className="header-brand">
            <Link href="/" aria-label="RideCompare home">
              <Logo />
            </Link>
          </div>
          <form action="/gear" role="search" className="header-search">
            <Search size={18} aria-hidden />
            <input name="q" aria-label="Search motorcycle gear" placeholder={`Search for ${hints[hint]}`} />
          </form>
          <Button asChild size="lg" className="header-cta">
            <Link href="/build">Build your kit</Link>
          </Button>
        </div>
      </header>
      <nav className="cat-nav" aria-label="Sections">
        <div className="wrap">
          {nav.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined} className={l.hot ? "hot" : undefined}>
              {l.hot && <Zap size={15} aria-hidden />}
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
