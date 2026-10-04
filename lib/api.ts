import { ZodError } from 'zod';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export function failure(e:unknown){console.error('RideCompare request failed',e instanceof Error?e.message:e);return json({error:e instanceof ZodError?e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).slice(0,3).join(' '):e instanceof Error?e.message:'Something went wrong. Please try again.'},400);}
export async function guard(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new Error('This request must originate from this site.');const user=await getChatGPTUser();if(!user)throw new Error('Sign in to connect stores or refresh saved prices.');}
export async function body(req:Request){const text=await req.text();if(text.length>1024*1024)throw new Error('Use a feed smaller than 1 MB.');try{return JSON.parse(text)}catch{throw new Error('Enter valid JSON data.')}}
