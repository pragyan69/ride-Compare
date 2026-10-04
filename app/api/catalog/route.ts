import { catalog } from '@/lib/store';
import { json } from '@/lib/api';
export async function GET(){try{return json(await catalog());}catch(e){console.error(e);return json({error:'Saved catalog is temporarily unavailable. Showing the last verified starter prices.'},503);}}
