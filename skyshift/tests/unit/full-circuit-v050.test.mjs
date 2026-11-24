// SKYSHIFT 0.5.0 — complete ~3-minute unbanked racing circuit.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 TRIAL,SHOWCASE_PLAN,COURSE_SEGMENTS,GEOMETRY_BREAKS,ARCHES,
 GUARDRAIL,GAPS,bankAt,bankDegreesAt,surfaceHeightAt,
 widthAt,headingAt,curvatureAt,positionAt,speedAt,validateTrial,
 newFlightState,stepFlight,setZoneSpeedStage
} from "../../trial-v050.mjs";
import {BOOST_CONFIG,BOOST_PADS} from "../../flight/boost/boost-v050.mjs";
import {
 ZONE_WAVE,ZONE_PALETTES,newZoneWaveState,updateZoneWave,
 frontPaletteBlend,spectralChargeStrength
} from "../../zone-wave-v050.mjs";
import {createSmoothDeckData,MESH_SPEC} from "../../smooth-track-v050.mjs";
import {PREMIUM_TRACK,GLSL_BOOST_PADS,patchPremiumShaders}
 from "../../rendering/legacy/premium-track-v050.mjs";
import {AERO_BARRIER,createAeroBarrierData,createAeroDetailData,patchRailShaders}
 from "../../tracks/barriers/aero-barrier-v050.mjs";
const source=name=>readFileSync(new URL("../../"+name,import.meta.url),"utf8");
const close=(actual,expected,delta=.0001)=>
 assert.ok(Math.abs(actual-expected)<delta,actual+" != "+expected);
test("a 10.4km authored route has real straights, C2 turns and a clean finish",()=>{
 assert.equal(TRIAL.length,10400);
 assert.equal(TRIAL.targetDurationSeconds,180);
 assert.equal(COURSE_SEGMENTS.length,SHOWCASE_PLAN.length);
 assert.equal(COURSE_SEGMENTS.length,25);
 assert.deepEqual(validateTrial(),[]);
 assert.equal(COURSE_SEGMENTS[0].start,0);
 assert.equal(COURSE_SEGMENTS.at(-1).end,TRIAL.length);
 assert.equal(ARCHES.at(-1).s,10392);
 let straights=0,bends=0,span=0;
 for(const segment of COURSE_SEGMENTS){
  span+=segment.end-segment.start;
  if(segment.type==="straight"){
   straights++;
   close(curvatureAt((segment.start+segment.end)/2),0);
   close(headingAt(segment.start+20),headingAt(segment.end-20));
  }else{
   bends++;
   assert.ok(segment.end-segment.start>=300);
   assert.ok(Math.abs(segment.curvature)<=.0055);
   assert.equal(segment.entry+segment.hold+segment.exit,segment.end-segment.start);
   close(curvatureAt(segment.start),0);
   close(curvatureAt(segment.end),0);
  }
 }
 assert.equal(span,TRIAL.length);
 assert.ok(straights>=12&&bends>=11);
 assert.equal(GEOMETRY_BREAKS.at(-1),TRIAL.length);
 for(const s of [0,200,3000,5650,8690,10398]){
  const p=positionAt(s,0,0);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));
 }
});
test("every part of the showcase has zero banking, zero gaps and manual steering",()=>{
 assert.equal(GAPS.length,0);
 assert.equal(TRIAL.sideSpeed,0);
 assert.equal(GUARDRAIL.height,.78);
 assert.ok(TRIAL.maxYawRate>0);
 for(let s=0;s<=TRIAL.length;s+=13){
  close(bankAt(s),0);
  close(bankDegreesAt(s),0);
  close(surfaceHeightAt(s,4),0);
  close(widthAt(s),23.2);
 }
 const state=newFlightState();
 assert.equal(state.heading,headingAt(5));
 assert.equal(state.zoneSpeedStage,0);
 const before=state.heading;
 stepFlight(state,1/120,{steer:1});
 assert.notEqual(state.heading,before,"manual steering remains functional");
});
test("nine deliberate palette zones use exactly eight 20-second world-space waves",()=>{
 assert.deepEqual(ZONE_WAVE.triggers,[20,40,60,80,100,120,140,160]);
 assert.equal(ZONE_WAVE.stages,9);
 assert.equal(ZONE_PALETTES.length,9);
 assert.equal(new Set(ZONE_PALETTES.map(x=>x.name)).size,9);
 const state=newZoneWaveState();
 assert.equal(updateZoneWave(state,19.9,800).started.length,0);
 for(let i=1;i<=8;i++){
  const t=i*20,s=i*1000;
  const begun=updateZoneWave(state,t,s);
  assert.deepEqual(begun.started,[i]);
  assert.equal(state.shaderBaseStage,i-1);
  assert.equal(begun.activeCount,1);
  assert.equal(begun.stage,i-1);
  const crossed=updateZoneWave(state,t+2,s+65);
  assert.equal(crossed.changed,true);
  assert.equal(crossed.stage,i);
  assert.equal(state.playerStage,i);
  assert.equal(state.fronts.length,3,"GPU keeps one existing 3-front uniform set");
  const blend=frontPaletteBlend(state,s+65);
  assert.equal(blend.from,i-1);
  assert.equal(blend.to,i);
 }
 assert.deepEqual(state.passedStages,[1,2,3,4,5,6,7,8]);
 assert.equal(state.waves.length,8);
 assert.equal(state.activeCount,1,"no 8-front shader blowup");
 assert.ok(spectralChargeStrength(159.92)>0);
});
test("color crossing increases real physics speed by 6.5%, smoothing each acceleration",()=>{
 close(TRIAL.zoneSpeedStep,1.065);
 close(speedAt(0,0),44);
 const stages=Array.from({length:9},(_,i)=>speedAt(5000,i));
 for(let i=1;i<stages.length;i++)
  close(stages[i]/stages[i-1],TRIAL.zoneSpeedStep,1e-12);
 assert.ok(stages.at(-1)>72&&stages.at(-1)<74);
 const pilot=newFlightState();
 assert.equal(pilot.currentSpeed,44);
 assert.equal(setZoneSpeedStage(pilot,1),true);
 assert.equal(setZoneSpeedStage(pilot,1),false);
 stepFlight(pilot,1/120,{steer:0});
 assert.ok(pilot.currentSpeed>44&&pilot.currentSpeed<stages[1],
  "physical acceleration starts on the next authoritative tick");
 for(let i=0;i<80;i++)stepFlight(pilot,1/120,{steer:0});
 assert.ok(pilot.currentSpeed>45.2&&pilot.currentSpeed<46.64);
 assert.equal(pilot.zoneSpeedStage,1);
 assert.equal(pilot.zoneSpeedEvents.length,1);
 assert.equal(setZoneSpeedStage(pilot,2),true);
 assert.ok(pilot.zoneCruiseSpeed<speedAt(pilot.s,2));
 assert.equal(BOOST_CONFIG.multiplier,1.4);
 assert.equal(BOOST_PADS.length,5);
 assert.ok(BOOST_PADS.at(-1).start>9000);
});
test("distance divided by staged physical speed is ~3min even without boost pads",()=>{
 const dt=1/120;
 let s=5,speed=44,stage=0,elapsed=0;
 for(let i=0;i<240*120&&s<TRIAL.length;i++){
  elapsed=i*dt;
  const nextStage=Math.min(8,Math.max(0,Math.floor((elapsed-.9)/20)));
  // Zone passes ~1-2 seconds after the 20-second wave launch.
  if(nextStage>stage)stage=nextStage;
  const goal=speedAt(s,stage);
  speed+=(goal-speed)*(1-Math.exp(-dt/TRIAL.zoneAccelerationSeconds));
  s+=speed*dt;
 }
 assert.ok(s>=10400);
 assert.ok(elapsed>167&&elapsed<195,
  "expected approximately 3 min; got "+elapsed);
});
test("long deck/raised guardrails share the same authority and bounded mesh density",()=>{
 assert.ok(MESH_SPEC.sampleStep>=.75);
 const deck=createSmoothDeckData();
 const rails=createAeroBarrierData();
 const detail=createAeroDetailData();
 assert.ok(deck.rows>10000&&deck.rows<16000);
 assert.ok(rails.rows>10000&&rails.rows<13000);
 assert.equal(rails.columns,8);
 assert.ok(detail.curveChevrons>250);
 assert.equal(AERO_BARRIER.height,.99);
 assert.equal(AERO_BARRIER.bendHeightMeters,1.11);
 assert.equal(AERO_BARRIER.physicalColliderHeightMeters,GUARDRAIL.height);
 assert.equal(PREMIUM_TRACK.boostPads,BOOST_PADS.length);
 assert.equal(GLSL_BOOST_PADS.length,BOOST_PADS.length);
 const shader=patchPremiumShaders(
  "#include <common>\n#include <begin_vertex>",
  "#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>");
 assert.match(shader.fragmentShader,/spectralWhiteCore/);
 assert.match(shader.fragmentShader,/uZoneActiveCount/);
 const railShader=patchRailShaders(
  "#include <common>\n#include <begin_vertex>",
  "#include <common>\n#include <color_fragment>");
 assert.match(railShader.fragmentShader,/spectralWhiteCore/);
 assert.match(railShader.fragmentShader,/uRailNext1/);
 assert.equal(AERO_BARRIER.drawBatches,3);
 assert.match(source("./rendering/legacy/premium-track-v050.mjs"),/state\.shaderBaseStage/);
 assert.match(source("./aero-barrier-v050.mjs"),/state\.shaderBaseStage/);
});
test("production version routes to the real 10.4km race; archived 1530m lab preserved",()=>{
 const html=source("./index.html");
 const boot=source("./boot-v0103.js");
 const game=source("./game-v0103.mjs");
 const browser=source("./tests/browser/legacy/browser-smoke-v081.mjs");
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(boot,/import\("\.\/game-v0103\.mjs\?v=0\.10\.3"\)/);
 for(const dep of ["trial-v0901","zone-wave-v060","boost-v082",
  "smooth-track-v0901","premium-track-v0901","aero-barrier-v0901"])
  assert.ok(game.includes('from "./'+dep+'.mjs"'),dep);
 assert.match(game,/setZoneSpeedStage\(flight,wave\.stage\)/);
 assert.match(game,/zone_speed_increase/);
 assert.match(game,/zoneSpeedEvents:\[\.\.\.flight\.zoneSpeedEvents\]/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 assert.match(browser,/circuit\.lapLength!==3400/);
 assert.match(html,/10200 M/);
 assert.match(html,/THREE FASTER LAPS/);
 assert.match(html,/style-v061\.css/);
 assert.doesNotMatch(game,/from "\.\/trial-v0494\.mjs"/);
 assert.equal(source("./trial-v0494.mjs").includes("length:1530"),true);
});
