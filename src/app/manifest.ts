import type { MetadataRoute } from "next";
import { siteName, siteUrl } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteName,
    description:
      "Instant event photo sharing with live galleries, QR access, and face scan photo discovery.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#06b6d4",
    categories: ["photography", "business", "events"],
    icons: [
      {
        src: "/micon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.jpeg",
        sizes: "512x512",
        type: "image/jpeg",
      },
    ],
    screenshots: [
      {
        src: `${siteUrl}/logo.jpeg`,
        sizes: "512x512",
        type: "image/jpeg",
      },
    ],
  };
}
