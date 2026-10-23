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
];

export function SiteFooter() {
  return (
    <footer className="site-footer" data-dark>
      <div className="wrap footer-top">
        <div className="footer-brand">
          <Link href="/" className="footer-logo" aria-label="RideCompare home">
            <Logo dark />
          </Link>
          <p>Same gear. Lowest price. Checked every night across Indian stores.</p>
          <a href="https://www.instagram.com/ridecompare26/" target="_blank" rel="noopener noreferrer" className="footer-social" aria-label="RideCompare on Instagram">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
              <circle cx="12" cy="12" r="4.2" />
              <circle cx="17.4" cy="6.6" r="0.6" fill="currentColor" />
            </svg>
          </a>
        </div>
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
          <div className="footer-base-inner">
            <p>
              Prices come from each store&apos;s public listings and are checked every night. Shipping, coupons and bank offers aren&apos;t included, so confirm
              the final price at the store.
            </p>
            <p>© {new Date().getFullYear()} RideCompare. Made for riders in India.</p>
          </div>
        </div>
      </div>
      <div className="footer-giant" aria-hidden>
        RideCompare
      </div>
    </footer>
  );
}
