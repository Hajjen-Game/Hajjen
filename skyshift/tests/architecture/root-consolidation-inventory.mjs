// SKYSHIFT root-consolidation R0 — deterministic, read-only dependency inventory.
// No gameplay/file moves. Output deliberately distinguishes no observed reference
// from a proven unused file: dynamic URLs, legacy links and external links exist.
import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {dirname,resolve,relative,extname,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeExplicitAssetBaseReferences} from './dependency-inventory-v2.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const repo=resolve(root,'..');
const baseline=JSON.parse(readFileSync(resolve(root,
 'docs/architecture/root-baseline-2026-11-23.json'),'utf8'));
const textual=new Set(['.js','.mjs','.html','.css','.json','.md','.yml','.yaml','.txt']);
const localPattern=/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*|\bnew\s+URL\s*\(\s*)["'](\.[^"'<>]+)["']/g;
const htmlPattern=/(?:\bsrc|\bhref)=["'](\.[^"']+)["']/g;
const cssPattern=/(?:@import\s+|url\(\s*)["']?(\.[^"')\s]+)["']?/g;
const rootFile=p=>/^skyshift\/[^/]+$/.test(p);
const normalize=s=>s.replace(/[?#].*$/,'');
const allFiles=[];
function walk(dir){
 for(const d of readdirSync(dir,{withFileTypes:true})){
  if(d.name==='.git'||d.name==='node_modules')continue;
  const p=join(dir,d.name);
  if(d.isDirectory())walk(p);
  else if(d.isFile()&&textual.has(extname(p)))allFiles.push(p);
 }
}
walk(root);
if(existsSync(resolve(repo,'.github','workflows')))
 walk(resolve(repo,'.github','workflows'));
const texts=new Map(allFiles.map(p=>[p,readFileSync(p,'utf8')]));
function refs(p,source){
 if(/\.m?js$/.test(p))source=normalizeExplicitAssetBaseReferences(source);
 const found=[];
 for(const re of [localPattern,htmlPattern,cssPattern]){
  re.lastIndex=0;
  for(const m of source.matchAll(re)){
   const spec=normalize(m[1]);
   if(!spec.startsWith('.'))continue;
   found.push(resolve(dirname(p),spec));
  }
 }
 return [...new Set(found)];
}
const current=new Set();
const unresolved=[];
const queue=[resolve(root,'index.html')];
while(queue.length){
 const p=queue.shift();
 if(current.has(p))continue;
 current.add(p);
 if(!existsSync(p)){unresolved.push(relative(repo,p));continue;}
 if(!texts.has(p))continue;
 for(const next of refs(p,texts.get(p))){
  if(!next.startsWith(root+sep))continue;
  if(!existsSync(next)){unresolved.push(relative(repo,next));continue;}
  if(texts.has(next)&&!current.has(next))queue.push(next);
 }
}
const rootPaths=baseline.entries.map(x=>resolve(repo,x.path));
const now=new Set(readdirSync(root,{withFileTypes:true})
 .filter(x=>x.isFile()).map(x=>resolve(root,x.name)));
const rootReferences=new Map();
const textItems=[...texts];
for(const item of rootPaths){
 const name=item.split(sep).at(-1);
 const sources=[];
 for(const [p,content] of textItems){
  if(p===item)continue;
  if(content.includes(name))sources.push(relative(repo,p));
 }
 rootReferences.set(item,sources);
}
const counts={entrypoint:0,activeReachable:0,otherReferenced:0,noObservedReference:0,relocated:0};
const entries=baseline.entries.map(x=>{
 const path=resolve(repo,x.path);
 const present=now.has(path);
 const sources=rootReferences.get(path);
 let status;
 if(!present)status='relocated';
 else if(['index.html','boot-v0210.js','game-v0210.mjs'].includes(path.split(sep).at(-1)))
  status='entrypoint';
 else if(current.has(path))status='activeReachable';
 else if(sources.length)status='otherReferenced';
 else status='noObservedReference';
 counts[status]++;
 return {path:x.path,status,originalBlobSha:x.sha,
  references:sources.length,referenceExamples:sources.slice(0,3)};
});
const newPaths=[...now].filter(p=>!baseline.entries.some(x=>resolve(repo,x.path)===p))
 .map(p=>relative(repo,p));
export const report={
 baselineRootCount:baseline.rootCount,currentRootCount:now.size,
 counts,liveGraphFiles:current.size,liveGraphBrokenLocalPaths:unresolved,
 newRootFiles:newPaths,entries
};
export function assertInventorySafety(){
 if(baseline.rootCount!==468||baseline.entries.length!==468)
  throw Error('Unexpected R0 baseline');
 if(now.size>baseline.rootCount)
  throw Error('New root file count exceeds the original 468-file baseline');
 if(unresolved.length)
  throw Error('Broken active local import/asset: '+unresolved.slice(0,8).join(', '));
 if(!current.has(resolve(root,'boot-v0210.js'))||
    !current.has(resolve(root,'game-v0210.mjs')))
  throw Error('Expected original live boot/game entrypoints in dependency graph');
 if(!current.has(resolve(root,'styles/style-v061.css')))
  throw Error('Expected original active style in HTML dependency graph');
 return report;
}
