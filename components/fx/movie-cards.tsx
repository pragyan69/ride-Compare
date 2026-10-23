"use client";
import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./fx.module.css";

export type MovieKit = { code: string; title: string; cover: string; total: number; premium: number | null };

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Aceternity Apple Cards Carousel, in plain CSS scroll-snap: tall reel covers that open the kit page. */
export function MovieCards({ kits }: { kits: MovieKit[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const nudge = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className={styles.movies}>
      <div ref={rail} className={styles.movieRail}>
        {kits.map((k, i) => (
          <Link key={k.code} href={`/kit/${k.code.toLowerCase()}`} className={styles.movieCard}>
            <Image src={k.cover} alt="" fill sizes="(max-width: 760px) 60vw, 260px" priority={i < 2} />
            <span className={styles.movieShade} />
            <span className={styles.movieText}>
              <small>Comment {k.code}</small>
              <strong>{k.title}</strong>
              <span>
                {inr(k.total)}
                {k.premium && k.premium > k.total && <s>{inr(k.premium)}</s>}
              </span>
            </span>
          </Link>
        ))}
      </div>
      <div className={styles.movieNav}>
        <button type="button" aria-label="Previous looks" onClick={() => nudge(-1)}>
          <ChevronLeft size={20} />
        </button>
        <button type="button" aria-label="More looks" onClick={() => nudge(1)}>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
