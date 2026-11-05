import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server pages read the nightly catalog snapshot from disk.
  outputFileTracingIncludes: { "/**": ["./public/data/catalog.json", "./public/data/images.json", "./public/data/shop-items.json"] },
  // The price-comparison pages are gone; old links (ads, DMs, search results) land in the store. Query strings carry over.
  async redirects() {
    return [
      { source: "/product/:id", destination: "/store/:id", permanent: false },
      ...["/gear", "/deals", "/brands", "/bikes", "/bikes/:slug", "/build", "/kit/:code"].map((source) => ({ source, destination: "/store", permanent: false })),
    ];
  },
  // PostHog through our own domain, so ad blockers don't drop analytics.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/array/:path*", destination: "https://us-assets.i.posthog.com/array/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
};

export default nextConfig;
