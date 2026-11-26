// SKYSHIFT 0.16.4 – actual same ship physics on BOTH courses.
// No branch-specific player steering, grip, rail response or projection.
import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
const source=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const run=track=>JSON.parse(execFileSync(process.execPath,
 [new URL("../../qa/track-physics-parity-probe-v0164.mjs",import.meta.url).pathname,track],
 {encoding:"utf8"}));
const skyline=run("skyline"),aurora=run("aurora");
const near=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,`expected ${a} ≈ ${b}`);
test("same 64 real 120Hz steering+GRIP frames, byte-for-byte both tracks",()=>{
 assert.equal(skyline.snapshots.length,64);
 assert.deepEqual(aurora.snapshots,skyline.snapshots,
  "The actual player is not permitted to steer differently on Aurora");
 assert.deepEqual(aurora.steering,skyline.steering);
 assert.equal(aurora.maxYawRate,skyline.maxYawRate);
 assert.equal(aurora.turnResponse,skyline.turnResponse);
 assert.equal(aurora.turnRelease,skyline.turnRelease);
});
test("exact SAME original rail collision law on both courses, both sides",()=>{
 assert.deepEqual(aurora.collision,skyline.collision);
 for(const p of skyline.collision){
  assert.equal(p.hit,true);
  near(p.deltaHeading,0);
  near(p.deltaYawRate,0);
  assert.equal(p.railCorrection,0);
  assert.equal(p.railContacts,1);
 }
});
test("same bounded local tangent projection and no Aurora-only forward lock",()=>{
 assert.deepEqual(aurora.projection,skyline.projection);
 assert.equal(aurora.projection.backwardMeters,4);
 assert.equal(aurora.projection.forwardMeters,10);
 assert.equal(aurora.projection.forwardOnlyOnAurora,false);
 near(aurora.projectedDelta,skyline.projectedDelta,.004);
});
test("source-level proof: physics has ZERO course-specific behavior",()=>{
 const code=source("./trial-v0164.mjs");
 const collision=code.slice(code.indexOf("export function constrainToGuardrail("),
  code.indexOf("const STEP="));
 const integration=code.slice(code.indexOf("export function stepFlight("));
 assert.doesNotMatch(collision,/isAurora\(|railHeadingCorrections\+\+/,
  "rail response must never depend on selected course");
 assert.doesNotMatch(integration,/isAurora\(|gripIntoRail/,
  "physics integration must never depend on selected course");
 assert.match(integration,/const desired=input\*TRIAL\.maxYawRate\*yawFactor/);
 assert.match(integration,/const q=projectWorldToTrack\(st\.worldX,st\.worldZ,st\.s\)/);
 assert.match(collision,/st\.worldX=contact\.x;st\.worldZ=contact\.z;st\.lateral=clamped/);
});
test("Aurora has road-only fairness: 180° radii >200m, 220m finish straight",()=>{
 assert.equal(aurora.finalSection.type,"straight");
 assert.ok(aurora.finalSection.length>=219.9);
 assert.ok(aurora.turnRadii.length===6);
 assert.ok(Math.min(...aurora.turnRadii)>200,
  "original hairpins at 119.5m and 124.8m created wall-riding");
 assert.ok(aurora.closureError<.1);
 assert.ok(Math.max(...aurora.turnRadii)<400);
});
test("Skyline original course stays unchanged; Aurora PB has a new revision",()=>{
 assert.equal(skyline.track,"skyline-grip-first-v0901");
 assert.equal(aurora.track,"aurora-flow-v0164");
 const reg=source("./tracks/shared/track-selection-v0160.mjs");
 assert.match(reg,/trackRevision:"aurora-fair-flow-0164"/);
 assert.match(reg,/trackRevision:"skyline-risk-diversity-0151"/);
 const records=source("./time-trial-v0160.mjs");
 assert.match(records,/skyshift-time-trial-ghost-aurora-0164/);
 assert.match(records,/skyshift-time-trial-ghost-0151/);
 const game=source("./legacy/game/game-v0164.mjs"),html=source("./index.html");
 assert.match(game,/from "\.\/trial-v0164\.mjs"/);
 assert.match(html,/boot-v0164\.js\?v=0\.16\.4/);
 assert.match(source("./legacy/boot/boot-v0164.js"),/game-v0164\.mjs\?v=0\.16\.4/);
});
