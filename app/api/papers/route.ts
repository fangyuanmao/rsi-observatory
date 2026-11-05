import { readLibrary } from '@/lib/papers';
export async function GET(){try{return Response.json(await readLibrary(),{headers:{'Cache-Control':'no-store'}})}catch(e){return Response.json({error:String(e)},{status:503})}}
