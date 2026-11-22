// SKYSHIFT 0.28.9.4 — unified physical source registry and road-layer cleanup.
// Authored once from the REAL 0.21.1 portal, 0.28.9.2 panel seam,
// 0.28.9.1 straight-only lip, and zone-wave-v060 light palette.
// All world source positions use the original 0.28.1 module-adapted
// positionAt: there is no second made-up tunnel, fake exposure, or light.
import {TUNNEL_PORTALS_0211,tunnelProfilePoint0211}
 from "./tunnel-megastructure-v0211.mjs";
import {createSharedSourceSampler0282}
 from "./shared-road-ship-light-v0282.mjs";
import {vaultStraightMask02891}
 from "./shared-straight-edge-parity-v02891.mjs";
import {railLipPosition02632,railBayWeight02632}
 from "./edge-source-floor-bands-v02632.mjs";
import {ZONE_PALETTES}
 from "./zone-wave-v060.mjs";

export const UNIFIED_SOURCES_02894=Object.freeze({
 version:"0.28.9.4",title:"Unified Light Sources & Road Layer Cleanup",
 registry:"Skyline original 0.21.1 j6 arches + 0.28.9.2 j11/j9 joints + 0.28.9.1 low lip",
 sourceKinds:["arch","ceilingCove","wallPractical","straightEdge"],
 palette:"original zone-wave-v060 ZONE_PALETTES.light",
 removesLegacyAdditiveRoadOnVault:true,
 originalLegacyRoadQuadsPreserved:true,
 newSourceMeshes:0,newWorldLights:0,newDrawCalls:0,
 originalMetalGGX:true,originalRoadGGX:true,
 untouched:"0.28.9.1 straight-only cyan, 0.28.7 L, 0.28.9.2 ceiling mesh, 0.28.9.3 arch glow, ship, GRIP, flight",
 diagnostics:["?unifiedLights=classic","?roadLayers=classic","?ceilingRoad=classic"],
 skylineUntouched:true
});
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const param=(q)=>new URLSearchParams(q||"");
export function unifiedSourcesEnabled02894(search=
 typeof location!=="undefined"?location.search:""){
 const p=param(search);
 if(p.get("track")!=="vault"||["off","classic"].includes(p.get("unifiedLights")))
  return false;
 const v=/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(p.get("v")||"");
 if(!v)return false;
 const [a,b,c,d]=v.slice(1).map(x=>Number(x||0));
 return a>0||b>28||(b===28&&(c>9||(c===9&&d>=4)));
}
export function cleanLegacyRoadEnabled02894(search=
 typeof location!=="undefined"?location.search:""){
 const p=param(search);
 return unifiedSourcesEnabled02894(search)&&p.get("roadLayers")!=="classic";
}
export function ceilingRoadEnabled02894(search=
 typeof location!=="undefined"?location.search:""){
 const p=param(search);
 return unifiedSourcesEnabled02894(search)&&
  !["classic","off"].includes(p.get("ceilingRoad"));
}
export function sharedWaveColors02894(wave){
 const stage=clamp(wave?.shaderBaseStage??0,0,ZONE_PALETTES.length-1);
 return {
  from:ZONE_PALETTES[stage].light,
  to:ZONE_PALETTES[Math.min(stage+1,ZONE_PALETTES.length-1)].light,
  front:wave?.fronts?.[0]??-10000,
  active:wave?.activeCount>0?1:0
 };
}
// Mathematically identical to the approved 0.28.9.2's panelSeamPoint02892:
// original j11 and j9 with inset .82m / .095m and banked global adapter.
export function sharedPanelSeamPoint02894(positionAt,s,side,kind,offset=0){
 if(typeof positionAt!=="function"||!Number.isFinite(s)||
  s<0||s>368||![-1,1].includes(side)||
  !["upper","wall"].includes(kind)||!Number.isFinite(offset))
  throw Error("0.28.9.4 invalid canonical panel seam");
 const j=kind==="upper"?11:9,q=tunnelProfilePoint0211(j,s,false),
  a=tunnelProfilePoint0211(j-1,s,false),
  b=tunnelProfilePoint0211(j+1,s,false);
 const dx=Math.abs(b[0])-Math.abs(a[0]),dy=b[1]-a[1];
 const norm=Math.hypot(dx,dy);
 const x=side*(Math.abs(q[0])-.82+dx/norm*offset);
 const y=q[1]-.095+dy/norm*offset;
 const p=positionAt(s,x,y);
 if(!p||!Number.isFinite(p.x+p.y+p.z))
  throw Error("0.28.9.4 nonfinite canonical seam");
 return p;
}
const nearestPortal=s=>TUNNEL_PORTALS_0211.reduce((best,p)=>
 Math.abs(p-s)<Math.abs(best-s)?p:best,TUNNEL_PORTALS_0211[0]);
const pulse=(distance,sigma)=>Math.exp(-Math.pow(distance/sigma,2));
export function createUnifiedSourceRegistry02894(positionAt,trackLength,{
 lowMemory=false}={}){
 const sampler=createSharedSourceSampler0282(positionAt,trackLength);
 const cache=new Map();
 const at=(local,localS,side,kind)=>{
  const key=[local.index,kind,localS.toFixed(4),side].join(":");
  let p=cache.get(key);
  if(!p){
   if(kind==="arch"){
    const [x,y]=tunnelProfilePoint0211(6,localS,false);
    p=local.at(localS,side*(Math.abs(x)-.57),y-.57*.7);
   }else if(kind==="ceilingCove"||kind==="wallPractical"){
    p=sharedPanelSeamPoint02894(local.at,localS,side,
     kind==="ceilingCove"?"upper":"wall",0);
   }else if(kind==="straightEdge"){
    p=railLipPosition02632(localS,side,-.91,local.at);
   }else throw Error("0.28.9.4 unknown source type "+kind);
   if(!p||!Number.isFinite(p.x+p.y+p.z))
    throw Error("0.28.9.4 nonfinite source position");
   cache.set(key,p);
  }
  return p;
 };
 const get=(s)=>{
  const local=sampler.localFor(s),portal=nearestPortal(local.s);
  const archS=Math.min(portal+.61,367.0);
  const coveS=Math.min(portal+9,367.1);
  const wallS=Math.min(portal+3.75,367.1);
  const edgeBay=Math.max(0,Math.min(15,Math.round((local.s-7.75)/24)));
  const edgeS=Math.min(367.2,4.5+edgeBay*24+3.25);
  const kinds=[
   {kind:"arch",sourceS:archS,sigma:lowMemory?3.9:5.6},
   {kind:"ceilingCove",sourceS:coveS,sigma:lowMemory?4.5:6.1},
   {kind:"wallPractical",sourceS:wallS,sigma:lowMemory?3.5:4.7},
   {kind:"straightEdge",sourceS:edgeS,sigma:2.6}
  ];
  const result={module:local.module,index:local.index,localS:local.s,portal,
   edgeStraightMask:vaultStraightMask02891(s)};
  for(const p of kinds){
   const worldS=local.module.start+p.sourceS*local.module.scale;
   const envelope=pulse(s-worldS,p.sigma);
   result[p.kind]={sourceS:p.sourceS,worldS,
    left:at(local,p.sourceS,-1,p.kind),
    right:at(local,p.sourceS,1,p.kind),
    window:p.kind==="straightEdge"?
     envelope*railBayWeight02632(local.s)*result.edgeStraightMask:envelope};
  }
  return result;
 };
 return {modules:sampler.modules,trackLength,lowMemory,
  at:get,stats:()=>({modules:sampler.modules.length,
   physicalPositions:cache.size,
   sourceKinds:UNIFIED_SOURCES_02894.sourceKinds,
   sharedPalette:ZONE_PALETTES.length,
   edgeStraightOnly:true})};
}
// The inherited 0.21.2 mesh is 10 separate batches of ADDITIVE
// "Tunnel / NEON_ROAD_RESPONSE". New 0.28.9.3 true palette GGX already
// supplies local arch light. Hiding this redundant floor geometry removes
// its depth/pigment interference and ten transparent draws on High.
// It is always present, untouched, behind ?roadLayers=classic.
export function installLegacyRoadCleanup02894(world,{
 enabled=false,clean=false}={}){
 const meshes=[];world?.traverse?.(m=>{
  if(m?.isMesh&&m.name==="Tunnel / NEON_ROAD_RESPONSE")
   meshes.push({mesh:m,original:m.visible});
 });
 const control={value:enabled&&clean?1:0};
 const apply=()=>{for(const item of meshes)
  item.mesh.visible=control.value>0.5?false:item.original;};
 apply();
 let disposed=false;
 return {active:enabled,stats:()=>({
  active:enabled,version:"0.28.9.4",
  originalSourceBatches:meshes.length,removedBatches:control.value>0.5?meshes.length:0,
  originalGeometryRetained:true,originalGlowShaderRetained:true,
  oldResponseEnabled:control.value<=0.5,
  originalRoadMaterialUntouched:true,drawCallsSaved:control.value>0.5?meshes.length:0
 }),setComparison(v){control.value=clamp(v);apply();},
  dispose(){if(disposed)return;disposed=true;
   for(const item of meshes)item.mesh.visible=item.original;}};
}
// The exact EXISTING 0.28.9.2 ceiling fixture and wall-practical positions
// are now physical inputs to the original 0.28.9.3 road GGX, rather than
// the old 0.26.0 floating T/amber positions. No new scene/world lights.
export function buildUnifiedCeilingRoadData02894(geometry,positionAt,trackLength,{
 lowMemory=false}={}){
 const coord=geometry?.getAttribute?.("aTrackCoord");
 const pos=geometry?.getAttribute?.("position");
 if(!coord||!pos||coord.count!==pos.count)
  throw Error("0.28.9.4 original indexed PBR road missing");
 const reg=createUnifiedSourceRegistry02894(positionAt,trackLength,{lowMemory});
 const N=coord.count;
 const vectors={
  unifiedCoveLeft02894:new Float32Array(N*3),
  unifiedCoveRight02894:new Float32Array(N*3),
  unifiedWallLeft02894:new Float32Array(N*3),
  unifiedWallRight02894:new Float32Array(N*3),
  unifiedWindows02894:new Float32Array(N*2)
 };
 let lit=0,turns=0;
 for(let i=0;i<N;i++){
  const item=reg.at(coord.getX(i));
  for(const [key,p] of [
   ["unifiedCoveLeft02894",item.ceilingCove.left],
   ["unifiedCoveRight02894",item.ceilingCove.right],
   ["unifiedWallLeft02894",item.wallPractical.left],
   ["unifiedWallRight02894",item.wallPractical.right]
  ])vectors[key].set([p.x,p.y,p.z],3*i);
  vectors.unifiedWindows02894.set(
   [item.ceilingCove.window,item.wallPractical.window],i*2);
  if(item.ceilingCove.window>.02||item.wallPractical.window>.02)lit++;
  if(item.edgeStraightMask<.001&&item.ceilingCove.window>.02)turns++;
 }
 return {vectors,vertices:N,litVertices:lit,
  curvedCeilingVertices:turns,...reg.stats()};
}
const COMMON="#include <common>",PROJECT="#include <project_vertex>";
const ARCH_END=" (a93Energy*(0.036+0.062*a93Fresnel));\n}";
export function patchUnifiedCeilingRoad02894(vertex,fragment,{lowMemory=false}={}){
 if(!vertex.includes(COMMON)||!vertex.includes(PROJECT)||
  !fragment.includes(COMMON)||!fragment.includes(ARCH_END)||
  !fragment.includes("varying vec2 vTrackCoord;")||
  !fragment.includes("a93Safe")||!fragment.includes("roadSolarMask")||
  !fragment.includes("RE_Direct("))
  throw Error("0.28.9.4 native 0.28.9.3 GGX road shader required");
 const vd=[
  "attribute vec3 unifiedCoveLeft02894,unifiedCoveRight02894;",
  "attribute vec3 unifiedWallLeft02894,unifiedWallRight02894;",
  "attribute vec2 unifiedWindows02894;",
  "varying vec3 vU94CoveLeft,vU94CoveRight;",
  "varying vec3 vU94WallLeft,vU94WallRight;",
  "varying vec2 vU94Windows;"
 ].join("\n");
 const vc=[
  "vU94CoveLeft=(viewMatrix*vec4(unifiedCoveLeft02894,1.0)).xyz-mvPosition.xyz;",
  "vU94CoveRight=(viewMatrix*vec4(unifiedCoveRight02894,1.0)).xyz-mvPosition.xyz;",
  "vU94WallLeft=(viewMatrix*vec4(unifiedWallLeft02894,1.0)).xyz-mvPosition.xyz;",
  "vU94WallRight=(viewMatrix*vec4(unifiedWallRight02894,1.0)).xyz-mvPosition.xyz;",
  "vU94Windows=unifiedWindows02894;"
 ].join("\n");
 const fdecl=[
  "uniform vec3 uU94Old,uU94Next;",
  "uniform float uU94Front,uU94Active,uU94Lap,uU94Strength;",
  "varying vec3 vU94CoveLeft,vU94CoveRight;",
  "varying vec3 vU94WallLeft,vU94WallRight;",
  "varying vec2 vU94Windows;"
 ].join("\n");
 const code=[
  "// Physical banked source positions: actual 0.28.9.2 j11 cove and j9 wall.",
  "float u94Signed=mod(vTrackCoord.x-uU94Front+uU94Lap*.5,uU94Lap)-uU94Lap*.5;",
  "float u94Mix=uU94Active*(1.0-smoothstep(-66.0,66.0,u94Signed));",
  "vec3 u94Tint=mix(uU94Old,uU94Next,clamp(u94Mix,0.0,1.0));",
  "vec3 u94Warm=mix(u94Tint,vec3(1.0,.48,.17),.16);",
  "float u94Lateral=abs(vTrackCoord.y);",
  "float u94Shoulder=smoothstep(5.8,8.0,u94Lateral)*",
  " (1.0-smoothstep(10.1,11.55,u94Lateral));",
  "float u94Guard=(1.0-.91*clamp(guided,0.0,1.0))*",
  " (1.0-.94*clamp(whiteCore,0.0,1.0))*",
  " (1.0-.84*clamp(padCoverage,0.0,1.0));",
  "float u94Cool=uU94Strength*u94Shoulder*u94Guard*",
  " clamp(vU94Windows.x,0.0,1.0);",
  "float u94Wall=uU94Strength*u94Shoulder*u94Guard*",
  " clamp(vU94Windows.y,0.0,1.0);",
  "if(u94Cool+u94Wall>.00004){",
  "vec3 u94Diffuse=reflectedLight.directDiffuse;",
  "IncidentLight u94Lamp;u94Lamp.visible=true;",
  ...(lowMemory?[
   "vec3 u94Cove=mix(vU94CoveLeft,vU94CoveRight,step(0.0,vTrackCoord.y));",
   "float u94Distance=length(u94Cove);",
   "u94Lamp.direction=normalize(u94Cove+vec3(.0001));",
   "u94Lamp.color=u94Tint*(u94Cool*.95/(1.0+pow(u94Distance/16.0,2.0)));",
   "RE_Direct(u94Lamp,geometryPosition,geometryNormal,geometryViewDir,",
   " geometryClearcoatNormal,material,reflectedLight);"
  ]:[
   "for(int u94Side=0;u94Side<2;u94Side++){",
   "vec3 u94Cove=u94Side==0?vU94CoveLeft:vU94CoveRight;",
   "vec3 u94WarmPos=u94Side==0?vU94WallLeft:vU94WallRight;",
   "float u94D=length(u94Cove);",
   "u94Lamp.direction=normalize(u94Cove+vec3(.0001));",
   "u94Lamp.color=u94Tint*(u94Cool*.86/(1.0+pow(u94D/17.0,2.0)));",
   "RE_Direct(u94Lamp,geometryPosition,geometryNormal,geometryViewDir,",
   " geometryClearcoatNormal,material,reflectedLight);",
   "float u94DW=length(u94WarmPos);",
   "u94Lamp.direction=normalize(u94WarmPos+vec3(.0001));",
   "u94Lamp.color=u94Warm*(u94Wall*.38/(1.0+pow(u94DW/14.0,2.0)));",
   "RE_Direct(u94Lamp,geometryPosition,geometryNormal,geometryViewDir,",
   " geometryClearcoatNormal,material,reflectedLight);",
   "}"
  ]),
  "reflectedLight.directDiffuse=u94Diffuse;",
  "reflectedLight.directSpecular+=u94Tint*u94Cool*0.025+",
  " u94Warm*u94Wall*"+(lowMemory?"0.004":"0.012")+";",
  "}"
 ].join("\n");
 return {
  vertexShader:vertex.replace(COMMON,COMMON+"\n"+vd)
   .replace(PROJECT,PROJECT+"\n"+vc),
  fragmentShader:fragment.replace(COMMON,COMMON+"\n"+fdecl)
   .replace(ARCH_END,ARCH_END+"\n"+code)
 };
}
export function installUnifiedCeilingRoad02894(THREE,world,positionAt,{
 enabled=false,trackLength=3400,lowMemory=false}={}){
 const inactive=reason=>({active:false,reason,updateWave(){},
  setComparison(){},stats:()=>({active:false,reason}),dispose(){}});
 if(!enabled)return inactive("old release or ceilingRoad=classic");
 const road=world?.getObjectByName?.("Zone Ribbon · integrated PBR racing deck");
 if(!road?.material?.isMeshStandardMaterial||!road?.geometry)
  throw Error("0.28.9.4 original physical deck missing");
 const mat=road.material,geo=road.geometry,
  data=buildUnifiedCeilingRoadData02894(geo,positionAt,trackLength,{lowMemory});
 const names=Object.keys(data.vectors);
 if(names.some(n=>geo.getAttribute(n)))
  throw Error("0.28.9.4 duplicate shared physical source");
 const uniforms={
  uU94Old:{value:new THREE.Color(ZONE_PALETTES[0].light)},
  uU94Next:{value:new THREE.Color(ZONE_PALETTES[0].light)},
  uU94Front:{value:-10000},uU94Active:{value:0},
  uU94Lap:{value:trackLength},uU94Strength:{value:1}
 };
 const before=mat.onBeforeCompile,key=mat.customProgramCacheKey;
 try{
  for(const name of names)
   geo.setAttribute(name,new THREE.Float32BufferAttribute(data.vectors[name],
    name==="unifiedWindows02894"?2:3));
  mat.onBeforeCompile=function(shader,renderer){
   before.call(this,shader,renderer);
   const patched=patchUnifiedCeilingRoad02894(
    shader.vertexShader,shader.fragmentShader,{lowMemory});
   shader.vertexShader=patched.vertexShader;
   shader.fragmentShader=patched.fragmentShader;
   Object.assign(shader.uniforms,uniforms);
  };
  mat.customProgramCacheKey=function(){
   return key.call(this)+"-unified-source-ggx-02894-"+(lowMemory?"4GB":"High");
  };
  mat.needsUpdate=true;
 }catch(e){
  mat.onBeforeCompile=before;mat.customProgramCacheKey=key;
  for(const name of names)geo.deleteAttribute(name);
  mat.needsUpdate=true;throw e;
 }
 let disposed=false;
 return {active:true,
  updateWave(wave){
   const p=sharedWaveColors02894(wave);
   uniforms.uU94Old.value.setHex(p.from);
   uniforms.uU94Next.value.setHex(p.to);
   uniforms.uU94Front.value=p.front;
   uniforms.uU94Active.value=p.active;
  },
  setComparison(v){uniforms.uU94Strength.value=clamp(v);},
  stats:()=>({active:true,version:"0.28.9.4",sourceKinds:UNIFIED_SOURCES_02894.sourceKinds,
   modules:data.modules,physicalPositions:data.physicalPositions,
   vertices:data.vertices,litVertices:data.litVertices,
   ceilingInCurves:data.curvedCeilingVertices,lowMemory,
   paletteFrom:uniforms.uU94Old.value.getHex(),
   paletteTo:uniforms.uU94Next.value.getHex(),
   waveFront:uniforms.uU94Front.value,
   strength:uniforms.uU94Strength.value,
   originalIndexedPBRMaterial:true,physicalGGX:true,
   originalStraightOnlyEdgeMaskPreserved:true,
   meshesAdded:0,drawCallsAdded:0,renderPassesAdded:0,
   collidersChanged:0,shipUntouched:true,physicsUntouched:true}),
  dispose(){if(disposed)return;disposed=true;
   mat.onBeforeCompile=before;mat.customProgramCacheKey=key;
   mat.needsUpdate=true;
   for(const name of names)geo.deleteAttribute(name);
  }
 };
}
