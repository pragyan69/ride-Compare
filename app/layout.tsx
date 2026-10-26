import type { Metadata } from "next";
import { Archivo, Instrument_Serif, Nunito } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TabBar } from "@/components/tab-bar";
import { MetaPixel } from "@/components/meta-pixel";
import { Splash, splashGuard } from "@/components/splash";
import { IntentPopup } from "@/components/intent-popup";
import { Analytics } from '@vercel/analytics/next';

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-serif" });
// Rounded black weight for the hero NOW heading and the footer wordmark.
const round = Nunito({ subsets: ["latin"], weight: "900", variable: "--font-round", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://ridecompare.store"),
  title: "RideCompare | Motorcycle gear prices across Indian stores",
  description: "Search helmets, riding jackets, gloves, boots and accessories from Indian motorcycle gear stores and see who sells it for less.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${archivo.variable} ${serif.variable} ${round.variable}`}>
      <head>
        {/* PostHog inserts its loader before the first script, so this tag's attributes may differ at hydration. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: splashGuard }} />
      </head>
      <body>
        <Splash />
        <SiteHeader />
        {children}
        <SiteFooter />
        <TabBar />
        <IntentPopup />
        <MetaPixel />
        <Analytics />
      </body>
    </html>
  );
}
