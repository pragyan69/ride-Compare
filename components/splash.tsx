"use client";
import { useEffect } from "react";

const KEY = "rc-splash";
// Runs before the splash markup is parsed, so a second load in the same tab never shows it.
// Ad visitors and kit/product landings skip it: replays show they decide within the first second or two.
const splashGuard = `try{if(sessionStorage.getItem("${KEY}")||/^\\/(kit|product)\\//.test(location.pathname)||/utm_source=/.test(location.search))document.documentElement.classList.add("no-splash")}catch(e){}`;

const markup = `<script>${splashGuard}</script><div class="splash-mark"><img src="/brand/rc-logo.png" alt="" width="96" height="49"></div><p>Finding tonight&rsquo;s lowest prices…</p>`;

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
    // Raw HTML so the guard runs while the page is parsed, without React rendering a <script> element.
    <div id="rc-splash" className="splash" aria-hidden dangerouslySetInnerHTML={{ __html: markup }} />
  );
}
