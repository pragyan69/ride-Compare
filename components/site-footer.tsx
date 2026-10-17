import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="wrap">
      <div className="site-footer">
        <Logo />
        <p>
          Prices come from each store&apos;s public listings and are checked every night. Shipping, coupons and bank offers aren&apos;t included, so
          confirm the final price at the store.
        </p>
      </div>
    </footer>
  );
}
