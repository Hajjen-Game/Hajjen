// SKYSHIFT 0.27.1 – Neon Vault Material Parity, Pass 1
// Reuse the EXACT packed 0.26.2 premium metal atlas on the EXISTING 0.27.0
// all-lap shell and structural ribs. Its R/B channels encode fine
// micro-normal variation; G encodes roughness, A encodes milling.
// The original 0.27.0 metal is sun-isolated MeshBasicMaterial. This pass
// therefore builds bounded, view-stable brushed-material definition without
// falsely claiming native physical BRDF. Local GGX transfer is 0.27.2.
// Source fixtures, HDR wave, cockpit, rail, road, ship, physics untouched.
import {TUNNEL_PROFILE_0211} from "./tunnel-megastructure-v0211.mjs";
import {makePremiumMetalTexture0262} from "./premium-metal-surface-v0262.mjs";

const ROOT="SKYSHIFT · Neon Vault Full Tunnel 0.27.0";
const SHELL="DARK METAL ENCLOSURE";
const RIBS="FACETED STRUCTURAL ARCHES";
const COMMON="#include <common>";
const PROJECTION="#include <project_vertex>";
const COLOR="#include <color_fragment>";
const LENGTH=3400,CHUNK=170,RIB_PITCH=42.5, RIB_START=3;
const SECTIONS=TUNNEL_PROFILE_0211.length-8;
const EPS=1e-6;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const VAULT_MATERIAL_PARITY_0271=Object.freeze({
 version:"0.27.1",base:"0.27.0",sourceAtlas:"0.26.2 packed micro-normal/roughness/milling atlas",
 target:"Neon Vault complete 3400m sealed dark-metal shell + structural ribs",
 comparison:"?vaultMaterial=classic",
 highAtlas:256,mobileAtlas:128,shellPanels:20,ribBatches:20,
 nativeGGXImported:false,localGGXNext:"0.27.2",
 originalFixturesUnchanged:true,originalVaultGeometryUnchanged:true,
 originalWorldSunSealUnchanged:true,originalRailUnchanged:true,
 originalRoadUnchanged:true,originalShipUnchanged:true,
 originalGRIPUnchanged:true,originalFlightUnchanged:true,
 originalSkylineUnchanged:true,originalAuroraUnchanged:true,
 addedMeshes:0,addedDrawCalls:0,addedDynamicLights:0,
 addedRenderPasses:0,addedTextures:1
});
function profileArc0271(profile=TUNNEL_PROFILE_0211){
 let d=0;const dist=new Float32Array(profile.length);
 for(let j=1;j<profile.length;j++){
  d+=Math.hypot(profile[j][0]-profile[j-1][0],
   profile[j][1]-profile[j-1][1]);
  dist[j]=d;
 }
 return dist;
}
const PROFILE_ARC=profileArc0271();
export function buildVaultMaterialCoords0271(geometry,chunkIndex,role){
 if(!geometry?.getAttribute||role!=="shell"&&role!=="rib"||
  !Number.isInteger(chunkIndex)||chunkIndex<0||chunkIndex>=20)
  throw Error("0.27.1 expects existing 20×170m full-lap shell/rib");
 const pos=geometry.getAttribute("position"),start=chunkIndex*CHUNK;
 if(!pos||pos.itemSize!==3||!Number.isInteger(pos.count))
  throw Error("0.27.1 missing real tunnel positions");
 const uv=new Float32Array(pos.count*2);
 if(role==="shell"){
  const rows=pos.count/TUNNEL_PROFILE_0211.length-1;
  if(!Number.isInteger(rows)||rows<10||!geometry.index)
   throw Error("0.27.1 requires original indexed 31-profile shell");
  for(let r=0;r<=rows;r++){
   const s=start+CHUNK*r/rows;
   for(let j=0;j<TUNNEL_PROFILE_0211.length;j++){
    const i=(r*TUNNEL_PROFILE_0211.length+j)*2;
    uv[i]=s;uv[i+1]=PROFILE_ARC[j];
   }
  }
 }else{
  if(pos.count%(SECTIONS*6)!==0)
   throw Error("0.27.1 requires original 0.27.0 six-vertex rib quads");
  const ribs=pos.count/(SECTIONS*6);
  const first=Math.ceil(start/RIB_PITCH);
  for(let k=0;k<ribs;k++){
   const center=(first+k)*RIB_PITCH,stop=center+1.9;
   if(center>=start+CHUNK-2.5+EPS)
    throw Error("0.27.1 rib fixture exceeds original authored chunk");
   for(let j=0;j<SECTIONS;j++){
    const bottom=PROFILE_ARC[j+RIB_START],
     top=PROFILE_ARC[j+RIB_START+1],i=(k*SECTIONS+j)*6;
    for(const [n,s,u] of [
     [0,center,bottom],[1,center,top],[2,stop,top],
     [3,center,bottom],[4,stop,top],[5,stop,bottom]
    ]){
     uv[(i+n)*2]=s;uv[(i+n)*2+1]=u;
    }
   }
  }
 }
 return {uv,vertices:pos.count,chunkStart:start,chunkEnd:start+CHUNK,
  minS:start,maxS:start+CHUNK,role};
}

export function patchVaultMaterialShader0271(vertex,fragment,{
 role="shell",mobile=false
}={}){
 if(!["shell","rib"].includes(role))
  throw Error("0.27.1 supports original shell and rib only");
 for(const x of [COMMON,PROJECTION])if(!vertex.includes(x))
  throw Error("0.27.1 missing native Basic vertex hook "+x);
 for(const x of [COMMON,COLOR])if(!fragment.includes(x))
  throw Error("0.27.1 missing native Basic fragment hook "+x);
 const vheader=[
  "attribute vec2 aVaultMaterialCoord0271;",
  "varying vec2 vVaultMaterialCoord0271;"
 ].join("\n");
 const fheader=[
  "uniform sampler2D uVaultMetalAtlas0271;",
  "uniform float uVaultMaterialStrength0271;",
  "varying vec2 vVaultMaterialCoord0271;",
  "float v271Hash(vec2 x){return fract(sin(dot(x,vec2(127.1,311.7)))*43758.5453);}"
 ].join("\n");
 // Millimetre-scale texture details are mip filtered; seams are measured
 // in metres, not per-render-segment UVs. No chunk-reset or camera swim.
 const final=[
  "{",
  " vec2 v271Meters=vVaultMaterialCoord0271;",
  " vec2 v271Tile=vec2(v271Meters.x*0.25,v271Meters.y*0.58);",
  " vec4 v271Atlas=texture2D(uVaultMetalAtlas0271,v271Tile);",
  " vec2 v271Cell=floor(vec2((v271Meters.x+",
     (role==="shell"?"1.6":"0.8")+")/12.8,v271Meters.y/3.4));",
  " float v271Variant=v271Hash(v271Cell);",
  " float v271Warm=v271Hash(v271Cell+vec2(17.0,41.0));",
  " float v271Long=mod(v271Meters.x+1.6+mod(v271Cell.y,2.0)*3.2,12.8);",
  " float v271Across=mod(v271Meters.y,3.4);",
  " float v271SeamLong=1.0-smoothstep(0.04,0.21,min(v271Long,12.8-v271Long));",
  " float v271SeamAcross=1.0-smoothstep(0.05,0.15,min(v271Across,3.4-v271Across));",
  " float v271Seam=max(v271SeamLong*.82,v271SeamAcross*.91);",
  // Machined lip directly adjacent to dark grooves. Keeps the original
  // blue/orange vertex-source transport; never adds unbounded white light.
  " float v271LipLong=1.0-smoothstep(0.19,0.44,abs(v271Long-0.34));",
  " float v271LipAcross=1.0-smoothstep(0.13,0.37,abs(v271Across-0.28));",
  " float v271Lip=max(v271LipLong*.58,v271LipAcross*.48);",
  " float v271Mill=(v271Atlas.a-0.62)*0.20;",
  " float v271Rough=(v271Atlas.g-0.57)*0.22;",
  // High has softly filtered fine directional brush; on 4GB use only the
  // prefiltered coarse roughness and milling; avoid subpixel sparkle.
  ...(mobile?[]:[
   " float v271Brushed=(v271Atlas.r-0.5)*0.29+",
   "   (v271Atlas.b-0.5)*0.15;",
  ]),
  " float v271Metal=0.82+0.30*v271Variant+v271Mill+v271Rough"+
   (mobile?";":"+v271Brushed;"),
  " v271Metal*=1.0-0.48*v271Seam;",
  " v271Metal+=v271Lip*0.13;",
  " vec3 v271Titanium=mix(vec3(0.87,0.96,1.035),",
  "   vec3(1.11,0.99,0.91),v271Warm*0.30);",
  ...(role==="rib"?[
   " v271Metal=mix(1.00,v271Metal,0.65);",
   " v271Titanium=mix(v271Titanium,vec3(1.02,1.04,1.04),0.38);",
  ]:[]),
  " vec3 v271Factor=clamp(v271Titanium*v271Metal,",
  "  vec3(0.34),vec3(1.23));",
  " diffuseColor.rgb*=mix(vec3(1.0),v271Factor,",
  "   clamp(uVaultMaterialStrength0271,0.0,1.0));",
  "}"
 ].join("\n");
 return {
  vertexShader:vertex.replace(COMMON,COMMON+"\n"+vheader)
   .replace(PROJECTION,PROJECTION+"\nvVaultMaterialCoord0271=aVaultMaterialCoord0271;"),
  fragmentShader:fragment.replace(COMMON,COMMON+"\n"+fheader)
   .replace(COLOR,COLOR+"\n"+final)
 };
}
function patchMaterial0271(material,uniforms,{role,mobile}){
 if(!material?.isMeshBasicMaterial||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.27.1 requires existing solar-sealed MeshBasicMaterial");
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  const p=patchVaultMaterialShader0271(shader.vertexShader,
   shader.fragmentShader,{role,mobile});
  shader.vertexShader=p.vertexShader;
  shader.fragmentShader=p.fragmentShader;
  Object.assign(shader.uniforms,uniforms);
 };
 material.customProgramCacheKey=function(){
  return previousKey.call(this)+"-vault-material-0271-"+role+(mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=previous;
  material.customProgramCacheKey=previousKey;material.needsUpdate=true;};
}

export function installVaultMaterialParity0271(THREE,world,{
 enabled=true,lowMemory=false,track="vault",foundation=null
}={}){
 const fallback=reason=>({active:false,stats:()=>({
  active:false,version:"0.27.1",reason,addedDrawCalls:0}),
  setComparison(){},dispose(){}});
 if(!enabled)return fallback("classic");
 if(track!=="vault")return fallback("not-vault");
 if(!foundation?.active||foundation.stats?.().coverageMeters!==LENGTH)
  return fallback("0.27.0 full-tunnel foundation unavailable");
 const root=world?.getObjectByName?.(ROOT);
 if(!root?.children||root.children.length!==20)
  return fallback("original 20 tunnel chunks missing");
 const shellMeshes=[],ribMeshes=[],updates=[];
 for(let chunk=0;chunk<20;chunk++){
  const ch=root.children[chunk];
  if(!ch?.children) return fallback("tunnel chunk missing");
  const shell=ch.children.find(m=>m.name===SHELL);
  const rib=ch.children.find(m=>m.name===RIBS);
  if(!shell?.material?.isMeshBasicMaterial||
   !rib?.material?.isMeshBasicMaterial||
   !shell.geometry||!rib.geometry)
   return fallback("original dark metal shell/ribs missing");
  shellMeshes.push(shell);ribMeshes.push(rib);
 }
 // Shared source atlas: same exact mip/packing as approved Skyline 0.26.2.
 // A single texture and 2 material programs for the whole 3400m lap.
 let atlas;const undo=[],uniform={value:1};
 try{
  atlas=makePremiumMetalTexture0262(THREE,lowMemory);
  const shaderUniforms={
   uVaultMetalAtlas0271:{value:atlas},
   uVaultMaterialStrength0271:uniform
  };
  const mats=[{material:shellMeshes[0].material,role:"shell"},
   {material:ribMeshes[0].material,role:"rib"}];
  for(const {material,role} of mats)
   undo.push(patchMaterial0271(material,shaderUniforms,{role,mobile:lowMemory}));
  for(let chunk=0;chunk<20;chunk++)for(const [role,mesh] of [
   ["shell",shellMeshes[chunk]],["rib",ribMeshes[chunk]]]){
   const original=mesh.geometry.getAttribute("aVaultMaterialCoord0271");
   if(original)throw Error("duplicate 0.27.1 coord attribute");
   const coords=buildVaultMaterialCoords0271(mesh.geometry,chunk,role);
   mesh.geometry.setAttribute("aVaultMaterialCoord0271",
    new THREE.Float32BufferAttribute(coords.uv,2));
   updates.push(mesh);
  }
 }catch(e){
  for(const m of updates)m.geometry.deleteAttribute("aVaultMaterialCoord0271");
  for(const f of undo.reverse())f();
  atlas?.dispose?.();
  console.warn("SKYSHIFT 0.27.1: fallback to original 0.27.0 metal",e);
  return fallback("material-atlas-setup-failed: "+String(e?.message||e));
 }
 const state={
  active:true,status:"active",version:"0.27.1",
  materialType:"MeshBasicMaterial (solar-sealed micro-metal; not GGX)",
  sourceAtlasVersion:"0.26.2",atlasSize:lowMemory?128:256,
  atlasCount:1,materialPrograms:2,decoratedShellChunks:20,
  decoratedRibChunks:20,decoratedMeshCount:40,
  decoratedSpanMeters:3400,addedDrawCalls:0,addedMeshes:0,
  addedDynamicLights:0,addedRenderPasses:0,
  addedTextures:1,noNewShaderReflectionSamples:true,
  sourceFixturesUnchanged:true,solarSealUnchanged:true,
  existingRoadUnchanged:true,existingRailUnchanged:true,
  racingPhysicsUnchanged:true,skylineAndAuroraUnchanged:true,
  mobile:!!lowMemory,viewStableGlobalTrackCoord:true,
  previousFoundation:foundation.stats().version
 };
 let disposed=false;
 return {active:true,setComparison:x=>{uniform.value=clamp(x,0,1);},
  stats:()=>({...state,strength:uniform.value}),
  dispose(){
   if(disposed)return;disposed=true;
   uniform.value=0;
   for(const m of updates)m.geometry.deleteAttribute("aVaultMaterialCoord0271");
   for(const f of undo.reverse())f();
   atlas.dispose();
  }
 };
}
