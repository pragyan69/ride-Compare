import type { Metadata } from "next";
import { bikeIndex, bikes } from "@/lib/bikes";
import { snapshot } from "@/lib/catalog-server";
import { BikeList, type BikeGroup } from "./bike-list";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Motorcycle accessories by bike model | RideCompare",
  description: "Crash guards, luggage racks, exhausts, filters and parts for Royal Enfield, KTM, Bajaj, Triumph and more, compared across Indian stores.",
};

export default async function BikesPage() {
  const index = bikeIndex((await snapshot()).products);
  const groups: BikeGroup[] = [];
  for (const b of bikes) {
    const count = index.get(b.slug)?.length ?? 0;
    if (!count) continue;
    let g = groups.find((x) => x.make === b.make);
    if (!g) groups.push((g = { make: b.make, bikes: [] }));
    g.bikes.push({ slug: b.slug, model: b.model, count });
  }

  return (
    <main className="wrap">
      <BikeList groups={groups} />
    </main>
  );
}
