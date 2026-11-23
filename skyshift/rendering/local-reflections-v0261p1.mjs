// SKYSHIFT 0.26.1 — True Local Reflections · Pass 1.
// Finite, explicitly authored cyan cove / amber practical emitters integrated
// into the existing MeshPhysicalMaterial GGX lighting; no global light or sky.
// Retains Unified Tunnel Lighting 1.0 and physical-metal Pass 2 exactly.
import {installTrueMetalMaterialsPass2} from "./true-metal-materials-v0260p2.mjs";
import {TUNNEL_MEGA_0211,TUNNEL_PORTALS_0211} from "../tunnel-megastructure-v0211.mjs";

export const LOCAL_REFLECTIONS_0261=Object.freeze({
 version:"0.26.1",pass:1,id:"finite-local-strip-reflections-0261",
 type:"finite-area multi-sample GGX via native RE_Direct",
 surface:"original MeshPhysicalMaterial raised panel and curved rib coats",
 physicalSources:"existing 20 cyan coves and 20 warm portal companion strips",
 highSamples:{cyan:3,amber:2},lowMemorySamples:{cyan:2,amber:1},
 coldSpanMeters:12.0,warmSpanMeters:2.7,
 inputAttributes:["localStripAxis0261","localStripMasks0261"],
 addedDrawCalls:0,addedMaterials:0,addedLights:0,addedTextures:0,
 addedReflectionProbes:0,addedPostprocessPasses:0,
 noPMREMByDesign:"deferred; global IBL would defeat sealed-metal illumination",
 changesRoad:false,changesRails:false,changesShip:false,
 changesHandling:false,changesGRIP:false,changesCamera:false,
 changesNativeNeon:false,changesSolarSeal:false,
 comparison:"?localReflections=classic"
});
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(v)?v:lo));
const COMMON="#include <common>";
const VERT="#include <worldpos_vertex>";
const MAPS="#include <lights_fragment_maps>";
const ROLES=Object.freeze({panel:"HARDSURFACE_PANELS",rib:"CURVED_RIBS"});
const AXIS="localStripAxis0261",MASKS="localStripMasks0261";
function segmentDistance(s,start,end){
 return Math.max(start-s,0,s-end);
}
export function nearestFixtureMask0261(s,portals=TUNNEL_PORTALS_0211){
 if(!Number.isFinite(s))throw Error("0.26.1 invalid track distance");
 let cold=Infinity,warm=Infinity;
 for(const portal of portals){
  cold=Math.min(cold,segmentDistance(s,portal+2,Math.min(portal+16,367.2)));
  warm=Math.min(warm,segmentDistance(s,portal+2.4,Math.min(portal+5.1,367.1)));
 }
 // Never turn the entire wall into an omnipresent lamp. Reflection
 // influence falls off outside the actually constructed luminous strips.
 return [Math.exp(-Math.pow(cold/7.5,2)),
  Math.exp(-Math.pow(warm/6.0,2))];
}
export function buildLocalStripFrame0261(geometry,positionAt){
 const sAttr=geometry?.getAttribute?.("trackS");
 const section=geometry?.getAttribute?.("neonLocalSection");
 const positions=geometry?.getAttribute?.("position");
 if(!sAttr||!section||!positions||
  sAttr.count!==section.count||positions.count!==sAttr.count||
  typeof positionAt!=="function")
  throw Error("0.26.1 requires original banked tunnel geometry");
 const count=sAttr.count,axis=new Float32Array(count*3),
  masks=new Float32Array(count*2);
 const cache=new Map();
 for(let i=0;i<count;i++){
  const s=clamp(sAttr.getX(i),TUNNEL_MEGA_0211.start,TUNNEL_MEGA_0211.end);
  const side=section.getX(i)<0?-1:1;
  const key=s.toFixed(4)+":"+side;
  let direction=cache.get(key);
  if(!direction){
   const start=positionAt(Math.max(0,s-.9),side*20,19);
   const end=positionAt(Math.min(367.7,s+.9),side*20,19);
   const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z;
   const mag=Math.hypot(dx,dy,dz);
   if(!Number.isFinite(mag)||mag<.001)
    throw Error("0.26.1 degenerate banked luminous strip tangent");
   direction=[dx/mag,dy/mag,dz/mag];
   cache.set(key,direction);
  }
  axis.set(direction,i*3);
  masks.set(nearestFixtureMask0261(s),i*2);
 }
 return {axis,masks,vertices:count,uniqueSamples:cache.size};
}
function localStripBrdfSample0261(source,offset,weight,lightColor,
  reach,amplitude,visibility){
 const p="l261"+source;
 return [
  "{",
  p+".visible=true;",
  p+".direction=normalize("+visibility+"+l261Axis*("+offset.toFixed(2)+")+vec3(0.00001));",
  "float "+p+"Distance=length("+visibility+"+l261Axis*("+offset.toFixed(2)+"));",
  p+".color=vec3("+lightColor+")*(uLocalReflections0261*",
  " l261Relief*l261Mask."+ (source==="Cool"?"x":"y")+"*",
  " "+(weight*amplitude).toFixed(5)+"*exp(-pow("+p+"Distance/"+reach+",2.0)));",
  "RE_Direct("+p+",geometryPosition,geometryNormal,geometryViewDir,",
  " geometryClearcoatNormal,material,reflectedLight);",
  "}"
 ].join("\n");
}
export function patchLocalStripReflectionShader0261(vertex,fragment,
 {role="panel",mobile=false}={}){
 if(!(role in ROLES))throw Error("0.26.1 unsupported real metal role");
 if(!vertex.includes(COMMON)||!vertex.includes(VERT)||
  !fragment.includes(COMMON)||!fragment.includes(MAPS)||
  !fragment.includes("RE_Direct(pbrFixture0260")||
  !fragment.includes("vPbrCold0260")||
  !fragment.includes("vPbrWarm0260"))
  throw Error("0.26.1 needs existing native solar-isolated P2 GGX pipeline");
 const vDecl=[
  "attribute vec3 "+AXIS+";","attribute vec2 "+MASKS+";",
  "varying vec3 vLocalAxis0261;","varying vec2 vLocalMask0261;"
 ].join("\n");
 const vAssign=[
  "vLocalAxis0261=normalize(mat3(viewMatrix)*"+AXIS+");",
  "vLocalMask0261="+MASKS+";"
 ].join("\n");
 const fDecl=[
  "uniform float uLocalReflections0261;",
  "varying vec3 vLocalAxis0261;",
  "varying vec2 vLocalMask0261;"
 ].join("\n");
 const lines=[
  "// SKYSHIFT 0.26.1: finite strips, not world or directional sunlight.",
  "if(uLocalReflections0261>0.001){",
  "vec3 l261Axis=normalize(vLocalAxis0261);",
  "vec2 l261Mask=clamp(vLocalMask0261,0.0,1.0);",
  "float l261Relief="+(role==="rib"?"0.82":"0.92")+";",
  "IncidentLight l261Cool;IncidentLight l261Warm;"
 ];
 // Three desktop cyan quadrature taps integrate a 12m source. Two taps
 // on 4GB reduce cost; contribution is normalized by integration weights.
 const cold=mobile?[[-3.2,.5],[3.2,.5]]:[[-5.5,.27],[0,.46],[5.5,.27]];
 const warm=mobile?[[0,1]]:[[-1.0,.5],[1.0,.5]];
 for(const [offset,weight] of cold)
  lines.push(localStripBrdfSample0261("Cool",offset,weight,
   "0.07,0.64,0.97",mobile?"12.8":"14.4",
   mobile?2.3:3.65,"vPbrCold0260"));
 for(const [offset,weight] of warm)
  lines.push(localStripBrdfSample0261("Warm",offset,weight,
   "1.0,0.36,0.10",mobile?"10.4":"11.6",
   mobile?1.75:2.80,"vPbrWarm0260"));
 lines.push("}");
 return {
  vertexShader:vertex.replace(COMMON,COMMON+"\n"+vDecl)
   .replace(VERT,VERT+"\n"+vAssign),
  fragmentShader:fragment.replace(COMMON,COMMON+"\n"+fDecl)
   .replace(MAPS,lines.join("\n")+"\n"+MAPS)
 };
}
export function installLocalStripShader0261(material,uniforms,opts){
 if(!material?.isMeshPhysicalMaterial||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.26.1 requires native MeshPhysicalMaterial");
 const prior=material.onBeforeCompile;
 const key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  prior.call(this,shader,renderer);
  const result=patchLocalStripReflectionShader0261(
   shader.vertexShader,shader.fragmentShader,opts);
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=result.vertexShader;
  shader.fragmentShader=result.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return key.call(this)+"-local-strip-reflections-0261-"+
   opts.role+(opts.mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=prior;material.customProgramCacheKey=key;
  material.needsUpdate=true;};
}
export function installTrueLocalReflectionsPass1(THREE,world,options={}){
 const base=installTrueMetalMaterialsPass2(THREE,world,options);
 const before=base.stats(),mobile=!!options.lowMemory;
 const fallback=reason=>({...base,
  stats(){return {...base.stats(),localReflections0261Enabled:false,
   localReflections0261Status:reason};},
  setLocalReflectionsComparison(){}
 });
 if(!before.trueMetal0260P2Enabled||!before.trueMetal0260P2NativeGGX||
  !before.trueMetal0260P2SolarSealed)
  return fallback("true-physical-metal-P2-unavailable");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const coats=Object.keys(ROLES).filter(role=>!mobile||role==="panel")
  .map(role=>({role,mesh:group?.children?.find(child=>
   child.name==="SKYSHIFT 0.26.0 P2 / true physical "+role)}));
 if(coats.some(({mesh})=>!mesh?.material?.isMeshPhysicalMaterial||
  !mesh.geometry?.getAttribute?.("trackS")||
  !mesh.geometry?.getAttribute?.("neonLocalSection")))
  return fallback("original-physical-metal-coats-unavailable");
 const power={value:1},uniforms={uLocalReflections0261:power};
 const installed=[];let vertexCount=0;
 try{
  for(const {role,mesh} of coats){
   const data=buildLocalStripFrame0261(mesh.geometry,options.positionAt);
   mesh.geometry.setAttribute(AXIS,new THREE.Float32BufferAttribute(data.axis,3));
   mesh.geometry.setAttribute(MASKS,new THREE.Float32BufferAttribute(data.masks,2));
   const restore=installLocalStripShader0261(mesh.material,uniforms,{role,mobile});
   installed.push({mesh,restore});
   vertexCount+=data.vertices;
  }
 }catch(error){
  for(const {mesh,restore} of installed){
   restore();mesh.geometry.deleteAttribute(AXIS);
   mesh.geometry.deleteAttribute(MASKS);
  }
  console.warn("SKYSHIFT 0.26.1 P1 preserving original P2 materials",error);
  return fallback("local-strip-build-failed");
 }
 const flags={
  localReflections0261Enabled:true,localReflections0261Status:"active",
  localReflections0261Version:"0.26.1",localReflections0261Pass:1,
  localReflections0261RealPhysicalGGX:true,
  localReflections0261FiniteStrips:true,
  localReflections0261SunIsolated:true,
  localReflections0261KeepUnifiedTunnelLighting:true,
  localReflections0261LocalMaterials:coats.length,
  localReflections0261Vertices:vertexCount,
  localReflections0261HighSamples:mobile?3:5,
  localReflections0261Mobile:mobile,
  localReflections0261AddedDrawCalls:0,
  localReflections0261AddedDynamicLights:0,
  localReflections0261AddedTextureMaps:0,
  localReflections0261AddedRenderPasses:0,
  localReflections0261ChangesRoad:false,
  localReflections0261ChangesShip:false,
  localReflections0261ChangesGRIP:false,
  localReflections0261ChangesNativeNeon:false
 };
 return {...base,
  stats(){return {...base.stats(),...flags,
   version:"0.26.1",localReflections0261Strength:power.value};},
  setLocalReflectionsComparison(v){
   power.value=clamp(v,0,1);
  },
  dispose(){
   for(const {mesh,restore} of installed){
    restore();mesh.geometry.deleteAttribute(AXIS);
    mesh.geometry.deleteAttribute(MASKS);
   }
   base.dispose?.();
  }
 };
}
