import { money } from "@/lib/rules";

type Point = { store_id: string; price: number; seen_at: number };

/** Server-rendered price history: one line per store, lowest point marked. */
export function PriceChart({ history, stores }: { history: Point[]; stores: Record<string, string> }) {
  if (history.length < 2) return null;
  const byStore = new Map<string, Point[]>();
  for (const h of history) { const list = byStore.get(h.store_id) || []; list.push(h); byStore.set(h.store_id, list); }
  const times = history.map((h) => h.seen_at), prices = history.map((h) => h.price);
  const t0 = Math.min(...times), t1 = Math.max(Math.max(...times), t0 + 1), p0 = Math.min(...prices), p1 = Math.max(Math.max(...prices), p0 + 1);
  const W = 600, H = 120, pad = 8;
  const x = (t: number) => pad + ((t - t0) / (t1 - t0)) * (W - pad * 2);
  const y = (p: number) => H - pad - ((p - p0) / (p1 - p0)) * (H - pad * 2);
  const colors = ["#134d3c", "#1d4f91", "#8a4a0c", "#6b3fa0", "#9aa79e"];
  const lines = [...byStore.entries()].map(([store, pts], i) => {
    const sorted = pts.sort((a, b) => a.seen_at - b.seen_at);
    const last = sorted[sorted.length - 1];
    const d = sorted.map((p, j) => `${j ? "L" : "M"}${x(p.seen_at).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ") + ` L${x(t1).toFixed(1)},${y(last.price).toFixed(1)}`;
    return { store, d, color: colors[i % colors.length] };
  });
  const lowest = history.reduce((a, b) => (b.price < a.price ? b : a));
  const span = Math.max(1, Math.round((t1 - t0) / 86400000));
  return (
    <div className="history">
      <h3>Price history</h3>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Price history over ${span} days, lowest ${money(lowest.price)}`}>
        {lines.map((l) => <path key={l.store} d={l.d} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" />)}
        <circle cx={x(lowest.seen_at)} cy={y(lowest.price)} r={4} fill="#d7ed93" stroke="#134d3c" strokeWidth={2} />
      </svg>
      <p>{lines.map((l) => <span key={l.store} style={{ marginRight: 14 }}><span style={{ display: "inline-block", width: 10, height: 10, background: l.color, borderRadius: 2, marginRight: 5 }} />{stores[l.store] || l.store}</span>)}
        Lowest seen {money(lowest.price)} · range {money(p0)} to {money(p1)} over {span} {span === 1 ? "day" : "days"}.</p>
    </div>
  );
}
