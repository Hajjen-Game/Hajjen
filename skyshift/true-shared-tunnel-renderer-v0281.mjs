// SKYSHIFT 0.28.1 — True Shared Tunnel Renderer.
// Reuse the ACTUAL approved Skyline material/geometry/light installer on
// banked sections of any course. No separately sculpted Vault look-alike.
// The original 368m source is authored once and parameterized by the
// positionAt adapter. Road, rails, ship, GRIP and flight data are untouched.
import {installPremiumMetalSurfaceLibrary}
 from "./premium-metal-surface-v0262.mjs";
import {installUnifiedMetalLighting02641}
 from "./unified-metal-light-response-v02641.mjs";

export const TRUE_SHARED_RENDERER_0281=Object.freeze({
 version:"0.28.1",id:"skyline-original-renderer",
 reference:"Skyline 0.26.5",sourceLength:368,
 renderer:"installPremiumMetalSurfaceLibrary",
 sharedGeometry:true,sharedFixtureGeometry:true,sharedShaders:true,
 sharedMaterialAtlas:true,independentTrackSampler:true,
 changesRoad:false,changesRails:false,changesShip:false,
 changesFlight:false,changesGrip:false,addsColliders:0,
 comparison:"?trueSharedRenderer=classic"
});

const isFinitePositive=x=>Number.isFinite(x)&&x>0;
// Balanced source modules avoid a tiny last sliver, while preserving the
// original 368m authored profile, emitter positions, structural cutouts,
// materials and GGX shader pipeline INSIDE each module.
export function planTrueSharedTunnel0281(length,{sourceMeters=368}={}){
 if(!isFinitePositive(length)||!isFinitePositive(sourceMeters))
  throw Error("0.28.1 finite source and course length required");
 const count=Math.ceil(length/sourceMeters);
 if(count>512)throw Error("0.28.1 unreasonable module budget");
 const meters=length/count;
 return Object.freeze(Array.from({length:count},(_,index)=>
  Object.freeze({index,start:index*meters,
   end:index===count-1?length:(index+1)*meters,
   meters:index===count-1?length-index*meters:meters,
   sourceMeters,scale:meters/sourceMeters})
 ));
}
export function adaptSourcePosition0281(positionAt,module){
 if(typeof positionAt!=="function"||!module||
  !isFinitePositive(module.sourceMeters)||!isFinitePositive(module.meters))
  throw Error("0.28.1 requires a banked track sampler and valid module");
 return (s,lateral,height)=>{
  if(!Number.isFinite(s)||s<-.00001||s>module.sourceMeters+.00001)
   throw Error("0.28.1 source distance outside module");
  // Transforms original art-local metres to this course's own arc.
  // A track may bank, twist and turn freely; no mesh-space shortcuts.
  const arc=module.start+Math.max(0,Math.min(module.sourceMeters,s))*
   module.meters/module.sourceMeters;
  return positionAt(arc,lateral,height);
 };
}
const inactive=reason=>Object.freeze({active:false,
 stats:()=>({active:false,version:"0.28.1",reason}),
 updateWave(){},dispose(){}});
export function installTrueSharedTunnelRenderer0281(THREE,world,{
 track,positionAt,trackLength,lowMemory=false,enabled=false
}={}){
 if(!enabled||track!=="vault")return inactive("inactive");
 if(!THREE?.Group||!world?.add||typeof positionAt!=="function")
  throw Error("0.28.1 needs original Three/world/banked track sampler");
 const modules=planTrueSharedTunnel0281(trackLength);
 const root=new THREE.Group();
 root.name="SKYSHIFT · TRUE shared Skyline tunnel 0.28.1";
 const installed=[];
 // The original Skyline renderer owns EVERY panel, rib, bay, cove and
 // source-local metallic shader. Do not call the 0.27.x Vault pipeline here.
 try{
  for(const module of modules){
   const section=new THREE.Group();
   section.name="SKYLINE SOURCE / Vault "+module.index;
   root.add(section);
   const source=installPremiumMetalSurfaceLibrary(THREE,section,{
    track:"skyline",positionAt:adaptSourcePosition0281(positionAt,module),
    lowMemory,roadMaterial:null,vaultHeightClassic:false
   });
   const result=source.stats?.()??{};
   if(!result.premiumMetal0262Enabled||
    !result.localReflections0261Enabled||!result.trueMetal0260P2NativeGGX||
    !result.structuralEnabled)
    throw Error("source renderer failed in section "+module.index+
     ": "+JSON.stringify({status:result.status,
      premium:result.premiumMetal0262Status,
      reflections:result.localReflections0261Status,
      structural:result.structuralStatus}));
   installed.push({source,section,module,metal:null});
   const metal=installUnifiedMetalLighting02641(THREE,section,source,{
    enabled:true,lowMemory
   });
   installed[installed.length-1].metal=metal;
   if(!metal.active)
    throw Error("source unified metallic response failed in section "+module.index);
  }
  world.add(root);
 }catch(error){
  for(const item of installed.reverse()){
   item.metal?.dispose?.();
   item.source?.dispose?.();
  }
  root.removeFromParent();
  // The caller falls back to the complete original Vault renderer,
  // never leaving a partial or overlaid shared scene visible.
  console.warn("SKYSHIFT 0.28.1 original renderer fallback",error);
  return inactive("original renderer not ready: "+String(error?.message||error));
 }
 let disposed=false;
 return Object.freeze({
  active:true,
  updateWave(wave){for(const item of installed)item.source.updateWave?.(wave);},
  stats(){return {
   active:true,version:"0.28.1",track,
   trueSharedSource:"Skyline 0.26.5 real installer",
   actualRenderer:TRUE_SHARED_RENDERER_0281.renderer,
   originalGeometryAndFixtureAuthoring:true,
   commonGGX:true,commonMetalAndLocalResponse:true,
   sourceModules:modules.length,coverageMeters:trackLength,
   moduleMeters:modules[0]?.meters??0,lowMemory:!!lowMemory,
   physicalModules:installed.filter(x=>
    x.source.stats?.().trueMetal0260P2NativeGGX).length,
   commonResponseModules:installed.filter(x=>x.metal.active).length,
   originalTrackUntouched:true,originalPhysicsUntouched:true,
   originalShipUntouched:true,originalGripUntouched:true,
   legacyVaultRendererUsed:false
  };},
  dispose(){
   if(disposed)return;disposed=true;
   for(const item of installed.reverse()){
    item.metal?.dispose?.();item.source?.dispose?.();
   }
   root.removeFromParent();
  }
 });
}
