import {env} from 'cloudflare:workers';
import {refresh} from '@/lib/papers';
export async function POST(req:Request){
  if(!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length<32)return Response.json({error:'Manual refresh is not configured. Set an ADMIN_TOKEN secret of at least 32 characters in Cloudflare.'},{status:503});
  if(req.headers.get('authorization')!==`Bearer ${env.ADMIN_TOKEN}`)return Response.json({error:'Invalid administrator token.'},{status:401});
  if(req.headers.get('sec-fetch-site')==='cross-site')return Response.json({error:'Cross-site refresh is not allowed.'},{status:403});
  try{const d=await refresh();return Response.json({papers:d.papers.length,added:d.added,lastSuccess:d.lastSuccess})}
  catch{return Response.json({error:'The arXiv sync failed. Existing papers have been retained. Please try again later.'},{status:502})}
}
