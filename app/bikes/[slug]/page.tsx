import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { categories } from "@/lib/catalog";
import { snapshot } from "@/lib/catalog-server";
import { bikeIndex, bikes, findBike } from "@/lib/bikes";
import styles from "../bikes.module.css";

export const revalidate = 86400; // the catalog refreshes once a night

const pageSize = 48;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateStaticParams() {
  const index = bikeIndex((await snapshot()).products);
  return bikes.filter((b) => index.has(b.slug)).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bike = findBike((await params).slug);
  if (!bike) return {};
  const name = `${bike.make} ${bike.model}`;
  return {
    title: `${name} accessories price in India | RideCompare`,
    description: `Compare prices on crash guards, racks, exhausts, filters and parts for the ${name} across Indian stores.`,
  };
}

export default async function BikePage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const bike = findBike(slug);
  const all = bike && bikeIndex((await snapshot()).products).get(bike.slug);
  if (!bike || !all) notFound();

  const counts = new Map<string, number>();
  for (const p of all) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  const cats = categories.filter((c) => counts.has(c));

  const wanted = first(sp.category);
  const category = wanted && counts.has(wanted) ? wanted : undefined;
  const rows = (category ? all.filter((p) => p.category === category) : all).toSorted((a, b) => b.offers.length - a.offers.length);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(first(sp.page) ?? "", 10) || 1));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);

  const href = (c: string | undefined, p = 1) => {
    const q = new URLSearchParams();
    if (c) q.set("category", c);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/bikes/${bike.slug}${s ? `?${s}` : ""}`;
  };

  return (
    <main className="wrap">
      <section className="hero hero-small">
        <Link className={styles.back} href="/bikes">
          <ChevronLeft size={16} aria-hidden /> All bikes
        </Link>
        <h1>
          {bike.make} {bike.model} accessories
        </h1>
        <p>
          {all.length.toLocaleString("en-IN")} {all.length === 1 ? "product" : "products"} listed for this bike. Years and variants differ, so check the
          fitment notes at the store before you buy.
        </p>
      </section>

      {cats.length > 1 && (
        <nav className={styles.pills} aria-label="Categories">
          <Link href={href(undefined)} aria-current={!category ? "page" : undefined}>
            All <small>{all.length.toLocaleString("en-IN")}</small>
          </Link>
          {cats.map((c) => (
            <Link key={c} href={href(c)} aria-current={category === c ? "page" : undefined}>
              {c} <small>{counts.get(c)?.toLocaleString("en-IN")}</small>
            </Link>
          ))}
        </nav>
      )}

      <p className={styles.count}>
        <strong>{rows.length.toLocaleString("en-IN")}</strong> {rows.length === 1 ? "product" : "products"}
        {category && <> in {category}</>}
      </p>

      <div className="grid">
        {shown.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>

      {totalPages > 1 && (
        <nav className={`pager ${styles.pager}`} aria-label="Pages">
          {page > 1 ? (
            <Link href={href(category, page - 1)} aria-label="Previous page" rel="prev">
              <ChevronLeft size={18} />
            </Link>
          ) : (
            <span aria-hidden className={styles.off}>
              <ChevronLeft size={18} />
            </span>
          )}
          <span>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={href(category, page + 1)} aria-label="Next page" rel="next">
              <ChevronRight size={18} />
            </Link>
          ) : (
            <span aria-hidden className={styles.off}>
              <ChevronRight size={18} />
            </span>
          )}
        </nav>
      )}
    </main>
  );
}
