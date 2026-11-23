// SKYSHIFT 0.16.5: original line-of-code root-cause regression.
// Old Aurora no-jump prearm was TRUE from 475 to 3400m EVERY lap.
// Thus holding GRIP & full turn reduced yaw by 93.5%.
import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
const src=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const run=track=>JSON.parse(execFileSync(process.execPath,[
 new URL("../../"+"./grip-trick-audit-v0165.mjs",import.meta.url).pathname,track],
 {encoding:"utf8",maxBuffer:512000}));
const aurora=run("aurora"),skyline=run("skyline");
const near=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,
 "expected "+a+" ≈ "+b);
test("actual no-jump Aurora bug reproduced at 510m and after full three laps",()=>{
 assert.equal(aurora.gapCount,0);
 assert.equal(aurora.track,"aurora-flow-v0160");
 const first=aurora.pairs.find(x=>x.s===120);
 near(first.previous.yawRate,first.fixed.yawRate);
 for(const {s,previous:old,fixed:now} of aurora.pairs){
  if(s<=470)continue;
  assert.equal(old.gripActive,true,"old GRIP press should still register");
  assert.equal(now.gripActive,true,"new GRIP should be active");
  assert.ok(now.gripIntensity>.80,"GRIP ramp must reach real authority at "+s);
  assert.ok(now.yawRate>Math.abs(old.yawRate)*5,
   "prearm suppressed GRIP yaw by >5× at "+s+
   " old="+old.yawRate+" fixed="+now.yawRate);
  assert.ok(now.gripPreArmTicks===0&&now.gripYawSuppressedTicks===0,
   "a jump-free circuit must never enter trick prearm at "+s);
 }
});
test("wall impact is NOT needed to trigger GRIP turning bug",()=>{
 const p=aurora.pairs.find(x=>x.s===1300);
 assert.equal(p.previous.contactTicks,0);
 assert.equal(p.fixed.contactTicks,0);
 assert.ok(p.fixed.maxTurn>p.previous.maxTurn*5);
});
test("GRIP stays effective after wall contact, either side, late lap 3",()=>{
 for(const {side,previous:old,fixed:now} of aurora.impacts){
  assert.ok(now.contactTicks>0,
   "actual physical contact was not exercised, side "+side);
  assert.ok(now.maxTurn>old.maxTurn*5,
   "GRIP was still trick-locked at impact on side "+side);
  assert.equal(now.gripPreArmTicks,0);
  assert.equal(now.gripYawSuppressedTicks,0);
 }
});
test("preserve the actual Skyline pre-jump TRICK/GRIP behavior byte-for-byte",()=>{
 assert.equal(skyline.gapCount,1);
 for(const row of [...skyline.pairs,...skyline.skylineJump]){
  near(row.previous.yawRate,row.fixed.yawRate,1e-10);
  near(row.previous.headingDelta,row.fixed.headingDelta,1e-10);
  near(row.previous.endS,row.fixed.endS,1e-9);
  near(row.previous.gripIntensity,row.fixed.gripIntensity,1e-10);
 }
 const before=skyline.skylineJump.find(x=>x.s===445);
 const approach=skyline.skylineJump.find(x=>x.s===500);
 const beyond=skyline.skylineJump.find(x=>x.s===620);
 assert.equal(before.fixed.gripPreArmTicks,0);
 assert.ok(approach.fixed.gripPreArmTicks>0,
  "Skyline trick pre-arm still required when actual jump approaches");
 assert.equal(beyond.fixed.gripPreArmTicks,0);
});
test("only actual near-gap can suppress GRIP yaw; physics has no track forks",()=>{
 const f=src("./trial-v0165.mjs");
 assert.match(f,/Boolean\(nextGap\(st\.s\)\)/);
 const physics=f.slice(f.indexOf("export function stepFlight("));
 assert.doesNotMatch(physics,/isAurora\(/,
  "no track-specific GRIP handling or wall rules");
 assert.match(physics,/const desired=input\*TRIAL\.maxYawRate\*yawFactor\*/);
 assert.match(physics,/gripPreArmTicks\+\+/);
 assert.match(physics,/gripYawSuppressedTicks\+\+/);
 assert.match(src("./time-trial-v0160.mjs"),/skyshift-time-trial-ghost-aurora-0160/);
 assert.match(src("./tracks/shared/track-selection-v0160.mjs"),/trackRevision:"aurora-run-0160"/);
 assert.match(src("./index.html"),/boot-v0205\.js\?v=0\.20\.5/);
 assert.match(src("./boot-v0165.js"),/game-v0165\.mjs\?v=0\.16\.5/);
});
