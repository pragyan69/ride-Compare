import type { MetadataRoute } from "next";

const site = process.env.SITE_URL || "https://ride-compare-kqfw.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${site}/sitemap.xml` };
}
