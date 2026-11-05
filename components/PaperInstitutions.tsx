'use client';
import {useEffect,useRef,useState} from 'react';
import type {Institutions} from '@/lib/institutions';
// Bound source lookups even when many papers enter the viewport at once.
const queue:(()=>Promise<void>)[]=[];let active=0;
function drain(){while(active<2&&queue.length){active++;queue.shift()!().finally(()=>{active--;drain()})}}
export default function PaperInstitutions({paperId,updated}:{paperId:string;updated:string}){
  const root=useRef<HTMLDivElement>(null);
  const [data,setData]=useState<Institutions|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[loading,setLoading]=useState(false);
  useEffect(()=>{let cancelled=false,started=false;setData(null);setError('');setLoading(false);
    function start(){if(started)return;started=true;setLoading(true);queue.push(async()=>{if(cancelled)return;try{const r=await fetch('/api/institutions?id='+encodeURIComponent(paperId));const d=await r.json() as Institutions & {error?:string};if(!r.ok)throw Error(d.error||'Could not load affiliations');if(!cancelled)setData(d)}catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Could not load affiliations')}finally{if(!cancelled)setLoading(false)}});drain()}
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){start();observer.disconnect()}},{rootMargin:'100px'});if(root.current)observer.observe(root.current);return()=>{cancelled=true;observer.disconnect()};
  },[paperId,updated,attempt]);
  return <div ref={root} className="paper-institutions"><span className="institution-label">Institutions</span>{data?.names.length?<><span className="institution-names">{data.names.join('; ')}</span><a href={data.source} target="_blank" rel="noreferrer" title="View affiliations in the original paper">Source ↗</a></>:<span className="institution-pending">{loading?'Loading affiliations…':'Affiliations unavailable'}</span>}{data&&!data.names.length&&<span className="institution-explanation">No structured affiliation found in the HTML version · <a href={'https://arxiv.org/pdf/'+paperId} target="_blank" rel="noreferrer">View PDF ↗</a></span>}{error&&<span className="institution-explanation" role="status">{error}<button type="button" onClick={()=>setAttempt(n=>n+1)}>Retry</button></span>}</div>;
}
