import {restoreTrialMove,trialCurrentPath} from './ef02-closure-trial-overlay.mjs';
// SKYSHIFT Architecture Cleanup 2.0 Stage H flight module relocation safety guard.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const flight=resolve(root,'flight'),repository=resolve(root,'..');
const manifest=JSON.parse(readFileSync(resolve(flight,'stageH-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
function hash(bytes){return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')}
function walk(dir,out=[]){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const f=join(dir,entry.name);
  if(entry.isDirectory())walk(f,out);
  else if(entry.isFile()&&['.mjs','.js','.html','.yml','.yaml'].includes(extname(f)))out.push(f);
 }return out;
}
test('Stage H: all 18 flight/steering/camera source files are SHA-equivalent to original Git blobs',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(names.length,18);
 for(const name of names){
  assert.match(name,/^[a-z0-9-]+\.mjs$/);
  assert.ok(!existsSync(resolve(root,name)),'Old root flight module remains: '+name);
  const file=resolve(flight,name);
  assert.ok(existsSync(file),'Missing relocated flight module: '+name);
  const actual=readFileSync(file,'utf8');
  const content=restoreTrialMove(actual,file);let original=content;
  for(const external of manifest.files[name].externalImports){
   assert.ok(content.includes('../'+external),'Missing approved root-external import rebase: '+name+' -> '+external);
   assert.ok(existsSync(trialCurrentPath(resolve(root,external))),'Missing flight external dependency: '+external);
   original=original.split('../'+external).join('./'+external);
  }
  // EF02C: original hash protection retained for explicitly approved shared bodies.
  if(name==='cinematic-v0165.mjs'){
   assert.equal(content,"import {heightAt,bankAt,CORKSCREW} from \"../trial-v0165.mjs\";\nimport { followAngle } from \"../flight-motion-v044.mjs\";\nimport {createCameraFraming} from \"./cinematic-camera.mjs\";\nexport {CINEMATIC_DEFAULTS,createCinematicState,headingDelta,turnPreview,stepCinematic,cinematicFov,engineLightFactor} from \"./cinematic-camera.mjs\";\nexport const {cameraBankAt,chasePose}=createCameraFraming({heightAt,bankAt,CORKSCREW});\n",'Camera adapter differs from approved sampler');
   original=readFileSync(resolve(flight,'cinematic-camera.mjs'),'utf8')
    .replace("// Track sampler supplied by adapter.","import {heightAt,bankAt,CORKSCREW} from \"./trial-v0165.mjs\";")
    .replace("// Historical followAngle import retained in adapter.","import { followAngle } from \"./flight-motion-v044.mjs\";")
    .replace("export function createCameraFraming({heightAt,bankAt,CORKSCREW}){\nfunction cameraBankAt(s){","export function cameraBankAt(s){")
    .replace('function chasePose(','export function chasePose(')
    .replace(" return {cameraBankAt,chasePose};\n}\n",'');
  }else if(/^unified-flight-v(?:0112|016[1-5])\.mjs$/.test(name)){
   const deps={'0112':'0901','0161':'0161','0162':'0162','0163':'0163','0164':'0164','0165':'0165'};
   const v=name.match(/v(\d+)\.mjs$/)[1],dep='cinematic-v'+deps[v]+'.mjs';
   const line='import {turnPreview,stepCinematic} from "'+(v==='0165'?'./':'../')+dep+'";';
   const expected=line+'\nimport {createUnifiedFlightAdvance} from "./unified-flight.mjs";\n'+
    'export {UNIFIED_FLIGHT_0112,createUnifiedFlightRig,resetUnifiedFlightRig,unifiedFlightAudit} from "./unified-flight.mjs";\n'+
    'export const advanceUnifiedFlightRig=createUnifiedFlightAdvance({turnPreview,stepCinematic});\n';
   assert.equal(content,expected,'Unified flight adapter differs from approved cinematic dependency');
   original=readFileSync(resolve(flight,'unified-flight.mjs'),'utf8')
    .replace("// Cinematic presentation supplied by adapter.",'import {turnPreview,stepCinematic} from "./'+dep+'";')
    .replace("export function createUnifiedFlightAdvance({turnPreview,stepCinematic}){\nfunction advanceUnifiedFlightRig(","export function advanceUnifiedFlightRig(")
    .replace(" return advanceUnifiedFlightRig;\n}\n",'');
  }
  assert.equal(hash(Buffer.from(original,'utf8')),manifest.files[name].originalGitBlobSha,
   'Flight/GRIP/camera/boost source content differs from original: '+name);
  for(const match of actual.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)){
   const target=resolve(dirname(file),match[1].split(/[?#]/)[0]);
   assert.ok(existsSync(target),'Unresolved flight dependency: '+name+' -> '+match[1]);
   const rel=relative(root,target);
   assert.ok(rel&&rel!=='..'&&!rel.startsWith('..'+sep),'Flight dependency escapes SKYSHIFT: '+name);
  }
 }
});
test('Stage H: no executable import or CI command references stale root flight module paths',()=>{
 const files=[...walk(root),...walk(resolve(repository,'.github/workflows'))];
 assert.ok(files.length>250,'Unexpectedly few source files audited');
 for(const file of files){
  // Only the Stage H historical-hash inversion helper intentionally spells obsolete paths.
  // Its reversibility is independently enforced by the original Stage 5–8 source SHA audits.
  if(file===fileURLToPath(import.meta.url)||file===resolve(root,'tests/architecture/flight-test-path-overlay-stageH.mjs'))continue;
  const source=readFileSync(file,'utf8');
  for(const name of names){
   assert.equal(source.includes('skyshift/'+name),false,'Stale repository-root flight import: '+relative(repository,file)+' -> '+name);
   if(file.startsWith(flight+sep))continue; // moved flight siblings retain ./ imports
   const escaped=name.replaceAll('.','\\.');
   const stale=new RegExp('["\\x27](?:\\./|(?:\\.\\./)+)'+escaped+'["\\x27]');
   assert.doesNotMatch(source,stale,'Stale relative flight import: '+relative(repository,file)+' -> '+name);
  }
 }
});
