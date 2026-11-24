// Resolve live literal directory references and collect dynamic/shader/asset review inventory.
import {readFileSync,writeFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const [root,census,out]=process.argv.slice(2);
const d=JSON.parse(readFileSync(census,'utf8')),live=new Set(d.graphs.production);
const unresolved=d.unresolvedLiteralReferences.filter(r=>live.has(r.owner)).map(r=>({...r,kind:existsSync(resolve(root,r.dest))?(statSync(resolve(root,r.dest)).isDirectory()?'existing directory':'existing file'):'missing'}));
const entries=[];
for(const p of live){
 if(!/\.(?:js|mjs|html|css)$/.test(p))continue;
 const source=readFileSync(resolve(root,p),'utf8');
 const lines=source.split('\n');
 const hits=[];
 for(let i=0;i<lines.length;i++){
  const l=lines[i],k=[];
  if(/import\s*\(|new\s+URL\s*\(|\bfetch\s*\(|\.load(?:Async)?\s*\(|\.parse\s*\(/.test(l))k.push('load');
  if(/URLSearchParams|searchParams\./.test(l))k.push('url');
  if(/onBeforeCompile|customProgramCacheKey|ShaderMaterial|glslVersion|#include\s*</.test(l))k.push('shader');
  if(/(?:assets\/|\.glb\b|\.gltf\b|\.png\b|\.webp\b|\.css\b)/.test(l))k.push('asset');
  if(k.length)hits.push({line:i+1,kinds:k,source:l.trim().slice(0,300)});
 }
 if(hits.length)entries.push({path:p,hits});
}
const count={};for(const e of entries)for(const h of e.hits)for(const k of h.kinds)count[k]=(count[k]||0)+1;
const report={commit:d.commit,unresolved,counts:count,entries,dynamicCandidates:d.dynamicCandidates.filter(r=>live.has(r.owner)),external:d.externalReferences.filter(r=>live.has(r.owner)),note:'Heuristic source inventory and observed browser requests complement each other; unexercised diagnostic paths remain candidates, not deletion proof.'};
writeFileSync(out,JSON.stringify(report,null,2));
console.log('SKYSHIFT_EF01_SOURCE_REVIEW '+JSON.stringify({commit:d.commit,unresolved,counts:count,owners:entries.length}));
