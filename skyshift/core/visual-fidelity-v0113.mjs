// SKYSHIFT 0.11.3 — Smart Visual Fidelity.
// Adds perceptually useful near-field PBR sheen to the EXISTING road shader
// on premium devices. No extra textures, particles, lights or render passes.
// Low-memory devices compile the exact existing 0.11.2 deck shader instead.
import {createPremiumTrackMaterial} from "../rendering/road/premium-track-v0901.mjs";
export const FIDELITY_0113=Object.freeze({
 version:"smart-visual-fidelity-0113",
 premiumMode:"near-field-pbr-sheen",referenceMode:"classic-pbr",
 defaultPremiumBloomScale:0.88,defaultLowMemoryBloomScale:0.78,
 maxGuideBrightening:.085,maxRoughnessReduction:.055,
 nearDetailStartMeters:26,nearDetailEndMeters:74,
 extraDrawCalls:0,extraTriangles:0,extraTextures:0,
 extraRenderPasses:0,extraLights:0,
 shaderChangesOnLowMemory:false,pilotPhysicsChanged:false,
 cockpitCameraChanged:false,whiteCoreUnchanged:true,
 smaaUnchanged:true,bloomResolutionUnchanged:true
});
const clamp=(x,lo=0,hi=1)=>Math.min(hi,Math.max(lo,Number.isFinite(x)?x:0));
export function selectFidelityProfile({lowMemory=false,preset="baseline"}={}){
 const forceOn=preset==="fidelity-on",forceOff=preset==="fidelity-off";
 const premium=forceOn||(!forceOff&&!lowMemory);
 return Object.freeze({
  version:FIDELITY_0113.version,
  mode:premium?FIDELITY_0113.premiumMode:FIDELITY_0113.referenceMode,
  premium,forced:forceOn||forceOff,lowMemory:!!lowMemory,
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
 return {...FIDELITY_0113,profile:st.profile.mode,profileForced:st.profile.forced,
  lowMemory:st.profile.lowMemory,
  nearFieldActiveFrames:st.nearFieldActiveFrames,
  updates:st.updates,peakEnergy:+st.peakEnergy.toFixed(4),
  currentEnergy:+st.energy.toFixed(4),lastBoost:+st.lastBoost.toFixed(3),
  lastWave:+st.lastWave.toFixed(3)};
}
// This is inserted AFTER the existing premium shader coloring and BEFORE
// the Shadow Tunnel / Blackout shader decorators. They can keep their exact
// source anchors and still black out the roadway body as designed.
export function patchSmartRoadShader(fragment){
 const header="#include <common>";
 const road="diffuseColor.rgb = road;";
 const rough="#include <roughnessmap_fragment>";
 if(!fragment.includes(header)||!fragment.includes(road)||!fragment.includes(rough))
  throw Error("Smart Visual Fidelity: unsupported premium road shader layout");
 const headerExt=`
uniform float uFidelityArc;
uniform float uFidelityEnergy;
`;
 const detail=`
  // Periodic distance along the same 3400m loop as the 3D physical deck.
  // Fade at 74m; no animated circles, cheap geometry, or screen-space noise.
  float fidelityDelta = mod(trackS - uFidelityArc + 0.5*uCircuitLength,
    uCircuitLength) - 0.5*uCircuitLength;
  float fidelityNear = 1.0 - smoothstep(26.0,74.0,abs(fidelityDelta));
  float fidelityLane = smoothstep(2.8,4.6,absL) *
    (1.0 - smoothstep(9.2,10.2,absL));
  float fidelityDetail = fidelityNear*fidelityLane*uFidelityEnergy;
  // Only the EXISTING inner/outer guide paint gains a restrained pale
  // specular edge. No new longitudinal lines or repeating obstacles.
  road = mix(road,vec3(.92,.97,1.0),
    clamp(guided*fidelityDetail*.085,0.0,.085));
`;
 const roughExt=`
  // Physical microsheen: slightly smoother metallic surface near the
  // player, preserving base material, color waves and shadow-tunnel fade.
  roughnessFactor = max(0.24,
    roughnessFactor - fidelityDetail*.055);
`;
 return fragment.replace(header,header+headerExt)
  .replace(road,detail+"\n  "+road)
  .replace(rough,rough+"\n"+roughExt);
}
export function createSmartPremiumTrackMaterial(THREE,profile){
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
  shader.fragmentShader=patchSmartRoadShader(shader.fragmentShader);
  shader.uniforms.uFidelityArc=uniformArc;
  shader.uniforms.uFidelityEnergy=uniformEnergy;
 };
 mat.customProgramCacheKey=()=>previousKey.call(mat)+"-smart-fidelity-0113";
 mat.needsUpdate=true;
 return {...surface,fidelityShaderEnabled:true,
  fidelityShaderVariant:"near-field-pbr-sheen",
  setFidelitySignal(st){
   uniformArc.value=st.arc;uniformEnergy.value=st.energy;
  }};
}
