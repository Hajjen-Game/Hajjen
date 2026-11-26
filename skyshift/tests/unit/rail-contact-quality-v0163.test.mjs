// SKYSHIFT 0.16.3 — reproduce the wall/GRIP hard-yaw snap from player log.
// The actual 0.16.2 solver could turn the ship 21.9° in ONE 120Hz tick,
// despite monotone ghost samples. Test contact physics, not only lap time.
import test from "node:test";
import assert from "node:assert/strict";
globalThis.location={search:"?track=aurora"};
const [oldPhysics,newPhysics,audit,cinematic]=await Promise.all([
 import("../../trial-v0162.mjs"),
 import("../../trial-v0163.mjs"),
 import("../../qa/rail-contact-audit-v0163.mjs"),
 import("../../cinematic-v0163.mjs")
]);
const dt=1/120;
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function impactState(physics,s,side,error=.9){
 const st=physics.newFlightState(),limit=physics.guardrailLateralLimit(s);
 const p=physics.positionAt(s,side*(limit+.36));
 Object.assign(st,{s,lateral:side*(limit+.36),worldX:p.x,worldZ:p.z,
  heading:physics.headingAt(s)+side*error,
  yawRate:side*.75,currentSpeed:101.4,
  zoneSpeedStage:8,zoneCruiseSpeed:101.4,
  lap:Math.min(3,Math.floor(s/3400)+1)});
 return st;
}
test("reproduce archived 22° hard snap at actual lap 3 outside rail collision",()=>{
 const s=9852,side=-1;
 const old=impactState(oldPhysics,s,side),newer=impactState(newPhysics,s,side);
 const oldHeading=old.heading,newHeading=newer.heading;
 assert.equal(oldPhysics.constrainToGuardrail(old,dt),true);
 assert.equal(newPhysics.constrainToGuardrail(newer,dt),true);
 const oldJump=Math.abs(angleDelta(old.heading,oldHeading))*180/Math.PI;
 const newJump=Math.abs(angleDelta(newer.heading,newHeading))*180/Math.PI;
 assert.ok(oldJump>20,"must reproduce reported 21.9-degree single-tick change");
 assert.ok(newJump<1,"a 120Hz collision must not yaw teleport the camera");
 assert.ok(newJump<oldJump*.05,"must greatly improve the old violent contact");
 assert.ok(newer.railHeadingCorrections>0);
 assert.ok(newer.railMaxInstantCorrection<1.9*dt+1e-9);
 console.log("ACTUAL YAW IMPULSE COMPARISON",JSON.stringify({
  oldSingleTickDegrees:+oldJump.toFixed(2),
  newSingleTickDegrees:+newJump.toFixed(2),oldCollisionAt:s}));
});
test("both left/right impacts recover over time without any sudden heading rotation",()=>{
 for(const s of [3139,8141,9852,10060]){
  for(const side of [-1,1]){
   const st=impactState(newPhysics,s,side,1.02);
   let maximum=0;
   for(let i=0;i<110;i++){
    const before=st.heading;
    const limit=newPhysics.guardrailLateralLimit(s);
    const lateral=side*(limit+.3);
    const p=newPhysics.positionAt(s,lateral);
    st.s=s;st.lateral=lateral;st.worldX=p.x;st.worldZ=p.z;
    newPhysics.constrainToGuardrail(st,dt);
    maximum=Math.max(maximum,Math.abs(angleDelta(st.heading,before)));
   }
   const now=side*angleDelta(st.heading,newPhysics.headingAt(s));
   assert.ok(maximum<=1.9*dt+1e-7,"hard 120Hz yaw impulse came back");
   assert.ok(now<=.521,"must gradually recover below glancing angle");
   assert.equal(st.railContacts,1);
  }
 }
});
test("rail suppresses ONLY outward GRIP demand; inward GRIP remains pilot-owned",()=>{
 const s=9852,side=-1;
 const into=impactState(newPhysics,s,side,.20);
 into.lateral=side*(newPhysics.guardrailLateralLimit(s)-.2);
 let p=newPhysics.positionAt(s,into.lateral);
 Object.assign(into,{worldX:p.x,worldZ:p.z,railContacting:true,lastRailSide:side,
   yawRate:0,heading:newPhysics.headingAt(s)-.2});
 newPhysics.stepFlight(into,dt,{steer:side,grip:true});
 assert.equal(into.railGripBlockedTicks,1,
  "only outward contact demand should be blocked");
 const away=impactState(newPhysics,s,side,.2);
 away.lateral=side*(newPhysics.guardrailLateralLimit(s)-.2);
 p=newPhysics.positionAt(s,away.lateral);
 Object.assign(away,{worldX:p.x,worldZ:p.z,railContacting:true,lastRailSide:side,
  yawRate:0,heading:newPhysics.headingAt(s)-.2});
 const oldY=away.heading;
 newPhysics.stepFlight(away,dt,{steer:-side,grip:true});
 assert.equal(away.railGripBlockedTicks,0,
  "GRIP countersteer must NEVER be blocked");
 assert.ok(away.yawRate>0,"positive player GRIP must turn away from left wall");
 assert.ok(away.heading>oldY,"do not steal steering authority on contact");
});
test("ten real 120Hz race rail impacts with GRIP, including final 3rd lap, stay smooth",()=>{
 let corrections=0,gripBlocked=0;
 for(const scenario of audit.RAIL_SCENARIOS_0163){
  const r=audit.runRailContactScenario(scenario);
  assert.ok(r.railContactTicks>0,scenario.id+" did not reach physical rail");
  assert.equal(r.backwards,0,scenario.id+" rewound along the road");
  assert.equal(r.reverseProjectionTicks,0,scenario.id+" reversed projection");
  assert.equal(r.invalidGhostSamples,0,scenario.id+" ghost invalid");
  assert.ok(r.validGhostSamples>=10,scenario.id+" ghost sample loss");
  assert.ok(r.maxWorldStep<3,scenario.id+" world-space teleport");
  assert.ok(r.maxSingleStepYawDegrees<2.1,
   scenario.id+" jerked yaw by "+r.maxSingleStepYawDegrees+"°");
  assert.ok(r.maxInstantCorrectionDegrees<1.0,
   scenario.id+" hard wall cap reappeared");
  assert.ok(r.travelledMeters>20,scenario.id+" wall stalled");
  assert.ok(!r.failed,scenario.id+" physically failed");
  assert.ok(r.railImpactDebug.length>0,scenario.id+" missing useful telemetry");
  corrections+=r.railHeadingCorrections;
  gripBlocked+=r.blockedGripTicks;
 }
 assert.ok(corrections>0&&gripBlocked>0,
  "test must genuinely exercise grip and wall response");
});
test("no-GRIP collisions also avoid yaw snaps and reverse motion",()=>{
 const scenarios=audit.RAIL_SCENARIOS_0163.slice(0,8);
 for(const scenario of scenarios){
  const r=audit.runRailContactScenario({...scenario,controlGrip:false});
  assert.equal(r.invalidGhostSamples,0);
  assert.equal(r.backwards,0);
  assert.ok(r.maxSingleStepYawDegrees<2.1);
  assert.ok(r.maxWorldStep<3);
  assert.equal(r.blockedGripTicks,0);
 }
});
test("ordinary free-road GRIP steering and course geometry are byte-for-byte equivalent",()=>{
 const a=oldPhysics.newFlightState(),b=newPhysics.newFlightState();
 for(let i=0;i<110;i++){
  const steer=i<55?.26:-.16,grip=i>=20&&i<=68;
  oldPhysics.stepFlight(a,dt,{steer,grip});
  newPhysics.stepFlight(b,dt,{steer,grip});
  for(const key of ["worldX","worldZ","s","lateral","heading","yawRate",
   "currentSpeed","gripIntensity","railScrubIntensity"]){
   assert.ok(Math.abs(a[key]-b[key])<1e-10,
    "unintended free-flight change "+key+": "+a[key]+" vs "+b[key]);
  }
  assert.equal(a.railContacting,false);
  assert.equal(b.railContacting,false);
 }
 for(let s=0;s<3400;s+=25){
  const a=oldPhysics.positionAt(s),b=newPhysics.positionAt(s);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-10);
  assert.equal(oldPhysics.guardrailLateralLimit(s),
   newPhysics.guardrailLateralLimit(s));
 }
 assert.ok(Math.abs(cinematic.cameraBankAt(3180))<.13);
});
