"use client";
import { useRef, useState } from "react";
import { ProductImage } from "@/components/product-card";
import styles from "./page.module.css";

/** Tap or click to zoom in, then drag (or move the mouse) to look around; tap again to zoom out. */
function Zoomable({ src, label, zoomed, onZoom }: { src: string; label?: string; zoomed: boolean; onZoom: (z: boolean) => void }) {
  const [origin, setOrigin] = useState("50% 50%");
  const moved = useRef(false);
  const touch = useRef(false);
  const aim = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <div
      className={styles.image}
      data-zoomed={zoomed}
      aria-label={label}
      style={{ "--origin": origin } as React.CSSProperties}
      onPointerDown={(e) => {
        moved.current = false;
        touch.current = e.pointerType !== "mouse";
        if (zoomed) e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!zoomed) return;
        moved.current = true;
        aim(e);
      }}
      onClick={(e) => {
        // A finger drag pans the zoomed photo; only a tap zooms back out.
        if (zoomed && moved.current && touch.current) return;
        if (!zoomed) aim(e);
        onZoom(!zoomed);
      }}
    >
      <ProductImage p={{ image: src }} width={1400} />
    </div>
  );
}

/** Swipeable photo strip; thumbnails jump to a photo on wider screens. */
export function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  if (photos.length < 2) {
    return <Zoomable src={photos[0] ?? ""} zoomed={zoomed} onZoom={setZoomed} />;
  }
  const show = (i: number) => {
    setZoomed(false);
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className={styles.gallery}>
      <div
        ref={track}
        className={styles.track}
        data-zoomed={zoomed}
        aria-label={`${name} photos`}
        onScroll={(e) => setCurrent(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {photos.map((src, i) => (
          <Zoomable key={src} src={src} label={`Photo ${i + 1} of ${photos.length}`} zoomed={zoomed && i === current} onZoom={setZoomed} />
        ))}
      </div>
      <span className={styles.count}>
        {current + 1} / {photos.length}
      </span>
      <div className={styles.thumbs}>
        {photos.map((src, i) => (
          <button key={src} aria-label={`Show photo ${i + 1}`} aria-current={i === current} onClick={() => show(i)}>
            <ProductImage p={{ image: src }} width={160} />
          </button>
        ))}
      </div>
    </div>
  );
}
