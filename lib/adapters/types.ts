/** Contract every retailer adapter implements. The engine owns categorisation,
 * brand normalisation, deduplication and storage; adapters only turn one page
 * of a public retailer catalog into raw rows. */

export type Site = {
  id: string;
  name: string;
  url: string;
  /** shopify | woocommerce | magento-graphql | opencart | kyt | feed | blocked */
  platform: string;
  /** Brand sold by a brand-owned store; used when the feed has no vendor. */
  brand?: string;
  start?: string;
  kind?: string;
  /** Items per page the adapter should request, when the platform allows it. */
  pageSize?: number;
  /** false disables automatic collection (store stays listed as blocked). */
  enabled?: boolean;
  note?: string;
};

export type RawRow = {
  /** Fixed catalog key supplied by a retailer feed import; adapters leave it unset. */
  id?: string;
  /** Stable identifier at the source (product id, sku or hash of the URL). */
  sourceId: string;
  name: string;
  /** Raw vendor/brand text; may be empty. */
  brand: string;
  /** Optional category hint such as a product type or category path. */
  kind?: string;
  /** Optional tags text that helps categorisation. */
  tags?: string;
  /** Observed variant label, "Standard" when the product has none. */
  variant: string;
  image: string;
  /** Current selling price in INR. */
  price: number;
  /** List price / MRP when the retailer exposes one. */
  mrp: number | null;
  inStock: boolean | null;
  url: string;
  variantId?: string | null;
  variantCount?: number | null;
  barcode?: string;
};

export type PageResult = {
  rows: RawRow[];
  /** true when this was the last page. */
  done: boolean;
  /** Retailer-reported total, when known. */
  total?: number | null;
  note?: string;
};

export type FetchedText = { status: number; text: string; headers: Headers };

export type AdapterContext = {
  /** Paced, robots-aware GET. Throws Blocked on 401/403/429 or robots denial. */
  fetchText(url: string, init?: RequestInit): Promise<FetchedText>;
  /** Same as fetchText but parses JSON; throws on invalid JSON. */
  fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<{ status: number; data: T; headers: Headers }>;
  log(message: string): void;
};

export type Adapter = {
  platform: string;
  /** Pages are 1-based. Adapters must be stateless between calls; any cursor
   * they need must be derivable from the page number. */
  fetchPage(site: Site, page: number, ctx: AdapterContext): Promise<PageResult>;
};

export class Blocked extends Error {}
