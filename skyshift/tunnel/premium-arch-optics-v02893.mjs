// SKYSHIFT 0.28.9.3 — Premium Arch Optics & Chromatic Road Reflection.
// One shared Skyline source architecture; ONLY Vault >= 0.28.9.3 enables
// the new optical layer. No new meshes/draw calls/lights/SSR/PMREM passes;
// road material, geometry positions, curves, collision, GRIP all unchanged.
import {TUNNEL_PORTALS_0211,TUNNEL_PROFILE_0211,
 tunnelProfilePoint0211} from "./tunnel-megastructure-v0211.mjs";
import {createUnifiedSourceRegistry02894,sharedWaveColors02894}
 from "./unified-tunnel-light-sources-v02894.mjs";
import {createSharedSourceSampler0282}
 from "./shared-road-ship-light-v0282.mjs";
import {ZONE_WAVE,ZONE_PALETTES} from "../core/zone-wave-v060.mjs";

export const ARCH_OPTICS_02893=Object.freeze({
 version:"0.28.9.3",name:"Arch Emitter & Chromatic Road Reflection",
 sources:"original 0.21.1 INTEGRATED_LIGHT, HALO, actual j6 curved arch roots",
 color:"same zone-wave-v060 light palette and 66m spatial front",
 road:"two source-positioned native GGX samples High, nearest-side 4GB",
 roadGlint:"narrow shoulder-only color specular, guide/white-core protected",
 sourceGeometry:"original source mesh; halo feather generated in-place",
 sourceDrawCallsAdded:0,roadDrawCallsAdded:0,dynamicLightsAdded:0,
 reflectionPassesAdded:0,shipUntouched:true,gripUntouched:true,
 lowerEdge02891Untouched:true,archFoot0287Untouched:true,
 historicalSkylineUntouched:true,
 rollback:"?archOptics=classic or ?archRoad=classic",
 legacyDiagnostic:"?archLegacyRoad=off hides only old NEON_ROAD_RESPONSE"
});
const MODEL="SKYSHIFT · Tunnel Megastructure 0.21.1";
const CORE="Tunnel / INTEGRATED_LIGHT",HALO="Tunnel / HALO";
const ROAD="Zone Ribbon · integrated PBR racing deck";
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function archOpticsEnabled02893(search=
 typeof location!=="undefined"?location.search:""){
 const p=new URLSearchParams(search||"");
 if(p.get("track")!=="vault"||
  ["classic","off"].includes(p.get("archOptics")))return false;
 const m=/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(p.get("v")||"");
 if(!m)return false;
 const [a,b,c,d]=m.slice(1).map(x=>Number(x||0));
 return a>0||b>28||(b===28&&(c>9||(c===9&&d>=3)));
}
export function archRoadEnabled02893(search=
 typeof location!=="undefined"?location.search:""){
 const p=new URLSearchParams(search||"");
 return archOpticsEnabled02893(search)&&
  !["classic","off"].includes(p.get("archRoad"));
}
// The source builder writes ALL portal arch quads before its continuously
// illuminated longitudinal wall guides. Never brighten the guide geometry.
export function archCoreVertices02893(){
 return TUNNEL_PORTALS_0211.length*(TUNNEL_PROFILE_0211.length-12)*6;
}
export function buildArchCoreMask02893(geometry,THREE){
 const pos=geometry?.getAttribute?.("position"),
  source=geometry?.getAttribute?.("trackS");
 const n=archCoreVertices02893();
 if(!pos||!source||source.count!==pos.count||n>pos.count)
  throw Error("0.28.9.3 original portal arch/source ordering unavailable");
 const a=new Float32Array(pos.count);a.fill(1,0,n);
 return new THREE.Float32BufferAttribute(a,1);
}
// One source batch, now with a deliberately central luminous halo and
// progressively transparent edges instead of a uniformly bright flat ribbon.
// The original banked world positions are interpolated *on existing quads*;
// no new independent fixture or different track spline.
export function buildArchHaloFeather02893(THREE,oldGeo){
 const pos=oldGeo?.getAttribute?.("position"),
  source=oldGeo?.getAttribute?.("trackS"),
  col=oldGeo?.getAttribute?.("color"),
  glow=oldGeo?.getAttribute?.("glowWeight");
 if(!pos||!source||!glow||!col||pos.count!==source.count||
  pos.count!==glow.count||pos.count!==col.count||pos.count%6!==0)
  throw Error("0.28.9.3 original chromatic arch halo unavailable");
 const points=[],s=[],colors=[],weights=[],feather=[];
 const sourceP=(i)=>[pos.getX(i),pos.getY(i),pos.getZ(i)];
 const sourceC=(i)=>[col.getX(i),col.getY(i),col.getZ(i)];
 const blend=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
 function emit(p,c,z,w,f){
  points.push(...p);colors.push(...c);s.push(z);weights.push(w);feather.push(f);
 }
 for(let i=0;i<pos.count;i+=6){
  // Original quad vertex order is [a,b,c,a,c,d].
  const a=sourceP(i),b=sourceP(i+1),
   c=sourceP(i+2),d=sourceP(i+5);
  const ac=sourceC(i),bc=sourceC(i+1),
   cc=sourceC(i+2),dc=sourceC(i+5);
  const sa=source.getX(i),sb=source.getX(i+1),
   sc=source.getX(i+2),sd=source.getX(i+5);
  const wa=glow.getX(i),wb=glow.getX(i+1),
   wc=glow.getX(i+2),wd=glow.getX(i+5);
  const values=[0,.22,.78,1].map(t=>{
   const p0=blend(a,d,t),p1=blend(b,c,t),
    c0=blend(ac,dc,t),c1=blend(bc,cc,t);
   return [
    {p:p0,c:c0,s:sa+(sd-sa)*t,w:wa+(wd-wa)*t,f:t===0||t===1?.065:1},
    {p:p1,c:c1,s:sb+(sc-sb)*t,w:wb+(wc-wb)*t,f:t===0||t===1?.065:1}
   ];
  });
  for(let t=0;t<3;t++){
   const [a0,b0]=values[t],[a1,b1]=values[t+1];
   for(const v of [a0,b0,b1,a0,b1,a1])emit(v.p,v.c,v.s,v.w,v.f);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(points,3));
 geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
 geometry.setAttribute("trackS",new THREE.Float32BufferAttribute(s,1));
 geometry.setAttribute("glowWeight",new THREE.Float32BufferAttribute(weights,1));
 geometry.setAttribute("archFeather02893",new THREE.Float32BufferAttribute(feather,1));
 geometry.computeBoundingSphere();
 return {geometry,quads:pos.count/6,triangles:points.length/9,
  originalTriangles:pos.count/3};
}
export function patchArchSource02893(vertex,fragment,{kind="core"}={}){
 if(!["core","halo"].includes(kind)||
  !vertex.includes("#include <common>")||
  !vertex.includes("#include <begin_vertex>")||
  !fragment.includes("#include <common>")||
  !fragment.includes("diffuseColor.rgb = tunnelSpectrumTint()*vTunnelGlow;"))
  throw Error("0.28.9.3 original spectral arch shader required");
 const attr=kind==="core"?"archCoreMask02893":"archFeather02893";
 const v=vertex.replace("#include <common>","#include <common>\n"+
  "attribute float "+attr+";\nvarying float vA93Shape;")
 .replace("#include <begin_vertex>","#include <begin_vertex>\n"+
  "vA93Shape="+attr+";");
 const after=kind==="core"?
  "diffuseColor.rgb*=1.0+uArchOptics02893*0.34*vA93Shape;":
  "diffuseColor.rgb*=1.0+uArchOptics02893*0.28;"+
  "\ndiffuseColor.a*=mix(1.0,vA93Shape,uArchOptics02893);";
 const f=fragment.replace("#include <common>","#include <common>\n"+
  "uniform float uArchOptics02893;\nvarying float vA93Shape;")
 .replace("diffuseColor.rgb = tunnelSpectrumTint()*vTunnelGlow;",
  "diffuseColor.rgb = tunnelSpectrumTint()*vTunnelGlow;\n"+after);
 return {vertexShader:v,fragmentShader:f};
}
export function installArchSourceOptics02893(THREE,section,{enabled=false,
 lowMemory=false}={}){
 const inactive=reason=>({active:false,reason,setComparison(){},
  stats:()=>({active:false,reason}),dispose(){}});
 if(!enabled)return inactive("historic or classic");
 const group=section?.getObjectByName?.(MODEL);
 const core=group?.children?.find(x=>x.name===CORE),
  halo=group?.children?.find(x=>x.name===HALO);
 if(!core?.material?.isMeshBasicMaterial||
  (halo&&!halo.material?.isMeshBasicMaterial)||
  (!lowMemory&&!halo))
  throw Error("0.28.9.3 authentic curved arch lighting not available");
 const oldCore=core.geometry,coreMat=core.material,
  oldHalo=halo?.geometry,haloMat=halo?.material;
 const mask=buildArchCoreMask02893(oldCore,THREE);
 const generated=halo?buildArchHaloFeather02893(THREE,oldHalo):null;
 const power={value:1};
 const undo=[];
 try{
  oldCore.setAttribute("archCoreMask02893",mask);
  if(halo)halo.geometry=generated.geometry;
  for(const [mat,kind] of [[coreMat,"core"],...(halo?[[haloMat,"halo"]]:[])]){
   const before=mat.onBeforeCompile,key=mat.customProgramCacheKey;
   mat.onBeforeCompile=function(shader,renderer){
    before.call(this,shader,renderer);
    const next=patchArchSource02893(shader.vertexShader,shader.fragmentShader,{kind});
    shader.vertexShader=next.vertexShader;shader.fragmentShader=next.fragmentShader;
    shader.uniforms.uArchOptics02893=power;
   };
   mat.customProgramCacheKey=function(){
    return key.call(this)+"-premium-arch-02893-"+kind;
   };
   mat.needsUpdate=true;
   undo.push(()=>{mat.onBeforeCompile=before;mat.customProgramCacheKey=key;
    mat.needsUpdate=true;});
  }
 }catch(e){
  for(const f of undo.reverse())f();
  oldCore.deleteAttribute("archCoreMask02893");
  if(halo){halo.geometry=oldHalo;generated?.geometry.dispose();}
  throw e;
 }
 let disposed=false;
 return {active:true,setComparison:v=>power.value=clamp(v),
  stats:()=>({active:true,version:"0.28.9.3",
   originalArchSegments:TUNNEL_PORTALS_0211.length,
   archVertices:archCoreVertices02893(),
   originalCoreAndGuideBatch:true,guidePreserved:true,
   haloFeathered:!!halo,haloBatchesAdded:0,
   haloTriangles:generated?.triangles??0,drawCallsAdded:0,
   noExtraLights:true,lowMemory,sourceStrength:power.value}),
  dispose(){if(disposed)return;disposed=true;
   for(const f of undo.reverse())f();
   oldCore.deleteAttribute("archCoreMask02893");
   if(halo){halo.geometry=oldHalo;generated?.geometry.dispose();}
  }};
}
// Original Skyline profile j6 is the actual lower lit arch segment, not a
// guessed fake world point or a separate road lamp. Sample the SAME local
// source arc / positionAt adapter used for the tunnel geometry.
export function buildArchRoadSources02893(geometry,positionAt,trackLength,{
 lowMemory=false,unifiedSources=false,sourceSampler=null,sourceRegistry=null}={}){
 const source=sourceSampler??createSharedSourceSampler0282(positionAt,trackLength);
 if(source.trackLength!==trackLength)throw Error("EF05 source track length mismatch");
 const unified=unifiedSources?
  (sourceRegistry??createUnifiedSourceRegistry02894(positionAt,trackLength,{lowMemory,sourceSampler:source})):null;
 if(unified&&(unified.trackLength!==trackLength||unified.lowMemory!==lowMemory))
  throw Error("EF05 registry configuration mismatch");
 const coords=geometry?.getAttribute?.("aTrackCoord"),
  positions=geometry?.getAttribute?.("position");
 if(!coords||!positions||coords.count!==positions.count)
  throw Error("0.28.9.3 existing indexed banked PBR road missing");
 const n=coords.count,left=new Float32Array(n*3),
  right=new Float32Array(n*3),arc=new Float32Array(n),
  window=new Float32Array(n);
 const cache=new Map();let near=0;
 for(let i=0;i<n;i++){
  const s=coords.getX(i);
  if(unified){
   const item=unified.at(s);
   if(!item)continue;
   const sample=item.arch;
   arc[i]=sample.worldS;window[i]=sample.window;
   left.set([sample.left.x,sample.left.y,sample.left.z],3*i);
   right.set([sample.right.x,sample.right.y,sample.right.z],3*i);
   if(Math.abs(s-arc[i])<12)near++;
   continue;
  }
  const local=source.localFor(s);
  if(!local)continue;
  const nearest=TUNNEL_PORTALS_0211.reduce((best,x)=>
   Math.abs(x-local.s)<Math.abs(best-local.s)?x:best,
   TUNNEL_PORTALS_0211[0]);
  const archS=Math.min(nearest+.61,367.0);
  arc[i]=local.module.start+archS*local.module.scale;
  // Weight by the TRUE distance at each physical road vertex BEFORE the
  // rasterizer interpolates attributes. Interpolating the nearest-source
  // POSITION across a portal-selection seam made archArc follow the road
  // and generated a false continuously glowing pink/cyan shoulder.
  // A preweighted local pulse stays dark midway between actual arches.
  window[i]=Math.exp(-Math.pow((s-arc[i])/(lowMemory?3.9:5.6),2));
  const [x,y]=tunnelProfilePoint0211(6,archS,false);
  for(const side of [-1,1]){
   const key=local.index+":"+nearest+":"+side;
   let pos=cache.get(key);
   if(!pos){
    pos=local.at(archS,side*(Math.abs(x)-.57),
     y-.57*.7);
    if(!pos||!Number.isFinite(pos.x+pos.y+pos.z))
     throw Error("0.28.9.3 nonfinite real arch foot source");
    cache.set(key,pos);
   }
   (side<0?left:right).set([pos.x,pos.y,pos.z],3*i);
  }
  if(Math.abs(s-arc[i])<12)near++;
 }
 return {left,right,arc,window,vertices:n,
  sourcePositions:unified?unified.stats().physicalPositions:cache.size,
  unifiedSources,nearArchVertices:near,sourceModules:source.modules.length};
}
const COMMON="#include <common>",PROJ="#include <project_vertex>";
// 0.28.9 inserts its streak code immediately before this expression and
// removes the original leading space; match the stable semantic expression.
const ANCHOR="reflectedLight.directSpecular+=r263Convolved*\n"+
 "  (r263Keep*r263Fresnel*r263Surface);";
export function patchArchRoadShader02893(vertex,fragment,{mobile=false,packed=false}={}){
 if(!vertex.includes(COMMON)||!vertex.includes(PROJ)||
  !fragment.includes(COMMON)||!fragment.includes(ANCHOR)||
  !fragment.includes("varying vec2 vTrackCoord;")||
  !fragment.includes("r263Guides")||!fragment.includes("r263Keep")||
  !fragment.includes("roadSolarMask"))
  throw Error("0.28.9.3 original solar-sealed GGX road shader required");
 const decl=[
  "attribute vec3 archLeft02893,archRight02893;",
  packed?"attribute vec2 archArcWindow02894;":"attribute float archArc02893,archWindow02893;",
  "varying vec3 vA93Left,vA93Right;",
  "varying float vA93Arc,vA93Window;"
 ].join("\n");
 const vd=[
  "vA93Left=(viewMatrix*vec4(archLeft02893,1.0)).xyz-mvPosition.xyz;",
  "vA93Right=(viewMatrix*vec4(archRight02893,1.0)).xyz-mvPosition.xyz;",
  packed?"vA93Arc=archArcWindow02894.x;vA93Window=archArcWindow02894.y;":
   "vA93Arc=archArc02893;vA93Window=archWindow02893;"
 ].join("\n");
 const fd=[
  "uniform vec3 uA93Old,uA93Next;",
  "uniform float uA93Front,uA93Active,uA93Lap,uA93Power;",
  "varying vec3 vA93Left,vA93Right;",
  "varying float vA93Arc,vA93Window;"
 ].join("\n");
 const physical=[
  "// Source is the ACTUAL j6 portal arch, not the straight-only edge LED.",
  "float a93Signed=mod(vTrackCoord.x-uA93Front+.5*uA93Lap,uA93Lap)-.5*uA93Lap;",
  "float a93Mix=uA93Active*(1.0-smoothstep(-"+
   ZONE_WAVE.atmosphereTransitionMeters.toFixed(1)+","+
   ZONE_WAVE.atmosphereTransitionMeters.toFixed(1)+",a93Signed));",
  "vec3 a93Tint=mix(uA93Old,uA93Next,clamp(a93Mix,0.0,1.0));",
  "// Do not interpolate nearest arch meters as a source-distance field.",
  "float a93Window=clamp(vA93Window,0.0,1.0);",
  "float a93L=abs(vTrackCoord.y);",
  "float a93Shoulder=smoothstep(5.5,8.5,a93L)*",
  " (1.0-smoothstep(10.55,11.7,a93L));",
  "float a93Safe=(1.0-.93*clamp(guided,0.0,1.0))*",
  " (1.0-.94*clamp(whiteCore,0.0,1.0))*",
  " (1.0-.88*clamp(padCoverage,0.0,1.0));",
  "float a93Energy=uA93Power*a93Window*a93Shoulder*a93Safe;",
  "if(a93Energy>.00004){",
  "vec3 a93DiffuseBefore=reflectedLight.directDiffuse;",
  "IncidentLight a93Lamp;a93Lamp.visible=true;",
  ...(mobile?[
   "vec3 a93Pos=mix(vA93Left,vA93Right,step(0.0,vTrackCoord.y));",
   "float a93Dist=length(a93Pos);",
   "a93Lamp.direction=normalize(a93Pos+vec3(0.0001));",
   "a93Lamp.color=a93Tint*(a93Energy*3.3/"+
    "(1.0+pow(a93Dist/18.0,2.0)));",
   "RE_Direct(a93Lamp,geometryPosition,geometryNormal,geometryViewDir,",
   " geometryClearcoatNormal,material,reflectedLight);"
  ]:[
   "for(int a93Side=0;a93Side<2;a93Side++){",
   "vec3 a93Pos=a93Side==0?vA93Left:vA93Right;",
   "float a93Dist=length(a93Pos);",
   "a93Lamp.direction=normalize(a93Pos+vec3(0.0001));",
   "a93Lamp.color=a93Tint*(a93Energy*2.6/"+
    "(1.0+pow(a93Dist/18.0,2.0)));",
   "RE_Direct(a93Lamp,geometryPosition,geometryNormal,geometryViewDir,",
   " geometryClearcoatNormal,material,reflectedLight);",
   "}"
  ]),
  "reflectedLight.directDiffuse=a93DiffuseBefore;",
  "float a93Fresnel=pow(1.0-clamp(dot(normalize(vViewPosition),normal),0.0,1.0),2.0);",
  "reflectedLight.directSpecular+=a93Tint*",
   " (a93Energy*(0.036+0.062*a93Fresnel));",
  "}"
 ].join("\n");
 return {
  vertexShader:vertex.replace(COMMON,COMMON+"\n"+decl)
   .replace(PROJ,PROJ+"\n"+vd),
  fragmentShader:fragment.replace(COMMON,COMMON+"\n"+fd)
   .replace(ANCHOR,ANCHOR+"\n"+physical)
 };
}
export function installArchRoadReflection02893(THREE,world,positionAt,{
 enabled=false,lowMemory=false,trackLength=3400,unifiedSources=false,sourceSampler=null,sourceRegistry=null
}={}){
 const inactive=reason=>({active:false,reason,setComparison(){},
  updateWave(){},stats:()=>({active:false,reason}),dispose(){}});
 if(!enabled)return inactive("historic, archRoad=classic or unsupported");
 const mesh=world?.getObjectByName?.(ROAD),material=mesh?.material,
  geometry=mesh?.geometry;
 if(!material?.isMeshStandardMaterial||!geometry||
  typeof positionAt!=="function")
  throw Error("0.28.9.3 original physical road/source missing");
 const data=buildArchRoadSources02893(geometry,positionAt,trackLength,{lowMemory,unifiedSources,sourceSampler,sourceRegistry});
 // 0.28.9.4 packs the original two scalar sources into one vec2.
 // Existing 0.28.9.3 URLs keep exact historical data and shader layout.
 // This frees one GPU slot for the new single packed j11 cove position,
 // ensuring no increase over the approved 0.28.9.3 attribute count.
 const keys=unifiedSources?["archLeft02893","archRight02893",
   "archArcWindow02894"]:
  ["archLeft02893","archRight02893","archArc02893","archWindow02893"];
 if(keys.some(k=>geometry.getAttribute(k)))
  throw Error("0.28.9.3 arch attributes already installed");
 const uniform={
  uA93Old:{value:new THREE.Color(ZONE_PALETTES[0].light)},
  uA93Next:{value:new THREE.Color(ZONE_PALETTES[0].light)},
  uA93Front:{value:-10000},uA93Active:{value:0},
  uA93Lap:{value:trackLength},uA93Power:{value:1}
 };
 const before=material.onBeforeCompile,key=material.customProgramCacheKey;
 try{
  geometry.setAttribute(keys[0],new THREE.Float32BufferAttribute(data.left,3));
  geometry.setAttribute(keys[1],new THREE.Float32BufferAttribute(data.right,3));
  if(unifiedSources){
   const packed=new Float32Array(data.vertices*2);
   for(let i=0;i<data.vertices;i++){
    packed[2*i]=data.arc[i];packed[2*i+1]=data.window[i];
   }
   geometry.setAttribute(keys[2],new THREE.Float32BufferAttribute(packed,2));
  }else{
   geometry.setAttribute(keys[2],new THREE.Float32BufferAttribute(data.arc,1));
   geometry.setAttribute(keys[3],new THREE.Float32BufferAttribute(data.window,1));
  }
  material.onBeforeCompile=function(shader,renderer){
   before.call(this,shader,renderer);
   const next=patchArchRoadShader02893(
    shader.vertexShader,shader.fragmentShader,{mobile:lowMemory,packed:unifiedSources});
   shader.vertexShader=next.vertexShader;shader.fragmentShader=next.fragmentShader;
   Object.assign(shader.uniforms,uniform);
  };
  material.customProgramCacheKey=function(){
   return key.call(this)+"-arch-wave-ggx-02893-"+(lowMemory?"4GB":"High")+
    (unifiedSources?"-packed-source-02894":"");
  };
  material.needsUpdate=true;
 }catch(e){
  material.onBeforeCompile=before;material.customProgramCacheKey=key;
  for(const k of keys)geometry.deleteAttribute(k);
  material.needsUpdate=true;
  throw e;
 }
 let disposed=false;
 return {
  active:true,
  updateWave(wave){
   const stage=sharedWaveColors02894(wave);
   uniform.uA93Old.value.setHex(stage.from);
   uniform.uA93Next.value.setHex(stage.to);
   uniform.uA93Front.value=stage.front;
   uniform.uA93Active.value=stage.active;
  },
  setComparison:v=>uniform.uA93Power.value=clamp(v),
  stats:()=>({active:true,version:"0.28.9.3",
   nativeGGX:true,originalIndexedRoad:true,
   sourceModules:data.sourceModules,sourcePositions:data.sourcePositions,
   vertices:data.vertices,nearArchVertices:data.nearArchVertices,
   sharedRegistry02894:!!data.unifiedSources,
   packedArcWindow02894:unifiedSources,sourceAttributes:keys.length,
   actualVertexDistanceMask:true,sourcePulseRadiusMeters:lowMemory?3.9:5.6,
   colorFrom:uniform.uA93Old.value.getHex(),
   colorTo:uniform.uA93Next.value.getHex(),
   waveFront:uniform.uA93Front.value,
   strength:uniform.uA93Power.value,lowMemory,
   drawCallsAdded:0,physicalLightsAdded:0,extraRenderPasses:0,
   roadwayAndColliderUntouched:true,straightOnlyEdgesUntouched:true}),
  dispose(){if(disposed)return;disposed=true;
   material.onBeforeCompile=before;material.customProgramCacheKey=key;
   material.needsUpdate=true;
   for(const k of keys)geometry.deleteAttribute(k);
  }
 };
}
// Isolate the *old* additive NEON_ROAD_RESPONSE overlay on identical
// current runtime, strictly opt-in QA. We never delete it by default.
export function diagnosticLegacyRoadOverlay02893(world,{
 enabled=false}={}){
 const items=[];
 if(world?.traverse)world.traverse(m=>{
  if(m?.isMesh&&m.name==="Tunnel / NEON_ROAD_RESPONSE")
   items.push({mesh:m,visible:m.visible});
 });
 if(enabled)for(const {mesh} of items)mesh.visible=false;
 return {count:items.length,suppressed:enabled,
  dispose(){for(const {mesh,visible} of items)mesh.visible=visible;}};
}
