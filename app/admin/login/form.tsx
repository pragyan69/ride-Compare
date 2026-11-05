"use client";
import { useActionState } from "react";
import { login } from "../actions";
import styles from "../admin.module.css";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action}>
      <input name="token" type="password" autoComplete="current-password" placeholder="Admin token" aria-label="Admin token" required autoFocus />
      <button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Log in"}
      </button>
      {error && <span className={styles.err} role="alert">{error}</span>}
    </form>
  );
}
