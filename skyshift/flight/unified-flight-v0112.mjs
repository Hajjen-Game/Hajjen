// SKYSHIFT 0.11.2 — unified read-only presentation signals.
// The pilot's 120Hz flight state remains authoritative. Existing Kinetic,
// Signature and Cinematic spring formulas run in their original order.
import {stepFlightMotion} from "./flight-motion-v0112.mjs";
import {stepSignatureFlight} from "./signature-flight-v091.mjs";
import {stepKineticCamera} from "./kinetic-camera-v090.mjs";
import {turnPreview,stepCinematic} from "../cinematic-v0901.mjs";
export const UNIFIED_FLIGHT_0112=Object.freeze({
 version:"unified-flight-motion-0112",physicsChanged:false,
 headingIsPilotOwned:true,originalSpringResponses:true,
 cameraRigUnchanged:true,extraDrawCalls:0,extraLights:0,extraRenderPasses:0
});
export function createUnifiedFlightRig({
 flightTuning,cinematicTuning,headingAt,surfaceHeightAt,
 hoverHeight,cameraGain,lapLength,magneticWall,corkscrew
}){
 return {
  config:{flightTuning,cinematicTuning,headingAt,surfaceHeightAt,
   hoverHeight,cameraGain,lapLength,magneticWall,corkscrew},
  motionInput:{trackBank:0,steering:0,sideVelocity:0,yawRate:0,vy:0,heading:0},
  signatureInput:{steering:0,yawRate:0,gripIntensity:0,speed:0,
   boostMultiplier:1,grounded:true,verticalSpeed:0,trickActive:false,
   wall:false,corkscrew:false},
  kineticInput:{speed:0,steering:0,yawRate:0,gripIntensity:0,
   grounded:true,clearance:0,wall:false,corkscrew:false},
  clearance:0,wall:false,corkscrew:false,updates:0,
  maximumClearance:0,protectedFrames:0,zeroAllocationSignals:true
 };
}
export function resetUnifiedFlightRig(rig){
 rig.clearance=0;rig.wall=false;rig.corkscrew=false;
 rig.updates=0;rig.maximumClearance=0;rig.protectedFrames=0;
 return rig;
}
export function advanceUnifiedFlightRig(rig,view,flight,dt,time,playing,
 motion,signature,cinematic,kinetic){
 const c=rig.config;
 const physicalDt=playing?dt:0;
 const m=rig.motionInput;
 m.trackBank=0;m.steering=view.steering;
 m.sideVelocity=view.sideVelocity;m.yawRate=view.yawRate;
 m.vy=view.vy;m.heading=view.heading;
 stepFlightMotion(motion,m,physicalDt,time,c.flightTuning);
 const localS=((view.s%c.lapLength)+c.lapLength)%c.lapLength;
 const wall=localS>=c.magneticWall.start&&localS<c.magneticWall.end;
 const screw=localS>=c.corkscrew.start&&localS<c.corkscrew.end;
 rig.wall=wall;rig.corkscrew=screw;
 const sig=rig.signatureInput;
 sig.steering=view.steering;sig.yawRate=view.yawRate;
 sig.gripIntensity=flight.gripIntensity;sig.speed=flight.currentSpeed;
 sig.boostMultiplier=Math.max(flight.boostMultiplier,flight.landingBoostMultiplier);
 sig.grounded=view.grounded;sig.verticalSpeed=view.vy??flight.vy;
 sig.trickActive=flight.trickActive;sig.wall=wall;sig.corkscrew=screw;
 stepSignatureFlight(signature,physicalDt,sig);
 // Important: preview samples kinetic's previous-frame value, precisely
 // as in the original update order. No prediction or new steering.
 const before=c.cinematicTuning.previewMeters;
 const upcoming=view.s+(before+(kinetic.previewMeters-before)*c.cameraGain);
 const lookBias=turnPreview(c.headingAt(view.s),c.headingAt(upcoming),
  c.cinematicTuning);
 stepCinematic(cinematic,view,lookBias,physicalDt,c.cinematicTuning);
 // Same clearance sampled by the old placeShip camera section.
 const clearance=view.y+motion.hover-c.hoverHeight-
  c.surfaceHeightAt(view.s,view.lateral);
 rig.clearance=clearance;
 const kin=rig.kineticInput;
 kin.speed=flight.currentSpeed;kin.steering=view.steering;
 kin.yawRate=view.yawRate;kin.gripIntensity=flight.gripIntensity;
 kin.grounded=view.grounded;kin.clearance=clearance;
 kin.wall=wall;kin.corkscrew=screw;
 if(c.cameraGain>0)stepKineticCamera(kinetic,physicalDt,kin);
 if(playing){
  rig.updates++;
  rig.maximumClearance=Math.max(rig.maximumClearance,clearance);
  if(wall||screw)rig.protectedFrames++;
 }
 return rig;
}
export function unifiedFlightAudit(rig){
 return {...UNIFIED_FLIGHT_0112,presentationUpdates:rig.updates,
  maximumClearanceMeters:+rig.maximumClearance.toFixed(3),
  protectedTrackFrames:rig.protectedFrames,
  zeroAllocationSignals:rig.zeroAllocationSignals};
}
