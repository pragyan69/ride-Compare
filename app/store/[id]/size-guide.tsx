"use client";
import { useState } from "react";
import { ChevronRight, Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import styles from "../store.module.css";

type Guide = { measure: string; head: [string, string]; rows: [string, string][] };

// Typical riding-gear charts. Brands differ a little, which the guide says.
const GUIDES: Record<string, Guide> = {
  Helmets: {
    measure: "Wrap a soft tape around your head about 2 cm above your eyebrows and ears, over the widest part at the back.",
    head: ["Size", "Head (cm)"],
    rows: [["XS", "53 to 54"], ["S", "55 to 56"], ["M", "57 to 58"], ["L", "59 to 60"], ["XL", "61 to 62"], ["2XL", "63 to 64"]],
  },
  Jackets: {
    measure: "Measure around the fullest part of your chest, under the arms, with the tape level and snug but not tight.",
    head: ["Size", "Chest (cm)"],
    rows: [["S", "92 to 96"], ["M", "96 to 100"], ["L", "100 to 104"], ["XL", "104 to 108"], ["2XL", "108 to 112"], ["3XL", "112 to 116"]],
  },
  Pants: {
    measure: "Measure around your natural waist, then the inside leg from crotch to ankle.",
    head: ["Size", "Waist (cm)"],
    rows: [["S", "76 to 80"], ["M", "80 to 86"], ["L", "86 to 92"], ["XL", "92 to 98"], ["2XL", "98 to 104"], ["3XL", "104 to 110"]],
  },
  Gloves: {
    measure: "Measure around your riding hand across the knuckles, thumb excluded.",
    head: ["Size", "Hand (cm)"],
    rows: [["S", "19 to 20.5"], ["M", "20.5 to 22"], ["L", "22 to 23.5"], ["XL", "23.5 to 25"], ["2XL", "25 to 26.5"]],
  },
  Boots: {
    measure: "Stand on paper, mark heel and longest toe, and measure the gap. Riding boots run snug, so go up if you're between sizes.",
    head: ["EU", "UK"],
    rows: [["39", "6"], ["40", "6.5"], ["41", "7.5"], ["42", "8"], ["43", "9"], ["44", "9.5"], ["45", "10.5"], ["46", "11"], ["47", "12"]],
  },
};

/** "Size guide" link that opens a typical chart for the category, right on the page. */
export function SizeGuide({ category, brand }: { category: string; brand: string }) {
  const [open, setOpen] = useState(false);
  const g = GUIDES[category];
  return (
    <>
      <button type="button" className={styles.sizeLink} onClick={() => setOpen(true)}>
        Size guide <ChevronRight size={16} aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={styles.guide}>
          <DialogTitle className={styles.guideTitle}>
            <Ruler size={22} aria-hidden /> Size guide{g ? `: ${category.toLowerCase()}` : ""}
          </DialogTitle>
          <DialogDescription className={styles.guideText}>
            {g ? g.measure : "Measure the body part the gear covers with a soft tape, snug but not tight, and pick the size whose range you fall in."}
          </DialogDescription>
          {g && (
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>{g.head[0]}</th>
                  <th>{g.head[1]}</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map(([a, b]) => (
                  <tr key={a}>
                    <td>{a}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className={styles.guideNote}>
            This is a typical chart. {brand} sizing can differ a little, so if you&apos;re between two sizes, pick the larger one.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
