import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Old routes from the previous site.
  async redirects() {
    return [
      { source: "/products", destination: "/marketplace", permanent: true },
      { source: "/buyers", destination: "/rfq", permanent: true },
    ];
  },
};

export default nextConfig;
