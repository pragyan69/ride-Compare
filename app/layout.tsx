import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"RideCompare | Motorcycle gear. Better deals.",description:"Compare motorcycle helmets, riding gear and accessories across Indian retailers. Find the best listed prices in rupees.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
