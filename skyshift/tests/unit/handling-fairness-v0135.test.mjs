import test from "node:test";
import assert from "node:assert/strict";
import {auditHandlingFairness,FAIRNESS_0135,sectionCurvature,
 simulateApproach,yawFeasibility} from "../../handling-fairness-v0135.mjs";
import {COURSE_SEGMENTS,TRIAL,GRIP_APEX,stepFlight,newFlightState}
 from "../../trial-v01348.mjs";
import {readFileSync} from "node:fs";
test("full authored course has deterministic finite curvature and lane width",()=>{
 const a=auditHandlingFairness();
 const b=auditHandlingFairness();
 assert.deepEqual(a,b);
 assert.equal(a.geometry.length,COURSE_SEGMENTS.filter(s=>s.type==="turn").length);
 assert.equal(a.stressEnvelope.length,a.geometry.length*
  FAIRNESS_0135.stressZones.length*FAIRNESS_0135.stressBoosts.length);
 assert.ok(a.geometry.every(x=>x.peakCurvature>0&&x.radiusMeters>0&&
  x.minSteeringRoomMeters>0));
 assert.equal(GRIP_APEX.minWidthMeters,14);
 assert.ok(a.geometry.some(x=>x.peakCurvature>.015));
});
test("new GRIP balance flagged without any hidden physics or rail assist",()=>{
 const a=auditHandlingFairness();
 assert.ok(a.warnings.centerlineAuthorityCases>0);
 assert.ok(a.warnings.highSpeedGripDeficits>0);
 assert.ok(a.stressEnvelope.some(x=>x.zone===0&&x.boost===1&&
  x.authorityMargin>1));
 assert.ok(a.stressEnvelope.every(x=>Number.isFinite(x.physicalSpeedMetersPerSecond)&&
  x.authorityMargin!==null&&x.maxGripYawRadiansPerSecond>0));
 assert.equal(FAIRNESS_0135.autopilotAddedToGame,false);
});
test("idealized 120Hz driving probe never changes active physics",()=>{
 const a=simulateApproach({id:"precision-apex",zone:0,grip:true});
 assert.ok(a.frames>0&&a.frames<3600);
 assert.ok(Number.isFinite(a.peakHeadingErrorDeg));
 assert.ok(Number.isFinite(a.peakLateralMeters));
 assert.ok(!a.failed);
 const x=readFileSync(new URL("../../"+"./trial-v01348.mjs",import.meta.url),"utf8");
 assert.match(x,/const result=stepLandingBoost|stepLandingBoost\(st,dt/);
 assert.doesNotMatch(x,/handling-fairness-v0135|simulateApproach/);
});
test("exact same steered physics used by Manta and Stingray and prior build",()=>{
 const game=readFileSync(new URL("../../"+"./legacy/game/game-v0135.mjs",import.meta.url),"utf8");
 assert.match(game,/from "\.\/trial-v01348\.mjs"/);
 assert.match(game,/const result=stepFlight\(flight,dt,\{steer,grip:gripHeld\}\)/);
 assert.match(game,/ship\.rotation\.z=naturalRoll;/);
 assert.match(game,/engine-trails-v01346\.mjs/);
 assert.doesNotMatch(game,/activeShipId\s*===\s*"stingray"\s*\?\s*stable/);
});
