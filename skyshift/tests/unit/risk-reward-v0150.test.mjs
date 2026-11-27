// SKYSHIFT 0.15.0 — authored, fair, mutually exclusive SAFE/RISK decisions.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {RISK_REWARD_0150,RHYTHM_GATES_0150,BOOST_CHOICES_0150,
 RACE_BOOST_CHOICES_0150,riskChoiceAt,riskCueAt}
 from "../../flight/boost/risk-reward-v0150.mjs";
import {BOOST_CONFIG,BOOST_PADS,boostPadAt,initBoostState,stepBoostState}
 from "../../flight/boost/boost-v0150.mjs";
import {GRIP_APEX,TRIAL,CIRCUIT,curvatureAt,gapAt,
 guardrailLateralLimit,newFlightState,positionAt,headingAt,surfaceHeightAt,
 stepFlight} from "../../tracks/trials/trial-v0150.mjs";
import {GLSL_BOOST_PADS,SURFACE_FRAGMENT_GLSL,patchPremiumShaders}
 from "../../rendering/legacy/premium-track-v0150.mjs";
import {TIME_TRIAL_0150} from "../../core/time-trial-v0150.mjs";
import {TIME_TRIAL_0130} from "../../core/time-trial-v0130.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("two deliberate right-edge choices have a generous safe alternative",()=>{
 assert.equal(RHYTHM_GATES_0150.length,2);
 assert.equal(BOOST_PADS.length,5);
 assert.equal(RACE_BOOST_CHOICES_0150.length,5*CIRCUIT.laps);
 assert.equal(BOOST_CONFIG.multiplier,1.4);
 assert.deepEqual(BOOST_PADS,BOOST_CHOICES_0150);
 for(const g of RHYTHM_GATES_0150){
  assert.ok(g.start>GRIP_APEX.funnelEnd+100,"never reward risky apex corner");
  assert.ok(g.approach<g.start-100,"anticipatory lane guidance");
  assert.ok(g.safeMin<=0&&g.safeMax>=0);
  assert.ok(g.riskMin>g.safeMax+1);
  for(const s of [g.start,g.start+9,g.end-1]){
   assert.equal(gapAt(s),null);
   assert.ok(Math.abs(curvatureAt(s))<1e-5,"gate must be on a REAL straight");
   assert.ok(g.riskMax<guardrailLateralLimit(s)-1,
    "risk still leaves >1m lateral steering margin inside physical rails");
  }
  assert.equal(riskChoiceAt(g.start+10,0).kind,"safe");
  assert.equal(riskChoiceAt(g.start+10,5.4).kind,"risk");
  assert.equal(riskChoiceAt(g.start+10,-5.4),null);
  const cue=riskCueAt(g.approach+1,0);
  assert.equal(cue.id,g.id);
  assert.ok(cue.remainingMeters>100);
  assert.match(cue.text,/RISK RIGHT \+40%/);
 }
 assert.equal(riskCueAt(900,0),null);
 assert.equal(RISK_REWARD_0150.roadGeometryUnchanged,true);
});
test("exactly ONE safe-or-risk reward per gate, per lap; no double dipping",()=>{
 const st=initBoostState({s:2210,lateral:0},44);
 const safe=stepBoostState(st,1/120,44,true);
 assert.equal(safe.kind,"safe");
 assert.equal(safe.multiplier,1.14);
 assert.equal(st.boostActivatedIds.length,1);
 assert.equal(st.safeBoosts,1);
 st.lateral=5.4;
 assert.equal(stepBoostState(st,1/120,44,true),null);
 assert.equal(st.boostActivatedIds.length,1);
 assert.equal(st.riskBoosts,0);
 assert.equal(st.boostTargetMultiplier,1.14);
 st.s=2210+CIRCUIT.lapLength;
 const risk=stepBoostState(st,1/120,44,true);
 assert.equal(risk.kind,"risk");
 assert.equal(st.riskBoosts,1);
 assert.equal(st.boostActivatedIds.length,2);
 assert.equal(st.boostActivatedGroups.length,2);
 assert.notEqual(st.boostActivatedGroups[0],st.boostActivatedGroups[1]);
 assert.equal(st.boostChoiceLog[0].kind,"safe");
 assert.equal(st.boostChoiceLog[1].kind,"risk");
});
test("risk is faster than safe but never rewrites yaw or steering",()=>{
 const slow=initBoostState({s:2210,lateral:0},44);
 const fast=initBoostState({s:2210,lateral:5.4},44);
 for(let i=0;i<72;i++){
  stepBoostState(slow,1/120,44,true);
  stepBoostState(fast,1/120,44,true);
 }
 assert.ok(fast.currentSpeed>slow.currentSpeed+7);
 assert.ok(slow.currentSpeed<44*1.15);
 assert.ok(fast.currentSpeed<=44*BOOST_CONFIG.multiplier+1e-8);
 assert.equal(fast.riskBoosts,1);
 assert.equal(slow.safeBoosts,1);
 const airborne=initBoostState({s:2210,lateral:5.4},44);
 assert.equal(stepBoostState(airborne,1/120,44,false),null);
 assert.equal(airborne.riskBoosts,0);
});
test("authentic shared 120Hz stepFlight generates exactly one physical choice",()=>{
 for(const side of [0,5.4]){
  const s=2210,p=positionAt(s,side);
  const f=newFlightState();
  Object.assign(f,{s,lateral:side,worldX:p.x,worldZ:p.z,
   heading:headingAt(s),y:surfaceHeightAt(s,side)+TRIAL.hoverHeight,
   grounded:true,vy:0});
  const r=stepFlight(f,1/120,{steer:0,grip:false});
  assert.equal(r.boostChoice?.kind,side?"risk":"safe");
  assert.equal(r.boostChoice?.multiplier,side?1.40:1.14);
  assert.equal(f.boostActivatedGroups.length,1);
  assert.ok(f.boostMultiplier>1);
 }
});
test("shader receives exact side-specific physical pad extents with zero decals",()=>{
 assert.equal(GLSL_BOOST_PADS.length,BOOST_PADS.length);
 for(const pad of BOOST_PADS){
  const render=GLSL_BOOST_PADS.find(x=>x.id===pad.id);
  assert.ok(render);
  assert.equal(render.min,pad.lateralMin);
  assert.equal(render.max,pad.lateralMax);
  assert.equal(render.kind,pad.kind);
 }
 assert.match(SURFACE_FRAGMENT_GLSL,/riskCoverage/);
 assert.match(SURFACE_FRAGMENT_GLSL,/riskLead/);
 assert.match(SURFACE_FRAGMENT_GLSL,/trackStripe\(trackL/);
 const patch=patchPremiumShaders(
  "#include <common>\n#include <begin_vertex>",
  "#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>");
 assert.match(patch.fragmentShader,/riskCoverage/);
 const fidelity=read("./core/visual-fidelity-v0150.mjs");
 assert.match(fidelity,/premium-track-v0150\.mjs/);
 assert.equal(RISK_REWARD_0150.additionalDrawCalls,0);
});
test("normal Time Trial PBs use a NEW fingerprint, older ghost remains in storage",()=>{
 assert.notEqual(TIME_TRIAL_0150.storageKey,TIME_TRIAL_0130.storageKey);
 assert.notEqual(TIME_TRIAL_0150.trackRevision,TIME_TRIAL_0130.trackRevision);
 assert.equal(TIME_TRIAL_0150.raceMeters,TIME_TRIAL_0130.raceMeters);
 assert.equal(TIME_TRIAL_0150.laps,TIME_TRIAL_0130.laps);
 assert.equal(RISK_REWARD_0150.physicsSteeringUnchanged,true);
});
test("active 0.15.0 retains Manta/Stingray steering, Challenge medals, and real player boost",()=>{
 const game=read("./legacy/game/game-v0150.mjs"),trial=read("./tracks/trials/trial-v0150.mjs");
 assert.match(game,/from "\.\/trial-v0150\.mjs"/);
 assert.match(game,/ship\.rotation\.z=naturalRoll;/);
 assert.match(game,/const result=stepFlight\(flight,dt,\{steer,grip:gripHeld\}\);/);
 assert.match(game,/skyline-challenges-v0140\.mjs/);
 assert.match(game,/riskCueAt\(flight\.s,flight\.lateral,flight\.lastBoostGroup\)/);
 assert.match(game,/kind:choice\?\.kind/);
 assert.match(trial,/boost-v0150\.mjs/);
 assert.doesNotMatch(trial,/stableStingrayVisualRoll/);
 assert.equal(RISK_REWARD_0150.additionalMeshes,0);
 const html=read("./index.html");
 assert.match(html,/boot-v0150\.js\?v=0\.15\.0/);
 assert.match(html,/id="risk-line-cue"/);
 assert.match(html,/id="challenges-btn"/);
 assert.match(read("./legacy/boot/boot-v0150.js"),/game-v0150\.mjs\?v=0\.15\.0/);
});
