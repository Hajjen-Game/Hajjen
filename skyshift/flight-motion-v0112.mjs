// SKYSHIFT 0.11.2 — 3 analytical motion springs update in-place, identical motion response.
// SKYSHIFT 0.4.4 — frame-rate-independent visual flight dynamics.
// Does not modify authoritative pilot steering, collision or track pose.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,otherwise=0)=>Number.isFinite(x)?x:otherwise;
const RAD=Math.PI/180;
export const MOTION_DEFAULTS=Object.freeze({
 pilotBankDegrees:19,roadBankInfluence:.78,
 bankResponse:15,bankRecovery:10,pitchResponse:10,
 hoverTravelMeters:.11,hoverResponse:8,
 cameraYawResponse:9,cameraFollowResponse:10,cameraTiltGain:.045,
 cameraDistance:15.2,cameraLookAhead:39
});
export function dampedSpring(x,v,target,omega,dt){
 // Analytical critically-damped spring, stable at 20–120fps.
 const t=clamp(finite(dt),0,.1),w=Math.max(.01,finite(omega,10));
 const delta=x-target,temp=(v+w*delta)*t,decay=Math.exp(-w*t);
 return {position:target+(delta+temp)*decay,velocity:(v-w*temp)*decay};
}
export function followAngle(from,to,response,dt){
 const delta=Math.atan2(Math.sin(to-from),Math.cos(to-from));
 return from+delta*(1-Math.exp(-Math.max(0,response)*Math.max(0,dt)));
}
export function createFlightMotionState(heading=0){
 return {roll:0,rollVelocity:0,pitch:0,pitchVelocity:0,
  hover:0,hoverVelocity:0,cameraHeading:heading,cameraRoll:0,
  maxVisualBankDegrees:0,maxVisualPitchDegrees:0,maxHoverMeters:0};
}
// Allocation-free variant of dampedSpring with the same closed-form math.
// Kept separate because the exported pure helper remains a public test API.
function springInto(st,key,velocityKey,target,omega,dt){
 const t=clamp(finite(dt),0,.1),w=Math.max(.01,finite(omega,10));
 const x=st[key],v=st[velocityKey],delta=x-target;
 const temp=(v+w*delta)*t,decay=Math.exp(-w*t);
 st[key]=target+(delta+temp)*decay;
 st[velocityKey]=(v-w*temp)*decay;
}
export function stepFlightMotion(state,pose,dt,time,settings=MOTION_DEFAULTS){
 const delta=clamp(finite(dt),0,.05);
 if(!pose||!delta)return state;
 const steer=clamp(finite(pose.steering),-1,1);
 const steerBank=Math.sign(steer)*Math.sqrt(Math.abs(steer));
 const bankTarget=clamp(
  -finite(pose.trackBank)*settings.roadBankInfluence
  -steerBank*settings.pilotBankDegrees*RAD,-.58,.58);
 const bankSpeed=Math.abs(bankTarget)>Math.abs(state.roll)?
  settings.bankResponse:settings.bankRecovery;
 springInto(state,"roll","rollVelocity",bankTarget,bankSpeed,delta);
 const turnLoad=clamp(Math.abs(finite(pose.yawRate))/1.24,0,1);
 const sideLoad=clamp(Math.abs(finite(pose.sideVelocity))/16,0,1);
 const hoverTarget=clamp(
  Math.sin(finite(time)*2.7)*.012-turnLoad*.052-sideLoad*.014,
  -settings.hoverTravelMeters,settings.hoverTravelMeters);
 springInto(state,"hover","hoverVelocity",hoverTarget,settings.hoverResponse,delta);
 state.hover=clamp(state.hover,-settings.hoverTravelMeters,
  settings.hoverTravelMeters);
 const pitchTarget=clamp(
  finite(pose.vy)/34-turnLoad*.048+state.hoverVelocity*.16,-.115,.14);
 springInto(state,"pitch","pitchVelocity",pitchTarget,settings.pitchResponse,delta);
 state.cameraHeading=followAngle(state.cameraHeading,
  finite(pose.heading,state.cameraHeading),settings.cameraYawResponse,delta);
 state.cameraRoll=clamp(state.roll*settings.cameraTiltGain,-.04,.04);
 state.maxVisualBankDegrees=Math.max(state.maxVisualBankDegrees,
  Math.abs(state.roll)/RAD);
 state.maxVisualPitchDegrees=Math.max(state.maxVisualPitchDegrees,
  Math.abs(state.pitch)/RAD);
 state.maxHoverMeters=Math.max(state.maxHoverMeters,Math.abs(state.hover));
 return state;
}
