# Unfinished: Cloudflare crawler, search API and 3D fit page

These files came in with commit 9092426 (20 Oct 2026). They were written for a Cloudflare Workers + D1 version of the app and depend on code that isn't in this repo yet:

- `lib/db` functions: `getProduct`, `searchProducts`, `suggest`, `productsByIds`, `offersByProducts`, `brandDirectory`, `storeStatus`, `stats`, `OfferRow`, `ProductRow`
- `lib/kit` exports: `KitSet`, `PIECE_LABEL`
- Cloudflare D1 types (`D1Database`, `D1PreparedStatement`) and `cloudflare:workers`
- the `three` package (3D fit page)

Every Vercel build failed while they sat in `app/`, so they were moved here unchanged on 23 Oct 2026 to unblock deploys. The paths below mirror their original locations: move a file back once its dependencies exist.
