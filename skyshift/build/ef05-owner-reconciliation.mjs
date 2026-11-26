// EF05: reconcile the approved owner ledger against the actual artifact
// and surviving tracked sources. This report is evidence, not deletion permission.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {retiredSceneryModules} from './production-specialization.mjs';
import {readOwnerRelocations} from './ef08-owner-paths.mjs';
export function reconcileEF05Owners(repo,graph){
 const rows=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02-final-owner-ledger.json'),'utf8')).entries.filter(e=>e.ownerStage==='EF05');
 assert.equal(rows.length,101,'complete EF05 owner cohort');
 const paths=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
 const tracked=new Set(paths),modules=new Set(graph.modules.map(p=>p.split('?')[0]));
 const ef08Retired=new Set(JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef08-obsolete-cohort.json'),'utf8')).roots.map(f=>f.path));
 const {currentPath}=readOwnerRelocations(repo);
 const ownerNames=new Map(rows.map(e=>[basename(e.currentPath),currentPath(e.currentPath)]));
 assert.equal(ownerNames.size,rows.length,'owner filenames are unique');
 const inbound=new Map(rows.map(e=>[currentPath(e.currentPath),[]]));
 // Scan only tracked executable/text consumers, not generated build products
 // or historical documentation. Computed paths and archived Git consumers
 // remain explicit unresolved risks even when a literal consumer is absent.
 const names=[...ownerNames.keys()].map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 const pattern=new RegExp(names,'g');
 for(const p of paths){
  if(!/\.(?:mjs|js|html|css|yml|yaml|json)$/.test(p)||p.startsWith('skyshift/docs/')||/migration-manifest|package-lock|baseline|inventory|owner-ledger/.test(p))continue;
  const text=readFileSync(resolve(repo,p),'utf8');
  for(const name of new Set(text.match(pattern)||[])){
   const target=ownerNames.get(name);
   if(target!==p)inbound.get(target).push(p);
  }
 }
 const entries=rows.map(e=>{
  const previousPath=e.currentPath,path=currentPath(previousPath);
  const relocated=path!==previousPath;
  const repositoryDeleted=ef08Retired.has(previousPath)||ef08Retired.has(path);
  if(relocated){
   assert.ok(!tracked.has(previousPath)&&!existsSync(resolve(repo,previousPath)),previousPath+' stale relocated owner');
   assert.ok(!modules.has('source/'+previousPath.slice('skyshift/'.length)),previousPath+' stale production owner');
   assert.equal(repositoryDeleted,false,previousPath+' moved owner also retired');
  }
  assert.equal(tracked.has(path),!repositoryDeleted,'Unreviewed source retirement or reintroduced retired path '+path);
  assert.equal(existsSync(resolve(repo,path)),!repositoryDeleted,'Source ownership differs from tracked state '+path);
  const production=modules.has('source/'+path.slice('skyshift/'.length));
  const consumers=inbound.get(path).sort();
  const knownConsumers=[...new Set(e.owners.map(o=>currentPath(o.currentPath)).filter(p=>p&&tracked.has(p)&&!p.startsWith('skyshift/docs/')))].sort();
  const retiredFromBundle=retiredSceneryModules.includes(path.slice('skyshift/'.length));
  if(retiredFromBundle||repositoryDeleted)assert.equal(production,false,path+' retired source leaked into production');
  return {path,previousPath,relocated,previousRole:e.censusRole,production,retiredFromBundle,repositoryDeleted,consumers,knownConsumers,
   disposition:repositoryDeleted?'retired: EF08 closed obsolete source/test cohort':production?'retain: actual production graph':
    retiredFromBundle?'production-retired: retain source QA/comparison until exact historical graph retirement':
    'retain: historical/QA or unresolved computed/archived consumer; no safe deletion proof'};
 });
 return {schema:1,scope:'all EF05 owner entries; literal tracked references are a lower bound, archived/computed references remain unresolved',entries,
  counts:{total:entries.length,production:entries.filter(e=>e.production).length,productionRetired:entries.filter(e=>e.retiredFromBundle).length,outsideProduction:entries.filter(e=>!e.production).length,repositoryDeleted:entries.filter(e=>e.repositoryDeleted).length,relocated:entries.filter(e=>e.relocated).length}};
}
