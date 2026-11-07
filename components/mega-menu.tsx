"use client";
import { Suspense, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Menu, MenuLink } from "@/lib/menu";

export type NavItem = { href: string; label: string; category?: string; brands?: true };

const brandHref = (b: string) => `/store?${new URLSearchParams({ brand: b })}`;
const letterOf = (name: string) => (/^[a-z]/i.test(name) ? name[0].toUpperCase() : "#");

type Props = { nav: NavItem[]; menu: Menu | null };

/** Desktop section bar. Hovering a section opens a full-width panel, Culture Circle style. */
export function MegaNav(props: Props) {
  // Pre-built pages have no query string, so they render the bar without a highlighted section.
  return (
    <Suspense fallback={<Bar {...props} params={new URLSearchParams()} />}>
      <WithParams {...props} />
    </Suspense>
  );
}

function WithParams(props: Props) {
  const params = useSearchParams();
  return <Bar {...props} params={params} />;
}

function Bar({ nav, menu, params }: Props & { params: URLSearchParams | ReturnType<typeof useSearchParams> }) {
  const path = usePathname();
  // The panel remembers which page it was opened on, so navigating closes it.
  const here = `${path}?${params}`;
  const [state, setState] = useState<{ key: string; at: string } | null>(null);
  const open = state?.at === here ? state.key : null;
  const setOpen = (key: string | null) => setState(key ? { key, at: here } : null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A short delay stops the panel flashing open as the pointer crosses the bar.
  const hover = (key: string | null) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(key), key ? 120 : 160);
  };
  const current = (it: NavItem) =>
    path.startsWith("/store") && path !== "/store/cart" && (it.category ? params.get("category") === it.category : !it.brands && !params.get("category"));
  const item = nav.find((n) => n.href === open);

  return (
    <nav className="cat-nav" aria-label="Sections" onMouseLeave={() => hover(null)}>
      <div className="wrap">
        {nav.map((it) => {
          const hasPanel = Boolean(menu && (it.brands || (it.category && menu.categories[it.category])));
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={current(it) ? "page" : undefined}
              aria-expanded={hasPanel ? open === it.href : undefined}
              data-open={open === it.href || undefined}
              onMouseEnter={() => hover(hasPanel ? it.href : null)}
              onFocus={() => hasPanel && setOpen(it.href)}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
      {menu && item && (
        <div className="mega" onMouseEnter={() => clearTimeout(timer.current)}>
          <div className="wrap">{item.brands ? <BrandsPanel menu={menu} /> : item.category ? <CategoryPanel menu={menu} item={item} /> : null}</div>
        </div>
      )}
    </nav>
  );
}

function BrandsPanel({ menu }: { menu: Menu }) {
  const list = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => {
    const m = new Map<string, Menu["brands"]>();
    for (const b of menu.brands) {
      const k = letterOf(b.name);
      m.set(k, [...(m.get(k) ?? []), b]);
    }
    return [...m].sort(([a], [b]) => (a === "#" ? -1 : b === "#" ? 1 : a.localeCompare(b)));
  }, [menu.brands]);
  const jump = (k: string) => list.current?.querySelector<HTMLElement>(`[data-letter="${k}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" });

  return (
    <div className="mega-brands">
      <div className="mega-az">
        <div className="mega-az-list" ref={list}>
          {groups.map(([k, bs]) => (
            <div key={k} data-letter={k}>
              <h3>{k}</h3>
              {bs.map((b) => (
                <Link key={b.name} href={brandHref(b.name)} className="mega-az-brand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {b.logo ? <img src={b.logo} alt="" loading="lazy" /> : <i aria-hidden>{b.name[0]}</i>}
                  {b.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="mega-az-index" aria-label="Jump to letter">
          {groups.map(([k]) => (
            <button key={k} type="button" onClick={() => jump(k)}>
              {k}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mega-title">Featured brands</h3>
        <div className="mega-circles">
          {menu.featured.map((b) => (
            <Link key={b.name} href={brandHref(b.name)} title={b.name} aria-label={b.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b.logo ? <img src={b.logo} alt="" loading="lazy" /> : <span>{b.name}</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryPanel({ menu, item }: { menu: Menu; item: NavItem }) {
  const c = menu.categories[item.category!];
  const cols = [
    { title: "Top brands", links: c.brands },
    { title: "Shop by price", links: c.prices },
    c.bikes.length > 0 ? { title: "Fits your bike", links: c.bikes } : c.sizes.length > 0 && { title: "Shop by size", links: c.sizes },
  ].filter((x): x is { title: string; links: MenuLink[] } => Boolean(x));
  return (
    <div className="mega-cat">
      <div className="mega-cols">
        {cols.map((col) => (
          <div key={col.title}>
            <h3 className="mega-title">{col.title}</h3>
            {col.links.map((l) =>
              l.logo !== undefined ? (
                <Link key={l.href} href={l.href} className="mega-az-brand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {l.logo ? <img src={l.logo} alt="" loading="lazy" /> : <i aria-hidden>{l.label[0]}</i>}
                  {l.label}
                </Link>
              ) : (
                <Link key={l.href} href={l.href}>
                  {l.label}
                </Link>
              ),
            )}
          </div>
        ))}
      </div>
      <Link href={item.href} className="mega-all">
        View all {item.label.toLowerCase()} ({c.count.toLocaleString("en-IN")})
      </Link>
    </div>
  );
}
