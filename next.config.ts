import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Raise the Server Action body limit to 4 MB as a safety net.
  // The primary fix is client-side compression (lib/utils/compress-image.ts),
  // which shrinks images to ~150–700 KB before they hit this limit.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  allowedDevOrigins: [
    "overgreedily-unrecessive-adalyn.ngrok-free.dev",
    "10.248.238.166",
    "10.169.72.166",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
