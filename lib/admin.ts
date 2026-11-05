import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "gc_admin";

/** The cookie holds a keyed hash of ADMIN_TOKEN, never the token itself. */
function expected() {
  const token = process.env.ADMIN_TOKEN;
  return token ? createHmac("sha256", token).update("gearcircle-admin").digest("hex") : undefined;
}

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function isAdmin() {
  const want = expected();
  const got = (await cookies()).get(COOKIE)?.value;
  return Boolean(want && got && same(got, want));
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function logIn(token: string) {
  const real = process.env.ADMIN_TOKEN;
  const want = expected();
  if (!real || !want || !same(token, real)) return false;
  (await cookies()).set(COOKIE, want, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return true;
}

export async function logOut() {
  (await cookies()).delete(COOKIE);
}
