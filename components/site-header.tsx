"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Zap, Menu, HardHat, Shirt, Hand, Footprints, Backpack, Wrench, Bike, Tag, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "./ui/sheet";
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
// Phone-only category strip under the search bar.
const strip: { href: string; label: string; icon: LucideIcon; hot?: boolean }[] = [
  { href: "/deals", label: "Deals", icon: Zap, hot: true },
  { href: "/gear?category=Helmets", label: "Helmets", icon: HardHat },
  { href: "/gear?category=Jackets", label: "Jackets", icon: Shirt },
  { href: "/gear?category=Gloves", label: "Gloves", icon: Hand },
  { href: "/gear?category=Boots", label: "Boots", icon: Footprints },
  { href: "/gear?category=Luggage", label: "Luggage", icon: Backpack },
  { href: "/gear?category=Maintenance%20%26%20Parts", label: "Parts", icon: Wrench },
  { href: "/bikes", label: "By bike", icon: Bike },
  { href: "/brands", label: "Brands", icon: Tag },
];
const hints = ["Himalayan 450 crash guard", "LS2 helmet under 10k", "waterproof riding gloves", "Rynox tail bag", "chain lube"];

export function SiteHeader() {
  const path = usePathname();
  const [hint, setHint] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
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
          <button type="button" className="menu-btn" aria-label="Open menu" onClick={() => setMenu(true)}>
            <Menu size={22} aria-hidden />
          </button>
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
      <nav className="m-cats" aria-label="Shop by category">
        {strip.map(({ href, label, icon: Icon, hot }) => (
          <Link key={href} href={href} data-hot={hot || undefined}>
            <span className="m-cat-icon">
              <Icon size={22} strokeWidth={1.8} aria-hidden />
            </span>
            {label}
          </Link>
        ))}
      </nav>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="m-menu">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Browse RideCompare sections</SheetDescription>
          <Link href="/" className="m-menu-logo" onClick={() => setMenu(false)}>
            <Logo />
          </Link>
          <ul>
            {nav.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setMenu(false)} data-hot={l.hot || undefined}>
                  {l.hot && <Zap size={15} aria-hidden />}
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="m-menu-cta">
            <Link href="/build" onClick={() => setMenu(false)}>
              Build your kit
            </Link>
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
