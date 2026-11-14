// SKYSHIFT 0.4.9.6 — Velocity-aware White-Core Spectral Zone Wave in the SAME PBR road shader, zero extra meshes.
// Replaces 0.4.8's floating violet overlays and orange rectangle meshes.
// The same indexed physical road drives shader coordinates; NO new colliders,
// no new draw calls, no per-frame geometry, and no flashing textures.
import {TRIAL,widthAt} from "./trial-v049.mjs";
import {ZONE_PALETTES,ZONE_WAVE,SPECTRAL_FRONT_GLSL} from "./zone-wave-v0493.mjs";
import {BOOST_PADS} from "./boost-v0494.mjs";
import {createSmoothDeckData,MESH_SPEC} from "./smooth-track-v049.mjs";

export const PREMIUM_TRACK=Object.freeze({
 version:"zone-spectral-velocity-pbr-0496",
 material:"continuous-integrated-PBR",
 palette:"Midnight / Electric Violet / Solar Gold / Jade Surge",
 baseHex:ZONE_PALETTES[0].base,
 sideBandHex:ZONE_PALETTES[0].band,
 guideHex:ZONE_PALETTES[0].guide,
 accentHex:ZONE_PALETTES[0].accent,
 boostHex:ZONE_PALETTES[0].boost,
 drawBatches:1,
 velocityReactiveGuides:true,
 velocityExtraDrawCalls:0,
 floatingDecalBatches:0,
 colorAnimation:true,
 zoneWaveMetersPerSecond:ZONE_WAVE.frontMetersPerSecond,
 waveFeatherMeters:ZONE_WAVE.featherMeters,
 waveCrestMeters:ZONE_WAVE.crestMeters,
 afterglowMeters:ZONE_WAVE.afterglowMeters,
 spectralLayerCount:5,
 whiteCoreHalfWidthMeters:ZONE_WAVE.whiteCoreMeters,
 whiteBloomHalfWidthMeters:ZONE_WAVE.whiteBloomMeters,
 whiteCoreEnergy:ZONE_WAVE.whiteCoreEnergy,
 lowGraphicsFilamentsDisabled:true,
 boostPads:BOOST_PADS.length,
 curveFollowingLines:true,
 materialOnlyPalette:true,
 panelPeriodMeters:12,
 centerSpineEnabled:true,
 spinePeriodMeters:11.5,
 spineDashMeters:8.0,
 spineWidthMeters:.15,
 spineContrast:.23,
 spineEmissive:0
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

const zoneFields=["Base","Band","Guide","Accent","Boost"];
const zoneFieldToColor={Base:"base",Band:"band",Guide:"guide",Accent:"accent",Boost:"boost"};
const zoneShaderDecl=Array.from({length:3},(_,i)=>[
 `uniform float uZoneFront${i+1};`,
 ...zoneFields.map(field=>`uniform vec3 uZone${i+1}${field};`)
].join("\n")).join("\n")+`\n`;
// The spectral front, broad halo and afterglow share ONE shader and exactly
// the SAME coordinate as the physical color change and rail lights.
const zoneShaders=Array.from({length:3},(_,i)=>{
 const k=i+1;
 return [
  `float wave${k}On = step(${(k-.5).toFixed(1)}, uZoneActiveCount);`,
  `float wave${k}D = waveTrack - uZoneFront${k};`,
  `float wave${k} = wave${k}On * (1.0-smoothstep(-uZoneFeather,uZoneFeather,wave${k}D));`,
  ...zoneFields.map(field=>`zone${field} = mix(zone${field}, uZone${k}${field}, wave${k});`),
  `float wave${k}Core = wave${k}On*spectralCore(wave${k}D);`,
  `float wave${k}Halo = wave${k}On*spectralHalo(wave${k}D);`,
  `float wave${k}After = wave${k}On*spectralAfterglow(wave${k}D);`,
  `float wave${k}White = wave${k}On*spectralWhiteCore(wave${k}D);`,
  `float wave${k}Bloom = wave${k}On*spectralWhiteBloom(wave${k}D);`,
  `float wave${k}Filament = wave${k}On*spectralFilaments(
    wave${k}D,trackL,uZoneTime,uWaveDetail);`,
  `whiteCore = max(whiteCore,wave${k}White);`,
  `whiteBloom = max(whiteBloom,wave${k}Bloom);`,
  `whiteFilaments = max(whiteFilaments,wave${k}Filament);`,
  `waveCrest = max(waveCrest,wave${k}Core);`,
  `waveHalo = max(waveHalo,wave${k}Halo);`,
  `waveAfter = max(waveAfter,wave${k}After);`,
  `waveSpectrum = mix(waveSpectrum,uZone${k}Accent,
     clamp(wave${k}Core+wave${k}Halo*.33,0.0,1.0));`
 ].join("\n  ");
}).join("\n  ");
const zoneLayerGLSL=`
  float waveTrack = spectralWaveOffset(trackS,trackL,uZoneTime);
  vec3 zoneBase=uTrackBase,zoneBand=uTrackBand,zoneGuide=uTrackGuide;
  vec3 zoneAccent=uTrackAccent,zoneBoost=uTrackBoost;
  vec3 waveSpectrum=uTrackAccent;
  float waveCrest=0.0,waveHalo=0.0,waveAfter=0.0;
  float whiteCore=0.0,whiteBloom=0.0,whiteFilaments=0.0;
  ${zoneShaders}
`;

export const SURFACE_FRAGMENT_GLSL=`
  float trackS = vTrackCoord.x;
  float trackL = vTrackCoord.y;
  float absL = abs(trackL);
  // Long, continuous longitudinal structure. Nothing is randomly pasted on.
  float sideBand = smoothstep(3.25, 4.15, absL) * (1.0 - smoothstep(8.1, 9.0, absL));
  float flowZone = 0.35 + 0.65 * max(
    trackWindow(trackS, 58.0, 228.0, 23.0),
    trackWindow(trackS, 288.0, 437.0, 23.0));
  ${zoneLayerGLSL}
  vec3 road = mix(zoneBase, zoneBand, sideBand * (0.27 + 0.24 * flowZone));

  // Two primary white/cyan racing guides that follow ALL banked curves.
  float innerLine = trackStripe(absL, 4.0, 0.060, 0.105);
  float guideLine = trackStripe(absL, 8.8, 0.055, 0.105);
  float laneSpine = trackStripe(absL, 6.42, 0.018, 0.110);
  float guided = max(innerLine * 0.90, guideLine);
  road = mix(road, zoneGuide, guided * 0.94);
  road = mix(road, zoneAccent, laneSpine * 0.32);

  // Near-camera material texture: subdued 12m panels near shoulders, without
  // squares or repeated tiny "obstacles" across the racing line.
  float panelPeriod = mod(trackS, 12.0);
  float panelSeam = (1.0 - smoothstep(0.04, 0.26, min(panelPeriod, 12.0-panelPeriod)));
  float shoulderMask = smoothstep(8.7, 9.3, absL) * (1.0 - smoothstep(10.2, 10.8, absL));
  road = mix(road, zoneAccent, shoulderMask * panelSeam * 0.10);

  // Physical boost fields read as embedded ENERGY INLAYS, not raised golden
  // rectangles. Their functional world coordinates match boost-v048 exactly.
  ${shaderBoostPads}
  float padCoverage = ${boostAggregation};
  float boostArrows = ${arrowsAggregation};
  float insetGold = max(
    padCoverage * trackStripe(absL, 4.04, 0.055, 0.12),
    boostArrows * 0.84
  );
  road = mix(road, zoneBoost, padCoverage * 0.23);
  road = mix(road, zoneBoost, insetGold * 0.94);
  // Fine white booster guides create a powerful racing identity, not a HUD
  // rectangle laid on the road.
  road = mix(road, zoneGuide, padCoverage * trackStripe(absL, 3.72, 0.04, 0.13) * 0.78);
  // A subtle segmented CENTER SPINE. Eight meters of soft paint followed by
  // 3.5m of negative space: never a bright continuous 'runway' light.
  // It sits inside the existing PBR surface, and fades under boost inlays.
  float spinePhase = mod(trackS, 11.5);
  float spineDash = smoothstep(0.65, 1.35, spinePhase) *
      (1.0 - smoothstep(8.65, 9.45, spinePhase));
  float spineLane = 1.0 - smoothstep(0.045, 0.16, absL);
  float spine = spineLane * spineDash * (1.0 - padCoverage * 0.80);
  road = mix(road, zoneGuide, spine * 0.23);
  // Prismatic body + slim bright crest + short luminous wake, all EXACTLY
  // on the palette front. Don't obscure guiding lines or boost markings.
  float crestEnergy = waveCrest * 0.30 + waveHalo * 0.13 +
     waveAfter * 0.030;
  road = mix(road, waveSpectrum, crestEnergy*(1.0-padCoverage*.22));
  // White light is a distinct visual layer, independent of zone tint.
  // Bright enough to register in the iPhone's bloom and on low-FPS Android,
  // but limited to the travelling longitudinal wave band.
  float neutralEnergy=clamp(whiteCore*.38+whiteBloom*.10+
    whiteFilaments*.13,0.0,.60);
  road = mix(road,vec3(.96,.99,1.0),neutralEnergy);
  // Speed only illuminates existing longitudinal guides. The moving glints
  // are tied to world arc length, never cross the racing line as a barrier.
  float velocityStripe=pow(.5+.5*sin((trackS-uVelocityPhase)*.58),7.0);
  float velocityEcho=pow(.5+.5*sin((trackS-uVelocityPhase)*.25+1.3),9.0);
  float velocityEdgeMask=max(
    trackStripe(absL,4.0,.075,.19)*.52,
    trackStripe(absL,8.8,.08,.22));
  float velocityGlint=uSpeedFlow*velocityEdgeMask*
    (.12+.53*velocityStripe+.18*velocityEcho);
  road=mix(road,zoneGuide,velocityGlint*.27);
  diffuseColor.rgb = road;
  totalEmissiveRadiance += uTrackGuide * guided * 0.24
                          + uTrackBoost * insetGold * 0.17
                          + zoneGuide * velocityGlint * .35;
`;
export const SURFACE_FRAGMENT_HELPERS=`
varying vec2 vTrackCoord;
uniform vec3 uTrackBase;
uniform vec3 uTrackBand;
uniform vec3 uTrackGuide;
uniform vec3 uTrackAccent;
uniform vec3 uTrackBoost;
uniform float uZoneActiveCount;
uniform float uZoneFeather;
uniform float uZoneTime;
uniform float uWaveDetail;
uniform float uSpeedFlow;
uniform float uVelocityPhase;
${zoneShaderDecl}${SPECTRAL_FRONT_GLSL}
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
 const emission=`totalEmissiveRadiance += zoneGuide *
  max(trackStripe(abs(vTrackCoord.y), 4.0, 0.060, 0.105)*0.90,
      trackStripe(abs(vTrackCoord.y), 8.8, 0.055, 0.105))*0.24
      + waveSpectrum * (waveCrest*.18 + waveHalo*.045 +
        waveAfter*.015)*(1.0-padCoverage*.25)
      + vec3(1.0,1.035,1.1) *
        (whiteCore*${ZONE_WAVE.whiteCoreEnergy.toFixed(2)} +
         whiteBloom*${ZONE_WAVE.whiteBloomEnergy.toFixed(2)} +
         whiteFilaments*.11)
      + zoneGuide*velocityGlint*.35;`;
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
 const waveUniforms={
  uZoneActiveCount:{value:0},
  uZoneFeather:{value:ZONE_WAVE.featherMeters},
  uZoneTime:{value:0},
  uWaveDetail:{value:1},
  uSpeedFlow:{value:0},uVelocityPhase:{value:0}
 };
 for(let k=1;k<=3;k++){
  waveUniforms["uZoneFront"+k]={value:-10000};
  for(const [field,key] of Object.entries(zoneFieldToColor))
   waveUniforms["uZone"+k+field]={
     value:new THREE.Color(ZONE_PALETTES[k][key])
   };
 }
 mat.onBeforeCompile=shader=>{
   const patched=patchPremiumShaders(shader.vertexShader,shader.fragmentShader);
   shader.vertexShader=patched.vertexShader;
   shader.fragmentShader=patched.fragmentShader;
   Object.assign(shader.uniforms,{
    uTrackBase:{value:palette.base},
    uTrackBand:{value:palette.band},
    uTrackGuide:{value:palette.guide},
    uTrackAccent:{value:palette.accent},
    uTrackBoost:{value:palette.boost},
    ...waveUniforms
   });
 };
 mat.customProgramCacheKey=()=>PREMIUM_TRACK.version;
 return {material:mat,palette,
  setDetailMode(quality){
    waveUniforms.uWaveDetail.value=quality==="low"?0:1;
  },
  setVelocityFlow(intensity,phaseMeters){
    waveUniforms.uSpeedFlow.value=Math.max(0,Math.min(1,intensity));
    waveUniforms.uVelocityPhase.value=phaseMeters;
  },
  setWaveState(state){
    waveUniforms.uZoneActiveCount.value=state.activeCount;
    waveUniforms.uZoneTime.value=state.lastStepSeconds;
    for(let k=1;k<=3;k++)waveUniforms["uZoneFront"+k].value=state.fronts[k-1];
  },
  setPalette(next){
    for(const name of ["base","band","guide","accent","boost"]){
     if(next[name]!==undefined)palette[name].set(next[name]);
    }
  }};
}
