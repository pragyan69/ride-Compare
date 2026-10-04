# RideCompare India

Motorcycle accessories and riding gear catalog, with INR offers, categories, a searchable brand directory, exact-variant comparisons, and per-retailer collection status.

## Run locally

Use Node 22.13+ and Python 3.12+. Install JavaScript dependencies with `npm ci`, then run `npm run dev` and open the printed loopback URL. The app uses the Sites Vinext starter and Cloudflare D1. Local sign-in is available at `/signin-with-chatgpt?return_to=/`; production sign-in is handled by Sites.

## Collect retailer catalogs with Python Playwright

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r crawler/requirements.txt
.venv/bin/python -m playwright install chromium
.venv/bin/python crawler/crawl.py --max-feed-pages 200 --max-html-pages 120
.venv/bin/python crawler/export.py
```

The 21 retailer URLs are in `crawler/sites.json`. Use `--sites rynox,axor` to refresh selected retailers, `--resume` to retain existing checkpoints, or `--browser /absolute/path/to/chromium` to use an installed browser. `--max-seconds` bounds each store's collection time; the default is 1,200 seconds. Each retailer gets its own checkpoint in the ignored `data/crawl/raw/` directory. Re-export and republish after a crawl to update the hosted catalog. The website's reload button reloads that published snapshot; it does not start Python on the hosting server.

The crawler uses Playwright's request client for public catalog feeds and Chromium for script-rendered link discovery. It checks robots.txt, uses one-second per-host pacing or the longer declared crawl delay, and stops on restrictions. It does not sign in, solve CAPTCHAs, or rotate proxies. Public Shopify and WooCommerce feeds are preferred; HTML/JSON-LD parsers cover remaining stores. Slickshop uses a dedicated parser for its public storefront cards; five consecutive brand-page restrictions stop that branch. Its retailer-declared brand directory is shown separately on the source card.

## Coverage and data quality

- `data/crawl/report.json` records every attempted source, timestamps, page counts, and limitations.
- `public/data/catalog.json` contains the published product snapshot; `public/data/brands.json` contains all named brands represented in that snapshot.
- `lib/crawl-index.json` contains compact identities used to validate imported comparison offers.
- Every card represents one observed variant, not every available size and colour. Where a source does not expose a variant, the card asks the shopper to check it at the store.
- Prices are snapshots in INR. Unknown shipping and availability stay unknown. Prices older than 24 hours and offers without confirmed stock cannot receive a lowest-price badge.
- Only exact brand/name/variant matches or validated, nonconflicting barcodes are grouped. A single-store listing is not claimed to be a market-wide best offer.
- Categories use title rules and brands use retailer metadata plus explicit leading brand names. Unnamed products remain “Unspecified”; car-only parts, gift cards and toy models are excluded. The brand directory reflects collected listings, not every brand sold in India.
- An exhausted public feed does not prove complete website coverage. Amazon and Royal Enfield (including the corrected royalenfield.store/in/en/riding URL) restricted this crawl; SMK exposed no extractable INR offers. Flipkart, Store4Riders and Slickshop have partial coverage.

Approved retailer feeds can be imported through “Add a store.” The JSON format is in `public/feed-example.json`; imports require sign-in, INR currency, positive prices, same-retailer product URLs, and consistent product variants. D1 persists added stores and imported offers.

## Checks

```sh
.venv/bin/python -m unittest discover -s tests
node --test tests/feed.test.mjs
npx tsc --noEmit
```

Run browser checks against a running local preview with `BROWSER_EXECUTABLE=/absolute/path/to/chromium .venv/bin/python tests/browser_qa.py`. These cover catalog search, a multi-store comparison, brand filtering, source coverage, and the mobile filter dialog. The optional WebMCP check validates registration and execution against a test shim.

## Publish

Reuse the project ID in `.openai/hosting.json` and the Sites source/build/publish workflow. The crawl snapshot is a static asset; the Worker hosts the UI and authenticated feed APIs. D1 migrations in `drizzle/` are applied by Sites when published. Keep `.venv`, local database state, raw checkpoints, and credentials out of the source archive.
