# RideCompare India

Price comparison for motorcycle helmets, riding gear, luggage and bike accessories across Indian online stores. Prices are read from each store's public catalog, matched by exact brand, model and variant (or barcode), stored in Cloudflare D1 and refreshed automatically.

## How it is built

- **Next.js app on Cloudflare Workers** (Sites Vinext starter). Pages are server-rendered from D1: home, `/gear` (search and filters), `/product/[id]` (all store prices, MRP saving, price history, brand-mixed "complete the set" kits and add-ons), `/build` (budget kit builder), `/fit` (3D fit check for jackets and pants), `/brands`, `/deals`, `/bikes` (shop by motorcycle), `/compare` (side-by-side, kept in the browser).
- **Collection engine in the Worker** (`lib/refresh.ts`, `lib/ingest.ts`). Retailer adapters in `lib/adapters/` read public catalog endpoints: Shopify `products.json`, WooCommerce Store API, Magento GraphQL, the BikeGear OpenCart listing and the KYT India JSON API. `crawler/sites.json` is the store registry (platform, brand-owned flag, blocked stores with the reason).
- **Rules** in `lib/rules.ts`: categories, brand normalisation (`crawler/brand-aliases.json`), bike-model detection, product identity.
- **Schedule**: `vite.config.ts` declares a cron trigger every 5 minutes; `build/sites-worker.ts` runs the engine with a page budget each time. A store is re-read once its last successful pass is older than 2 hours (`REFRESH_INTERVAL_MINUTES`), and the budget per firing is `REFRESH_PAGE_BUDGET` (default 40 pages). Stores that need more pages than one firing allows resume where they stopped, so the whole catalog turns over continuously. If the host does not run cron triggers, `.github/workflows/refresh.yml` can call `POST /api/refresh` with a `REFRESH_TOKEN` instead.

## Run locally

Use Node 22.13+.

```sh
npm ci
npm run dev                      # http://127.0.0.1:5173
node scripts/refresh-local.mjs   # collects every store into the local D1 (takes a while the first time)
```

The dev server creates the D1 tables itself (`lib/schema.ts`); the same statements are in `drizzle/` for the hosted database. `scripts/refresh-local.mjs --stores rynox,axor --pages 40` refreshes selected stores. The owner endpoints need the local sign-in (`/signin-with-chatgpt?return_to=/`):

- `POST /api/refresh` body `{ "pages": 40, "stores": ["axor"], "force": false }` — run the engine now.
- `GET /api/status` — per-store state (status, offer count, pages, notes, last success) and recent runs. This is the owner's coverage view; nothing about collection is shown publicly.
- `POST /api/stores`, `POST /api/import`, `POST /api/stores/sync` — add a retailer feed manually (`public/feed-example.json`).

## Adding a store

1. Find its public catalog: `https://store/products.json?limit=1` (Shopify), `https://store/wp-json/wc/store/v1/products?per_page=1` (WooCommerce), `POST https://store/graphql` (Magento). Other platforms need an adapter in `lib/adapters/` that implements `Adapter` from `lib/adapters/types.ts`.
2. Add it to `crawler/sites.json` with `id`, `name`, `url`, `platform`, and `brand` when the store sells only its own brand. Add the store's own name to `crawler/brand-aliases.json` as `"Unspecified"` so it is never shown as a brand.
3. Run `node scripts/refresh-local.mjs --stores <id>` and check `/api/status`.

Stores that return HTTP 403 to automated requests (Amazon, Flipkart, Royal Enfield) are listed with `enabled: false` and are skipped.

## Shopper tools

- **Kit builder (`/build`)**: budget + riding style (track, touring, urban) + the pieces wanted. `lib/kit.ts` splits the budget by style weights, scores candidates per piece (style keywords, certification marks, brand tier, stores, stock) and composes four sets with different objectives. Every set mixes brands; a piece is never empty, and when nothing fits the nearest sets are shown with the overshoot. One piece selected gives ranked picks within budget plus the closest above it.
- **Complete the set** on product pages uses the same engine with the product as the fixed anchor and an implied kit budget derived from its price.
- **Fit check (`/fit`)**: `lib/fit.ts` holds the size charts and per-zone verdicts; `components/fit-scene.ts` builds the three.js mannequin and garment shell on the client only (loaded on demand, never bundled into the Worker). Measurements stay in `localStorage` (`rc-body`). Jackets and pants link to it with `?product=<id>`.

## Data rules

- Every card is one observed variant; other sizes and colours stay on the store page.
- Products are grouped only on an exact brand + normalised name + variant match, or a validated GTIN. Unbranded listings stay store-specific.
- Within a store, duplicate listings of the same variant collapse to one offer (the cheapest). When a store's pass completes, offers it no longer lists are removed.
- "Discount" is measured against the MRP the store publishes (`compare_at_price`, `regular_price`). Shipping and coupons are never assumed.
- Price history records every change per store and is drawn on the product page.

## Checks

```sh
npx tsc --noEmit
npx eslint app lib components
node --test tests/feed.test.mjs
.venv/bin/python -m unittest discover -s tests            # Python crawler rules
BASE_URL=http://127.0.0.1:5173 .venv/bin/python tests/browser_qa.py   # browser checks against a running preview
```

## Offline crawler (optional)

`crawler/crawl.py` and `crawler/export.py` are the original Python Playwright collector. They are no longer needed for the site but remain useful for checking a store's coverage offline; their output goes to `data/crawl/` (ignored).

## Publish

Reuse the project ID in `.openai/hosting.json` and the Sites source/build/publish workflow. D1 migrations in `drizzle/` are applied by Sites when published; the Worker also creates missing tables on first use. After publishing, the cron trigger fills the catalog within a few hours; `POST /api/refresh` as the signed-in owner speeds up the first fill.
# ride-Compare
