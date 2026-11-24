// SKYSHIFT 0.6.0 — actual closed track and authenticated three-lap race.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 CIRCUIT,CIRCUIT_LENGTH,AUTHORED_SECTIONS,COURSE_SEGMENTS,
 lapPosition,sectionAt,circuitPlanSummary
} from "../../tracks/shared/circuit-layout-v060.mjs";
import {
 TRIAL,ARCHES,GUARDRAIL,MAX_BANK_RAD,GEOMETRY_BREAKS,
 CHECKPOINTS,LOOP_CLOSURE_ERROR_METERS,
 poseAt,headingAt,curvatureAt,bankAt,surfaceHeightAt,positionAt,
 projectWorldToTrack,checkpointFor,guardrailLateralLimit,
 onRoad,speedAt,setZoneSpeedStage,newFlightState,stepFlight,validateTrial
} from "../../trial-v060.mjs";
import {
 BOOST_PADS,RACE_BOOST_PADS,BOOST_CONFIG,boostPadAt
} from "../../flight/boost/boost-v060.mjs";
import {createSmoothDeckData,MESH_SPEC} from "../../smooth-track-v060.mjs";
import {createAeroBarrierData,AERO_BARRIER} from "../../tracks/barriers/aero-barrier-v060.mjs";
import {PREMIUM_TRACK,patchPremiumShaders} from "../../rendering/legacy/premium-track-v060.mjs";
import {
 ZONE_WAVE,ZONE_PALETTES,newZoneWaveState,updateZoneWave
} from "../../zone-wave-v060.mjs";
const src=name=>readFileSync(new URL("../../"+name,import.meta.url),"utf8");
const near=(actual,expected,tol=1e-5)=>assert.ok(Math.abs(actual-expected)<tol,
 String(actual)+" ≠ "+String(expected));
test("authored Skyline Circuit is one welded 3400m closed 3D loop, 3 laps",()=>{
 assert.equal(CIRCUIT.id,"skyline-circuit");
 assert.equal(CIRCUIT.lapLength,3400);
 assert.equal(CIRCUIT.laps,3);
 assert.equal(CIRCUIT.totalDistance,10200);
 assert.equal(TRIAL.length,3400);
 assert.equal(TRIAL.raceLength,10200);
 near(CIRCUIT_LENGTH,CIRCUIT.lapLength,1e-5);
 assert.equal(COURSE_SEGMENTS.length,15);
 assert.equal(AUTHORED_SECTIONS.length,15);
 assert.deepEqual(validateTrial(),[]);
 assert.ok(LOOP_CLOSURE_ERROR_METERS<.3);
 const first=poseAt(0),last=poseAt(TRIAL.length);
 near(first.x,last.x,1e-8);
 near(first.z,last.z,1e-8);
 near(last.heading-first.heading,Math.PI*2,1e-7);
 near(curvatureAt(0),curvatureAt(TRIAL.length),1e-9);
 for(const s of [0,.25,5,85,400,1090,1690,2510,3338]){
  const a=poseAt(s),b=poseAt(s+3400),c=poseAt(s+6800);
  near(a.x,b.x,1e-7);near(a.z,b.z,1e-7);
  near(a.x,c.x,1e-7);near(a.z,c.z,1e-7);
  near(b.heading-a.heading,Math.PI*2,1e-6);
 }
 assert.equal(ARCHES.length,1);
 assert.equal(ARCHES[0].label,"FINISH");
});
test("three deliberately distinct named sectors combine true straights, tight apex and S link",()=>{
 assert.deepEqual(CIRCUIT.sectors.map(s=>s.name),
 ["HIGH-SPEED FLOW","TECHNICAL RHYTHM","VELOCITY FINALE"]);
 assert.equal(COURSE_SEGMENTS.filter(s=>s.type==="turn").length,7);
 assert.equal(COURSE_SEGMENTS.filter(s=>s.type==="straight").length,8);
 assert.equal(sectionAt(240).id,"high-speed");
 assert.equal(sectionAt(1500).id,"technical");
 assert.equal(sectionAt(2600).id,"finale");
 assert.equal(sectionAt(3400+1500).id,"technical");
 const angles=COURSE_SEGMENTS.filter(s=>s.type==="turn")
  .map(s=>s.curvature);
 assert.ok(angles.some(s=>s<0),"counter-bends really exist");
 assert.ok(angles.some(s=>s>.009),"real technical apex exists");
 assert.ok(Math.max(...angles)<.010,"fast corners retain steering authority");
 const names=COURSE_SEGMENTS.map(s=>s.id);
 assert.deepEqual(names.slice(5,10),
 ["s-hook-in","s-link-a","s-hook-switch","s-link-b","s-hook-out"]);
 const report=circuitPlanSummary();
 assert.equal(report.straightCount,8);
 assert.equal(report.turnCount,7);
 assert.ok(new Set(report.uniqueTurnRadii).size>=4);
});
test("true straight sections and periodic C2 curvature have no sudden scribbles",()=>{
 for(const s of COURSE_SEGMENTS){
  if(s.type!=="straight")continue;
  const a=s.start+2,b=s.end-2;
  near(curvatureAt(a),0,1e-9);
  near(curvatureAt(b),0,1e-9);
  near(headingAt(a),headingAt(b),1e-6);
 }
 for(const s of COURSE_SEGMENTS){
  near(curvatureAt(s.start),0,1e-8);
  near(curvatureAt(s.end),0,1e-8);
  if(s.type==="turn"){
   const m=(s.start+s.end)/2;
   assert.ok(Math.abs(curvatureAt(m))>.005,s.id);
   assert.ok(s.entry>=20,s.id+" entrance must have easing");
  }
 }
 for(let p=0;p<CIRCUIT.lapLength;p+=.5){
  const a=poseAt(p),b=poseAt(p+.5);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.55,p+"m has a position discontinuity");
 }
});
test("nonadjacent route portions never intersect or crowd 23.2m road",()=>{
 const points=[];
 for(let s=0;s<3400;s+=8){
  const p=poseAt(s);points.push([s,p.x,p.z]);
 }
 let minimum=Infinity;
 for(let i=0;i<points.length;i++)
  for(let j=i+1;j<points.length;j++){
   const a=points[i],b=points[j];
   const arc=Math.abs(a[0]-b[0]);
   if(Math.min(arc,3400-arc)<100)continue;
   const d=Math.hypot(a[1]-b[1],a[2]-b[2]);
   minimum=Math.min(minimum,d);
  }
 assert.ok(minimum>32,"Unrelated road/rails nearly collide: "+minimum.toFixed(1)+"m");
});
test("continuous physical projection is unwrapped over every start/finish line",()=>{
 for(let lap=1;lap<3;lap++){
  const s=lap*CIRCUIT.lapLength;
  for(const offset of [-5,-.3,.3,5]){
   const p=positionAt(s+offset,2.3,0);
   const q=projectWorldToTrack(p.x,p.z,s+offset);
   near(q.s,s+offset,.6);
   near(q.lateral,2.3,.03);
  }
 }
 assert.equal(MAX_BANK_RAD,0);
 assert.equal(GUARDRAIL.height,.78);
 for(let s=0;s<10200;s+=80){
  assert.equal(bankAt(s),0);
  near(surfaceHeightAt(s,5),0);
  assert.ok(onRoad(s,0));
 }
});
test("ordered checkpoint passes and completed laps are not double-counted",()=>{
 assert.equal(CHECKPOINTS.length,31);
 assert.equal(CHECKPOINTS[0],0);
 near(CHECKPOINTS.at(-1),10200);
 for(let lap=1;lap<=3;lap++){
  const state=newFlightState(),gate=lap*3400;
  state.s=gate-2.0;
  const p=positionAt(state.s,0,0);
  state.worldX=p.x;state.worldZ=p.z;state.heading=headingAt(state.s);
  state.lapsCompleted=lap-1;
  state.lap=lap;
  state.elapsed=(lap-1)*58;
  state.lastLapAt=(lap-1)*58;
  state.checkpoint=gate-340;
  state.checkpointsPassed=lap*10-1;
  let completed=0,events=0;
  for(let i=0;i<18;i++){
   const result=stepFlight(state,1/120,{steer:0});
   if(result.lapCompleted){completed=result.lapCompleted;events++;}
  }
  assert.equal(completed,lap,"actual crossing records lap "+lap);
  assert.equal(events,1,"no duplicate lap completion");
  assert.equal(state.lapsCompleted,lap);
  assert.equal(state.lap,Math.min(lap+1,3));
  assert.ok(state.lapTimes[0]>0);
  assert.equal(state.finished,lap===3);
 }
});
test("crossing finish backwards or bypassing checkpoints cannot complete laps",()=>{
 const state=newFlightState();
 state.s=3398;
 const p=positionAt(state.s,0,0);
 state.worldX=p.x;state.worldZ=p.z;state.heading=headingAt(state.s);
 state.checkpointsPassed=0;state.checkpoint=0;
 for(let i=0;i<16;i++)stepFlight(state,1/120,{steer:0});
 assert.equal(state.lapsCompleted,0,"cannot lap without ten ordered checkpoints");
 assert.equal(state.finished,false);
});
test("all three physical boost inlays react independently on each lap",()=>{
 assert.equal(BOOST_CONFIG.multiplier,1.40);
 assert.equal(BOOST_PADS.length,3);
 assert.equal(RACE_BOOST_PADS.length,9);
 assert.equal(new Set(RACE_BOOST_PADS.map(x=>x.id)).size,9);
 for(let lap=0;lap<3;lap++)
  for(const pad of BOOST_PADS){
   const hit=boostPadAt(lap*3400+(pad.start+pad.end)/2,0);
   assert.ok(hit);
   assert.equal(hit.id,pad.id+"-lap"+(lap+1));
  }
 assert.equal(PREMIUM_TRACK.boostPads,3,
  "GPU only draws 3 inlays, not 3 copies of the circuit");
});
test("original nine 11% physical speed zones still progress during 3-lap race",()=>{
 assert.equal(ZONE_PALETTES.length,9);
 assert.deepEqual(ZONE_WAVE.triggers,[18,36,54,72,90,108,126,144]);
 near(TRIAL.zoneSpeedStep,1.11);
 const state=newFlightState();
 for(let i=1;i<=8;i++){
  near(speedAt(i*3400,i)/speedAt(0,i-1),1.11);
  assert.equal(setZoneSpeedStage(state,i),true);
 }
 assert.ok(speedAt(0,8)>100);
 const wave=newZoneWaveState();
 for(const time of [0,18.8,36.8,54.8,72.8,90.8,108.8,126.8,144.8])
  updateZoneWave(wave,time,time*60);
 assert.equal(wave.waves.length,8);
 assert.equal(wave.activeCount,1);
});
test("long GPU geometry is rendered ONCE; HDR shader front repeats without a seam",()=>{
 const deck=createSmoothDeckData();
 const rail=createAeroBarrierData();
 assert.ok(deck.rows>4000&&deck.rows<5000);
 assert.ok(rail.rows>3500&&rail.rows<4200);
 assert.equal(rail.columns,8);
 assert.ok(MESH_SPEC.sampleStep>=.8);
 assert.equal(AERO_BARRIER.height,.99);
 assert.equal(AERO_BARRIER.bendHeightMeters,1.11);
 const ps=patchPremiumShaders(
  "#include <common>\n#include <begin_vertex>",
  "#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>");
 assert.match(ps.fragmentShader,/uniform float uCircuitLength/);
 assert.match(ps.fragmentShader,/mod\(waveTrack-uZoneFront/);
 const source=src("./aero-barrier-v060.mjs");
 assert.match(source,/mod\(waveTrack-uRailFront/);
 assert.match(source,/state\.playerStage/);
});
test("production route preserves original HUD, SMAA and three-lap telemetry",()=>{
 const html=src("./index.html"),game=src("./game-v0103.mjs"),
  boot=src("./boot-v0103.js"),smoke=src("./tests/browser/legacy/browser-smoke-v081.mjs");
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(html,/style-v061\.css\?v=0\.6\.1/);
 assert.match(html,/id="lap-info"/);
 assert.match(html,/id="lap-number"/);
 assert.match(html,/id="final-laps"/);
 assert.match(boot,/import\("\.\/game-v0103\.mjs\?v=0\.10\.3"\)/);
 for(const dep of ["trial-v0901","circuit-layout-v082","boost-v082",
  "zone-wave-v060","smooth-track-v0901","premium-track-v0901",
  "aero-barrier-v0901"]){
  if(dep==="circuit-layout-v082"){
    assert.ok(src("./trial-v0901.mjs").includes('from "./tracks/shared/circuit-layout-v082.mjs"'));
    continue;
   }
  assert.ok(game.includes('from "./'+dep+'.mjs"'),dep);
 }
 assert.match(game,/TRIAL\.raceLength/);
 assert.match(game,/lap_completed/);
 assert.match(game,/lapTimesSeconds/);
 assert.match(game,/raceDistanceMeters/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 assert.match(smoke,/CIRCUIT\.laps/);
 assert.match(game,/from "\.\/neon-v083\.mjs"/);
 assert.match(game,/from "\.\/reactive-hud-v04991\.mjs"/);
 assert.doesNotMatch(game,/from "\.\/trial-v051\.mjs"/);
});
