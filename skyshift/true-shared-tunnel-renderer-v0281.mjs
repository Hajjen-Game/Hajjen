// SKYSHIFT 0.28.1 — True Shared Tunnel Renderer.
// Reuse the ACTUAL approved Skyline material/geometry/light installer on
// banked sections of any course. No separately sculpted Vault look-alike.
// The original 368m source is authored once and parameterized by the
// positionAt adapter. Road, rails, ship, GRIP and flight data are untouched.
import {installPremiumMetalSurfaceLibrary}
 from "./premium-metal-surface-v0262.mjs";
import {vaultSpatialWaveEnabled0285,installVaultSpatialWaveModule0285}
 from "./vault-spatial-wave-parity-v0285.mjs";
import {reflectionStabilityEnabled0286,installReflectionStability0286}
 from "./reflection-stability-strips-v0286.mjs";
import {archFootRelease0287,installArchFootAssembly0287}
 from "./arch-foot-light-assembly-v0287.mjs";
import {precisionNeonEnabled0288,installPrecisionNeon0288}
 from "./precision-neon-response-v0288.mjs";
import {cinematicMetalEnabled0289,installCinematicTunnel0289}
 from "./cinematic-metal-neon-v0289.mjs";
import {installUnifiedMetalLighting02641}
 from "./unified-metal-light-response-v02641.mjs";
import {wrapFinishShader02642}
 from "./reflection-cohesion-v02642.mjs";
import {wrapFixtureMaterial02643}
 from "./unified-fixture-transport-v02643.mjs";
import {wrapShader0265}
 from "./true-rail-wall-response-v0265.mjs";
import {createLowerEdgeSources02632,createConnectedFootBands02632}
 from "./edge-source-floor-bands-v02632.mjs";
import {straightParityEnabled02891,buildVaultStraightEmitters02891,
 vaultStraightRanges02891} from "./shared-straight-edge-parity-v02891.mjs";

export const TRUE_SHARED_RENDERER_0281=Object.freeze({
 version:"0.28.1",id:"skyline-original-renderer",
 reference:"Skyline 0.26.5",sourceLength:368,
 renderer:"installPremiumMetalSurfaceLibrary",
 sharedGeometry:true,sharedFixtureGeometry:true,sharedShaders:true,
 sharedAtlasGenerator:true,independentTrackSampler:true,
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
// Apply the unchanged original Skyline 0.26.4.2/0.26.4.3/0.26.5
// FINISH functions to its actual 0.26.2 mesh/shader objects. The rest
// of those releases modifies Skyline's road/rails and is NOT duplicated
// on Vault: the existing racing deck and collision rails stay independent.
export function finishOriginalSourceMaterials0281(THREE,section,lowMemory,
 positionAt,{module=null,straightOnly=false,straightRanges=null}={}){
 const group=section.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
 if(!group)throw Error("0.28.1 original 0.21.1 tunnel source absent");
 const physical=["panel",...(!lowMemory?["rib"]:[])].map(role=>({
  role,mesh:group.children.find(x=>x.name===
   "SKYSHIFT 0.26.0 P2 / true physical "+role)
 }));
 const substrate=["panel","rib","shell",...(!lowMemory?["conduit"]:[])]
  .map(role=>({role,mesh:group.children.find(x=>x.name==="Tunnel / "+({
   panel:"HARDSURFACE_PANELS",rib:"CURVED_RIBS",
   shell:"CLOSED_SHELL",conduit:"STRUCTURAL_CONDUITS"
  })[role])}));
 if([...physical,...substrate].some(x=>!x.mesh?.material))
  throw Error("0.28.1 original Skyline shader targets missing");
 const reflection={value:1},transport={value:1},wall={value:1};
 const undo=[],added=[];
 try{
  for(const {mesh} of physical)
   undo.push(wrapFinishShader02642(mesh.material,reflection,"metal",lowMemory));
  for(const {role,mesh} of [...physical.map(x=>({...x,type:"physical"})),
   ...substrate.map(x=>({...x,type:"substrate"}))])
   undo.push(wrapFixtureMaterial02643(mesh.material,transport,
    physical.some(p=>p.mesh===mesh)?"physical":"substrate",
    {role,mobile:lowMemory}));
  for(const {role,mesh} of physical)
   undo.push(wrapShader0265(mesh.material,wall,"wall",
    {role,mobile:lowMemory}));
  for(const {role,mesh} of substrate)
   undo.push(wrapShader0265(mesh.material,wall,"substrate",
    {role,mobile:lowMemory}));
  // The original Skyline 0.26.3.2 artist-authored connected amber
  // arch feet and short lower cyan inlays also follow this SAME
  // banked source position adapter. New courses do not redraw them.
  const floor=createConnectedFootBands02632(THREE,positionAt,lowMemory,false);
  const foot=new THREE.Mesh(floor.geometry,new THREE.MeshBasicMaterial({
   vertexColors:true,side:THREE.DoubleSide,toneMapped:false,
   transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
   opacity:.86,polygonOffset:true,polygonOffsetFactor:-1,
   polygonOffsetUnits:-1
  }));
  foot.name="SKYSHIFT 0.28.1 / original joined amber arch feet";
  foot.frustumCulled=true;foot.renderOrder=3;
  section.add(foot);added.push(foot);
  // 0.28.9.1 uses the corrected 0.26.3.3 straight classifier,
  // but in Vault WORLD metres rather than the repeated 368m Skyline art.
  // Legacy 0.28.9 retains its exact original 0.26.3.2 emitter geometry.
  const edge=straightOnly?
   buildVaultStraightEmitters02891(THREE,positionAt,module,{
    lowMemory,ranges:straightRanges
   }):createLowerEdgeSources02632(THREE,positionAt,lowMemory);
  const emitter=new THREE.Mesh(edge.geometry,new THREE.MeshBasicMaterial({
   vertexColors:true,side:THREE.DoubleSide,toneMapped:false,depthWrite:true
  }));
  emitter.name=straightOnly?
   "SKYSHIFT 0.28.9.1 / native straight ONLY cyan edge inlays":
   "SKYSHIFT 0.28.1 / original short cyan edge inlays";
  emitter.frustumCulled=true;emitter.renderOrder=2;
  section.add(emitter);added.push(emitter);
  return {active:true,footBands:floor.bands,lowEdgeSegments:edge.segments,
   physicalMaterials:physical.length,substrateMaterials:substrate.length,
   dispose(){
    for(const item of added){
     item.removeFromParent();item.geometry.dispose();item.material.dispose();
    }
    for(const restore of undo.reverse())restore();
   }};
 }catch(error){
  for(const item of added){
   item.removeFromParent();item.geometry?.dispose();item.material?.dispose();
  }
  for(const restore of undo.reverse())restore();
  throw error;
 }
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
 const spatialWave0285=vaultSpatialWaveEnabled0285();
 const stableStrips0286=reflectionStabilityEnabled0286();
 const archFeet0287=archFootRelease0287();
 const precisionNeon0288=precisionNeonEnabled0288();
 const cinematicMetal0289=cinematicMetalEnabled0289();
 const straightOnly02891=straightParityEnabled02891();
 const straightRanges02891=straightOnly02891?vaultStraightRanges02891():null;
 // The original Skyline renderer owns EVERY panel, rib, bay, cove and
 // source-local metallic shader. Do not call the 0.27.x Vault pipeline here.
 try{
  for(const module of modules){
   const section=new THREE.Group();
   section.name="SKYLINE SOURCE / Vault "+module.index;
   root.add(section);
   // Some original 0.21.x art layers expect the Skyline native road
   // shader even though they only render tunnel geometry. Supply a
   // DETACHED, never-rendered material facade instead of mutating Vault's
   // actual PBR deck or coupling its physics/collision geometry.
   const roadFacade=new THREE.MeshStandardMaterial({color:0x050914});
   const item={source:null,section,module,metal:null,finish:null,
    wave:null,stability:null,archFoot:null,precision:null,cinematic:null,roadFacade};
   installed.push(item);
   const source=installPremiumMetalSurfaceLibrary(THREE,section,{
    track:"skyline",positionAt:adaptSourcePosition0281(positionAt,module),
    lowMemory,roadMaterial:roadFacade,vaultHeightClassic:false
   });
   item.source=source;
   const result=source.stats?.()??{};
   if(!result.premiumMetal0262Enabled||
    !result.localReflections0261Enabled||!result.trueMetal0260P2NativeGGX||
    !result.structuralEnabled)
    throw Error("source renderer failed in section "+module.index+
     ": "+JSON.stringify({status:result.status,
      premium:result.premiumMetal0262Status,
      reflections:result.localReflections0261Status,
      structural:result.structuralStatus}));
   const metal=installUnifiedMetalLighting02641(THREE,section,source,{
    enabled:true,lowMemory
   });
   item.metal=metal;
   if(!metal.active)
    throw Error("source unified metallic response failed in section "+module.index);
   item.finish=finishOriginalSourceMaterials0281(THREE,section,
    lowMemory,adaptSourcePosition0281(positionAt,module),{
     module,straightOnly:straightOnly02891,
     straightRanges:straightRanges02891
    });
   // Replace, never overlay, the 0.28.1 foot geometry on VAULT 0.28.7.
   // Same source profile and banked arc as every original portal;
   // one graphite mounting batch and the existing amber emitter mesh.
   item.archFoot=installArchFootAssembly0287(THREE,section,
    adaptSourcePosition0281(positionAt,module),{
     enabled:archFeet0287,lowMemory
    });
   if(archFeet0287&&!item.archFoot.active)
    throw Error("0.28.7 original corner fixture unavailable: "+module.index);
   // Only on 0.28.5: remap authored local source wave to world arc.
   item.wave=installVaultSpatialWaveModule0285(THREE,section,module,{
    trackLength,enabled:spatialWave0285
   });
   // Deliberately LAST: wrap the actual 0.26.x and 0.28.5 shader chain.
   // The single source installer owns every module, no separate Vault art.
   item.stability=installReflectionStability0286(section,{
    enabled:stableStrips0286,lowMemory
   });
   if(stableStrips0286&&!item.stability.active)
    throw Error("0.28.6 original luminous materials unavailable in module "+
     module.index+": "+item.stability.stats().reason);
   // Finish AFTER 0.28.6: preserve the actual Skyline GGX and
   // 0.28.7 physical L. No new source geometry or postprocess pass.
   item.precision=installPrecisionNeon0288(section,{
    enabled:precisionNeon0288,lowMemory
   });
   if(precisionNeon0288&&!item.precision.active)
    throw Error("0.28.8 original neon response missing in module "+
     module.index+": "+item.precision.stats().reason);
   // 0.28.9 must install after 0.28.8, but REMAIN at strength zero
   // while 0.28.4 PMREM captures its ORIGINAL scene. The game enables
   // the cinematic grade only after the authentic PMREM capture finishes.
   item.cinematic=installCinematicTunnel0289(section,{
    enabled:cinematicMetal0289,lowMemory,contrast:false,strips:false
   });
   if(cinematicMetal0289&&!item.cinematic.active)
    throw Error("0.28.9 original metal shader unavailable in module "+
     module.index+": "+item.cinematic.stats().reason);
  }
  world.add(root);
 }catch(error){
  for(const item of installed.reverse()){
   item.cinematic?.dispose?.();
   item.precision?.dispose?.();
   item.stability?.dispose?.();
   item.archFoot?.dispose?.();
   item.wave?.dispose?.();
   item.finish?.dispose?.();
   item.metal?.dispose?.();
   item.source?.dispose?.();
   item.roadFacade?.dispose?.();
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
  setReflectionComparison(value){
   for(const item of installed)item.stability?.setComparison?.(value);
  },
  setArchFootComparison(value){
   for(const item of installed)item.archFoot?.setComparison?.(value);
  },
  setPrecisionNeonComparison(value){
   for(const item of installed)item.precision?.setComparison?.(value);
  },
  setCinematicMetalComparison(values){
   for(const item of installed)item.cinematic?.setComparison?.(values);
  },
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
   authentic0265WallModules:installed.filter(x=>x.finish?.active).length,
   archFootAssembly0287:{
    active:archFeet0287,
    sourceModules:installed.filter(x=>x.archFoot?.active).length,
    sourceFixtures:installed.reduce((n,x)=>n+
     (x.archFoot?.stats?.().fixtures||0),0),
    verticalQuads:installed.reduce((n,x)=>n+
     (x.archFoot?.stats?.().verticalLightQuads||0),0),
    horizontalQuads:installed.reduce((n,x)=>n+
     (x.archFoot?.stats?.().horizontalLightQuads||0),0),
    mountedSourceBatches:installed.filter(x=>
     x.archFoot?.stats?.().darkBaseStructuralBatches===1).length,
    duplicateFootMeshes:0,lightsAdded:0,collidersAdded:0,
    sourceProfileReused:true,gripUnchanged:true,pmremUnchanged:true,
    lowMemory:!!lowMemory
   },
   cinematicMetal0289:{
    active:cinematicMetal0289,
    sourceModules:installed.filter(x=>x.cinematic?.active).length,
    physicalCoats:installed.reduce((n,x)=>n+(x.cinematic?.stats?.().nativePhysicalCoats||0),0),
    substrates:installed.reduce((n,x)=>n+(x.cinematic?.stats?.().nativeSubstrates||0),0),
    strength:installed[0]?.cinematic?.stats?.().strength??{contrast:0,strips:0},
    addedLights:0,addedMeshes:0,addedTextures:0,
    addedRenderPasses:0,addedBRDFSamples:0,
    originalGGX:true,originalPMREM:true,original0286:true,
    original0287:true,original0288:true,lowMemory:!!lowMemory,
    originalPhysicsUntouched:true,originalGripUntouched:true
   },
   precisionNeon0288:{
    active:precisionNeon0288,
    sourceModules:installed.filter(x=>x.precision?.active).length,
    physicalCoats:installed.reduce((n,x)=>n+(x.precision?.stats?.().coats||0),0),
    cyanSources:installed.filter(x=>x.precision?.stats?.().realCove===1).length,
    archFootSources:installed.filter(x=>x.precision?.stats?.().realArchFoot===1).length,
    strength:installed[0]?.precision?.stats?.().strength??0,
    addedLights:0,addedMeshes:0,addedTextures:0,
    addedRenderPasses:0,addedReflectionSamples:0,
    originalGGX:true,originalPMREM:true,originalArchFoot0287:true,
    lowMemory:!!lowMemory,roadUntouched:true,shipUntouched:true,
    boostUntouched:true,gripUntouched:true,physicsUntouched:true
   },
   stableLuminous0286:{
    active:stableStrips0286,
    sourceModules:installed.filter(x=>x.stability?.active).length,
    physicalCoats:installed.reduce((n,x)=>
     n+(x.stability?.stats?.().physicalCoats||0),0),
    coveBatches:installed.filter(x=>
     x.stability?.stats?.().coveEmitterMaterials===1).length,
    amberFootBatches:installed.filter(x=>
     x.stability?.stats?.().amberFootMaterials===1).length,
    strength:installed[0]?.stability?.stats?.().strength??0,
    lowMemory:!!lowMemory,originalFixturePositions:true,
    originalPMREMKept:true,originalGGXKept:true,
    addedDrawCalls:0,addedLights:0,addedRenderPasses:0
   },
   sharedWave0285:{
    active:spatialWave0285,
    sourceModules:installed.filter(x=>x.wave?.active).length,
    patchedMaterials:installed.reduce((n,x)=>n+(x.wave?.materials||0),0),
    modules:spatialWave0285?installed.map(x=>x.wave?.stats?.()):[],
    exactSource:"zone-wave-v060 global front",circuitMeters:trackLength,
    localFixtureShadersPreserved:true
   },
   originalAmberFootBands:installed.reduce((n,x)=>n+(x.finish?.footBands||0),0),
   originalShortCyanInlays:installed.reduce((n,x)=>n+(x.finish?.lowEdgeSegments||0),0),
   straightOnlyCyan02891:{active:straightOnly02891,
    sourceModules:installed.length,
    litSegments:installed.reduce((n,x)=>n+(x.finish?.lowEdgeSegments||0),0),
    straightRanges:straightRanges02891?.map(x=>({from:x.from,to:x.to,id:x.id}))??[],
    bendClearanceMeters:straightOnly02891?12:0,
    originalAmberFootBandsUntouched:true,
    originalSourceMaterialsUntouched:true,curveInlaysRemoved:straightOnly02891},
   originalTrackUntouched:true,originalPhysicsUntouched:true,
   originalShipUntouched:true,originalGripUntouched:true,
   legacyVaultRendererUsed:false
  };},
  dispose(){
   if(disposed)return;disposed=true;
   for(const item of installed.reverse()){
    item.cinematic?.dispose?.();
    item.precision?.dispose?.();
    item.stability?.dispose?.();
    item.archFoot?.dispose?.();
    item.wave?.dispose?.();
    item.finish?.dispose?.();item.metal?.dispose?.();
    item.source?.dispose?.();
    item.roadFacade?.dispose?.();
   }
   root.removeFromParent();
  }
 });
}
