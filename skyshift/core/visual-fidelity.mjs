// SKYSHIFT 0.11.4 — Smart Fidelity Refinement.
// Reuses 0.11.3 premium sheen while moving spatial GLSL from pixels to vertices.
// No extra textures, particles, lights or render passes.
// Low-memory devices still compile the exact existing 0.11.2 road shader.
// Material construction is supplied by the compatibility adapter.
import {patchSmartRoadShader as patchLegacyRoadShader} from "./visual-fidelity-v0113.mjs";
export const FIDELITY_0114=Object.freeze({
 version:"smart-fidelity-refinement-0114",
 premiumMode:"vertex-nearfield-pbr-sheen",referenceMode:"classic-pbr",
 legacyMode:"fragment-nearfield-pbr-sheen",
 defaultPremiumBloomScale:0.88,defaultLowMemoryBloomScale:0.78,
 maxGuideBrightening:.085,maxRoughnessReduction:.055,
 nearDetailStartMeters:26,nearDetailEndMeters:74,
 extraDrawCalls:0,extraTriangles:0,extraTextures:0,
 extraRenderPasses:0,extraLights:0,
 shaderChangesOnLowMemory:false,pilotPhysicsChanged:false,
 originalPixelModOps:1,refinedPixelModOps:0,
 originalPixelSmoothsteps:3,refinedPixelSmoothsteps:0,
 screenPixelFootprintReduced:true,vertexMaskInterpolated:true,
 cockpitCameraChanged:false,whiteCoreUnchanged:true,
 smaaUnchanged:true,bloomResolutionUnchanged:true
});
const clamp=(x,lo=0,hi=1)=>Math.min(hi,Math.max(lo,Number.isFinite(x)?x:0));
export function selectFidelityProfile({lowMemory=false,preset="baseline"}={}){
 const forceOn=preset==="fidelity-on",forceOff=preset==="fidelity-off";
 const legacy=preset==="fidelity-legacy";
 const premium=forceOn||legacy||(!forceOff&&!lowMemory);
 return Object.freeze({
  version:FIDELITY_0114.version,
  mode:premium?(legacy?FIDELITY_0114.legacyMode:FIDELITY_0114.premiumMode):FIDELITY_0114.referenceMode,
  premium,legacy,forced:forceOn||forceOff||legacy,lowMemory:!!lowMemory,
  extraRenderPasses:0,extraDrawCalls:0,extraLights:0,
  bloomUnchanged:true
 });
}
export function createFidelityDirector(profile){
 return {profile,energy:0,arc:0,updates:0,peakEnergy:0,
  nearFieldActiveFrames:0,speedResponse:0,lastBoost:0,lastWave:0};
}
export function resetFidelityDirector(st){
 st.energy=0;st.arc=0;st.updates=0;st.peakEnergy=0;
 st.nearFieldActiveFrames=0;st.speedResponse=0;
 st.lastBoost=0;st.lastWave=0;
 return st;
}
export function advanceFidelityDirector(st,dt,{
 s=0,speed=44,boostMultiplier=1,wave=0,playing=true,
 circuitLength=3400
}={}){
 const length=Math.max(1,circuitLength);
 st.arc=((Number.isFinite(s)?s:0)%length+length)%length;
 if(!playing||dt<=0)return st;
 const speedFactor=clamp((speed-44)/(101.4-44));
 const boost=clamp((boostMultiplier-1)/.4);
 const spectral=clamp(wave);
 // No animated stripes crossing the road and no visual steering impulse.
 // Only the strength of the EXISTING painted guides and their PBR finish.
 const target=st.profile.premium?
  clamp(.38+.30*speedFactor+.18*boost+.14*spectral):0;
 st.energy+=(target-st.energy)*(1-Math.exp(-6*clamp(dt,0,.095)));
 st.speedResponse=speedFactor;st.lastBoost=boost;st.lastWave=spectral;
 st.updates++;
 st.peakEnergy=Math.max(st.peakEnergy,st.energy);
 if(st.energy>.1)st.nearFieldActiveFrames++;
 return st;
}
export function fidelityAudit(st){
 return {...FIDELITY_0114,profile:st.profile.mode,profileForced:st.profile.forced,
  lowMemory:st.profile.lowMemory,
  shaderStage:st.profile.legacy?"fragment":st.profile.premium?"vertex":"none",
  pixelModOps:st.profile.legacy?1:0,
  pixelSmoothsteps:st.profile.legacy?3:0,
  nearFieldActiveFrames:st.nearFieldActiveFrames,
  updates:st.updates,peakEnergy:+st.peakEnergy.toFixed(4),
  currentEnergy:+st.energy.toFixed(4),lastBoost:+st.lastBoost.toFixed(3),
  lastWave:+st.lastWave.toFixed(3)};
}
// This is inserted AFTER the existing premium shader coloring and BEFORE
// the Shadow Tunnel / Blackout shader decorators. They can keep their exact
// source anchors and still black out the roadway body as designed.
// v0.11.4: Calculate the periodic 3.4km distance and mask ONCE PER VERTEX.
// The physical top deck already has 0.8 m longitudinal tessellation; smooth
// varying interpolation preserves the same near-field sheen without doing a
// modulo + three smoothsteps for every shaded pixel, every frame.
export function patchRefinedRoadShaders(vertex,fragment){
 const vHeader="#include <common>",assign="vTrackCoord = aTrackCoord;";
 const fHeader="#include <common>",road="diffuseColor.rgb = road;";
 const rough="#include <roughnessmap_fragment>";
 if(!vertex.includes(vHeader)||!vertex.includes(assign)||
   !fragment.includes(fHeader)||!fragment.includes(road)||
   !fragment.includes(rough))
  throw Error("Smart Fidelity 0.11.4: unsupported premium road shader layout");
 const vDeclarations=`
uniform float uFidelityArc;
uniform float uCircuitLength;
varying float vFidelityMask;
`;
 const vSignal=`
  float fidelityDist = abs(aTrackCoord.x - uFidelityArc);
  fidelityDist = min(fidelityDist, uCircuitLength - fidelityDist);
  float fidelityNear = 1.0 - smoothstep(26.0,74.0,fidelityDist);
  float fidelityLateral = abs(aTrackCoord.y);
  float fidelityLane = smoothstep(2.8,4.6,fidelityLateral) *
    (1.0 - smoothstep(9.2,10.2,fidelityLateral));
  vFidelityMask = fidelityNear*fidelityLane;
`;
 const fDeclarations=`
uniform float uFidelityEnergy;
varying float vFidelityMask;
`;
 const fSignal=`
  // Interpolated road-vertex mask, multiplied by our existing smoothed
  // speed/boost/zone signal. No modulo or smoothstep in this fragment path.
  float fidelityDetail = vFidelityMask*uFidelityEnergy;
  // Keep 0.11.3 color and micro-roughness finish — no extra racing lines.
  road = mix(road,vec3(.92,.97,1.0),
    clamp(guided*fidelityDetail*.085,0.0,.085));
`;
 const roughExt=`
  roughnessFactor = max(0.24,
    roughnessFactor - fidelityDetail*.055);
`;
 return {
  vertexShader:vertex.replace(vHeader,vHeader+vDeclarations)
    .replace(assign,assign+"\n"+vSignal),
  fragmentShader:fragment.replace(fHeader,fHeader+fDeclarations)
    .replace(road,fSignal+"\n  "+road)
    .replace(rough,rough+"\n"+roughExt)
 };
}
export function createSmartPremiumTrackMaterialWithFactory(createPremiumTrackMaterial,THREE,profile){
 const surface=createPremiumTrackMaterial(THREE);
 if(!profile?.premium){
  return {...surface,setFidelitySignal(){},fidelityShaderEnabled:false,
   fidelityShaderVariant:"classic-pbr"};
 }
 const mat=surface.material,previous=mat.onBeforeCompile;
 const previousKey=mat.customProgramCacheKey;
 const uniformArc={value:0},uniformEnergy={value:0};
 mat.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  if(profile.legacy){
   // Exact 0.11.3 shader for apples-to-apples profiling.
   shader.fragmentShader=patchLegacyRoadShader(shader.fragmentShader);
  }else{
   const refined=patchRefinedRoadShaders(shader.vertexShader,shader.fragmentShader);
   shader.vertexShader=refined.vertexShader;
   shader.fragmentShader=refined.fragmentShader;
  }
  shader.uniforms.uFidelityArc=uniformArc;
  shader.uniforms.uFidelityEnergy=uniformEnergy;
 };
 mat.customProgramCacheKey=()=>previousKey.call(mat)+
  (profile.legacy?"-smart-fidelity-0113-legacy":"-smart-fidelity-0114-vertex");
 mat.needsUpdate=true;
 return {...surface,fidelityShaderEnabled:true,
  fidelityShaderVariant:profile.mode,
  setFidelitySignal(st){
   uniformArc.value=st.arc;uniformEnergy.value=st.energy;
  }};
}
