// SKYSHIFT 0.28.4 — PMREM Reflection Pipeline 1.0
// A REAL one-time Three.js PMREMGenerator.fromScene capture of the existing
// Neon Vault fixtures and geometry. This is NOT RoomEnvironment, an AI
// illustration, or a painted reflection overlay. Single probe at 110 m:
// deliberately a low-strength static first pass; it does not pretend to
// track all bends over the 3400 m circuit.
// Original 0.26.x local GGX, 0.28.2 road/ship lights, 0.28.3 boosts and the
// race/GRIP simulation retain their actual source of truth.
export const PMREM_0284=Object.freeze({
 version:"0.28.4",name:"PMREM Reflection Pipeline 1.0",
 capture:"THREE.PMREMGenerator.fromScene(active VAULT scene, static source at 110m)",
 pmremEnvironment:"one genuine GGX-filtered scene radiance texture",
 enabledOnly:"Vault v0.28.4+ & ?pmrem!=off",
 compare:"?pmrem=off",sourceTrack:"vault",
 probeMeters:110,nearMeters:0.4,farMeters:55,
 target:"original Skyline native MeshPhysicalMaterial tunnel coats + ship PBR hull",
 excludes:"road, emissive neon, boost arrows, glass and scene.environment",
 changesPhysics:false,changesGrip:false,changesTrack:false,
 changesShips:false,changesRoad:false,changesBoost:false,
 changesBloom:false,changesWorldLights:false,newSceneLights:0,
 addedMeshes:0,addedDrawCalls:0,newFramePasses:0,
 capturesOnStart:1,updatesEachFrame:0,skylineUnchanged:true
});
const excludedHull=/glass|canopy|cockpit|turbine|nacelle|thruster|engine|seam|light|neon|glow|plume|wake|nozzle|shadow|trail|spark|glass/i;
const isPhysical=m=>!!(m?.isMeshPhysicalMaterial||m?.isMeshStandardMaterial);
const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export function readPmremRelease0284(search){
 const params=new URLSearchParams(search||"");
 if(params.get("track")!=="vault")return false;
 const v=/^(\d+)\.(\d+)\.(\d+)(?:\.\d+)?$/.exec(params.get("v")||"");
 if(!v)return false;
 const [major,minor,patch]=v.slice(1).map(Number);
 return major>0||minor>28||(minor===28&&patch>=4);
}
// Explicit mounted route data is the new shared renderer contract. Historic
// callers retain the original Vault plan without introducing name checks
// into the actual configured capture path.
export function planConfiguredPmremEF05({track,enabled=false,lowMemory=false,
 trackLength,modules,captureAtMeters=PMREM_0284.probeMeters}={}){
 if(!Number.isFinite(trackLength)||trackLength<=0||!Array.isArray(modules)||
  modules.some((m,i)=>!Number.isFinite(m.start)||!Number.isFinite(m.end)||
   m.start<0||m.end<=m.start||m.end>trackLength||
   (i>0&&m.start<modules[i-1].end-1e-8)))
  throw Error("EF05 PMREM requires valid mounted tunnel modules");
 const intervals=[];
 for(const m of modules){
  const last=intervals.at(-1);
  if(last&&Math.abs(last.end-m.start)<1e-8)last.end=m.end;
  else intervals.push({start:m.start,end:m.end});
 }
 const fullCourse=intervals.length===1&&intervals[0].start===0&&intervals[0].end===trackLength;
 const safe=intervals.find(m=>captureAtMeters>m.start&&captureAtMeters<m.end);
 const longest=intervals.reduce((a,b)=>!a||b.end-b.start>a.end-a.start?b:a,null);
 const probe=safe?captureAtMeters:longest?(longest.start+longest.end)/2:0;
 const original=planPmrem0284({track:"vault",versionActive:true,lowMemory,trackLength});
 return Object.freeze({...original,track,enabled:!!enabled&&intervals.length>0,
  captureAtMeters:probe,captureCount:enabled&&intervals.length?1:0,
  fullCourse,intervals:Object.freeze(intervals.map(Object.freeze)),configured:true,
  minimumTunnelMaterials:Math.min(10,modules.length)});
}
export function planPmrem0284({track="vault",versionActive=false,
 lowMemory=false,mode="on",trackLength=3400}={}){
 const enabled=track==="vault"&&versionActive&&mode!=="off"&&
  mode!=="classic"&&Number.isFinite(trackLength)&&trackLength>110;
 return Object.freeze({
  enabled,version:"0.28.4",track,
  // A real 128px low-memory probe is verified on the actual WebGL driver.
  // No 4GB render-loop captures, only one setup capture.
  faceSize:lowMemory?128:256,
  captureAtMeters:PMREM_0284.probeMeters,
  nearMeters:PMREM_0284.nearMeters,
  farMeters:PMREM_0284.farMeters,
  tunnelStrength:lowMemory?.25:.40,
  shipStrength:lowMemory?.24:.38,
  trackLength,lowMemory:!!lowMemory,
  applyRoad:false,applyBackground:false,
  captureCount:enabled?1:0
 });
}
const inactive=reason=>({
 active:false,attachShip(){return 0;},setComparison(){},updateStation(){},
 stats:()=>({active:false,version:"0.28.4",reason}),
 dispose(){}
});
export function installPmremReflectionPipeline0284(THREE,renderer,scene,world,{
 enabled=false,track="vault",lowMemory=false,trackLength=3400,
 positionAt,ship=null,tunnel=null
}={}){
 if(!enabled)return inactive("release disabled");
 if(tunnel&&!tunnel.active)return inactive("configured shared tunnel inactive");
 const plan=tunnel?planConfiguredPmremEF05({track,enabled,lowMemory,trackLength,
  modules:tunnel.modules}):planPmrem0284({track,versionActive:enabled,lowMemory,trackLength});
 if(!plan.enabled)return inactive("release disabled or no tunnel sections");
 const root=tunnel?tunnel.root:world?.getObjectByName?.(
  "SKYSHIFT · TRUE shared Skyline tunnel 0.28.1");
 if(!THREE?.PMREMGenerator||!renderer?.render||!scene?.traverse||
  !root?.traverse||typeof positionAt!=="function")
  return inactive("real shared original geometry or renderer unavailable");
 let target=null,generator=null,strength=1,shipRouteWeight=1,disposed=false,
  physicalTunnel=0,physicalShip=0,attached=0;
 const restores=[],bound=new WeakSet();
 const bind=(material,profile)=>{
  if(!isPhysical(material)||bound.has(material))return false;
  bound.add(material);
  const previous={map:material.envMap,intensity:material.envMapIntensity};
  const value=profile==="tunnel"?plan.tunnelStrength:plan.shipStrength;
  material.envMap=target.texture;
  material.envMapIntensity=value*strength*(profile==="ship"?shipRouteWeight:1);
  material.needsUpdate=true;attached++;
  if(profile==="tunnel")physicalTunnel++;else physicalShip++;
  restores.push({material,previous,value,profile});
  return true;
 };
 const attachShip=craft=>{
  if(!craft?.traverse||disposed||!target)return 0;
  let count=0;
  craft.traverse(mesh=>{
   if(!mesh?.isMesh||excludedHull.test(mesh.name||""))return;
   const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   for(const m of mats)
    if(isPhysical(m)&&m.metalness>=.12&&bind(m,"ship"))count++;
  });
  return count;
 };
 try{
  // Capture the ACTUAL source tunnel and fixtures, not synthetic area lights.
  // The capture must not include the player's own ship or external WHITE
  // sky/key/fill: those were precisely the previously fixed spill problems.
  const p=positionAt(plan.captureAtMeters,0,12);
  if(![p.x,p.y,p.z].every(Number.isFinite))
   throw Error("PMREM source capture location not finite");
  const previousBackground=scene.background,previousFog=scene.fog,
   previousShipVisible=ship?.visible;
  const dimmed=[];
  try{
   scene.background=new THREE.Color(0x000000);
   scene.fog=null;
   if(ship)ship.visible=false;
   scene.traverse(obj=>{
    if((obj.isHemisphereLight||obj.isDirectionalLight)&&
     typeof obj.intensity==="number"){
     dimmed.push([obj,obj.intensity]);obj.intensity=0;
    }
   });
   generator=new THREE.PMREMGenerator(renderer);
   target=generator.fromScene(scene,0,plan.nearMeters,
    plan.farMeters,{
     size:plan.faceSize,
     position:new THREE.Vector3(p.x,p.y,p.z)
    });
   if(!target?.texture)throw Error("PMREMGenerator produced no real radiance map");
  }finally{
   for(const [light,intensity] of dimmed)light.intensity=intensity;
   scene.background=previousBackground;
   scene.fog=previousFog;
   if(ship)ship.visible=previousShipVisible;
   generator?.dispose();generator=null;
  }
  // Restrict IBL to original native physically reflective Skyline coats.
  // Do not touch graphite Basic substrates, cyan Basic emitters, boost
  // chevrons, the indexed road or scene.environment.
  root.traverse(mesh=>{
   if(!mesh?.isMesh||!isPhysical(mesh.material))return;
   const material=mesh.material;
   // Original Skyline metallic coats are transparent ADDITIVE native
   // MeshPhysicalMaterials over graphite. Their transparency is intentional;
   // excluding them would disable PMREM on the actual source panels!
   if(material.metalness<.20||material.opacity<.12)return;
   bind(material,"tunnel");
  });
  attachShip(ship);
  if(physicalTunnel<(plan.minimumTunnelMaterials??10)||physicalShip<1)
   throw Error("PMREM did not bind the expected real tunnel + PBR hull");
 }catch(error){
  for(const {material,previous} of restores.reverse()){
   material.envMap=previous.map;
   material.envMapIntensity=previous.intensity;
   material.needsUpdate=true;
  }
  target?.dispose();generator?.dispose();
  console.warn("SKYSHIFT PMREM 0.28.4 preserving classic:",error);
  return inactive("capture/bind fallback: "+String(error?.message||error));
 }
 const applyStrength=()=>{
  for(const item of restores)
   item.material.envMapIntensity=item.value*strength*(item.profile==="ship"?shipRouteWeight:1);
 };
 const setComparison=value=>{strength=clamp(value);applyStrength();};
 const updateStation=s=>{
  if(!plan.configured||plan.fullCourse||disposed)return;
  const interval=plan.intervals.find(m=>s>=m.start&&s<=m.end);
  const fade=interval?Math.min(12,(interval.end-interval.start)/2):1;
  const t=interval?clamp(Math.min(s-interval.start,interval.end-s)/fade):0;
  const next=t*t*(3-2*t);
  if(next===shipRouteWeight)return;
  shipRouteWeight=next;
  // Only the hull changes at entrances; no new PMREM capture.
  for(const item of restores)if(item.profile==="ship")
   item.material.envMapIntensity=item.value*strength*shipRouteWeight;
 };
 return {
  active:true,attachShip,setComparison,updateStation,
  stats:()=>({
   active:true,version:"0.28.4",track,
   genuinePmrem:true,
   method:"PMREMGenerator.fromScene",source:"live original Skyline-shaped Vault",
   configuredRoute:!!plan.configured,shipRouteWeight,
   probeMeters:plan.captureAtMeters,faceSize:plan.faceSize,
   nearMeters:plan.nearMeters,farMeters:plan.farMeters,
   tunnelMaterials:physicalTunnel,shipMaterials:physicalShip,
   materialsBound:attached,lowMemory:plan.lowMemory,
   strength,tunnelIntensity:plan.tunnelStrength*strength,
   shipIntensity:plan.shipStrength*strength*shipRouteWeight,
   staticProbe:true,updatesEachFrame:0,
   addedLights:0,addedMeshes:0,addedDrawCalls:0,
   fullTrackDynamicProbe:false,roadTouched:false,boostTouched:false,
   sourceLocalGGXPreserved:true,shipLocalLightPreserved:true,
   whiteExternalKeyUnchanged:true,
   originalPhysicsUntouched:true,originalGripUntouched:true
  }),
  dispose(){
   if(disposed)return;disposed=true;
   for(const {material,previous} of restores.reverse()){
    material.envMap=previous.map;
    material.envMapIntensity=previous.intensity;
    material.needsUpdate=true;
   }
   target?.dispose();
  }
 };
}
