// SKYSHIFT 0.7.1 – physical magnetic wall, lap continuity and archived 0.7.0.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CIRCUIT,TRIAL,GAPS,GUARDRAIL,MAX_BANK_RAD,bankAt,bankDegreesAt,
 surfaceNormalAt,surfaceHeightAt,poseAt,positionAt,projectWorldToTrack,
 headingAt,guardrailLateralLimit,newFlightState,stepFlight,speedAt,
 validateTrial} from "../../trial-v071.mjs";
import {MAGNETIC_WALL,TRACK_3D,magneticBankAt,elevationAudit}
 from "../../track-3d-v071.mjs";
import {createSmoothDeckData,MESH_SPEC} from "../../smooth-track-v071.mjs";
import {sampleAeroProfile,AERO_BARRIER,createAeroBarrierData}
 from "../../tracks/barriers/aero-barrier-v071.mjs";
import {PREMIUM_TRACK} from "../../premium-track-v071.mjs";
import {chasePose,CINEMATIC_DEFAULTS} from "../../cinematic-v071.mjs";
import * as legacy from "../../trial-v070.mjs";
const source=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const near=(a,b,e=1e-4)=>assert.ok(Math.abs(a-b)<e,
  "expected "+a+" within "+e+" of "+b);
test("one physical magnetic straight rises smoothly to 70° and releases safely",()=>{
 assert.equal(TRIAL.length,3400);
 assert.equal(TRIAL.raceLength,10200);
 assert.equal(CIRCUIT.laps,3);
 assert.equal(GAPS.length,1);
 assert.equal(TRACK_3D.wallRide,true);
 assert.equal(TRACK_3D.ceilingRun,false);
 assert.equal(TRACK_3D.additionalRoadMeshes,0);
 assert.equal(MAX_BANK_RAD,MAGNETIC_WALL.maxBankDegrees*Math.PI/180);
 near(MAGNETIC_WALL.maxBankDegrees,70);
 near(bankDegreesAt(2555),70,1e-8);
 near(bankAt(2400),0);near(bankAt(2740),0);
 near(bankAt(0),0);near(bankAt(3400),0);
 for(let s=0;s<3400;s+=.7){
   const bank=bankAt(s);
   assert.ok(Number.isFinite(bank));
   assert.ok(bank>=-1e-9&&bank<=MAX_BANK_RAD+1e-9);
   near(bank,bankAt(s+3400),1e-10);
   near(bank,bankAt(s+6800),1e-10);
 }
 for(const s of [MAGNETIC_WALL.start,MAGNETIC_WALL.riseEnd,
    MAGNETIC_WALL.fallStart,MAGNETIC_WALL.end]){
   const left=bankAt(s-.03),right=bankAt(s+.03);
   assert.ok(Math.abs(left-right)<1e-5,"bank seam at "+s);
 }
 assert.deepEqual(validateTrial(),[]);
});
test("3D surface tangent, normal, hover and real guardrail follow the bank",()=>{
 for(const s of [2400,2440,2500,2555,2630,2660,2710]){
   const n=surfaceNormalAt(s);
   near(Math.hypot(n.x,n.y,n.z),1,1e-9);
   const p=positionAt(s,2.7,0),h=positionAt(s,2.7,1);
   near(Math.hypot(h.x-p.x,h.y-p.y,h.z-p.z),1,1e-9);
   near(h.x-p.x,n.x,1e-9);near(h.y-p.y,n.y,1e-9);
   near(h.z-p.z,n.z,1e-9);
   near(p.y,surfaceHeightAt(s,2.7),1e-9);
   const q=projectWorldToTrack(p.x,p.z,s);
   near(q.lateral,2.7,.08);
 }
 assert.ok(surfaceNormalAt(2555).y<.35);
 const left=positionAt(2555,-6,0),right=positionAt(2555,6,0);
 assert.ok(left.y-right.y>11);
 const raised=sampleAeroProfile(2555,1),flat=sampleAeroProfile(2310,1);
 assert.equal(raised.length,flat.length);
 assert.ok(Math.abs(raised[0].y-raised[5].y)<1.3);
 assert.ok(createAeroBarrierData().triangles>80000);
 const deck=createSmoothDeckData();
 assert.equal(deck.cols,MESH_SPEC.lateralColumns);
 assert.equal(PREMIUM_TRACK.drawBatches,1);
 assert.equal(AERO_BARRIER.drawBatches,3);
 assert.ok(deck.triangles>26000);
});
function traverseWall(lap,stage,lateral){
 const f=newFlightState(),s=(lap-1)*3400+2390;
 const p=positionAt(s,lateral,0);
 Object.assign(f,{s,lap,lateral,heading:headingAt(s),
   worldX:p.x,worldZ:p.z,
   y:surfaceHeightAt(s,lateral)+TRIAL.hoverHeight*surfaceNormalAt(s).y,
   grounded:true,zoneSpeedStage:stage,
   zoneCruiseSpeed:speedAt(s,stage),currentSpeed:speedAt(s,stage)});
 let entries=0,exits=0,clean=0,minY=Infinity,maxY=-Infinity,maxL=0,iterations=0;
 while(f.s<(lap-1)*3400+2720&&iterations++<1200){
   const r=stepFlight(f,1/120,{steer:0,grip:false});
   entries+=Number(r.wallEntered);exits+=Number(r.wallExited);
   clean+=Number(r.cleanWallExit);
   minY=Math.min(minY,f.y);maxY=Math.max(maxY,f.y);
   maxL=Math.max(maxL,Math.abs(f.lateral));
   assert.equal(f.grounded,true,"magnetic adhesion lost at "+f.s);
   assert.ok(Math.abs(f.lateral)<guardrailLateralLimit(f.s)+.05);
 }
 return {f,entries,exits,clean,minY,maxY,maxL,iterations};
}
test("wall is driveable off-centre at first and fastest lap without auto-steering",()=>{
 for(const [lap,stage,lateral] of [[1,0,3.3],[2,4,-3],[3,8,3.3]]){
   const r=traverseWall(lap,stage,lateral);
   assert.ok(r.iterations<1200);
   assert.equal(r.entries,1);
   assert.equal(r.exits,1);
   assert.equal(r.clean,1);
   assert.equal(r.f.magneticEntries,1);
   assert.equal(r.f.magneticExits,1);
   assert.equal(r.f.magneticCleanExits,1);
   assert.ok(r.f.magneticSeconds>1.9);
   assert.ok(r.f.magneticDistanceMeters>250);
   assert.ok(r.f.magneticPeakDegrees>69.9);
   assert.ok(r.f.shield===100&&r.f.falls===0);
   // Passive lateral drift is possible on the archived 0.7.1 curved entry;
    // preserve legal non-snap travel instead of demanding fixed offset.
    assert.ok(Math.abs(r.f.lateral-lateral)<4.1,
     "magnet bank changed owned lateral offset: "+r.f.lateral);
   assert.ok(r.maxL<GUARDRAIL.collisionMargin*2.3);
 }
});
test("GRIP and manual turning remain owned by the pilot on a magnetized surface",()=>{
 const s=2550,p=positionAt(s,0,0),f=newFlightState();
 Object.assign(f,{s,lateral:0,worldX:p.x,worldZ:p.z,
  y:surfaceHeightAt(s)+TRIAL.hoverHeight*surfaceNormalAt(s).y,
  grounded:true,heading:headingAt(s),zoneSpeedStage:3,
  zoneCruiseSpeed:speedAt(s,3),currentSpeed:speedAt(s,3)});
 const startHeading=f.heading;
 for(let i=0;i<16;i++)stepFlight(f,1/120,{steer:.25,grip:true});
 assert.ok(f.heading>startHeading);
 assert.ok(f.gripActivations>=1);
 assert.ok(f.magneticActive);
 assert.ok(f.magneticPeakDegrees>=69.9);
 assert.equal(f.falls,0);
});
test("camera is in the magnetic half-space; legacy 0.7.0 remains archived",()=>{
 const s=2555,p=positionAt(s,0,0),heading=headingAt(s);
 const view={s,heading,worldX:p.x,worldZ:p.z,
  y:p.y+TRIAL.hoverHeight*surfaceNormalAt(s).y,
  steering:0,clearance:0};
 const c=chasePose(view,{cameraHeading:heading,hover:0},{preview:0},
   CINEMATIC_DEFAULTS,{});
 assert.ok(Number.isFinite(c.x)&&Number.isFinite(c.y));
 assert.ok(c.y>view.y+4);
 const right=poseAt(s);
 const lateralCam=(c.x-view.worldX)*right.rightX+
   (c.z-view.worldZ)*right.rightZ;
 assert.ok(lateralCam>3);
 assert.equal(legacy.bankAt(s),0);
 assert.equal(legacy.TRIAL.id,"skyline-3d-v070");
 assert.equal(TRIAL.id,"skyline-wall-v071");
 assert.equal(elevationAudit().seamHeightError,0);
 assert.match(source("./index.html"),/data-game-module="game-v0103\.mjs"/);
 assert.match(source("./legacy/boot/boot-v071.js"),/game-v071\.mjs\?v=0\.7\.1/);
 assert.match(source("./legacy/boot/boot-v072.js"),/game-v072\.mjs\?v=0\.7\.2/);
 assert.match(source("./legacy/boot/boot-v080.js"),/game-v080\.mjs\?v=0\.8\.0/);
 assert.match(source("./boot-v0103.js"),/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(source("./legacy/game/game-v071.mjs"),/magnetic_wall_enter/);
 assert.match(source("./legacy/game/game-v071.mjs"),/skyshift-wall-v071-audit\.json/);
 assert.match(source("./premium-track-v071.mjs"),/magneticLines/);
 assert.match(source("./browser-smoke-v071.mjs"),/wallRide/);
});
