// SKYSHIFT 0.4.8 — physical boost lane and large zone pattern regression.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BOOST_CONFIG,BOOST_PADS,boostPadAt,stepBoostState} from "./boost-v048.mjs";
import {
 TRIAL,COURSE_SEGMENTS,positionAt,headingAt,curvatureAt,
 newFlightState,stepFlight,guardrailLateralLimit,speedAt
} from "./trial-v048.mjs";
import {
 ZONE_SURFACE,MACRO_FIELDS,MACRO_CHEVRONS,
 buildZoneSurfaceData,installZoneSurface
} from "./zone-surface-v048.mjs";
import * as previous from "./trial-v046.mjs";
const source=name=>readFileSync(new URL(name,import.meta.url),"utf8");
function near(a,b,eps=1e-8){assert.ok(Math.abs(a-b)<eps,"expected "+a+" near "+b);}
function placed(s,lateral=0){
 const f=newFlightState(),p=positionAt(s,lateral,0);
 f.s=s;f.lateral=lateral;f.worldX=p.x;f.worldZ=p.z;
 f.heading=headingAt(s);f.y=TRIAL.hoverHeight;
 return f;
}
function fly(f,steps=130,steer=0){
 const activations=[];let maxSpeed=0;
 for(let i=0;i<steps;i++){
  const e=stepFlight(f,1/120,{steer});
  if(e.boostActivated)activations.push(e.boostActivated);
  maxSpeed=Math.max(maxSpeed,f.currentSpeed);
  if(f.finished||f.failed)break;
 }
 return {activations,maxSpeed};
}
test("pads are entirely inside safe, genuine straight segments and within rail limits",()=>{
 assert.equal(BOOST_PADS.length,2);
 assert.equal(TRIAL.length,510);
 assert.equal(TRIAL.startSpeed,44);
 assert.equal(TRIAL.endSpeed,47);
 const straights=COURSE_SEGMENTS.filter(c=>c.type==="straight");
 for(const p of BOOST_PADS){
  assert.ok(straights.some(c=>p.start>c.start+10&&p.end<c.end-10),p.id);
  for(const s of [p.start,p.end,(p.start+p.end)/2])
   near(curvatureAt(s),0);
  assert.ok(Math.abs(p.lateralMin)<guardrailLateralLimit(p.start));
  assert.ok(Math.abs(p.lateralMax)<guardrailLateralLimit(p.start));
  assert.ok(p.end-p.start>=15);
 }
});
test("both boost pads trigger true increased WORLD displacement, once each",()=>{
 for(const pad of BOOST_PADS){
  const boosted=placed(pad.start-3,0);
  const base=placed(pad.start-3,0);
  const out=fly(boosted);
  // Baseline trial without bonus is still the reference handling physics.
  const pb=previous.newFlightState(),oldP=previous.positionAt(pad.start-3);
  Object.assign(pb,{s:pad.start-3,lateral:0,worldX:oldP.x,worldZ:oldP.z,
   heading:previous.headingAt(pad.start-3),y:TRIAL.hoverHeight});
  for(let i=0;i<130;i++){
   previous.stepFlight(pb,1/120,{steer:0});
   if(pb.finished||pb.failed)break;
  }
  assert.deepEqual(out.activations,[pad.id]);
  assert.equal(boosted.boostActivations,1);
  assert.deepEqual(boosted.boostActivatedIds,[pad.id]);
  assert.ok(boosted.peakBoostMultiplier>1.26);
  assert.ok(out.maxSpeed>speedAt(pad.start)*1.2);
  assert.ok(boosted.boostActiveSeconds>.8);
  assert.ok(boosted.boostDistanceMeters>35);
  assert.ok(boosted.s>pb.s+2,"should genuinely travel farther");
  assert.equal(boosted.falls,0);
  assert.equal(boosted.offRoadSeconds,0);
  assert.ok(base.currentSpeed===TRIAL.startSpeed);
 }
});
test("a boost is single-use: never retriggers while sitting on the pad",()=>{
 const f=placed(BOOST_PADS[0].start+1);
 let first=0;
 for(let i=0;i<270;i++){
  const p=stepBoostState(f,1/120,44,true);
  if(p)first++;
 }
 assert.equal(first,1);
 assert.equal(f.boostActivations,1);
 assert.equal(f.boostTimer,0);
 assert.ok(f.boostMultiplier<=1.002);
 assert.ok(f.peakSpeed>50);
});
test("passing outside the active lane, or in the air, never activates",()=>{
 const pad=BOOST_PADS[0];
 for(const lateral of [pad.lateralMin-1,pad.lateralMax+1]){
  const f=placed(pad.start+4,lateral);
  for(let i=0;i<4;i++)assert.equal(stepBoostState(f,1/120,44,true),null);
  assert.equal(f.boostActivations,0);
 }
 const airborne=placed(pad.start+3,0);
 assert.equal(stepBoostState(airborne,1/120,44,false),null);
 assert.equal(airborne.boostMultiplier,1);
 assert.equal(boostPadAt(pad.start+3,0)?.id,pad.id);
});
test("old handling is unchanged without an active boost pad",()=>{
 const a=placed(105),b=previous.newFlightState();
 const start=previous.positionAt(105,0,0);
 Object.assign(b,{s:105,lateral:0,worldX:start.x,worldZ:start.z,
  heading:previous.headingAt(105),y:TRIAL.hoverHeight});
 for(let i=0;i<60;i++){
  const steer=i<30?.30:-.15;
  stepFlight(a,1/120,{steer});
  previous.stepFlight(b,1/120,{steer});
  near(a.worldX,b.worldX);
  near(a.worldZ,b.worldZ);
  near(a.heading,b.heading);
  near(a.yawRate,b.yawRate);
  near(a.s,b.s);
 }
 assert.equal(a.boostActivations,0);
});
test("boost ramp is bounded, smooth and returns to base speed",()=>{
 const f=placed(BOOST_PADS[0].start+1);
 let previousSpeed=44,maxStep=0;
 for(let i=0;i<300;i++){
  stepBoostState(f,1/120,44,true);
  maxStep=Math.max(maxStep,Math.abs(f.currentSpeed-previousSpeed));
  previousSpeed=f.currentSpeed;
  assert.ok(f.boostMultiplier>=1&&f.boostMultiplier<=BOOST_CONFIG.multiplier);
 }
 assert.ok(maxStep<.85,"no instantaneous frame spike");
 near(f.currentSpeed,44,.02);
 assert.equal(BOOST_CONFIG.multiplier,1.3);
});
test("large-scale two-tone graphic fields are broad, static and distinct from boost",()=>{
 assert.equal(MACRO_FIELDS.length,8);
 assert.equal(MACRO_CHEVRONS.length,3);
 assert.ok(MACRO_FIELDS.every(f=>f.end-f.start>=12&&f.width>=3));
 assert.ok(BOOST_PADS.every(p=>p.end-p.start>=18));
 assert.notEqual(ZONE_SURFACE.macroFieldColor,ZONE_SURFACE.boostFieldColor);
 assert.ok(ZONE_SURFACE.flashing===false);
 assert.ok(ZONE_SURFACE.paletteReady);
 const data=buildZoneSurfaceData();
 assert.equal(data.macroFields,8);
 assert.equal(data.boostPads,2);
 assert.equal(data.macroChevrons,3);
 assert.ok(data.triangles>500&&data.triangles<2500);
 for(const type of ["fields","boost","details"]){
  const batch=data[type];
  assert.equal(batch.positions.length,batch.values.length);
  assert.equal(batch.positions.length,batch.quads*18);
 }
 assert.deepEqual(data.paletteAnchors,[0,95,222,292,424,510]);
});
test("3 reusable surface materials can recolor without changing geometry",()=>{
 class Color{
  constructor(x){this.x=x;}
  setHex(x){this.x=x;return this;}
 }
 class Geometry{
  setAttribute(k,v){(this.attributes??={})[k]=v;}
  computeVertexNormals(){}
  computeBoundingSphere(){}
  dispose(){this.disposed=true;}
 }
 class Attribute{
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;}
 }
 class Material{
  constructor(args){Object.assign(this,args);this.color=new Color(args.color);}
  dispose(){this.disposed=true;}
 }
 class Mesh{
  constructor(g,m){this.geometry=g;this.material=m;}
  removeFromParent(){this.removed=true;}
 }
 const THREE={BufferGeometry:Geometry,Float32BufferAttribute:Attribute,
  MeshBasicMaterial:Material,Mesh,DoubleSide:2};
 const meshes=[],world={add(m){meshes.push(m);}};
 const asset=installZoneSurface(THREE,world);
 assert.equal(asset.drawBatches,3);
 assert.equal(meshes.length,3);
 const vertices=meshes.map(x=>x.geometry.attributes.position.array.length);
 asset.setZonePalette(0x55aaee,0xeeb333,0xffffff);
 assert.deepEqual(meshes.map(x=>x.material.color.x),
  [0x55aaee,0xeeb333,0xffffff]);
 assert.deepEqual(meshes.map(x=>x.geometry.attributes.position.array.length),vertices);
 assert.ok(meshes.every(x=>x.material.depthWrite===false));
 asset.dispose();
 assert.ok(meshes.every(x=>x.removed&&x.geometry.disposed&&x.material.disposed));
});
test("page uses v048 physical boost, HUD actual speed, ship light and zone graphics",()=>{
 const g=source("game-v048.mjs"),h=source("index.html");
 assert.match(h,/boot-v04911\.js\?v=0\.4\.9\.1\.1/);
 assert.match(h,/style-v043\.css\?v=0\.4\.9\.1\.1/);
 assert.match(g,/from "\.\/trial-v048\.mjs"/);
 assert.match(g,/from "\.\/boost-v048\.mjs"/);
 assert.match(g,/from "\.\/zone-surface-v048\.mjs"/);
 assert.match(g,/installZoneSurface\(THREE,world\)/);
 assert.match(g,/SPEED "\+\(flight\.currentSpeed\/22\)/);
 assert.match(g,/forwardSpeed:flight\.currentSpeed/);
 assert.match(g,/cinematicFov\(flight\.currentSpeed/);
 assert.match(g,/result\.boostActivated/);
 assert.match(g,/version:"0\.4\.8"/);
 assert.match(g,/skyshift-boost-v048-audit\.json/);
 assert.match(g,/from "\.\/aero-barrier-v047\.mjs"/);
 assert.match(g,/from "\.\/flight-motion-v044\.mjs"/);
});
