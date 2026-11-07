"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Zap, Menu, HardHat, Shirt, Hand, Footprints, Backpack, Wrench, Bike, ShoppingBag, type LucideIcon } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "./ui/sheet";
import { Logo } from "./logo";
import { Button } from "./ui/button";
import { DeliveryPin } from "./delivery-pin";
import { sized } from "@/lib/image";
import { SupportMenu } from "./support-menu";
import { MegaNav, type NavItem } from "./mega-menu";
import type { Menu as MenuData } from "@/lib/menu";

const nav: NavItem[] = [
  { href: "/store", label: "Shop all" },
  { href: "/store?brands", label: "Brands", brands: true },
  { href: "/store?category=Helmets", label: "Helmets", category: "Helmets" },
  { href: "/store?category=Jackets", label: "Jackets", category: "Jackets" },
  { href: "/store?category=Boots", label: "Boots", category: "Boots" },
  { href: "/store?category=Pants", label: "Pants", category: "Pants" },
  { href: "/store?category=Gloves", label: "Gloves", category: "Gloves" },
  { href: "/store?category=Bike%20Accessories", label: "Bike parts", category: "Bike Accessories" },
  { href: "/store?category=Maintenance%20%26%20Parts", label: "Maintenance", category: "Maintenance & Parts" },
  { href: "/store?category=Luggage", label: "Luggage", category: "Luggage" },
  { href: "/store?category=Electronics", label: "Electronics", category: "Electronics" },
];
// Phone-only category strip under the search bar.
const strip: { href: string; label: string; icon: LucideIcon; category?: string }[] = [
  { href: "/store", label: "Shop all", icon: ShoppingBag },
  { href: "/store?category=Helmets", label: "Helmets", icon: HardHat, category: "Helmets" },
  { href: "/store?category=Jackets", label: "Jackets", icon: Shirt, category: "Jackets" },
  { href: "/store?category=Gloves", label: "Gloves", icon: Hand, category: "Gloves" },
  { href: "/store?category=Boots", label: "Boots", icon: Footprints, category: "Boots" },
  { href: "/store?category=Pants", label: "Pants", icon: Shirt, category: "Pants" },
  { href: "/store?category=Bike%20Accessories", label: "Bike parts", icon: Bike, category: "Bike Accessories" },
  { href: "/store?category=Maintenance%20%26%20Parts", label: "Maintenance", icon: Wrench, category: "Maintenance & Parts" },
  { href: "/store?category=Luggage", label: "Luggage", icon: Backpack, category: "Luggage" },
  { href: "/store?category=Electronics", label: "Electronics", icon: Zap, category: "Electronics" },
];
const hints = ["Himalayan 450 crash guard", "AGV K1 S", "waterproof riding boots", "Akrapovic exhaust", "chain lube"];

export function SiteHeader({ menu: menuData }: { menu: MenuData | null }) {
  const [hint, setHint] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  // Aceternity "resizable navbar": past the first 80px the bar shrinks into a floating glass pill.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 80);
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
            <DeliveryPin />
          </div>
          <form action="/store" role="search" className="header-search">
            <Search size={18} aria-hidden />
            <input name="q" aria-label="Search motorcycle gear" placeholder={`Search for ${hints[hint]}`} />
          </form>
          <SupportMenu />
          <CartButton />
          <Button asChild size="lg" className="header-cta">
            <Link href="/store">Shop now</Link>
          </Button>
        </div>
      </header>
      <MegaNav nav={nav} menu={menuData} />
      <nav className="m-cats" aria-label="Shop by category">
        {strip.map(({ href, label, icon: Icon, category }) => {
          const thumb = category ? menuData?.categories[category]?.thumb : null;
          return (
            <Link key={href} href={href}>
              <span className="m-cat-icon" data-photo={thumb ? "" : undefined}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {thumb ? <img src={sized(thumb, 160)} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Icon size={22} strokeWidth={1.8} aria-hidden />}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="m-menu">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Browse GearCircle sections</SheetDescription>
          <Link href="/" className="m-menu-logo" onClick={() => setMenu(false)}>
            <Logo />
          </Link>
          <ul>
            {nav.filter((l) => !l.brands).map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setMenu(false)}>
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
