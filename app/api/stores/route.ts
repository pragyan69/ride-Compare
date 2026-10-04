import { catalog,saveStore } from '@/lib/store';
import { storeSchema,safeUrl } from '@/lib/feed';
import { guard,body,json,failure } from '@/lib/api';
export async function POST(req:Request){try{await guard(req);const input=storeSchema.parse(await body(req));const website=safeUrl(input.website).origin;const current=await catalog();if(current.stores.some(s=>new URL(s.website).hostname===new URL(website).hostname))throw new Error('This retailer is already connected. Select it to import more offers.');const retailer={id:crypto.randomUUID(),name:input.name,website,feedUrl:input.feedUrl||undefined};await saveStore(retailer);return json(retailer,201);}catch(e){return failure(e);}}
