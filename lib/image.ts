/** Store photos are often 1500-3000px wide. Shopify's CDN resizes on request; other stores go through
 *  wsrv.nl, a free resizing cache. If that fails we fall back to the store's original photo. */
export function sized(src: string, width: number) {
  if (/cdn\.shopify\.com|\/cdn\/shop\//.test(src)) {
    const url = new URL(src);
    url.searchParams.set("width", String(width));
    return url.toString();
  }
  // Only stores that serve large originals and allow wsrv to fetch them (Big Bad Bikes blocks it; its photos are small).
  if (/customelements\.in|helmetracing\.in/.test(src)) return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&output=webp&q=75`;
  return src;
}
