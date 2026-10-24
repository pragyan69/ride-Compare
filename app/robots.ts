import type { MetadataRoute } from "next";

const site = process.env.SITE_URL || "https://ridecompare.store";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${site}/sitemap.xml` };
}
