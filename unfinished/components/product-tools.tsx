"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";

const RECENT_KEY = "rc-recent";

export function ShareButton({ title }: { title: string }) {
  const [note, setNote] = useState("");
  return (
    <>
      <button type="button" className="btn" onClick={async () => {
        const url = location.href;
        try {
          if (navigator.share) { await navigator.share({ title, url }); return; }
          await navigator.clipboard.writeText(url); setNote("Link copied");
        } catch { setNote("Copy this link: " + url); }
        setTimeout(() => setNote(""), 2500);
      }}>↗ Share</button>
      {note && <div className="toast" role="status">{note}</div>}
    </>
  );
}

type Mini = { id: string; name: string; brand: string; image: string; min_price: number | null };

function readRecent() { try { return localStorage.getItem(RECENT_KEY) || "[]"; } catch { return "[]"; } }
function subscribeRecent(cb: () => void) { window.addEventListener("rc-recent-change", cb); return () => window.removeEventListener("rc-recent-change", cb); }

/** Records the current product and shows the viewer's recent history. */
export function RecentlyViewed({ current }: { current: Mini }) {
  const raw = useSyncExternalStore(subscribeRecent, readRecent, () => "[]");
  const items = useMemo(() => { try { const list: Mini[] = JSON.parse(raw); return list.filter((x) => x && x.id !== current.id).slice(0, 8); } catch { return []; } }, [raw, current.id]);
  useEffect(() => {
    try {
      const list: Mini[] = JSON.parse(readRecent());
      localStorage.setItem(RECENT_KEY, JSON.stringify([current, ...list.filter((x) => x && x.id !== current.id)].slice(0, 12)));
      window.dispatchEvent(new Event("rc-recent-change"));
    } catch { /* storage unavailable */ }
  }, [current]);
  if (!items.length) return null;
  return (
    <section className="section">
      <div className="section-head"><h2>Recently viewed</h2></div>
      <div className="grid">
        {items.map((p) => (
          <Link key={p.id} href={`/product/${p.id}`} className="card">
            <span className="card-media">{p.image ? <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="no-image">No image</span>}</span>
            <span className="card-body"><span className="card-brand">{p.brand}</span><span className="card-name">{p.name}</span><span className="card-price"><strong>{p.min_price !== null ? "₹" + Math.round(p.min_price).toLocaleString("en-IN") : ""}</strong></span></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
