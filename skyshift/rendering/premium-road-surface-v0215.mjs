// SKYSHIFT 0.21.5 — Premium Road Surface.
// Road-only shader finish layered into the existing indexed MeshStandard deck.
// Physical geometry, hitboxes, white-core wave, guides and road solar seal
// remain exactly as before. The matte deck receives subtle longitudinal
// graphite grain, broad interlocking panel seams and restrained COLOR-only
// reflection pockets near the outside shoulders. No floating decals, texture
// uploads, extra draw calls, dynamic lights or new post-processing.
import {TUNNEL_PORTALS_0211} from "../tunnel/tunnel-megastructure-v0211.mjs";

export const PREMIUM_ROAD_SURFACE_0215=Object.freeze({
 version:"0.21.5",id:"premium-road-surface-0215",
 tunnelStart:0,tunnelSolidUntil:340,tunnelEnd:368,
 finish:"integrated-matte-graphite-with-subdued-neon-bounce",
 bayPeriodMeters:19.0,
 maxColoredBounce:.038,
 portalCount:TUNNEL_PORTALS_0211.length,
 roadGeometryChanged:false,collidersAdded:0,
 steeringChanged:false,gripChanged:false,cameraChanged:false,
 shipChanged:false,railChanged:false,whiteCoreWaveChanged:false,
 roadSolarSealRetained:true,
 newDrawBatches:0,newDynamicLights:0,newRenderPasses:0,
 qualityShaderUniformOnly:true,
 comparison:"?premiumRoad=classic"
});
const clamp01=x=>Math.max(0,Math.min(1,x));
export function premiumRoadInteriorMask(s){
 if(!Number.isFinite(s)||s<PREMIUM_ROAD_SURFACE_0215.tunnelStart)return 0;
 const t=clamp01((s-PREMIUM_ROAD_SURFACE_0215.tunnelSolidUntil)/
  (PREMIUM_ROAD_SURFACE_0215.tunnelEnd-PREMIUM_ROAD_SURFACE_0215.tunnelSolidUntil));
 return 1-t*t*(3-2*t);
}
// Keep the integrated floor color gently brighter at shoulder pockets,
// never introduce neutral sun/horizon lights. Gold, magenta and cyan are
// sourced from zoneAccent and therefore follow the original 9-color wave.
// Find the nearest installed portal with cheap min/abs first; ONE exp() per
// pixel rather than one Gaussian per portal, important on mobile GPUs.
const portalGLSL=[
 "float roadPortalDistance=10000.0;",
 ...TUNNEL_PORTALS_0211.map(p=>
  "roadPortalDistance=min(roadPortalDistance,abs(trackS-"+p.toFixed(1)+"));"),
 "premiumRoadPortal=exp(-0.5*pow(roadPortalDistance/6.8,2.0));"
].join("\n");
const roadColorAnchor=
 "vec3 road = mix(zoneBase, zoneBand, sideBand * (0.27 + 0.24 * flowZone));";
const roadFinishGLSL=[
 "  // Slate/grain is authored in world road coordinates, not screen UVs.",
 "  // The 19m bays have faint soft transitions, not rows of obstacles.",
 "  float premiumRoadMask=uPremiumRoadSurfaceSeal*",
 "    (1.0-smoothstep(340.0,368.0,trackS));",
 "  float roadPanelPhase=mod(trackS+floor(absL/4.8)*4.75,19.0);",
 "  float roadPanelEdge=1.0-smoothstep(0.05,0.55,",
 "    min(roadPanelPhase,19.0-roadPanelPhase));",
 "  float roadLongGrain=0.5+0.5*sin(trackS*0.67+trackL*0.18);",
 "  float roadSlate=0.5+0.5*sin(trackL*1.25+trackS*0.045);",
 "  float roadMaterialWear=(roadLongGrain*.53+roadSlate*.47);",
 "  float roadPanelInset=roadPanelEdge*",
 "    (0.025+0.028*smoothstep(3.2,8.2,absL));",
 "  float roadMaterialShade=0.955+0.060*roadMaterialWear-roadPanelInset;",
 "  road*=mix(1.0,roadMaterialShade,premiumRoadMask);",
 "  // Restrained color reflections near existing portal light sources.",
 "  float premiumRoadPortal=0.0;",
 portalGLSL,
 "  float roadShoulderSheen=smoothstep(6.2,8.6,absL)*",
 "    (1.0-smoothstep(10.1,11.2,absL));",
 "  float premiumRoadColoredBounce=premiumRoadMask*",
 "    roadShoulderSheen*premiumRoadPortal*0.038;",
 "  road+=zoneAccent*premiumRoadColoredBounce*0.35;"
].join("\n");
const roadPhysicalGLSL=[
 "  // Reduce PBR sun-facing glints instead of recreating white wash.",
 "  float premiumPhysicalMask=uPremiumRoadSurfaceSeal*",
 "    (1.0-smoothstep(340.0,368.0,vTrackCoord.x));",
 "  float roadSatin=0.5+0.5*sin(vTrackCoord.x*.41+vTrackCoord.y*.35);",
 "  roughnessFactor=mix(roughnessFactor,0.67+0.055*roadSatin,",
 "    premiumPhysicalMask);",
 "  metalnessFactor=mix(metalnessFactor,0.22+0.06*roadSatin,",
 "    premiumPhysicalMask);"
].join("\n");
const roadEmissionGLSL=[
 "  // Color-only bounce: no modification to wave whiteCore or lane glow.",
 "  totalEmissiveRadiance+=zoneAccent*premiumRoadColoredBounce*0.65;"
].join("\n");

export function patchPremiumRoadSurfaceShader(fragment){
 const common="#include <common>";
 const metal="#include <metalnessmap_fragment>";
 const emission="#include <emissivemap_fragment>";
 if(!fragment.includes(common)||!fragment.includes(roadColorAnchor)||
    !fragment.includes(metal)||!fragment.includes(emission)||
    !fragment.includes("varying vec2 vTrackCoord;")||
    !fragment.includes("float whiteCore=0.0"))
  throw Error("0.21.5 requires original physical road with native spectral wave");
 return fragment
  .replace(common,common+"\nuniform float uPremiumRoadSurfaceSeal;")
  .replace(roadColorAnchor,roadColorAnchor+"\n"+roadFinishGLSL)
  .replace(metal,metal+"\n"+roadPhysicalGLSL)
  .replace(emission,emission+"\n"+roadEmissionGLSL);
}
export function createPremiumRoadSurfaceController(material,{lowMemory=false}={}){
 if(!material?.isMeshStandardMaterial||
    typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw Error("0.21.5 expected the existing integrated PBR road");
 const uniform={value:1};
 const oldCompile=material.onBeforeCompile;
 const oldKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  oldCompile.call(this,shader,renderer);
  shader.uniforms.uPremiumRoadSurfaceSeal=uniform;
  shader.fragmentShader=patchPremiumRoadSurfaceShader(shader.fragmentShader);
 };
 material.customProgramCacheKey=function(){
  return oldKey.call(this)+"-premium-road-0215";
 };
 material.needsUpdate=true;
 return {
  setComparison(value){
   uniform.value=clamp01(Number.isFinite(value)?value:1);
  },
  stats:()=>({
   version:PREMIUM_ROAD_SURFACE_0215.version,
   active:true,finish:PREMIUM_ROAD_SURFACE_0215.finish,
   seal:uniform.value,lowMemory,drawCallsAdded:0,
   surfaceOnly:true,whiteCoreUnchanged:true,roadSolarSealRetained:true,
   nativeZoneColors:true,geometryUnchanged:true,
   physicsUnchanged:true,gripUnchanged:true,shipUnchanged:true
  })
 };
}
