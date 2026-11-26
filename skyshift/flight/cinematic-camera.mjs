// Track sampler supplied by adapter.
// SKYSHIFT 0.9.0 — Kinetic Camera Rig integrated with archived 3D-safe chase frame.
// All outputs are PRESENTATION ONLY: never modify trial position, yaw or collision.
// Functions avoid allocations in the frame path and use exponential smoothing.
// Historical followAngle import retained in adapter.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const finite=(v,otherwise=0)=>Number.isFinite(v)?v:otherwise;
const RAD=Math.PI/180;
export const CINEMATIC_DEFAULTS=Object.freeze({
 cameraDistance:13.8,      // 0.4.4: 15.2 — craft fills more of the view
 cameraHeight:7.8,        // 0.4.4: 9.5 — closer to racing surface
 cameraLookAhead:36,      // 0.4.4: 39 — still enough track visible
 previewMeters:40,        // live kinetic rig provides speed-dependent preview metres
 previewGain:.26,         // kinetic anticipation remains yaw-bounded
 previewMaximum:.155,
 previewResponse:7.5,
 cameraFollowResponse:10.4,
 cameraSideShift:.22,
 maxNoseYawDegrees:1.9,   // cosmetic hull alignment only
 noseResponse:12,
 engineResponse:9,
 engineMin:.08,           // continuous glow with small turns/acceleration signal
 engineTurnGain:.6,
 engineMax:1,
 fovBase:65.4,
 fovSpeedGain:1.0,
 maxFov:70.5
});
export function createCinematicState(){
 return {
  preview:0,noseYaw:0,engineEnergy:0,cameraTargetHeading:0,
  maxPreviewDegrees:0,maxNoseDegrees:0,maxEngineEnergy:0,
  maxCameraLateralMeters:0
 };
}
export function headingDelta(from,to){
 return Math.atan2(Math.sin(to-from),Math.cos(to-from));
}
export function turnPreview(headingNow,headingAhead,settings=CINEMATIC_DEFAULTS){
 const change=headingDelta(headingNow,headingAhead);
 return clamp(change*settings.previewGain,
  -settings.previewMaximum,settings.previewMaximum);
}
export function stepCinematic(state,view,previewAngle,dt,settings=CINEMATIC_DEFAULTS){
 const delta=clamp(finite(dt),0,.05);
 if(!view||!delta)return state;
 const a=(speed)=>1-Math.exp(-Math.max(0,speed)*delta);
 const preview=clamp(finite(previewAngle),
  -settings.previewMaximum,settings.previewMaximum);
 state.preview+=(preview-state.preview)*a(settings.previewResponse);
 const steer=clamp(finite(view.steering),-1,1);
 // Small turn-in pose: not a steering impulse and not a side-slip force.
 const noseTarget=-steer*settings.maxNoseYawDegrees*RAD;
 state.noseYaw+=(noseTarget-state.noseYaw)*a(settings.noseResponse);
 const yawLoad=clamp(Math.abs(finite(view.yawRate))/1.24,0,1);
 const energyTarget=clamp(settings.engineMin+
  settings.engineTurnGain*(yawLoad*.7+Math.abs(steer)*.3),
  settings.engineMin,settings.engineMax);
 state.engineEnergy+=(energyTarget-state.engineEnergy)*a(settings.engineResponse);
 state.maxPreviewDegrees=Math.max(state.maxPreviewDegrees,Math.abs(state.preview)/RAD);
 state.maxNoseDegrees=Math.max(state.maxNoseDegrees,Math.abs(state.noseYaw)/RAD);
 state.maxEngineEnergy=Math.max(state.maxEngineEnergy,state.engineEnergy);
 return state;
}
// Pure camera framing math; render uses the same reused world-space vectors.
// Camera position follows pilot heading, never a centreline-spline coordinate.
// Preview changes only WHAT is looked at, not ship or camera world position.
// A complete rotation must be carried as a FULL camera roll.
 // Reducing it to 46% would snap the horizon by ~165° at the exit seam.
export function createCameraFraming({heightAt,bankAt,CORKSCREW,lapLength=3400}){
function cameraBankAt(s){
 const local=((s%lapLength)+lapLength)%lapLength;
 const angle=bankAt(s);
 return local>=CORKSCREW.start&&local<CORKSCREW.end?angle:angle*.46;
}
function chasePose(view,flightMotion,cinematic,settings=CINEMATIC_DEFAULTS,out={}){
 const heading=finite(flightMotion.cameraHeading,finite(view.heading));
 const fx=Math.sin(heading),fz=-Math.cos(heading);
 const rx=Math.cos(heading),rz=Math.sin(heading);
 // Kinetic side movement is additive and visual ONLY. Authored track
 // position, yaw and lateral collision stay exclusively inside trial-v084.
 const offset=clamp(finite(view.steering),-1,1)*settings.cameraSideShift+
  clamp(finite(view.kineticSideMeters),-1.55,1.55);
 const kineticDistance=clamp(finite(view.kineticDistanceMeters),-.5,1.2);
 const localS=((finite(view.s)%lapLength)+lapLength)%lapLength;
 const screw=localS>=CORKSCREW.start&&localS<CORKSCREW.end;
 const wallRoll=bankAt(finite(view.s)),ca=Math.cos(wallRoll),sa=Math.sin(wallRoll);
 // Follow the inclined surface normal while retaining a visible horizon.
 const wallEyeSide=sa*settings.cameraHeight*(screw?.96:.62);
 const air=Math.max(0,finite(view.clearance));
 const flightBack=clamp(air,0,7)*.58; // expose free space and moving landing deck
 out.x=finite(view.worldX)-fx*(settings.cameraDistance+flightBack+kineticDistance)+rx*(offset+wallEyeSide);
 out.y=finite(view.y)+settings.cameraHeight*
  (screw?ca*.96:(.47+.53*ca))+finite(flightMotion.hover)-air*.19+
  clamp(finite(view.kineticEyeLiftMeters),-1,1.3)+
  clamp(finite(view.kineticLandingMeters),-.36,.36);
 out.z=finite(view.worldZ)-fz*(settings.cameraDistance+flightBack+kineticDistance)+rz*(offset+wallEyeSide);
 const aim=heading+finite(cinematic.preview);
 out.lookX=finite(view.worldX)+Math.sin(aim)*settings.cameraLookAhead+rx*sa*2.6;
 // Framing anticipates real upcoming terrain elevation, not an invented
 // camera bank or horizontal track-following correction.
 const currentS=finite(view.s),nextS=currentS+settings.cameraLookAhead;
 const futureTerrain=heightAt(nextS)-heightAt(currentS);
 out.lookY=finite(view.y)+(screw?1.25*ca:1.25)-air*.17+finite(flightMotion.hover)+
  clamp(futureTerrain*.68,-7.5,7.5)+
  clamp(finite(view.kineticLookLiftMeters),-.6,.3);
 out.lookZ=finite(view.worldZ)-Math.cos(aim)*settings.cameraLookAhead+rz*sa*2.6;
 out.sideOffsetMeters=offset;
 return out;
}
 return {cameraBankAt,chasePose};
}
export function cinematicFov(speed,startSpeed,settings=CINEMATIC_DEFAULTS){
 return clamp(settings.fovBase+Math.max(0,finite(speed)-finite(startSpeed))*
  settings.fovSpeedGain,settings.fovBase,settings.maxFov);
}
export function engineLightFactor(cinematic){
 return 1+.12*clamp(finite(cinematic.engineEnergy),0,1);
}
