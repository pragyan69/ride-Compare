import type { MetadataRoute } from "next";
import { snapshot } from "@/lib/catalog-server";

const site = process.env.SITE_URL || "https://ride-compare-kqfw.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, summary } = await snapshot();
  const lastModified = summary?.generatedAt ? new Date(summary.generatedAt) : new Date();
  const pages = ["", "/build", "/deals", "/bikes", "/brands"].map((path) => ({ url: site + path, lastModified }));
  return [...pages, ...products.map((p) => ({ url: `${site}/product/${encodeURIComponent(p.id)}`, lastModified }))];
}
