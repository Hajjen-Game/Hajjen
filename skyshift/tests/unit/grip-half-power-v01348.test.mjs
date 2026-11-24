// SKYSHIFT 0.13.4.8 — 50% less *additional* GRIP yaw at every speed.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {STEERING_AUTHORITY as tuned,normalYawFactorAt,
 fullGripYawFactorAt,yawAuthorityAt,steeringBalanceAt}
 from "../../flight/steering-authority-v01348.mjs";
import {STEERING_AUTHORITY as previous,
 yawAuthorityAt as oldYaw,normalYawFactorAt as oldNormal}
 from "../../flight/steering-authority-v0901.mjs";
import {newFlightState,stepFlight,TRIAL} from "../../trial-v01348.mjs";
const near=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<=eps,
  "expected "+a+" ~= "+b+" (delta="+Math.abs(a-b)+")");
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("GRIP bonus exactly halved, NOT the entire authority",()=>{
 assert.equal(tuned.gripBonusFraction,.5);
 assert.equal(tuned.fullGripFactor,previous.fullGripFactor);
 assert.equal(tuned.normalSlowFactor,previous.normalSlowFactor);
 assert.equal(tuned.normalFastFactor,previous.normalFastFactor);
 for(const speed of [44,52,65,80,100,TRIAL.endSpeed,140]){
  const ordinary=normalYawFactorAt(speed);
  const oldOrdinary=oldNormal(speed);
  near(ordinary,oldOrdinary);
  const priorFull=oldYaw(speed,1);
  const full=fullGripYawFactorAt(speed);
  near(full,ordinary+(priorFull-ordinary)*.5);
  near(yawAuthorityAt(speed,0),ordinary);
  near(yawAuthorityAt(speed,.5),ordinary+(priorFull-ordinary)*.25);
  near(yawAuthorityAt(speed,1),full);
  assert.ok(full>ordinary);
  const stats=steeringBalanceAt(speed);
  near(stats.grip,full);
  near(stats.relativeGripGain,full/ordinary);
  near(stats.addedGripAuthority,(priorFull-ordinary)*.5);
 }
 near(yawAuthorityAt(44,1),1.12);
 near(yawAuthorityAt(TRIAL.endSpeed,1),.975);
});
test("identical sign, analog midpoint, and monotonic GRIP pressure",()=>{
 for(const speed of [44,70,TRIAL.endSpeed]){
  let previousValue=-Infinity;
  for(let i=0;i<=100;i++){
   const current=yawAuthorityAt(speed,i/100);
   assert.ok(current>=previousValue);
   previousValue=current;
  }
 }
 assert.equal(tuned.pilotOwnedSteer,true);
 assert.equal(tuned.noAutoSteer,true);
 assert.equal(tuned.noCenterlineMagnet,true);
 assert.equal(tuned.inputResponseUnchanged,true);
 assert.equal(tuned.noDeadzoneChange,true);
});
test("the ACTUAL 120Hz physics responds at the half-power GRIP factor",()=>{
 for(const speed of [44,80,TRIAL.endSpeed]){
  const normal=newFlightState(),gripped=newFlightState();
  for(const f of [normal,gripped]){
   f.currentSpeed=speed;f.zoneCruiseSpeed=speed;
   f.gripIntensity=1;f.yawRate=0;f.steering=0;f.grounded=true;
  }
  // Reset ordinary GRIP to zero. Grip state applies real 85ms attack to
  // the already primed grip state, so use intensity=1 for full-GRIP sample.
  normal.gripIntensity=0;
  stepFlight(normal,1/120,{steer:1,grip:false});
  stepFlight(gripped,1/120,{steer:1,grip:true});
  const k=1-Math.exp(-(1/120)*TRIAL.turnResponse);
  near(normal.yawRate,TRIAL.maxYawRate*normalYawFactorAt(speed)*k,1e-7);
  near(gripped.yawRate,TRIAL.maxYawRate*yawAuthorityAt(speed,1)*k,1e-7);
  assert.ok(gripped.yawRate>normal.yawRate);
 }
});
test("only new gameplay imports change: Manta, Stingray, camera and track intact",()=>{
 const s=read("./game-v01348.mjs");
 assert.match(s,/from "\.\/trial-v01348\.mjs"/);
 assert.match(s,/const result=stepFlight\(flight,dt,\{steer,grip:gripHeld\}\)/);
 assert.match(s,/ship\.rotation\.z=naturalRoll;/);
 assert.match(s,/engine-trails-v01346\.mjs/);
 assert.match(s,/stingray-presentation-v01347\.mjs/);
 assert.doesNotMatch(s,/stableStingrayVisualRoll|const visualLift=activeShipId/);
 assert.equal(tuned.gripAvailableOnFirstLap,true);
});
test("live HTML and bootstrap point to the new version",()=>{
 const html=read("./index.html"),boot=read("./legacy/boot/boot-v01348.js");
 assert.match(html,/boot-v01348\.js\?v=0\.13\.4\.8/);
 assert.match(html,/data-game-module="game-v01348\.mjs"/);
 assert.match(boot,/import\("\.\.\/\.\.\/game-v01348\.mjs\?v=0\.13\.4\.8"\)/);
});
