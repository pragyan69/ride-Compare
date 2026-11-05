"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Zap, Menu, HardHat, Shirt, Hand, Footprints, Backpack, Wrench, Bike, ShoppingBag, type LucideIcon } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "./ui/sheet";
import { Logo } from "./logo";
import { Button } from "./ui/button";

const nav: { href: string; label: string; hot?: boolean }[] = [
  { href: "/store", label: "Shop all" },
  { href: "/store?category=Helmets", label: "Helmets" },
  { href: "/store?category=Jackets", label: "Jackets" },
  { href: "/store?category=Boots", label: "Boots" },
  { href: "/store?category=Pants", label: "Pants" },
  { href: "/store?category=Gloves", label: "Gloves" },
  { href: "/store?category=Bike%20Accessories", label: "Bike parts" },
  { href: "/store?category=Maintenance%20%26%20Parts", label: "Maintenance" },
  { href: "/store?category=Luggage", label: "Luggage" },
  { href: "/store?category=Electronics", label: "Electronics" },
];
// Phone-only category strip under the search bar.
const strip: { href: string; label: string; icon: LucideIcon; hot?: boolean }[] = [
  { href: "/store", label: "Shop all", icon: ShoppingBag },
  { href: "/store?category=Helmets", label: "Helmets", icon: HardHat },
  { href: "/store?category=Jackets", label: "Jackets", icon: Shirt },
  { href: "/store?category=Gloves", label: "Gloves", icon: Hand },
  { href: "/store?category=Boots", label: "Boots", icon: Footprints },
  { href: "/store?category=Bike%20Accessories", label: "Bike parts", icon: Bike },
  { href: "/store?category=Maintenance%20%26%20Parts", label: "Maintenance", icon: Wrench },
  { href: "/store?category=Luggage", label: "Luggage", icon: Backpack },
  { href: "/store?category=Electronics", label: "Electronics", icon: Zap },
];
const hints = ["Himalayan 450 crash guard", "AGV K1 S", "waterproof riding boots", "Akrapovic exhaust", "chain lube"];

export function SiteHeader() {
  const path = usePathname();
  const [hint, setHint] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [compact, setCompact] = useState(false);
  const [menu, setMenu] = useState(false);
  // Aceternity "resizable navbar": past the first 80px the bar shrinks into a floating glass pill.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 80);
        setCompact(window.scrollY > 200);
      });
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
  const active = (href: string) => href === "/store" && path.startsWith("/store");
  return (
    <>
      <header className="site-header" data-scrolled={scrolled || undefined}>
        <div className="wrap header-inner">
          <button type="button" className="menu-btn" aria-label="Open menu" onClick={() => setMenu(true)}>
            <Menu size={22} aria-hidden />
          </button>
          <div className="header-brand">
            <Link href="/" aria-label="GearCircle home">
              <Logo />
            </Link>
          </div>
          <form action="/store" role="search" className="header-search">
            <Search size={18} aria-hidden />
            <input name="q" aria-label="Search motorcycle gear" placeholder={`Search for ${hints[hint]}`} />
          </form>
          <CartButton />
          <Button asChild size="lg" className="header-cta">
            <Link href="/store">Shop now</Link>
          </Button>
        </div>
      </header>
      {/* Phones: once the header scrolls away, a slim menu + search bar slides in (Culture Circle style). */}
      <div className="m-bar" data-show={compact || undefined} aria-hidden={!compact} inert={!compact}>
        <button type="button" className="menu-btn" aria-label="Open menu" onClick={() => setMenu(true)}>
          <Menu size={22} aria-hidden />
        </button>
        <form action="/store" role="search" className="header-search">
          <Search size={18} aria-hidden />
          <input name="q" aria-label="Search motorcycle gear" placeholder={`Search for ${hints[hint]}`} />
        </form>
        <CartButton />
      </div>
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
          <SheetDescription className="sr-only">Browse GearCircle sections</SheetDescription>
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
            <Link href="/store/cart" onClick={() => setMenu(false)}>
              Your cart
            </Link>
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}

function CartButton() {
  const count = useCart().reduce((n, l) => n + l.qty, 0);
  return (
    <Link href="/store/cart" className="cart-btn" aria-label={count ? `Cart, ${count} items` : "Cart"}>
      <ShoppingBag size={20} aria-hidden />
      {count > 0 && <span>{count}</span>}
    </Link>
  );
}
