import { env } from 'cloudflare:workers';
export type Paper={id:string;title:string;authors:string;published:string;updated:string;abstract:string;url:string;category:string;note?:string};
type Library={papers:Paper[];lastSuccess:string|null;lastAttempt:string|null;error:string|null;added:number;nextRetryAt?:string|null};
const key='rsi/library.json';
export async function readLibrary():Promise<Library>{if(!env.BUCKET)throw Error('Cloud storage is not configured'); const o=await env.BUCKET.get(key);return o?await o.json():{papers:[],lastSuccess:null,lastAttempt:null,error:null,added:0};}
async function save(d:Library){await env.BUCKET!.put(key,JSON.stringify(d),{httpMetadata:{contentType:'application/json'}});return d;}
export function classify(s:string){return /recursive self[- ]improv|g[öo]del|self[- ]modif/i.test(s)?'Core RSI':'Related research';}
const clean=(s:string)=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/\s+/g,' ').trim();
const tag=(s:string,n:string)=>clean(s.match(new RegExp('<'+n+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+n+'>'))?.[1]||'');
export function parseFeed(xml:string):Paper[]{if(!xml.includes('<feed'))throw Error('arXiv returned an invalid feed');return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m=>{const s=m[1],raw=tag(s,'id'),id=raw.split('/abs/')[1]?.replace(/v\d+$/,'');if(!id||id==='errors')throw Error('arXiv query failed');const title=tag(s,'title'),abstract=tag(s,'summary');return{id,title,abstract,authors:[...s.matchAll(/<author>([\s\S]*?)<\/author>/g)].map(a=>tag(a[1],'name')).join(', '),published:tag(s,'published'),updated:tag(s,'updated'),url:'https://arxiv.org/abs/'+id,category:classify(title+' '+abstract)};});}
export async function upsert(papers:Paper[]){const d=await readLibrary();const map=new Map(d.papers.map(p=>[p.id,p]));let added=0;for(const p of papers){if(!/^\d{4}\.\d{4,5}$/.test(p.id)||p.url!=='https://arxiv.org/abs/'+p.id||!p.title||!p.abstract||!Number.isFinite(Date.parse(p.updated))||!Number.isFinite(Date.parse(p.published)))throw Error('Invalid paper metadata');if(!map.has(p.id))added++;map.set(p.id,{...map.get(p.id),...p,category:classify(p.title+' '+p.abstract)});}const now=new Date().toISOString();return save({...d,papers:[...map.values()].sort((a,b)=>b.updated.localeCompare(a.updated)),lastAttempt:now,lastSuccess:now,error:null,nextRetryAt:null,added});}
// Each daily cycle starts at 01:00 UTC (09:00 Hong Kong).
export function shouldScheduledRefresh(d:Pick<Library,'lastSuccess'|'nextRetryAt'>, now:number){
  const day=86400000;
  const cycle=Math.floor((now-3600000)/day)*day+3600000;
  if(d.lastSuccess && Date.parse(d.lastSuccess)>=cycle)return false;
  if(d.nextRetryAt && Date.parse(d.nextRetryAt)>now)return false;
  return true;
}
export function retryTime(value:string|null, now:number, attempt:number){
  const seconds=value && /^\d+$/.test(value.trim())?Number(value):NaN;
  const serverTime=Number.isFinite(seconds)?now+seconds*1000:value?Date.parse(value):NaN;
  return new Date(Math.max(attempt+15*60000,Number.isFinite(serverTime)?serverTime:0)).toISOString();
}
export async function refresh(attemptTime=Date.now()){
  const before=await readLibrary();
  if(before.nextRetryAt && Date.parse(before.nextRetryAt)>Date.now()){
    throw Error('Sync is cooling down. Retry after '+before.nextRetryAt);
  }
  let nextRetryAt=retryTime(null,Date.now(),attemptTime);
  try{
    const query='all:"recursive self-improvement" OR all:"recursive self-improving" OR all:"self-evolving agents" OR all:"self-improving agents" OR all:"Godel machine" OR all:"Gödel agent"';
    const u='https://export.arxiv.org/api/query?search_query='+encodeURIComponent(query)+'&start=0&max_results=300&sortBy=lastUpdatedDate&sortOrder=descending';
    const r=await fetch(u,{headers:{'User-Agent':'RSI-Paper-Observatory/1.0'},signal:AbortSignal.timeout(45000)});
    if(!r.ok){
      nextRetryAt=retryTime(r.headers.get('Retry-After'),Date.now(),attemptTime);
      throw Error('arXiv is temporarily unavailable ('+r.status+')');
    }
    return await upsert(parseFeed(await r.text()));
  }catch(e){
    const d=await readLibrary();
    await save({...d,lastAttempt:new Date(attemptTime).toISOString(),error:String(e),nextRetryAt,added:0});
    throw e;
  }
}
