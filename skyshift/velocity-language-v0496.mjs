// SKYSHIFT 0.4.9.6 — shared visual velocity language.
// Presentation-only; never writes the pilot's 120Hz movement or boost physics.
export const VELOCITY_SPEC=Object.freeze({
 physicalBoostMultiplier:1.40,
 attackResponse:14,
 releaseResponse:5.8,
 ignitionDecaySeconds:.19,
 maxHullRecoilMeters:.26,
 maxNosePitchRadians:.028,
 roadFlowGain:.94,
 maxWorldFlow:1,
 flowPhaseSpeedGain:.85,
 extraDrawCalls:0,
 extraDynamicLights:0
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,otherwise=0)=>Number.isFinite(x)?x:otherwise;
export function createVelocityState(){
 return {
  flow:0,worldFlow:0,engineFlow:0,ignition:0,
  recoilMeters:0,pitchRadians:0,flowPhaseMeters:0,
  activations:0,peakWorldFlow:0,peakEngineFlow:0,
  peakRecoilMeters:0,peakPitchDegrees:0
 };
}
export function igniteVelocity(state){
 state.ignition=1;
 state.activations++;
 return state;
}
export function stepVelocityState(state,dt,currentSpeed,baseSpeed,boostMultiplier,
 settings=VELOCITY_SPEC){
 const h=clamp(finite(dt),0,.1);
 if(h<=0)return state;
 const boosted=clamp((finite(boostMultiplier,1)-1)/
  (settings.physicalBoostMultiplier-1),0,1);
 // The physical exponential speed curve is authoritative. This filter only
 // adds visual easing and a short recoil, never invents more forward speed.
 const response=boosted>state.flow?settings.attackResponse:settings.releaseResponse;
 state.flow+=(boosted-state.flow)*(1-Math.exp(-response*h));
 state.ignition*=Math.exp(-h/settings.ignitionDecaySeconds);
 if(state.ignition<.0001)state.ignition=0;
 state.worldFlow=clamp(state.flow*settings.roadFlowGain+
  state.ignition*.13,0,settings.maxWorldFlow);
 state.engineFlow=clamp(state.flow*.92+state.ignition*.34,0,1);
 state.recoilMeters=settings.maxHullRecoilMeters*
  (state.ignition*.82+state.flow*.18);
 state.pitchRadians=settings.maxNosePitchRadians*
  (state.ignition*.95-state.flow*.30);
 // Arc-length phase travels at true speed even while its emissive gain is zero;
 // no jump in stripe position if a pad is hit near a zone change.
 const speed=Math.max(0,finite(currentSpeed));
 const base=Math.max(0,finite(baseSpeed));
 state.flowPhaseMeters+=h*(base+Math.max(0,speed-base)*
  settings.flowPhaseSpeedGain);
 state.peakWorldFlow=Math.max(state.peakWorldFlow,state.worldFlow);
 state.peakEngineFlow=Math.max(state.peakEngineFlow,state.engineFlow);
 state.peakRecoilMeters=Math.max(state.peakRecoilMeters,state.recoilMeters);
 state.peakPitchDegrees=Math.max(state.peakPitchDegrees,
  Math.abs(state.pitchRadians)*180/Math.PI);
 return state;
}
