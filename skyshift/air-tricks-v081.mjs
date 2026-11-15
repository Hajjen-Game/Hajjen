// SKYSHIFT 0.8.1 — GRIP Side-Thruster Air Roll & Elevated Leap. Pure 120Hz deterministic state.
// GRIP + steer during a genuine ballistic leap; never an automatic roll.
// Rotations are visual-only. A landing boost is awarded only after a FULL,
// controlled 360-degree rotation and a clean, aligned touchdown.
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const AIR_TRICKS=Object.freeze({
 version:"grip-air-tricks-v081",
 minimumSteer:.20,rollSpeedRadiansPerSecond:11.8,
 fullRollRadians:TAU,oneTrickPerLeap:true,
 yawAuthorityWhileTricking:.065,
 maxLandingHeadingErrorDegrees:14,
 maxLandingImpactMetersPerSecond:18,
 maxLandingLateralRatio:.90,
 landingBoostPercent:22,
 landingBoostDurationSeconds:1.45,
 landingBoostAttackSeconds:.10,
 landingBoostFadeSeconds:.43,
 landingBoostSpeedCapMultiplier:1.55,
 airborneOnly:true,gripIsTrickButton:true,noAutomaticReward:true,
 additionalGeometry:0,additionalLights:0,additionalDrawCalls:0
});
export function initAirTrickState(state){
 return Object.assign(state,{
  trickActive:false,trickDirection:0,trickAngle:0,trickReady:false,
  trickVisualAngle:0,trickAttempts:0,trickFullRotations:0,
  trickQualifiedLandings:0,trickRejectedLandings:0,
  trickAirSeconds:0,trickPeakDegrees:0,
  lastTrickResult:"none",lastTrickFailReason:null,
  trickRailContactsAtLaunch:0,trickLaunchLap:0,
  landingBoostTimer:0,landingBoostElapsed:0,landingBoostMultiplier:1,
  landingBoostActivations:0,landingBoostSeconds:0,
  landingBoostDistanceMeters:0,landingBoostPeakMultiplier:1
 });
}
export function beginAirTrick(state,lap){
 state.trickActive=false;state.trickDirection=0;state.trickAngle=0;
 state.trickReady=false;state.trickVisualAngle=0;
 state.trickRailContactsAtLaunch=state.railContacts;
 state.trickLaunchLap=lap;state.lastTrickResult="none";
 state.lastTrickFailReason=null;
}
export function advanceAirTrick(state,dt,steer,held){
 if(!held||state.grounded||!state.trickLaunchLap||
     state.trickReady||!Number.isFinite(dt)||dt<=0)return {started:false,completed:false};
 const magnitude=Math.abs(steer);
 if(magnitude<AIR_TRICKS.minimumSteer)return {started:false,completed:false};
 const direction=Math.sign(steer);
 let started=false,completed=false;
 if(!state.trickActive){
  state.trickActive=true;state.trickDirection=direction;
  state.trickAttempts++;started=true;
 }
 // Direction is locked until touchdown. Reversing can't instantly produce
 // a free second trick or undo the rotation.
 if(direction!==state.trickDirection)return {started,completed};
 state.trickAirSeconds+=dt;
 const speed=AIR_TRICKS.rollSpeedRadiansPerSecond*
  (.86+.14*clamp((magnitude-AIR_TRICKS.minimumSteer)/
    (1-AIR_TRICKS.minimumSteer),0,1));
 state.trickAngle=Math.min(TAU,state.trickAngle+speed*dt);
 state.trickVisualAngle=state.trickDirection*state.trickAngle;
 state.trickPeakDegrees=Math.max(state.trickPeakDegrees,state.trickAngle*180/Math.PI);
 if(state.trickAngle>=TAU-1e-8){
  state.trickReady=true;state.trickFullRotations++;completed=true;
 }
 return {started,completed};
}
export function finalizeAirTrick(state,{lap,impact,headingErrorDeg,lateralLimit,grounded,railContact}){
 if(!state.trickLaunchLap||state.trickLaunchLap!==lap)return {awarded:false,reason:"not-a-leap"};
 let reason="incomplete";
 if(state.trickReady){
  if(!grounded)reason="not-grounded";
  else if(railContact||state.railContacts>state.trickRailContactsAtLaunch)reason="rail-contact";
  else if(Math.abs(headingErrorDeg)>AIR_TRICKS.maxLandingHeadingErrorDegrees)reason="heading";
  else if(Math.abs(state.lateral)>lateralLimit*AIR_TRICKS.maxLandingLateralRatio)reason="edge";
  else if(impact>AIR_TRICKS.maxLandingImpactMetersPerSecond)reason="hard-impact";
  else reason="clean";
 }
 const awarded=reason==="clean";
 if(state.trickActive){
  if(awarded)state.trickQualifiedLandings++;
  else state.trickRejectedLandings++;
 }
 state.lastTrickResult=awarded?"perfect":state.trickActive?"miss":"none";
 state.lastTrickFailReason=awarded?null:reason;
 state.trickActive=false;state.trickLaunchLap=0;
 if(awarded){
  state.landingBoostActivations++;
  state.landingBoostTimer=AIR_TRICKS.landingBoostDurationSeconds;
  state.landingBoostElapsed=0;
 }
 return {awarded,reason,attempted:state.trickDirection!==0};
}
export function stepLandingBoost(state,dt,baseSpeed){
 const t=clamp(dt,0,.1);
 if(state.landingBoostTimer>0){
  state.landingBoostTimer=Math.max(0,state.landingBoostTimer-t);
  state.landingBoostElapsed+=t;
 }
 const attack=clamp(state.landingBoostElapsed/
  AIR_TRICKS.landingBoostAttackSeconds,0,1);
 const fade=clamp(state.landingBoostTimer/
  AIR_TRICKS.landingBoostFadeSeconds,0,1);
 // Soft power rise and fade; preserves existing track-pad boost envelopes.
 state.landingBoostMultiplier=1+AIR_TRICKS.landingBoostPercent/100*
  attack*fade;
 if(state.landingBoostTimer<=0)state.landingBoostMultiplier=1;
 const before=state.currentSpeed;
 state.currentSpeed=Math.min(baseSpeed*AIR_TRICKS.landingBoostSpeedCapMultiplier,
  before*state.landingBoostMultiplier);
 state.peakSpeed=Math.max(state.peakSpeed??0,state.currentSpeed);
 state.landingBoostPeakMultiplier=Math.max(state.landingBoostPeakMultiplier,
  state.landingBoostMultiplier);
 if(state.landingBoostMultiplier>1.01){
  state.landingBoostSeconds+=t;
  state.landingBoostDistanceMeters+=state.currentSpeed*t;
 }
 return state.landingBoostMultiplier;
}
export function settleTrickVisual(state,dt){
 if(!state.grounded)return state.trickVisualAngle;
 const target=Math.round(state.trickVisualAngle/TAU)*TAU;
 state.trickVisualAngle+=(target-state.trickVisualAngle)*
  (1-Math.exp(-dt*15));
 if(Math.abs(target-state.trickVisualAngle)<.002)
  state.trickVisualAngle=0; // 0 and ±2π have identical orientation
 return state.trickVisualAngle;
}
