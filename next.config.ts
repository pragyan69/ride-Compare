import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server pages read the nightly catalog snapshot from disk.
  outputFileTracingIncludes: { "/**": ["./public/data/catalog.json", "./public/data/images.json"] },
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
