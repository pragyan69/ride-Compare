import type { Metadata } from "next";
import { catalogue } from "@/lib/catalog-server";
import { BrandList } from "./brand-list";

export const metadata: Metadata = {
  title: "Motorcycle gear brands sold in India | RideCompare",
  description: "Every helmet, riding gear and accessory brand in the RideCompare catalogue, with how many products each one has.",
};

export default async function BrandsPage() {
  const counts = new Map<string, number>();
  for (const p of (await catalogue()).products) if (p.brand !== "Unspecified") counts.set(p.brand, (counts.get(p.brand) || 0) + 1);
  const brands = [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <main className="wrap">
      <section className="hero hero-small">
        <h1>Brands</h1>
        <p>{brands.length.toLocaleString("en-IN")} brands in the RideCompare catalogue.</p>
      </section>
      <BrandList brands={brands} />
    </main>
  );
}
