import type { Metadata } from "next";
import Link from "next/link";
import { FitStudio } from "@/components/fit-studio";
import { getProduct } from "@/lib/db";
import { parseSize, type GarmentType } from "@/lib/fit";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Fit check: see how a riding jacket or pants will fit you",
  description: "Enter your measurements and a label size to see a 3D mockup of how a motorcycle jacket or riding pants will fit, zone by zone, with the size we would pick.",
};

type Query = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";

export default async function FitPage({ searchParams }: { searchParams: Promise<Query> }) {
  const q = await searchParams;
  const productId = one(q.product);
  const data = productId ? await getProduct(productId).catch(() => null) : null;
  const p = data?.product ?? null;
  let type: GarmentType = one(q.type) === "pants" ? "pants" : "jacket";
  if (p?.category === "Pants") type = "pants";
  else if (p?.category === "Jackets") type = "jacket";
  const fromVariant = p ? p.variant.split(/[\/,·]/).map((s) => parseSize(type, s)).find(Boolean) || null : null;
  const size = parseSize(type, one(q.size)) || fromVariant;
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>›</span><span>Fit check</span></nav>
      <section className="page-head">
        <h1>Will it fit? See it on <em>your</em> body.</h1>
        <p>Pick the size on the label, add your measurements, and the mannequin shows where a jacket or pants will be tight, right or roomy. Works with any brand sold on RideCompare.</p>
      </section>
      <FitStudio initialType={type} initialSize={size} product={p ? { id: p.id, name: p.name, brand: p.brand, image: p.image, category: p.category } : null} />
      <section className="section">
        <div className="section-head"><div><h2>How the fit check works</h2></div></div>
        <div className="steps">
          <div className="step"><b>1. Chart sizes, not guesses</b><p>Each label size is mapped to the chest, waist, shoulder, sleeve, hip, thigh and inseam measurements most European-graded riding gear uses. Race cuts are read 3 cm smaller, touring cuts 4 cm roomier.</p></div>
          <div className="step"><b>2. Your body, measured or estimated</b><p>Anything you leave blank is estimated from height and weight so you always get an answer. Add real tape measurements for a sharper verdict; they stay in your browser.</p></div>
          <div className="step"><b>3. Zone by zone</b><p>Riding gear should sit close so armour stays over the joint in a slide. Green is right, amber is snug, red is too tight, blue is roomy, purple is too big.</p></div>
          <div className="step"><b>4. Then compare the price</b><p>Once you know the size, open the product to see which store lists it cheapest. Stock for specific sizes is confirmed on the store page.</p></div>
        </div>
      </section>
    </>
  );
}
