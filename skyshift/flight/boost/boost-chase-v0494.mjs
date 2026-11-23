// SKYSHIFT 0.4.9.4 — visual-only boost camera catch-up.
// Boost alters the authoritative speed in boost-v0494; this controller
// NEVER changes flight state, heading, collision, or the physical path.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const BOOST_CHASE=Object.freeze({
 lagSeconds:.36,
 recoverySeconds:.52,
 lagResponse:2.8,
 recoveryResponse:13.8,
 maxTrailingMeters:10.0,
 maxFrameSeconds:.05
});
export function createBoostChaseState(){
 return {lagRemaining:0,recoveryRemaining:0,activations:0,
  maxTrailingMeters:0,lastResponse:0};
}
export function onBoostChase(state){
 state.lagRemaining=BOOST_CHASE.lagSeconds;
 state.recoveryRemaining=BOOST_CHASE.recoverySeconds;
 state.activations++;
 return state;
}
// The camera initially falls behind the suddenly faster ship, then catches up.
// Use exponential response, not per-frame linear interpolation, so the
// animation stays consistent across 30/60/120 FPS and low-FPS Android.
export function cameraBoostResponse(state,dt,normalResponse){
 const step=clamp(Number.isFinite(dt)?dt:0,0,BOOST_CHASE.maxFrameSeconds);
 let response=normalResponse;
 if(state.lagRemaining>0){
  response=BOOST_CHASE.lagResponse;
  state.lagRemaining=Math.max(0,state.lagRemaining-step);
 }else if(state.recoveryRemaining>0){
  response=BOOST_CHASE.recoveryResponse;
  state.recoveryRemaining=Math.max(0,state.recoveryRemaining-step);
 }
 state.lastResponse=response;
 return response;
}
// Soft safety envelope in the ship's forward axis: never let boost-lag
// lose the track/ship at speed. Leave lateral turning follow untouched.
export function capCameraBoostTrail(camera,target,heading,state){
 const fx=Math.sin(heading),fz=-Math.cos(heading);
 const behind=(target.x-camera.x)*fx+(target.z-camera.z)*fz;
 const trailing=Math.max(0,behind);
 state.maxTrailingMeters=Math.max(state.maxTrailingMeters,
  Math.min(trailing,BOOST_CHASE.maxTrailingMeters));
 if(trailing>BOOST_CHASE.maxTrailingMeters){
  const correction=trailing-BOOST_CHASE.maxTrailingMeters;
  camera.x+=fx*correction;camera.z+=fz*correction;
 }
 return camera;
}
