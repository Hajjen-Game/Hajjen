// SKYSHIFT 0.28.5 — spatial wavefront parity for the TRUE shared VAULT.
// Ten reused Skyline 368m modules expose LOCAL source trackS, while the
// road/ship flight uses 3400m GLOBAL arc length. Their old shader compared
// local trackS directly with the global wave front, coloring sections early.
// This renderer-only adapter maps source metres into the real track arc;
// it never changes the geometry, PBR fixtures, local 0.26.x shaders,
// 120Hz wave scheduler, camera, collision, boost or GRIP.
import {ZONE_WAVE} from "../core/zone-wave-v060.mjs";

export const VAULT_WAVE_PARITY_0285=Object.freeze({
 version:"0.28.5",name:"Shared Tunnel Spatial Wavefront Parity",
 source:"zone-wave-v060",mode:"global track arc to source module shader",
 shader:"same lap-local periodic signed front as the existing road",
 originalSourceMeters:368,trackLengthMeters:3400,modules:10,
 transitionMeters:ZONE_WAVE.atmosphereTransitionMeters,
 compare:"?track=vault&v=0.28.5&waveSync=classic",
 geometryChanged:false,physicsChanged:false,gripChanged:false,
 boostChanged:false,neonSourceColorsChanged:false,
 addedLights:0,addedMeshes:0,addedDrawCalls:0,addedRenderPasses:0
});
export function vaultSpatialWaveEnabled0285(search=
 typeof location!=="undefined"?location.search:""){
 const params=new URLSearchParams(search||"");
 if(params.get("track")!=="vault"||
  ["classic","off"].includes(params.get("waveSync")))return false;
 const version=/^(\d+)\.(\d+)\.(\d+)(?:\.\d+)?$/.exec(params.get("v")||"");
 if(!version)return false;
 const [major,minor,patch]=version.slice(1).map(Number);
 return major>0||minor>28||(minor===28&&patch>=5);
}
export function waveSignedGlobal0285(sourceS,front,module,lapMeters){
 if(!module||!Number.isFinite(sourceS)||!Number.isFinite(front)||
  !Number.isFinite(lapMeters)||lapMeters<=0||
  !Number.isFinite(module.start)||!Number.isFinite(module.scale)||
  module.scale<=0)throw Error("0.28.5 invalid source-front arc");
 const globalS=module.start+sourceS*module.scale;
 return ((globalS-front+lapMeters*.5)%lapMeters+
  lapMeters)%lapMeters-lapMeters*.5;
}
export function waveColorAmount0285(signed,feather=ZONE_WAVE.atmosphereTransitionMeters){
 const t=Math.max(0,Math.min(1,(signed+feather)/(2*feather)));
 return 1-(t*t*(3-2*t));
}
const ANCHORS=Object.freeze([
 {name:"native tunnel neon",pattern:/\bvTunnelTrack\s*-\s*uTunnelFront\b/g},
 {name:"raised panel palette",pattern:/\bvRebirthTrack\s*-\s*uRebirthFront\b/g}
]);
const COMMON="#include <common>";
const GLOBAL_FN=`
uniform float uVaultWaveStart0285;
uniform float uVaultWaveScale0285;
uniform float uVaultWaveLap0285;
float vaultSignedWave0285(float sourceS,float globalFront){
  float globalS=uVaultWaveStart0285+sourceS*uVaultWaveScale0285;
  return mod(globalS-globalFront+0.5*uVaultWaveLap0285,
    uVaultWaveLap0285)-0.5*uVaultWaveLap0285;
}`;
export function patchVaultSpatialWave0285(fragment){
 if(typeof fragment!=="string")throw Error("0.28.5 GLSL required");
 let updated=fragment,patched=0;
 for(const anchor of ANCHORS){
  let count=0;
  updated=updated.replace(anchor.pattern,()=>{count++;return anchor.name===
   "native tunnel neon"?
   "vaultSignedWave0285(vTunnelTrack,uTunnelFront)":
   "vaultSignedWave0285(vRebirthTrack,uRebirthFront)";});
  patched+=count;
 }
 if(patched&&!updated.includes(COMMON))
  throw Error("0.28.5 missing shared GLSL common anchor");
 if(patched)
  updated=updated.replace(COMMON,COMMON+"\n"+GLOBAL_FN);
 return {fragmentShader:updated,patched};
}
export function installVaultSpatialWaveModule0285(THREE,section,module,{
 trackLength=3400,enabled=false
}={}){
 if(!enabled)return {active:false,materials:0,stats:()=>({active:false}),dispose(){}};
 if(!THREE||!section?.getObjectByName||!module||
  !Number.isFinite(trackLength)||trackLength<=0)
  throw Error("0.28.5 requires real shared module and lap");
 const group=section.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
 if(!group)throw Error("0.28.5 original source tunnel missing");
 const uniform={
  uVaultWaveStart0285:{value:module.start},
  uVaultWaveScale0285:{value:module.scale},
  uVaultWaveLap0285:{value:trackLength}
 };
 const restores=[],tracked=[];
 // Native animated tunnel meshes only. The 0.26.x PBR coats retain their
 // own local fixture positions and microstructure; the extra amber/cyan
 // cove fixtures stay their original immutable warm/cool sources.
 const targets=new Set(["Tunnel / CLOSED_SHELL","Tunnel / CURVED_RIBS",
  "Tunnel / INTEGRATED_LIGHT","Tunnel / HALO",
  "Tunnel / HARDSURFACE_PANELS","Tunnel / STRUCTURAL_CONDUITS"]);
 try{
  group.traverse(mesh=>{
   if(!mesh?.isMesh||!targets.has(mesh.name))return;
   const material=mesh.material;
   if(!material||typeof material.onBeforeCompile!=="function")return;
   const before=material.onBeforeCompile,
    previousKey=material.customProgramCacheKey;
   material.onBeforeCompile=function(shader,renderer){
    before.call(this,shader,renderer);
    const result=patchVaultSpatialWave0285(shader.fragmentShader);
    if(result.patched){
     shader.fragmentShader=result.fragmentShader;
     Object.assign(shader.uniforms,uniform);
    }
   };
   material.customProgramCacheKey=function(){
    return (previousKey?.call(this)||"")+
     "-vault-spatial-wave-0285";
   };
   material.needsUpdate=true;
   tracked.push(mesh.name);
   restores.push(()=>{
    material.onBeforeCompile=before;
    material.customProgramCacheKey=previousKey;
    material.needsUpdate=true;
   });
  });
  if(tracked.length<4)
   throw Error("0.28.5 insufficient original synchronized tunnel surfaces: "+tracked.length);
 }catch(e){
  for(const restore of restores.reverse())restore();
  throw e;
 }
 return {
  active:true,materials:tracked.length,
  stats:()=>({active:true,moduleIndex:module.index,
   start:module.start,end:module.end,sourceMeters:module.sourceMeters,
   scale:module.scale,lapMeters:trackLength,
   patchedMaterials:tracked.length,materialNames:[...tracked],
   realArcLength:true,wrapsCourseLap:true,changedGeometry:false,
   changedLocalGGX:false,addedPasses:0}),
  dispose(){for(const restore of restores.reverse())restore();}
 };
}

// Retire the visual front beyond the 650m camera far plane plus feather
// and camera/road margin, before the 1700m periodic wrap. Keep race state intact.
export const VAULT_WAVE_SETTLE_AHEAD_02899=900;
export function createSinglePassWaveView02899(){
 let settledStage=0,lastState=null;
 const settled={activeCount:0,shaderBaseStage:0,playerStage:0,
  fronts:[-10000,-10000,-10000],lastStepSeconds:0};
 return function visualWave(state,playerS){
  if(state!==lastState){lastState=state;settledStage=0;}
  const latest=state.waves?.at(-1);
  if(!latest||!state.activeCount)return state;
  if(state.fronts[0]-playerS>=VAULT_WAVE_SETTLE_AHEAD_02899)
   settledStage=Math.max(settledStage,latest.index);
  if(settledStage!==latest.index)return state;
  settled.shaderBaseStage=latest.index;
  settled.playerStage=state.playerStage;
  settled.lastStepSeconds=state.lastStepSeconds;
  return settled;
 };
}
