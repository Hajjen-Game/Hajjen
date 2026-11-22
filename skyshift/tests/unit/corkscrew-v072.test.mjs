// SKYSHIFT 0.7.2 – deterministic full-roll collision, ceiling and 3-lap physics.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CORKSCREW,TRACK_3D,corkscrewAt,corkscrewBankAt,
 corkscrewProgressAt,MAGNETIC_WALL,elevationAt,gradeAt}
 from "../../track-3d-v072.mjs";
import {TRIAL,CIRCUIT,GAPS,GUARDRAIL,bankAt,bankDegreesAt,
 surfaceNormalAt,surfaceHeightAt,positionAt,poseAt,projectWorldToTrack,
 widthAt,guardrailLateralLimit,headingAt,curvatureAt,COURSE_SEGMENTS,
 TECHNICAL_APEX_PULSES,LOOP_CLOSURE_ERROR_METERS,circuitPlanSummary,
 newFlightState,stepFlight,speedAt,validateTrial} from "../../trial-v072.mjs";
import {GRIP_SPEC} from "../../precision-grip-v061.mjs";
import {createSmoothDeckData,MESH_SPEC} from "../../smooth-track-v072.mjs";
import {createAeroBarrierData,sampleAeroProfile,AERO_BARRIER}
 from "../../aero-barrier-v072.mjs";
import {PREMIUM_TRACK,patchPremiumShaders} from "../../premium-track-v072.mjs";
import {chasePose,cameraBankAt,CINEMATIC_DEFAULTS}
 from "../../cinematic-v072.mjs";
import * as archived from "../../trial-v071.mjs";
const source=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const near=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<=tol,
 "expected "+a+" ≈ "+b+" (tolerance "+tol+")");
test("full 360° corkscrew lives on the finish straight, leaves 70° wall alone",()=>{
 assert.equal(TRIAL.raceLength,10200);
 assert.equal(CIRCUIT.laps,3);
 assert.equal(GAPS.length,1);
 assert.equal(CORKSCREW.lengthMeters,333);
 assert.equal(TRACK_3D.corkscrew,true);
 assert.equal(TRACK_3D.ceilingRun,true);
 assert.equal(TRACK_3D.mandatoryRolls,1);
 assert.equal(TRACK_3D.additionalRoadMeshes,0);
 assert.equal(TRACK_3D.wallRide,true);
 near(bankDegreesAt(2550),70,1e-6);
 near(bankAt(CORKSCREW.start),0);
 near(bankAt(CORKSCREW.end),0);
 near(bankDegreesAt(3171.5),-180,1e-8);
 assert.ok(bankDegreesAt(3255)<-320);
 assert.ok(bankDegreesAt(3337.5)<-359.9);
 for(const s of [0,180,808,825.6,2418,2698,3004,3338,3400]){
  assert.equal(corkscrewAt(s),null);
  near(bankAt(s),archived.bankAt(s),1e-8);
 }
 assert.ok(corkscrewAt(3100));
 for(let s=0;s<3400;s+=.37){
  const a=bankAt(s),b=bankAt(s+3400);
  near(Math.cos(a),Math.cos(b),1e-9);
  near(Math.sin(a),Math.sin(b),1e-9);
 }
 near(Math.cos(corkscrewBankAt(3337.999)),
      Math.cos(corkscrewBankAt(3338)),1e-7);
 near(Math.sin(corkscrewBankAt(3337.999)),
      Math.sin(corkscrewBankAt(3338)),1e-7);
 assert.deepEqual(validateTrial(),[]);
});
test("indexed road, normal, full-ceiling contact and armored rails agree",()=>{
 const deck=createSmoothDeckData();
 assert.equal(deck.cols,MESH_SPEC.lateralColumns);
 assert.ok(deck.triangles>26000);
 assert.equal(PREMIUM_TRACK.drawBatches,1);
 assert.equal(AERO_BARRIER.drawBatches,3);
 assert.ok(createAeroBarrierData().triangles>80000);
 for(const s of [3005,3065,3110,3171.5,3228,3300,3337]){
  const n=surfaceNormalAt(s),p=positionAt(s,3,0),
    h=positionAt(s,3,1);
  near(Math.hypot(n.x,n.y,n.z),1,1e-8);
  near(p.y,surfaceHeightAt(s,3),1e-8);
  near(h.x-p.x,n.x,1e-8);near(h.y-p.y,n.y,1e-8);
  near(h.z-p.z,n.z,1e-8);
  const points=sampleAeroProfile(s,1);
  assert.equal(points.length,8);
 }
 assert.ok(surfaceNormalAt(3171.5).y<-.98);
 assert.ok(surfaceNormalAt(3088).y>.60);
 assert.ok(surfaceNormalAt(3255).y>.60);
 const a=positionAt(3171.5,0,0),b=positionAt(3171.5,0,1.05);
 assert.ok(b.y<a.y-1.03,"magnetic hover must be below inverted track");
 assert.ok(Math.abs(gradeAt(3400)-gradeAt(0))<1e-8);
});
function cross(lap,stage,lateral,steer=0){
 const s=(lap-1)*3400+2975,p=positionAt(s,lateral,0),f=newFlightState();
 Object.assign(f,{s,lap,lateral,worldX:p.x,worldZ:p.z,
   y:surfaceHeightAt(s,lateral)+TRIAL.hoverHeight*surfaceNormalAt(s).y,
   grounded:true,heading:headingAt(s),
   zoneSpeedStage:stage,zoneCruiseSpeed:speedAt(s,stage),
   currentSpeed:speedAt(s,stage)});
 let entries=0,exits=0,ceiling=0,ticks=0;
 const limit=(lap-1)*3400+3370;
 while(f.s<limit&&ticks++<1700){
  const r=stepFlight(f,1/120,{steer,grip:false});
  entries+=Number(r.corkscrewEntered);
  exits+=Number(r.corkscrewExited);
  if(f.corkscrewActive&&surfaceNormalAt(f.s).y<-.8)ceiling++;
  assert.ok(f.grounded,"magnetism lost at "+f.s);
  assert.ok(f.shield>0&&f.falls===0);
  assert.ok(Math.abs(f.lateral)<=guardrailLateralLimit(f.s)+1e-6,
    "lateral rail penetration at "+f.s);
 }
 return {f,ticks,entries,exits,ceiling};
}
test("pilot survives full rotation at all three lap speeds without side magnet",()=>{
 for(const [lap,stage,lateral] of [[1,3,0],[1,3,3],[2,5,-4],[3,8,0],[3,8,3]]){
  const r=cross(lap,stage,lateral);
  assert.ok(r.ticks<1700);
  assert.equal(r.entries,1);assert.equal(r.exits,1);
  assert.ok(r.ceiling>20);
  assert.equal(r.f.corkscrewEntries,1);
  assert.equal(r.f.corkscrewExits,1);
  assert.equal(r.f.corkscrewCleanExits,1);
  assert.equal(r.f.railContacts,0);
  assert.ok(r.f.corkscrewPeakDegrees>359.9);
  assert.ok(r.f.corkscrewCeilingSeconds>.14);
  assert.ok(r.f.corkscrewSeconds>2);
  assert.ok(r.f.corkscrewDistanceMeters>325);
  assert.ok(Math.abs(r.f.lateral-lateral)<.8,
    "automatic side pull: "+r.f.lateral+" vs "+lateral);
 }
});
test("modest steering still causes actual lateral travel on the ceiling",()=>{
 const straight=cross(3,8,0),turned=cross(3,8,0,.12);
 assert.ok(turned.f.lateral>straight.f.lateral+4,
  "pilot input was overwritten by magnetic track");
 assert.ok(turned.f.railContacts>=1);
 assert.equal(turned.f.falls,0);
});
test("full-roll chase camera has a continuous physical exit and stable framing",()=>{
 const s=3171.5,normal=surfaceNormalAt(s),p=positionAt(s);
 const view={worldX:p.x,worldZ:p.z,y:p.y+TRIAL.hoverHeight*normal.y,
  s,heading:headingAt(s),steering:0,clearance:0};
 const camera=chasePose(view,{cameraHeading:view.heading,hover:0},
  {preview:0},CINEMATIC_DEFAULTS,{});
 assert.ok(camera.y<view.y-5);
 near(cameraBankAt(s),-Math.PI,1e-8);
 near(Math.cos(cameraBankAt(3337.999)),
   Math.cos(cameraBankAt(3338)),1e-7);
 near(Math.sin(cameraBankAt(3337.999)),
   Math.sin(cameraBankAt(3338)),1e-7);
 near(cameraBankAt(2550),70*Math.PI/180*.46,1e-7);
});
test("GRIP apexes get real tighter curvature, preserve closed geometry and C2 joints",()=>{
 const designed=Object.entries(TECHNICAL_APEX_PULSES);
 assert.equal(designed.length,4);
 assert.deepEqual(validateTrial(),[]);
 assert.ok(LOOP_CLOSURE_ERROR_METERS<.3,"real geometry must close");
 for(const [id,pulse] of designed){
  const turn=COURSE_SEGMENTS.find(x=>x.id===id);
  assert.ok(turn&&turn.type==="turn",id);
  const mid=turn.start+turn.entry+turn.hold*.5;
  near(curvatureAt(mid),turn.curvature+.5*pulse,1e-8);
  near(headingAt(turn.start),archived.headingAt(turn.start),1e-8);
  near(headingAt(turn.end),archived.headingAt(turn.end),1e-8);
  near(curvatureAt(turn.start),0,1e-8);
  near(curvatureAt(turn.end),0,1e-8);
  for(let u=.01;u<1;u+=.05)
   assert.ok(curvatureAt(turn.start+turn.entry+u*turn.hold)>0,
    "a GRIP apex must not reverse direction: "+id);
 }
 const back=COURSE_SEGMENTS.find(t=>t.id==="back-sweeper");
 const curvature=curvatureAt(back.start+back.entry+back.hold*.5);
 const lateLapSpeed=92;
 assert.ok(curvature*lateLapSpeed>1.24,
  "late-lap corner should challenge normal yaw authority");
 assert.ok(curvature*lateLapSpeed<1.24*GRIP_SPEC.yawMultiplier,
  "GRIP should enable the late-lap turn without becoming impossible");
 const audit=circuitPlanSummary();
 assert.ok(audit.maximumCurvature>.014);
 assert.equal(audit.gripApexes.length,4);
});
test("archived 0.7.2 corkscrew keeps its geometry; live 0.10.3 extends the flight",()=>{
 const html=source("./index.html"),boot=source("./boot-v0103.js"),
  game=source("./game-v0103.mjs"),smoke=source("./browser-smoke-v081.mjs"),
  shader=source("./premium-track-v072.mjs"),
  archivedBoot=source("./boot-v072.js"),archivedGame=source("./game-v072.mjs");
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(html,/Signature Flight Motion/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(archivedBoot,/game-v072\.mjs\?v=0\.7\.2/);
 for(const dep of ["trial-v0901","frame-pacing-v080"]){
  assert.ok(game.includes('from "../../'+dep+'.mjs"'),dep);
 }
 for(const dep of ["smooth-track-v0901","premium-track-v0901",
  "aero-barrier-v0901","cinematic-v0901"]){
  assert.ok(game.includes('from "../../'+dep+'.mjs"'),dep);
 }
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/corkscrew_enter/);
 assert.match(game,/corkscrew_exit/);
 assert.match(game,/corkscrewCeilingSeconds/);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 assert.match(game,/cameraBankAt\(view\.s\)/);
 assert.match(archivedGame,/skyshift-corkscrew-v072-audit\.json/);
 assert.doesNotMatch(shader,/corkscrewLines|magneticLines|screwArea|magneticZone/);
 assert.match(shader,/float innerLine = trackStripe/);
 assert.match(shader,/float guideLine = trackStripe/);
 assert.match(smoke,/real Chrome validates|genuine 360° inverted road/);
 assert.match(source("./trial-v071.mjs"),/skyline-wall-v071/);
 assert.match(source("./trial-v070.mjs"),/skyline-3d-v070/);
});
