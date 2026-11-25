// SKYSHIFT 0.8.2 – C2 race rhythm, GRIP-only fast apex line, spaced 3D spectacles.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {
 CIRCUIT,COURSE_SEGMENTS,TRIAL,GRIP_APEX,SKYLINE_LEAP,MAGNETIC_WALL,CORKSCREW,
 BOOST_PADS,GUARDRAIL,poseAt,positionAt,headingAt,curvatureAt,bankDegreesAt,
 surfaceNormalAt,surfaceHeightAt,widthAt,newFlightState,stepFlight,speedAt,
 validateTrial,gripApexAt,guardrailLateralLimit
} from "../../trial-v082.mjs";
import {GRIP_SPEC} from "../../precision-grip-v061.mjs";
import {createSmoothDeckData} from "../../tracks/shared/smooth-track-v082.mjs";
import {createAeroBarrierData} from "../../tracks/barriers/aero-barrier-v082.mjs";
import {PREMIUM_TRACK} from "../../rendering/legacy/premium-track-v082.mjs";
import {cameraBankAt} from "../../cinematic-v082.mjs";
import * as archived from "../../trial-v081.mjs";
const source=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const near=(a,b,e=1e-4)=>assert.ok(Math.abs(a-b)<=e,
  "expected "+a+" ~= "+b+" within "+e);
test("first physical corner starts at 160m, with exactly closed 3×3400m racing",()=>{
 assert.equal(TRIAL.id,"skyline-track-rhythm-v082");
 assert.equal(CIRCUIT.lapLength,3400);
 assert.equal(TRIAL.raceLength,10200);
 assert.equal(CIRCUIT.laps,3);
 near(COURSE_SEGMENTS[0].end,160.13576152,1e-8);
 near(COURSE_SEGMENTS.at(-1).end,3400,1e-7);
 near(archived.COURSE_SEGMENTS[0].end,395.13576152,1e-8);
 near(curvatureAt(80),0,1e-12);
 assert.ok(curvatureAt(220)>.002);
 const start=poseAt(0),finish=poseAt(3400);
 near(start.x,finish.x,1e-7);near(start.z,finish.z,1e-7);
 near(Math.cos(start.heading),Math.cos(finish.heading),1e-7);
 assert.deepEqual(validateTrial(),[]);
});
test("one naturally narrowing 14m GRIP throat matches the actual 3D colliders",()=>{
 assert.equal(GRIP_APEX.minWidthMeters,14);
 assert.equal(GRIP_APEX.normalWidthMeters,23.2);
 for(const s of [0,100,573,1050,1900,3300])near(widthAt(s),23.2);
 for(const s of [840,880,905,952,961.5])near(widthAt(s),14);
 assert.ok(widthAt(800)<23.2&&widthAt(800)>14);
 assert.ok(widthAt(980)>14&&widthAt(980)<23.2);
 near(guardrailLateralLimit(900),7-GUARDRAIL.collisionMargin);
 assert.ok(gripApexAt(900));
 assert.equal(gripApexAt(1100),null);
 assert.ok(createSmoothDeckData().triangles>25000);
 assert.ok(createAeroBarrierData().triangles>20000);
 assert.equal(PREMIUM_TRACK.drawBatches,1);
});
const inverseSteer=(target)=>{
 if(Math.abs(target)<.001)return 0;
 const y=Math.min(1,Math.abs(target));
 const x=(-.32+Math.sqrt(.1024+2.72*y))/1.36;
 return Math.sign(target)*(.055+.945*x);
};
function cornerRun(stage,grip){
 const seg=COURSE_SEGMENTS.find(x=>x.id==="precision-apex");
 const s=seg.start-35,p=positionAt(s),f=newFlightState();
 Object.assign(f,{s,worldX:p.x,worldZ:p.z,heading:headingAt(s),
  y:surfaceHeightAt(s)+TRIAL.hoverHeight,
  zoneSpeedStage:stage,zoneCruiseSpeed:speedAt(s,stage),
  currentSpeed:speedAt(s,stage)});
 let steps=0,firstContact=null;
 while(f.s<seg.end+20&&steps++<2100){
  // Same human-owned desired path for BOTH trials. Pure physical steering;
  // only the GRIP button is toggled. No lane snap or track autopilot.
  const desired=curvatureAt(f.s+f.currentSpeed*.1)*f.currentSpeed+
   .95*(headingAt(f.s)-f.heading)-.12*f.lateral;
  const authority=grip?GRIP_SPEC.yawMultiplier:1;
  const steer=Math.max(-1,Math.min(1,
   inverseSteer(desired/(TRIAL.maxYawRate*authority))));
  const r=stepFlight(f,1/120,{steer,grip});
  if(r.railContact&&firstContact===null)firstContact=f.s;
  if(r.crashed)break;
 }
 return {f,firstContact};
}
test("fastest-zone GRIP apex challenges the ungripped line but is clean with GRIP",()=>{
 const free=cornerRun(8,false),gripped=cornerRun(8,true);
 assert.ok(free.f.railContacts>=1,
  "without GRIP, an aggressive fastest-zone line should contact the rail");
 assert.equal(gripped.f.railContacts,0,
  "with GRIP, the same apex should stay within the physical rail boundary");
 assert.ok(gripped.f.gripApexEntries>=1);
 assert.ok(gripped.f.gripApexCleanExits>=1);
 assert.ok(gripped.f.gripApexGripSeconds>.4);
 assert.ok(gripped.f.maxLateral<GRIP_APEX.minWidthMeters*.5);
 assert.ok(free.firstContact>GRIP_APEX.throatStart);
});
test("lower speeds teach the line without arbitrarily requiring GRIP",()=>{
 for(const stage of [0,4]){
  const free=cornerRun(stage,false),gripped=cornerRun(stage,true);
  assert.equal(free.f.railContacts,0);
  assert.equal(gripped.f.railContacts,0);
  assert.equal(free.f.falls,0);
  assert.equal(gripped.f.falls,0);
 }
});
test("a real wall moves to the middle and full 360° Corkscrew remains at finale",()=>{
 near(MAGNETIC_WALL.start,1662);
 near(MAGNETIC_WALL.end,1842);
 near(MAGNETIC_WALL.maxBankDegrees,70);
 near(CORKSCREW.start,3005);
 near(CORKSCREW.end,3338);
 assert.ok(CORKSCREW.start-MAGNETIC_WALL.end>1000);
 assert.ok(MAGNETIC_WALL.start>GRIP_APEX.funnelEnd+550);
 assert.ok(CORKSCREW.start>MAGNETIC_WALL.end+1000);
 near(bankDegreesAt(1775),70,.05);
 near(bankDegreesAt(3171.5),-180,1e-4);
 assert.ok(surfaceNormalAt(3171.5).y<-.98);
 near(cameraBankAt(3171.5),-Math.PI,.02);
 assert.ok(!gripApexAt(MAGNETIC_WALL.start));
});
test("leap and three reusable speed pads move to safe authored straights",()=>{
 near(SKYLINE_LEAP.start,573);
 near(SKYLINE_LEAP.end,606.6);
 assert.equal(BOOST_PADS.length,3);
 assert.deepEqual(BOOST_PADS.map(p=>[p.start,p.end]),
  [[58,86],[2195,2225],[3150,3180]]);
 assert.ok(COURSE_SEGMENTS[2].start<SKYLINE_LEAP.start);
 assert.ok(COURSE_SEGMENTS[2].end>SKYLINE_LEAP.end);
});
test("active GitHub Pages build and audit reflect 0.10.3, preserving 0.8.2 geometry archive",()=>{
 const html=source("./index.html"),boot=source("./boot-v0103.js"),
  game=source("./game-v0103.mjs");
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(game,/version:"0\.10\.3"/);
 for(const d of ["trial-v0901","boost-v082","premium-track-v0901",
  "smooth-track-v0901","aero-barrier-v0901","cinematic-v0901"])
  assert.ok(game.includes('from "./'+d+'.mjs"'),d);
 assert.match(game,/grip_apex_enter/);
 assert.match(game,/grip_apex_exit/);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 assert.match(source("./trial-v081.mjs"),/skyline-grip-airtricks-v081/);
 assert.match(source("./legacy/game/game-v081.mjs"),/version:"0\.8\.1"/);
});
