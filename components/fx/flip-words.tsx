"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import styles from "./fx.module.css";

/** Aceternity Flip Words: cycles through words with a blur-and-lift swap. */
export function FlipWords({ words, every = 2600 }: { words: [string, ...string[]]; every?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % words.length), every);
    return () => clearInterval(t);
  }, [words.length, every]);
  return (
    <span className={styles.flip}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[i]}
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -24, filter: "blur(6px)", position: "absolute" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
