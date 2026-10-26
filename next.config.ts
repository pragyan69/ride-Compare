import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server pages read the nightly catalog snapshot from disk.
  outputFileTracingIncludes: { "/**": ["./public/data/catalog.json", "./public/data/images.json"] },
  // PostHog through our own domain, so ad blockers don't drop analytics.
  skipTrailingSlashRedirect: true,
  // A second Vercel project still serves this repo; send its address to the real site.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "ride-compare-kqfw.vercel.app" }],
        destination: "https://ridecompare.store/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/array/:path*", destination: "https://us-assets.i.posthog.com/array/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
};

export default nextConfig;
