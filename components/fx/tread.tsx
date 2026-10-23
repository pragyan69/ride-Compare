import styles from "./fx.module.css";

/** A strip of tyre tread between sections. Pure CSS, no JS. */
export function Tread({ tone = "light" }: { tone?: "light" | "dark" }) {
  return <div className={styles.tread} data-tone={tone} aria-hidden />;
}
