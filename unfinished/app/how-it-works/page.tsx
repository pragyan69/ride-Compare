import type { Metadata } from "next";
import { stats } from "@/lib/db";
import { ago } from "@/lib/rules";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "How it works" };

export default async function HowItWorks() {
  const s = await stats().catch(() => null);
  return (
    <>
      <section className="hero"><h1>How RideCompare <em>works</em></h1><p>What the prices mean, how products are matched, and what we never claim.</p></section>
      <div className="steps">
        <div className="step"><b>Public catalogs, read often</b><p>Each store’s public product feed is collected a few pages at a time, around the clock, so every store is refreshed about every two hours.{s?.refreshedAt ? ` Last update ${ago(s.refreshedAt)}.` : ""}</p></div>
        <div className="step"><b>Exact matches only</b><p>Two listings are the same product only if the brand, model name and variant match after normalisation, or they share a validated barcode. Similar names are kept apart so you never compare a different size or colour by mistake.</p></div>
        <div className="step"><b>Lowest listed price</b><p>“Lowest” means the lowest current price among the stores we read, preferring listings that show stock. It is not a claim about every website in India.</p></div>
        <div className="step"><b>Discounts vs MRP</b><p>The percentage uses the list price the retailer itself publishes. We do not invent an MRP.</p></div>
        <div className="step"><b>Shipping, coupons, bank offers</b><p>These are not included unless a store lists them. Confirm the final total at checkout on the retailer’s own site.</p></div>
        <div className="step"><b>Complete your kit</b><p>Suggestions are rule based: accessories made for the same helmet range, pants and gloves from the same brand as a jacket, racks for the same bike as a bag, and so on.</p></div>
      </div>
      <p className="fine" style={{ marginTop: 24 }}>Stores that block automated reading (for example Amazon, Flipkart and the Royal Enfield store) are not included. Per-store coverage is monitored privately by the site owner.</p>
    </>
  );
}
