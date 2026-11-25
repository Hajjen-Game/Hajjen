// SKYSHIFT 0.16.2 — physically grounded guardrail regression, last turn/lap.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
globalThis.location={search:"?track=aurora"};
const [trial,audit,oldTrial,camera]=await Promise.all([
 import("../../trial-v0162.mjs"),
 import("../../rail-contact-audit-v0162.mjs"),
 import("../../tracks/trials/trial-v0160.mjs"),
 import("../../cinematic-v0162.mjs")]);
const src=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("real log reproduced: old Aurora rail solver allowed backwards arc projection",()=>{
 assert.equal(oldTrial.PROJECTION_083.backwardMeters,4);
 assert.equal(trial.PROJECTION_083.backwardMeters,0);
 assert.equal(trial.PROJECTION_083.forwardOnlyOnAurora,true);
 assert.equal(trial.PROJECTION_083.trackMagnet,false);
 assert.equal(trial.TRIAL.maxYawRate,oldTrial.TRIAL.maxYawRate);
 assert.equal(trial.TRIAL.turnResponse,oldTrial.TRIAL.turnResponse);
 assert.equal(trial.TRIAL.turnRelease,oldTrial.TRIAL.turnRelease);
 assert.equal(trial.TRIAL.steerDeadzone,oldTrial.TRIAL.steerDeadzone);
 assert.equal(trial.TRIAL.zoneSpeedStep,oldTrial.TRIAL.zoneSpeedStep);
 assert.equal(trial.GUARDRAIL.collisionMargin,oldTrial.GUARDRAIL.collisionMargin);
 assert.equal(trial.CIRCUIT.lapLength,3400);
 assert.equal(trial.CIRCUIT.laps,3);
});
test("seven actual collision locations remain moving forward, no reverse ghost frames",()=>{
 let correctionCases=0;
 const summaries=[];
 for(const scenario of audit.RAIL_SCENARIOS_0162){
  const a=audit.runRailContactScenario(scenario);
  summaries.push({name:scenario.id,s:a.endS.toFixed(1),
   contacts:a.railContacts,corrections:a.railHeadingCorrections,
   ghostInvalid:a.invalidGhostSamples,maxStep:a.maxWorldStep.toFixed(2)});
  assert.ok(a.railContactTicks>0,"never hit real rail at "+scenario.id);
  assert.equal(a.backwards,0,"reverse progress at "+scenario.id);
  assert.equal(a.reverseProjectionTicks,0,"negative projection at "+scenario.id);
  assert.ok(a.minArcDelta>=-1e-8,"ghost arc rewound at "+scenario.id);
  assert.ok(a.maxArcDelta<=trial.speedAt(scenario.s,8)/120*1.16,
   "surprise 10m projection jump at "+scenario.id);
  assert.equal(a.invalidGhostSamples,0,"real PB rejected at "+scenario.id);
  assert.ok(a.validGhostSamples>10,"not enough recorded samples "+scenario.id);
  assert.ok(a.maxWorldStep<3.0,"world-space teleport at "+scenario.id);
  assert.ok(a.travelledMeters>20,"stalled on wall "+scenario.id);
  assert.ok(a.maxOutwardOnContactDegrees<=30.1,
   "nose rotates through barrier "+scenario.id);
  assert.ok(!a.failed,"ship crashed solely on legal guardrail "+scenario.id);
  if(a.railHeadingCorrections>0)correctionCases++;
 }
 assert.ok(correctionCases>=3,"head-on wall pressure never physically resolved");
 console.log("RAIL AUDIT 0.16.2",JSON.stringify(summaries));
});
test("physical wall normal clips only outward yaw; away steering is not magnetized",()=>{
 const report=audit.runRailContactScenario({s:9867,side:-1,seconds:3});
 assert.ok(report.railHeadingCorrections>0);
 assert.ok(report.peakBlockedDegrees>0);
 assert.ok(report.maxOutwardOnContactDegrees<=30.1);
 assert.ok(report.validGhostSamples>0);
 assert.ok(report.endS>=9867);
 assert.equal(report.backwards,0);
 assert.ok(Math.abs(report.finalLateral)<=report.physicalRailLimit+1e-6);
});
test("Aurora race still has no fake corkscrew, risk lanes or GRIP apex",async()=>{
 const risk=await import("../../risk-reward-v0160.mjs");
 assert.equal(trial.TRACK_3D.corkscrew,false);
 assert.equal(trial.TRACK_3D.wallRide,false);
 assert.equal(trial.GAPS.length,0);
 assert.equal(risk.BOOST_CHOICES_0160.length,0);
 assert.ok(Math.abs(camera.cameraBankAt(3180))<.13);
});
test("same course geometry, no broad rebalance or altered ship/camera animations",()=>{
 for(let s=0;s<3400;s+=17){
  const a=oldTrial.positionAt(s),b=trial.positionAt(s);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-8);
  assert.ok(Math.abs(oldTrial.headingAt(s)-trial.headingAt(s))<1e-10);
  assert.ok(Math.abs(oldTrial.bankAt(s)-trial.bankAt(s))<1e-10);
  assert.equal(oldTrial.guardrailLateralLimit(s),trial.guardrailLateralLimit(s));
 }
 const game=src("./legacy/game/game-v0162.mjs");
 assert.match(game,/from "\.\/trial-v0162\.mjs"/);
 assert.match(game,/from "\.\/aero-barrier-v0162\.mjs"/);
 assert.match(game,/from "\.\/rail-scrape-sparks-v0162\.mjs"/);
 assert.match(game,/from "\.\/cinematic-v0162\.mjs"/);
 assert.match(game,/from "\.\/unified-flight-v0162\.mjs"/);
 assert.match(game,/railHeadingCorrections:flight\.railHeadingCorrections/);
 assert.match(game,/reverseProjectionTicks:flight\.reverseProjectionTicks/);
 assert.match(src("./index.html"),/boot-v0162\.js\?v=0\.16\.2/);
 assert.match(src("./legacy/boot/boot-v0162.js"),/game-v0162\.mjs\?v=0\.16\.2/);
});
