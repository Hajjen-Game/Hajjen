// SKYSHIFT 0.4.7 — Aero-Barrier architecture and non-magnetic safety checks.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 AERO_BARRIER,AERO_PROFILE,sampleAeroProfile,
 createAeroBarrierData,createAeroDetailData,installAeroBarriers
} from "./aero-barrier-v047.mjs";
import {
 TRIAL,GUARDRAIL,positionAt,curvatureAt,
 guardrailLateralLimit,newFlightState,stepFlight
} from "./trial-v046.mjs";
const source=name=>readFileSync(new URL(name,import.meta.url),"utf8");
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test("profile is architectural, not a semicircular glowing tube",()=>{
 assert.equal(AERO_PROFILE.length,8);
 assert.equal(AERO_BARRIER.profileColumns,8);
 assert.equal(AERO_BARRIER.height,GUARDRAIL.height);
 assert.equal(AERO_PROFILE[0][0],-1.36);
 assert.ok(AERO_PROFILE[1][1]<.07);
 assert.ok(AERO_PROFILE[3][1]>.6);
 assert.equal(AERO_PROFILE[4][1],AERO_PROFILE[5][1],
   "cap should be flat and visibly wide");
 assert.ok(AERO_PROFILE[5][0]-AERO_PROFILE[4][0]>.5,
   "flat cap should read as a metal panel");
 assert.ok(AERO_PROFILE.at(-1)[1]<0);
 assert.ok(AERO_BARRIER.capLightWidthMeters<=.04);
});
test("guardrail shape follows all curve transitions without geometric kinks",()=>{
 for(const side of [-1,1])for(const s of [0,95,125,192,222,292,322,394,424,510]){
  const center=sampleAeroProfile(s,side);
  const near=sampleAeroProfile(Math.min(TRIAL.length,s+.001),side);
  const before=sampleAeroProfile(Math.max(0,s-.001),side);
  assert.equal(center.length,8);
  for(let i=0;i<center.length;i++){
   assert.ok(dist(near[i],before[i])<.04,"seam in "+s+" col "+i);
   assert.ok(Number.isFinite(center[i].y));
  }
 }
});
test("indexed mesh has shared vertices and bounded overhead",()=>{
 const mesh=createAeroBarrierData();
 const n=8*2*mesh.rows;
 assert.equal(mesh.columns,8);
 assert.equal(mesh.positions.length,n*3);
 assert.equal(mesh.colors.length,n*3);
 assert.equal(new Set(mesh.indices).size,n);
 assert.equal(mesh.indices.length,(mesh.rows-1)*7*2*6);
 assert.ok(mesh.triangles>18000&&mesh.triangles<28000);
 const emptyShell=sampleAeroProfile(160,1);
 assert.ok(emptyShell[3].y>emptyShell[1].y-.7);
});
test("LEDs are small, actual corner chevrons more prominent than on straights",()=>{
 const paint=createAeroDetailData();
 assert.ok(paint.curveChevrons>=20&&paint.curveChevrons<65);
 assert.ok(paint.panelSeams>50);
 assert.ok(paint.shoulderMarks>=30);
 assert.ok(paint.dark.quads>0&&paint.light.quads>0);
 assert.ok(paint.light.triangles+paint.dark.triangles<7000);
 assert.equal(paint.light.positions.length,paint.light.colors.length);
 assert.equal(paint.dark.positions.length,paint.dark.colors.length);
 assert.deepEqual(paint.accentAnchors,[0,95,222,292,424,510]);
 assert.equal(curvatureAt(50),0);
 assert.ok(Math.abs(curvatureAt(156))>.0045);
 assert.equal(AERO_BARRIER.metalPanelPitchMeters,16);
});
test("material layers are separate and only inlays follow zone color",()=>{
 class Color{
  constructor(v){this.value=v;}
  copy(other){this.value=other.value;return this;}
 }
 class BufferGeometry{
  setAttribute(name,value){(this.attributes??={})[name]=value;}
  setIndex(value){this.indices=value;}
  computeVertexNormals(){}
  computeBoundingSphere(){}
  dispose(){this.disposed=true;}
 }
 class Float32BufferAttribute{
  constructor(values,itemSize){this.array=values;this.itemSize=itemSize;}
 }
 class Material{
  constructor(props){Object.assign(this,props);this.color=new Color(props.color);}
  dispose(){this.disposed=true;}
 }
 class Mesh{
  constructor(geometry,material){this.geometry=geometry;this.material=material;}
  removeFromParent(){this.detached=true;}
 }
 const THREE={BufferGeometry,Float32BufferAttribute,
  MeshStandardMaterial:Material,MeshBasicMaterial:Material,Mesh,
  DoubleSide:2};
 const members=[],world={add(m){members.push(m);}};
 const result=installAeroBarriers(THREE,world);
 assert.equal(members.length,3);
 assert.equal(members[0].material.flatShading,true,
   "angular metal must not shade like a rounded tube");
 assert.equal(result.drawBatches,3);
 assert.equal(result.accentWidthMeters,.035);
 assert.equal(result.chevrons,createAeroDetailData().curveChevrons);
 assert.ok(result.plan.includes("thin-zone-reactive-led"));
 const originalMetal=members[0].material.color.value;
 const originalSeams=members[1].material.color.value;
 result.updateAccent(new Color(0xff55aa));
 assert.equal(members[0].material.color.value,originalMetal);
 assert.equal(members[1].material.color.value,originalSeams);
 assert.equal(members[2].material.color.value,0xff55aa);
 result.dispose();
 assert.ok(members.every(m=>m.detached&&m.geometry.disposed&&m.material.disposed));
});
test("authoritative collision and steering are still from 0.4.6",()=>{
 const sourceTrial=source("trial-v046.mjs"),game=source("game-v047.mjs");
 assert.ok(sourceTrial.includes("constrainToGuardrail(st,dt)"));
 assert.match(game,/from "\.\/trial-v046\.mjs"/);
 assert.match(game,/from "\.\/smooth-track-v046\.mjs"/);
 assert.match(game,/from "\.\/flight-motion-v044\.mjs"/);
 assert.match(game,/from "\.\/cinematic-v045\.mjs"/);
 const st=newFlightState();
 for(let i=0;i<450;i++){
  stepFlight(st,1/120,{steer:1});
  assert.ok(Math.abs(st.lateral)<=guardrailLateralLimit(st.s)+1e-6);
  assert.equal(st.offRoadSeconds,0);
  assert.equal(st.falls,0);
 }
 assert.ok(st.railContacts>0);
 assert.equal(TRIAL.startSpeed,44);
 assert.equal(TRIAL.endSpeed,47);
 assert.equal(TRIAL.maxYawRate,1.24);
});
test("0.4.7 active page uses batched metal, panel seams and color-ready inlays",()=>{
 const html=source("index.html"),game=source("game-v047.mjs");
 assert.match(html,/game-v0483\.mjs\?v=0\.4\.8\.3/);
 assert.match(html,/style-v043\.css\?v=0\.4\.8\.3/);
 assert.match(game,/from "\.\/aero-barrier-v047\.mjs"/);
 assert.match(game,/identitySurface=installAeroBarriers\(THREE,world\)/);
 assert.match(game,/identitySurface\?\.updateAccent\(neonKit\.worldAccent\)/);
 assert.match(game,/version:"0\.4\.7"/);
 assert.match(game,/skyshift-track-v047-audit\.json/);
 assert.match(game,/panelSeams:identitySurface\.panelSeams/);
 assert.match(game,/lightWidthMeters:identitySurface\.accentWidthMeters/);
 assert.doesNotMatch(game,/buildGeometry\(rimHalo/);
 assert.doesNotMatch(game,/buildGeometry\(underRail/);
 assert.doesNotMatch(game,/const skirtTrim=/);
});
