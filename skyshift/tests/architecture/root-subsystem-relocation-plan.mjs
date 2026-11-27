// Read-only inventory for larger coherent root moves. No filename alone proves safety.
// This reports actual tracked and pinned historical source references; no edits or deletes.
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,statSync} from 'node:fs';
import assert from 'node:assert/strict';
import {inventory} from './dependency-inventory-v2.mjs';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {retirement,retirementL1B,retirementL1C,retirementL1D,retirementL1E,retirementL1F,retirementEF02E,retirementEF02G,retirementEF02J,retirementEF08,readHistorical} from './legacy-retirement-l1a.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const entries=execFileSync('git',['ls-files','--stage','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean).map(row=>{
 const match=row.match(/^\d+ ([0-9a-f]+) 0\t(.+)$/s);
 if(!match)throw Error('Unexpected index entry '+row);
 return {path:match[2],sha:match[1]};
});
const isTrial=f=>/^skyshift\/(?:trial|smooth-track|premium-track|track-3d|circuit-layout)-v\d+\.mjs$/.test(f.path);
// Reuse the existing scan, including pinned historical readers, for the entire
// remaining root instead of one trial family. Keep the old trial output intact.
const roots=entries.filter(f=>/^skyshift\/[^/]+$/.test(f.path)).map(f=>({...f,consumers:[],metadataRefs:0}));
const byName=new Map(roots.map(f=>[basename(f.path),f]));
const escaped=[...byName.keys()].sort((a,b)=>b.length-a.length).map(s=>s.split('').map(ch=>'\\^$.*+?()[]{}|'.includes(ch)?'\\'+ch:ch).join(''));
const pattern=new RegExp('(?:'+escaped.join('|')+')','g');
const textFile=p=>/\.(?:mjs|js|cjs|ts|html|css|json|yml|yaml|sh|py|txt|md)$/.test(p);
function scan(path,source,sha,archive=false){
 const hits=new Map();
 for(const match of source.matchAll(pattern)){
  const name=match[0];
  if(!hits.has(name))hits.set(name,[]);
  const start=source.lastIndexOf('\n',match.index)+1;
  const end=source.indexOf('\n',match.index);
  const line=source.slice(start,end<0?source.length:end);
  const snippet=line.length>260?line.slice(Math.max(0,match.index-start-100),match.index-start+name.length+100):line.trim();
  const refs=hits.get(name);
  if(!refs.includes(snippet))refs.push(snippet);
 }
 for(const [name,lines] of hits){
  const item=byName.get(name);
  if(path===item.path&&!archive)continue;
  const metadata=!archive&&(/\.md$/.test(path)||/migration-manifest|baseline|consumer-inventory|consumer-queue/.test(path)||path.startsWith('skyshift/docs/architecture/'));
  if(metadata){item.metadataRefs++;continue;}
  const kind=archive?'pinned-archive':path.startsWith('.github/')?'workflow':path.startsWith('skyshift/tests/architecture/')?'architecture':path.startsWith('skyshift/tests/')?'test-or-qa':'source';
  item.consumers.push({path,sha,kind,count:lines.length,examples:lines.slice(0,3)});
 }
}
for(const f of entries)if((f.path.startsWith('skyshift/')||f.path.startsWith('.github/'))&&textFile(f.path)&&existsSync(resolve(repo,f.path)))scan(f.path,readFileSync(resolve(repo,f.path),'utf8'),f.sha);
for(const f of [...retirement.files,...retirementL1B.files,...retirementL1C.files,...retirementL1D.files,...retirementL1E.files,...retirementL1F.files,...retirementEF02E.files,...retirementEF02G.files,...retirementEF02J.files,...retirementEF08.files])scan(f.path,readHistorical(resolve(repo,f.path)),f.sha,true);
const candidates=roots.filter(isTrial).map(f=>({...f,target:'skyshift/tracks/shared/'+basename(f.path)}));
const summary={count:candidates.length,rootFiles:roots.length,collision:candidates.filter(f=>existsSync(resolve(repo,f.target))).map(f=>f.target),warning:'Literal basename census only. Review computed imports, path-sensitive assets, historical assertions and equivalent resolved URLs before moving.'};
console.log('SKYSHIFT_BULK_ROOT_SUMMARY '+JSON.stringify(summary));
for(const f of candidates)console.log('SKYSHIFT_BULK_ROOT_CANDIDATE '+JSON.stringify(f));

// EF08: actual tracked tree and all surviving owner entries, not a second census.
const baseline=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef08-root-baseline.json'),'utf8'));
const previous=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02-final-owner-ledger.json'),'utf8'));
assert.equal(baseline.entries.length,baseline.rootCount);
const tracked=entries.filter(f=>f.path.startsWith('skyshift/'));
const byPath=new Map(entries.map(f=>[f.path,f]));
const old=new Map(previous.entries.map(e=>[e.currentPath,e]));
const original=new Map(baseline.entries.map(e=>[e.path,e]));
const graph=new Set(inventory().literalBrowserGraph.paths.map(p=>'skyshift/'+p));
const bytes=f=>statSync(resolve(repo,f.path)).size;
const source=tracked.filter(f=>!f.path.startsWith('skyshift/tests/')&&/\.(?:mjs|js|css|html)$/.test(f.path));
const duplicates=new Map();
for(const f of source){if(!duplicates.has(f.sha))duplicates.set(f.sha,[]);duplicates.get(f.sha).push(f.path);}
const duplicateGroups=[...duplicates.values()].filter(g=>g.length>1);
const rows=roots.map(f=>{
 const o=old.get(f.path),b=original.get(f.path);
 const byKind={};for(const consumer of f.consumers)byKind[consumer.kind]=(byKind[consumer.kind]||0)+1;
 return {path:f.path,sha:f.sha,bytes:bytes(f),baselineBlob:b?.sha??null,priorOwner:o?.owner??null,priorRole:o?.censusRole??null,sourceReachable:graph.has(f.path),knownPriorConsumers:(o?.owners??[]).map(x=>({path:x.currentPath??x.path,stillTracked:byPath.has(x.currentPath??x.path),unchanged:byPath.get(x.currentPath??x.path)?.sha===x.currentBlob})),consumerKinds:byKind,metadataRefs:f.metadataRefs,consumers:f.consumers.map(x=>({path:x.path,sha:x.sha,kind:x.kind,count:x.count}))};
});
assert.equal(new Set(rows.map(r=>r.path)).size,roots.length);
const result={schema:1,baseline:baseline.commit,tracked:tracked.length,trackedBytes:tracked.reduce((n,f)=>n+bytes(f),0),rootCount:roots.length,rootBytes:roots.reduce((n,f)=>n+bytes(f),0),testFiles:tracked.filter(f=>f.path.startsWith('skyshift/tests/')).length,sourceFiles:source.length,sourceBytes:source.reduce((n,f)=>n+bytes(f),0),literalSourceGraph:graph.size,duplicateSourceBlobGroups:duplicateGroups,sourceReachableRoots:rows.filter(r=>r.sourceReachable).length,newRoots:rows.filter(r=>!r.baselineBlob).map(r=>r.path),baselinePathsNoLongerAtRoot:baseline.entries.filter(e=>!rows.some(r=>r.path===e.path)).map(e=>({path:e.path,identicalTrackedPaths:tracked.filter(f=>f.sha===e.sha).map(f=>f.path)})),warning:'Literal and historical references are not proof of unused code; source graph is not the production Vite graph. No deletion authorized by this report.'};
console.log('SKYSHIFT_EF08_ROOT_SUMMARY '+JSON.stringify(result));
for(const row of rows)console.log('SKYSHIFT_EF08_ROOT_OWNER '+JSON.stringify(row));
