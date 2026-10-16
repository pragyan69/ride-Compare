import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });

export const metadata: Metadata = {
  title: "RideCompare | Motorcycle gear prices across Indian stores",
  description: "Search helmets, riding jackets, gloves, boots and accessories from Indian motorcycle gear stores and see who sells it for less.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
