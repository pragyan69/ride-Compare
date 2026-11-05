import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { LoginForm } from "./form";
import styles from "../admin.module.css";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className={styles.login}>
      <div className={styles.loginBox}>
        <span className={styles.brand}>
          Gear<b>Circle</b> admin
        </span>
        <p>Enter the admin token (ADMIN_TOKEN in the server&apos;s environment).</p>
        <LoginForm />
      </div>
    </div>
  );
}
