// SKYSHIFT 0.28.2 — Shared Road Reflections & Ship Light Response.
// The actual Skyline 0.26.3 GGX shader/fixture positions are reused on
// the unchanged NEON VAULT deck; source-local 368 m art travels across
// all ten real 0.28.1 modules. No new meshes, colliders, world lights,
// render passes, or handling/GRIP changes.
import {planTrueSharedTunnel0281,adaptSourcePosition0281}
 from "../true-shared-tunnel-renderer-v0281.mjs";
import {nearestRoadFixtures0263,fixturePosition0263,
 installCinematicRoadRebuildShader0263}
 from "../rendering/cinematic-road-rebuild-v0263.mjs";

export const SHARED_LIGHT_0282=Object.freeze({
 version:"0.28.2",title:"Shared Road Reflections & Ship Light Response",
 source:"original Skyline 0.26.3 physical source geometry and shader",
 roadMaterial:"existing indexed MeshStandardMaterial",
 roadSource:"source-local Skyline cyan and amber fixtures",
 shipMaterial:"existing vehicle MeshStandard/Physical hull shaders",
 roadReflectionModel:"original 0.26.3 finite-source native GGX",
 shipLightModel:"bounded colored finite fixtures, local PBR",
 roadComparison:"?sharedRoadLight=classic",
 shipComparison:"?sharedShipLight=classic",
 newRoadMeshes:0,newRoadColliders:0,newWorldLights:0,
 newRoadMaterials:0,newRenderPasses:0,
 changedPhysics:false,changedGrip:false,changedCamera:false,
 changedTrack:false,changedShipGeometry:false,changedOriginalSkyline:false
});
const clamp=(v,low,high)=>Math.max(low,Math.min(high,Number.isFinite(v)?v:low));
const sourceNames=["roadCyanLeft0263","roadCyanRight0263",
 "roadAmberLeft0263","roadAmberRight0263",
 "roadArcTangent0263","roadFixtureMasks0263"];
const disabled=reason=>({active:false,setComparison(){},update(){},
 attachShip(){},stats:()=>({active:false,version:"0.28.2",reason}),dispose(){}});
export function createSharedSourceSampler0282(positionAt,trackLength,modules){
 if(typeof positionAt!=="function"||!(trackLength>0))
  throw Error("0.28.2 needs original banked positionAt and track length");
 modules=modules??planTrueSharedTunnel0281(trackLength);
 if(!Array.isArray(modules)||modules.some((m,i)=>m.index!==i||
  !Number.isFinite(m.start)||!Number.isFinite(m.end)||m.start<0||
  m.end>trackLength||m.end<=m.start||(i>0&&m.start<modules[i-1].end)||
  !(m.scale>0)||!(m.sourceMeters>0)))throw Error("EF05 invalid source module plan");
 const count=modules.length,meters=trackLength/count;
 const fullCourse=count>0&&modules[0].start===0&&modules[count-1].end===trackLength&&
  modules.every((m,i)=>i===0||m.start===modules[i-1].end);
 const uniform=fullCourse&&modules.every((m,i)=>m.start===i*meters);
 const atModule=modules.map(m=>adaptSourcePosition0281(positionAt,m));
 const localFor=s=>{
  if(!Number.isFinite(s))throw Error("0.28.2 source requires finite distance");
  const d=clamp(s,0,trackLength-1e-6);
  const index=uniform?Math.min(count-1,Math.floor(d/meters)):
   modules.findIndex(m=>d>=m.start&&d<m.end);
  if(index<0)return null;
  const module=modules[index],sourceS=(d-module.start)/module.scale;
  const originalPosition=atModule[index];
  return {index,module,s:sourceS,at:originalPosition};
 };
 const physical=(local,warm,side,s)=>
  fixturePosition0263(s,side,warm,local.at,false);
 const nearest=s=>{
  const local=localFor(s);
  if(!local)return {local:null,fixtures:{cyan:null,amber:null,cyanWeight:0,amberWeight:0},
   cyanLeft:[0,0,0],cyanRight:[0,0,0],amberLeft:[0,0,0],amberRight:[0,0,0]};
  const fixtures=nearestRoadFixtures0263(local.s);
  const world=(type,side)=>{
   const part=type==="cyan"?fixtures.cyan:fixtures.amber;
   return part?physical(local,type==="amber",side,part.s):[0,0,0];
  };
  return {local,fixtures,cyanLeft:world("cyan",-1),
   cyanRight:world("cyan",1),amberLeft:world("amber",-1),
   amberRight:world("amber",1)};
 };
 return Object.freeze({modules,localFor,nearest,trackLength,fullCourse});
}
export function buildSharedRoadSourceData0282(geometry,positionAt,trackLength,source=createSharedSourceSampler0282(positionAt,trackLength)){
 const coord=geometry?.getAttribute?.("aTrackCoord"),
  pos=geometry?.getAttribute?.("position");
 if(!coord||!pos||coord.count!==pos.count)
  throw Error("0.28.2 requires the existing indexed banked deck");
 if(source.trackLength!==trackLength)throw Error("EF05 source track length mismatch");
 const count=coord.count,vectors={};
 for(const name of sourceNames)
  vectors[name]=new Float32Array(count*(name==="roadFixtureMasks0263"?2:3));
 const cache=new Map(),at=(s)=>source.localFor(s);
 let litCount=0;
 for(let i=0;i<count;i++){
  const s=coord.getX(i),local=at(s);
  const sa=clamp(s-.7,0,trackLength),sb=clamp(s+.7,0,trackLength);
  const p0=positionAt(sa,0,0),p1=positionAt(sb,0,0);
  const dx=p1.x-p0.x,dy=p1.y-p0.y,dz=p1.z-p0.z;
  const length=Math.hypot(dx,dy,dz);
  if(length<.0001||!Number.isFinite(length))
   throw Error("0.28.2 nonfinite 3D road tangent");
  vectors.roadArcTangent0263.set([dx/length,dy/length,dz/length],3*i);
  if(!local)continue;
  const f=nearestRoadFixtures0263(local.s);
  for(const [name,type,side] of [
   ["roadCyanLeft0263","cyan",-1],["roadCyanRight0263","cyan",1],
   ["roadAmberLeft0263","amber",-1],["roadAmberRight0263","amber",1]]){
   const part=type==="cyan"?f.cyan:f.amber;
   if(!part)continue;
   const key=local.index+":"+part.s.toFixed(3)+":"+type+":"+side;
   let p=cache.get(key);
   if(!p){
    p=fixturePosition0263(part.s,side,type==="amber",local.at,false);
    cache.set(key,p);
   }
   vectors[name].set(p,3*i);
  }
  vectors.roadFixtureMasks0263.set([f.cyanWeight,f.amberWeight],2*i);
  if(f.cyanWeight>.04||f.amberWeight>.04)litCount++;
 }
 return {vectors,count,litCount,sourcePositions:cache.size,
  modules:source.modules.length,source};
}
export function installSharedRoadReflections0282(THREE,world,{
 enabled=false,positionAt,trackLength,lowMemory=false,sourceSampler=null
}={}){
 if(!enabled)return disabled("inactive");
 const road=world?.getObjectByName?.("Zone Ribbon · integrated PBR racing deck");
 if(!THREE?.Float32BufferAttribute||!road?.material?.isMeshStandardMaterial||
  !road?.geometry?.getAttribute?.("aTrackCoord"))
  return disabled("native PBR racing deck missing");
 const geo=road.geometry,keys=[];
 let restore=null;
 try{
  const sampler=sourceSampler??createSharedSourceSampler0282(positionAt,trackLength);
  if(!sampler.modules.length)return disabled("no tunnel sources");
  // Merge adjacent art modules: only tunnel entrances/exits fade,
  // never the seams between source modules.
  const sections=[];
  if(!sampler.fullCourse)for(const m of sampler.modules){
   const last=sections.at(-1);
   if(last&&Math.abs(last.end-m.start)<1e-8)last.end=m.end;
   else sections.push({start:m.start,end:m.end});
  }
  const data=buildSharedRoadSourceData0282(geo,positionAt,trackLength,sampler);
  if(sourceNames.some(n=>geo.getAttribute(n)))
   throw Error("0.28.2 legacy GGX road already attached");
  for(const n of sourceNames){
   geo.setAttribute(n,new THREE.Float32BufferAttribute(data.vectors[n],
    n==="roadFixtureMasks0263"?2:3));
   keys.push(n);
  }
  const gain={value:1};
  // Reuses the exact Skyline 0.26.3 RE_Direct GGX shader; the fullTunnel
  // adapter only removes Skyline's original 368m hard-coded fade.
  restore=installCinematicRoadRebuildShader0263(road.material,gain,{
   mobile:lowMemory,fullTunnel:true,...(sampler.fullCourse?{}:{sections})
  });
  return {active:true,setComparison:v=>gain.value=clamp(v,0,1),
   update(){},
   stats:()=>({active:true,version:"0.28.2",
    roadOriginalNativeGGX:true,roadFullLengthMeters:trackLength,
    sectionAwareExteriorSeal:!sampler.fullCourse,
    sourceModules:data.modules,sourceVertices:data.count,
    litVertices:data.litCount,fixtureCachePositions:data.sourcePositions,
    cyanSamples:lowMemory?2:4,amberSamples:lowMemory?1:2,
    originalShader:"patchCinematicRoadRebuild0263",
    originalRoadMeshReused:true,originalRailsUntouched:true,
    originalCollidersUntouched:true,physicsUntouched:true,
    gripUntouched:true,lowMemory:!!lowMemory,
    strength:gain.value,addedDrawCalls:0,addedLights:0,
    addedRenderPasses:0}),
   dispose(){restore?.();for(const n of keys)geo.deleteAttribute(n);}
  };
 }catch(error){
  restore?.();for(const n of keys)geo.deleteAttribute(n);
  console.warn("0.28.2 shared road GGX fallback:",error);
  return disabled("road original physical GGX install failed: "+String(error?.message));
 }
}
const OMIT_HULL=/glass|canopy|cockpit|turbine|nacelle|thruster|engine|seam|light|neon|glow|plume|wake|nozzle|shadow|trail|spark/i;
export function patchSharedShipHull0282(fragment){
 const common="#include <common>",lights="#include <lights_fragment_end>";
 if(!fragment.includes(common)||!fragment.includes(lights)||
    !fragment.includes("#include <lights_physical_fragment>"))
  throw Error("0.28.2 requires original physical ship hull PBR");
 const decl=[
  "uniform vec3 u282CyanLeft,u282CyanRight,u282AmberLeft,u282AmberRight;",
  "uniform vec2 u282SourceWeight;",
  "uniform float u282HullStrength;"
 ].join("\n");
 const one=(name,kind,scale)=>{
  const col=kind==="cyan"?"vec3(0.030,0.51,0.77)":"vec3(0.88,0.29,0.064)";
  const weight=kind==="cyan"?"u282SourceWeight.x":"u282SourceWeight.y";
  return [
   "{",
   " vec3 v282Delta=(viewMatrix*vec4(u282"+name+",1.0)).xyz-geometryPosition;",
   " float v282Distance=length(v282Delta);",
   " IncidentLight v282Lamp;",
   " v282Lamp.visible=true;",
   " v282Lamp.direction=normalize(v282Delta+vec3(0.00001));",
   " float v282Fall=1.0/(1.0+pow(v282Distance/22.0,2.0));",
   " v282Lamp.color="+col+"*("+scale+"*v282Fall*"+weight+"*u282HullStrength);",
   " RE_Direct(v282Lamp,geometryPosition,geometryNormal,geometryViewDir,",
   "  geometryClearcoatNormal,material,reflectedLight);",
   "}"
  ].join("\n");
 };
 const source=[
  "// Source-limited COLORED light only. Never restore the exterior white key.",
  "if(u282HullStrength>0.0001){",
  one("CyanLeft","cyan","1.18"),
  one("CyanRight","cyan","1.18"),
  one("AmberLeft","amber","0.66"),
  one("AmberRight","amber","0.66"),
  // Tiny source-limited colored outline response; no flat gray/white fill.
  " totalEmissiveRadiance+=",
  "  (vec3(0.013,0.095,0.135)*u282SourceWeight.x+",
  "   vec3(0.080,0.023,0.003)*u282SourceWeight.y)*",
  "  (0.32*u282HullStrength);",
  "}"
 ].join("\n");
 return fragment.replace(common,common+"\n"+decl)
  .replace(lights,lights+"\n"+source);
}
export function installSharedShipLight0282(THREE,{
 enabled=false,positionAt,trackLength,lowMemory=false,sourceSampler=null
}={}){
 if(!enabled)return disabled("inactive");
 if(!THREE?.Vector3||!THREE?.Color||typeof positionAt!=="function")
  return disabled("ship source prerequisites absent");
 const sampler=sourceSampler??createSharedSourceSampler0282(positionAt,trackLength);
 if(sampler.trackLength!==trackLength)throw Error("EF05 source track length mismatch");
 const cyanLeft={value:new THREE.Vector3()},cyanRight={value:new THREE.Vector3()},
  amberLeft={value:new THREE.Vector3()},amberRight={value:new THREE.Vector3()},
  weights={value:new THREE.Vector2(0,0)},strength={value:1};
 const uniforms={u282CyanLeft:cyanLeft,u282CyanRight:cyanRight,
  u282AmberLeft:amberLeft,u282AmberRight:amberRight,
  u282SourceWeight:weights,u282HullStrength:strength};
 const wrapped=new WeakSet(),undo=[];let attached=0,updates=0,lastS=0;
 function detachShip(){
  for(const entry of undo.splice(0).reverse()){entry.restore();wrapped.delete(entry.material);}
  attached=0;
 }
 function attachShip(ship){
  if(!ship?.traverse)return 0;
  let count=0;
  ship.traverse(mesh=>{
   if(!mesh?.isMesh||OMIT_HULL.test(mesh.name||""))return;
   const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   for(const material of materials){
    if(!material?.color||
     (!material.isMeshStandardMaterial&&!material.isMeshPhysicalMaterial)||
     wrapped.has(material))continue;
    wrapped.add(material);
    const previous=material.onBeforeCompile,key=material.customProgramCacheKey;
    material.onBeforeCompile=function(shader,renderer){
     previous?.call(this,shader,renderer);
     shader.fragmentShader=patchSharedShipHull0282(shader.fragmentShader);
     Object.assign(shader.uniforms,uniforms);
    };
    material.customProgramCacheKey=function(){
     return (key?.call(this)||"")+"-shared-ship-0282-"+(lowMemory?"4gb":"high");
    };
    material.needsUpdate=true;
    count++;attached++;
    undo.push({material,restore(){material.onBeforeCompile=previous;
     material.customProgramCacheKey=key;material.needsUpdate=true;}});
   }
  });
  return count;
 }
 function update(distance){
  const s=((Number.isFinite(distance)?distance:0)%trackLength+trackLength)%trackLength;
  const sample=sampler.nearest(s);
  for(const [uniform,p] of [
   [cyanLeft,sample.cyanLeft],[cyanRight,sample.cyanRight],
   [amberLeft,sample.amberLeft],[amberRight,sample.amberRight]
  ])uniform.value.set(...p);
  weights.value.set(clamp(sample.fixtures.cyanWeight,0,1),
   clamp(sample.fixtures.amberWeight,0,1));
  updates++;lastS=s;
 }
 return {active:true,attachShip,detachShip,update,
  setComparison:v=>strength.value=clamp(v,0,1),
  stats:()=>({active:true,version:"0.28.2",sourceModules:sampler.modules.length,
   physicalHullMaterials:attached,updates,lastS,
   sourceWeights:{cyan:weights.value.x,amber:weights.value.y},
   strength:strength.value,sourceLightColor:"cyan+amber only",
   existingShipMeshReused:true,originalShipPoseUnchanged:true,
   whiteLightUnchanged:true,worldLightsAdded:0,
   graphicsPassesAdded:0,physicsUntouched:true,gripUntouched:true,
   lowMemory:!!lowMemory}),
  dispose:detachShip
 };
}
