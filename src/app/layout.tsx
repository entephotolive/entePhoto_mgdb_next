import type { Metadata } from "next";
import "@fontsource-variable/geist";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Photo Ceremony Admin",
  description: "Production-grade admin studio for events, uploads, galleries, and photographer access.",
};

import { SceneBackground } from "@/components/ui/scene-background";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <SceneBackground intensity="medium" className="flex flex-col min-h-screen">
          {children}
        </SceneBackground>
      </body>
    </html>
  );
}
