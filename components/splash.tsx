"use client";
import { useEffect } from "react";

const KEY = "rc-splash";
// Runs before the splash markup is parsed, so a second load in the same tab never shows it.
export const splashGuard = `try{if(sessionStorage.getItem("${KEY}"))document.documentElement.classList.add("no-splash")}catch(e){}`;

/** First-load splash: server-rendered, faded out once React has hydrated. CSS hides it anyway after 2.5s. */
export function Splash() {
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    const el = document.getElementById("rc-splash");
    if (el) el.dataset.done = "";
  }, []);

  return (
    <div id="rc-splash" className="splash" aria-hidden>
      <div className="splash-mark">
        {/* eslint-disable-next-line @next/next/no-img-element -- must paint before hydration, no optimiser round trip */}
        <img src="/brand/rc-logo.png" alt="" width={96} height={49} />
      </div>
      <p>Finding tonight&apos;s lowest prices…</p>
    </div>
  );
}
