// EF02J: durable test dependency safety, not immutable historical test bodies.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {retirementL1D,retirementL1F,retirementEF08,readHistorical} from './legacy-retirement-l1a.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const repo=resolve(root,'..'),unit=resolve(root,'tests/unit'),workflows=resolve(repo,'.github/workflows');
const unitNames=readdirSync(unit).filter(n=>n.endsWith('.test.mjs')).sort();
const stage8=JSON.parse(readFileSync(resolve(unit,'migration-manifest-02898-stage8.json'),'utf8'));
const protectedTests=Object.keys(stage8.entries);
const reviewed=JSON.parse(readFileSync(resolve(root,'docs/architecture/ef08-obsolete-cohort.json'),'utf8'));
const reviewedProtected=reviewed.protectedReplacements||{};
function target(name,spec,sourceReader=false){
 const path=resolve(unit,spec.split(/[?#]/)[0]),rel=relative(root,path);
 assert.ok(rel&&rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel),'Test dependency escapes SKYSHIFT: '+name+' -> '+spec);
 const retired=sourceReader&&[...retirementL1D.files,...retirementL1F.files,...retirementEF08.files].find(f=>f.path==='skyshift/'+rel.split(sep).join('/')&&(f.reader==='skyshift/tests/unit/'+name||f.readers?.includes('skyshift/tests/unit/'+name)));
 if(retired){assert.ok(readHistorical(path).length>0,'Unrecoverable archived source: '+spec);return;}
 assert.ok(existsSync(path)&&statSync(path).isFile(),'Missing test dependency: '+name+' -> '+spec);
}
function checkStaticImports(name,source){
 let inImport=false;
 for(const line of source.split('\n')){
  if(/^\s*(?:import|export)\s+/.test(line)&&!/^\s*import\s*\(/.test(line))inImport=true;
  if(inImport){
   const from=line.match(/\bfrom\s*["']([^"']+)["']/),bare=line.match(/^\s*import\s*["']([^"']+)["']/);
   const spec=(from||bare)?.[1];
   if(spec?.startsWith('.'))target(name,spec);
  }
  if(inImport&&/;\s*(?:\/\/.*)?$/.test(line))inImport=false;
 }
}
test('all current unit tests live in the test directory and resolve static module imports',()=>{
 assert.ok(unitNames.length>0,'Unit suite missing');
 assert.equal(readdirSync(root).filter(n=>n.endsWith('.test.mjs')).length,0,'No root-level unit test copies');
 for(const name of unitNames){
  assert.match(name,/^[\w-]+\.test\.mjs$/);
  assert.ok(!existsSync(resolve(root,name)),'Stale root test: '+name);
  checkStaticImports(name,readFileSync(resolve(unit,name),'utf8'));
 }
});
test('retained stage-6 dynamic imports and protected complex tests retain actual resolved targets',()=>{
 const stage6=JSON.parse(readFileSync(resolve(unit,'migration-manifest-02898-stage6.json'),'utf8'));
 for(const name of [...new Set([...Object.keys(stage6.entries),...protectedTests])]){
  const p=resolve(unit,name);
  if(!existsSync(p)&&!protectedTests.includes(name))continue; // only currently retained tests
  if(!existsSync(p)&&protectedTests.includes(name)){
   const old='skyshift/tests/unit/'+name,replacement=reviewedProtected[old];
   assert.equal(replacement,'skyshift/tests/unit/track-integrity-v0165.test.mjs','Unreviewed protected retirement: '+old);
   assert.ok(reviewed.unitTests.some(f=>f.path===old&&f.replacement===replacement&&f.bytes>0&&/^[a-f0-9]{40}$/.test(f.sha)));
   assert.ok(existsSync(resolve(repo,replacement)));
   for(const wf of ['skyshift-architecture-guard.yml','skyshift-ci-fast.yml','skyshift-tests.yml']){
    const source=readFileSync(resolve(workflows,wf),'utf8');
    assert.ok(source.includes(replacement),wf+' missing current replacement');
    assert.ok(!source.includes(old),wf+' stale retired test');
   }
   continue;
  }
  assert.ok(existsSync(p),'Protected complex test missing: '+name);
  const source=readFileSync(p,'utf8');
  for(const match of source.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.\.\/\.\.\/[^"']+)["']/g))target(name,match[1]);
  if(!protectedTests.includes(name))continue;
  for(const match of source.matchAll(/\bnew URL\(\s*["'](\.\.\/\.\.\/[^"']+)["']/g))target(name,match[1]);
  for(const match of source.matchAll(/\b(?:src|read|source)\(\s*["'](\.\/[^"']+)["']\s*\)/g))target(name,'../../'+match[1],true);
 }
 for(const v of ['v0164','v0165']){
  const name='track-physics-parity-'+v+'.test.mjs';
  const source=readFileSync(resolve(unit,name),'utf8');
  assert.ok(source.includes('new URL("../../qa/track-physics-parity-probe-'+v+'.mjs",import.meta.url)'),'Missing protected subprocess probe call: '+name);
  target(name,'../../qa/track-physics-parity-probe-'+v+'.mjs');
 }
});
test('all explicit SKYSHIFT workflow test references resolve to current files, not stale root paths',()=>{
 for(const file of readdirSync(workflows).filter(f=>/\.ya?ml$/.test(f))){
  const source=readFileSync(resolve(workflows,file),'utf8');
  for(const m of source.matchAll(/\bskyshift\/(?:[\w.-]+\/)*[\w.-]+\.test\.mjs\b/g)){
   const p=m[0];assert.ok(p.startsWith('skyshift/tests/'),'Stale root test reference '+file+' -> '+p);
   assert.ok(existsSync(resolve(repo,p)),'Missing workflow test '+file+' -> '+p);
  }
 }
});
