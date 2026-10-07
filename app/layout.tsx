import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["600", "700", "900"], variable: "--font-display" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["italic", "normal"],
  variable: "--font-serif",
});
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL to the deployed URL so share previews resolve.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Grand Opening Invitation · Water Park Restaurant & Party Center",
  description:
    "You are cordially invited to the Grand Opening Ceremony of Water Park Restaurant & Party Center — 9 October 2026, 4:30 PM, Uttara, Dhaka.",
  openGraph: {
    title: "You're Invited · Grand Opening of Water Park",
    description: "9 October 2026 · 4:30 PM · Uttara, Dhaka",
    images: [{ url: "/images/og-card.jpg", width: 1200, height: 1650 }],
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#120d12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${cormorant.variable} ${montserrat.variable}`}>
      <head>
        <link rel="preload" as="image" href="/images/logo.webp" />
      </head>
      <body>{children}</body>
    </html>
  );
}
