// SKYSHIFT 0.4.9.5 — Inertial Boost Camera & Speed Punch.
// Pure presentation state. The authoritative 120Hz ship/boost physics is untouched.
// Instead of switching the entire follow camera between slow/fast responses,
// a critically damped longitudinal spring gives one smooth outward impulse and
// continuous catch-up. Normal lateral/heading and look-target tracking stay fast.
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const BOOST_SPRING=Object.freeze({
 frequencyPerSecond:7.5,
 impulsePerDeltaSpeed:8.0,   // metres/s impulse per m/s eventual bonus
 anticipatoryFraction:.50,  // remaining half follows real boost acceleration
 maxVisualLagMeters:5.2,    // smooth tanh envelope: no hard stop or correction
 extraFovDegrees:3.7,
 maxFovDegrees:75.0,
 fovRiseResponse:13.0,
 fovFallResponse:5.5,
 maxFrameSeconds:.10
});
export function createBoostSpringState(){
 return {rawLagMeters:0,rawVelocityMetersPerSecond:0,
  lagMeters:0,previousExtraSpeed:0,trackingAcceleration:false,
  activations:0,maxLagMeters:0,peakFovBonusDegrees:0,
  lastKickMetersPerSecond:0};
}
// A *velocity* impulse at contact, not a position teleport. Its magnitude
// is determined by the REAL +40% speed budget. A second impulse component
// arrives across the actual 0.15s physical boost acceleration ramp.
export function triggerBoostSpring(state,baseSpeed,multiplier,config=BOOST_SPRING){
 const speedDelta=Math.max(0,finite(baseSpeed))*Math.max(0,finite(multiplier,1)-1);
 const kick=speedDelta*config.impulsePerDeltaSpeed*config.anticipatoryFraction;
 state.rawVelocityMetersPerSecond+=kick;
 state.lastKickMetersPerSecond=kick;
 state.previousExtraSpeed=0;
 state.trackingAcceleration=true;
 state.activations++;
 return state;
}
// Exact critically damped oscillator integration at any render FPS:
// x(t+h) = exp(-wh) * (x + (v + wx)h).
// The smooth envelope prevents a finite-distance hard clamp / snapping.
export function stepBoostSpring(state,dt,extraSpeed,config=BOOST_SPRING){
 const h=clamp(finite(dt),0,config.maxFrameSeconds);
 if(h<=0)return state.lagMeters;
 const speed=Math.max(0,finite(extraSpeed));
 if(state.trackingAcceleration){
  const rampDelta=Math.max(0,speed-state.previousExtraSpeed);
  state.rawVelocityMetersPerSecond+=rampDelta*config.impulsePerDeltaSpeed*
   (1-config.anticipatoryFraction);
  state.previousExtraSpeed=speed;
 }
 const w=config.frequencyPerSecond;
 const x=state.rawLagMeters,v=state.rawVelocityMetersPerSecond;
 const slope=v+w*x,decay=Math.exp(-w*h);
 state.rawLagMeters=Math.max(0,decay*(x+slope*h));
 state.rawVelocityMetersPerSecond=decay*(v-w*slope*h);
 state.lagMeters=config.maxVisualLagMeters*
  Math.tanh(state.rawLagMeters/config.maxVisualLagMeters);
 state.maxLagMeters=Math.max(state.maxLagMeters,state.lagMeters);
 if(speed<.015&&state.lagMeters<.008){
  state.trackingAcceleration=false;
  state.previousExtraSpeed=0;
 }
 if(state.lagMeters<.0001&&Math.abs(state.rawVelocityMetersPerSecond)<.001){
  state.rawLagMeters=0;
  state.rawVelocityMetersPerSecond=0;
  state.lagMeters=0;
 }
 return state.lagMeters;
}
export function boostFovTarget(baseFov,boostMultiplier,maxMultiplier=1.4,
 config=BOOST_SPRING){
 const bonusFraction=clamp(
  (finite(boostMultiplier,1)-1)/Math.max(.01,maxMultiplier-1),0,1);
 return Math.min(config.maxFovDegrees,
  finite(baseFov,65.4)+config.extraFovDegrees*bonusFraction);
}
export function boostFovResponse(currentFov,targetFov,config=BOOST_SPRING){
 return targetFov>currentFov?config.fovRiseResponse:config.fovFallResponse;
}
