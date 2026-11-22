// SKYSHIFT 0.8.4 – realistic manual-racing authority and grip balance regression.
// Original SKYSHIFT 0.8.3 remains independently testable and playable via archive.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as previous from "../../trial-v083.mjs";
import {
 STEERING_AUTHORITY,normalYawFactorAt,yawAuthorityAt,steeringBalanceAt
} from "../../steering-authority-v084.mjs";
import {GRIP_SPEC,initGripState,stepGripState} from "../../precision-grip-v084.mjs";
import {createSmoothDeckData} from "../../smooth-track-v084.mjs";
import {createAeroBarrierData} from "../../aero-barrier-v084.mjs";
import {
 TRIAL,CIRCUIT,GRIP_APEX,SKYLINE_LEAP,MAGNETIC_WALL,CORKSCREW,
 widthAt,curvatureAt,positionAt,surfaceHeightAt,headingAt,speedAt,
 validateTrial,newFlightState,stepFlight,setZoneSpeedStage,shapeSteer
} from "../../trial-v084.mjs";
const near=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<=eps,
 "expected "+a+" within "+eps+" of "+b);
const src=name=>readFileSync(new URL("../../"+name,import.meta.url),"utf8");

// Exactly invert the existing shaped analog stick in a *test pilot* only.
// The production game never receives an automated target heading or lane.
function inverseSteer(x){
 if(Math.abs(x)<.001)return 0;
 const v=Math.min(1,Math.abs(x));
 const raw=(-.32+Math.sqrt(.1024+2.72*v))/1.36;
 return Math.sign(x)*(.055+.945*raw);
}
function driveSegment(zone,gripMode){
 const f=newFlightState(),p=positionAt(730,0);
 Object.assign(f,{s:730,lateral:0,worldX:p.x,worldZ:p.z,
  heading:headingAt(730),y:surfaceHeightAt(730)+TRIAL.hoverHeight,
  zoneSpeedStage:zone,zoneCruiseSpeed:speedAt(730,zone),
  currentSpeed:speedAt(730,zone)});
 for(let i=0;i<1000&&f.s<1045;i++){
  const v=f.currentSpeed,d=f.s%3400;
  const useGrip=gripMode&&d>=740&&d<1010;
  const wanted=curvatureAt(f.s+v*.1)*v+
   .95*(headingAt(f.s)-f.heading)-.12*f.lateral;
  const input=Math.max(-1,Math.min(1,
   inverseSteer(wanted/(TRIAL.maxYawRate*yawAuthorityAt(v,f.gripIntensity)))));
  stepFlight(f,1/120,{steer:input,grip:useGrip});
 }
 return f;
}
function driveThreeLaps(useGrip){
 const f=newFlightState(),counts={jump:0,land:0,wall:0,wallExit:0,
  cork:0,corkExit:0,apex:0,cleanApex:0,lap:0,boost:0};
 for(let i=0;i<26000&&!f.finished&&!f.failed;i++){
  const s=((f.s%3400)+3400)%3400,v=f.currentSpeed;
  const grip=Boolean(useGrip&&f.grounded&&f.zoneSpeedStage>=3&&
   s>=740&&s<1010);
  const desired=curvatureAt(f.s+v*.1)*v+
   .95*(headingAt(f.s)-f.heading)-.12*f.lateral;
  const input=Math.max(-1,Math.min(1,
   inverseSteer(desired/(TRIAL.maxYawRate*yawAuthorityAt(v,f.gripIntensity)))));
  const r=stepFlight(f,1/120,{steer:input,grip});
  counts.jump+=Number(r.jumped);counts.land+=Number(r.landed);
  counts.wall+=Number(r.wallEntered);counts.wallExit+=Number(r.wallExited);
  counts.cork+=Number(r.corkscrewEntered);counts.corkExit+=Number(r.corkscrewExited);
  counts.apex+=Number(r.gripApexEntered);
  counts.cleanApex+=Number(r.cleanGripApexExit);
  counts.lap+=Number(r.lapCompleted>0);
  counts.boost+=Number(Boolean(r.boostActivated));
  const next=Math.min(8,Math.floor(f.elapsed/18));
  if(next>f.zoneSpeedStage)setZoneSpeedStage(f,next);
  if(r.crashed)break;
 }
 return {f,counts};
}

test("normal steering is progressive, predictable and only weakens as speed rises",()=>{
 const cfg=STEERING_AUTHORITY;
 assert.equal(cfg.normalSlowFactor,.96);
 assert.equal(cfg.normalFastFactor,.66);
 assert.equal(cfg.fullGripFactor,1.55);
 assert.equal(cfg.noAutoSteer,true);
 assert.equal(cfg.noCenterlineMagnet,true);
 assert.equal(cfg.inputResponseUnchanged,true);
 near(normalYawFactorAt(44),.96);
 near(normalYawFactorAt(TRIAL.endSpeed),.66);
 near(normalYawFactorAt(150),.66);
 near(normalYawFactorAt(2),.96);
 let last=Infinity;
 for(let v=44;v<=102;v+=2){
  const now=normalYawFactorAt(v);
  assert.ok(now<=last+1e-9);last=now;
 }
 assert.ok(normalYawFactorAt(82)<normalYawFactorAt(60));
 assert.equal(TRIAL.turnResponse,previous.TRIAL.turnResponse);
 assert.equal(TRIAL.turnRelease,previous.TRIAL.turnRelease);
 assert.equal(TRIAL.maxYawRate,previous.TRIAL.maxYawRate);
});
test("GRIP has its own fast carve authority without reversing or steering for the pilot",()=>{
 for(const speed of [44,55,67,82,101,142]){
  const base=normalYawFactorAt(speed),full=yawAuthorityAt(speed,1);
  near(yawAuthorityAt(speed,0),base);
  near(yawAuthorityAt(speed,.5),(base+full)/2);
  near(full,1.55);
  assert.ok(full>base);
  near(steeringBalanceAt(speed).relativeGripGain,1.55/base);
 }
 const f=initGripState({}),dt=1/120;
 for(let i=0;i<80;i++)stepGripState(f,dt,.85,true,true);
 assert.equal(f.gripActive,true);
 assert.ok(f.gripIntensity>.99);
 assert.equal(GRIP_SPEC.maxSpeedPenalty,.065);
 assert.equal(GRIP_SPEC.noAutoSteer,true);
 const a=initGripState({});
 const noSteer=stepGripState(a,dt,0,true,true);
 assert.equal(noSteer.active,false);
 assert.equal(a.gripActivations,0);
 near(shapeSteer(-.7),-shapeSteer(.7));
});
test("the first lap is approachable without a forced GRIP turn",()=>{
 const normal=driveSegment(0,false);
 assert.equal(normal.railContacts,0);
 assert.equal(normal.falls,0);
 assert.equal(normal.gripActivations,0);
 const mid=driveSegment(4,false);
 assert.equal(mid.railContacts,0);
});
test("at the third-lap pace GRIP makes the 14m apex a cleanly navigable skill",()=>{
 const normal=driveSegment(6,false),carving=driveSegment(6,true);
 assert.ok(normal.railContacts>0,
  "speed-stage-six reference pilot should graze the rail with normal steering");
 assert.equal(carving.railContacts,0);
 assert.ok(carving.gripActiveSeconds>1);
 assert.ok(carving.peakGripRelativeGain>1.45);
 assert.equal(carving.falls,0);
 assert.equal(carving.shield,100);
 const fastest=driveSegment(8,true);
 assert.equal(fastest.railContacts,0);
 assert.equal(fastest.falls,0);
});
test("pilot-driven three-lap race retains all real 3D spectacles and boost pads",()=>{
 const {f,counts}=driveThreeLaps(true);
 assert.equal(f.finished,true);
 assert.equal(f.failed,false);
 assert.equal(f.s,10200);
 assert.deepEqual(counts,{jump:3,land:3,wall:3,wallExit:3,
  cork:3,corkExit:3,apex:3,cleanApex:3,lap:3,boost:9});
 assert.equal(f.railContacts,0);
 assert.equal(f.falls,0);
 assert.equal(f.shield,100);
 assert.equal(f.gripApexCleanExits,3);
 assert.ok(f.gripActiveSeconds>5);
 assert.equal(f.lapTimes.length,3);
 assert.ok(f.elapsed>140&&f.elapsed<165);
 assert.ok(f.minNormalYawFactor<.72);
 assert.ok(f.maxActualYawFactor>1);
});
test("full-length no-GRIP run remains completable but loses a clean high-speed apex",()=>{
 const {f,counts}=driveThreeLaps(false);
 assert.equal(f.finished,true);
 assert.equal(f.falls,0);
 assert.equal(f.shield,100);
 assert.equal(counts.jump,3);
 assert.equal(counts.land,3);
 assert.equal(counts.wall,3);
 assert.equal(counts.cork,3);
 assert.equal(counts.lap,3);
 assert.equal(f.gripActivations,0);
 assert.ok(f.railContacts>=1);
 assert.ok(f.gripApexCleanExits<3);
});
test("unchanged track, rails, physical leap, wall and corkscrew",()=>{
 assert.deepEqual(validateTrial(),[]);
 assert.equal(CIRCUIT.lapLength,3400);
 assert.equal(CIRCUIT.laps,3);
 assert.equal(TRIAL.raceLength,10200);
 assert.equal(GRIP_APEX.minWidthMeters,14);
 for(const s of [0,160,570,600,790,850,905,995,1662,1842,2200,
  2500,3005,3200,3338,3400]){
  near(widthAt(s),previous.widthAt(s),1e-10);
  near(curvatureAt(s),previous.curvatureAt(s),1e-10);
  near(headingAt(s),previous.headingAt(s),1e-10);
 }
 near(SKYLINE_LEAP.start,previous.SKYLINE_LEAP.start);
 near(SKYLINE_LEAP.end,previous.SKYLINE_LEAP.end);
 near(MAGNETIC_WALL.start,previous.MAGNETIC_WALL.start);
 near(MAGNETIC_WALL.end,previous.MAGNETIC_WALL.end);
 near(CORKSCREW.start,previous.CORKSCREW.start);
 near(CORKSCREW.end,previous.CORKSCREW.end);
 assert.ok(createSmoothDeckData().triangles>25000);
 assert.ok(createAeroBarrierData().triangles>90000);
});
test("active 0.10.3 camera build references archived 0.8.4 yaw for its legacy physics tests",()=>{
 const html=src("./index.html"),boot=src("./boot-v0103.js"),
  game=src("./game-v0103.mjs");
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(src("./trial-v084.mjs"),/steering-authority-v084/);
 assert.match(game,/steeringBalanceAt/);
 assert.match(game,/precision-grip-v084/);
 assert.match(game,/trial-v0901\.mjs/);
 assert.match(src("./trial-v0901.mjs"),/steering-authority-v0901/);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 assert.match(src("./game-v084.mjs"),/version:"0\.8\.4"/);
 assert.match(src("./game-v083.mjs"),/version:"0\.8\.3"/);
});
