"use client";
import { usePathname } from "next/navigation";

/** Shop chrome, popups and ad pixels stay off the admin pages. */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith("/admin") ? null : children;
}
