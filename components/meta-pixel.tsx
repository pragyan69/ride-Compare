"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const PIXEL_ID = "1771305688332618";

type Fbq = (cmd: "track" | "trackCustom", event: string, params?: Record<string, unknown>) => void;
// The base code loads after hydration, so early calls wait for it (up to ~10 s).
const fbq: Fbq = (...args) => {
  let tries = 0;
  const send = () => {
    const f = (window as unknown as { fbq?: Fbq }).fbq;
    if (f) f(...args);
    else if (tries++ < 50) setTimeout(send, 200);
  };
  send();
};

/** Meta Pixel: page views, product/kit views, and click-outs to a store (sent as InitiateCheckout so ads can optimise for them). */
export function MetaPixel() {
  const path = usePathname();
  const first = useRef(true);

  useEffect(() => {
    // The base code already sends the first PageView.
    if (first.current) first.current = false;
    else fbq("track", "PageView");
    if (/^\/(product|kit)\//.test(path)) fbq("track", "ViewContent", { content_category: path.split("/")[1] });
  }, [path]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[data-ph-capture-attribute-store-click]");
      if (!a) return;
      const price = Number(a.getAttribute("data-ph-capture-attribute-price"));
      fbq("track", "InitiateCheckout", {
        content_name: a.getAttribute("data-ph-capture-attribute-store-click"),
        ...(price ? { value: price, currency: "INR" } : {}),
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}
