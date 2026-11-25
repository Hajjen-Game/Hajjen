import {restorePremiumMove,premiumCurrentPath} from './ef02-closure-premium-overlay.mjs';
// SKYSHIFT Stage I – immutable core runtime source integrity and ESM consumer audit.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const core=resolve(root,'core'),repo=resolve(root,'..');
const manifest=JSON.parse(readFileSync(resolve(core,'stageI-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
function hash(bytes){return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')}
function walk(dir,out=[]){
 for(const item of readdirSync(dir,{withFileTypes:true})){
  const file=join(dir,item.name);
  if(item.isDirectory())walk(file,out);
  else if(item.isFile()&&['.mjs','.js','.html','.yml','.yaml'].includes(extname(file)))out.push(file);
 }
 return out;
}
test('Stage I preserves all 15 original performance/fidelity source blobs and resolves ESM imports',()=>{
 assert.equal(manifest.schemaVersion,1);assert.equal(names.length,15);
 for(const name of names){
  assert.match(name,/^[a-z0-9-]+\.mjs$/);
  assert.ok(!existsSync(resolve(root,name)),'Stale root performance module: '+name);
  const path=resolve(core,name);assert.ok(existsSync(path),'Missing relocated runtime core module: '+name);
  const actualSource=readFileSync(path,'utf8');
  const source=restorePremiumMove(actualSource,path);let original=source;
  for(const ext of manifest.files[name].externalImports){
   assert.ok(source.includes('../'+ext),'Missing approved external import path '+name+' -> '+ext);
   assert.ok(existsSync(premiumCurrentPath(resolve(root,ext))),'Missing core external ESM dependency '+ext);
   original=original.split('../'+ext).join('./'+ext);
  }
  // EF02B: verify exact adapter and reconstruct the original source blob from
  // the single shared implementation. All 15 immutable Stage I hashes remain
  // enforced; only the four approved fidelity adapters use reconstruction.
  if(['0114','0150','0151','0160'].some(v=>name==='visual-fidelity-v'+v+'.mjs')){
   const dep=manifest.files[name].externalImports[0];
   const expected='import {createPremiumTrackMaterial} from "../'+dep+'";\n'+
    'import {createSmartPremiumTrackMaterialWithFactory} from "./visual-fidelity.mjs";\n'+
    'export {FIDELITY_0114,selectFidelityProfile,createFidelityDirector,\n'+
    ' resetFidelityDirector,advanceFidelityDirector,fidelityAudit,patchRefinedRoadShaders}\n'+
    ' from "./visual-fidelity.mjs";\n'+
    'export function createSmartPremiumTrackMaterial(THREE,profile){\n'+
    ' return createSmartPremiumTrackMaterialWithFactory(createPremiumTrackMaterial,THREE,profile);\n}\n';
   assert.equal(source,expected,'Fidelity adapter no longer matches its approved factory');
   original=readFileSync(resolve(core,'visual-fidelity.mjs'),'utf8')
    .replace("// Material construction is supplied by the compatibility adapter.",'import {createPremiumTrackMaterial} from "./'+dep+'";')
    .replace("export function createSmartPremiumTrackMaterialWithFactory(createPremiumTrackMaterial,THREE,profile){","export function createSmartPremiumTrackMaterial(THREE,profile){");
   for(const m of readFileSync(resolve(core,'visual-fidelity.mjs'),'utf8').matchAll(/\bfrom\s*["'](\.{1,2}\/[^"']+)["']/g))
    assert.ok(existsSync(resolve(core,m[1])),'Unresolved shared fidelity dependency '+m[1]);
  }
  assert.equal(hash(Buffer.from(original,'utf8')),manifest.files[name].originalGitBlobSha,
   'Runtime performance/fidelity implementation or parameters changed: '+name);
  for(const m of actualSource.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)){
   const dest=resolve(dirname(path),m[1].split(/[?#]/)[0]);
   assert.ok(existsSync(dest),'Unresolved relocated performance ESM import '+name+' -> '+m[1]);
   const rel=relative(root,dest);
   assert.ok(rel&&rel!=='..'&&!rel.startsWith('..'+sep),'Core ESM escaped SKYSHIFT: '+name);
  }
 }
});
test('Stage I has no obsolete root imports in executable consumers or GitHub workflows',()=>{
 const sources=[...walk(root),...walk(resolve(repo,'.github/workflows'))];
 assert.ok(sources.length>250,'Unexpectedly low executable source audit count');
 for(const path of sources){
  if(path===fileURLToPath(import.meta.url)||path===resolve(root,'tests/architecture/core-test-path-overlay-stageI.mjs'))continue;
  const source=readFileSync(path,'utf8');
  for(const name of names){
   assert.equal(source.includes('skyshift/'+name),false,'Stale repository-root core import '+relative(repo,path)+' -> '+name);
   if(path.startsWith(core+sep))continue; // moved siblings keep ./name imports
   const escaped=name.replaceAll('.','\\.');
   const stale=new RegExp('["\\x27](?:\\./|(?:\\.\\./)+)'+escaped+'["\\x27]');
   assert.doesNotMatch(source,stale,'Stale relative core import '+relative(repo,path)+' -> '+name);
  }
 }
});
