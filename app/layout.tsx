import type { Metadata } from "next";
import { Archivo, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TabBar } from "@/components/tab-bar";
import { Analytics } from '@vercel/analytics/next';

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-serif" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://ride-compare-kqfw.vercel.app"),
  title: "RideCompare | Motorcycle gear prices across Indian stores",
  description: "Search helmets, riding jackets, gloves, boots and accessories from Indian motorcycle gear stores and see who sells it for less.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${archivo.variable} ${serif.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <TabBar />
        <Analytics />
      </body>
    </html>
  );
}
