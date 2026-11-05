import Link from "next/link";
import { Logo } from "./logo";

const columns = [
  {
    title: "Shop",
    links: [
      ["Helmets", "/store?category=Helmets"],
      ["Jackets", "/store?category=Jackets"],
      ["Gloves", "/store?category=Gloves"],
      ["Boots", "/store?category=Boots"],
      ["Pants", "/store?category=Pants"],
    ],
  },
  {
    title: "Bike parts",
    links: [
      ["Accessories", "/store?category=Bike%20Accessories"],
      ["Maintenance and parts", "/store?category=Maintenance%20%26%20Parts"],
      ["Luggage", "/store?category=Luggage"],
      ["Electronics", "/store?category=Electronics"],
    ],
  },
  {
    title: "Your order",
    links: [
      ["Shop all", "/store"],
      ["Cart", "/store/cart"],
      ["Checkout", "/store/checkout"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer" data-dark>
      <div className="wrap footer-top">
        <div className="footer-brand">
          <Link href="/" className="footer-logo" aria-label="GearCircle home">
            <Logo dark />
          </Link>
          <p>Riding gear and motorcycle parts, delivered free across India.</p>
          <a href="https://www.instagram.com/ridecompare26/" target="_blank" rel="noopener noreferrer" className="footer-social" aria-label="GearCircle on Instagram">
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
            <p>Prices include all taxes. Questions about an order? Message us on Instagram.</p>
            <p>© {new Date().getFullYear()} GearCircle. Made for riders in India.</p>
          </div>
        </div>
      </div>
      <div className="footer-giant" aria-hidden>
        GearCircle
      </div>
    </footer>
  );
}
