// Temporary read-only preflight for one bounded EF02 closure PR. Remove before merge.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {posix as path} from 'node:path';
import {createHash} from 'node:crypto';
const [base,manifestFile]=process.argv.slice(2);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024});
const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
assert.equal(base,manifest.baseCommit);
assert.equal(git('rev-parse',base+'^{tree}').trim(),manifest.baseTree);
const tracked=git('ls-tree','-r','-z',base).split('\0').filter(Boolean).map(row=>{
 const [meta,p]=row.split('\t'),[mode,type,sha]=meta.split(' ');return {p,sha,type};
}).filter(x=>x.type==='blob');
const all=new Set(tracked.map(x=>x.p)),shaByPath=new Map(tracked.map(x=>[x.p,x.sha]));
const roots=tracked.filter(x=>/^skyshift\/[^/]+$/.test(x.p));
assert.equal(roots.length,manifest.rootFiles);
for(const x of manifest.root)assert.equal(shaByPath.get(x.path),x.sha,x.path);
const map=new Map(manifest.candidateGroup.map(x=>[x.path,x.target]));
assert.equal(map.size,14);
for(const x of manifest.candidateGroup){assert.equal(shaByPath.get(x.path),x.sha);assert.ok(!all.has(x.target));}
const textFiles=tracked.filter(x=>(x.p.startsWith('skyshift/')||x.p.startsWith('.github/workflows/'))&&/\.(?:mjs|js|cjs|ts|html|css|json|yml|yaml|md|txt|sh|py|gltf)$/.test(x.p));
// git show is pinned to the immutable base, not the PR checkout or generated file.
const contents=new Map(textFiles.map(x=>[x.p,git('show',base+':'+x.p)]));
const normalize=(owner,spec)=>{
 const [raw]=spec.split(/[?#]/);
 if(raw.startsWith('/skyshift/'))return raw.slice(1);
 if(raw.startsWith('./')||raw.startsWith('../'))return path.normalize(path.join(path.dirname(owner),raw));
 if(owner.endsWith('.html')&&!raw.includes(':')&&!raw.startsWith('/')&&!raw.startsWith('#'))return path.normalize(path.join(path.dirname(owner),raw));
 return null;
};
const modulePattern=/\b(?:from\s*|import\s*\(\s*|import\s*|new\s+URL\s*\(\s*)["']([^"'\n]+)["']/g;
const htmlPattern=/\b(?:src|href|data-game-module)\s*=\s*["']([^"'\n]+)["']/g;
const cssPattern=/(?:@import\s+|url\(\s*)["']?([^"'\s)]+)["']?/g;
const graph=new Map(),mentions=new Map(),byName=new Map(roots.map(x=>[path.basename(x.p),x.p]));
for(const [p,c] of contents){
 const refs=[];
 if(/\.(?:js|mjs|cjs|ts|html|css)$/.test(p)){
  const re=p.endsWith('.html')?htmlPattern:p.endsWith('.css')?cssPattern:modulePattern;
  for(const m of c.matchAll(re)){const dest=normalize(p,m[1]);if(dest&&all.has(dest))refs.push({dest,spec:m[1],index:m.index});}
 }
 graph.set(p,refs);
 // Match exact basename boundaries, never substring time-trial for trial.
 for(const m of c.matchAll(/[\w.-]+\.(?:mjs|js|html|css|md)\b/g)){
  const dest=byName.get(m[0]);if(!dest||dest===p)continue;
  if(!mentions.has(dest))mentions.set(dest,new Map());
  const owners=mentions.get(dest);if(!owners.has(p))owners.set(p,{count:0,examples:[]});
  const row=owners.get(p);row.count++;
  if(row.examples.length<4){const start=c.lastIndexOf('\n',m.index)+1,end=c.indexOf('\n',m.index);row.examples.push(c.slice(start,end<0?c.length:end).trim().slice(0,350));}
 }
}
function reach(seeds){const seen=new Set(),q=[...seeds];while(q.length){const p=q.pop();if(!all.has(p)||seen.has(p))continue;seen.add(p);q.push(...(graph.get(p)||[]).map(x=>x.dest));}return seen;}
const live=reach(['skyshift/index.html']),comparison=reach(['skyshift/material-grade-v0203.html']);
const qaSeeds=tracked.filter(x=>/^skyshift\/tests\/(?:unit|browser|architecture)\//.test(x.p)&&/\.(?:mjs|js)$/.test(x.p)).map(x=>x.p);
const qa=reach(qaSeeds);
const role=p=>live.has(p)?'live-literal':comparison.has(p)?'comparison-literal':qa.has(p)?'qa-literal':mentions.has(p)?'text-reference-unresolved':'no-observed-reference-unresolved';
const counts={};
for(const x of roots){const status=role(x.p);counts[status]=(counts[status]||0)+1;
 const owners=[...(mentions.get(x.p)||new Map())].map(([p,v])=>({path:p,...v}));
 console.log('SKYSHIFT_CLOSURE_ROOT '+JSON.stringify({path:x.p,sha:x.sha,status,proposedOwner:map.get(x.p)||null,owners:owners.map(o=>({path:o.path,count:o.count}))}));
}
const edits=new Map(),warnings=[];
for(const [owner,refs] of graph){
 if(!contents.has(owner))continue;
 for(const x of refs){
  const newOwner=map.get(owner)||owner,newDest=map.get(x.dest)||x.dest;
  if(newOwner===owner&&newDest===x.dest)continue;
  if(x.spec.startsWith('/skyshift/')){if(newDest===x.dest)continue;}
  else if(!x.spec.startsWith('.')&&!owner.endsWith('.html')){warnings.push({owner,spec:x.spec,reason:'non-relative'});continue;}
  const tail=x.spec.slice(x.spec.split(/[?#]/)[0].length);
  const rel=path.relative(path.dirname(newOwner),newDest);
  const next=(x.spec.startsWith('/skyshift/')?'/'+newDest:rel.startsWith('.')?rel:'./'+rel)+tail;
  if(next===x.spec)continue;
  if(!edits.has(owner))edits.set(owner,[]);
  edits.get(owner).push({before:x.spec,after:next,oldTarget:x.dest,newTarget:newDest,index:x.index});
 }
}
for(const x of manifest.candidateGroup){
 const owners=[...(mentions.get(x.path)||new Map())].map(([p,v])=>({path:p,...v,role:role(p),literalMatches:(graph.get(p)||[]).filter(y=>y.dest===x.path).length}));
 console.log('SKYSHIFT_CLOSURE_COHORT '+JSON.stringify({path:x.path,target:x.target,sha:x.sha,role:role(x.path),owners}));
}
for(const [owner,list] of edits)console.log('SKYSHIFT_CLOSURE_LITERAL_EDIT '+JSON.stringify({owner,sha:shaByPath.get(owner),newOwner:map.get(owner)||owner,edits:list}));
console.log('SKYSHIFT_CLOSURE_SUMMARY '+JSON.stringify({base,rootFiles:roots.length,counts,liveReach:live.size,comparisonReach:comparison.size,qaReach:qa.size,proposedMoves:map.size,literalEditFiles:edits.size,warningCount:warnings.length,warnings,notice:'Proposal only. Nonliteral/browser-relative/source-read/workflow and historic assertion references require review. No files changed.'}));

// Verify a concrete reversible literal-only candidate in memory. Nonliteral readers
// and historical guards remain blockers until independently reconciled.
const proposed=[];
for(const [owner,list] of edits){
 const before=contents.get(owner);let after=before;const verified=[];
 for(const e of [...list].sort((a,b)=>b.index-a.index)){
  const start=before.indexOf(e.before,e.index);
  assert.ok(start>=e.index&&start-e.index<1000,owner+' literal anchor');
  assert.equal(after.slice(start,start+e.before.length),e.before,owner+' original literal');
  after=after.slice(0,start)+e.after+after.slice(start+e.before.length);
  verified.push({...e,start});
 }
 let inverse=after;
 for(const e of [...verified].reverse()){
  assert.equal(inverse.slice(e.start,e.start+e.after.length),e.after,owner+' inverse anchor');
  inverse=inverse.slice(0,e.start)+e.before+inverse.slice(e.start+e.after.length);
 }
 assert.equal(inverse,before,owner+' exact inverse');
 const b=Buffer.from(before);assert.equal(createHash('sha1').update('blob '+b.length+'\\0').update(b).digest('hex'),shaByPath.get(owner),owner+' pinned identity');
 proposed.push({owner,target:map.get(owner)||owner,edits:verified});
}
for(const x of manifest.candidateGroup){
 const owners=[...(mentions.get(x.path)||new Map())].filter(([p,v])=>v.count>(graph.get(p)||[]).filter(y=>y.dest===x.path).length);
 console.log('SKYSHIFT_CLOSURE_NONLITERAL '+JSON.stringify({path:x.path,owners:owners.map(([p,v])=>({path:p,sha:shaByPath.get(p),...v}))}));
}
console.log('SKYSHIFT_CLOSURE_INVERSE '+JSON.stringify({base,verifiedLiteralFiles:proposed.length,proposedMoves:map.size,notice:'Exact reversible literal candidate only; no source or workflow mutation. All nonliteral and archived-source references must be reviewed in same PR.'}));
