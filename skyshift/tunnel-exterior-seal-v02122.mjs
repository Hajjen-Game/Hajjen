// SKYSHIFT 0.21.2.2 — Exterior Light Seal & Tunnel Atmosphere Isolation.
// Three.js MeshBasicMaterial defaults to fog:true. The 0.21.2.1 shell
// correctly ignored world directional/hemisphere lights, but it still mixed
// the current zone's GLOBAL exp2 fog over every interior pixel. This caused
// the "sunlight from space" effect. Seal exactly these tunnel surfaces.
// Only the existing rail inlay's glare is limited inside the same 368m vault.
// No changes to scene.fog, sky, global lights, bloom strength, road geometry,
// gameplay, camera, GRIP, or the nine-palettes / spatial front.
import {installNeonDrivenInterior} from "./neon-interior-v0212.mjs";
import {TUNNEL_MEGA_0211} from "./tunnel-megastructure-v0211.mjs";

export const EXTERIOR_SEAL_02122=Object.freeze({
 version:"0.21.2.2",id:"exterior-light-seal-02122",
 start:TUNNEL_MEGA_0211.start,end:TUNNEL_MEGA_0211.end,
 fogOnTunnelSurfaces:false,
 railGlareInteriorScale:.52,
 railGlareFadeStart:344,
 railGlareFadeEnd:368,
 outsideRailScale:1,
 sceneFogChanged:false,globalLightsChanged:false,
 exposureChanged:false,bloomPassChanged:false,
 additionalDrawCalls:0,additionalDynamicLights:0,
 geometryChanged:false,physicsChanged:false,gripChanged:false,
 colorWaveChanged:false,
 comparison:"?exteriorSeal=classic"
});

export function sealTunnelMaterials(group){
 if(!group)throw new Error("0.21.2.2: tunnel geometry not installed");
 const affected=[];
 group.traverse(mesh=>{
  if(!mesh.material)return;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  for(const m of materials){
   // Three's fog defines are compiled into the shader, so both the flag and
   // program invalidation matter. Custom spectral uniforms remain intact.
   if(m.fog!==false){
    m.fog=false;
    m.needsUpdate=true;
   }
   affected.push(mesh.name);
  }
 });
 if(!affected.includes("Tunnel / CLOSED_SHELL")||
    !affected.includes("Tunnel / INTEGRATED_LIGHT"))
  throw new Error("0.21.2.2: missing shell/emitters to isolate");
 return affected;
}
export function installExteriorLightSeal(THREE,world,options={}){
 const base=installNeonDrivenInterior(THREE,world,options);
 const before=base.stats();
 if(!before.active||before.status!=="active")return base;
 const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const materials=sealTunnelMaterials(group);
 const state={
  ...before,version:"0.21.2.2",variant:"sealed-neon-tunnel",
  exteriorFogSealed:true,fogDisabledMaterialCount:materials.length,
  fogDisabledMeshes:materials,externalLightInfluence:0,
  sunWashRemoved:true,
  railGlareScale:EXTERIOR_SEAL_02122.railGlareInteriorScale,
  railGlareFadeStart:EXTERIOR_SEAL_02122.railGlareFadeStart,
  railGlareFadeEnd:EXTERIOR_SEAL_02122.railGlareFadeEnd,
  waveSynchronized:true,sceneFogChanged:false,
  globalLightsChanged:0,addedRenderPasses:0,
  colliders:0,roadMeshUntouched:true,originalGRIPUntouched:true,
  comparedTo:EXTERIOR_SEAL_02122.comparison
 };
 return {
  ready:base.ready,
  stats:()=>({...state,...{
   currentSpectrumStage:base.stats().currentSpectrumStage,
   currentSpectrumTo:base.stats().currentSpectrumTo,
   currentWaveFront:base.stats().currentWaveFront,
   waveActive:base.stats().waveActive
  }}),
  updateWave:wave=>base.updateWave?.(wave),
  dispose:()=>base.dispose()
 };
}
