"use client";
import { useEffect, useRef, useState } from "react";
import type { SceneModel } from "./fit-scene";

type Handle = { update(m: SceneModel): void; dispose(): void };

/** Client-only wrapper around the three.js mannequin; the scene code is loaded on demand. */
export function FitViewer({ model }: { model: SceneModel }) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<Handle | null>(null);
  const latest = useRef<SceneModel>(model);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let alive = true;
    import("./fit-scene").then(({ mountFitScene }) => {
      if (!alive || !host.current) return;
      try { handle.current = mountFitScene(host.current, latest.current); setState("ready"); } catch { setState("failed"); }
    }).catch(() => { if (alive) setState("failed"); });
    return () => { alive = false; handle.current?.dispose(); handle.current = null; };
  }, []);

  useEffect(() => { latest.current = model; handle.current?.update(model); }, [model]);

  return (
    <div className="fit-stage" ref={host} aria-label="3D mannequin showing how the garment sits on your body">
      {state === "loading" && <div className="fit-stage-note">Loading the 3D view…</div>}
      {state === "failed" && <div className="fit-stage-note">Your browser could not start the 3D view. The fit verdict below still applies.</div>}
    </div>
  );
}
