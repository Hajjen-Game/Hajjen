// SKYSHIFT 0.24.2 — Cinematic Road Reflections.
// Road-only, art-directed anisotropic NEON reflections, integrated into the
// original indexed PBR deck. These are bounded local emitter approximations
// (not SSR, extra environment probes, world lamps or a wet road replacement).
// They inherit the original track arc, bank, sealed-tunnel mask and nine-zone
// spectral wave. Physically authored lane guides and white crest stay intact.
export const CINEMATIC_ROAD_0242=Object.freeze({
 version:"0.24.2",id:"cinematic-road-reflections-0242",
 look:"long colored wall/crown and amber portal glints on graphite road",
 source:"0.21.5 nearest existing portal plus native 9-zone track palette",
 fullTunnelStart:0,fullTunnelSolidUntil:340,fullTunnelEnd:368,
 usesOriginalDeck:true,usesOriginalPortalPositions:true,
 preservesGuideEmission:true,preservesWhiteCore:true,
 preservesRoadSolarSeal:true,preservesZoneWave:true,
 changesRoadGeometry:false,changesRoadColliders:false,
 changesGrip:false,changesPhysics:false,changesShip:false,
 changesRails:false,changesCamera:false,changesWorldLighting:false,
 additionalDrawCalls:0,additionalLights:0,additionalTextures:0,
 additionalMeshes:0,additionalRenderPasses:0,
 highSpecular:"long portal-localized spectral streaks with boost-warm details",
 mobileSpecular:"shorter cheaper streaks with reduced energy",
 comparison:"?cinematicRoad=classic"
});
const clamp01=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const EMISSION_ANCHOR="totalEmissiveRadiance+=zoneAccent*premiumRoadColoredBounce*0.65;";
const COMMON="#include <common>";
export function patchCinematicRoadReflectionShader(fragment,{mobile=false}={}){
 if(!fragment.includes(COMMON)||!fragment.includes(EMISSION_ANCHOR)||
    !fragment.includes("uniform float uRoadSolarSpillSeal;")||
    !fragment.includes("uniform float uPremiumRoadSurfaceSeal;")||
    !fragment.includes("float premiumRoadMask=")||
    !fragment.includes("float roadPortalDistance=")||
    !fragment.includes("premiumRoadPortal=exp(")||
    !fragment.includes("float whiteCore=0.0")||
    !fragment.includes("float guided =")||
    !fragment.includes("float padCoverage =")||
    !fragment.includes("float waveCrest=0.0")||
    !fragment.includes("vec3 zoneAccent=uTrackAccent")||
    !fragment.includes("vec3 waveSpectrum=uTrackAccent"))
  throw Error("0.24.2 requires original solar-sealed PBR road, 0.21.5 portal and native wave");
 // Scene brightness remains controlled at the emitter level. No white or
 // neutral direct/indirect specular is introduced. Existing PBR roughness,
 // native road palette, emissive guides/boosts and traveling white wave
 // remain byte-for-byte untouched.
 const reflections=[
  "// 0.24.2 original-arc local neon bounce only. NO additional light.",
  "float r42Mask=uCinematicRoad0242*premiumRoadMask;",
  "if(r42Mask>0.00001){",
  // Already computed from REAL portal arc positions by 0.21.5: no repeats.
  mobile?
   " float r42Long=1.0-smoothstep(1.0,26.0,roadPortalDistance);":
   " float r42Long=exp(-0.5*pow(roadPortalDistance/25.0,2.0));",
  " float r42Wall=smoothstep(5.5,7.7,absL)*",
  "  (1.0-smoothstep(10.1,11.3,absL));",
  " float r42Crown=smoothstep(1.1,2.9,absL)*",
  "  (1.0-smoothstep(5.5,7.0,absL));",
  " float r42Sheen=0.80+0.20*(0.5+0.5*sin(trackS*0.35+absL*0.69));",
  // Existing guides, boost inlays, center spine and WHITE wave win.
  " float r42Keep=clamp((1.0-0.94*whiteCore)*",
  "  (1.0-0.88*guided)*(1.0-0.84*padCoverage)*",
  "  (1.0-0.75*spine),0.0,1.0);",
  // Wave spectrum comes from the SAME color front as deck/ship.
  // No independent clock and no neutral-white copy of the white crest.
  " vec3 r42Tint=clamp(mix(zoneAccent,waveSpectrum,",
  "  clamp(waveCrest+waveHalo*0.28,0.0,1.0)),",
  "  vec3(0.0),vec3(0.78));",
  " float r42WaveSafe=1.0-0.92*clamp(whiteBloom,0.0,1.0);",
  " float r42WallSpec=(0.055*r42Wall+0.029*r42Crown)*",
  "  r42Long*r42Sheen*r42Keep*r42WaveSafe;",
  // Subtle warm contacts derived from the NATIVE boost/architectural
  // accent, not a second independently animated portal color or sun.
  " float r42Amber=0.014*r42Long*r42Wall*",
  "  (0.44+0.56*r42Sheen)*r42Keep*r42WaveSafe;",
  " vec3 r42Colored=r42Tint*r42WallSpec+zoneBoost*r42Amber;",
  " totalEmissiveRadiance+=r42Mask*r42Colored*"+
    (mobile?"0.72":"1.0")+";",
  "}"
 ].join("\n");
 return fragment
  .replace(COMMON,COMMON+"\nuniform float uCinematicRoad0242;")
  .replace(EMISSION_ANCHOR,EMISSION_ANCHOR+"\n"+reflections);
}
export function createCinematicRoadReflectionController(material,{lowMemory=false}={}){
 if(!material?.isMeshStandardMaterial||
    typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw Error("0.24.2 requires the same indexed sun-sealed MeshStandard road");
 const prev=material.onBeforeCompile,cache=material.customProgramCacheKey;
 const amount={value:1};
 material.onBeforeCompile=function(shader,renderer){
  prev.call(this,shader,renderer);
  shader.fragmentShader=patchCinematicRoadReflectionShader(shader.fragmentShader,{
   mobile:lowMemory
  });
  shader.uniforms.uCinematicRoad0242=amount;
 };
 material.customProgramCacheKey=function(){
  return cache.call(this)+"-cinematic-road-0242-"+(lowMemory?"4gb":"high");
 };
 material.needsUpdate=true;
 return {
  setComparison(value){amount.value=clamp01(value);},
  stats:()=>({
   enabled:true,active:true,version:"0.24.2",seal:amount.value,
   lowMemory,roadMaterial:"MeshStandardMaterial",
   nativeWave:true,whiteCoreUnchanged:true,guideEmissionUnchanged:true,
   roadSolarSealRetained:true,tunnelOnly:true,reflectsExistingPortals:true,
   newDrawCalls:0,newLights:0,newTextures:0,newRenderPasses:0,
   roadGeometryUnchanged:true,physicsUnchanged:true,gripUnchanged:true,
   shipUnchanged:true
  })
 };
}
