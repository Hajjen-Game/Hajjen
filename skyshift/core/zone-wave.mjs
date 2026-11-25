// Curated contrast pairs from Chroma Rush's spectral palette language.
// Dark satin road base + vivid accents; guides stay near-neutral for safety.
// These are SKYSHIFT-specific material tones, not raw 2D neon fills.
export const ZONE_PALETTES=Object.freeze([
 Object.freeze({id:"midnight",name:"MIDNIGHT",
  base:0x0a3858,band:0x225e79,guide:0xd3f6f7,
  accent:0x3feeff,boost:0xffbc67,
  sky:0x04132a,fog:0x07162a,light:0x3feeff}),
 Object.freeze({id:"violet",name:"ELECTRIC VIOLET",
  base:0x46266c,band:0x75409b,guide:0xf0e5ff,
  accent:0xe265ff,boost:0xffc579,
  sky:0x120b2e,fog:0x1b1038,light:0xc67aff}),
 Object.freeze({id:"solar",name:"SOLAR GOLD",
  base:0x843b27,band:0xb25c32,guide:0xffedcf,
  accent:0xffe067,boost:0xffb75b,
  sky:0x25131d,fog:0x301b19,light:0xffc45a}),
 Object.freeze({id:"jade",name:"JADE SURGE",
  base:0x13443e,band:0x276b52,guide:0xe6fff0,
  accent:0xb6ff4e,boost:0xffc773,
  sky:0x061d22,fog:0x092a26,light:0x9ae765}),
 Object.freeze({id:"ember",name:"EMBER DRIVE",
  base:0x623347,band:0x964462,guide:0xffe4e9,
  accent:0xff6b86,boost:0xffbc63,
  sky:0x1c0c22,fog:0x280e28,light:0xff769a}),
 Object.freeze({id:"glacier",name:"GLACIER FLOW",
  base:0x184e6f,band:0x276f89,guide:0xe6faff,
  accent:0x5fe4ff,boost:0xffbf78,
  sky:0x061e35,fog:0x09263f,light:0x7be8ff}),
 Object.freeze({id:"copper",name:"COPPER BURST",
  base:0x68412b,band:0x93634a,guide:0xffefd6,
  accent:0xffa565,boost:0xffd37f,
  sky:0x251218,fog:0x301d18,light:0xffbc76}),
 Object.freeze({id:"prism",name:"PRISM TIDE",
  base:0x273a70,band:0x395d96,guide:0xe2eaff,
  accent:0x8d9eff,boost:0xffca79,
  sky:0x0a1333,fog:0x0f1c44,light:0xb3a5ff}),
 Object.freeze({id:"aurora",name:"AURORA FINALE",
  base:0x174a50,band:0x2b7174,guide:0xdffcf9,
  accent:0x65f4bc,boost:0xffc274,
  sky:0x051c28,fog:0x0a2d34,light:0x7effcf})
]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>{const x=clamp(t,0,1);return x*x*(3-2*x);};
// In road/rail shader the same lateral shimmer advances the SAME physical
// front. No independently travelling light object or second wave timer.
export const SPECTRAL_FRONT_GLSL=`
float spectralWaveOffset(float longitudinal, float lateral, float time) {
  return longitudinal + 1.4*sin(lateral*0.38 + time*7.2) +
    0.75*sin(lateral*0.78-time*5.2);
}
float spectralCore(float signedDistance) {
  return 1.0-smoothstep(0.55,4.5,abs(signedDistance));
}
float spectralHalo(float signedDistance) {
  return 1.0-smoothstep(3.0,28.0,abs(signedDistance));
}
float spectralAfterglow(float signedDistance) {
  // Energized road BEHIND the wave: signed distance is negative.
  return smoothstep(-65.0,-12.0,signedDistance) *
    (1.0-smoothstep(-12.0,0.0,signedDistance));
}
// A distinct NEUTRAL WHITE pulse, deliberately not the zone accent color.
// Narrow 5.8m neutral seam with a soft 28m bloom: no white wall.
float spectralWhiteCore(float signedDistance) {
  return 1.0-smoothstep(0.7,2.9,abs(signedDistance));
}
float spectralWhiteBloom(float signedDistance) {
  return 1.0-smoothstep(2.6,14.0,abs(signedDistance));
}
// Sparse moving strands, attached to the SAME spatial front. The positive
// quality test lives in the shader so low-tier GPU can skip this branch.
float spectralFilaments(float signedDistance,float lateral,float time,float detail) {
  if (detail < 0.5) return 0.0;
  float inside=1.0-smoothstep(6.0,19.0,abs(signedDistance));
  float streak=sin(lateral*1.19+time*3.1+sin(lateral*.29)*1.7);
  return inside*smoothstep(0.88,0.99,streak)*0.64;
}
`;
// Bind the unchanged wave algorithm to an explicit timing/velocity configuration.
export function createZoneWaveAPI(ZONE_WAVE){
function frontPaletteBlend(state,playerS){
 // Only the most recent spatial front is rendered. Earlier fronts are kept
 // in the audit, but must never re-color the upcoming course out of order.
 if(!state.waves.length)return {from:0,to:0,mix:0};
 const stage=state.waves.at(-1).index;
 const signed=playerS-state.fronts[0];
 const mix=1-smooth((signed+ZONE_WAVE.atmosphereTransitionMeters)/
  (2*ZONE_WAVE.atmosphereTransitionMeters));
 return {from:stage-1,to:stage,mix};
}
// Anticipation cue in the existing two engine lights 0.19s before a wave.
// Independent of wall-clock, game progression and the high-cost HDR pipeline.
function spectralChargeStrength(elapsedSeconds){
 for(const trigger of ZONE_WAVE.triggers){
  const remaining=trigger-elapsedSeconds;
  if(remaining>0&&remaining<=ZONE_WAVE.chargingSeconds)
   return smooth(1-remaining/ZONE_WAVE.chargingSeconds);
 }
 return 0;
}
// Cinematic glow under the track horizon, without any full-screen flash.
function horizonWaveCue(state,playerS){
 if(!state.activeCount)return 0;
 let strength=0;
 for(let i=0;i<state.activeCount;i++){
  const ahead=state.fronts[i]-playerS;
  const a=Math.max(0,Math.min(1,1-ahead/ZONE_WAVE.horizonCueMeters));
  if(ahead>=0&&a<=1)strength=Math.max(strength,a*a*(3-2*a));
 }
 return strength;
}
function waveResonanceStrength(state,elapsedSeconds){
 const last=state.stageTransitionSeconds.at(-1);
 if(!Number.isFinite(last))return 0;
 return 1-smooth((elapsedSeconds-last)/ZONE_WAVE.resonanceSeconds);
}
function newZoneWaveState(){
 return {activeCount:0,shaderBaseStage:0,
  waves:[],fronts:[-10000,-10000,-10000],
  activatedStages:[],passedStages:[],
  playerStage:0,stageTransitionSeconds:[],
  triggers:ZONE_WAVE.triggers.slice(),
  lastStepSeconds:0};
}
function stageAtS(state,s){
 if(!state.waves.length)return 0;
 const current=state.waves.at(-1);
 return s<=state.fronts[0]+1e-8?current.index:current.index-1;
}
function updateZoneWave(state,elapsedSeconds,playerS){
 if(!Number.isFinite(elapsedSeconds)||!Number.isFinite(playerS))
  throw new Error("Non-finite SKYSHIFT wave position/time");
 // Use fixed simulation time and current playerS at launch, then advance a
 // genuine world-space front faster than the fastest boosted player.
 const started=[];
 for(let i=state.waves.length;i<ZONE_WAVE.triggers.length;i++){
  const when=ZONE_WAVE.triggers[i];
  if(elapsedSeconds+1e-8<when)break;
  const wave={index:i+1,atSeconds:when,
   startS:playerS-ZONE_WAVE.behindMeters};
  state.waves.push(wave);state.activatedStages.push(wave.index);
  started.push(wave.index);
 }
 const latest=state.waves.at(-1);
 if(latest){
  state.shaderBaseStage=latest.index-1;
  state.fronts[0]=latest.startS+
   Math.max(0,elapsedSeconds-latest.atSeconds)*ZONE_WAVE.frontMetersPerSecond;
  state.fronts[1]=-10000;state.fronts[2]=-10000;
  state.activeCount=1;
 }
 const stage=stageAtS(state,playerS);
 const changed=stage!==state.playerStage;
 if(changed){
  state.playerStage=stage;
  state.passedStages.push(stage);
  state.stageTransitionSeconds.push(+elapsedSeconds.toFixed(3));
 }
 state.lastStepSeconds=elapsedSeconds;
 return {started,changed,stage,
  activeCount:state.activeCount,fronts:state.fronts};
}

 return {frontPaletteBlend,spectralChargeStrength,horizonWaveCue,waveResonanceStrength,newZoneWaveState,stageAtS,updateZoneWave};
}
