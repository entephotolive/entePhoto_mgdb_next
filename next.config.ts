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
   allowedDevOrigins: ['overgreedily-unrecessive-adalyn.ngrok-free.dev'],
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
    ],
  },
};

export default nextConfig;
