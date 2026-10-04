import { catalog,importFeed } from '@/lib/store';
import { guard,body,json,failure } from '@/lib/api';
export async function POST(req:Request){try{await guard(req);const input=await body(req);const store=(await catalog()).stores.find(s=>s.id===input.storeId);if(!store)throw new Error('Choose a connected retailer first.');return json({imported:await importFeed(store,input.feed)});}catch(e){return failure(e);}}
