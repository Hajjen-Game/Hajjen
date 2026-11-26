// SKYSHIFT 0.21.6 — Cinematic Energy & Motion.
// Adds time-coherent, speed-dependent visual movement INSIDE existing flow
// cores and the integrated PBR road's outer shoulder. No full-screen blur,
// no new objects, geometry, lights, passes, clocks or physics changes.
// Driven from existing velocityState.flowPhaseMeters, worldFlow and actual
// boost multiplier. Disabled when playing is paused; does not affect the
// historical traveling zone wave / white core or exterior light seals.
import {installIntegratedNeonFlow}
 from "./integrated-neon-flow-v0214.mjs";
export const CINEMATIC_ENERGY_0216=Object.freeze({
 version:"0.21.6",id:"cinematic-energy-motion",
 source:"existing-velocity-flow-phase-and-zone-wave",
 worldSpace:true,flowCoresOnly:true,
 roadShoulderOnly:true,roadGuideUnchanged:true,
 neutralLightAdded:0,localLightsAdded:0,newMeshes:0,
 newDrawBatches:0,newRenderPasses:0,
 fullScreenMotionBlur:false,newTimers:0,
 cameraChanged:false,shipChanged:false,gripChanged:false,
 trackChanged:false,solarSealUnchanged:true,
 mobileIntensityScale:0.72,
 comparison:"?cinematicMotion=classic"
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
export function cinematicEnergyFrame({flow=0,phaseMeters=0,boost=0,
 playing=true,lowMemory=false}={}){
 const amount=playing?clamp(flow)* (lowMemory?
  CINEMATIC_ENERGY_0216.mobileIntensityScale:1):0;
 return {
  flow:amount,
  phaseMeters:Number.isFinite(phaseMeters)?phaseMeters:0,
  boost:playing?clamp(boost):0
 };
}
const flowAnchor="diffuseColor.rgb = tunnelSpectrumTint()*vTunnelGlow;";
const roadAnchor="#include <emissivemap_fragment>";
export function patchCinematicFlowFragment(fragment){
 if(!fragment.includes(flowAnchor)||
    !fragment.includes("varying float vTunnelTrack;")||
    !fragment.includes("varying float vTunnelGlow;"))
  throw Error("0.21.6 expects existing native zone-wave FLOW_CORES shader");
 const declare=[
  "uniform float uCinemaFlow;",
  "uniform float uCinemaBoost;",
  "uniform float uCinemaPhase;"
 ].join("\n");
 const modifier=[
  "// A low-frequency travelling energy modulation, never strobing a room.",
  "float cinemaRailPhase=(vTunnelTrack-uCinemaPhase)*0.118;",
  "float cinemaRailSurge=pow(0.5+0.5*sin(cinemaRailPhase),5.0);",
  "float cinemaRailBody=(0.08+0.23*cinemaRailSurge)*uCinemaFlow;",
  "float cinemaRailBoost=0.075*uCinemaBoost*uCinemaFlow;",
  "diffuseColor.rgb*=1.0+cinemaRailBody+cinemaRailBoost;"
 ].join("\n");
 return fragment.replace("#include <common>","#include <common>\n"+declare)
  .replace(flowAnchor,flowAnchor+"\n"+modifier);
}
export function patchCinematicRoadFragment(fragment){
 if(!fragment.includes(roadAnchor)||
    !fragment.includes("varying vec2 vTrackCoord;")||
    !fragment.includes("float trackL = vTrackCoord.y;")||
    !fragment.includes("vec3 zoneAccent")||
    !fragment.includes("float whiteCore=0.0"))
  throw Error("0.21.6 expects native integrated PBR road/zone-wave shader");
 const names=[
  "uniform float uCinemaFlow;",
  "uniform float uCinemaBoost;",
  "uniform float uCinemaPhase;"
 ].join("\n");
 const light=[
  "// Restrained *colored* glints at outer shoulders only, not lane marks.",
  "float cinemaTunnel=1.0-smoothstep(338.0,368.0,trackS);",
  "float cinemaOuter=smoothstep(7.25,8.65,abs(trackL))*",
  "  (1.0-smoothstep(10.1,11.15,abs(trackL)));",
  "float cinemaTravel=pow(0.5+0.5*sin((trackS-uCinemaPhase)*0.118),6.0);",
  "float cinemaShoulderPower=cinemaTunnel*cinemaOuter*uCinemaFlow*",
  "  (0.010+0.052*cinemaTravel+0.016*uCinemaBoost);",
  "totalEmissiveRadiance+=zoneAccent*cinemaShoulderPower;"
 ].join("\n");
 return fragment.replace("#include <common>","#include <common>\n"+names)
  .replace(roadAnchor,roadAnchor+"\n"+light);
}
function installShaderControls(material,patch,suffix,uniforms){
 if(!material||typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw Error("0.21.6 requires existing shader-capable material");
 const previous=material.onBeforeCompile;
 const key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=patch(shader.fragmentShader);
 };
 material.customProgramCacheKey=function(){
  return key.call(this)+"-cinematic-energy-0216-"+suffix;
 };
 material.needsUpdate=true;
}
// The shared tunnel owns the flow material only. The legacy Skyline
// installer still requires and binds its actual physical racing deck.
export function bindCinematicEnergyMaterials(flowMaterial,road,{tunnelOnly=false}={}){
 if(!flowMaterial||(!tunnelOnly&&!road?.isMeshStandardMaterial))
  throw Error("0.21.6 requires flow cores and native physical road");
 if(tunnelOnly&&road)throw Error("EF05 tunnel-only motion cannot own a road material");
 const make=()=>({
  uCinemaFlow:{value:0},uCinemaBoost:{value:0},uCinemaPhase:{value:0}
 });
 const neon=make(),deck=tunnelOnly?null:make();
 installShaderControls(flowMaterial,patchCinematicFlowFragment,"flow",neon);
 if(deck)installShaderControls(road,patchCinematicRoadFragment,"road",deck);
 return {neon,deck};
}
export function installCinematicEnergyMotion(THREE,world,options={}){
 const base=installIntegratedNeonFlow(THREE,world,options);
 const old=base.stats();
 if(!old.active||!old.flowEnabled||old.flowStatus!=="active")return base;
 const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const mesh=group?.children?.find(x=>x.name==="Tunnel / FLOW_CORES");
 const {neon,deck}=bindCinematicEnergyMaterials(mesh?.material,options.roadMaterial,
  {tunnelOnly:options.tunnelOnly===true});
 let last=cinematicEnergyFrame(),updates=0,comparison=1;
 const state={
  cinematicEnergyEnabled:true,cinematicEnergyVersion:"0.21.6",
  cinematicStatus:"active",motionSource:"existing-world-flow",
  cinematicDrawBatches:0,cinematicNewLights:0,
  cinematicNewRenderPasses:0,cinematicMobile:Boolean(options.lowMemory),
  cinematicComparedTo:CINEMATIC_ENERGY_0216.comparison,
  cinemaSameWaveState:true,cinemaNoPhysicsChanges:true,
  cinematicRoadMotionBound:!!deck
 };
 const apply=()=>{
  for(const u of (deck?[neon,deck]:[neon])){
   u.uCinemaFlow.value=last.flow*comparison;
   u.uCinemaBoost.value=last.boost;
   u.uCinemaPhase.value=last.phaseMeters;
  }
 };
 return {
  ready:base.ready,
  stats(){return {...base.stats(),...state,
   version:"0.21.6",motionUpdates:updates,
   cinematicFlow:neon.uCinemaFlow.value,
   cinematicBoost:neon.uCinemaBoost.value,
   cinematicPhaseMeters:neon.uCinemaPhase.value,
   cinematicComparison:comparison};},
  updateWave(wave){base.updateWave?.(wave)},
  updateMotion(frame){
   last=cinematicEnergyFrame({...frame,lowMemory:options.lowMemory});
   updates++;apply();
  },
  setMotionComparison(enabled){comparison=clamp(enabled);apply()},
  // CI can capture the same frame at representative speeds without
  // stepping physics or changing the original high-speed flight state.
  setMotionSample(frame){last=cinematicEnergyFrame({
   ...frame,lowMemory:options.lowMemory
  });apply()},
  dispose(){base.dispose()}
 };
}
