import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { money, rankedOffers, type Product } from "@/lib/catalog";
import { findProduct } from "@/lib/catalog-server";
import kits from "@/lib/reel-kits.json";
import styles from "./page.module.css";

export const revalidate = 21600;

type Kit = { code: string; title: string; premium: number | null; cover: string | null; items: { slot: string; label: string; id: string; alt?: string }[] };
type Props = { params: Promise<{ code: string }> };

const allKits: Record<string, Kit> = kits;

export function generateStaticParams() {
  return Object.keys(allKits).map((code) => ({ code }));
}

async function load(params: Props["params"]) {
  const kit = allKits[(await params).code.toLowerCase()];
  if (!kit) notFound();
  const pieces = await Promise.all(
    kit.items.map(async (i) => ({ ...i, product: await findProduct(i.id), step: i.alt ? await findProduct(i.alt) : undefined })),
  );
  return { kit, pieces: pieces.filter((p): p is typeof p & { product: Product } => p.product !== undefined) };
}

const lowest = (p: Product) => rankedOffers(p)[0]?.price ?? 0;
/** Store titles often already start with the brand ("SMK Retro Seven"); don't say it twice. */
const fullName = (p: Product) => (p.name.toLowerCase().startsWith(p.brand.toLowerCase()) ? p.name : `${p.brand} ${p.name}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kit } = await load(params);
  return { title: `${kit.title}: the full kit | RideCompare`, description: `Every piece of ${kit.title}, with the lowest price across Indian riding gear stores.` };
}

export default async function KitPage({ params }: Props) {
  const { kit, pieces } = await load(params);
  const total = pieces.reduce((sum, p) => sum + lowest(p.product), 0);
  const build = `/build?budget=${Math.ceil(total / 1000) * 1000}&pieces=${["Helmet", "Jacket", "Gloves", "Pants", "Boots"].join(",")}`;

  return (
    <main className="wrap">
      <section className={styles.top}>
        {kit.cover && (
          <div className={styles.cover}>
            <Image src={kit.cover} alt={`${kit.title} reel cover`} width={360} height={640} priority />
          </div>
        )}
        <div className={styles.intro}>
          <p className={styles.kicker}>From the reel · comment {kit.code}</p>
          <h1>{kit.title}</h1>
          <p className={styles.lede}>Every piece from the video, at tonight&apos;s lowest price across Indian gear stores. Tap any piece to compare stores.</p>
          <dl className={styles.totals}>
            <div>
              <dt>Full kit</dt>
              <dd>{money(total)}</dd>
            </div>
            {kit.premium && kit.premium > total && (
              <div>
                <dt>Premium version</dt>
                <dd className={styles.premium}>{money(kit.premium)}</dd>
              </div>
            )}
          </dl>
          <div className={styles.actions}>
            <Button asChild size="lg"><a href="#pieces">See the pieces</a></Button>
            <Button asChild variant="outline" size="lg"><Link href={build}>Build your own kit</Link></Button>
          </div>
        </div>
      </section>

      <section id="pieces" className={styles.pieces}>
        {pieces.map((p) => (
          <div key={p.slot} className={styles.piece}>
            <h2>{p.label}</h2>
            <ProductCard p={p.product} />
            {p.step && (
              <div className={styles.step}>
                <span>Or step up</span>
                <Link href={`/product/${encodeURIComponent(p.step.id)}`}>
                  {fullName(p.step)} · {money(lowest(p.step))}
                </Link>
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
