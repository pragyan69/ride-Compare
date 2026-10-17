import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server pages read the nightly catalog snapshot from disk.
  outputFileTracingIncludes: { "/**": ["./public/data/catalog.json"] },
};

export default nextConfig;
