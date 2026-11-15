// SKYSHIFT 0.8.4 – Pilot-owned precision grip, deterministic and renderer-neutral.
// Hold GRIP + steer: full-carve 1.55× reference yaw authority at modest speed cost.
// Normal steering now has a separate speed-shaped limit (steering-authority-v084).
// On-ground GRIP responds in 85ms with no input lag or hidden autopilot.
// Grip never steers for the player, never snaps the craft to a track heading.
export const GRIP_SPEC=Object.freeze({
 version:"precision-grip-084",
 yawMultiplier:1.55,
 maxSpeedPenalty:.065,
 attackSeconds:.085,
 releaseSeconds:.14,
 minSteer:.12,
 noAutoSteer:true,
 requiresSteering:true,
 newLights:0,
 newParticles:0
});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function initGripState(state){
 return Object.assign(state,{
  gripIntensity:0,gripDirection:0,gripActive:false,gripHeldActive:false,
  gripActivations:0,gripActiveSeconds:0,gripDistanceMeters:0,
  gripPeakIntensity:0,gripPeakYawDeg:0,gripSpeedLossMeters:0
 });
}
export function stepGripState(state,dt,steer,held,grounded=true){
 const h=clamp(Number.isFinite(dt)?dt:0,0,.05);
 const input=clamp(Number.isFinite(steer)?steer:0,-1,1);
 const valid=Boolean(held)&&grounded&&Math.abs(input)>=GRIP_SPEC.minSteer;
 const target=valid?1:0;
 const tau=target>state.gripIntensity?
  GRIP_SPEC.attackSeconds:GRIP_SPEC.releaseSeconds;
 const response=h?1-Math.exp(-h/tau):0;
 state.gripIntensity=clamp(state.gripIntensity+(target-state.gripIntensity)*response,0,1);
 if(state.gripIntensity<.0005&&!valid)state.gripIntensity=0;
 const activated=valid&&!state.gripHeldActive;
 if(activated)state.gripActivations++;
 state.gripHeldActive=valid;
 state.gripActive=valid;
 if(valid)state.gripDirection=Math.sign(input);
 else if(!state.gripIntensity)state.gripDirection=0;
 if(valid)state.gripActiveSeconds+=h;
 state.gripPeakIntensity=Math.max(state.gripPeakIntensity,state.gripIntensity);
 const authority=1+(GRIP_SPEC.yawMultiplier-1)*state.gripIntensity;
 const penalty=GRIP_SPEC.maxSpeedPenalty*state.gripIntensity*
  Math.min(1,Math.abs(input));
 const speedScale=1-penalty;
 return {active:valid,activated,authority,speedScale,
  intensity:state.gripIntensity,direction:state.gripDirection,
  speedPenalty:penalty};
}
