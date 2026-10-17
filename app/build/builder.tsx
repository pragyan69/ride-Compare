"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/product-card";
import { money } from "@/lib/catalog";
import { kitVariants, pieces, ridingStyles, type BuildResult, type KitItem, type KitPick, type KitVariant, type Piece, type RidingStyle } from "@/lib/kit";
import styles from "./page.module.css";

const presets = [10000, 20000, 40000, 75000];
const pieceNoun: Record<Piece, string> = { Helmet: "helmet", Jacket: "jacket", Gloves: "pair of gloves", Pants: "pair of pants", Boots: "pair of boots" };
const href = (item: KitItem) => `/product/${encodeURIComponent(item.id)}`;
const listOf = (words: string[]) => (words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`);

type Swaps = Partial<Record<KitVariant, Partial<Record<Piece, KitItem>>>>;
type State = { status: "loading" } | { status: "error"; message: string } | { status: "done"; result: BuildResult };

export function Builder() {
  const [budget, setBudget] = useState(20000);
  const [custom, setCustom] = useState("");
  const [style, setStyle] = useState<RidingStyle>("city");
  const [wanted, setWanted] = useState<Piece[]>(["Helmet", "Jacket", "Gloves"]);
  const [state, setState] = useState<State>({ status: "loading" });
  const [variant, setVariant] = useState<KitVariant>("balance");
  const [swaps, setSwaps] = useState<Swaps>({});
  const [attempt, setAttempt] = useState(0);

  const customValue = Number(custom.replace(/\D/g, ""));
  const customError = custom && customValue < 500 ? "Enter at least ₹500." : custom && customValue > 1_000_000 ? "Enter less than ₹10,00,000." : "";

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setState({ status: "loading" });
      try {
        const r = await fetch("/api/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budget, style, pieces: wanted }),
          signal: ctrl.signal,
        });
        const d = (await r.json()) as BuildResult & { error?: string };
        if (!r.ok) throw new Error(d.error || "We could not build a kit. Try again.");
        setSwaps({});
        setState({ status: "done", result: d });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setState({ status: "error", message: e instanceof Error ? e.message : "We could not build a kit. Try again." });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [budget, style, wanted, attempt]);

  function pickPreset(v: number) {
    setCustom("");
    setBudget(v);
  }
  function typeCustom(text: string) {
    setCustom(text);
    const v = Number(text.replace(/\D/g, ""));
    if (v >= 500 && v <= 1_000_000) setBudget(v);
  }
  function togglePiece(p: Piece) {
    setWanted((w) => (w.includes(p) ? (w.length > 1 ? w.filter((x) => x !== p) : w) : pieces.filter((x) => x === p || w.includes(x))));
  }

  const result = state.status === "done" ? state.result : undefined;
  const kit = result?.kits.find((k) => k.id === variant);
  const current = (k: KitVariant, pick: KitPick) => swaps[k]?.[pick.piece] ?? pick.item;
  const totalOf = (k: KitVariant) => result?.kits.find((x) => x.id === k)?.picks.reduce((s, p) => s + current(k, p).price, 0) ?? 0;
  const total = totalOf(variant);
  const left = budget - total;
  const overPieces = kit?.picks.filter((p) => p.overSlice && !swaps[variant]?.[p.piece]).map((p) => p.piece.toLowerCase()) ?? [];

  return (
    <div className={styles.layout}>
      <form className={styles.controls} onSubmit={(e) => e.preventDefault()} aria-label="Kit options">
        <fieldset className={styles.group}>
          <legend>Total budget</legend>
          <div className={styles.chips}>
            {presets.map((v) => (
              <button type="button" key={v} aria-pressed={!custom && budget === v} onClick={() => pickPreset(v)}>
                {money(v)}
              </button>
            ))}
          </div>
          <label className={`budget-input ${styles.custom}`}>
            <span aria-hidden>₹</span>
            <input inputMode="numeric" placeholder="Or type an amount" aria-label="Custom budget in rupees" value={custom} onChange={(e) => typeCustom(e.target.value)} aria-invalid={!!customError} />
          </label>
          {customError && <p className={styles.fieldError}>{customError}</p>}
        </fieldset>

        <fieldset className={styles.group}>
          <legend>How you ride</legend>
          <div className={styles.chips}>
            {ridingStyles.map((s) => (
              <button type="button" key={s.id} aria-pressed={style === s.id} onClick={() => setStyle(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Gear you need</legend>
          <div className={styles.chips}>
            {pieces.map((p) => (
              <button type="button" key={p} aria-pressed={wanted.includes(p)} onClick={() => togglePiece(p)} disabled={wanted.length === 1 && wanted.includes(p)}>
                {p}
              </button>
            ))}
          </div>
        </fieldset>
      </form>

      <section className={styles.results} aria-busy={state.status === "loading"} aria-live="polite">
        {state.status === "error" && (
          <div role="alert" className="notice">
            {state.message} <button onClick={() => setAttempt((a) => a + 1)}>Try again</button>
          </div>
        )}

        {state.status === "loading" && !result && <Skeleton />}

        {result?.tooLow && (
          <div className="empty">
            <h2>{money(budget)} is not enough for this kit yet</h2>
            <p>
              {result.cheapest.map((c) => `The cheapest ${pieceNoun[c.piece]} we have is ${money(c.price)}.`).join(" ")}{" "}
              {result.cheapest.length > 1 && `Together that is ${money(result.minimum)}.`}
            </p>
            <button className="secondary-button" onClick={() => pickPreset(Math.ceil(result.minimum / 500) * 500)}>
              Use {money(Math.ceil(result.minimum / 500) * 500)}
            </button>
          </div>
        )}

        {result && !result.tooLow && kit && (
          <div className={state.status === "loading" ? styles.stale : undefined}>
            <div className={styles.variants} role="tablist" aria-label="Kit options">
              {kitVariants.map((v) => (
                <button key={v.id} role="tab" aria-selected={variant === v.id} onClick={() => setVariant(v.id)}>
                  <span>{v.label}</span>
                  <small>{money(totalOf(v.id))}</small>
                </button>
              ))}
            </div>

            <div className={styles.totalBar}>
              <p>
                <strong>{money(total)}</strong> of {money(budget)}
              </p>
              <span className={left < 0 ? styles.over : undefined}>{left < 0 ? `${money(-left)} over budget` : `${money(left)} left`}</span>
              <div className={styles.meter} aria-hidden>
                <i style={{ width: `${Math.min(100, (total / budget) * 100)}%` }} className={left < 0 ? styles.over : undefined} />
              </div>
            </div>

            {left < 0 && overPieces.length > 0 && (
              <p className="notice">Nothing fit the {listOf(overPieces)} share of your budget, so we picked the cheapest we have.</p>
            )}

            <ol className={styles.picks}>
              {kit.picks.map((pick) => (
                <PickRow
                  key={pick.piece}
                  pick={pick}
                  item={current(variant, pick)}
                  onSwap={(item) => setSwaps((s) => ({ ...s, [variant]: { ...s[variant], [pick.piece]: item } }))}
                />
              ))}
            </ol>
            <p className="fine-print">Prices are the lowest in-stock listing for the size and colour shown. Safety notes repeat what the store listing says; check the label on the product before you buy.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function PickRow({ pick, item, onSwap }: { pick: KitPick; item: KitItem; onSwap: (item: KitItem) => void }) {
  const options = [pick.item, ...pick.alternatives].filter((o) => o.id !== item.id);
  return (
    <li className={styles.pick}>
      <h3 className={styles.pieceName}>
        {pick.piece}
        <span>Planned {money(pick.allocation)}</span>
      </h3>
      <Link href={href(item)} className={styles.chosen}>
        <span className={styles.thumb}>
          <ProductImage p={item} />
        </span>
        <span className={styles.chosenBody}>
          <span className="card-brand">{item.brand}</span>
          <span className={styles.name}>{item.name}</span>
          <span className="card-variant">{item.variant}</span>
          {item.mentions.length > 0 && <span className={styles.mention}>Mentions {item.mentions.join(", ")} in listing</span>}
        </span>
        <span className={styles.price}>
          <strong>{money(item.price)}</strong>
          <small>{item.storeName}</small>
        </span>
      </Link>
      {options.length > 0 && (
        <ul className={styles.alts} aria-label={`Other ${pick.piece.toLowerCase()} options`}>
          {options.map((o) => {
            const diff = o.price - item.price;
            return (
              <li key={o.id}>
                <span className={styles.altThumb}>
                  <ProductImage p={o} />
                </span>
                <Link href={href(o)} className={styles.altName}>
                  <b>{o.brand}</b> {o.name}
                </Link>
                <span className={styles.altPrice}>
                  {money(o.price)}
                  <small>{diff === 0 ? "Same price" : diff < 0 ? `${money(-diff)} less` : `${money(diff)} more`}</small>
                </span>
                <button className={styles.swap} onClick={() => onSwap(o)} aria-label={`Swap in ${o.brand} ${o.name}`}>
                  Swap
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function Skeleton() {
  return (
    <div className={styles.skeleton} aria-label="Building your kit">
      <i />
      <i />
      <i />
    </div>
  );
}
