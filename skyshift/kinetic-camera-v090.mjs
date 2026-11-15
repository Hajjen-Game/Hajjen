// SKYSHIFT 0.9.0 — Kinetic Camera Rig.
// Camera-only movement grammar: anticipate / carve / release / leap / land.
// Ground truth remains the 120Hz flight state; no autopilot, speed changes,
// rails or centreline snapping. Deterministic critically damped springs.
// No timers, particles, GPU draws, extra lights or allocations per frame.
export const KINETIC_CAMERA=Object.freeze({
 version:"kinetic-camera-rig-090",
 referenceSpeed:44,
 highSpeed:44*1.11**8,
 previewStartMeters:35,
 previewSpeedGain:.58,
 previewMaximumMeters:72,
 sideMaximumMeters:1.55,
 rollMaximumRadians:.064,
 fovStartDegrees:65.4,
 fovAtHighSpeedDegrees:76.2,
 fovMaximumDegrees:77.0,
 maxEyeLiftMeters:1.3,
 maxLandingCompressionMeters:.36,
 fullScrewRoll:true,
 extraRenderPasses:0,
 extraDrawCalls:0,
 automaticSteering:false
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,f=0)=>Number.isFinite(x)?x:f;
export function kineticSpeedFraction(speed,config=KINETIC_CAMERA){
 return clamp((finite(speed,config.referenceSpeed)-config.referenceSpeed)/
  (config.highSpeed-config.referenceSpeed),0,1);
}
export function kineticFovAt(speed,config=KINETIC_CAMERA){
 const t=kineticSpeedFraction(speed,config);
 return clamp(config.fovStartDegrees+
  (config.fovAtHighSpeedDegrees-config.fovStartDegrees)*
   Math.pow(t,.85),config.fovStartDegrees,config.fovMaximumDegrees);
}
export function createKineticCameraState(){
 return {
  previewMeters:KINETIC_CAMERA.previewStartMeters,previewVelocity:0,
  sideMeters:0,sideVelocity:0,
  rollRadians:0,rollVelocity:0,
  eyeLiftMeters:0,eyeLiftVelocity:0,
  lookLiftMeters:0,lookLiftVelocity:0,
  distanceMeters:0,distanceVelocity:0,
  landingMeters:0,landingVelocity:0,
  landings:0,
  maxPreviewMeters:KINETIC_CAMERA.previewStartMeters,
  maxSideMeters:0,maxRollDegrees:0,maxEyeLiftMeters:0,
  maxLandingCompressionMeters:0,maxDistanceMeters:0,
  corkProtectedFrames:0,wallProtectedFrames:0,
  updates:0
 };
}
// Exact second-order critically damped response for discrete presentation
// ticks; stable across 20/30/60/120Hz. No one-frame camera snaps.
function spring(st,key,velocityKey,target,omega,dt){
 const h=clamp(finite(dt),0,.1),w=Math.max(.01,omega);
 if(h<=0)return st[key];
 const displacement=st[key]-target;
 const velocity=st[velocityKey];
 const slope=velocity+w*displacement,decay=Math.exp(-w*h);
 st[key]=target+(displacement+slope*h)*decay;
 st[velocityKey]=(velocity-w*slope*h)*decay;
 return st[key];
}
export function triggerKineticLanding(st,impact,config=KINETIC_CAMERA){
 const speed=clamp(finite(impact),0,25);
 // Velocity impulse causes a brief recoverable dip, never a teleport.
 st.landingVelocity-=clamp(speed*.34,0,5.6);
 st.landings++;
 return st.landingVelocity;
}
export function stepKineticCamera(st,dt,view={},config=KINETIC_CAMERA){
 const h=clamp(finite(dt),0,.095);
 if(h<=0)return st;
 const speed=Math.max(0,finite(view.speed,config.referenceSpeed));
 const t=kineticSpeedFraction(speed,config);
 const steer=clamp(finite(view.steering),-1,1);
 const yaw=clamp(finite(view.yawRate)/1.24,-1,1);
 const grip=clamp(finite(view.gripIntensity),0,1);
 const rollSection=Boolean(view.corkscrew);
 const wallSection=Boolean(view.wall);
 const protectedWeight=rollSection?.035:wallSection?.20:1;
 if(rollSection)st.corkProtectedFrames++;
 if(wallSection)st.wallProtectedFrames++;
 const preview=clamp(config.previewStartMeters+
  Math.max(0,speed-config.referenceSpeed)*config.previewSpeedGain,
  config.previewStartMeters,config.previewMaximumMeters);
 spring(st,"previewMeters","previewVelocity",preview,11.5,h);
 // Shift outward with true yaw demand (not along authored track heading).
 // It opens up the inside of the bend while the pilot keeps full control.
 const outside=clamp(-yaw*(.62+.78*grip)-steer*.14,
  -config.sideMaximumMeters,config.sideMaximumMeters)*protectedWeight;
 spring(st,"sideMeters","sideVelocity",outside,
  Math.abs(outside)>Math.abs(st.sideMeters)?12:8.5,h);
 const roll=clamp(-yaw*(.026+.026*grip)-steer*.007,
  -config.rollMaximumRadians,config.rollMaximumRadians)*protectedWeight;
 spring(st,"rollRadians","rollVelocity",roll,
  Math.abs(roll)>Math.abs(st.rollRadians)?12:9,h);
 const airborne=view.grounded===false;
 const air=airborne?clamp(finite(view.clearance),0,9):0;
 const lift=airborne?clamp(.28+air*.13,0,config.maxEyeLiftMeters):0;
 spring(st,"eyeLiftMeters","eyeLiftVelocity",lift,9.5,h);
 spring(st,"lookLiftMeters","lookLiftVelocity",airborne?-.18-air*.035:0,11,h);
 const distance=.95*t-.36*grip*protectedWeight;
 spring(st,"distanceMeters","distanceVelocity",distance,8.3,h);
 spring(st,"landingMeters","landingVelocity",0,10.5,h);
 st.landingMeters=clamp(st.landingMeters,
  -config.maxLandingCompressionMeters,config.maxLandingCompressionMeters);
 // Analytics cover actual camera state, never treat targets as observed.
 st.maxPreviewMeters=Math.max(st.maxPreviewMeters,st.previewMeters);
 st.maxSideMeters=Math.max(st.maxSideMeters,Math.abs(st.sideMeters));
 st.maxRollDegrees=Math.max(st.maxRollDegrees,
  Math.abs(st.rollRadians)*180/Math.PI);
 st.maxEyeLiftMeters=Math.max(st.maxEyeLiftMeters,st.eyeLiftMeters);
 st.maxLandingCompressionMeters=Math.max(st.maxLandingCompressionMeters,
  Math.abs(st.landingMeters));
 st.maxDistanceMeters=Math.max(st.maxDistanceMeters,
  Math.abs(st.distanceMeters));
 st.updates++;
 return st;
}
export function kineticCameraAudit(st){
 return {version:KINETIC_CAMERA.version,
  observedPeakPreviewMeters:+st.maxPreviewMeters.toFixed(2),
  observedPeakOutsideShiftMeters:+st.maxSideMeters.toFixed(3),
  observedPeakCameraLeanDegrees:+st.maxRollDegrees.toFixed(2),
  observedPeakEyeLiftMeters:+st.maxEyeLiftMeters.toFixed(3),
  observedPeakLandingDipMeters:+st.maxLandingCompressionMeters.toFixed(3),
  observedPeakPullbackMeters:+st.maxDistanceMeters.toFixed(3),
  landingImpulses:st.landings,
  protectedCorkscrewFrames:st.corkProtectedFrames,
  protectedWallFrames:st.wallProtectedFrames,
  presentationUpdates:st.updates,
  extraDrawCalls:KINETIC_CAMERA.extraDrawCalls,
  extraRenderPasses:KINETIC_CAMERA.extraRenderPasses,
  pilotOwnedYaw:true,physicalTrackUnchanged:true};
}
