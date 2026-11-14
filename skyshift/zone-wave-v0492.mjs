// SKYSHIFT 0.4.9.2 — Three deterministic, time-triggered *behind-to-ahead*
// color fronts. Simulation clock comes from the fixed 120Hz flight state;
// neither render frame rate nor camera motion schedules the waves.
export const ZONE_WAVE=Object.freeze({
 firstSeconds:10,intervalSeconds:10,triggers:[10,20,27],
 behindMeters:90,frontMetersPerSecond:114,
 featherMeters:24,stages:4,fronts:3,
 crestMeters:4.5,afterglowMeters:62,resonanceSeconds:.62,
 whiteCoreMeters:5.6,whiteBloomMeters:19,
 filamentRangeMeters:19,filamentIntensity:.17,
 whiteCoreEnergy:1.52,whiteBloomEnergy:.46,
 horizonCueMeters:135,
 chargingSeconds:.19,atmosphereTransitionMeters:66,
 direction:"behind-to-ahead",screenFlash:false,
 shaderUniformOnly:true
});
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
  sky:0x061d22,fog:0x092a26,light:0x9ae765})
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
// The wide shoulder is visible at 20-30 FPS; the centre peaks over 11.2m.
float spectralWhiteCore(float signedDistance) {
  return 1.0-smoothstep(1.25,5.6,abs(signedDistance));
}
float spectralWhiteBloom(float signedDistance) {
  return 1.0-smoothstep(4.2,19.0,abs(signedDistance));
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
export function frontPaletteBlend(state,playerS){
 // Environment follows a wide spatial zone transition, never snaps as the
 // old hard 0.4.9 HUD stage changes. Returns [oldIndex,newIndex,mix] data.
 let from=0,to=0,factor=0;
 for(let i=0;i<state.activeCount;i++){
  const signed=playerS-state.fronts[i];
  const strength=1-smooth((signed+ZONE_WAVE.atmosphereTransitionMeters)/
    (2*ZONE_WAVE.atmosphereTransitionMeters));
  if(strength>0){from=i;to=i+1;factor=strength;}
 }
 return {from,to,mix:factor};
}
// Anticipation cue in the existing two engine lights 0.19s before a wave.
// Independent of wall-clock, game progression and the high-cost HDR pipeline.
export function spectralChargeStrength(elapsedSeconds){
 for(const trigger of ZONE_WAVE.triggers){
  const remaining=trigger-elapsedSeconds;
  if(remaining>0&&remaining<=ZONE_WAVE.chargingSeconds)
   return smooth(1-remaining/ZONE_WAVE.chargingSeconds);
 }
 return 0;
}
// Cinematic glow under the track horizon, without any full-screen flash.
export function horizonWaveCue(state,playerS){
 if(!state.activeCount)return 0;
 let strength=0;
 for(let i=0;i<state.activeCount;i++){
  const ahead=state.fronts[i]-playerS;
  const a=Math.max(0,Math.min(1,1-ahead/ZONE_WAVE.horizonCueMeters));
  if(ahead>=0&&a<=1)strength=Math.max(strength,a*a*(3-2*a));
 }
 return strength;
}
export function waveResonanceStrength(state,elapsedSeconds){
 const last=state.stageTransitionSeconds.at(-1);
 if(!Number.isFinite(last))return 0;
 return 1-smooth((elapsedSeconds-last)/ZONE_WAVE.resonanceSeconds);
}
export function newZoneWaveState(){
 return {activeCount:0,
  waves:[],fronts:[-10000,-10000,-10000],
  activatedStages:[],passedStages:[],
  playerStage:0,stageTransitionSeconds:[],
  triggers:ZONE_WAVE.triggers.slice(),
  lastStepSeconds:0};
}
export function stageAtS(state,s){
 let stage=0;
 for(let i=0;i<state.waves.length;i++)
  if(s<=state.fronts[i]+1e-8)stage=i+1;
 return stage;
}
export function updateZoneWave(state,elapsedSeconds,playerS){
 if(!Number.isFinite(elapsedSeconds)||!Number.isFinite(playerS))
  throw new Error("Non-finite SKYSHIFT wave position/time");
 // Each wave begins 90m behind the player at the scheduled 10/20/27 s.
 // Once spawned it advances at constant world ARC LENGTH, never recentered
 // on the player (no screen-space wipe or frame-step drifting).
 const started=[];
 for(let i=state.waves.length;i<ZONE_WAVE.triggers.length;i++){
  const when=ZONE_WAVE.triggers[i];
  if(elapsedSeconds+1e-8<when)break;
  const wave={index:i+1,atSeconds:when,
   startS:playerS-ZONE_WAVE.behindMeters};
  state.waves.push(wave);state.activatedStages.push(wave.index);
  started.push(wave.index);
 }
 for(let i=0;i<state.waves.length;i++){
  const wave=state.waves[i];
  state.fronts[i]=wave.startS+
   Math.max(0,elapsedSeconds-wave.atSeconds)*ZONE_WAVE.frontMetersPerSecond;
 }
 state.activeCount=state.waves.length;
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
