"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";

const KEY = "rc-compare";
const EVENT = "rc-compare-change";
export const MAX_COMPARE = 5;

function readRaw() { try { return localStorage.getItem(KEY) || "[]"; } catch { return "[]"; } }
function parse(raw: string): string[] { try { const v = JSON.parse(raw); return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, MAX_COMPARE) : []; } catch { return []; } }
function write(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX_COMPARE))); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

export function useCompare() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const ids = useMemo(() => parse(raw), [raw]);
  return {
    ids,
    has: (id: string) => ids.includes(id),
    toggle: (id: string) => { const cur = parse(readRaw()); if (cur.includes(id)) write(cur.filter((x) => x !== id)); else if (cur.length < MAX_COMPARE) write([...cur, id]); else return false; return true; },
    remove: (id: string) => write(parse(readRaw()).filter((x) => x !== id)),
    clear: () => write([]),
    replace: (next: string[]) => write(Array.from(new Set(next)).slice(0, MAX_COMPARE)),
  };
}

export function CompareTray() {
  const { ids } = useCompare();
  return <Link href="/compare" className="btn btn-small" aria-label={`Compare ${ids.length} saved products`}>⇄ Compare{ids.length ? ` (${ids.length})` : ""}</Link>;
}

export function CompareButton({ id, small = true }: { id: string; small?: boolean }) {
  const { has, toggle } = useCompare();
  const [note, setNote] = useState("");
  const on = has(id);
  return (
    <>
      <button type="button" className={`btn compare-toggle${small ? " btn-small" : ""}`} aria-pressed={on} onClick={() => { if (!toggle(id)) { setNote(`You can compare up to ${MAX_COMPARE} products at once.`); setTimeout(() => setNote(""), 2500); } }}>
        {on ? "✓ In compare" : "+ Compare"}
      </button>
      {note && <div className="toast" role="status">{note}</div>}
    </>
  );
}

/** Puts a whole kit into the compare tray, replacing what was there. */
export function CompareSetButton({ ids }: { ids: string[] }) {
  const { replace } = useCompare();
  const [note, setNote] = useState("");
  return (
    <>
      <button type="button" className="btn btn-small" onClick={() => { replace(ids); setNote(`${Math.min(ids.length, MAX_COMPARE)} items ready to compare.`); setTimeout(() => setNote(""), 2500); }}>⇄ Compare this set</button>
      {note && <div className="toast" role="status">{note} <Link href="/compare" style={{ textDecoration: "underline" }}>Open compare</Link></div>}
    </>
  );
}
