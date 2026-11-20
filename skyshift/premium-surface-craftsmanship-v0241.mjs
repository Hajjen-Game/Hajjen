// SKYSHIFT 0.24.1 — Premium Surface Craftsmanship.
// Sculpted bevels, recessed machined scores and bounded brushed-metal sheen
// on the existing 0.24.0 solar-isolated tunnel. Never a separate mesh/lamp.
import {installArchitecturalNeonLighting}
 from "./architectural-neon-lighting-v0240.mjs";
import {buildTrueDepthGeometry}
 from "./true-material-depth-v0231.mjs";

export const PREMIUM_SURFACE_0241=Object.freeze({
 version:"0.24.1",id:"premium-surface-craftsmanship-0241",
 fullTunnelStart:0,fullTunnelEnd:368,
 baseVersion:"0.24.0",
 source:"original 22m vaulted panels, banked track and native neon",
 geometry:"machined 3D shoulder, dark inset score, end chamfer, long graphite face",
 material:"localized chromatic satin and distance-faded directional brush",
 comparison:"?surfaceCraft=classic",
 mobile:"existing full-vault geometry and simplified spectral finish",
 additionalMeshes:0,additionalDrawCalls:0,additionalLights:0,
 additionalTextures:0,additionalRenderPasses:0,
 newColliders:0,changesPhysics:false,changesGRIP:false,
 changesCamera:false,changesRoad:false,changesShip:false,
 changesRails:false,changesZoneWave:false,changesSolarSeal:false,
 preservesNativeNeon:true
});
const clamp=(v)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const common="#include <common>";
const anchor=" diffuseColor.rgb+=a24Bounce;\n}";

// A small, surface-bound improvement only. Do not amplify the global
// scene, white cores, or tunnel emissive geometry. The brushed reflection
// fades with distance so high frequency detail cannot shimmer in the horizon.
export function patchPremiumSurfaceShader(vertex,fragment,{mobile=false}={}){
 if(!vertex.includes(common)||!fragment.includes(common)||
    !fragment.includes(anchor)||!fragment.includes("uUnifiedExtent0233")||
    !fragment.includes("uArchitecturalNeon024")||
    !fragment.includes("varying float vRebirthClass;")||
    !fragment.includes("varying vec2 vNeonLocalSection;")||
    !fragment.includes("float p23WallLight=")||
    !fragment.includes("float p23RoofLight=")||
    !fragment.includes("float d31EdgeMask=")||
    !fragment.includes("float d31Face=")||
    !fragment.includes("vec3 rbTint=rebirthPalette();"))
  throw Error("0.24.1 requires the intact 0.24.0 metal and neon shaders");
 const lines=[
  "// 0.24.1: no white sunlight, no colored decals, no extra light source.",
  "if(uSurfaceCraft0241>0.0001){",
  " float s41Face=clamp(d31Face,0.0,1.0);",
  " float s41Edge=clamp(d31EdgeMask,0.0,1.0);",
  " float s41Cavity=clamp(d31Recess,0.0,1.0);",
  " float s41Near=clamp(max(p23WallLight,p23RoofLight)*0.9+",
  "  cinemaArch*0.1,0.0,1.0);",
  " float s41Rim=pow(1.0-clamp(p23Facing,0.0,1.0),2.0);",
  " float s41Detail=1.0-smoothstep(18.0,70.0,p23Distance);",
  " float s41Brush=0.5+0.5*sin(vRebirthTrack*"+(mobile?"2.3":"8.4")+
  "+vNeonLocalSection.y*"+(mobile?"0.9":"2.7")+");",
  " float s41Satin=(0.044*s41Edge*(0.64+0.36*s41Rim)+",
  "  0.024*s41Face*(0.35+0.65*s41Brush)*s41Detail)*",
  "  (0.40+0.60*s41Near);",
  " s41Satin=min(0.055,s41Satin)*"+
   (mobile?"0.55":"1.0")+"*(1.0-0.96*s41Cavity);",
  " vec3 s41Color=clamp(rbTint,vec3(0.0),vec3(0.72));",
  " diffuseColor.rgb+=uSurfaceCraft0241*s41Color*s41Satin;",
  "}"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment
  .replace(common,common+"\nuniform float uSurfaceCraft0241;")
  .replace(anchor,anchor+"\n"+lines)};
}

export function installPremiumSurfaceShader(material,uniforms,{mobile=false}={}){
 if(!material?.isMeshBasicMaterial||
    typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw Error("0.24.1 needs the original sun-isolated panel material");
 const previous=material.onBeforeCompile,oldKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  const result=patchPremiumSurfaceShader(shader.vertexShader,
   shader.fragmentShader,{mobile});
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=result.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return oldKey.call(this)+"-premium-surface-0241-"+(mobile?"4gb":"high");
 };
 material.needsUpdate=true;
}

export function installPremiumSurfaceCraftsmanship(THREE,world,options={}){
 const base=installArchitecturalNeonLighting(THREE,world,options);
 const original=base.stats(),lowMemory=!!options.lowMemory;
 const fallback=(reason)=>({...base,
  stats(){return {...base.stats(),surfaceCraft0241Enabled:false,
   surfaceCraft0241Status:reason};},
  setSurfaceCraftComparison(){}
 });
 if(!original.architecturalNeon0240Enabled||
    original.architecturalNeon0240Status!=="active"||
    !original.unifiedTunnel0233Enabled||
    !original.unifiedTunnel0233PreservedNativeNeon||
    !original.architecturalNeon0240SolarSealed)
  return fallback("0.24.0-or-0.23.3-not-ready");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const panel=group?.children?.find(m=>m.name==="Tunnel / HARDSURFACE_PANELS");
 if(!panel?.material?.isMeshBasicMaterial||
    !panel.geometry?.getAttribute?.("neonLocalSection")||
    !panel.geometry?.getAttribute?.("glowWeight"))
  return fallback("original-panel-mesh-missing");
 const oldGeometry=panel.geometry;
 let prepared=null;
 try{
  // 4GB retains the EXISTING 0.23.3 silhouette. Only high fidelity gets
  // extra profile facets, with unchanged draw batching and curved track.
  if(!lowMemory){
   prepared=buildTrueDepthGeometry(THREE,options.positionAt,{
    ...options,lowMemory:false,unifiedDepth:true,surfaceCraftsmanship:true
   });
   const newGeometry=prepared.geometry;
   const oldCount=oldGeometry.getAttribute("position").count;
   const newCount=newGeometry.getAttribute("position")?.count??0;
   if(newCount<=oldCount||newCount>oldCount*2.2||
      !newGeometry.getAttribute("neonLocalSection")||
      !newGeometry.getAttribute("physicalRight023")||
      !newGeometry.getAttribute("physicalUp023")||
      !newGeometry.getAttribute("glowWeight"))
    throw Error("crafted panel geometry/vertex budget invalid");
  }
 }catch(e){
  prepared?.geometry?.dispose?.();
  console.warn("SKYSHIFT 0.24.1 retaining previous surfaces",e);
  return fallback("geometry-fallback: "+String(e?.message||e));
 }
 const amount={value:1},uniforms={uSurfaceCraft0241:amount};
 installPremiumSurfaceShader(panel.material,uniforms,{mobile:lowMemory});
 if(prepared)panel.geometry=prepared.geometry;
 const state={
  surfaceCraft0241Enabled:true,surfaceCraft0241Status:"active",
  surfaceCraft0241Version:"0.24.1",
  surfaceCraft0241GeometryDetail:lowMemory?"0.23.3-mobile":"machined-facets",
  surfaceCraft0241PreviousVertices:oldGeometry.getAttribute("position").count,
  surfaceCraft0241Vertices:prepared?.vertices??
   oldGeometry.getAttribute("position").count,
  surfaceCraft0241Triangles:prepared?.triangles??
   oldGeometry.getAttribute("position").count/3,
  surfaceCraft0241LowMemory:lowMemory,
  surfaceCraft0241NewDrawCalls:0,surfaceCraft0241NewLights:0,
  surfaceCraft0241NativeNeonRetained:true,surfaceCraft0241SunSealed:true,
  surfaceCraft0241NoFlightChanges:true
 };
 return {...base,
  stats(){return {...base.stats(),...state,
   surfaceCraft0241Strength:amount.value,version:"0.24.1"};},
  setSurfaceCraftComparison(v){
   amount.value=clamp(v);
   if(prepared)panel.geometry=amount.value>0.5?prepared.geometry:oldGeometry;
  },
  dispose(){
   if(prepared){
    panel.geometry=oldGeometry;
    prepared.geometry.dispose?.();
   }
   base.dispose?.();
  }
 };
}
