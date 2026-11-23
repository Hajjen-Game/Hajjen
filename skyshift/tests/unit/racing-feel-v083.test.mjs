// SKYSHIFT 0.10.3 – physics and UX regression against actual 0.8.2 baseline.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as prior from "../../trial-v082.mjs";
import {
 TRIAL,PROJECTION_083,GRIP_APEX,SKYLINE_LEAP,CORKSCREW,MAGNETIC_WALL,
 positionAt,headingAt,surfaceHeightAt,curvatureAt,widthAt,projectWorldToTrack,
 newFlightState,stepFlight,setZoneSpeedStage,validateTrial,speedAt
} from "../../trial-v083.mjs";
import {AIR_TRICKS,initAirTrickState,beginAirTrick,advanceAirTrick}
 from "../../flight/air-tricks-v083.mjs";
import {gripApexCue,createRailFeedbackState,startRailFeedback,
 stepRailFeedback,RACING_FEEL} from "../../flight/racing-feel-v083.mjs";
import {clarityProfile,dprForAdaptiveLevel} from "../../image-clarity-v083.mjs";
import {createSmoothDeckData} from "../../smooth-track-v083.mjs";
import {createAeroBarrierData} from "../../aero-barrier-v083.mjs";
const source=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<=e,
 "expected "+a+" to be within "+e+" of "+b);
function startAt(s,lat=0,stage=0,api={positionAt,headingAt,surfaceHeightAt,
 newFlightState,speedAt,TRIAL}){
 const f=api.newFlightState(),p=api.positionAt(s,lat);
 Object.assign(f,{s,lateral:lat,worldX:p.x,worldZ:p.z,
  heading:api.headingAt(s),y:api.surfaceHeightAt(s,lat)+api.TRIAL.hoverHeight,
  zoneSpeedStage:stage,zoneCruiseSpeed:api.speedAt(s,stage),
  currentSpeed:api.speedAt(s,stage)});
 return f;
}
test("new GRIP callout is early, persistent, mobile-readable and requires pilot steering",()=>{
 const g=GRIP_APEX;
 assert.equal(RACING_FEEL.gripApproachStart,650);
 assert.equal(gripApexCue(649,true,false,false,g).visible,false);
 for(const [s,phase] of [[650,"approach"],[777,"apex"],[900,"apex"],[994,"apex"]]){
  const cue=gripApexCue(s,true,false,false,g);
  assert.equal(cue.visible,true);assert.equal(cue.phase,phase);
  assert.match(cue.text,/GRIP/);
 }
 assert.equal(gripApexCue(995,true,false,false,g).visible,false);
 assert.equal(gripApexCue(900,false,true,false,g).visible,false);
 assert.equal(gripApexCue(900,true,true,true,g).phase,"gripping");
 assert.equal(gripApexCue(900,true,true,false,g).phase,"armed");
 assert.equal(RACING_FEEL.noAutosteer,true);
 assert.equal(RACING_FEEL.noAutomaticGrip,true);
 assert.equal(gripApexCue(6800+900,true,false,false,g).visible,true);
});
test("local bounded 120Hz C2 projection matches previous sampling to sub-decimeter precision",()=>{
 assert.equal(PROJECTION_083.iterations,4);
 assert.equal(PROJECTION_083.trackMagnet,false);
 let maxDs=0,maxDl=0;
 for(let lap=0;lap<3;lap++)for(let s=8;s<3390;s+=43)
 for(const lat of [-7.7,0,7.7]){
  const at=s+lap*3400,p=prior.positionAt(at,lat);
  const heading=prior.headingAt(at);
  const x=p.x+Math.cos(heading)*.6+Math.sin(heading)*.5;
  const z=p.z+Math.sin(heading)*.6-Math.cos(heading)*.5;
  const before=prior.projectWorldToTrack(x,z,at);
  const after=projectWorldToTrack(x,z,at);
  maxDs=Math.max(maxDs,Math.abs(before.s-after.s));
  maxDl=Math.max(maxDl,Math.abs(before.lateral-after.lateral));
 }
 assert.ok(maxDs<.04,"unexpected longitudinal re-projection error: "+maxDs);
 assert.ok(maxDl<.002,"unexpected lateral drift: "+maxDl);
 assert.deepEqual(validateTrial(),[]);
});
test("rail scrub is physically subtle, shield-safe and absent from a clean line",()=>{
 const old=startAt(895,4.3,1,prior);
 const upgraded=startAt(895,4.3,1);
 for(let i=0;i<90;i++){
  const dt=1/120;
  prior.stepFlight(old,dt,{steer:.8,grip:false});
  stepFlight(upgraded,dt,{steer:.8,grip:false});
 }
 assert.ok(upgraded.railContactStarts>=1);
 assert.ok(upgraded.railScrubSeconds>.04);
 assert.ok(upgraded.railScrubLossMeters>0);
 assert.ok(upgraded.currentSpeed<old.currentSpeed*.995);
 assert.ok(upgraded.currentSpeed>old.currentSpeed*.88);
 assert.equal(upgraded.shield,100);
 assert.equal(upgraded.falls,0);
 const clean=startAt(895,0,0);
 for(let i=0;i<30;i++)stepFlight(clean,1/120,{steer:0,grip:false});
 assert.equal(clean.railContactStarts,0);
 assert.equal(clean.railScrubLossMeters,0);
 assert.equal(clean.railScrubIntensity,0);
 assert.equal(clean.gripActiveSeconds,0);
});
test("rail feedback is a single short HUD cue without extra world effects",()=>{
 const s=createRailFeedbackState();
 startRailFeedback(s,-1);
 assert.equal(s.contacts,1);
 assert.equal(s.lastSide,-1);
 near(stepRailFeedback(s,.12,true),(.92*(1-.10/.36)),1e-7);
 for(let i=0;i<30;i++)stepRailFeedback(s,.05,false);
 assert.equal(s.pulse,0);
 assert.equal(s.contacts,1);
 assert.equal(RACING_FEEL.additionalDrawCalls,0);
 assert.equal(RACING_FEEL.extraRenderPasses,0);
});
test("2 near-miss 328-degree air tricks can now finish with identical pilot hold",()=>{
 assert.ok(AIR_TRICKS.rollSpeedRadiansPerSecond>11.8);
 assert.ok(AIR_TRICKS.rollSpeedRadiansPerSecond<14);
 for(const dir of [-.70,.70]){
  const a=initAirTrickState({grounded:false,railContacts:0,lateral:0});

  beginAirTrick(a,1);
  let completion=0;
  for(let i=0;i<63;i++){
   const r=advanceAirTrick(a,1/120,dir,true);
   completion+=Number(r.completed);
  }
  assert.equal(completion,1);
  assert.equal(a.trickFullRotations,1);
  near(a.trickPeakDegrees,360);
 }
});
test("true 3D track and all physical meshes remain unchanged",()=>{
 assert.equal(TRIAL.raceLength,10200);
 near(SKYLINE_LEAP.start,prior.SKYLINE_LEAP.start);
 near(SKYLINE_LEAP.end,prior.SKYLINE_LEAP.end);
 near(MAGNETIC_WALL.start,prior.MAGNETIC_WALL.start);
 near(MAGNETIC_WALL.end,prior.MAGNETIC_WALL.end);
 near(CORKSCREW.start,prior.CORKSCREW.start);
 near(CORKSCREW.end,prior.CORKSCREW.end);
 for(const at of [0,160,573,840,905,995,1662,1810,3005,3171.5,3337,3400]){
  near(widthAt(at),prior.widthAt(at),1e-10);
  near(curvatureAt(at),prior.curvatureAt(at),1e-10);
 }
 assert.ok(createSmoothDeckData().triangles>25000);
 assert.ok(createAeroBarrierData().triangles>90000);
});
test("complete 3×3400m manually steered race crosses every feature without regressions",()=>{
 const f=newFlightState();
 const stats={jump:0,land:0,wall:0,wallEnd:0,cork:0,corkEnd:0,
  apex:0,cleanApex:0,lap:0,boost:0,crash:0};
 const inverse=x=>{
  if(Math.abs(x)<.001)return 0;
  const y=Math.min(1,Math.abs(x));
  const n=(-.32+Math.sqrt(.1024+2.72*y))/1.36;
  return Math.sign(x)*(.055+.945*n);
 };
 // Pilot follows a target through yaw commands ONLY. No position snaps,
 // steering magnets, or synthetic lap advancement are supplied.
 for(let i=0;i<26000&&!f.finished&&!f.failed;i++){
  const curve=curvatureAt(f.s+f.currentSpeed*.1);
  const desired=curve*f.currentSpeed+
   .95*(headingAt(f.s)-f.heading)-.12*f.lateral;
  const d=(f.s%3400+3400)%3400;
  const grip=f.grounded&&d>760&&d<995&&f.zoneSpeedStage>=3;
  const authority=grip?1.27:1;
  const steer=Math.max(-1,Math.min(1,
   inverse(desired/(TRIAL.maxYawRate*authority))));
  const r=stepFlight(f,1/120,{steer,grip});
  stats.jump+=Number(r.jumped);stats.land+=Number(r.landed);
  stats.wall+=Number(r.wallEntered);stats.wallEnd+=Number(r.wallExited);
  stats.cork+=Number(r.corkscrewEntered);stats.corkEnd+=Number(r.corkscrewExited);
  stats.apex+=Number(r.gripApexEntered);
  stats.cleanApex+=Number(r.cleanGripApexExit);
  stats.lap+=Number(r.lapCompleted>0);
  stats.boost+=Number(Boolean(r.boostActivated));
  stats.crash+=Number(r.crashed);
  const stage=Math.min(8,Math.floor(f.elapsed/18));
  if(stage>f.zoneSpeedStage)setZoneSpeedStage(f,stage);
 }
 assert.equal(f.finished,true);
 assert.equal(f.failed,false);
 assert.equal(f.s,10200);
 assert.equal(f.railContacts,0);
 assert.equal(f.falls,0);
 assert.equal(f.shield,100);
 assert.equal(f.railScrubLossMeters,0);
 assert.equal(f.gripApexCleanExits,3);
 assert.ok(f.gripActiveSeconds>1);
 assert.deepEqual(stats,{jump:3,land:3,wall:3,wallEnd:3,cork:3,
  corkEnd:3,apex:3,cleanApex:3,lap:3,boost:9,crash:0});
 assert.equal(f.lapTimes.length,3);
 assert.ok(f.elapsed>140&&f.elapsed<165);
});
test("low-memory HDR can truly downshift below 1x while premium devices remain crisp",()=>{
 const low=clarityProfile(4,3),premium=clarityProfile(8,3);
 assert.deepEqual(low.internalTiers,[1.25,.98,.82]);
 assert.deepEqual(premium.internalTiers,[2,1.75,1.5]);
 assert.equal(dprForAdaptiveLevel(low,2),.82);
 assert.match(source("./neon-v083.mjs"),/Math.max\(\.82,/);
 assert.match(source("./game-v0103.mjs"),/image-clarity-v083/);
 assert.match(source("./game-v0103.mjs"),/neon-v083/);
});
test("live page, controls and telemetry point to 0.10.3 and retain archive",()=>{
 const index=source("./index.html"),boot=source("./boot-v0103.js"),
  game=source("./game-v0103.mjs"),css=source("./style-v083.css");
 assert.match(index,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(index,/data-game-module="game-v0103\.mjs"/);
 assert.match(index,/id="grip-cue"/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/racing-feel-v083\.mjs/);
 assert.match(game,/railScrubLossMeters/);
 assert.match(game,/grip_guidance_start/);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 assert.match(css,/#grip-cue/);
 assert.match(source("./game-v082.mjs"),/version:"0\.8\.2"/);
});
