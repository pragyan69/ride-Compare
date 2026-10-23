"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/gear", "All gear"],
  ["/build", "Build a kit"],
  ["/fit", "Fit check"],
  ["/deals", "Deals"],
  ["/bikes", "Shop by bike"],
  ["/brands", "Brands"],
] as const;

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <nav className={mobile ? "mobile-nav" : "nav"} aria-label={mobile ? "Sections" : "Main"}>
      {LINKS.map(([href, label]) => {
        const base = href.split("?")[0];
        const current = base !== "/gear" ? path === base : path === "/gear" && href === "/gear";
        return <Link key={href} href={href} aria-current={current ? "page" : undefined}>{label}</Link>;
      })}
    </nav>
  );
}
