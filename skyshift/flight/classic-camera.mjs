// Shared classic camera defaults and framing for v081–v084.
// Reuse identical pure presentation functions from the current camera math.
import {turnPreview as preview,stepCinematic as step,cinematicFov as fov} from "./cinematic-camera.mjs";
export {createCinematicState,headingDelta,engineLightFactor} from "./cinematic-camera.mjs";
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const finite=(v,otherwise=0)=>Number.isFinite(v)?v:otherwise;
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
export function turnPreview(headingNow,headingAhead,settings=CINEMATIC_DEFAULTS){
 return preview(headingNow,headingAhead,settings);
}
export function stepCinematic(state,view,previewAngle,dt,settings=CINEMATIC_DEFAULTS){
 return step(state,view,previewAngle,dt,settings);
}
export function cinematicFov(speed,startSpeed,settings=CINEMATIC_DEFAULTS){
 return fov(speed,startSpeed,settings);
}
export function createClassicCameraFraming({heightAt,bankAt,CORKSCREW}){
// Pure camera framing math; render uses the same reused world-space vectors.
// Camera position follows pilot heading, never a centreline-spline coordinate.
// Preview changes only WHAT is looked at, not ship or camera world position.
// A complete rotation must be carried as a FULL camera roll.
 // Reducing it to 46% would snap the horizon by ~165° at the exit seam.
function cameraBankAt(s){
 const local=((s%3400)+3400)%3400;
 const angle=bankAt(s);
 return local>=CORKSCREW.start&&local<CORKSCREW.end?angle:angle*.46;
}
function chasePose(view,flightMotion,cinematic,settings=CINEMATIC_DEFAULTS,out={}){
 const heading=finite(flightMotion.cameraHeading,finite(view.heading));
 const fx=Math.sin(heading),fz=-Math.cos(heading);
 const rx=Math.cos(heading),rz=Math.sin(heading);
 const offset=clamp(finite(view.steering),-1,1)*settings.cameraSideShift;
 const localS=((finite(view.s)%3400)+3400)%3400;
 const screw=localS>=CORKSCREW.start&&localS<CORKSCREW.end;
 const wallRoll=bankAt(finite(view.s)),ca=Math.cos(wallRoll),sa=Math.sin(wallRoll);
 // Follow the inclined surface normal while retaining a visible horizon.
 const wallEyeSide=sa*settings.cameraHeight*(screw?.96:.62);
 const air=Math.max(0,finite(view.clearance));
 const flightBack=clamp(air,0,7)*.58; // expose free space and moving landing deck
 out.x=finite(view.worldX)-fx*(settings.cameraDistance+flightBack)+rx*(offset+wallEyeSide);
 out.y=finite(view.y)+settings.cameraHeight*
  (screw?ca*.96:(.47+.53*ca))+finite(flightMotion.hover)-air*.19;
 out.z=finite(view.worldZ)-fz*(settings.cameraDistance+flightBack)+rz*(offset+wallEyeSide);
 const aim=heading+finite(cinematic.preview);
 out.lookX=finite(view.worldX)+Math.sin(aim)*settings.cameraLookAhead+rx*sa*2.6;
 // Framing anticipates real upcoming terrain elevation, not an invented
 // camera bank or horizontal track-following correction.
 const currentS=finite(view.s),nextS=currentS+settings.cameraLookAhead;
 const futureTerrain=heightAt(nextS)-heightAt(currentS);
 out.lookY=finite(view.y)+(screw?1.25*ca:1.25)-air*.17+finite(flightMotion.hover)+
  clamp(futureTerrain*.68,-7.5,7.5);
 out.lookZ=finite(view.worldZ)-Math.cos(aim)*settings.cameraLookAhead+rz*sa*2.6;
 out.sideOffsetMeters=offset;
 return out;
}
 return {cameraBankAt,chasePose};
}
