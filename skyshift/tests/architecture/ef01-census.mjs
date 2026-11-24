// EF01: read-only, deterministic census of a pinned Git tree.
// Literal reachability is a lower bound. Nothing here authorizes deletion.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname,basename,extname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {extractLiteralReferences,resolveLocalReference} from './dependency-inventory-v2.mjs';

const [rootArg,outArg,expected]=process.argv.slice(2);
if(!rootArg||!outArg||!expected)throw Error('Usage: node ef01-census.mjs <clean pinned checkout> <output.json> <commit>');
const repo=resolve(rootArg),root=resolve(repo,'skyshift');
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:32*1024*1024});
const commit=git('rev-parse','HEAD').trim();
if(commit!==expected||git('status','--porcelain','--untracked-files=no').trim())throw Error('Baseline must be a clean pinned checkout');
const entries=git('ls-tree','-r','-l','-z',commit).split('\0').filter(Boolean).map(s=>{
 const m=/^(\d+) (\w+) ([a-f0-9]+)\s+(\d+|-)\t(.+)$/s.exec(s);
 if(!m)throw Error('Invalid git tree row');
 return {path:m[5],sha:m[3],bytes:Number(m[4])||0,type:m[2]};
}).filter(f=>f.type==='blob'&&(f.path.startsWith('skyshift/')||f.path.startsWith('.github/workflows/')));
const files=new Map(entries.map(f=>[f.path,f]));
const sky=entries.filter(f=>f.path.startsWith('skyshift/'));
const code=p=>/\.(mjs|js|cjs|ts)$/.test(p);
const readable=p=>/\.(mjs|js|cjs|ts|html|css|json|yml|yaml|py|sh|md|txt)$/.test(p);
const hash=s=>createHash('sha256').update(s).digest('hex');
const refs=new Map(),dynamic=[],unresolved=[],external=[],mentions=new Map(),groups=new Map();
const byName=new Map();
for(const f of sky){const key=basename(f.path);if(!byName.has(key))byName.set(key,[]);byName.get(key).push(f.path);}
function local(p,s){
 const dest=resolveLocalReference(root,resolve(repo,p),s);
 return dest?relative(repo,dest).replaceAll('\\','/'):null;
}
for(const f of entries){
 const p=f.path;if(!readable(p))continue;
 const s=readFileSync(resolve(repo,p),'utf8');
 const ext=extname(p);
 const edge=new Set();
 if(['.html','.css','.js','.mjs'].includes(ext)){
  for(const spec of extractLiteralReferences(s,ext)){
   const dest=local(p,spec);
   if(dest){if(files.has(dest))edge.add(dest);else unresolved.push({owner:p,spec,dest});}
   else if(/^(?:https?:|\/\/)/i.test(spec)||/^[\w@]/.test(spec))external.push({owner:p,spec});
  }
  const patterns=[['computed-import',/\bimport\s*\(\s*(?!\s*["'])[^)\n]+/g],['computed-url',/\bnew\s+URL\s*\(\s*(?!\s*["'])[^,\n]+/g],['url-parameter',/\b(?:get|has|set)\(\s*["'][\w-]+["']\s*[,)]/g]];
  for(const [kind,re] of patterns)for(const m of s.matchAll(re)){
   if(kind==='url-parameter'&&!/URLSearchParams|searchParams/.test(s))continue;
   dynamic.push({owner:p,kind,line:s.slice(0,m.index).split('\n').length,expression:m[0].slice(0,160)});
  }
 }
 refs.set(p,[...edge].sort());
 // Candidate basename mentions, including source readers, shaders/asset strings and CI.
 const hit=new Set();
 for(const m of s.matchAll(/[\w.-]+\.(?:mjs|js|cjs|ts|css|html|png|jpg|jpeg|webp|glb|gltf|ktx2|json|ogg|mp3|wav)\b/g)){
  for(const target of byName.get(m[0])||[])if(target!==p)hit.add(target);
 }
 for(const target of hit){if(!mentions.has(target))mentions.set(target,[]);mentions.get(target).push(p);}
 if(code(p)&&!p.startsWith('skyshift/tests/')&&p.startsWith('skyshift/')){
  // Exact same text except literal import paths; candidate, not semantic equivalence.
  const canonical=s.replace(/\b(from\s*|import\s*)(["'])[^"'\n]+\2/g,'$1"<specifier>"');
  const key=hash(canonical);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({path:p,sha:f.sha,bytes:f.bytes,lines:s.split('\n').length});
 }
}
function closure(seeds){
 const seen=new Set(),todo=[...seeds];
 while(todo.length){const p=todo.pop();if(seen.has(p)||!files.has(p))continue;seen.add(p);todo.push(...(refs.get(p)||[]));}
 return [...seen].sort();
}
const live=closure(['skyshift/index.html']);
const comparisonRoots=sky.filter(f=>f.path.endsWith('.html')&&f.path!=='skyshift/index.html'&&!f.path.startsWith('skyshift/tests/')).map(f=>f.path);
const comparison=closure(comparisonRoots);
const qaRoots=sky.filter(f=>f.path.startsWith('skyshift/tests/')&&code(f.path)).map(f=>f.path);
const qa=closure(qaRoots);
const liveSet=new Set(live),compSet=new Set(comparison),qaSet=new Set(qa);
const category=f=>liveSet.has(f.path)?'literal-production':compSet.has(f.path)?'literal-comparison':qaSet.has(f.path)||f.path.startsWith('skyshift/tests/')?'literal-qa':(mentions.get(f.path)||[]).some(p=>!p.endsWith('.md'))?'other-text-reference':'unconfirmed';
const summary={};
for(const f of sky){const k=category(f);const a=summary[k]??={files:0,bytes:0,codeFiles:0,codeBytes:0};a.files++;a.bytes+=f.bytes;if(code(f.path)){a.codeFiles++;a.codeBytes+=f.bytes;}}
const duplicates=[...groups.values()].filter(g=>g.length>1).sort((a,b)=>b.length-a.length);
const report={schema:1,commit,limitations:['Literal graph and basename mentions are conservative heuristics; comments, browser evaluate imports, computed paths and external URLs require review.','URL parameters are candidates, not observed execution. Graph includes historical A/B branches statically imported by the live entrypoint.','Duplicate candidates normalize import specifiers only and do not prove behavioral interchangeability.','No hardware performance, dead-code or deletion conclusions from this report.'],counts:{tracked:sky.length,root:sky.filter(f=>f.path.split('/').length===2).length,legacy:sky.filter(f=>f.path.startsWith('skyshift/legacy/')).length},summary,roots:{production:'skyshift/index.html',comparison:comparisonRoots,qaCount:qaRoots.length},graphs:{production:live,comparison,qa,edges:Object.fromEntries(refs)},files:sky.map(f=>({...f,category:category(f),mentions:mentions.get(f.path)||[]})),duplicateCandidates:duplicates,dynamicCandidates:dynamic,externalReferences:external,unresolvedLiteralReferences:unresolved};
if(!liveSet.has('skyshift/game-v0210.mjs')||!liveSet.has('skyshift/boot-v0210.js'))throw Error('Live entrypoint graph incomplete');
writeFileSync(outArg,JSON.stringify(report,null,2)+'\n');
console.log('SKYSHIFT_EF01_CENSUS '+JSON.stringify({commit,counts:report.counts,summary,duplicates:duplicates.length,dynamicCandidates:dynamic.length,unresolved:unresolved.length}));
