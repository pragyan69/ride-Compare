"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, MapPin, Bike, Zap } from "lucide-react";
import { Logo } from "./logo";

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
  { href: "/build", label: "Build a kit" },
];
const hints = ["Himalayan 450 crash guard", "LS2 helmet under 10k", "waterproof riding gloves", "Rynox tail bag", "chain lube"];

export function SiteHeader() {
  const path = usePathname();
  const [hint, setHint] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % hints.length), 2600);
    return () => clearInterval(t);
  }, []);
  const active = (href: string) => !href.includes("?") && (path.startsWith(href) || (href === "/gear" && path.startsWith("/product")));
  return (
    <>
      <header className="site-header">
        <div className="wrap header-inner">
          <div className="header-brand">
            <Link href="/" aria-label="RideCompare home">
              <Logo />
            </Link>
            <span className="header-locale">
              <MapPin size={13} aria-hidden /> India · prices in ₹
            </span>
          </div>
          <form action="/gear" role="search" className="header-search">
            <Search size={18} aria-hidden />
            <input name="q" aria-label="Search motorcycle gear" placeholder={`Search for ${hints[hint]}`} />
          </form>
          <Link href="/bikes" className="icon-button" aria-label="Shop by bike">
            <Bike size={20} />
          </Link>
          <Link href="/build" className="header-cta">
            Build your kit
          </Link>
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
