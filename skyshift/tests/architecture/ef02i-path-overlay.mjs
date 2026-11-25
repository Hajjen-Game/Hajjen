import {restoreDeckMove,deckCurrentPath} from './ef02-closure-deck-overlay.mjs';
// EF02I: reverse only declared path edits and verify original Git identity.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
export const ef02iManifest=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02i-legacy-rendering-ownership.json'),'utf8'));
const ef02j=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02j-retired-visual-leaves.json'),'utf8'));
const key=p=>relative(repo,resolve(repo,p)).replaceAll('\\','/');
const hash=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
export function restoreEF02I(source,path){
 source=restoreDeckMove(source,path);
 const k=key(path);
 // EF02J: reconstruct only the three approved material adapters from actual shared source.
 const versions=["corkscrew-spectrum-072","high-leap-spectrum-081","track-rhythm-spectrum-082"];
 const cohort=["skyshift/rendering/legacy/premium-track-v072.mjs","skyshift/rendering/legacy/premium-track-v081.mjs","skyshift/rendering/legacy/premium-track-v082.mjs"];
 const index=cohort.indexOf(k);
 if(index>=0){
  const adapter=["import {createPremiumTrackAPI} from \"./shared-premium-track.mjs\";\nexport const {\n PREMIUM_TRACK,\n premiumTrackCoordinates,\n createPremiumDeckGeometry,\n GLSL_BOOST_PADS,\n SURFACE_FRAGMENT_GLSL,\n SURFACE_FRAGMENT_HELPERS,\n patchPremiumShaders,\n createPremiumTrackMaterial\n}=createPremiumTrackAPI({TRIAL,widthAt,ZONE_PALETTES,ZONE_WAVE,SPECTRAL_FRONT_GLSL,BOOST_PADS,createSmoothDeckData,MESH_SPEC,version:\"corkscrew-spectrum-072\"});\n","import {createPremiumTrackAPI} from \"./shared-premium-track.mjs\";\nexport const {\n PREMIUM_TRACK,\n premiumTrackCoordinates,\n createPremiumDeckGeometry,\n GLSL_BOOST_PADS,\n SURFACE_FRAGMENT_GLSL,\n SURFACE_FRAGMENT_HELPERS,\n patchPremiumShaders,\n createPremiumTrackMaterial\n}=createPremiumTrackAPI({TRIAL,widthAt,ZONE_PALETTES,ZONE_WAVE,SPECTRAL_FRONT_GLSL,BOOST_PADS,createSmoothDeckData,MESH_SPEC,version:\"high-leap-spectrum-081\"});\n","import {createPremiumTrackAPI} from \"./shared-premium-track.mjs\";\nexport const {\n PREMIUM_TRACK,\n premiumTrackCoordinates,\n createPremiumDeckGeometry,\n GLSL_BOOST_PADS,\n SURFACE_FRAGMENT_GLSL,\n SURFACE_FRAGMENT_HELPERS,\n patchPremiumShaders,\n createPremiumTrackMaterial\n}=createPremiumTrackAPI({TRIAL,widthAt,ZONE_PALETTES,ZONE_WAVE,SPECTRAL_FRONT_GLSL,BOOST_PADS,createSmoothDeckData,MESH_SPEC,version:\"track-rhythm-spectrum-082\"});\n"][index];
  const prefix="// Shared historical integrated PBR road material. Track data and version stay explicit.\nexport function createPremiumTrackAPI({TRIAL,widthAt,ZONE_PALETTES,ZONE_WAVE,SPECTRAL_FRONT_GLSL,BOOST_PADS,createSmoothDeckData,MESH_SPEC,version}){\n",suffix="\n return {PREMIUM_TRACK,premiumTrackCoordinates,createPremiumDeckGeometry,GLSL_BOOST_PADS,SURFACE_FRAGMENT_GLSL,SURFACE_FRAGMENT_HELPERS,patchPremiumShaders,createPremiumTrackMaterial};\n}\n";
  const shared=readFileSync(resolve(repo,'skyshift/rendering/legacy/shared-premium-track.mjs'),'utf8');
  assert.ok(source.endsWith(adapter),k+' unexpected premium material adapter');
  assert.ok(shared.startsWith(prefix)&&shared.endsWith(suffix),'Unexpected premium material factory shape');
  const body=shared.slice(prefix.length,-suffix.length)
   .replace(' version,',' version:"'+versions[index]+'",')
   .replace(/^(const (?:PREMIUM_TRACK|GLSL_BOOST_PADS|SURFACE_FRAGMENT_GLSL|SURFACE_FRAGMENT_HELPERS)=|function (?:premiumTrackCoordinates|createPremiumDeckGeometry|patchPremiumShaders|createPremiumTrackMaterial)\()/gm,'export $1');
  source=source.slice(0,-adapter.length)+body;
 }
 if(k===ef02j.workflow.path){
  // Only reconstruct the two archived syntax-only commands for historical hash evidence.
  for(const x of [...ef02j.workflow.edits].reverse()){
   assert.equal(source.split(x.after).length-1,1,k+' EF02J anchor');
   assert.ok(!source.includes(x.before),k+' stale EF02J command');
   source=source.replace(x.after,x.before);
  }
  assert.equal(hash(source),ef02j.workflow.sha,k+' EF02J workflow inverse');
 }
 const e=ef02iManifest.consumers.find(x=>x.path===k)||ef02iManifest.moves.find(x=>x.newPath===k);
 if(!e)return source;
 let s=source;
 for(const x of [...e.edits].reverse()){
  assert.equal(s.split(x.after).length-1,x.count,k+' '+x.after);
  assert.ok(!s.includes(x.before),k+' '+x.before);
  s=s.split(x.after).join(x.before);
 }
 assert.equal(hash(s),e.sha,k+' EF02I inverse');
 return s;
}
export function ef02iHistoricalExists(path){
 const move=ef02iManifest.moves.find(x=>x.oldPath===key(path));
 if(!move)return null;
 assert.ok(!existsSync(resolve(repo,move.oldPath)),move.oldPath);
 restoreEF02I(readFileSync(resolve(repo,move.newPath),'utf8'),move.newPath);
 return true;
}
