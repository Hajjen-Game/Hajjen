// SKYSHIFT 0.26.3 – Cinematic Road Reflection Rebuild · Pass 3/4.
//
// Actual native Three.js MeshStandardMaterial GGX/metal Fresnel from finite
// cyan + amber emitters, sampled at the 0.26.0 physically installed positions
// in the original BANKED tunnel (no external sun, HDRI or fake lane emitters).
//
// No new geometry/draw calls/lights, no texture uploads, no screen-space pass.
// The low-memory path runs fewer direct-BRDF samples. Old 0.24.2 reflected
// emissive ribbons are suppressed in favour of 0.26.3 physical specular,
// with ?roadRebuild=classic returning EXACTLY to 0.26.2.
import {TUNNEL_PORTALS_0211,tunnelProfilePoint0211}
 from "./tunnel-megastructure-v0211.mjs";
import {ROAD_SOLAR_SPILL_02126} from "./road-solar-spill-v02126.mjs";

export const ROAD_REBUILD_0263=Object.freeze({
 version:"0.26.3",pass:3,id:"cinematic-road-reflection-rebuild-0263",
 material:"existing indexed road MeshStandardMaterial",
 lighting:"source-positioned multi-sample native GGX RE_Direct (no SSR)",
 sources:"actual 0.26.0 cyan upper-wall LED coves and short amber portal strips",
 cyanSamplesHigh:4,amberSamplesHigh:2,
 cyanSamples4GB:2,amberSamples4GB:1,
 addedMeshes:0,addedDrawCalls:0,addedLights:0,addedTextures:0,
 addedRenderPasses:0,addedColliders:0,
 preservesNativeWave:true,preservesRoadSolarSeal:true,
 preservesWhiteCrest:true,preservesEmissiveGuides:true,
 changesRoadGeometry:false,changesRoadColliders:false,
 changesShip:false,changesRails:false,changesCamera:false,
 changesPhysics:false,changesGRIP:false,
 comparison:"?roadRebuild=classic"
});

const COMMON="#include <common>";
const VPROJECT="#include <project_vertex>";
const ROUGH="#include <metalnessmap_fragment>";
const SOLAR_ANCHOR="reflectedLight.indirectSpecular *= mix(1.0,0.14,roadSolarMask);";
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(v)?v:lo));
const distToRange=(s,lo,hi)=>Math.max(lo-s,0,s-hi);
const ATTRS=Object.freeze([
 "roadCyanLeft0263","roadCyanRight0263",
 "roadAmberLeft0263","roadAmberRight0263",
 "roadArcTangent0263","roadFixtureMasks0263"
]);
function fixturePosition(s,side,warm,positionAt,vaultHeightClassic){
 const i=warm?8:10,t=warm?.185:.36;
 const a=tunnelProfilePoint0211(i,s,vaultHeightClassic),
  b=tunnelProfilePoint0211(i+1,s,vaultHeightClassic);
 const x=Math.abs(a[0]*(1-t)+b[0]*t)-.82,
  y=a[1]*(1-t)+b[1]*t-.085;
 const p=positionAt(s,side*x,y);
 if(!Number.isFinite(p?.x+p?.y+p?.z))
  throw Error("0.26.3 invalid source position");
 return [p.x,p.y,p.z];
}
export function nearestRoadFixtures0263(s,portals=TUNNEL_PORTALS_0211){
 if(!Number.isFinite(s))throw Error("0.26.3 nonfinite track s");
 let cyan=null,amber=null,cyanDist=Infinity,amberDist=Infinity;
 for(const p of portals){
  const c0=p+2,c1=Math.min(p+16,367.2),a0=p+2.4,a1=Math.min(p+5.1,367.1);
  if(c1>c0){const d=distToRange(s,c0,c1);
   if(d<cyanDist){cyan={start:c0,end:c1,s:clamp(s,c0,c1)};cyanDist=d;}}
  if(a1>a0){const d=distToRange(s,a0,a1);
   if(d<amberDist){amber={start:a0,end:a1,s:clamp(s,a0,a1)};amberDist=d;}}
 }
 const inside=s>=0&&s<=368;
 return {cyan,amber,cyanDistance:cyanDist,amberDistance:amberDist,
  cyanWeight:inside?Math.exp(-Math.pow(cyanDist/15.0,2)):0,
  amberWeight:inside?Math.exp(-Math.pow(amberDist/10.0,2)):0};
}
export function buildRoadSourceGeometry0263(geometry,positionAt,
 {vaultHeightClassic=false}={}){
 const coord=geometry?.getAttribute?.("aTrackCoord"),
  pos=geometry?.getAttribute?.("position");
 if(!coord||!pos||coord.count!==pos.count||
  typeof positionAt!=="function")
  throw Error("0.26.3 requires original indexed banked deck");
 const count=coord.count,vectors={};
 for(const k of ATTRS) vectors[k]=new Float32Array(count*(k==="roadFixtureMasks0263"?2:3));
 let litCount=0;
 const cache=new Map();
 function fixture(s,warm,side){
  const key=s.toFixed(4)+":"+(warm?1:0)+":"+side;
  if(!cache.has(key))cache.set(key,fixturePosition(s,side,warm,
   positionAt,vaultHeightClassic));
  return cache.get(key);
 }
 for(let i=0;i<count;i++){
  const s=coord.getX(i),g=nearestRoadFixtures0263(s);
  const t=clamp(s,0,367.9),
   start=positionAt(Math.max(0,t-.75),0,0),
   end=positionAt(Math.min(367.95,t+.75),0,0);
  const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z,
   len=Math.hypot(dx,dy,dz);
  if(!Number.isFinite(len)||len<0.0001)
   throw Error("0.26.3 invalid original banked road tangent");
  vectors.roadArcTangent0263.set([dx/len,dy/len,dz/len],3*i);
  for(const [key,warm,side] of [
   ["roadCyanLeft0263",false,-1],["roadCyanRight0263",false,1],
   ["roadAmberLeft0263",true,-1],["roadAmberRight0263",true,1]]){
   const source=warm?g.amber:g.cyan;
   const p=source?fixture(source.s,warm,side):[0,0,0];
   vectors[key].set(p,3*i);
  }
  vectors.roadFixtureMasks0263.set([g.cyanWeight,g.amberWeight],2*i);
  if(g.cyanWeight>.04||g.amberWeight>.04)litCount++;
 }
 return {vectors,count,litCount,sourcePositions:cache.size};
}
function oneSample(source,tangentOffset,weight,energy){
 // Native lighting is evaluated in view space and uses the current
 // interpolated normal, roughness and metallic Fresnel, not emissive color.
 const p="r263"+source;
 return [
  "{",
  " vec3 r263D="+p+"+vRoadAxis0263*("+tangentOffset.toFixed(2)+");",
  " float r263R=length(r263D);",
  " IncidentLight r263Lamp;",
  " r263Lamp.visible=true;",
  " r263Lamp.direction=normalize(r263D+vec3(0.00001));",
  " float r263Falloff=1.0/(1.0+pow(r263R/27.0,2.0));",
  " r263Lamp.color=vec3("+
   (source.startsWith("Cyan")?"0.045,0.55,0.93":"1.0,0.36,0.095")+
   ")*("+energy.toFixed(3)+"*"+weight.toFixed(3)+
   "*r263Falloff*r263Keep*r263Source."+
   (source.startsWith("Cyan")?"x":"y")+");",
  "// 0.26.3 specular-only: preserve original dark road diffuse.",
  " vec3 r263DiffuseBefore=reflectedLight.directDiffuse;",
  " RE_Direct(r263Lamp,geometryPosition,geometryNormal,geometryViewDir,",
  "  geometryClearcoatNormal,material,reflectedLight);",
  " reflectedLight.directDiffuse=r263DiffuseBefore;",
  "}"
 ].join("\n");
}
export function patchCinematicRoadRebuild0263(vertex,fragment,{mobile=false,
 fullTunnel=false}={}){
 const sourceAnchor=fullTunnel?"#include <lights_fragment_end>":SOLAR_ANCHOR;
 if(!vertex.includes(COMMON)||!vertex.includes(VPROJECT)||
  !fragment.includes(COMMON)||!fragment.includes(ROUGH)||
  !fragment.includes(sourceAnchor)||
  !fragment.includes("float guided =")||
  !fragment.includes("float padCoverage =")||
  !fragment.includes("float whiteCore=0.0")||
  !fragment.includes("varying vec2 vTrackCoord;")||
  (!fullTunnel&&!fragment.includes("uRoadSolarSpillSeal")))
  throw Error("0.26.3 requires original sun-isolated indexed road and 0.24.2");
 const decl=[
  "attribute vec3 roadCyanLeft0263;",
  "attribute vec3 roadCyanRight0263;",
  "attribute vec3 roadAmberLeft0263;",
  "attribute vec3 roadAmberRight0263;",
  "attribute vec3 roadArcTangent0263;",
  "attribute vec2 roadFixtureMasks0263;",
  "varying vec3 vRoadCyanLeft0263,vRoadCyanRight0263;",
  "varying vec3 vRoadAmberLeft0263,vRoadAmberRight0263;",
  "varying vec3 vRoadAxis0263;",
  "varying vec2 vRoadFixtureMasks0263;"
 ].join("\n");
 const vCode=[
  "vRoadCyanLeft0263=(viewMatrix*vec4(roadCyanLeft0263,1.0)).xyz-mvPosition.xyz;",
  "vRoadCyanRight0263=(viewMatrix*vec4(roadCyanRight0263,1.0)).xyz-mvPosition.xyz;",
  "vRoadAmberLeft0263=(viewMatrix*vec4(roadAmberLeft0263,1.0)).xyz-mvPosition.xyz;",
  "vRoadAmberRight0263=(viewMatrix*vec4(roadAmberRight0263,1.0)).xyz-mvPosition.xyz;",
  "vRoadAxis0263=normalize(mat3(viewMatrix)*roadArcTangent0263);",
  "vRoadFixtureMasks0263=roadFixtureMasks0263;"
 ].join("\n");
 const fDecl=[
  "uniform float uRoadRebuild0263;",
  "varying vec3 vRoadCyanLeft0263,vRoadCyanRight0263;",
  "varying vec3 vRoadAmberLeft0263,vRoadAmberRight0263;",
  "varying vec3 vRoadAxis0263;",
  "varying vec2 vRoadFixtureMasks0263;"
 ].join("\n");
 const rough=[
  ROUGH,
  fullTunnel?"float r263Interior=uRoadRebuild0263;":
   "float r263Interior=uRoadRebuild0263* (1.0-smoothstep(340.0,368.0,vTrackCoord.x));",
  "float r263Side=abs(vTrackCoord.y);",
  "float r263Grain=0.5+0.5*sin(vTrackCoord.x*0.31+vTrackCoord.y*0.27);",
  "float r263Rough=mix(0.39,0.32,",
  " smoothstep(4.5,10.5,r263Side))+(r263Grain-.5)*0.042;",
  "roughnessFactor=mix(roughnessFactor,r263Rough,r263Interior);",
  "metalnessFactor=mix(metalnessFactor,0.41,r263Interior);"
 ].join("\n");
 const direct=[
  // Vault 0.28.2 must carry the original Skyline 0.21.2.6 road-only
  // neutral world-light containment BEFORE adding its colored GGX. The
  // racing guides/zone-wave emission are applied separately and unchanged.
  // In A/B classic (uRoadRebuild0263=0) every PBR coefficient is original.
  ...(fullTunnel?[
   "// Original Skyline 0.21.2.6 PBR-only sunlight isolation: 3400m Vault.",
   "float roadSolarMask=uRoadRebuild0263;",
   "reflectedLight.directDiffuse*=mix(1.0,"+
    ROAD_SOLAR_SPILL_02126.directDiffuseScale.toFixed(2)+",roadSolarMask);",
   "reflectedLight.indirectDiffuse*=mix(1.0,"+
    ROAD_SOLAR_SPILL_02126.indirectDiffuseScale.toFixed(2)+",roadSolarMask);",
   "reflectedLight.directSpecular*=mix(1.0,"+
    ROAD_SOLAR_SPILL_02126.directSpecularScale.toFixed(2)+",roadSolarMask);",
   "reflectedLight.indirectSpecular*=mix(1.0,"+
    ROAD_SOLAR_SPILL_02126.indirectSpecularScale.toFixed(2)+",roadSolarMask);"
  ]:[]),
  "// 0.26.3: world-light suppression has completed before local lights.",
  "// Add only the original physically placed cyan and amber tunnel strips.",
  "if(uRoadRebuild0263>0.0001){",
  // Vault's wider continuous road must not turn source GGX into a broad
  // cyan-white floor wash. Retain Skyline's exact physical BRDF, but apply
  // its finite emitter mask most strongly at the actual curb inlay;
  // central racing lines and white zone core stay intentionally dark.
  fullTunnel?
   " vec2 r263Source=clamp(vRoadFixtureMasks0263,0.0,1.0)*uRoadRebuild0263*0.56*(0.18+0.82*smoothstep(5.0,8.5,abs(vTrackCoord.y)));":
   " vec2 r263Source=clamp(vRoadFixtureMasks0263,0.0,1.0)*uRoadRebuild0263;",
  fullTunnel?" float r263Tunnel=1.0;":
   " float r263Tunnel=1.0-smoothstep(340.0,368.0,vTrackCoord.x);",
  " float r263Guides=(1.0-0.91*clamp(guided,0.0,1.0))*",
  "  (1.0-0.88*clamp(padCoverage,0.0,1.0))*",
  "  (1.0-0.92*clamp(whiteCore,0.0,1.0));",
  " float r263Keep=r263Tunnel*r263Guides*",
  "  (1.0-smoothstep(10.75,11.75,abs(vTrackCoord.y)));",
  " vec3 r263CyanLeft=vRoadCyanLeft0263;",
  " vec3 r263CyanRight=vRoadCyanRight0263;",
  " vec3 r263AmberLeft=vRoadAmberLeft0263;",
  " vec3 r263AmberRight=vRoadAmberRight0263;"
 ];
 // A symmetric, finite-emitter quadrature; no camera-facing fake streaks.
 if(mobile){
  direct.push(" vec3 r263AmberNear=mix(r263AmberLeft,r263AmberRight,step(0.0,vTrackCoord.y));");
  direct.push(oneSample("CyanLeft",0,0.5,7.8),
   oneSample("CyanRight",0,0.5,7.8));
  direct.push(oneSample("AmberNear",0,1.0,7.8));
 }else{
  for(const name of ["CyanLeft","CyanRight"])
   for(const offset of [-3.5,3.5])
    direct.push(oneSample(name,offset,.25,9.0));
  for(const name of ["AmberLeft","AmberRight"])
   direct.push(oneSample(name,0,.5,9.0));
 }
 // 0.26.3: finite-strip glancing convolution for a racing-road finish.
 // The original fixture weights and view/surface normals bound each glint.
 // This contributes SPECULAR ONLY – no emissive paint, no ambient white.
 direct.push(
  " float r263NdV=clamp(dot(normalize(vViewPosition),normal),0.0,1.0);",
  " float r263Fresnel=0.24+0.76*pow(1.0-r263NdV,2.0);",
  " float r263Lateral=abs(vTrackCoord.y);",
  " float r263CoveBand=exp(-pow((r263Lateral-6.7)/2.2,2.0))+",
  "  0.48*exp(-pow((r263Lateral-9.1)/1.7,2.0));",
  " float r263AmberBand=exp(-pow((r263Lateral-7.5)/2.05,2.0));",
  " float r263Surface=0.86+0.14*sin(vTrackCoord.x*0.28+vTrackCoord.y*0.31);",
  " vec3 r263Convolved=vec3(0.045,0.54,0.90)*",
  "  (r263Source.x*r263CoveBand*0.38)+",
  "  vec3(1.0,0.33,0.075)*(r263Source.y*r263AmberBand*0.29);",
  " reflectedLight.directSpecular+=r263Convolved*",
  "  (r263Keep*r263Fresnel*r263Surface);"
 );
 direct.push("}");
 return {
  vertexShader:vertex.replace(COMMON,COMMON+"\n"+decl)
   .replace(VPROJECT,VPROJECT+"\n"+vCode),
  fragmentShader:fragment.replace(COMMON,COMMON+"\n"+fDecl)
   .replace(ROUGH,rough)
   .replace(sourceAnchor,sourceAnchor+"\n"+direct.join("\n"))
 };
}
export function installCinematicRoadRebuildShader0263(material,uniform,opts){
 if(!material?.isMeshStandardMaterial||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.26.3 requires existing MeshStandard road; no replacement");
 const old=material.onBeforeCompile,cache=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  old.call(this,shader,renderer);
  const patched=patchCinematicRoadRebuild0263(shader.vertexShader,
   shader.fragmentShader,opts);
  shader.vertexShader=patched.vertexShader;
  shader.fragmentShader=patched.fragmentShader;
  shader.uniforms.uRoadRebuild0263=uniform;
 };
 material.customProgramCacheKey=function(){
  return cache.call(this)+"-real-road-ggx-0263-"+(opts.mobile?"4gb":"high")+
   (opts.fullTunnel?"-shared-vault":"");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=old;
  material.customProgramCacheKey=cache;material.needsUpdate=true;};
}
export function createCinematicRoadReflectionRebuild0263(THREE,roadMesh,{
 positionAt,lowMemory=false,vaultHeightClassic=false,legacy=null
}={}){
 const fallback=reason=>({
  stats:()=>({roadRebuild0263Active:false,roadRebuild0263Status:reason}),
  setComparison(){},dispose(){}
 });
 if(!roadMesh?.material?.isMeshStandardMaterial||
  !roadMesh.geometry?.getAttribute?.("aTrackCoord")||
  typeof positionAt!=="function"||!legacy?.setComparison)
  return fallback("original-indexed-physical-road-unavailable");
 const geo=roadMesh.geometry;
 let data;
 try{data=buildRoadSourceGeometry0263(geo,positionAt,{vaultHeightClassic});}
 catch(e){console.warn("SKYSHIFT 0.26.3 fallback: source build",e);
  return fallback("source-geometry-failed");}
 const installed=[];
 try{
  for(const key of ATTRS){
   const n=key==="roadFixtureMasks0263"?2:3;
   geo.setAttribute(key,new THREE.Float32BufferAttribute(data.vectors[key],n));
   installed.push(key);
  }
  const strength={value:1};
  const restore=installCinematicRoadRebuildShader0263(
   roadMesh.material,strength,{mobile:lowMemory});
  // Default to genuine physical road, but preserve a small authored
  // base-line glow so original lane/rail legibility remains familiar.
  // This is intentional: the 0.24.2 emissive system is NOT a BRDF.
  const LEGACY_RESIDUAL=0.10;
  legacy.setComparison(LEGACY_RESIDUAL);
  const setComparison=value=>{
   strength.value=clamp(value,0,1);
   legacy.setComparison(strength.value===0?1:
    strength.value===1?LEGACY_RESIDUAL:
    1-(1-LEGACY_RESIDUAL)*strength.value);
  };
  return {
   setComparison,
   stats:()=>({
    roadRebuild0263Active:true,roadRebuild0263Status:"active",
    roadRebuild0263PhysicalGGX:true,roadRebuild0263Version:"0.26.3",
    roadRebuild0263Strength:strength.value,
    roadRebuild0263SourceVertices:data.count,
    roadRebuild0263LitVertices:data.litCount,
    roadRebuild0263SourceCount:data.sourcePositions,
    roadRebuild0263CyanSamples:lowMemory?2:4,
    roadRebuild0263AmberSamples:lowMemory?1:2,
    roadRebuild0263LowMemory:!!lowMemory,
    roadRebuild0263UsesOriginalDeck:true,
    roadRebuild0263UsesOriginalSourcePositions:true,
    roadRebuild0263SolarSealed:true,
    roadRebuild0263PreservesWhiteCrest:true,
    roadRebuild0263PreservesGuides:true,
    roadRebuild0263AddedDrawCalls:0,
    roadRebuild0263AddedLights:0,
    roadRebuild0263AddedTextures:0,
    roadRebuild0263AddedRenderPasses:0,
    roadRebuild0263ChangesGRIP:false,
    roadRebuild0263ChangesPhysics:false,
    roadRebuild0263ChangesShip:false,
    roadRebuild0263ChangesRails:false,
    roadRebuild0263LegacyResidual:LEGACY_RESIDUAL
   }),
   dispose(){
    legacy.setComparison(1);restore();
    for(const key of installed)geo.deleteAttribute(key);
   }
  };
 }catch(e){
  console.warn("SKYSHIFT 0.26.3 safely reverting road optics",e);
  for(const key of installed)geo.deleteAttribute(key);
  legacy.setComparison(1);
  return fallback("physical-road-install-failed");
 }
}

// Shared 0.28.2 source adapter uses the SAME original installed physical
// positions and PBR reflection shader, but maps art-local 368m to Vault.
export {fixturePosition as fixturePosition0263};
