import Footer from "@/components/Footer";
import "./globals.css";

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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
