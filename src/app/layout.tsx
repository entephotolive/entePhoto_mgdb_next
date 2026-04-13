import type { Metadata } from "next";
import "@fontsource-variable/geist";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Ente Photo",
  description: "Photo management app",
  icons: {
    icon: "/micon.png",
    shortcut: "/micon.png",
    apple: "/micon.png",
  },
};
import { SceneBackground } from "@/components/ui/scene-background";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="font-sans antialiased">
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
