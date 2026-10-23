"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useSpring } from "motion/react";
import styles from "./fx.module.css";

/** A circuit drawn down the left gutter: hairpins, an esses section and a long straight to the flag. */
const TRACK =
  "M30 0 V120 C30 160 10 170 10 200 C10 240 50 250 50 290 C50 330 10 340 10 380 V470 C10 520 50 520 50 560 V640 C50 690 10 690 10 740 C10 790 50 800 50 850 V1000";

/** Aceternity-style tracing beam, reshaped as a race line. Scrolling draws it; a bike dot rides the tip.
 *  The lap ends (flag) as the footer arrives, and the line leaves before it overlaps the footer. */
export function RaceLine() {
  const raw = useMotionValue(0);
  const progress = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });
  const path = useRef<SVGPathElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [dot, setDot] = useState({ x: 30, y: 0 });
  // Bright neon over dark sections, a darker green over the off-white page so it keeps its contrast.
  const [onDark, setOnDark] = useState(false);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const footer = document.querySelector("footer");
      const line = box.current?.getBoundingClientRect();
      const lineBottom = line ? line.bottom : window.innerHeight;
      const footerTop = footer ? footer.getBoundingClientRect().top : Infinity;
      // Finish the lap exactly when the footer's top reaches the bottom of the line.
      const end = Math.max(1, footerTop + window.scrollY - lineBottom);
      raw.set(Math.min(1, window.scrollY / end));
      setShown(window.scrollY > 120 && footerTop > lineBottom + 24);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [raw]);

  useMotionValueEvent(progress, "change", (v) => {
    const el = path.current;
    if (!el) return;
    const p = el.getPointAtLength(el.getTotalLength() * v);
    setDot({ x: p.x, y: p.y });
    const r = box.current?.getBoundingClientRect();
    if (r) setOnDark(!!document.elementFromPoint(r.left + r.width / 2, r.top + (r.height * p.y) / 1000)?.closest("[data-dark]"));
  });

  return (
    <div ref={box} className={styles.raceLine} data-on-dark={onDark || undefined} data-shown={shown || undefined} aria-hidden>
      <div className={styles.raceTrack}>
        <svg viewBox="0 0 60 1000" preserveAspectRatio="none">
          <path d={TRACK} className={styles.trackBed} />
          <path d={TRACK} className={styles.trackKerb} />
          <motion.path ref={path} d={TRACK} className={styles.trackLit} style={{ pathLength: progress }} />
        </svg>
        <span className={styles.rider} style={{ top: `${dot.y / 10}%`, left: `${(dot.x / 60) * 100}%` }} />
      </div>
      <span className={styles.flag} />
    </div>
  );
}
