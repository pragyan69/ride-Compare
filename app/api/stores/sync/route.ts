import { catalog,importFeed } from '@/lib/store';
import { fetchJson,safeUrl } from '@/lib/feed';
import { guard,body,json,failure } from '@/lib/api';
export async function POST(req:Request){try{await guard(req);const input=await body(req);const store=(await catalog()).stores.find(s=>s.id===input.storeId);if(!store?.feedUrl)throw new Error('This retailer has no feed URL. Import its JSON feed instead.');const feed=safeUrl(store.feedUrl);if(feed.origin!==safeUrl(store.website).origin)throw new Error('For safety, host the feed on the retailer website domain or import the JSON file.');return json({imported:await importFeed(store,await fetchJson(feed.href))});}catch(e){return failure(e);}}
