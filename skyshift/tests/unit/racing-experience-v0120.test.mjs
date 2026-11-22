import test from "node:test";
import assert from "node:assert/strict";
import {RACING_0120,createRacingExperience,resetRacingExperience,
 observeRacingStep,stepRacingExperience,raceWindowAt,raceRhythmAt,
 racingExperienceAudit} from "../../racing-experience-v0120.mjs";
import {LANDMARKS_0120,createSectorLandmarkData}
 from "../../sector-landmarks-v0120.mjs";
import {positionAt,widthAt} from "../../trial-v0901.mjs";

const mock=(s=780)=>({s,grounded:true,gripIntensity:0,
 steering:0,yawRate:0,railContacts:0,elapsed:0,
 currentSpeed:74,boostMultiplier:1,heading:0,shield:100});
function cleanCarve(st,f,window,gripTime=.58){
 const step=1/120,first=window.start+1;
 f.s=first;observeRacingStep(st,f,step);
 for(let i=0;i<Math.round(gripTime/step);i++){
  f.gripIntensity=.93;f.steering=.8;f.yawRate=.64;
  f.elapsed+=step;
  f.s=first+(window.end-first-.7)*i/(gripTime/step);
  observeRacingStep(st,f,step);
 }
 f.s=window.end+.05;
 return observeRacingStep(st,f,step);
}
test("four authored rhythm windows are bounded within one loop",()=>{
 assert.equal(RACING_0120.precisionWindows.length,4);
 assert.equal(raceWindowAt(790),0);
 assert.equal(raceWindowAt(1146),1);
 assert.equal(raceWindowAt(1920),2);
 assert.equal(raceWindowAt(2600),3);
 assert.equal(raceWindowAt(3400+790),0);
 assert.equal(raceRhythmAt(1680),"WALL");
 assert.equal(raceRhythmAt(2220),"SHADOW");
 assert.equal(raceRhythmAt(3065),"CORKSCREW");
 assert.equal(raceRhythmAt(3500),"FLOW");
});
test("true precision carve recognises held GRIP, yaw and no rail contact",()=>{
 const st=createRacingExperience(),f=mock();
 const earned=cleanCarve(st,f,RACING_0120.precisionWindows[0]);
 assert.equal(earned?.id,"precision-apex");
 assert.equal(earned.lap,1);
 assert.ok(earned.gripSeconds>=.27);
 assert.equal(earned.chain,1);
 assert.equal(st.cleanCarves,1);
 assert.equal(st.maxFlowChain,1);
 assert.equal(st.missedCarves,0);
 assert.ok(st.releaseTime>1);
 // Revisiting an already-crossed window cannot farm the same lap reward.
 const again=cleanCarve(st,f,RACING_0120.precisionWindows[0]);
 assert.equal(again,null);
 assert.equal(st.cleanCarves,1);
});
test("no reward from autopilot-like steering, GRIP not held or touching rails",()=>{
 for(const condition of ["no-grip","no-yaw","contact"]){
  const st=createRacingExperience(),f=mock();
  const w=RACING_0120.precisionWindows[0];
  f.s=w.start+1;observeRacingStep(st,f,1/120);
  for(let i=0;i<80;i++){
   f.s=w.start+3+i;
   f.gripIntensity=condition==="no-grip"?0:.96;
   f.steering=.9;f.yawRate=condition==="no-yaw"?0:.72;
   if(condition==="contact"&&i===35)f.railContacts++;
   observeRacingStep(st,f,1/120);
  }
  f.s=w.end+.1;
  assert.equal(observeRacingStep(st,f,1/120),null);
  assert.equal(st.cleanCarves,0);
  assert.equal(st.missedCarves,1);
 }
});
test("lap-specific reward and chain reset prevent duplicated per-lap events",()=>{
 const st=createRacingExperience(),f=mock();
 let e=cleanCarve(st,f,RACING_0120.precisionWindows[0]);
 assert.equal(e.chain,1);
 e=cleanCarve(st,f,RACING_0120.precisionWindows[1]);
 assert.equal(e.chain,2);
 assert.equal(st.cleanCarves,2);
 f.s=3400+RACING_0120.precisionWindows[0].start;
 observeRacingStep(st,f,1/120);
 e=cleanCarve(st,f,{...RACING_0120.precisionWindows[0],
  start:3400+785,end:3400+990});
 assert.equal(e?.lap,2);
 assert.equal(e.chain,1);
 assert.equal(st.cleanCarves,3);
 assert.equal(st.maxFlowChain,2);
});
test("camera and engine motion uses bounded exponential response and freeze on pause",()=>{
 const a=createRacingExperience(),b=createRacingExperience();
 const v={s:1200,steering:1,yawRate:.9,speed:96,
  playing:true,grounded:true,wall:false,corkscrew:false};
 for(let i=0;i<120;i++)stepRacingExperience(a,1/120,v);
 for(let i=0;i<60;i++)stepRacingExperience(b,1/60,v);
 assert.ok(Math.abs(a.fovAddition-b.fovAddition)<1e-9);
 assert.ok(Math.abs(a.cameraLean-b.cameraLean)<1e-9);
 assert.ok(a.fovAddition<=RACING_0120.maxFovAdditionDegrees);
 assert.ok(Math.abs(a.cameraLean)<=RACING_0120.maxCameraLeanRadians);
 assert.ok(a.engineLift>0);
 const before={fov:a.fovAddition,cam:a.cameraLean,frames:a.presentationFrames};
 stepRacingExperience(a,1/60,{...v,playing:false});
 assert.deepEqual({fov:a.fovAddition,cam:a.cameraLean,frames:a.presentationFrames},before);
 for(let i=0;i<90;i++)stepRacingExperience(a,1/120,{...v,wall:true});
 assert.ok(Math.abs(a.cameraLean)<1e-4,"real 70° wall must suppress extra camera lean");
 assert.ok(a.fovAddition<.003);
 assert.ok(a.protectedFrames>0);
 for(let i=0;i<90;i++)stepRacingExperience(a,1/120,{...v,corkscrew:true});
 assert.ok(Math.abs(a.cameraLean)<1e-6,"360° corkscrew must retain full physical horizon");
 assert.equal(racingExperienceAudit(a).physicalFlightUnchanged,true);
});
test("road geometry remains untouched, monuments are outside existing collision",()=>{
 const data=createSectorLandmarkData(positionAt,widthAt);
 assert.equal(data.siteCount,2);
 assert.ok(data.bodyTriangles>0&&data.lightTriangles>0);
 assert.ok(data.bodyTriangles+data.lightTriangles<120);
 assert.equal(data.body.length%9,0);
 assert.equal(data.light.length%9,0);
 assert.ok(data.body.every(Number.isFinite));
 assert.ok(data.light.every(Number.isFinite));
 assert.equal(data.minLateralClearance,3.9);
 assert.equal(LANDMARKS_0120.drawCalls,2);
 assert.equal(LANDMARKS_0120.nonColliding,true);
 assert.equal(RACING_0120.physicalFlightUnchanged,true);
 assert.equal(RACING_0120.originalTrackGeometryUnchanged,true);
});
test("reset clears director and event de-duplication, retaining original layout",()=>{
 const st=createRacingExperience(),f=mock();
 cleanCarve(st,f,RACING_0120.precisionWindows[0]);
 assert.equal(st.completedWindowKeys.size,1);
 resetRacingExperience(st);
 assert.equal(st.cleanCarves,0);
 assert.equal(st.completedWindowKeys.size,0);
 assert.equal(st.flow,0);
 assert.equal(st.presentationFrames,0);
});
