import {env} from 'cloudflare:workers';
import {readLibrary} from '@/lib/papers';
import {parseInstitutions,type Institutions} from '@/lib/institutions';
export async function GET(req:Request){
  const id=new URL(req.url).searchParams.get('id')||'';
  if(!/^\d{4}\.\d{4,5}$/.test(id))return Response.json({error:'Invalid paper ID'},{status:400});
  try{
    const paper=(await readLibrary()).papers.find(p=>p.id===id);
    if(!paper)return Response.json({error:'Paper not found in the library'},{status:404});
    const key=`rsi/institutions/${id}/${encodeURIComponent(paper.updated)}.json`;
    const cached=await env.BUCKET!.get(key);
    if(cached){const d=await cached.json<Institutions>();const ttl=d.names.length?30*86400000:86400000;if(Date.now()-Date.parse(d.checkedAt)<ttl)return Response.json(d);}
    const source=`https://arxiv.org/html/${id}`;
    const response=await fetch(source,{headers:{'User-Agent':'RSI-Paper-Observatory/1.0'},signal:AbortSignal.timeout(20000)});
    if(!response.ok&&response.status!==404)return Response.json({error:'The affiliation source is temporarily unavailable. Please try again later.'},{status:502});
    const names=response.status===404?[]:await parseInstitutions(await response.text());
    const result:Institutions={names,source,checkedAt:new Date().toISOString()};
    await env.BUCKET!.put(key,JSON.stringify(result),{httpMetadata:{contentType:'application/json'}});
    return Response.json(result);
  }catch{return Response.json({error:'Affiliations could not be loaded. Please try again later.'},{status:502});}
}
