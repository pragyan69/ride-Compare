import Link from "next/link";
import { Logo } from "./logo";

const columns = [
  {
    title: "Shop",
    links: [
      ["Helmets", "/gear?category=Helmets"],
      ["Jackets", "/gear?category=Jackets"],
      ["Gloves", "/gear?category=Gloves"],
      ["Boots", "/gear?category=Boots"],
      ["Pants", "/gear?category=Pants"],
      ["Luggage", "/gear?category=Luggage"],
      ["Bike accessories", "/gear?category=Bike%20Accessories"],
    ],
  },
  {
    title: "Popular bikes",
    links: [
      ["Himalayan 450", "/bikes/royal-enfield-himalayan-450"],
      ["Classic 350", "/bikes/royal-enfield-classic-350"],
      ["Hunter 350", "/bikes/royal-enfield-hunter-350"],
      ["Interceptor 650", "/bikes/royal-enfield-interceptor-650"],
      ["Duke 390", "/bikes/ktm-duke-390"],
      ["Speed 400", "/bikes/triumph-speed-400"],
      ["Xpulse", "/bikes/hero-xpulse"],
    ],
  },
  {
    title: "Tools",
    links: [
      ["Build a kit", "/build"],
      ["Deals", "/deals"],
      ["Shop by bike", "/bikes"],
      ["All brands", "/brands"],
      ["All gear", "/gear"],
    ],
  },
  {
    title: "About",
    links: [
      ["How we keep it honest", "/#honest"],
      ["Stores we check", "/#stores"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <Link href="/" className="footer-logo" aria-label="RideCompare home">
          <Logo small />
        </Link>
        <div className="footer-cols">
          {columns.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2>{c.title}</h2>
              <ul>
                {c.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="footer-base">
        <div className="wrap">
          <p>Prices come from each store&apos;s public listings and are checked every night. Shipping, coupons and bank offers aren&apos;t included, so confirm the final price at the store.</p>
          <p>© {new Date().getFullYear()} RideCompare. Made for riders in India.</p>
        </div>
      </div>
    </footer>
  );
}
