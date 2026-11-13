// SKYSHIFT 0.4.5 — Cinematic Flight Camera & Motion Weight.
// All outputs are PRESENTATION ONLY: never modify trial position, yaw or collision.
// Functions avoid allocations in the frame path and use exponential smoothing.
import { followAngle } from "./flight-motion-v044.mjs";
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const finite=(v,otherwise=0)=>Number.isFinite(v)?v:otherwise;
const RAD=Math.PI/180;
export const CINEMATIC_DEFAULTS=Object.freeze({
 cameraDistance:13.8,      // 0.4.4: 15.2 — craft fills more of the view
 cameraHeight:7.8,        // 0.4.4: 9.5 — closer to racing surface
 cameraLookAhead:36,      // 0.4.4: 39 — still enough track visible
 previewMeters:40,        // sample upcoming course curvature ONLY for framing
 previewGain:.23,         // cap look bias at 0.12 rad / 6.9°
 previewMaximum:.12,
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
export function chasePose(view,flightMotion,cinematic,settings=CINEMATIC_DEFAULTS,out={}){
 const heading=finite(flightMotion.cameraHeading,finite(view.heading));
 const fx=Math.sin(heading),fz=-Math.cos(heading);
 const rx=Math.cos(heading),rz=Math.sin(heading);
 const offset=clamp(finite(view.steering),-1,1)*settings.cameraSideShift;
 const air=Math.max(0,finite(view.clearance));
 out.x=finite(view.worldX)-fx*settings.cameraDistance+rx*offset;
 out.y=finite(view.y)+settings.cameraHeight+finite(flightMotion.hover)+air*.08;
 out.z=finite(view.worldZ)-fz*settings.cameraDistance+rz*offset;
 const aim=heading+finite(cinematic.preview);
 out.lookX=finite(view.worldX)+Math.sin(aim)*settings.cameraLookAhead;
 out.lookY=finite(view.y)+1.25+finite(flightMotion.hover);
 out.lookZ=finite(view.worldZ)-Math.cos(aim)*settings.cameraLookAhead;
 out.sideOffsetMeters=offset;
 return out;
}
export function cinematicFov(speed,startSpeed,settings=CINEMATIC_DEFAULTS){
 return clamp(settings.fovBase+Math.max(0,finite(speed)-finite(startSpeed))*
  settings.fovSpeedGain,settings.fovBase,settings.maxFov);
}
export function engineLightFactor(cinematic){
 return 1+.12*clamp(finite(cinematic.engineEnergy),0,1);
}
