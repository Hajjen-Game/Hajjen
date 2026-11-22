// SKYSHIFT 0.5.1 – Speed Escalation & Track Character.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 TRIAL,SHOWCASE_PLAN,COURSE_SEGMENTS,GEOMETRY_BREAKS,
 GAPS,bankAt,speedAt,headingAt,poseAt,curvatureAt,positionAt,
 newFlightState,stepFlight,setZoneSpeedStage,validateTrial
} from "../../trial-v051.mjs";
import {
 ZONE_WAVE,ZONE_PALETTES,newZoneWaveState,updateZoneWave
} from "../../zone-wave-v051.mjs";
import {BOOST_PADS,BOOST_CONFIG} from "../../boost-v050.mjs";
import {createSmoothDeckData,MESH_SPEC} from "../../smooth-track-v051.mjs";
import {createAeroBarrierData,AERO_BARRIER} from "../../aero-barrier-v051.mjs";
const source=n=>readFileSync(new URL("../../"+n,import.meta.url),"utf8");
const near=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps,
 "Expected "+a+" ≈ "+b);
test("same 10400m route and no jumps, banked road or auto steer",()=>{
 assert.equal(TRIAL.length,10400);
 assert.equal(GAPS.length,0);
 assert.equal(TRIAL.sideSpeed,0);
 assert.equal(TRIAL.hoverHeight,1.05);
 assert.ok(TRIAL.maxYawRate>=1.2);
 assert.deepEqual(validateTrial(),[]);
 for(let s=0;s<=10400;s+=13)near(bankAt(s),0);
 const flight=newFlightState(),originalHeading=flight.heading;
 stepFlight(flight,1/120,{steer:1});
 assert.notEqual(flight.heading,originalHeading);
});
test("27 purposeful pieces have C2 joined curves, true straights and distinct radii",()=>{
 assert.equal(SHOWCASE_PLAN.length,27);
 assert.equal(COURSE_SEGMENTS.length,27);
 let cursor=0,turns=0,straights=0;
 const distinctCurvatures=new Set();
 for(const p of COURSE_SEGMENTS){
  assert.equal(p.start,cursor,p.id+" joins previous");
  assert.ok(p.end>p.start);cursor=p.end;
  if(p.type==="turn"){
   turns++;distinctCurvatures.add(Math.abs(p.curvature));
   const m=(p.start+p.end)/2;
   assert.ok(Math.abs(curvatureAt(m))>.004,p.id+" has a real arc");
   near(curvatureAt(p.start),0);
   near(curvatureAt(p.end),0);
   assert.ok(p.entry>=25&&p.exit>=25,
    p.id+" smooth transition distance");
  }else{
   straights++;
   near(headingAt(p.start+2),headingAt(p.end-2));
   near(curvatureAt((p.start+p.end)/2),0);
  }
 }
 assert.equal(cursor,10400);
 assert.equal(turns,13);
 assert.equal(straights,14);
 assert.ok(distinctCurvatures.size>=11);
 assert.ok(Math.max(...COURSE_SEGMENTS.map(p=>Math.abs(p.curvature||0)))>=.008);
 assert.ok(Math.min(...COURSE_SEGMENTS.map(p=>p.type==="straight"?p.end-p.start:Infinity))>=140);
 assert.ok(Math.max(...COURSE_SEGMENTS.map(p=>p.type==="straight"?p.end-p.start:0))>=600);
 assert.equal(GEOMETRY_BREAKS.at(-1),10400);
});
test("tight S-combo includes actual short straight, not drawing-table squiggles",()=>{
 const i=COURSE_SEGMENTS.findIndex(x=>x.id==="s-link-right");
 assert.ok(i>=0);
 assert.equal(COURSE_SEGMENTS[i].type,"turn");
 assert.equal(COURSE_SEGMENTS[i+1].type,"straight");
 assert.equal(COURSE_SEGMENTS[i+1].id,"link");
 assert.equal(COURSE_SEGMENTS[i+2].type,"turn");
 assert.equal(COURSE_SEGMENTS[i+2].id,"s-link-left");
 assert.ok(COURSE_SEGMENTS[i].curvature>0);
 assert.ok(COURSE_SEGMENTS[i+2].curvature<0);
 assert.ok(COURSE_SEGMENTS[i+1].end-COURSE_SEGMENTS[i+1].start>=150);
});
test("course does not fold on itself or bring separated road sections together",()=>{
 const samples=[];
 for(let s=0;s<=10400;s+=20){
  const p=poseAt(s);samples.push([s,p.x,p.z]);
 }
 let minDist=Infinity;
 for(let i=0;i<samples.length;i++){
  for(let j=i+10;j<samples.length;j++){
   const [s,x,z]=samples[i],[_s,xx,zz]=samples[j];
   const dist=Math.hypot(xx-x,zz-z);
   minDist=Math.min(minDist,dist);
  }
 }
 assert.ok(minDist>28,"Nonadjacent course sections dangerously close: "+minDist);
});
test("11% speed gains are in authoritative movement physics, not merely the HUD",()=>{
 near(TRIAL.zoneSpeedStep,1.11);
 near(TRIAL.endSpeed,44*1.11**8);
 const stages=Array.from({length:9},(_,i)=>speedAt(5000,i));
 assert.ok(stages[8]>100);
 for(let i=1;i<stages.length;i++)near(stages[i]/stages[i-1],1.11,1e-11);
 const f=newFlightState();
 assert.equal(setZoneSpeedStage(f,1),true);
 const old=f.currentSpeed;
 stepFlight(f,1/120,{steer:0});
 assert.ok(f.currentSpeed>old);
 assert.ok(f.currentSpeed<speedAt(f.s,1));
 for(let i=0;i<180;i++)stepFlight(f,1/120,{steer:0});
 assert.ok(f.currentSpeed>47);
 assert.equal(f.zoneSpeedStage,1);
 assert.equal(f.zoneSpeedEvents.length,1);
 assert.equal(BOOST_CONFIG.multiplier,1.4);
 assert.equal(BOOST_PADS.length,5);
});
test("eight 18s fronts complete all nine physical color stages before finish",()=>{
 assert.deepEqual(ZONE_WAVE.triggers,[18,36,54,72,90,108,126,144]);
 assert.equal(ZONE_PALETTES.length,9);
 assert.equal(new Set(ZONE_PALETTES.map(p=>p.id)).size,9);
 const wave=newZoneWaveState();
 const dt=1/120;let s=5,t=0,velocity=44,stage=0;
 while(s<10400&&t<200){
  const desired=speedAt(s,stage);
  velocity+=(desired-velocity)*(1-Math.exp(-dt/TRIAL.zoneAccelerationSeconds));
  s+=velocity*dt;t+=dt;
  const result=updateZoneWave(wave,t,s);
  if(result.changed){stage=result.stage;}
 }
 assert.equal(stage,8,"must reach aurora finale before finishing");
 assert.equal(wave.activatedStages.length,8);
 assert.deepEqual(wave.passedStages,[1,2,3,4,5,6,7,8]);
 assert.ok(t>146&&t<168,"target ≈2m35 not hard timed; observed "+t);
 assert.equal(wave.activeCount,1,"shader still has just one active world front");
});
test("same road mesh and indexed raised rail system; larger curves physically navigable",()=>{
 const road=createSmoothDeckData(),rails=createAeroBarrierData();
 assert.ok(road.rows>10000&&road.rows<16000);
 assert.ok(rails.rows>10000&&rails.rows<13000);
 assert.equal(rails.columns,8);
 assert.equal(MESH_SPEC.sampleStep,.80);
 assert.equal(AERO_BARRIER.height,.99);
 assert.equal(AERO_BARRIER.bendHeightMeters,1.11);
 for(let s=0;s<=10400;s+=500){
  const p=positionAt(s,0,0);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));
 }
 // Even at 101m/s, max heading rate demanded by any authored curvature
 // remains below the pilot's maximum steering authority.
 assert.ok(speedAt(0,8)*.0081<TRIAL.maxYawRate);
});
test("production loads faster diverse race and retains existing HUD/SMAA",()=>{
 const html=source("./index.html"),boot=source("./boot-v0103.js"),
  game=source("./game-v0103.mjs"),browser=source("./browser-smoke-v081.mjs");
 assert.match(html,/game-v0103\.mjs/);
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(html,/10200 M/);
 assert.match(html,/style-v061\.css/);
 assert.match(boot,/import\("\.\/game-v0103\.mjs\?v=0\.10\.3"\)/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/zone_speed_increase/);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 for(const path of ["trial-v0901","zone-wave-v060","smooth-track-v0901",
   "premium-track-v0901","aero-barrier-v0901"])
  assert.ok(game.includes('from "./'+path+'.mjs"'),path);
 assert.match(browser,/18,36,54,72,90,108,126,144/);
 assert.ok(source("./trial-v050.mjs").includes("zoneSpeedStep:1.065"));
 assert.ok(source("./zone-wave-v050.mjs").includes("firstSeconds:20"));
});
