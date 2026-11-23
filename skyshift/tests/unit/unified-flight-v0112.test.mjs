import test from "node:test";
import assert from "node:assert/strict";
import {createFlightMotionState as legacyMotion,stepFlightMotion as legacyStep}
 from "../../flight-motion-v044.mjs";
import {createFlightMotionState as optimizedMotion,stepFlightMotion as optimizedStep}
 from "../../flight/flight-motion-v0112.mjs";
import {capturePose as legacyCapture,interpolatePose as legacyInterpolate,
 shouldSnapPose as legacySnap} from "../../frame-pacing-v080.mjs";
import {capturePose,interpolatePose,shouldSnapPose}
 from "../../frame-pacing-v0112.mjs";
import {createSignatureFlightState,stepSignatureFlight}
 from "../../flight/signature-flight-v091.mjs";
import {createKineticCameraState,stepKineticCamera}
 from "../../flight/kinetic-camera-v090.mjs";
import {CINEMATIC_DEFAULTS,createCinematicState,turnPreview,stepCinematic}
 from "../../cinematic-v0901.mjs";
import {MOTION_DEFAULTS} from "../../flight-motion-v044.mjs";
import {createUnifiedFlightRig,advanceUnifiedFlightRig,
 resetUnifiedFlightRig,unifiedFlightAudit} from "../../flight/unified-flight-v0112.mjs";
const near=(a,b,which,tolerance=1e-11)=>{
 for(const key of Object.keys(a)){
  if(typeof a[key]==="number")assert.ok(Math.abs(a[key]-b[key])<tolerance,
   which+"."+key+" "+a[key]+" vs "+b[key]);
  else assert.deepEqual(a[key],b[key],which+"."+key);
 }
};
test("in-place analytical flight springs match legacy formula across variable frame rates",()=>{
 const old=legacyMotion(0),next=optimizedMotion(0);
 for(let frame=0;frame<1200;frame++){
  const dt=[1/120,1/60,1/30,.047][frame%4];
  const t=frame/60,steer=Math.sin(frame*.037);
  const pose={steering:steer,trackBank:0,sideVelocity:Math.cos(frame*.018)*3,
   yawRate:Math.sin(frame*.022)*1.1,vy:Math.sin(frame*.05)*5,
   heading:frame*.005};
  legacyStep(old,pose,dt,t,MOTION_DEFAULTS);
  optimizedStep(next,pose,dt,t,MOTION_DEFAULTS);
  near(old,next,"motion",2e-12);
 }
});
test("two preallocated pose snapshots and interpolated output preserve old values",()=>{
 const previous={worldX:5,worldZ:7,y:3,heading:Math.PI-.01,s:200,
  lateral:3,steering:.5,vy:3,yawRate:.1,sideVelocity:-1,
  grounded:true,trickVisualAngle:6.27,trickActive:false};
 const current={...previous,worldX:6,s:205,heading:-Math.PI+.015,
  grounded:false,trickVisualAngle:0,trickActive:true};
 const fixedPrev={},fixedCurrent={},out={};
 assert.equal(capturePose(previous,fixedPrev),fixedPrev);
 assert.equal(capturePose(current,fixedCurrent),fixedCurrent);
 assert.deepEqual(fixedPrev,legacyCapture(previous));
 assert.deepEqual(fixedCurrent,legacyCapture(current));
 for(const alpha of [0,.12,.49,.5,.74,1]){
  assert.equal(interpolatePose(fixedPrev,fixedCurrent,alpha,out),out);
  assert.deepEqual(out,legacyInterpolate(previous,current,alpha));
 }
 assert.equal(shouldSnapPose(fixedPrev,fixedCurrent),
  legacySnap(previous,current));
});
test("unified presentation produces legacy hull, kinetic and camera springs, including wall and corkscrew",()=>{
 const headingAt=s=>Math.sin(s*.003);
 const surfaceHeightAt=(s,l)=>Math.sin(s*.004)*2+Math.abs(l)*.005;
 const config={flightTuning:MOTION_DEFAULTS,
  cinematicTuning:{...CINEMATIC_DEFAULTS},headingAt,surfaceHeightAt,
  hoverHeight:1.1,cameraGain:.85,lapLength:3400,
  magneticWall:{start:1662,end:1842},
  corkscrew:{start:3005,end:3338}};
 const rig=createUnifiedFlightRig(config);
 const a={motion:legacyMotion(0),signature:createSignatureFlightState(),
  cinematic:createCinematicState(),kinetic:createKineticCameraState()};
 const b={motion:optimizedMotion(0),signature:createSignatureFlightState(),
  cinematic:createCinematicState(),kinetic:createKineticCameraState()};
 for(let i=0;i<360;i++){
  const dt=[1/60,1/30,1/120][i%3],time=i/60;
  const local=[120,1740,3100,3339,2200][Math.floor(i/72)] + (i%72)*.35;
  const view={s:local,worldX:local*.2,worldZ:local*.3,
   y:1.1+surfaceHeightAt(local,2)+Math.sin(i*.1),
   lateral:2,heading:headingAt(local),steering:Math.sin(i*.17),
   yawRate:Math.cos(i*.13),sideVelocity:Math.sin(i*.2)*3,
   vy:Math.cos(i*.14),grounded:i%19!==0,trickVisualAngle:0};
  const flight={gripIntensity:Math.abs(Math.sin(i*.06)),
   currentSpeed:44+(i%160)*.35,
   boostMultiplier:i%35<9?1.35:1,
   landingBoostMultiplier:1,trickActive:i%19===0,vy:view.vy};
  // Exact legacy call ordering and interpolation inputs.
  legacyStep(a.motion,{...view,trackBank:0},dt,time,config.flightTuning);
  const s=((view.s%config.lapLength)+config.lapLength)%config.lapLength;
  const wall=s>=1662&&s<1842,corkscrew=s>=3005&&s<3338;
  stepSignatureFlight(a.signature,dt,{
   steering:view.steering,yawRate:view.yawRate,
   gripIntensity:flight.gripIntensity,speed:flight.currentSpeed,
   boostMultiplier:Math.max(flight.boostMultiplier,flight.landingBoostMultiplier),
   grounded:view.grounded,verticalSpeed:view.vy,trickActive:flight.trickActive,
   wall,corkscrew
  });
  const preview=config.cinematicTuning.previewMeters;
  const upcoming=view.s+
   (preview+(a.kinetic.previewMeters-preview)*config.cameraGain);
  const lookBias=turnPreview(headingAt(view.s),headingAt(upcoming),
   config.cinematicTuning);
  stepCinematic(a.cinematic,view,lookBias,dt,config.cinematicTuning);
  const clearance=view.y+a.motion.hover-config.hoverHeight-
   surfaceHeightAt(view.s,view.lateral);
  stepKineticCamera(a.kinetic,dt,{
   speed:flight.currentSpeed,steering:view.steering,yawRate:view.yawRate,
   gripIntensity:flight.gripIntensity,grounded:view.grounded,
   clearance,wall,corkscrew
  });
  advanceUnifiedFlightRig(rig,view,flight,dt,time,true,b.motion,
   b.signature,b.cinematic,b.kinetic);
  near(a.motion,b.motion,"motion",1e-11);
  near(a.signature,b.signature,"signature",1e-11);
  near(a.cinematic,b.cinematic,"cinematic",1e-11);
  near(a.kinetic,b.kinetic,"kinetic",1e-11);
  assert.equal(rig.clearance,clearance);
  assert.equal(rig.corkscrew,corkscrew);
  assert.equal(rig.wall,wall);
 }
 const report=unifiedFlightAudit(rig);
 assert.equal(report.presentationUpdates,360);
 assert.ok(report.protectedTrackFrames>0);
 assert.equal(report.physicsChanged,false);
 assert.equal(report.extraDrawCalls,0);
 assert.equal(report.zeroAllocationSignals,true);
 resetUnifiedFlightRig(rig);
 assert.equal(rig.updates,0);
});
