import {ef02iHistoricalExists} from './ef02i-path-overlay.mjs';
import {ef02hCurrentPath} from './ef02h-path-overlay.mjs';
// L1A: recover retired source from the pinned Git commit, never from a replacement stub.
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,relative,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
export const retirement=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/legacy-retirement-l1a.json'),'utf8'));
export const retirementL1B=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/legacy-retirement-l1b.json'),'utf8'));
assert.equal(retirementL1B.archiveCommit,retirement.archiveCommit);
export const retirementL1C=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/legacy-retirement-l1c.json'),'utf8'));
assert.equal(retirementL1C.archiveCommit,retirement.archiveCommit);
export const retirementL1D=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/legacy-retirement-l1d.json'),'utf8'));
assert.equal(retirementL1D.archiveCommit,retirement.archiveCommit);
export const retirementL1E=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/legacy-retirement-l1e.json'),'utf8'));
assert.equal(retirementL1E.archiveCommit,retirement.archiveCommit);
export const retirementL1F=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/legacy-retirement-l1f.json'),'utf8'));
assert.equal(retirementL1F.archiveCommit,retirement.archiveCommit);
export const retirementEF02E=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02-retirement-early-snapshots.json'),'utf8'));
assert.equal(retirementEF02E.archiveCommit,retirement.archiveCommit);
export const retirementEF02F=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02-retirement-root-css.json'),'utf8'));
assert.equal(retirementEF02F.archiveCommit,retirement.archiveCommit);
export const retirementEF02G=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02-retirement-historical-rendering.json'),'utf8'));
assert.equal(retirementEF02G.archiveCommit,retirement.archiveCommit);
export const retirementEF02J=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02j-retired-visual-leaves.json'),'utf8'));
assert.equal(retirementEF02J.archiveCommit,retirement.archiveCommit);
const entries=new Map([...retirement.files,...retirementL1B.files,...retirementL1C.files,...retirementL1D.files,...retirementL1E.files,...retirementL1F.files,...retirementEF02E.files,...retirementEF02F.files,...retirementEF02G.files,...retirementEF02J.files].map(f=>[f.path,f]));
const asPath=p=>relative(repo,resolve(repo,p instanceof URL?fileURLToPath(p):p)).split('\\').join('/');
const cache=new Map();
export function isRetired(p){return entries.has(asPath(p));}
export function readHistorical(p,encoding='utf8'){
 const key=asPath(p),entry=entries.get(key);
 if(!entry)return readFileSync(p,encoding);
 assert.ok(!existsSync(resolve(repo,key)),'Retired source unexpectedly present: '+key);
 if(!cache.has(key)){
  const data=execFileSync('git',['show',retirement.archiveCommit+':'+key],{cwd:repo,maxBuffer:8*1024*1024});
  const hash=createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
  assert.equal(hash,entry.sha,'Retired source Git identity changed: '+key);
  cache.set(key,data);
 }
 return cache.get(key).toString(encoding);
}
export function historicalExists(p){
 if(!isRetired(p)){
  const ef02i=ef02iHistoricalExists(resolve(repo,asPath(p)));
  if(ef02i!==null)return ef02i;
  const original=resolve(repo,asPath(p)), current=ef02hCurrentPath(original);
  if(current!==original){
   const move=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02h-track-geometry-ownership.json'),'utf8')).moves.find(f=>f.oldPath===asPath(p));
   assert.ok(!existsSync(original),'Stale EF02H historical target '+original);
   const data=readFileSync(current);
   assert.equal(createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex'),move.sha,'EF02H historical dependency identity '+current);
   return true;
  }
  return existsSync(p);
 }
 readHistorical(p);return true;
}
export function historicalSyntaxCheck(workflow,p){
 const key=asPath(p);
 if(isRetired(p)){
  assert.ok(!workflow.includes('node --check '+key),'Stale retired syntax check: '+key);
  readHistorical(p);return true;
 }
 return workflow.includes('node --check '+key);
}
