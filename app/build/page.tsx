import type { Metadata } from "next";
import { Builder } from "./builder";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Build a riding kit within your budget | RideCompare",
  description: "Set a budget and riding style, and get a helmet, jacket, gloves, pants and boots that fit it, priced from Indian gear stores.",
};

export default function BuildPage() {
  return (
    <main className="wrap">
      <section className={`hero ${styles.hero}`}>
        <h1>Build your riding kit</h1>
        <p>Tell us your budget and how you ride. We split it across the gear you need and pick from what stores have in stock.</p>
      </section>
      <Builder />
    </main>
  );
}
