import type { NextConfig } from "next";
import { getSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images-assets.nasa.gov",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.nasa.gov",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "apod.nasa.gov",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "mars.nasa.gov",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "photojournal.jpl.nasa.gov",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: getSecurityHeaders(process.env.NODE_ENV === "production"),
      },
    ];
  },
};

export default nextConfig;
