// SKYSHIFT 0.23.3 — Unified Tunnel Materials.
// Promote the 0.23 material study to the full 368 m sealed vault.
// Restore geometric continuity without undoing true depth or local neon.
// Only existing tunnel metal batches are touched: no road, ship, rail,
// camera, GRIP, collision, exterior world light or postprocessing changes.
import {installCinematicLightArchitecture}
 from "./cinematic-light-architecture-v0232.mjs";
import {buildTrueDepthGeometry}
 from "./true-material-depth-v0231.mjs";

export const UNIFIED_TUNNEL_0233=Object.freeze({
 version:"0.23.3",id:"unified-tunnel-materials-0233",
 fullTunnelStart:0,fullTunnelEnd:368,
 referenceVersion:"0.23.2",
 panelGeometry:"true-depth 0.58 m full-length, portal-safe",
 material:"0.23 GGX metal with original native-neon luminance floor",
 mobile:"same geometry language, fewer facets/trim strips, no new shader frames",
 additionalMeshes:0,additionalDrawCalls:0,additionalLights:0,
 additionalRenderPasses:0,additionalTextures:0,newColliders:0,
 changesShip:false,changesRoad:false,changesRail:false,
 changesGRIP:false,changesPhysics:false,changesCamera:false,
 changesZoneWave:false,changesSolarSeal:false,
 compare:"?unifiedTunnel=classic"
});
const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const roles=Object.freeze({
 panel:"HARDSURFACE_PANELS",conduit:"STRUCTURAL_CONDUITS",
 shell:"CLOSED_SHELL",rib:"CURVED_RIBS"
});
const oldMetalGallery=/float p23Gallery=smoothstep\(78\.0,98\.0,vRebirthTrack\)\*\s*\(1\.0-smoothstep\(284\.0,304\.0,vRebirthTrack\)\);/;
const oldLightGallery=/float c32Gallery=smoothstep\(88\.0,110\.0,vRebirthTrack\)\*\s*\(1\.0-smoothstep\(280\.0,302\.0,vRebirthTrack\)\);/;
const oldMix="diffuseColor.rgb=mix(p23Original,p23Result,p23Mix);";
const nativeSafeMix=[
 "diffuseColor.rgb=mix(p23Original,",
 " mix(p23Result,max(p23Original,p23Result),uUnifiedExtent0233),",
 " p23Mix);"
].join("");
// Patches the ALREADY COMPOSED original shaders. A/B zero is byte-for-byte
// the old 0.23.2 material behavior; A/B one extends only the three existing
// metal/light masks and prevents 0.23 from darkening the old neon response.
// Metal normal calculations remain track-banked, never world/sun driven.
export function patchUnifiedTunnelShader(vertex,fragment,{role="panel"}={}){
 if(!(role in roles)||!fragment.includes("#include <common>")||
    !oldMetalGallery.test(fragment)||!fragment.includes(oldMix))
  throw Error("0.23.3 requires original solar-sealed 0.23 metal shader");
 const hasLightGallery=oldLightGallery.test(fragment);
 if((role==="panel"||role==="conduit")!==hasLightGallery)
  throw Error("0.23.3 inconsistent 0.23.2 light-role shader");
 let f=fragment.replace("#include <common>",
  "#include <common>\nuniform float uUnifiedExtent0233;");
 f=f.replace(oldMetalGallery,old=>
  "float p23Gallery=mix("+old.slice("float p23Gallery=".length,-1)+
  ",1.0,uUnifiedExtent0233);");
 if(hasLightGallery)f=f.replace(oldLightGallery,old=>
  "float c32Gallery=mix("+old.slice("float c32Gallery=".length,-1)+
  ",1.0,uUnifiedExtent0233);");
 f=f.replace(oldMix,nativeSafeMix);
 return {vertexShader:vertex,fragmentShader:f};
}
function installUnifiedShader(material,uniforms,role){
 if(!material?.isMeshBasicMaterial||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.23.3 requires existing sun-sealed metal batch");
 const previous=material.onBeforeCompile;
 const originalKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  const patched=patchUnifiedTunnelShader(
   shader.vertexShader,shader.fragmentShader,{role});
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=patched.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return originalKey.call(this)+"-unified-tunnel-0233-"+role;
 };
 material.needsUpdate=true;
}

export function installUnifiedTunnelMaterials(THREE,world,options={}){
 const base=installCinematicLightArchitecture(THREE,world,options);
 const previous=base.stats();
 const fallback=reason=>({...base,
  stats(){return {...base.stats(),unifiedTunnel0233Enabled:false,
   unifiedTunnel0233Status:reason};},
  setUnifiedComparison(){}
 });
 if(previous.trueDepth0231Status!=="active"||
    previous.lightArchitecture0232Status!=="active"||
    !previous.lightArchitecture0232PreservedNativeNeon)
  return fallback("previous-passes-not-ready");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const lowMemory=!!options.lowMemory;
 const targets=Object.entries(roles)
  .filter(([role])=>!lowMemory||role!=="conduit")
  .map(([role,name])=>({role,
   mesh:group?.children?.find(m=>m.name==="Tunnel / "+name)}));
 if(targets.length!==(lowMemory?3:4)||
    targets.some(({mesh})=>!mesh?.material?.isMeshBasicMaterial||
     !mesh.geometry?.getAttribute?.("neonLocalSection")||
     !mesh.geometry?.getAttribute?.("glowWeight")))
  return fallback("original-sun-sealed-mesh-missing");
 const panel=targets.find(t=>t.role==="panel").mesh;
 let expanded;
 try{
  expanded=buildTrueDepthGeometry(THREE,options.positionAt,{
   ...options,unifiedDepth:true,lowMemory
  });
  if(expanded.geometry.getAttribute("position").count<1||
     !expanded.geometry.getAttribute("neonLocalSection")||
     (!lowMemory&&!expanded.geometry.getAttribute("physicalRight023")))
   throw Error("unified geometry missing original shader attributes");
 }catch(error){
  expanded?.geometry?.dispose?.();
  console.warn("SKYSHIFT 0.23.3 retaining previous tunnel",error);
  return fallback("geometry-validation-failed: "+String(error?.message||error));
 }
 const previousGeometry=panel.geometry;
 const extent={value:1};
 const uniforms={uUnifiedExtent0233:extent};
 for(const {role,mesh} of targets)
  installUnifiedShader(mesh.material,uniforms,role);
 panel.geometry=expanded.geometry;
 const state={
  unifiedTunnel0233Enabled:true,unifiedTunnel0233Status:"active",
  unifiedTunnel0233Version:"0.23.3",
  unifiedTunnel0233Start:0,unifiedTunnel0233End:368,
  unifiedTunnel0233OriginalVertices:previousGeometry.getAttribute("position").count,
  unifiedTunnel0233Vertices:expanded.vertices,
  unifiedTunnel0233Triangles:expanded.triangles,
  unifiedTunnel0233LowMemory:lowMemory,
  unifiedTunnel0233ShaderBatches:targets.length,
  unifiedTunnel0233AddedDrawCalls:0,
  unifiedTunnel0233PreservedNativeNeon:true,
  unifiedTunnel0233SunSealed:true,
  unifiedTunnel0233RoadShipPhysicsUntouched:true
 };
 return {...base,
  stats(){return {...base.stats(),...state,
   unifiedTunnel0233Strength:extent.value,version:"0.23.3"};},
  setUnifiedComparison(value){
   extent.value=clamp(value);
   panel.geometry=extent.value>0.5?expanded.geometry:previousGeometry;
  },
  dispose(){
   panel.geometry=previousGeometry;
   expanded.geometry.dispose?.();
   base.dispose?.();
  }
 };
}
