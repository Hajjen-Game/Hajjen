// SKYSHIFT 0.21.2.1 — one spatial wave drives *every* tunnel neon material.
// Shares the exact simulation state and palette definitions of the deck,
// rail inlays, HUD and ship. No extra clock or separate wave travelling.
import {ZONE_PALETTES,ZONE_WAVE,frontPaletteBlend}
 from "../zone-wave-v060.mjs";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const TUNNEL_SPECTRUM_02121=Object.freeze({
 version:"0.21.2.1",source:"zone-wave-v060",
 waveFeatherMeters:ZONE_WAVE.atmosphereTransitionMeters,
 paletteCount:ZONE_PALETTES.length,shaderUniformOnly:true,
 geometryUnchanged:true,additionalRenderPasses:0,dynamicLights:0,
 physicsChanges:0,comparison:"?tunnelSpectrum=classic"
});
export function tunnelColorAt(state,s){
 const {from,to,mix}=frontPaletteBlend(state,s);
 return {from,to,mix,
  colorFrom:ZONE_PALETTES[from]?.light??ZONE_PALETTES[0].light,
  colorTo:ZONE_PALETTES[to]?.light??ZONE_PALETTES[0].light};
}
export function createTunnelSpectrumUniforms(THREE){
 return {
  uTunnelOld:{value:new THREE.Color(ZONE_PALETTES[0].light)},
  uTunnelNext:{value:new THREE.Color(ZONE_PALETTES[0].light)},
  uTunnelFront:{value:-10000},
  uTunnelActive:{value:0}
 };
}
export function updateTunnelSpectrumUniforms(uniforms,wave){
 const stage=clamp(wave?.shaderBaseStage??0,0,ZONE_PALETTES.length-1);
 const next=clamp(stage+1,0,ZONE_PALETTES.length-1);
 uniforms.uTunnelOld.value.setHex(ZONE_PALETTES[stage].light);
 uniforms.uTunnelNext.value.setHex(ZONE_PALETTES[next].light);
 uniforms.uTunnelActive.value=wave?.activeCount>0?1:0;
 uniforms.uTunnelFront.value=wave?.fronts?.[0]??-10000;
 return {stage,transitionTo:next,active:!!wave?.activeCount,
  front:uniforms.uTunnelFront.value};
}
const VERTEX_INJECT=[
 "attribute float trackS;",
 "attribute float glowWeight;",
 "varying float vTunnelTrack;",
 "varying float vTunnelGlow;"
].join("\n");
const FRAGMENT_INJECT=[
 "uniform vec3 uTunnelOld;",
 "uniform vec3 uTunnelNext;",
 "uniform float uTunnelFront;",
 "uniform float uTunnelActive;",
 "varying float vTunnelTrack;",
 "varying float vTunnelGlow;",
 "vec3 tunnelSpectrumTint() {",
 " float signedDistance=vTunnelTrack-uTunnelFront;",
 " float feather=1.0-smoothstep(-"+ZONE_WAVE.atmosphereTransitionMeters.toFixed(1)+
   ","+ZONE_WAVE.atmosphereTransitionMeters.toFixed(1)+",signedDistance);",
 " vec3 tint=mix(uTunnelOld,uTunnelNext,uTunnelActive*feather);",
 " // Same white-core crest as the existing road, not a full-room flash.",
 " float whiteCore=uTunnelActive*(1.0-smoothstep(1.25,"+
   ZONE_WAVE.whiteCoreMeters.toFixed(1)+",abs(signedDistance)));",
 " return mix(tint,vec3(1.0),whiteCore*.78);",
 "}"
].join("\n");
export function bindTunnelSpectrumMaterial(material,uniforms,mode="shell"){
 if(!["shell","rib","emitter","halo","reflection"].includes(mode))
  throw Error("Invalid tunnel shader mode");
 if(typeof material?.onBeforeCompile!=="function")
  throw Error("Tunnel material must support onBeforeCompile");
 const fragment=(mode==="shell"||mode==="rib")
  ? "diffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;"
  : "diffuseColor.rgb = tunnelSpectrumTint()*vTunnelGlow;";
 const original=material.onBeforeCompile;
 material.onBeforeCompile=function(shader,renderer){
  original.call(this,shader,renderer);
  Object.assign(shader.uniforms,uniforms);
  for(const anchor of ["#include <common>","#include <begin_vertex>"])
   if(!shader.vertexShader.includes(anchor))
    throw Error("Tunnel vertex shader anchor missing");
  if(!shader.fragmentShader.includes("#include <common>")||
     !shader.fragmentShader.includes("#include <color_fragment>"))
   throw Error("Tunnel fragment shader anchor missing");
  shader.vertexShader=shader.vertexShader.replace("#include <common>",
   "#include <common>\n"+VERTEX_INJECT).replace("#include <begin_vertex>",
   "#include <begin_vertex>\n vTunnelTrack=trackS;\n vTunnelGlow=glowWeight;");
  shader.fragmentShader=shader.fragmentShader.replace("#include <common>",
   "#include <common>\n"+FRAGMENT_INJECT).replace("#include <color_fragment>",
   "#include <color_fragment>\n"+fragment);
 };
 const oldKey=material.customProgramCacheKey;
 material.customProgramCacheKey=function(){
  return (oldKey?.call(this)||"")+"-skyshift-tunnel-spectrum-02121-"+mode;
 };
 material.needsUpdate=true;
 return material;
}
