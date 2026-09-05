import type { NextConfig } from "next";
import { getSecurityHeaders } from "./src/lib/security/headers";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          const mod = resource.request.replace(/^node:/, "");
          if (mod === "module" || mod === "worker_threads" || mod === "fs" || mod === "net" || mod === "tls" || mod === "child_process") {
            resource.request = path.resolve(__dirname, "./src/lib/empty-module.ts");
          }
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "node:module": false,
        "node:worker_threads": false,
        module: false,
        worker_threads: false,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
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
