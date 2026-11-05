import type { MetadataRoute } from "next";
import { storeCards } from "@/lib/shop";

const site = process.env.SITE_URL || "https://ridecompare.store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const pages = ["", "/store"].map((path) => ({ url: site + path, lastModified }));
  return [...pages, ...(await storeCards()).map((c) => ({ url: `${site}/store/${encodeURIComponent(c.id)}`, lastModified }))];
}
