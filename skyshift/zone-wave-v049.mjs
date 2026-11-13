// SKYSHIFT 0.4.9 — Three deterministic, time-triggered *behind-to-ahead*
// color fronts. Simulation clock comes from the fixed 120Hz flight state;
// neither render frame rate nor camera motion schedules the waves.
export const ZONE_WAVE=Object.freeze({
 firstSeconds:10,intervalSeconds:10,triggers:[10,20,30],
 behindMeters:90,frontMetersPerSecond:114,
 featherMeters:6,stages:4,fronts:3,
 direction:"behind-to-ahead",screenFlash:false,
 shaderUniformOnly:true
});
export const ZONE_PALETTES=Object.freeze([
 Object.freeze({id:"midnight",name:"MIDNIGHT",
  base:0x245b69,band:0x2a94a1,guide:0xc2f8f5,
  accent:0x6be5f0,boost:0xf8b65b,
  sky:0x04132a,fog:0x07162a,light:0x43ddf0}),
 Object.freeze({id:"violet",name:"VIOLET VELOCITY",
  base:0x4b347f,band:0x9653b7,guide:0xe8d5fc,
  accent:0xd77bfa,boost:0xf8bb75,
  sky:0x120b31,fog:0x1c103a,light:0xc17afd}),
 Object.freeze({id:"solar",name:"SOLAR FLARE",
  base:0x8b3156,band:0xe27253,guide:0xffd5bd,
  accent:0xff8d80,boost:0xffd07b,
  sky:0x251129,fog:0x331424,light:0xff9479}),
 Object.freeze({id:"arctic",name:"ARCTIC FLOW",
  base:0x1a6873,band:0x69b5b7,guide:0xf0ffff,
  accent:0xaff9ed,boost:0xffc783,
  sky:0x071e32,fog:0x0b2633,light:0x8fe6ea})
]);
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
 // Each wave begins 90m behind the player at the scheduled 10/20/30 s.
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
