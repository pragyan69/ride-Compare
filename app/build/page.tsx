import type { Metadata } from "next";
import { pieces, ridingStyles, type Piece, type RidingStyle } from "@/lib/kit";
import { Builder, type BuilderStart } from "./builder";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Build a riding kit within your budget | RideCompare",
  description: "Set a budget and riding style, and get a helmet, jacket, gloves, pants and boots that fit it, priced from Indian gear stores.",
};

/** Start from ?budget=&style=&pieces= so kits can be shared and the home page can hand off. */
function startFrom(q: Record<string, string | string[] | undefined>): BuilderStart {
  const one = (k: string) => (Array.isArray(q[k]) ? q[k][0] : q[k]) || "";
  const budget = Number(one("budget"));
  const style = ridingStyles.find((s) => s.id === one("style"))?.id ?? "city";
  const wanted = one("pieces")
    .split(",")
    .filter((p): p is Piece => (pieces as readonly string[]).includes(p));
  return {
    budget: budget >= 500 && budget <= 1_000_000 ? Math.round(budget) : 20000,
    style: style as RidingStyle,
    pieces: wanted.length ? wanted : ["Helmet", "Jacket", "Gloves"],
  };
}

export default async function BuildPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <main className="wrap">
      <section className={`hero ${styles.hero}`}>
        <h1>Build your riding kit</h1>
        <p>Set a budget and how you ride. We pick the gear from what&apos;s in stock tonight.</p>
      </section>
      <Builder start={startFrom(await searchParams)} />
    </main>
  );
}
