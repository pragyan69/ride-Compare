import { money } from "@/lib/catalog";
import styles from "./page.module.css";

export type HistoryPoint = { storeId: string; price: number; mrp: number | null; inStock: boolean | null; at: number };

const colors = ["#178a03", "#c0562b", "#2f5fb3", "#8a5a00", "#7b3fa0", "#2b7f86"];
const W = 1000;
const H = 280;
const day = 24 * 60 * 60 * 1000;

export const dateLabel = (t: number) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(t));

/** Step-line chart of every store's price from its first recorded change to `now`. Server-rendered SVG. */
export function PriceChart({ points, storeName, now }: { points: HistoryPoint[]; storeName: (id: string) => string; now: number }) {
  const t0 = Math.min(...points.map((p) => p.at));
  const t1 = Math.max(now, t0 + day);
  const prices = points.map((p) => p.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const pad = hi > lo ? (hi - lo) * 0.12 : lo * 0.05 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;
  const x = (t: number) => ((t - t0) / (t1 - t0)) * W;
  const y = (v: number) => H - ((v - yMin) / (yMax - yMin)) * H;

  const byStore = new Map<string, HistoryPoint[]>();
  for (const p of points) byStore.set(p.storeId, [...(byStore.get(p.storeId) ?? []), p]);
  const series = [...byStore].map(([storeId, ps], i) => ({ storeId, color: colors[i % colors.length], ps: ps.sort((a, b) => a.at - b.at) }));

  return (
    <figure className={styles.chart}>
      <div className={styles.plot}>
        <span className={styles.yLabel} style={{ top: `${(y(hi) / H) * 100}%` }}>{money(hi)}</span>
        {hi > lo && <span className={styles.yLabel} style={{ top: `${(y(lo) / H) * 100}%` }}>{money(lo)}</span>}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Price history from ${dateLabel(t0)} to today, between ${money(lo)} and ${money(hi)}`}>
          <line x1={0} x2={W} y1={y(hi)} y2={y(hi)} className={styles.gridLine} />
          {hi > lo && <line x1={0} x2={W} y1={y(lo)} y2={y(lo)} className={styles.gridLine} />}
          {series.map((s) =>
            s.ps.map((p, i) => {
              const next = s.ps[i + 1];
              const xEnd = x(next ? next.at : t1);
              return (
                <g key={`${s.storeId}-${p.at}`} stroke={s.color}>
                  <line x1={x(p.at)} x2={xEnd} y1={y(p.price)} y2={y(p.price)} className={p.inStock === false ? styles.outLine : styles.stepLine} />
                  {next && <line x1={xEnd} x2={xEnd} y1={y(p.price)} y2={y(next.price)} className={styles.stepLine} />}
                </g>
              );
            }),
          )}
        </svg>
      </div>
      <div className={styles.xAxis}>
        <span>{dateLabel(t0)}</span>
        <span>Today</span>
      </div>
      <figcaption className={styles.legend}>
        {series.map((s) => {
          const last = s.ps[s.ps.length - 1];
          return (
            <span key={s.storeId}>
              <i style={{ background: s.color }} aria-hidden />
              {storeName(s.storeId)} <b>{money(last.price)}</b>
            </span>
          );
        })}
        {points.some((p) => p.inStock === false) && (
          <span>
            <i className={styles.dashKey} aria-hidden />
            Out of stock
          </span>
        )}
      </figcaption>
    </figure>
  );
}
