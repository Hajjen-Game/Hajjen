// SKYSHIFT 0.21.2.6 — Road Solar Spill Containment.
// The sealed neon tunnel is lit by authored local neon, yet the integrated
// PBR deck still accepts most of the exterior key and hemisphere response.
// 0.21.2.3 already reduces specular but retains 78% of direct diffuse.
// Contain the remaining broad neutral daylight contribution at the source,
// BEFORE road emission, tone mapping and bloom. Never darken final pixels:
// moving white wave crest, guide emission and palette must be untouched.
// The physical road is one material for the entire course; the s-coordinate
// mask restores the original lighting before the tunnel exit.
export const ROAD_SOLAR_SPILL_02126=Object.freeze({
 version:"0.21.2.6",id:"road-solar-spill-containment",
 start:0,fullUntil:340,end:368,
 directDiffuseScale:0.08,indirectDiffuseScale:0.20,
 directSpecularScale:0.08,indirectSpecularScale:0.14,
 roadOnly:true,exteriorKeyUnmodified:true,
 laneEmissionUnmodified:true,whiteCrestUnmodified:true,
 neonWaveUnmodified:true,fogUnmodified:true,
 shipUnmodified:true,railsUnmodified:true,
 extraDrawCalls:0,extraLights:0,extraRenderPasses:0,
 geometryChanged:false,handlingChanged:false,gripChanged:false,
 cameraChanged:false,
 comparison:"?roadSolar=classic"
});
const clamp01=x=>Math.max(0,Math.min(1,x));
export function roadSolarTunnelMask(s){
 if(!Number.isFinite(s)||s<ROAD_SOLAR_SPILL_02126.start)return 0;
 const t=clamp01((s-ROAD_SOLAR_SPILL_02126.fullUntil)/
   (ROAD_SOLAR_SPILL_02126.end-ROAD_SOLAR_SPILL_02126.fullUntil));
 return 1-t*t*(3-2*t);
}
export function patchRoadSolarSpillShader(fragment){
 const common="#include <common>";
 const lights="#include <lights_fragment_end>";
 // The road's authored aTrackCoord is the physical longitudinal arc,
 // not the ship location. This works for both high and 4GB GPU profiles.
 if(!fragment.includes(common)||!fragment.includes(lights)||
    !fragment.includes("varying vec2 vTrackCoord")||
    !fragment.includes("reflectedLight.directDiffuse")||
    !fragment.includes("float whiteCore=0.0"))
  throw Error("0.21.2.6: missing original integrated PBR road/wave shader");
 return fragment
  .replace(common,common+"\nuniform float uRoadSolarSpillSeal;")
  .replace(lights,lights+"\n"+[
   "// External neutral light is sealed over 0–340m, easing out by 368m.",
   "float roadSolarMask = uRoadSolarSpillSeal * (1.0 - smoothstep(340.0,368.0,vTrackCoord.x));",
   // Preserve native spectral wave, white crest and guide emission. These
   // reflectedLight terms are strictly PBR world-light response.
   "reflectedLight.directDiffuse *= mix(1.0,0.08,roadSolarMask);",
   "reflectedLight.indirectDiffuse *= mix(1.0,0.20,roadSolarMask);",
   "reflectedLight.directSpecular *= mix(1.0,0.08,roadSolarMask);",
   "reflectedLight.indirectSpecular *= mix(1.0,0.14,roadSolarMask);"
  ].join("\n"));
}
export function createRoadSolarSpillController(material){
 if(!material||!material.isMeshStandardMaterial||
    typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw Error("0.21.2.6 requires existing integrated MeshStandard road");
 const uniform={value:1};
 const previous=material.onBeforeCompile;
 const oldKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.uniforms.uRoadSolarSpillSeal=uniform;
  shader.fragmentShader=patchRoadSolarSpillShader(shader.fragmentShader);
 };
 material.customProgramCacheKey=function(){
  return oldKey.call(this)+"-road-solar-spill-02126";
 };
 material.needsUpdate=true;
 return {
  setComparison(value){uniform.value=clamp01(Number.isFinite(value)?value:1)},
  stats:()=>({
   version:ROAD_SOLAR_SPILL_02126.version,active:true,
   seal:uniform.value,roadOnly:true,
   priorWhiteCoreShaderRetained:true,
   whiteCrestUnchanged:true,guideEmissionUnchanged:true,
   paletteUnchanged:true,worldLightsUnchanged:true,
   geometryUnchanged:true,physicsUnchanged:true,gripUnchanged:true
  })
 };
}
