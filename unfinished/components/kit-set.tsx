import Link from "next/link";
import { money } from "@/lib/rules";
import { PIECE_LABEL, type KitSet } from "@/lib/kit";
import { CompareSetButton } from "./compare";

/** One complete set: a row of pieces from different brands with the total. */
export function KitSetCard({ set, anchorId, showBudget = true }: { set: KitSet; anchorId?: string; showBudget?: boolean }) {
  const saving = Math.max(0, Math.round(set.mrp - set.total));
  const left = Math.round(set.budget - set.total);
  return (
    <article className="kitset">
      <header className="kitset-head">
        <div><h3>{set.label}</h3><p>{set.reason}</p></div>
        <div className="kitset-total">
          <strong>{money(set.total)}</strong>
          <span className="chip-row">
            {showBudget && set.over > 0 && <span className="badge badge-deal">{money(set.over)} over budget</span>}
            {showBudget && set.over === 0 && left > 0 && <span className="badge">{money(left)} left</span>}
            {saving > 0 && <span className="badge badge-muted">Saves {money(saving)} vs MRP</span>}
          </span>
        </div>
      </header>
      <div className="kitset-items">
        {set.items.map((i) => {
          const p = i.product;
          const anchor = p.id === anchorId;
          return (
            <div key={p.id} className={`kitset-item${anchor ? " anchor" : ""}`}>
              <span className="kitset-piece">{PIECE_LABEL[i.piece]}{anchor ? " · this item" : ""}</span>
              <Link href={`/product/${p.id}`} className="kitset-media" aria-label={`View ${p.name}`}>{p.image ? <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="no-image">No image</span>}</Link>
              <span className="card-brand">{p.brand}</span>
              <Link href={`/product/${p.id}`} className="kitset-name" title={p.name}>{p.name}</Link>
              <span className="kitset-price"><strong>{money(p.min_price || 0)}</strong><small>{p.store_count > 1 ? `lowest of ${p.store_count} stores` : `at ${p.best_store_name}`}</small></span>
              {!anchor && <Link className="kitset-swap" href={`/gear?category=${encodeURIComponent(i.piece)}&maxPrice=${Math.round(Math.max(i.target * 1.3, (p.min_price || 0) * 1.2))}&sort=featured`}>Swap for another {PIECE_LABEL[i.piece].toLowerCase()} →</Link>}
            </div>
          );
        })}
      </div>
      <footer className="kitset-foot">
        <span>{set.brands} brands · {set.items.length} pieces · each at its lowest listed price</span>
        <CompareSetButton ids={set.items.map((i) => i.product.id)} />
      </footer>
    </article>
  );
}
