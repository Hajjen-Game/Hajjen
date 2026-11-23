// SKYSHIFT 0.26.0 Pass 2 — real Three.js physically based metal optics.
// Keep the 0.26.0 P1 sun-isolated graphite as an immutable substrate.
// A restrained MeshPhysicalMaterial specular layer adds real GGX/Fresnel,
// metalness, roughness and optional clearcoat, with ONLY nearby tunnel emitters.
// Global sun/ambient/environment lamps are deliberately excluded in shader.
// No road, ship, physics, GRIP, zone wave or native neon changes.
import {installDualToneLightingPass1} from "./dual-tone-lighting-v0260.mjs";
import {sharedPhysicalPreset0280,SHARED_TUNNEL_STYLE_0280} from "../shared-tunnel-architecture-v0280.mjs";
import {TUNNEL_MEGA_0211,TUNNEL_PORTALS_0211} from "../tunnel-megastructure-v0211.mjs";

export const TRUE_METAL_0260_P2=Object.freeze({
 version:"0.26.0",pass:2,id:"true-metal-materials-0260-pass2",
 base:"0.26.0-pass1",comparison:"?trueMetal=classic",
 model:"native Three.MeshPhysicalMaterial metalness/roughness and native GGX BRDF",
 purpose:"localized cyan/amber physically lit satin metal atop sealed graphite",
 method:"source-positioned view-space PBR specular; no global scene light loop",
 coatsHigh:["HARDSURFACE_PANELS","CURVED_RIBS"],
 coatsMobile:["HARDSURFACE_PANELS"],
 realMetal:true,retainsBaseShader:true,retainsDualTone:true,
 addsDynamicLights:0,addsTextures:0,addsPostprocessPasses:0,
 addsColliders:0,changesRoad:false,changesShip:false,
 changesPhysics:false,changesGRIP:false,changesCamera:false,
 changesNativeNeon:false,changesSolarSeal:false
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const ROLES=Object.freeze({panel:"HARDSURFACE_PANELS",rib:"CURVED_RIBS"});
const COLD="pbrColdPosition0260",WARM="pbrWarmPosition0260";
const COMMON="#include <common>";
const PROJECT="#include <worldpos_vertex>";
const LIGHTS="#include <lights_fragment_begin>";
const ROUGH="#include <roughnessmap_fragment>";
const METAL="#include <metalnessmap_fragment>";

export function patchTrueMetalPBRShader(vertex,fragment,{role="panel",mobile=false}={}){
 if(!(role in ROLES))throw Error("0.26.0 P2 unknown metal role");
 for(const token of [COMMON,PROJECT,"#include <project_vertex>"])
  if(!vertex.includes(token))throw Error("0.26.0 P2 missing physical vertex shader: "+token);
 for(const token of [COMMON,LIGHTS,ROUGH,METAL,"#include <lights_physical_fragment>"])
  if(!fragment.includes(token))throw Error("0.26.0 P2 requires native MeshPhysicalMaterial shader: "+token);
 const vHeader=[
  "attribute vec3 "+COLD+";",
  "attribute vec3 "+WARM+";",
  "attribute vec2 neonLocalSection;",
  "attribute float trackS;",
  "attribute float glowWeight;",
  "varying vec3 vPbrCold0260;",
  "varying vec3 vPbrWarm0260;",
  "varying vec2 vPbrSection0260;",
  "varying float vPbrTrack0260;",
  "varying float vPbrRelief0260;"
 ].join("\n");
 const assign=[
  "vPbrCold0260=(viewMatrix*vec4("+COLD+",1.0)).xyz-mvPosition.xyz;",
  "vPbrWarm0260=(viewMatrix*vec4("+WARM+",1.0)).xyz-mvPosition.xyz;",
  "vPbrSection0260=neonLocalSection;",
  "vPbrTrack0260=trackS;",
  "vPbrRelief0260=glowWeight;"
 ].join("\n");
 const fHeader=[
  "varying vec3 vPbrCold0260;",
  "varying vec3 vPbrWarm0260;",
  "varying vec2 vPbrSection0260;",
  "varying float vPbrTrack0260;",
  "varying float vPbrRelief0260;",
  "uniform float uTrueMetal0260P2;"
 ].join("\n");
 // The real PhysicalMaterial is constructed in lights_physical_fragment.
 // RE_Direct therefore uses the renderer's native GGX, metallic Fresnel,
 // roughness masking, and clearcoat logic, not our previous Basic fake lobe.
 // Replace ONLY the global scene-light iteration to keep the exterior sun
 // from re-entering these tunnel surfaces. Irradiance maps are disabled.
 const localLights=[
  "// 0.26.0 P2: native physical BRDF, local fixtures ONLY; NO solar light loop.",
  "vec3 geometryPosition=-vViewPosition;",
  "vec3 geometryNormal=normal;",
  "vec3 geometryViewDir=normalize(vViewPosition);",
  "vec3 geometryClearcoatNormal=geometryNormal;",
  // The stock lights_fragment_begin declares these accumulators. We replace
  // that chunk to exclude ALL sunlight, so recreate zero-filled indirect
  // buffers expected by lights_fragment_maps/end.
  "vec3 irradiance=vec3(0.0);",
  "vec3 iblIrradiance=vec3(0.0);",
  "vec3 radiance=vec3(0.0);",
  "vec3 clearcoatRadiance=vec3(0.0);",
  "float pbrColdDistance0260=length(vPbrCold0260);",
  "float pbrWarmDistance0260=length(vPbrWarm0260);",
  "float pbrRelief0260="+(role==="panel"?"mix(0.46,1.0,smoothstep(0.0001,0.005,vPbrRelief0260))":"0.82")+";",
  "float pbrColdFalloff0260=exp(-pow(pbrColdDistance0260/"+
    (role==="rib"?"7.2":"8.6")+",2.0));",
  "float pbrWarmFalloff0260=exp(-pow(pbrWarmDistance0260/8.0,2.0));",
  "float pbrAttenuation0260=uTrueMetal0260P2*pbrRelief0260*"+
    (mobile?"0.76":"1.0")+";",
  "IncidentLight pbrFixture0260;",
  "pbrFixture0260.visible=true;",
  "pbrFixture0260.direction=normalize(vPbrCold0260+vec3(0.0001));",
  "pbrFixture0260.color=vec3("+SHARED_TUNNEL_STYLE_0280.lighting.cyan.join(",")+")*",
  " (2.80*pbrColdFalloff0260*pbrAttenuation0260);",
  "RE_Direct(pbrFixture0260,geometryPosition,geometryNormal,",
  " geometryViewDir,geometryClearcoatNormal,material,reflectedLight);",
  "pbrFixture0260.direction=normalize(vPbrWarm0260+vec3(0.0001));",
  "pbrFixture0260.color=vec3("+SHARED_TUNNEL_STYLE_0280.lighting.amber.join(",")+")*",
  " (2.35*pbrWarmFalloff0260*pbrAttenuation0260);",
  "RE_Direct(pbrFixture0260,geometryPosition,geometryNormal,",
  " geometryViewDir,geometryClearcoatNormal,material,reflectedLight);"
 ].join("\n");
 // Full roughness parameter feeds native GGX. Subpixel brushed breakup
 // diminishes on 4GB, avoiding temporal shimmer / high frequency noise.
 const roughness=[
  ROUGH,
  "float pbrGrain0260=0.5+0.5*sin(vPbrSection0260.y*"+
   (mobile?"3.3":"10.5")+"+vPbrTrack0260*0.48);",
  "roughnessFactor=clamp(roughnessFactor+"+
   (mobile?"0.04":"0.075")+"*(pbrGrain0260-0.5),0.23,0.75);"
 ].join("\n");
 const metalness=[
  METAL,
  "metalnessFactor=clamp(metalnessFactor,0.70,0.97);"
 ].join("\n");
 return {
  vertexShader:vertex.replace(COMMON,COMMON+"\n"+vHeader)
    .replace(PROJECT,PROJECT+"\n"+assign),
  fragmentShader:fragment.replace(COMMON,COMMON+"\n"+fHeader)
    .replace(ROUGH,roughness).replace(METAL,metalness)
    .replace(LIGHTS,localLights)
 };
}
export function installTrueMetalPBRShader(material,uniforms,opts={}){
 if(!material?.isMeshPhysicalMaterial||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.26.0 P2 requires REAL MeshPhysicalMaterial");
 const old=material.onBeforeCompile,key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  old.call(this,shader,renderer);
  const modified=patchTrueMetalPBRShader(shader.vertexShader,shader.fragmentShader,opts);
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=modified.vertexShader;
  shader.fragmentShader=modified.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return key.call(this)+"-skyshift-true-metal-pbr-0260-p2-"+opts.role+
   (opts.mobile?"-mobile":"-high");
 };
 material.needsUpdate=true;
}
// Derive source positions from the ORIGINAL banked tunnel geometry. Sources
// are not camera-relative and cannot leak exterior sunlight onto the hull.
export function buildTrueMetalSources(geometry,positionAt,{vaultHeightClassic=false}={}){
 const sAttr=geometry?.getAttribute?.("trackS");
 const pAttr=geometry?.getAttribute?.("position");
 const local=geometry?.getAttribute?.("neonLocalSection");
 if(!sAttr||!pAttr||!local||sAttr.count!==pAttr.count||
  local.count!==sAttr.count||typeof positionAt!=="function")
  throw Error("0.26.0 P2 missing original banked metal geometry");
 const cold=new Float32Array(sAttr.count*3),warm=new Float32Array(sAttr.count*3);
 let valid=0;
 const warmCache=new Map();
 for(let i=0;i<sAttr.count;i++){
  const s=clamp(sAttr.getX(i),0,TUNNEL_MEGA_0211.end);
  const lx=local.getX(i),ly=local.getY(i);
  if(!Number.isFinite(s+lx+ly))throw Error("0.26.0 P2 invalid local tunnel vertex");
  const side=lx<0?-1:1;
  const crown=ly>22.3;
  // Recessed within the existing solid tunnel, near actual cyan coves.
  const c=positionAt(s,side*(crown?8.3:21.8),crown?26.8:18.7);
  let portal=TUNNEL_PORTALS_0211[0];
  for(const candidate of TUNNEL_PORTALS_0211)
   if(Math.abs(s-candidate-3.0)<Math.abs(s-portal-3.0))portal=candidate;
  const key=side+":"+portal;
  let w=warmCache.get(key);
  if(!w){
   w=positionAt(Math.min(portal+3.0,367.0),side*23.5,14.5);
   warmCache.set(key,w);
  }
  if(!Number.isFinite(c.x+c.y+c.z+w.x+w.y+w.z))
   throw Error("0.26.0 P2 non-finite real fixture position");
  for(let j=0;j<3;j++){
   cold[i*3+j]=[c.x,c.y,c.z][j];
   warm[i*3+j]=[w.x,w.y,w.z][j];
  }
  valid++;
 }
 return {cold,warm,vertices:valid,portalSources:warmCache.size,
  vaultHeightClassic};
}
export function installTrueMetalMaterialsPass2(THREE,world,options={}){
 const base=installDualToneLightingPass1(THREE,world,options);
 const previous=base.stats(),mobile=!!options.lowMemory;
 const fallback=reason=>({...base,
  stats(){return {...base.stats(),trueMetal0260P2Enabled:false,
   trueMetal0260P2Status:reason};},
  setTrueMetalComparison(){}
 });
 if(!previous.dualTone0260Enabled||
  previous.dualTone0260Status!=="active"||
  !previous.dualTone0260SolarSealed||
  !previous.dualTone0260NativeNeonUnchanged)
  return fallback("0.26.0-pass1-material-chain-not-ready");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const selected=Object.entries(ROLES).filter(([role])=>!mobile||role==="panel")
  .map(([role,name])=>({role,
   mesh:group?.children?.find(obj=>obj.name==="Tunnel / "+name)}));
 const emitter=group?.children?.find(obj=>obj.name==="Tunnel / INTEGRATED_LIGHT");
 if(selected.length!==(mobile?1:2)||!emitter?.material?.isMeshBasicMaterial||
   selected.some(({mesh})=>!mesh?.material?.isMeshBasicMaterial||
    !mesh.geometry?.getAttribute?.("neonLocalSection")||
    !mesh.geometry?.getAttribute?.("glowWeight")||
    !mesh.geometry?.getAttribute?.("trackS")))
   return fallback("original-metal-batch-unavailable");
 const power={value:1.0}, uniforms={uTrueMetal0260P2:power};
 const coats=[];let vertexCount=0;
 try{
  for(const {role,mesh} of selected){
   const built=buildTrueMetalSources(mesh.geometry,options.positionAt,options);
   mesh.geometry.setAttribute(COLD,new THREE.Float32BufferAttribute(built.cold,3));
   mesh.geometry.setAttribute(WARM,new THREE.Float32BufferAttribute(built.warm,3));
   const physical=new THREE.MeshPhysicalMaterial({
    ...sharedPhysicalPreset0280(role,mobile,"skyline"),
    side:THREE.DoubleSide,forceSinglePass:true,
    transparent:true,
    blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
   });
   installTrueMetalPBRShader(physical,uniforms,{role,mobile});
   const coat=new THREE.Mesh(mesh.geometry,physical);
   coat.name="SKYSHIFT 0.26.0 P2 / true physical "+role;
   coat.renderOrder=2;coat.frustumCulled=true;
   coat.castShadow=false;coat.receiveShadow=false;
   group.add(coat);
   coats.push({coat,mesh});
   vertexCount+=built.vertices;
  }
 }catch(error){
  for(const {coat,mesh} of coats){
   coat.removeFromParent();coat.material.dispose();
   mesh.geometry.deleteAttribute(COLD);mesh.geometry.deleteAttribute(WARM);
  }
  console.warn("SKYSHIFT 0.26.0 P2 keeping original dual-tone metal",error);
  return fallback("physical-material-build-failed");
 }
 const state={
  trueMetal0260P2Enabled:true,trueMetal0260P2Status:"active",
  trueMetal0260P2Version:"0.26.0",trueMetal0260P2Pass:2,
  trueMetal0260P2Material:"MeshPhysicalMaterial",
  trueMetal0260P2NativeGGX:true,trueMetal0260P2RealMetalness:true,
  trueMetal0260P2RealRoughness:true,trueMetal0260P2SolarSealed:true,
  trueMetal0260P2BaseRetained:true,trueMetal0260P2DualToneRetained:true,
  trueMetal0260P2Batches:coats.length,trueMetal0260P2Vertices:vertexCount,
  trueMetal0260P2LowMemory:mobile,
  trueMetal0260P2AddedDrawCalls:coats.length,
  trueMetal0260P2AddedDynamicLights:0,trueMetal0260P2AddedTextures:0,
  trueMetal0260P2ChangesRoad:false,trueMetal0260P2ChangesShip:false,
  trueMetal0260P2ChangesPhysics:false,trueMetal0260P2ChangesGRIP:false,
  trueMetal0260P2ChangesCamera:false,trueMetal0260P2ChangesNativeNeon:false
 };
 return {...base,
  stats(){return {...base.stats(),...state,version:"0.26.0",
   trueMetal0260P2Strength:power.value};},
  setTrueMetalComparison(value){
   power.value=clamp(value,0,1);
   for(const {coat} of coats)coat.visible=power.value>0.001;
  },
  dispose(){
   for(const {coat,mesh} of coats){
    coat.removeFromParent();coat.material.dispose();
    mesh.geometry.deleteAttribute(COLD);mesh.geometry.deleteAttribute(WARM);
   }
   base.dispose?.();
  }
 };
}
