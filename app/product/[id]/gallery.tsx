"use client";
import { useRef, useState } from "react";
import { ProductImage } from "@/components/product-card";
import styles from "./page.module.css";

/** Swipeable photo strip; thumbnails jump to a photo on wider screens. */
export function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  if (photos.length < 2) {
    return (
      <div className={styles.image}>
        <ProductImage p={{ image: photos[0] ?? "" }} />
      </div>
    );
  }
  const show = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className={styles.gallery}>
      <div
        ref={track}
        className={styles.track}
        aria-label={`${name} photos`}
        onScroll={(e) => setCurrent(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {photos.map((src, i) => (
          <div key={src} className={styles.image} aria-label={`Photo ${i + 1} of ${photos.length}`}>
            <ProductImage p={{ image: src }} />
          </div>
        ))}
      </div>
      <span className={styles.count}>
        {current + 1} / {photos.length}
      </span>
      <div className={styles.thumbs}>
        {photos.map((src, i) => (
          <button key={src} aria-label={`Show photo ${i + 1}`} aria-current={i === current} onClick={() => show(i)}>
            <ProductImage p={{ image: src }} />
          </button>
        ))}
      </div>
    </div>
  );
}
