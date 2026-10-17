"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import styles from "./bikes.module.css";

export type BikeGroup = { make: string; bikes: { slug: string; model: string; count: number }[] };

export function BikeList({ groups }: { groups: BikeGroup[] }) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();
  const shown = groups
    .map((g) => ({ ...g, bikes: g.bikes.filter((b) => !q || `${g.make} ${b.model}`.toLowerCase().includes(q)) }))
    .filter((g) => g.bikes.length);

  return (
    <>
      <section className="hero hero-small">
        <h1>Shop by your bike</h1>
        <p>Crash guards, racks, exhausts and parts that name your motorcycle, with prices from every store we cover.</p>
        <div className="search">
          <Search size={20} aria-hidden />
          <input aria-label="Search bikes" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a bike, like Duke 390" />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")}>
              <X size={18} />
            </button>
          )}
        </div>
      </section>

      {shown.map((g) => (
        <section key={g.make} className={styles.make}>
          <h2>{g.make}</h2>
          <ul className={styles.list}>
            {g.bikes.map((b) => (
              <li key={b.slug}>
                <Link href={`/bikes/${b.slug}`}>
                  <span>{b.model}</span>
                  <small>{b.count.toLocaleString("en-IN")}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!shown.length && (
        <div className="empty">
          <h2>No bike by that name</h2>
          <p>Try the model name alone, like Classic or Duke.</p>
        </div>
      )}
    </>
  );
}
