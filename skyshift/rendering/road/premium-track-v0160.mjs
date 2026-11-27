// SKYSHIFT 0.8.4 — terrain-following Skyline Circuit spectral road in the SAME PBR road shader, zero extra meshes.
// Replaces 0.4.8's floating violet overlays and orange rectangle meshes.
// The same indexed physical road drives shader coordinates; NO new colliders,
// no new draw calls, no per-frame geometry, and no flashing textures.
import {TRIAL,widthAt} from "../../tracks/trials/trial-v0160.mjs";
import {ZONE_PALETTES,ZONE_WAVE,SPECTRAL_FRONT_GLSL} from "../../core/zone-wave-v060.mjs";
import {vaultSpatialWaveEnabled0285}
 from "../../tunnel/vault-spatial-wave-parity-v0285.mjs";
export const VAULT_WAVE_PARITY_0285_ACTIVE=vaultSpatialWaveEnabled0285();
import {vaultPolishEnabled02899} from "../../tracks/shared/production-catalog.mjs";
const VAULT_CLEAN_DECK_02899=vaultPolishEnabled02899(typeof location==="undefined"?"":location.search);
import {BOOST_PADS} from "../../flight/boost/boost-v0160.mjs";
import {RHYTHM_GATES_0160,VAULT_BOOST_0283_ACTIVE} from "../../flight/boost/risk-reward-v0160.mjs";
import {createSmoothDeckData,MESH_SPEC} from "../../tracks/shared/smooth-track-v0160.mjs";
import {createSmoothDeckBuilder} from "../../tracks/shared/smooth-deck.mjs";

export const PREMIUM_TRACK=Object.freeze({
 version:"track-rhythm-diversity-0151",
 material:"continuous-integrated-PBR",
 palette:"Nine synchronized color zones across 3 circuit laps",
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
export function premiumTrackCoordinates(route=null){
 // Historical callers retain their old source fixture. Live routes inject
 // their authoritative sampler, so road vertices and shader coordinates
 // cannot independently inherit an obsolete track width or gap.
 const data=route?createSmoothDeckBuilder(route).createSmoothDeckData():createSmoothDeckData();
 const track=route?.TRIAL??TRIAL,roadWidth=route?.widthAt??widthAt;
 const coords=[];
 for(let row=0;row<data.rows;row++){
  const s=row*track.length/(data.rows-1);
  const w=roadWidth(s);
  for(let column=0;column<data.cols;column++){
   const lane=w*(column/(data.cols-1)-.5);
   coords.push(s,lane);
  }
 }
 return {data,coords};
}
export function createPremiumDeckGeometry(THREE,route=null){
 const {data,coords}=premiumTrackCoordinates(route);
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
 id:p.id,kind:p.kind,group:p.group,start:p.start,end:p.end,
 min:p.lateralMin,max:p.lateralMax
}));
const glNumber=n=>Number(n).toFixed(3);
export const VAULT_BOOST_GLOW_0283=Object.freeze({
 version:"0.28.3",source:"original integrated native PBR racing deck",
 chevrons:"multi-layer embedded gold illuminated glyphs",
 bloomSource:"true emissive physical deck shader, no fake decals",
 noRiskLines:true,noRiskPads:true,
 noAdditionalMeshes:true,noAddedLights:true,
 mobileAndHighSameDesign:true,skylineShaderUnchanged:true
});
const shaderBoostPads=BOOST_PADS.map(p=>{
 const tag=p.id.replace(/-/g,"_"),center=(p.lateralMin+p.lateralMax)*.5;
 const half=(p.lateralMax-p.lateralMin)*.5;
 // The exact physical lateral bounds, including the right-hand risk lane.
 return `float boost_${tag} = trackWindow(trackS,${glNumber(p.start)},${glNumber(p.end)},1.2) *
    smoothstep(${glNumber(p.lateralMin-.25)},${glNumber(p.lateralMin+.10)},trackL) *
    (1.0-smoothstep(${glNumber(p.lateralMax-.10)},${glNumber(p.lateralMax+.25)},trackL));
   float arrow_${tag} = ${VAULT_BOOST_0283_ACTIVE?"vaultChevron0283":"trackChevron"}(trackS-${glNumber(p.start)},
      (trackL-(${glNumber(center)}))*${glNumber(2.6/half)}) * boost_${tag};`;
}).join("\n");
// Nest max() rather than emitting a two-argument-only expression so future
// pads cannot accidentally generate invalid GLSL in a zone expansion.
const shaderMax=(items)=>items.reduce((all,item)=>
  all?`max(${all}, ${item})`:item,"")||"0.0";
const boostAggregation=shaderMax(BOOST_PADS.map(p=>`boost_${p.id.replace(/-/g,"_")}`));
const arrowsAggregation=shaderMax(BOOST_PADS.map(p=>`arrow_${p.id.replace(/-/g,"_")}`));
// 0.28.3: halo follows exactly the working BOOST_PADS geometry. No
// fullscreen overlay or extra scene lights, and no risk-lane target.
const vaultHaloFields=VAULT_BOOST_0283_ACTIVE?BOOST_PADS.map(p=>{
 const tag=p.id.replace(/-/g,"_");
 const center=(p.lateralMin+p.lateralMax)*.5;
 const half=(p.lateralMax-p.lateralMin)*.5;
 return {tag,glsl:`float boostHalo_${tag}=trackChevronGlow0283(
    trackS-${glNumber(p.start)},(trackL-${glNumber(center)})*
    ${glNumber(2.6/half)})*boost_${tag};`};
}):[];
const vaultHaloGLSL=vaultHaloFields.map(x=>x.glsl).join("\n");
const vaultHaloAggregation=shaderMax(vaultHaloFields.map(x=>`boostHalo_${x.tag}`));
const vaultBoostVisualGLSL=VAULT_BOOST_0283_ACTIVE?`
  // Authored flat energy inlays with vivid chevron cores, broad warm
  // penumbrae and two subtle inset edges. Dark graphite between arrows.
  ${vaultHaloGLSL}
  float vaultHalo0283=${vaultHaloAggregation};
  float vaultRim0283=padCoverage*smoothstep(3.55,4.05,absL)*
    (1.0-smoothstep(4.22,4.58,absL));
  road=mix(road,vec3(.042,.039,.030),padCoverage*.53);
  road=mix(road,zoneBoost,clamp(boostArrows*.97+
    vaultHalo0283*.23+vaultRim0283*.58,0.0,1.0));`:
 "float vaultHalo0283=0.0; float vaultRim0283=0.0;";
const vaultBoostEmissionGLSL=VAULT_BOOST_0283_ACTIVE?
 " + zoneBoost*(boostArrows*1.55+vaultHalo0283*.46+vaultRim0283*.21+padCoverage*.035)":"";

const safePadAggregation=shaderMax(BOOST_PADS.filter(p=>p.kind!=="risk")
 .map(p=>`boost_${p.id.replace(/-/g,"_")}`));
const riskPadAggregation=shaderMax(BOOST_PADS.filter(p=>p.kind==="risk")
 .map(p=>`boost_${p.id.replace(/-/g,"_")}`));
const riskArrowAggregation=shaderMax(BOOST_PADS.filter(p=>p.kind==="risk")
 .map(p=>`arrow_${p.id.replace(/-/g,"_")}`));
const riskApproachAggregation=shaderMax(BOOST_PADS.filter(p=>p.kind==="risk")
 .map(p=>{
  const gate=RHYTHM_GATES_0160.find(g=>g.id===p.group);
  const center=(p.lateralMin+p.lateralMax)*.5;
  // Start markers only when the authored approach becomes drivable.
  // The post-leap guide starts AFTER the actual 606.6m air gap.
  const approach=gate?.approach??p.start-125;
  return `(trackWindow(trackS,${glNumber(approach)},${glNumber(p.start-9)},12.0) *
    trackStripe(trackL,${glNumber(center)},0.12,0.20) *
    (0.40+0.60*pow(0.5+0.5*sin(trackS*0.40),2.0)))`;
 }));


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
  `float wave${k}D = mod(waveTrack-uZoneFront${k}+0.5*uCircuitLength,uCircuitLength)-0.5*uCircuitLength;`,
  `float wave${k} = wave${k}On * (1.0-smoothstep(uZoneFeather*0.3,uZoneFeather*2.0,abs(wave${k}D)));`,
  // On VAULT v0.28.5 both the road and tunnel transition from old to
  // new palette BEHIND the same spatial front (66m feather), rather
  // than the old road switching its entire base color at the HUD stage.
  VAULT_WAVE_PARITY_0285_ACTIVE?
   `float wave${k}Color = wave${k}On * (1.0-smoothstep(${(-ZONE_WAVE.atmosphereTransitionMeters).toFixed(1)},${ZONE_WAVE.atmosphereTransitionMeters.toFixed(1)},wave${k}D));`:
   `float wave${k}Color = wave${k};`,
  ...zoneFields.map(field=>`zone${field} = mix(zone${field}, uZone${k}${field}, wave${k}Color);`),
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

// Wall rides and the corkscrew retain full magnetic attachment PHYSICS, but
// use the same understated racing lines as the rest of the track. No extra
// cyan magnetic stripes or corkscrew pulses compete with the driving line.
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
  vec3 road = ${VAULT_CLEAN_DECK_02899?"mix(vec3(.006,.008,.012),zoneBase,.08)":"mix(zoneBase, zoneBand, sideBand * (0.27 + 0.24 * flowZone))"};

  // Two primary white/cyan racing guides that follow ALL banked curves.
  float innerLine = trackStripe(absL, 4.0, 0.060, 0.105);
  float guideLine = trackStripe(absL, 8.8, 0.055, 0.105);
  float laneSpine = ${VAULT_BOOST_0283_ACTIVE?
   "0.0":"trackStripe(absL, 6.42, 0.018, 0.110)"};
  float guided = max(innerLine * 0.90, guideLine);
  road = mix(road, zoneGuide, guided * 0.94);
  road = mix(road, zoneAccent, laneSpine * 0.32);

  // Near-camera material texture: subdued 12m panels near shoulders, without
  // squares or repeated tiny "obstacles" across the racing line.
  float panelPeriod = mod(trackS, 12.0);
  float panelSeam = (1.0 - smoothstep(0.04, 0.26, min(panelPeriod, 12.0-panelPeriod)));
  float shoulderMask = smoothstep(8.7, 9.3, absL) * (1.0 - smoothstep(10.2, 10.8, absL));
  road = mix(road, zoneAccent, shoulderMask * panelSeam * ${VAULT_CLEAN_DECK_02899?"0.0":"0.10"});

  // Physical boost fields read as embedded ENERGY INLAYS, not raised golden
  // rectangles. Their functional world coordinates match boost-v048 exactly.
  ${shaderBoostPads}
  float padCoverage = ${boostAggregation};
  float boostArrows = ${arrowsAggregation};
  // Center SAFE line reads as soft amber; shoulder RISK line has a bright
  // white/cyan core and a 125m anticipatory lane guide. All integrated into
  // the existing PBR deck shader without new meshes or particle overlays.
  float safeCoverage = ${safePadAggregation};
  float riskCoverage = ${riskPadAggregation};
  float riskArrows = ${riskArrowAggregation};
  float riskLead = ${riskApproachAggregation};
  float insetGold = boostArrows*.86;
  road = mix(road,zoneBoost,safeCoverage*.32);
  road = mix(road,zoneBoost,insetGold*.86);
  road = mix(road,vec3(.84,.97,1.0),riskCoverage*.58);
  road = mix(road,vec3(.98,1.0,1.0),riskArrows*.95);
  road = mix(road,zoneAccent,riskLead*.65);
  ${vaultBoostVisualGLSL}
  // A subtle segmented CENTER SPINE. Eight meters of soft paint followed by
  // 3.5m of negative space: never a bright continuous 'runway' light.
  // It sits inside the existing PBR surface, and fades under boost inlays.
  float spinePhase = mod(trackS, 11.5);
  float spineDash = smoothstep(0.65, 1.35, spinePhase) *
      (1.0 - smoothstep(8.65, 9.45, spinePhase));
  float spineLane = 1.0 - smoothstep(0.045, 0.16, absL);
  float spine = ${VAULT_CLEAN_DECK_02899?"0.0":"spineLane * spineDash * (1.0 - padCoverage * 0.80)"};
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
uniform float uCircuitLength;
uniform float uZoneFeather;
uniform float uZoneTime;
uniform float uWaveDetail;
uniform float uSpeedFlow;
uniform float uVelocityPhase;
${zoneShaderDecl}${SPECTRAL_FRONT_GLSL}
float trackStripe(float x, float center, float thickness, float feather) {
  // Pixel footprint of lane coordinates grows rapidly toward the horizon.
  // Derivative-aware filtering gives distant subpixel guides a soft, stable
  // transition instead of flickering/crawling with the moving camera.
  float footprint = min(0.85, max(feather, 0.65 * fwidth(x)));
  return 1.0 - smoothstep(thickness, thickness + footprint, abs(x - center));
}
float trackWindow(float x, float from, float to, float feather) {
  return smoothstep(from, from+feather, x) * (1.0 - smoothstep(to-feather, to, x));
}
// Only compiled for the Vault 0.28.3 main-pad shader. The normal
// chevron is the sharp glyph; this larger derivative-safe band is
// warm bloom that remains physically integrated into the road surface.
${VAULT_BOOST_0283_ACTIVE?`float vaultChevron0283(float s,float lateral) {
  // Apex is FARTHER down the road than both arms: unmistakable
  // forward V-chevron, not horizontal bars on the runway.
  float phase=mod(s+0.45,7.60);
  float diagonal=abs(phase-(5.45-1.24*abs(lateral)));
  return (1.0-smoothstep(.12,.36,diagonal))*
     smoothstep(.02,.12,abs(lateral))*
     (1.0-smoothstep(2.12,2.65,abs(lateral)));
}
float trackChevronGlow0283(float s,float lateral) {
  float phase=mod(s+0.45,7.60);
  float diagonal=abs(phase-(5.45-1.24*abs(lateral)));
  return (1.0-smoothstep(.20,1.05,diagonal))*
     smoothstep(0.0,.33,abs(lateral))*
     (1.0-smoothstep(2.13,2.69,abs(lateral)));
}`:""}
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
      + zoneGuide*velocityGlint*.35
      + vec3(.62,.94,1.0)*riskLead*.09
      ${vaultBoostEmissionGLSL}
       ;`;
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
  uCircuitLength:{value:TRIAL.length},
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
    // One active moving world front, but eight historical palette shifts.
    // Rebase PBR material colors to the previous stage so new transitions
    // never stack dozens of shader waves, draw calls or uniforms.
    // A closed loop must NEVER leave a hard half-track palette boundary.
    // The completed zone colors the whole road; only a localized,
    // periodic white/color crest wraps around start/finish.
    const base=ZONE_PALETTES[VAULT_WAVE_PARITY_0285_ACTIVE?
     (state.shaderBaseStage??0):(state.playerStage??0)];
    for(const [field,key] of Object.entries(zoneFieldToColor))
      palette[key].set(base[key]);
    for(let k=1;k<=3;k++){
      const f=state.fronts[k-1];
      waveUniforms["uZoneFront"+k].value=((f%TRIAL.length)+TRIAL.length)%TRIAL.length;
      const idx=VAULT_WAVE_PARITY_0285_ACTIVE?
        Math.min(ZONE_PALETTES.length-1,(state.shaderBaseStage??0)+k):
        Math.max(state.playerStage??0,
         Math.min(ZONE_PALETTES.length-1,(state.shaderBaseStage??0)+k));
      const destination=ZONE_PALETTES[idx];
      for(const [field,key] of Object.entries(zoneFieldToColor))
        waveUniforms["uZone"+k+field].value.set(destination[key]);
    }
  },
  setPalette(next){
    for(const name of ["base","band","guide","accent","boost"]){
     if(next[name]!==undefined)palette[name].set(next[name]);
    }
  }};
}
