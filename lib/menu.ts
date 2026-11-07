import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { importedCards } from "./shop";

export const PRICES = [
  { value: "0-5000", label: "Under ₹5,000", min: 0, max: 5000 },
  { value: "5000-10000", label: "₹5,000 to ₹10,000", min: 5000, max: 10000 },
  { value: "10000-25000", label: "₹10,000 to ₹25,000", min: 10000, max: 25000 },
  { value: "25000-50000", label: "₹25,000 to ₹50,000", min: 25000, max: 50000 },
  { value: "50000-100000", label: "₹50,000 to ₹1,00,000", min: 50000, max: 100000 },
  { value: "100000-", label: "Over ₹1,00,000", min: 100000, max: Infinity },
];

export type MenuLink = { label: string; href: string; logo?: string | null };
export type CategoryMenu = { category: string; brands: MenuLink[]; bikes: MenuLink[]; sizes: MenuLink[]; prices: MenuLink[]; count: number };
export type MenuBrand = { name: string; count: number; logo: string | null };
export type Menu = { brands: MenuBrand[]; featured: MenuBrand[]; categories: Record<string, CategoryMenu> };

/** A brand's logo in public/brand-logos, named by slug (e.g. "hepco-becker.webp"), if we have one. */
const logoFor = (brand: string) => {
  const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return existsSync(path.join(process.cwd(), "public/brand-logos", `${slug}.webp`)) ? `/brand-logos/${slug}.webp` : null;
};

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const sizeRank = (v: string) => (SIZE_ORDER.includes(v) ? SIZE_ORDER.indexOf(v) : 100 + (parseInt(v.replace(/\D/g, ""), 10) || 0));
const top = (m: Map<string, number>, n: number) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const q = (params: Record<string, string>) => `/store?${new URLSearchParams(params)}`;

/** Data for the header's mega menu: brands A to Z, and per category its top brands, bikes and price bands. */
export async function buildMenu(): Promise<Menu> {
  const cards = await importedCards();
  const brandCount = new Map<string, number>();
  const per = new Map<string, { brands: Map<string, number>; bikes: Map<string, number>; sizes: Map<string, number>; prices: number[] }>();
  for (const c of cards) {
    bump(brandCount, c.brand);
    let p = per.get(c.category);
    if (!p) per.set(c.category, (p = { brands: new Map(), bikes: new Map(), sizes: new Map(), prices: [] }));
    bump(p.brands, c.brand);
    for (const b of c.bikes) bump(p.bikes, b);
    for (const z of c.sizes) bump(p.sizes, z);
    p.prices.push(c.price);
  }
  const categories: Record<string, CategoryMenu> = {};
  for (const [category, p] of per) {
    categories[category] = {
      category,
      count: p.prices.length,
      brands: top(p.brands, 12).map((b) => ({ label: b, href: q({ category, brand: b }), logo: logoFor(b) })),
      bikes: top(p.bikes, 12).map((b) => ({ label: b, href: q({ category, bike: b }) })),
      // Letter sizes in wearing order; numeric sizes (boots, gloves) by number.
      sizes: top(p.sizes, 12)
        .sort((a, b) => sizeRank(a) - sizeRank(b))
        .map((z) => ({ label: z, href: q({ category, size: z }) })),
      prices: PRICES.filter((r) => p.prices.some((x) => x >= r.min && x < r.max)).map((r) => ({ label: r.label, href: q({ category, price: r.value }) })),
    };
  }
  const brands = [...brandCount].map(([name, count]) => ({ name, count, logo: logoFor(name) }));
  return {
    brands: [...brands].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })),
    // The biggest brands, those with a logo first so the grid reads like Culture Circle's.
    featured: [...brands].sort((a, b) => Number(Boolean(b.logo)) - Number(Boolean(a.logo)) || b.count - a.count).slice(0, 24),
    categories,
  };
}
