import { PublicOnly } from "@/components/public-only";
import type { Metadata } from "next";
import { Geist, Instrument_Serif, Nunito } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { buildMenu, type Menu } from "@/lib/menu";
import { SiteFooter } from "@/components/site-footer";
import { TabBar } from "@/components/tab-bar";
import { MetaPixel } from "@/components/meta-pixel";
import { Splash } from "@/components/splash";
import { IntentPopup } from "@/components/intent-popup";
import { Analytics } from '@vercel/analytics/next';

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-serif" });
// Rounded black weight for the hero NOW heading and the footer wordmark.
const round = Nunito({ subsets: ["latin"], weight: "900", variable: "--font-round", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://ridecompare.store"),
  title: "GearCircle | Riding gear and motorcycle parts",
  description: "Helmets, riding jackets, boots and motorcycle parts with free delivery across India. Pay by UPI, card or netbanking.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The mega menu is a nice-to-have: if the catalogue can't load, the header falls back to plain links.
  const menu: Menu | null = await buildMenu().catch(() => null);
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${sans.variable} ${serif.variable} ${round.variable}`}>
      <body>
        <PublicOnly>
          <Splash />
          <SiteHeader menu={menu} />
        </PublicOnly>
        {children}
        <PublicOnly>
          <SiteFooter />
          <TabBar />
          <IntentPopup />
          <MetaPixel />
          <Analytics />
        </PublicOnly>
      </body>
    </html>
  );
}
