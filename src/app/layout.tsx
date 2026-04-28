import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
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
import { cn } from "@/lib/utils";

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading" });

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", plusJakartaSans.variable, outfit.variable)}>
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
