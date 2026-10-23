"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { FitViewer } from "./fit-viewer";
import { ZONE_COLOURS } from "./fit-scene";
import { BODY_FIELDS, CUT_LABEL, estimateBody, evaluateFit, sizeOptions, type Body, type FitCut, type Garment, type GarmentType } from "@/lib/fit";

const KEY = "rc-body";
const EMPTY: Body = { height: 0, weight: 0, chest: 0, waist: 0, hips: 0, shoulder: 0, sleeve: 0, inseam: 0, thigh: 0 };
const STATUS_LABEL = { tight: "Too tight", snug: "Snug", good: "Good", loose: "Roomy", baggy: "Too big" } as const;

function readBody(): Body {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && typeof v === "object" ? { ...EMPTY, ...v } : EMPTY; } catch { return EMPTY; }
}
const noop = () => () => {};

export type FitProduct = { id: string; name: string; brand: string; image: string; category: string } | null;

export function FitStudio({ initialType, initialSize, product }: { initialType: GarmentType; initialSize: string | null; product: FitProduct }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [body, setBody] = useState<Body>(() => (typeof window === "undefined" ? EMPTY : readBody()));
  const [garment, setGarment] = useState<Garment>({ type: initialType, size: initialSize || (initialType === "jacket" ? "L" : "32"), cut: "regular", length: "regular" });

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(body)); } catch { /* storage unavailable */ } }, [body]);

  const { body: full, estimated } = useMemo(() => estimateBody(body), [body]);
  const result = useMemo(() => evaluateFit(body, garment), [body, garment]);
  const model = useMemo(() => ({ body: full, garment: result.dims, type: garment.type, zones: Object.fromEntries(result.zones.map((z) => [z.key, z.status])) }), [full, result, garment.type]);
  const fields = BODY_FIELDS.filter((f) => f.forType === "both" || f.forType === garment.type);
  const setType = (type: GarmentType) => setGarment((g) => ({ ...g, type, size: type === "jacket" ? "L" : "32" }));
  const hasAnything = body.height > 0 || body.chest > 0 || body.waist > 0;

  if (!mounted) return <div className="fit-grid"><div className="fit-panel" style={{ minHeight: 420 }} /><div className="fit-stage" /></div>;
  return (
    <div className="fit-grid">
      <div className="fit-panel">
        {product && (
          <div className="fit-product">
            {product.image && <img src={product.image} alt="" referrerPolicy="no-referrer" />}
            <div><span className="card-brand">{product.brand !== "Unspecified" ? product.brand : product.category}</span><b>{product.name}</b><Link href={`/product/${product.id}`}>Back to prices →</Link></div>
          </div>
        )}
        <div className="fgroup">
          <span className="flabel">What are you trying on?</span>
          <div className="seg" role="radiogroup" aria-label="Garment type">
            <button type="button" aria-checked={garment.type === "jacket"} role="radio" onClick={() => setType("jacket")}>Jacket</button>
            <button type="button" aria-checked={garment.type === "pants"} role="radio" onClick={() => setType("pants")}>Pants</button>
          </div>
        </div>
        <div className="fit-row">
          <label className="fgroup"><span className="flabel">Size on the label</span>
            <select value={garment.size} onChange={(e) => setGarment({ ...garment, size: e.target.value })}>{sizeOptions(garment.type).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </label>
          <label className="fgroup"><span className="flabel">Cut</span>
            <select value={garment.cut} onChange={(e) => setGarment({ ...garment, cut: e.target.value as FitCut })}>{(Object.keys(CUT_LABEL) as FitCut[]).map((c) => <option key={c} value={c}>{CUT_LABEL[c]}</option>)}</select>
          </label>
          <label className="fgroup"><span className="flabel">{garment.type === "jacket" ? "Sleeve length" : "Leg length"}</span>
            <select value={garment.length} onChange={(e) => setGarment({ ...garment, length: e.target.value as Garment["length"] })}><option value="short">Short</option><option value="regular">Regular</option><option value="long">Long</option></select>
          </label>
        </div>
        <div className="fgroup" style={{ marginTop: 18 }}>
          <span className="flabel">Your measurements</span>
          <p className="fine">Fill what you know. Anything left blank is estimated from your height and weight and marked “est.” Measurements stay in this browser only.</p>
          <div className="fit-fields">
            {fields.map((f) => (
              <label key={f.key} className="fit-field">
                <span>{f.label} <small>{f.unit}</small>{estimated.includes(f.key) && f.key !== "weight" && f.key !== "height" && <em>est. {full[f.key]}</em>}</span>
                <input type="number" inputMode="decimal" min={0} step={0.5} placeholder={String(full[f.key])} value={body[f.key] || ""} onChange={(e) => setBody({ ...body, [f.key]: Number(e.target.value) || 0 })} title={f.hint} />
                <small>{f.hint}</small>
              </label>
            ))}
          </div>
          <div className="actions" style={{ marginTop: 4 }}>
            <button type="button" className="btn btn-small" onClick={() => setBody({ ...full })}>Use the estimates as my measurements</button>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setBody(EMPTY)}>Clear</button>
          </div>
        </div>
      </div>

      <div className="fit-view">
        <FitViewer model={model} />
        <div className="fit-legend" aria-hidden="true">{(Object.keys(ZONE_COLOURS) as (keyof typeof ZONE_COLOURS)[]).map((k) => <span key={k}><i style={{ background: ZONE_COLOURS[k] }} />{STATUS_LABEL[k]}</span>)}</div>
        <div className="fit-verdict">
          <div className="fit-score" style={{ ["--score" as string]: `${result.score}%` }}><b>{result.score}</b><span>fit score</span></div>
          <div>
            <h2>{result.verdict}</h2>
            {!hasAnything && <p className="fine">Enter at least your height and weight for a verdict about you rather than an average rider.</p>}
            <p>{result.recommended !== garment.size ? <>Our size for you: <b>{result.recommended}</b>. {result.recommendedWhy} <button type="button" className="btn btn-small" onClick={() => setGarment({ ...garment, size: result.recommended })}>Try {result.recommended}</button></> : <>This is also the size we would pick. {result.recommendedWhy}</>}</p>
          </div>
        </div>
        <ul className="fit-zones">
          {result.zones.map((z) => (
            <li key={z.key}><i style={{ background: ZONE_COLOURS[z.status] }} /><b>{z.label}</b><span>{STATUS_LABEL[z.status]}</span><small>{z.note}. You: {Math.round(z.body)} cm · garment: {Math.round(z.garment)} cm</small></li>
          ))}
        </ul>
        <p className="fine">Drag to rotate. The shell is the garment at its chart size; where your body shows through, it is tight. Brands grade differently, so treat the verdict as a one-size window and check the retailer’s chart before ordering.</p>
      </div>
    </div>
  );
}
