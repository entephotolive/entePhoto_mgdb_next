import type { Metadata } from "next";
import { JetBrains_Mono, Sora } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Photo Ceremony Admin",
  description: "Production-grade admin studio for events, uploads, galleries, and photographer access.",
};

import { SceneBackground } from "@/components/ui/scene-background";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${jetBrainsMono.variable} font-sans antialiased`}>
        <SceneBackground intensity="medium" className="flex flex-col min-h-screen">
          {children}
        </SceneBackground>
      </body>
    </html>
  );
}
