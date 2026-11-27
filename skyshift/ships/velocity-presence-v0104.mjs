// SKYSHIFT 0.10.4 — shared, physics-read-only speed/air presentation.
// Real 120 Hz pilot velocity is the ONLY source of cruise speed. All output
// channels are cosmetic, clamped, time-step independent and pause-safe.
export const VELOCITY_PRESENCE=Object.freeze({
 version:"velocity-presence-airborne-0104",
 cruiseMin:44,cruiseMax:44*1.11**8,
 maxAdditionalCameraFovDegrees:1.15,
 maxAdditionalCameraDistanceMeters:.48,
 addedPhysicsForces:0,particles:0,lights:0,
});
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
const finite=(x,f=0)=>Number.isFinite(x)?x:f;
const smooth=(x,k,dt)=>x+(k-x)*(1-Math.exp(-dt*8));
export function speedPresenceAt(speed){
 const s=Math.max(VELOCITY_PRESENCE.cruiseMin,finite(speed,44));
 return clamp(Math.log(s/44)/Math.log(1.11**8),0,1);
}
export function createVelocityPresenceState(){
 return {speed:0,surge:0,air:0,airPitch:0,airRoll:0,
  landing:0,phase:0,wasAirborne:false,launches:0,landings:0,
  wingDeflection:0,hullPitch:0,hullRoll:0,engineLoad:0,
  trackFlow:0,starFlow:0,trailLoad:0,
  cameraDistance:0,cameraAirLift:0,cameraLookLift:0,
  fovBonus:0,peakLoad:0,peakWingDegrees:0,
  peakTrackFlow:0,peakAirPitchDegrees:0,updates:0};
}
export function stepVelocityPresence(st,dt,view={}){
 const h=clamp(finite(dt),0,.08);
 if(!h)return st;
 const speed=finite(view.speed,44);
 const zone=speedPresenceAt(speed);
 const extra=clamp((speed-VELOCITY_PRESENCE.cruiseMax)/
  (VELOCITY_PRESENCE.cruiseMax*.4),0,1);
 const boost=clamp((finite(view.boostMultiplier,1)-1)/.4,0,1);
 const wantedSurge=Math.max(extra,boost);
 const follow=(from,to,rate)=>from+(to-from)*(1-Math.exp(-h*rate));
 st.speed=follow(st.speed,zone,zone>st.speed?3.6:2.4);
 st.surge=follow(st.surge,wantedSurge,wantedSurge>st.surge?10:5);
 const airborne=view.grounded===false;
 if(airborne&&!st.wasAirborne)st.launches++;
 if(!airborne&&st.wasAirborne){st.landings++;st.landing=.32+.22*st.speed;}
 st.wasAirborne=airborne;
 st.air=follow(st.air,airborne?1:0,airborne?10:14);
 st.landing*=Math.exp(-h*9);
 const vy=clamp(finite(view.verticalSpeed)/23,-1,1);
 const trick=view.trickActive===true;
 const steer=clamp(finite(view.steering),-1,1);
 const yaw=clamp(finite(view.yawRate)/1.24,-1,1);
 st.phase+=h*(2.5+st.speed*3.7+st.surge*1.2);
 // Higher velocity = tighter structure, not larger uncontrolled wobble.
 const flutter=Math.sin(st.phase)*(.004+.012*st.speed)*st.air;
 const wingGoal=-.017*st.speed-.026*st.surge+
  st.air*(-.055-.024*vy)+flutter;
 st.wingDeflection=follow(st.wingDeflection,wingGoal,9);
 // Distinct takeoff, apex and descent attitude, never rotate pilot heading.
 const pitchGoal=st.air*(-.018+vy*.055)*( .60+.40*st.speed);
 st.airPitch=follow(st.airPitch,trick?pitchGoal*.24:pitchGoal,9.5);
 st.airRoll=follow(st.airRoll,trick?0:st.air*(steer*.018+yaw*.012),10);
 st.hullPitch=clamp(st.airPitch-.014*st.speed-.009*st.surge+
  st.landing*.038,-.085,.075);
 st.hullRoll=clamp(st.airRoll,-.028,.028);
 st.engineLoad=clamp(.12+.43*st.speed+.34*st.surge+
  st.air*.08+st.landing*.1,0,1);
 st.trailLoad=clamp(.12+.72*st.speed+.28*st.surge,0,1);
 // World flow is an actual velocity-based light accent, not a fake hazard.
 st.trackFlow=clamp(.06+.58*st.speed+.35*st.surge,0,1);
 st.starFlow=clamp(.03+.38*st.speed+.22*st.surge,0,.68);
 st.cameraDistance=clamp(-.19*st.speed+.29*st.surge+
  .09*st.air,-.24,VELOCITY_PRESENCE.maxAdditionalCameraDistanceMeters);
 st.cameraAirLift=clamp(st.air*(.10+.16*st.speed)-
  st.landing*.10,0,.32);
 st.cameraLookLift=clamp(-st.air*(.08+.12*st.speed),-.24,0);
 st.fovBonus=clamp(st.speed*.95+st.surge*.20,0,
  VELOCITY_PRESENCE.maxAdditionalCameraFovDegrees);
 st.peakLoad=Math.max(st.peakLoad,st.engineLoad);
 st.peakWingDegrees=Math.max(st.peakWingDegrees,
  Math.abs(st.wingDeflection)*180/Math.PI);
 st.peakTrackFlow=Math.max(st.peakTrackFlow,st.trackFlow);
 st.peakAirPitchDegrees=Math.max(st.peakAirPitchDegrees,
  Math.abs(st.airPitch)*180/Math.PI);
 st.updates++;
 return st;
}
export function velocityPresenceAudit(st){
 return {version:VELOCITY_PRESENCE.version,
  peakEngineLoad:+st.peakLoad.toFixed(3),
  peakWingDeflectionDegrees:+st.peakWingDegrees.toFixed(2),
  peakTrackFlow:+st.peakTrackFlow.toFixed(3),
  peakAirPitchDegrees:+st.peakAirPitchDegrees.toFixed(2),
  launches:st.launches,landings:st.landings,updates:st.updates,
  pilotPhysicsUnchanged:true};
}
