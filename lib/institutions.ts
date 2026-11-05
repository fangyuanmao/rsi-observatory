export type Institutions = {names:string[];source:string;checkedAt:string};
function decode(value:string){return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(match,code:string)=>{if(code[0]==='#'){const n=code[1].toLowerCase()==='x'?parseInt(code.slice(2),16):parseInt(code.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):match}return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '} as Record<string,string>)[code.toLowerCase()]||match})}
// Only explicit affiliation elements are accepted; never infer from author names or emails.
export async function parseInstitutions(html:string):Promise<string[]> {
  const values:string[]=[];
  const handler=()=>{let value='';return {element(el:Element){value='';el.onEndTag(()=>{values.push(value);value=''})},text(chunk:Text){value+=chunk.text}}};
  const rewriter=new HTMLRewriter()
    .on('.ltx_authors .ltx_role_affiliation',handler())
    .on('.ltx_authors .ltx_affiliation',handler())
    .on('meta[name="citation_author_institution"]',{element(el){const value=el.getAttribute('content');if(value)values.push(value)}});
  await rewriter.transform(new Response(html)).text();
  return [...new Set(values.map(s=>decode(s).replace(/^\s*Affiliation\s*:\s*/i,'').replace(/\s+/g,' ').trim()).filter(s=>s.length>2&&s.length<600&&!s.includes('@')))];
}
