// SKYSHIFT 0.4.8.1 — Premium integrated Zone Mode-inspired road material.
// Replaces 0.4.8's floating violet overlays and orange rectangle meshes.
// The same indexed physical road drives shader coordinates; NO new colliders,
// no new draw calls, no per-frame geometry, and no flashing textures.
import {TRIAL,widthAt} from "./trial-v048.mjs";
import {BOOST_PADS} from "./boost-v048.mjs";
import {createSmoothDeckData,MESH_SPEC} from "./smooth-track-v046.mjs";

export const PREMIUM_TRACK=Object.freeze({
 version:"zone-ribbon-pbr-0481",
 material:"continuous-integrated-PBR",
 palette:"midnight-teal / icy-white / restrained-amber",
 baseHex:0x245b69,
 sideBandHex:0x2a94a1,
 guideHex:0xc2f8f5,
 accentHex:0x6be5f0,
 boostHex:0xf8b65b,
 drawBatches:1,
 floatingDecalBatches:0,
 colorAnimation:false,
 boostPads:BOOST_PADS.length,
 curveFollowingLines:true,
 materialOnlyPalette:true,
 panelPeriodMeters:12
});
export function premiumTrackCoordinates(){
 const data=createSmoothDeckData();
 const coords=[];
 for(let row=0;row<data.rows;row++){
  const s=row*TRIAL.length/(data.rows-1);
  const w=widthAt(s);
  for(let column=0;column<data.cols;column++){
   const lane=w*(column/(data.cols-1)-.5);
   coords.push(s,lane);
  }
 }
 return {data,coords};
}
export function createPremiumDeckGeometry(THREE){
 const {data,coords}=premiumTrackCoordinates();
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(data.positions,3));
 g.setAttribute("aTrackCoord",new THREE.Float32BufferAttribute(coords,2));
 g.setIndex(data.indices);
 g.computeVertexNormals();
 g.computeBoundingSphere();
 return g;
}
// Keep source numeric pad bounds tied to actual physical boost locations.
export const GLSL_BOOST_PADS=BOOST_PADS.map(p=>({
 id:p.id,start:p.start,end:p.end,min:p.lateralMin,max:p.lateralMax
}));
const glNumber=n=>Number(n).toFixed(3);
const shaderBoostPads=BOOST_PADS.map(p=>
  `float boost_${p.id.replace(/-/g,"_")} = trackWindow(trackS, ${glNumber(p.start)}, ${glNumber(p.end)}, 1.05) * (1.0 - smoothstep(${glNumber(p.lateralMax-0.7)}, ${glNumber(p.lateralMax)}, abs(trackL))); 
   float arrow_${p.id.replace(/-/g,"_")} = trackChevron(trackS - ${glNumber(p.start)}, trackL) * boost_${p.id.replace(/-/g,"_")};`).join("\n");
// Nest max() rather than emitting a two-argument-only expression so future
// pads cannot accidentally generate invalid GLSL in a zone expansion.
const shaderMax=(items)=>items.reduce((all,item)=>
  all?`max(${all}, ${item})`:item,"");
const boostAggregation=shaderMax(BOOST_PADS.map(p=>`boost_${p.id.replace(/-/g,"_")}`));
const arrowsAggregation=shaderMax(BOOST_PADS.map(p=>`arrow_${p.id.replace(/-/g,"_")}`));

export const SURFACE_FRAGMENT_GLSL=`
  float trackS = vTrackCoord.x;
  float trackL = vTrackCoord.y;
  float absL = abs(trackL);
  // Long, continuous longitudinal structure. Nothing is randomly pasted on.
  float sideBand = smoothstep(3.25, 4.15, absL) * (1.0 - smoothstep(8.1, 9.0, absL));
  float flowZone = 0.35 + 0.65 * max(
    trackWindow(trackS, 58.0, 228.0, 23.0),
    trackWindow(trackS, 288.0, 437.0, 23.0));
  vec3 road = mix(uTrackBase, uTrackBand, sideBand * (0.27 + 0.24 * flowZone));

  // Two primary white/cyan racing guides that follow ALL banked curves.
  float innerLine = trackStripe(absL, 4.0, 0.060, 0.105);
  float guideLine = trackStripe(absL, 8.8, 0.055, 0.105);
  float laneSpine = trackStripe(absL, 6.42, 0.018, 0.110);
  float guided = max(innerLine * 0.90, guideLine);
  road = mix(road, uTrackGuide, guided * 0.94);
  road = mix(road, uTrackAccent, laneSpine * 0.32);

  // Near-camera material texture: subdued 12m panels near shoulders, without
  // squares or repeated tiny "obstacles" across the racing line.
  float panelPeriod = mod(trackS, 12.0);
  float panelSeam = (1.0 - smoothstep(0.04, 0.26, min(panelPeriod, 12.0-panelPeriod)));
  float shoulderMask = smoothstep(8.7, 9.3, absL) * (1.0 - smoothstep(10.2, 10.8, absL));
  road = mix(road, uTrackAccent, shoulderMask * panelSeam * 0.10);

  // Physical boost fields read as embedded ENERGY INLAYS, not raised golden
  // rectangles. Their functional world coordinates match boost-v048 exactly.
  ${shaderBoostPads}
  float padCoverage = max(${boostAggregation});
  float boostArrows = max(${arrowsAggregation});
  float insetGold = max(
    padCoverage * trackStripe(absL, 4.04, 0.055, 0.12),
    boostArrows * 0.84
  );
  road = mix(road, uTrackBoost, padCoverage * 0.23);
  road = mix(road, uTrackBoost, insetGold * 0.94);
  // Fine white booster guides create a powerful racing identity, not a HUD
  // rectangle laid on the road.
  road = mix(road, uTrackGuide, padCoverage * trackStripe(absL, 3.72, 0.04, 0.13) * 0.78);
  diffuseColor.rgb = road;
  totalEmissiveRadiance += uTrackGuide * guided * 0.24
                          + uTrackBoost * insetGold * 0.17;
`;
export const SURFACE_FRAGMENT_HELPERS=`
varying vec2 vTrackCoord;
uniform vec3 uTrackBase;
uniform vec3 uTrackBand;
uniform vec3 uTrackGuide;
uniform vec3 uTrackAccent;
uniform vec3 uTrackBoost;
float trackStripe(float x, float center, float thickness, float feather) {
  return 1.0 - smoothstep(thickness, thickness + feather, abs(x - center));
}
float trackWindow(float x, float from, float to, float feather) {
  return smoothstep(from, from+feather, x) * (1.0 - smoothstep(to-feather, to, x));
}
float trackChevron(float s, float lateral) {
  float phase = mod(s+0.25, 5.65);
  float diagonal = abs(phase - (4.55 - 0.70*abs(lateral)));
  return (1.0-smoothstep(0.12, 0.32, diagonal))
         * smoothstep(0.28, 0.8, abs(lateral))
         * (1.0-smoothstep(3.05, 3.58, abs(lateral)));
}
`;
// Extracted patcher can be tested without WebGL; used at shader compile time.
export function patchPremiumShaders(vertexShader,fragmentShader){
 const vCommon="#include <common>",vBegin="#include <begin_vertex>";
 const fCommon="#include <common>",fColor="#include <color_fragment>";
 if(!vertexShader.includes(vCommon)||!vertexShader.includes(vBegin)||
    !fragmentShader.includes(fCommon)||!fragmentShader.includes(fColor))
   throw new Error("SKYSHIFT premium surface: unsupported Three.js shader chunks");
 // Shader common is global scope: varyings/uniforms belong there.
 const vertex=vertexShader.replace(vCommon,
   vCommon+"\nattribute vec2 aTrackCoord;\nvarying vec2 vTrackCoord;")
   .replace(vBegin,vBegin+"\nvTrackCoord = aTrackCoord;");
 // Emissive energy needs to be applied AFTER the standard emissive map block,
 // where totalEmissiveRadiance is already defined; keep color edit separate.
 const coloring=SURFACE_FRAGMENT_GLSL.replace(
   /  totalEmissiveRadiance \+= [\s\S]*?;\s*$/,"");
 const emission=`totalEmissiveRadiance += uTrackGuide *
  max(trackStripe(abs(vTrackCoord.y), 4.0, 0.060, 0.105)*0.90,
      trackStripe(abs(vTrackCoord.y), 8.8, 0.055, 0.105))*0.24;`;
 const fragment=fragmentShader.replace(fCommon,
   fCommon+"\n"+SURFACE_FRAGMENT_HELPERS)
   .replace(fColor,fColor+"\n"+coloring)
   .replace("#include <emissivemap_fragment>",
     "#include <emissivemap_fragment>\n"+emission);
 return {vertexShader:vertex,fragmentShader:fragment};
}
export function createPremiumTrackMaterial(THREE){
 const mat=new THREE.MeshStandardMaterial({
   color:0xffffff,
   roughness:.38,
   metalness:.52,
   emissive:0x03131f,
   emissiveIntensity:.22,
   side:THREE.DoubleSide
 });
 const palette={
  base:new THREE.Color(PREMIUM_TRACK.baseHex),
  band:new THREE.Color(PREMIUM_TRACK.sideBandHex),
  guide:new THREE.Color(PREMIUM_TRACK.guideHex),
  accent:new THREE.Color(PREMIUM_TRACK.accentHex),
  boost:new THREE.Color(PREMIUM_TRACK.boostHex)
 };
 mat.onBeforeCompile=shader=>{
   const patched=patchPremiumShaders(shader.vertexShader,shader.fragmentShader);
   shader.vertexShader=patched.vertexShader;
   shader.fragmentShader=patched.fragmentShader;
   Object.assign(shader.uniforms,{
    uTrackBase:{value:palette.base},
    uTrackBand:{value:palette.band},
    uTrackGuide:{value:palette.guide},
    uTrackAccent:{value:palette.accent},
    uTrackBoost:{value:palette.boost}
   });
 };
 mat.customProgramCacheKey=()=>PREMIUM_TRACK.version;
 return {material:mat,palette,
  setPalette(next){
    for(const name of ["base","band","guide","accent","boost"]){
     if(next[name]!==undefined)palette[name].set(next[name]);
    }
  }};
}
