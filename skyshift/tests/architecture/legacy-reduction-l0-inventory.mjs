// L0: conservative retirement planning, not automatic deletion.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {basename,dirname,extname,resolve,relative} from 'node:path';
import {extractLiteralReferences,resolveLocalReference} from './dependency-inventory-v2.mjs';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:128*1024*1024});
const repo=process.cwd(),root=resolve(repo,'skyshift');
const tracked=git('ls-files','-z').split('\0').filter(Boolean);
const files=tracked.filter(p=>p.startsWith('skyshift/'));
const set=new Set(files),textual=/\.(?:mjs|js|cjs|ts|html|css|json|md|yml|yaml|txt|sh|py|gltf)$/;
const texts=new Map(tracked.filter(p=>textual.test(p)).map(p=>[p,readFileSync(p,'utf8')]));
const forward=new Map();
const toRepo=p=>relative(repo,p).split('\\').join('/');
for(const p of files){
 if(!/\.(?:mjs|js|html|css)$/.test(p))continue;
 const s=texts.get(p),deps=new Set();
 for(const spec of extractLiteralReferences(s,extname(p))){
  const dest=resolveLocalReference(root,resolve(repo,p),spec);
  if(dest&&set.has(toRepo(dest)))deps.add(toRepo(dest));
 }
 forward.set(p,[...deps]);
}
const closure=roots=>{const seen=new Set(),q=[...roots];while(q.length){const p=q.pop();if(seen.has(p)||!set.has(p))continue;seen.add(p);q.push(...(forward.get(p)||[]))}return seen};
const live=closure(['skyshift/index.html']);
const comparison=closure(['skyshift/material-grade-v0203.html']);
if(!live.has('skyshift/game-v0210.mjs')||!live.has('skyshift/boot-v0210.js'))throw Error('Live graph incomplete');
const candidates=files.filter(p=>/\/(?:game-v\d+\.mjs|boot-v\d+\.js)$/.test(p));
const candidateSet=new Set(candidates);
const groups={live:[],comparison:[],outsideLiteralRuntimeGraphs:[]};
const classify=p=>live.has(p)?'live':comparison.has(p)?'comparison':'outsideLiteralRuntimeGraphs';
const type=p=>candidateSet.has(p)?'snapshot':p.startsWith('skyshift/tests/architecture/')||/migration-manifest|baseline|consumer-inventory|consumer-queue/.test(p)?'architecture-record':p.startsWith('.github/workflows/')?'workflow':/\.md$/.test(p)?'documentation':/\.test\.mjs$|browser-|probe-/.test(p)?'test-or-qa':live.has(p)?'live-runtime':comparison.has(p)?'comparison-runtime':'other';
for(const path of candidates){
 const name=basename(path),refs=[];
 for(const [p,s] of texts){
  if(p===path||!s.includes(name))continue;
  const matches=s.split('\n').map((line,i)=>[i+1,line]).filter(([,l])=>l.includes(name));
  refs.push({path:p,type:type(p),lines:matches.slice(0,12).map(([line,text])=>({line,text:text.trim().slice(0,300)})),matchCount:matches.length});
 }
 groups[classify(path)].push({path,sha:git('rev-parse','HEAD:'+path).trim(),dependencies:forward.get(path)||[],refs});
}
const activeDynamic=[];
for(const path of new Set([...live,...comparison])){
 const s=texts.get(path);if(!s)continue;
 for(const [i,l] of s.split('\n').entries()){
  if(/\b(?:import|fetch|new\s+URL|load|loadAsync)\s*\(\s*(?!\s*["'])|(?:src|href)\s*=\s*(?!\s*["'])/.test(l))activeDynamic.push({path,line:i+1,text:l.trim().slice(0,300)});
 }
}
const report={baseline:'f8fadb76fe1e8f4cf75db812150bc083f05e3e48',fileCount:files.length,rootCount:files.filter(p=>dirname(p)==='skyshift').length,legacyCount:files.filter(p=>p.startsWith('skyshift/legacy/')).length,live:[...live].sort(),comparison:[...comparison].sort(),groups,activeDynamic,warning:'Literal reachability is a lower bound. No file is automatically approved for deletion. Review computed paths, inbound executable references, historical URLs, and unique test coverage. Architecture manifests require an explicit retirement policy.'};
const counts=Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]));
console.log('SKYSHIFT_L0_COUNTS '+JSON.stringify({total:report.fileCount,root:report.rootCount,legacy:report.legacyCount,activeGraph:live.size,comparisonGraph:comparison.size,snapshots:counts,activeDynamic:activeDynamic.length}));
for(const g of groups.outsideLiteralRuntimeGraphs){console.log('SKYSHIFT_L0_CANDIDATE '+JSON.stringify({path:g.path,sha:g.sha,referenceCounts:g.refs.reduce((a,r)=>(a[r.type]=(a[r.type]||0)+1,a),{}),executableRefs:g.refs.filter(r=>['workflow','test-or-qa','live-runtime','comparison-runtime','other'].includes(r.type)).map(r=>r.path)}))}
writeFileSync('skyshift-l0-retirement-inventory.json',JSON.stringify(report,null,2)+'\n');
