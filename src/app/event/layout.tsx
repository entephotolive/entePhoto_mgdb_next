import Footer from "@/components/Footer";
import type { CSSProperties, ReactNode } from "react";

export const metadata = {
  title: "Photo Ceremony",
  description: "Your digital lens for the moments that matter.",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport = {
  themeColor: "#020617",
};

const eventTheme: CSSProperties = {
  "--background": "2 6 23",
  "--foreground": "248 250 252",
  "--surface": "15 23 42",
  "--card": "255 255 255",
  "--card-foreground": "248 250 252",
  "--popover": "2 6 23",
  "--popover-foreground": "248 250 252",
  "--primary": "34 211 238",
  "--primary-foreground": "2 6 23",
  "--secondary": "255 255 255",
  "--secondary-foreground": "248 250 252",
  "--muted": "255 255 255",
  "--muted-foreground": "203 213 225",
  "--accent": "255 255 255",
  "--accent-foreground": "248 250 252",
  "--border": "255 255 255",
  "--input": "255 255 255",
  "--ring": "34 211 238",
  "--radius": "1rem",
} as CSSProperties;

export default function EventLayout({ children }: { children: ReactNode }) {
  return (
    <div style={eventTheme} className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
