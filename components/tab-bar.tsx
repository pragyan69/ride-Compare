"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingBag, HardHat, Bike } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/store", label: "Shop", icon: Search },
  { href: "/store/cart", label: "Cart", icon: ShoppingBag, main: true },
  { href: "/store?category=Helmets", label: "Helmets", icon: HardHat },
  { href: "/store?category=Bike%20Accessories", label: "Parts", icon: Bike },
];

/** Phone-only bottom navigation; the cart sits in the middle. */
export function TabBar() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : href === "/store/cart" ? path === href : href === "/store" && path.startsWith("/store") && path !== "/store/cart");
  return (
    <nav className="tab-bar" aria-label="Quick navigation">
      {tabs.map(({ href, label, icon: Icon, main }) => (
        <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={main ? "tab-main" : undefined}>
          <span className="tab-icon">
            <Icon size={main ? 24 : 21} strokeWidth={main ? 2.6 : 2} aria-hidden />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
