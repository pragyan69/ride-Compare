import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { logout } from "./actions";
import { AdminNav } from "./nav";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Admin | GearCircle", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) return children; // the login page; every other admin page redirects there
  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <span className={styles.brand}>
          Gear<b>Circle</b>
          <small>Admin</small>
        </span>
        <AdminNav />
        <div className={styles.barEnd}>
          <Link href="/store" target="_blank">
            View store ↗
          </Link>
          <form action={logout}>
            <button type="submit">Log out</button>
          </form>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
