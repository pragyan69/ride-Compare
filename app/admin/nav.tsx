"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className={styles.nav} aria-label="Admin">
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={(l.href === "/admin" ? path === l.href : path.startsWith(l.href)) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
