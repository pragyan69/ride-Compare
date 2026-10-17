"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";

const links = [
  { href: "/", label: "Gear" },
  { href: "/build", label: "Build a kit" },
  { href: "/deals", label: "Deals" },
  { href: "/bikes", label: "By bike" },
  { href: "/brands", label: "Brands" },
];

export function SiteHeader() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/product") : path.startsWith(href));
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link href="/" className="logo-button" aria-label="RideCompare home">
          <Logo />
        </Link>
        <nav aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
