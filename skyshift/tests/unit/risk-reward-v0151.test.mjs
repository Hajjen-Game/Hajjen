// SKYSHIFT 0.15.1 — five varied, grounded risk choices, unchanged pilot physics.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {RISK_REWARD_0151,RHYTHM_GATES_0151,BOOST_CHOICES_0151,
 RACE_BOOST_CHOICES_0151,RHYTHM_FLOW_0151,riskChoiceAt,riskCueAt,
 approachingRiskGate,trackFlowAt} from "../../flight/boost/risk-reward-v0151.mjs";
import {BOOST_CONFIG,BOOST_PADS,initBoostState,stepBoostState}
 from "../../flight/boost/boost-v0151.mjs";
import {TRIAL,CIRCUIT,GRIP_APEX,SKYLINE_LEAP,MAGNETIC_WALL,CORKSCREW,
 curvatureAt,guardrailLateralLimit,gapAt,newFlightState,positionAt,
 headingAt,surfaceHeightAt,stepFlight,speedAt} from "../../trial-v0151.mjs";
import {PREMIUM_TRACK,GLSL_BOOST_PADS,SURFACE_FRAGMENT_GLSL,
 patchPremiumShaders} from "../../rendering/legacy/premium-track-v0151.mjs";
import {TIME_TRIAL_0151} from "../../core/time-trial-v0151.mjs";
import {TIME_TRIAL_0150} from "../../core/time-trial-v0150.mjs";
import {CHALLENGES_0140} from "../../tracks/skyline/skyline-challenges-v0140.mjs";
const source=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const center=(a,b)=>(a+b)/2;
const near=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<=eps,
 "expected "+a+" ~= "+b+" diff "+Math.abs(a-b));
test("five real choices per lap; left/right and four distinct skill rewards",()=>{
 assert.equal(RHYTHM_GATES_0151.length,5);
 assert.equal(RISK_REWARD_0151.totalGatesPerLap,5);
 assert.equal(BOOST_PADS.length,11);
 assert.deepEqual(BOOST_PADS,BOOST_CHOICES_0151);
 assert.equal(RACE_BOOST_CHOICES_0151.length,11*CIRCUIT.laps);
 assert.equal(RHYTHM_GATES_0151.filter(g=>g.direction==="LEFT").length,3);
 assert.equal(RHYTHM_GATES_0151.filter(g=>g.direction==="RIGHT").length,2);
 assert.equal(new Set(RHYTHM_GATES_0151.map(g=>g.difficulty)).size,5);
 assert.equal(new Set(RHYTHM_GATES_0151.map(g=>g.riskMultiplier)).size,4);
 const first=RHYTHM_GATES_0151[0];
 assert.equal(first.id,"horizon-recovery");
 assert.ok(first.start>SKYLINE_LEAP.end+60);
 assert.ok(first.approach>SKYLINE_LEAP.end);
 assert.ok(first.end<GRIP_APEX.funnelStart-40);
 const worst= speedAt(first.start,8)*first.riskMultiplier*
  first.riskDurationSeconds;
 assert.ok(first.end+worst<GRIP_APEX.throatStart-15,
  "low-intensity post-leap reward must expire before 14m throat");
 const wall=RHYTHM_GATES_0151.filter(g=>g.start>=MAGNETIC_WALL.start&&
  g.start<MAGNETIC_WALL.end);
 assert.equal(wall.length,0,"never place an edge pad on the wall");
 assert.equal(RHYTHM_GATES_0151.at(-1).start,3150);
 assert.ok(RHYTHM_GATES_0151.at(-1).start>CORKSCREW.start,
  "the original optional banked finale remains as a distinct special section");
});
test("every gate has a reachable SAFE center and a physical RISK shoulder",()=>{
 const groups=new Set();
 for(const g of RHYTHM_GATES_0151){
  assert.ok(!groups.has(g.id));groups.add(g.id);
  assert.ok(g.end-g.start>=30&&g.end-g.start<=45);
  assert.ok(g.approach<g.start-65);
  assert.ok(g.safeMin<0&&g.safeMax>0&&g.riskMin<g.riskMax);
  if(g.direction==="LEFT"){
   assert.ok(g.riskMax<g.safeMin-0.6);
  }else{
   assert.ok(g.riskMin>g.safeMax+0.6);
  }
  for(let s=g.start;s<g.end;s+=2){
   assert.equal(gapAt(s),null,"no pad may span the real jump gap");
   assert.ok(Math.abs(curvatureAt(s))<.000001,
    "all decisions are on mathematically straight course sections");
   const outer=Math.max(Math.abs(g.riskMin),Math.abs(g.riskMax));
   assert.ok(outer<=guardrailLateralLimit(s)-1,
    "risk pad must leave >=1m steering/rail clearance");
  }
  const at=(g.start+g.end)/2;
  const safe=riskChoiceAt(at,0);
  const risk=riskChoiceAt(at,center(g.riskMin,g.riskMax));
  assert.equal(safe.kind,"safe");assert.equal(risk.kind,"risk");
  assert.equal(safe.group,g.id+"-lap1");assert.equal(risk.group,g.id+"-lap1");
  near(safe.multiplier,g.safeMultiplier);
  near(risk.multiplier,g.riskMultiplier);
  assert.ok(g.riskMultiplier>g.safeMultiplier+.08);
  assert.equal(riskChoiceAt(at,-center(g.riskMin,g.riskMax))?.kind??null,null,
   "mirrored wrong-side risk lane is not a free boost");
 }
});
test("old right-hand locations remain unchanged; other three are genuinely new",()=>{
 const old=RHYTHM_GATES_0151.find(g=>g.id==="back-sweeper-exit");
 const finale=RHYTHM_GATES_0151.find(g=>g.id==="final-drive");
 assert.deepEqual([old.start,old.end,old.riskMin,old.riskMax],
  [2200,2240,4.45,6.45]);
 assert.deepEqual([finale.start,finale.end,finale.riskMin,finale.riskMax],
  [3150,3190,4.45,6.45]);
 assert.ok(RHYTHM_GATES_0151[2].start>old.end+130);
 assert.ok(RHYTHM_GATES_0151[2].end<2514-90,
  "expert boost must clear before the next hard right-angle turn");
});
test("HUD warnings use authored LEFT/RIGHT and correct tier, never fixed +40%",()=>{
 const safeList=[];
 for(const g of RHYTHM_GATES_0151){
  const c=riskCueAt(g.approach+.1,0,safeList);
  assert.equal(c?.id,g.id);
  assert.equal(c.side,g.direction);
  assert.equal(c.difficulty,g.difficulty);
  assert.equal(c.selectedLane,"safe");
  assert.equal(c.riskPercent,Math.round((g.riskMultiplier-1)*100));
  assert.equal(c.safePercent,Math.round((g.safeMultiplier-1)*100));
  assert.match(c.text,new RegExp(g.direction+" RISK \\+"+c.riskPercent+"%"));
  assert.ok(c.remainingMeters>65);
  assert.equal(riskCueAt(g.start+3,center(g.riskMin,g.riskMax))?.selectedLane,"risk");
  assert.equal(riskCueAt(g.start+3,0,[g.id+"-lap1"]),null);
  assert.equal(approachingRiskGate(g.start+1)?.id,g.id);
 }
 assert.equal(riskCueAt(900,0),null);
 assert.equal(riskCueAt(CIRCUIT.totalDistance+1,0),null);
 const lap2=riskCueAt(RHYTHM_GATES_0151[0].start+CIRCUIT.lapLength-2,0);
 assert.equal(lap2.group,"horizon-recovery-lap2");
});
test("all three laps: one choice per gate, never both; each gate independent",()=>{
 const state=initBoostState({s:0,lateral:0},44);
 for(let lap=0;lap<CIRCUIT.laps;lap++)
  for(const gate of RHYTHM_GATES_0151){
   state.s=gate.start+lap*CIRCUIT.lapLength+2;
   const risk=lap%2===0;
   state.lateral=risk?center(gate.riskMin,gate.riskMax):0;
   const first=stepBoostState(state,1/120,44,true);
   assert.equal(first.kind,risk?"risk":"safe");
   assert.equal(first.group,gate.id+"-lap"+(lap+1));
   assert.equal(state.lastBoostGroup,first.group);
   state.lateral=risk?0:center(gate.riskMin,gate.riskMax);
   const second=stepBoostState(state,1/120,44,true);
   assert.equal(second,null);
  }
 assert.equal(state.boostActivations,5*3);
 assert.equal(state.boostActivatedGroups.length,5*3);
 assert.equal(new Set(state.boostActivatedGroups).size,5*3);
 assert.equal(state.safeBoosts,5);
 assert.equal(state.riskBoosts,10);
 assert.equal(state.boostChoiceLog.length,15);
});
test("real 120Hz stepFlight awards left and right choices without steering assistance",()=>{
 for(const g of RHYTHM_GATES_0151)
  for(const mode of ["safe","risk"]){
   const s=g.start+4,lat=mode==="safe"?0:center(g.riskMin,g.riskMax);
   const p=positionAt(s,lat),f=newFlightState();
   Object.assign(f,{s,lateral:lat,worldX:p.x,worldZ:p.z,
    heading:headingAt(s),y:surfaceHeightAt(s,lat)+TRIAL.hoverHeight,
    grounded:true,vy:0});
   const r=stepFlight(f,1/120,{steer:0,grip:false});
   assert.equal(r.boostChoice?.kind,mode);
   near(r.boostChoice.multiplier,mode==="risk"?g.riskMultiplier:g.safeMultiplier);
   assert.equal(f.boostActivatedGroups.length,1);
   assert.ok(f.currentSpeed>=TRIAL.startSpeed);
  }
});
test("same PBR road paints all source-defined pads and shows only post-jump preview",()=>{
 assert.equal(GLSL_BOOST_PADS.length,BOOST_PADS.length);
 assert.equal(PREMIUM_TRACK.drawBatches,1);
 assert.equal(PREMIUM_TRACK.boostPads,11);
 for(const pad of BOOST_PADS){
  const render=GLSL_BOOST_PADS.find(x=>x.id===pad.id);
  assert.ok(render);
  assert.equal(render.min,pad.lateralMin);
  assert.equal(render.max,pad.lateralMax);
  assert.equal(render.start,pad.start);
  assert.equal(render.end,pad.end);
 }
 assert.match(SURFACE_FRAGMENT_GLSL,/riskLead/);
 // LEFT lane centre is a negative number. Do not emit invalid GLSL
 // like "trackL--4.625" when translating the physical coordinate.
 assert.doesNotMatch(SURFACE_FRAGMENT_GLSL,/trackL--[0-9]/);
 assert.ok(SURFACE_FRAGMENT_GLSL.includes("trackL-(-4.625)"));
 const shader=patchPremiumShaders("#include <common>\n#include <begin_vertex>",
   "#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>");
 assert.match(shader.fragmentShader,/riskCoverage/);
 const premium=source("./rendering/legacy/premium-track-v0151.mjs");
 assert.match(premium,/const approach=gate\?\.approach\?\?p\.start-125/);
 assert.match(premium,/RHYTHM_GATES_0151/);
 assert.equal(RISK_REWARD_0151.additionalMeshes,0);
 assert.equal(RISK_REWARD_0151.additionalDrawCalls,0);
});
test("rhythm chapters cover the full lap and include technical breathing space",()=>{
 assert.equal(RHYTHM_FLOW_0151.length,9);
 for(let s=0;s<CIRCUIT.lapLength;s++)
  assert.ok(trackFlowAt(s),"missing flow phase at metre "+s);
 const types=new Set(RHYTHM_FLOW_0151.map(x=>x.kind));
 for(const required of ["accelerate","technical","spectacle","recover","reset","risk-reposition"])
  assert.ok(types.has(required));
 assert.equal(trackFlowAt(1500).kind,"technical");
 assert.equal(trackFlowAt(3100).kind,"spectacle");
});
test("records versioned for 0.15.1 but eight Challenge progress remains intact",()=>{
 assert.notEqual(TIME_TRIAL_0151.storageKey,TIME_TRIAL_0150.storageKey);
 assert.notEqual(TIME_TRIAL_0151.trackRevision,TIME_TRIAL_0150.trackRevision);
 assert.equal(TIME_TRIAL_0151.raceMeters,TIME_TRIAL_0150.raceMeters);
 assert.equal(CHALLENGES_0140.length,8);
 const game=source("./legacy/game/game-v0151.mjs");
 assert.match(game,/trial-v0151\.mjs/);
 assert.match(game,/risk-reward-v0151\.mjs/);
 assert.match(game,/time-trial-v0151\.mjs/);
 assert.match(game,/skyline-challenges-v0140\.mjs/);
 assert.match(game,/ship\.rotation\.z=naturalRoll;/);
 assert.match(game,/const result=stepFlight\(flight,dt,\{steer,grip:gripHeld\}\)/);
 assert.match(game,/riskCueAt\(flight\.s,flight\.lateral,flight\.boostActivatedGroups\)/);
 assert.match(source("./index.html"),/boot-v0151\.js\?v=0\.15\.1/);
 assert.match(source("./legacy/boot/boot-v0151.js"),/game-v0151\.mjs\?v=0\.15\.1/);
});
