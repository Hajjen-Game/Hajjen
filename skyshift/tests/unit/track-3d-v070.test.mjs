// SKYSHIFT 0.7.0 – 3D track, real opening, 3-lap ballistic flight.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ELEVATION_KEYS,TRACK_3D,SKYLINE_LEAP,
 elevationAt,gradeAt,pitchAt,groundNormalAt,jumpAt,upcomingJump,
 elevationAudit} from "../../track-3d-v070.mjs";
import {CIRCUIT,COURSE_SEGMENTS,TRIAL,GAPS,
 poseAt,positionAt,heightAt,surfaceNormalAt,surfaceHeightAt,bankAt,
 onRoad,gapAt,nextGap,widthAt,headingAt,curvatureAt,
 newFlightState,stepFlight,speedAt,validateTrial} from "../../trial-v070.mjs";
import {MESH_SPEC,sampleDeckRows,createSmoothDeckData} from "../../smooth-track-v070.mjs";
import {AERO_BARRIER,createAeroBarrierData,sampleAeroProfile}
 from "../../tracks/barriers/aero-barrier-v070.mjs";
import {PREMIUM_TRACK} from "../../premium-track-v070.mjs";
import {chasePose,CINEMATIC_DEFAULTS} from "../../cinematic-v070.mjs";
const src=n=>readFileSync(new URL("../../"+n,import.meta.url),"utf8");
const near=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<=tol,
  "Expected "+a+" ≈ "+b);
test("the 3D skyline preserves the 3400m closed line across three laps",()=>{
 assert.equal(CIRCUIT.laps,3);
 assert.equal(TRIAL.length,3400);
 assert.equal(TRIAL.raceLength,10200);
 assert.equal(COURSE_SEGMENTS.length,15);
 assert.equal(GAPS.length,1);
 assert.equal(TRACK_3D.version,"vertical-topology-070");
 assert.equal(TRACK_3D.wallRide,false);
 assert.equal(TRACK_3D.ceilingRun,false);
 const a=poseAt(0),b=poseAt(3400);
 near(a.x,b.x,1e-9);near(a.y,b.y,1e-9);near(a.z,b.z,1e-9);
 near(b.heading-a.heading,2*Math.PI,1e-9);
 near(gradeAt(0),0);near(gradeAt(3400),0);
 for(const s of [0,245,508,760,808,827,1052,1621,2600,3200]){
  near(elevationAt(s),elevationAt(s+3400));
  near(elevationAt(s),elevationAt(s+6800));
  near(gradeAt(s),gradeAt(s+3400));
  near(positionAt(s,0,0).y,heightAt(s));
 }
 assert.deepEqual(validateTrial(),[]);
});
test("authored elevation, normal vectors and pitch are real and smooth",()=>{
 assert.ok(elevationAt(1700)>11.8);
 assert.ok(elevationAt(2580)<-4.4);
 assert.ok(elevationAt(400)>9.5);
 near(elevationAt(3400),0);
 assert.ok(gradeAt(280)>.04);
 assert.ok(gradeAt(620)<-.03);
 assert.ok(Math.abs(pitchAt(280))>.035);
 assert.equal(ELEVATION_KEYS[0].s,0);
 assert.equal(ELEVATION_KEYS.at(-1).s,3400);
 for(let i=1;i<ELEVATION_KEYS.length;i++){
  assert.ok(ELEVATION_KEYS[i].s>ELEVATION_KEYS[i-1].s);
  near(gradeAt(ELEVATION_KEYS[i].s),0,1e-8);
 }
 for(let s=0;s<3400;s+=4){
  const p=positionAt(s,4,0),n=surfaceNormalAt(s);
  near(p.y,surfaceHeightAt(s,4),1e-6);
  near(bankAt(s),0);
  near(poseAt(s).y,elevationAt(s));
  near(Math.hypot(n.x,n.y,n.z),1,1e-8);
  assert.ok(n.y>.97);
 }
 for(let s=0;s<3400;s+=.25)
  assert.ok(Math.abs(heightAt(s+.25)-heightAt(s))<.055,
    "vertical spike at "+s);
 const audit=elevationAudit();
 assert.equal(audit.high,12);
 assert.equal(audit.low,-4.6);
 near(audit.rise,16.6);
 near(audit.seamGradeError,0);
});
test("physical 17.6m SKYLINE LEAP really removes track surface",()=>{
 assert.equal(SKYLINE_LEAP.start,808);
 near(SKYLINE_LEAP.end-SKYLINE_LEAP.start,17.6,1e-9);
 assert.equal(gapAt(807.99),null);
 assert.equal(gapAt(808)?.id,SKYLINE_LEAP.id);
 assert.equal(gapAt(825.5)?.id,SKYLINE_LEAP.id);
 assert.equal(gapAt(825.6),null);
 assert.equal(gapAt(3400+810)?.id,SKYLINE_LEAP.id);
 assert.equal(onRoad(807.8,0),true);
 assert.equal(onRoad(812,0),false);
 assert.equal(onRoad(826,0),true);
 assert.equal(nextGap(750)?.id,SKYLINE_LEAP.id);
 assert.equal(upcomingJump(450,80),null);
 near(elevationAt(SKYLINE_LEAP.start),elevationAt(SKYLINE_LEAP.end));
});
test("one elevated indexed deck has missing triangles at the gap",()=>{
 const rows=sampleDeckRows(),deck=createSmoothDeckData();
 assert.equal(rows.length,deck.rows);
 assert.equal(deck.cols,MESH_SPEC.lateralColumns);
 assert.ok(deck.rows>4000&&deck.rows<5000);
 let valid=0,omitted=0;
 for(let i=0;i<rows.length-1;i++)
  if(gapAt((rows[i].s+rows[i+1].s)/2))omitted++;
  else valid++;
 assert.ok(omitted>=20);
 assert.equal(deck.triangles,valid*(MESH_SPEC.lateralColumns-1)*2);
 assert.equal(PREMIUM_TRACK.boostPads,3);
 assert.equal(TRACK_3D.additionalRoadMeshes,0);
});
test("raised rail profile follows height and cannot bridge the leap",()=>{
 const data=createAeroBarrierData(),columns=data.columns;
 assert.ok(data.rows>3500&&data.rows<4300);
 assert.equal(columns,8);
 assert.ok(data.triangles<(data.rows-1)*2*(columns-1)*2);
 const low=sampleAeroProfile(60,1)[5];
 const high=sampleAeroProfile(460,1)[5];
 assert.ok(high.y>low.y+9);
 assert.equal(AERO_BARRIER.physicalColliderHeightMeters,.78);
 assert.equal(AERO_BARRIER.drawBatches,3);
});
function simulateLeap(lap,stage=0){
 const f=newFlightState(),s=(lap-1)*3400+790;
 f.s=s;f.lap=lap;
 const p=positionAt(s,0,0);
 f.worldX=p.x;f.worldZ=p.z;
 f.heading=headingAt(s);
 f.y=surfaceHeightAt(s)+TRIAL.hoverHeight;
 f.zoneSpeedStage=stage;
 f.zoneCruiseSpeed=speedAt(s,stage);
 f.currentSpeed=f.zoneCruiseSpeed;
 let launched=0,landed=0,air=0;
 for(let i=0;i<240;i++){
  const r=stepFlight(f,1/120,{steer:0,grip:false});
  if(r.jumped)launched++;
  if(r.landed)landed++;
  if(!f.grounded)air++;
  if(landed)break;
 }
 return {f,launched,landed,air};
}
test("authentic lip flight takes off and lands cleanly in zone 1",()=>{
 const {f,launched,landed,air}=simulateLeap(1,0);
 assert.equal(launched,1);
 assert.equal(landed,1);
 assert.equal(f.autoLaunches,1);
 assert.equal(f.jumps,1);
 assert.equal(f.landings,1);
 assert.equal(f.cleanLeapLandings,1);
 assert.equal(f.falls,0);
 assert.equal(f.grounded,true);
 assert.ok(air>25);
 assert.ok(f.peakAirHeightMeters>1);
 assert.ok(f.s>SKYLINE_LEAP.end+1);
 assert.ok(f.s<950);
});
test("same jump geometry remains viable at third-lap top speed",()=>{
 const {f,launched,landed}=simulateLeap(3,8);
 assert.equal(launched,1);
 assert.equal(landed,1);
 assert.equal(f.cleanLeapLandings,1);
 assert.equal(f.falls,0);
 assert.ok(f.currentSpeed>95);
 assert.ok(f.s>6800+SKYLINE_LEAP.end);
 assert.ok(f.s<6800+1000);
});
test("GRIP physics survives 3D grade and doesn't require a jump button",()=>{
 const f=newFlightState();f.s=400;
 const p=positionAt(400,0);
 f.worldX=p.x;f.worldZ=p.z;
 f.y=surfaceHeightAt(400)+TRIAL.hoverHeight;
 f.heading=headingAt(400);
 for(let i=0;i<38;i++)stepFlight(f,1/120,{steer:.7,grip:true});
 assert.equal(f.gripActivations,1);
 assert.ok(f.gripPeakYawDeg>0);
 assert.ok(f.gripSpeedLossMeters>0);
 assert.equal(f.autoLaunches,0);
 assert.match(src("./trial-v061.mjs"),/precision-grip-v061/);
});
test("chase camera anticipates approaching slope, but stays pilot owned",()=>{
 const base={worldX:0,worldZ:0,y:surfaceHeightAt(280)+TRIAL.hoverHeight,
  s:280,steering:0,clearance:0,heading:headingAt(280)};
 const motion={cameraHeading:base.heading,hover:0},cinema={preview:0};
 const up=chasePose(base,motion,cinema,CINEMATIC_DEFAULTS,{});
 assert.ok(up.lookY>base.y+1.25);
 const flat={...base,s:60,y:surfaceHeightAt(60)+TRIAL.hoverHeight};
 const normal=chasePose(flat,motion,cinema,CINEMATIC_DEFAULTS,{});
 near(normal.lookY,flat.y+1.25);
 assert.match(src("./cinematic-v070.mjs"),/heightAt\(nextS\)-heightAt\(currentS\)/);
});
test("archived SKYSHIFT 0.7.0 stays unbanked while active 0.10.3 uses air tricks",()=>{
 const html=src("./index.html"),boot=src("./boot-v0103.js"),
   game=src("./game-v0103.mjs"),smoke=src("./tests/browser/legacy/browser-smoke-v081.mjs");
 assert.match(html,/game-v0103\.mjs/);
 assert.match(html,/Signature Flight Motion/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 for(const dep of ["trial-v0901","premium-track-v0901",
  "aero-barrier-v0901","cinematic-v0901"])
  assert.ok(game.includes('from "./'+dep+'.mjs"'),dep);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 assert.match(game,/autoLaunches/);
 assert.match(game,/pitchAt\(view\.s\)/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/precision-grip-v084/);
 assert.match(smoke,/skylineLeap/);
 assert.ok(src("./trial-v061.mjs").includes('export const GAPS=Object.freeze([])'));
 assert.equal(TRACK_3D.wallRide,false);
});
