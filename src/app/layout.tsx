import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import type { ReactNode } from "react";
import { defaultOgImage, siteName, siteUrl } from "@/lib/seo";
import "./globals.css";
import { SceneBackground } from "@/components/ui/scene-background";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | Instant Event Photo Sharing`,
    template: `%s | ${siteName}`,
  },
  description:
    "Instant photo sharing for events with QR check-in, live galleries, and face scan photo discovery for weddings, parties, and corporate events.",
  applicationName: siteName,
  keywords: [
    "instant photo sharing in events",
    "event photo sharing",
    "face scan get photos instantly",
    "AI face recognition event photos",
    "wedding photo sharing",
    "event gallery app",
    "QR code photo sharing for events",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: `${siteName} | Instant Event Photo Sharing`,
    description:
      "Help guests find and receive their event photos instantly with QR access, live uploads, and face scan matching.",
    siteName,
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: `${siteName} preview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Instant Event Photo Sharing`,
    description:
      "Instant event photo sharing with QR access, live galleries, and face scan photo discovery.",
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/micon.png",
    shortcut: "/micon.png",
    apple: "/micon.png",
  },
  category: "photography",
};

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading" });

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", plusJakartaSans.variable, outfit.variable)}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <SceneBackground
          intensity="medium"
          className="flex flex-col min-h-screen"
        >
          {children}
        </SceneBackground>
      </body>
    </html>
  );
}
