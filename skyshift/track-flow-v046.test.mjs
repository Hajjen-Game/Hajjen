// SKYSHIFT 0.4.6 — deterministic flow, raised rails and colour-ready surface.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 TRIAL,GUARDRAIL,COURSE_SEGMENTS,GEOMETRY_BREAKS,
 easedCurvature,integratedEasedCurvature,headingAt,curvatureAt,bankAt,
 positionAt,poseAt,roadIntervals,guardrailLateralLimit,constrainToGuardrail,
 newFlightState,stepFlight,validateTrial,onRoad
} from "./trial-v046.mjs";
import {
 MESH_SPEC,createSmoothDeckData,sampleDeckRows
} from "./smooth-track-v046.mjs";
import {
 TRACK_IDENTITY,createRailData,sampleRailSection,createSurfaceIdentityData
} from "./identity-v046.mjs";
const source=name=>readFileSync(new URL(name,import.meta.url),"utf8");
const epsilon=1e-5;
const near=(a,b,tol=epsilon)=>assert.ok(Math.abs(a-b)<=tol,
 "expected "+a+" ≈ "+b+" (+/- "+tol+")");
const pointDist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test("0.4.6 retains speed, 510m length, authored straights and manual yaw",()=>{
 assert.equal(TRIAL.length,510);
 assert.equal(TRIAL.startSpeed,44);
 assert.equal(TRIAL.endSpeed,47);
 assert.equal(TRIAL.maxYawRate,1.24);
 assert.equal(COURSE_SEGMENTS.length,5);
 assert.equal(COURSE_SEGMENTS.filter(x=>x.type==="turn").length,2);
 assert.deepEqual(validateTrial(),[]);
 assert.deepEqual(roadIntervals(52),[[-11.6,11.6]]);
 assert.equal(GEOMETRY_BREAKS.length,10);
});
test("quintic entry/exit curvature has zero slope and zero curvature at joins",()=>{
 near(easedCurvature(0),0);
 near(easedCurvature(1),1);
 near(integratedEasedCurvature(1),.5);
 for(const turn of COURSE_SEGMENTS.filter(x=>x.type==="turn")){
  assert.ok(turn.entry>=30&&turn.exit>=30);
  const joins=[turn.start,turn.start+turn.entry,
   turn.start+turn.entry+turn.hold,turn.end];
  for(const s of joins){
   const left=curvatureAt(s-.001),right=curvatureAt(s+.001);
   near(left,right,.00001);
   const slope=(curvatureAt(s+.015)-curvatureAt(s-.015))/.03;
   assert.ok(Math.abs(slope)<.00006,"no sharp bank changes at "+s);
  }
  const expected=turn.curvature*(turn.hold+(turn.entry+turn.exit)*.5);
  near(headingAt(turn.end)-headingAt(turn.start),expected,1e-8);
  near(bankAt(turn.start),0,1e-10);
  near(bankAt(turn.end),0,1e-10);
 }
 for(const s of [12,60,250,460])near(curvatureAt(s),0);
});
test("road ribbon has no positional seam or discontinuous edge normals",()=>{
 for(const s of GEOMETRY_BREAKS.slice(1,-1)){
  const p=positionAt(s-.001,9),q=positionAt(s+.001,9);
  assert.ok(pointDist(p,q)<.04,"position seam "+s);
  const headingChange=Math.atan2(Math.sin(headingAt(s+.001)-headingAt(s-.001)),
   Math.cos(headingAt(s+.001)-headingAt(s-.001)));
  assert.ok(Math.abs(headingChange)<.001,"heading kink "+s);
  const rollChange=Math.abs(bankAt(s+.001)-bankAt(s-.001));
  assert.ok(rollChange<.00005,"bank seam "+s);
 }
});
test("denser shared-index roadway preserves smooth triangles and exact endpoints",()=>{
 const data=createSmoothDeckData(),rows=sampleDeckRows();
 assert.equal(MESH_SPEC.lateralColumns,7);
 assert.ok(MESH_SPEC.sampleStep<=.30);
 assert.equal(data.cols,7);
 assert.equal(data.positions.length,data.rows*7*3);
 assert.equal(data.indices.length,(data.rows-1)*6*6);
 assert.equal(rows[0].s,0);assert.equal(rows.at(-1).s,510);
 assert.equal(new Set(data.indices).size,data.rows*data.cols);
 for(let i=1;i<rows.length;i++){
  assert.ok(rows[i].s>rows[i-1].s);
  assert.ok(rows[i].s-rows[i-1].s<=MESH_SPEC.sampleStep+1e-9);
 }
});
test("left and right rails are single continuous indexed ribbon strips",()=>{
 const rails=createRailData();
 assert.equal(rails.columns,5);
 assert.equal(rails.positions.length,rails.rowCount*5*2*3);
 assert.equal(rails.indices.length,(rails.rowCount-1)*4*2*6);
 assert.equal(new Set(rails.indices).size,rails.rowCount*5*2);
 assert.ok(rails.triangleCount<21000,"no GPU-hungry excessive tessellation");
 const left=sampleRailSection(156,-1),right=sampleRailSection(156,1);
 assert.equal(left.length,5);assert.equal(right.length,5);
 assert.ok(left[2].y>left[0].y-.5);
 for(const s of [0,95,125,192,222,292,394,424,510]){
  const a=sampleRailSection(Math.max(0,s-.001),1);
  const b=sampleRailSection(Math.min(TRIAL.length,s+.001),1);
  for(let col=0;col<5;col++)
   assert.ok(pointDist(a[col],b[col])<.04,"seam at "+s+" column "+col);
 }
});
test("guardrails clip world position ONLY on collision, never player yaw/speed",()=>{
 const st=newFlightState(),yaw=st.heading;
 const insideWorldX=st.worldX;
 assert.equal(constrainToGuardrail(st,1/120),false);
 assert.equal(st.worldX,insideWorldX);assert.equal(st.heading,yaw);
 st.lateral=guardrailLateralLimit(st.s)+1.1;
 st.worldX+=12;st.worldZ-=3;
 assert.equal(constrainToGuardrail(st,1/120),true);
 near(st.lateral,guardrailLateralLimit(st.s));
 assert.equal(st.heading,yaw);
 assert.equal(st.railContacts,1);
 assert.ok(onRoad(st.s,st.lateral));
 assert.ok(st.railMaxPenetration>1.09);
 const p=positionAt(st.s,st.lateral,0);
 near(p.x,st.worldX,1e-7);near(p.z,st.worldZ,1e-7);
});
test("rail can contain repeated high-speed outward steering without falls",()=>{
 const st=newFlightState(),initialShield=st.shield;
 let contacts=0;
 for(let i=0;i<600;i++){
  const event=stepFlight(st,1/120,{steer:i<300?1:-1});
  if(event.railContact)contacts++;
  assert.ok(Math.abs(st.lateral)<=guardrailLateralLimit(st.s)+.001);
  assert.equal(st.falls,0);
  assert.equal(st.shield,initialShield);
 }
 assert.ok(contacts>0,"force a true collision");
 assert.ok(st.railContacts>0);
 assert.equal(st.offRoadSeconds,0);
});
test("two draw batches carry meaningful chevrons and restrained road patterns",()=>{
 const data=createSurfaceIdentityData(),rails=createRailData();
 assert.equal(TRACK_IDENTITY.rails,2);
 assert.equal(TRACK_IDENTITY.raisedCollision,true);
 assert.equal(TRACK_IDENTITY.colorReactiveAccents,true);
 assert.ok(data.chevrons>30);
 assert.ok(data.shoulderMarks>=30);
 assert.equal(data.positions.length,data.quads*6*3);
 assert.equal(data.colors.length,data.positions.length);
 assert.ok(data.triangles>data.chevrons*2);
 assert.ok(data.triangles<10000);
 assert.ok(rails.triangleCount>1000);
 assert.deepEqual(data.accentAnchors,[0,95,222,292,424,510]);
});
test("active site builds the new road mesh, rails, collision log and audit",()=>{
 const html=source("index.html"),game=source("game-v046.mjs");
 assert.match(html,/boot-v0493\.js\?v=0\.4\.9\.3/);
 assert.match(html,/style-v043\.css\?v=0\.4\.9\.3/);
 assert.match(game,/from "\.\/trial-v046\.mjs"/);
 assert.match(game,/from "\.\/smooth-track-v046\.mjs"/);
 assert.match(game,/from "\.\/identity-v046\.mjs"/);
 assert.match(game,/installPremiumTrack\(THREE,world\)/);
 assert.match(game,/identitySurface\?\.updateAccent/);
 assert.match(game,/version:"0\.4\.6"/);
 assert.match(game,/skyshift-track-v046-audit\.json/);
 assert.match(game,/guardrail_contact/);
 assert.match(game,/from "\.\/cinematic-v045\.mjs"/);
 assert.match(game,/from "\.\/flight-motion-v044\.mjs"/);
 assert.doesNotMatch(game,/buildGeometry\(rimHalo/);
});
