"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, Zap, Bike } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/gear", label: "Gear", icon: Search },
  { href: "/build", label: "Build kit", icon: Plus, main: true },
  { href: "/deals", label: "Deals", icon: Zap },
  { href: "/bikes", label: "Bikes", icon: Bike },
];

/** Phone-only bottom navigation; the kit builder sits in the middle. */
export function TabBar() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href) || (href === "/gear" && path.startsWith("/product")));
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
