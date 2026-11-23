// SKYSHIFT 0.13.4.5 — real art span, continuous GRIP-safe visual pose.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MANTA_WING_OUTLINE} from "../../manta-blade-v0484.mjs";
import {STINGRAY_PRESENTATION_01345 as spec,
 visualSettingsForShip,stableStingrayVisualRoll}
 from "../../ships/stingray-presentation-v01345.mjs";
import {TRIAL} from "../../trial-v0901.mjs";
import {STINGRAY_EVO} from "../../ships/stingray-evo-v01342.mjs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const art=JSON.parse(read("./assets/ships/stingray-evo-hero-v4.gltf"));
const mesh=name=>art.meshes.find(m=>m.name===name);
function bounds(name){
 const m=mesh(name);assert.ok(m,"missing real glTF mesh "+name);
 return art.accessors[m.primitives[0].attributes.POSITION];
}
test("deployed V4 HERO wing is calibrated against captured chase-view pixels",()=>{
 const manta=2*Math.max(...MANTA_WING_OUTLINE.map(p=>Math.abs(p[0])));
 const hero=2*bounds("Hero_Wing_R").max[0];
 const presented=hero*spec.visualWingScale;
 assert.equal(manta,5.8);
 assert.equal(spec.screenshotMantaWidthPixels,170);
 assert.equal(spec.screenshotStingrayWidthPixels,210);
 assert.equal(spec.screenSpaceCorrection,170/210);
 assert.ok(Math.abs(presented-manta*spec.screenSpaceCorrection)<1e-8);
 assert.equal(spec.visualWingScale,(spec.mantaBeamMeters/spec.rawStingrayBeamMeters)*(170/210));
 assert.ok(presented<manta,"the image-space reference requires a narrower world span");
 assert.ok(spec.visualLengthScale<.72);
 assert.ok(spec.visualVerticalScale<.72);
 assert.equal(spec.tailJoints,STINGRAY_EVO.segmentCount);
});
test("only Stingray gets a compact 3D root and fixed road-normal lift",()=>{
 assert.deepEqual(visualSettingsForShip("stingray"),{
  scaleX:(5.80/8.08)*(170/210),scaleY:.68,scaleZ:.68,lift:.26});
 for(const id of ["manta","",null])
  assert.deepEqual(visualSettingsForShip(id),{
   scaleX:1,scaleY:1,scaleZ:1,lift:0});
 assert.equal(spec.modifyPhysicalHover,false);
 assert.equal(spec.modifyPhysicalRoll,false);
 assert.equal(spec.modifyGrip,false);
 assert.equal(spec.modifyCamera,false);
 assert.equal(spec.useDynamicWingClearance,false);
 assert.equal(spec.otherShipsUnaffected,true);
});
test("GRIP visual roll stays smooth and below a static wing-clearance envelope",()=>{
 const max=spec.maxRelativeVisualRollRadians;
 assert.equal(max,.25);
 for(const bank of [0,.12,-.12,1.22,-1.22,Math.PI,-Math.PI]){
  for(let n=-120;n<=120;n++){
   const relative=n/100;
   const out=stableStingrayVisualRoll(-bank+relative,bank);
   assert.ok(Number.isFinite(out));
   assert.ok(Math.abs(out+bank)<=max+1e-10);
   assert.ok(Math.abs(out+bank)<=Math.abs(relative)+1e-10);
  }
 }
 // Conservative flat-road envelope under combined hover/lift compression
 // and maximum pitch deflection; outer wing's positive underside height
 // provides additional safety above this calculation.
 const wingHalf=bounds("Hero_Wing_R").max[0]*spec.visualWingScale;
 const compression=.11+.11;
 const pitchReserve=2.49*spec.visualLengthScale*Math.sin(.14);
 const clearance=TRIAL.hoverHeight+spec.visualRoadNormalLiftMeters-
  compression-wingHalf*Math.sin(max)-pitchReserve;
 assert.ok(clearance>.20,"static roll cap must retain clearance: "+clearance);
});
test("no abrupt bank limit, left/right symmetry or steering reversal",()=>{
 const bank=.28,max=spec.maxRelativeVisualRollRadians;
 let prev=-Infinity;
 for(let i=-1000;i<=1000;i++){
  const delta=i/1000;
  const rel=stableStingrayVisualRoll(-bank+delta,bank)+bank;
  assert.ok(rel>=prev-1e-12,"monotonic response");
  if(i>-1000)assert.ok(rel-prev<.0011,"no hard snap on release");
  prev=rel;
 }
 for(const v of [.005,.05,.2,.6]){
  const left=stableStingrayVisualRoll(v,0);
  const right=stableStingrayVisualRoll(-v,0);
  assert.ok(Math.abs(left+right)<1e-12);
  assert.ok(Math.abs(left)<=max);
 }
});
test("full aerial trick and 360 degree corkscrew bank survive limitation",()=>{
 for(const bank of [0,-Math.PI,Math.PI,1.22]){
  for(const trick of [0,Math.PI/2,Math.PI,2*Math.PI]){
   const lean=.7,raw=-bank-trick+lean;
   const actual=stableStingrayVisualRoll(raw,bank,trick);
   const expected=-bank-trick+.25*Math.tanh(lean/.25);
   assert.ok(Math.abs(actual-expected)<1e-12);
  }
 }
});
test("active game changes ONLY Stingray render root and visual roll, not physics",()=>{
 const game=read("./game-v01345.mjs");
 assert.match(game,/buildStingrayEvo\(THREE,shipGlow\):buildPremiumMantaBlade/);
 assert.match(game,/ship\.scale\.set\(visual\.scaleX,visual\.scaleY,visual\.scaleZ\)/);
 assert.match(game,/__skyshiftScreenBeamProbe/);
 assert.match(game,/buildMantaWings\(\)\.positions/);
 assert.match(game,/stableStingrayVisualRoll\(naturalRoll,roadBank,view\.trickVisualAngle\?\?0\)/);
 assert.match(game,/const result=stepFlight\(flight,dt,\{steer,grip:gripHeld\}\)/);
 assert.match(game,/const visualLift=activeShipId==="stingray"/);
 assert.doesNotMatch(game,/wing-clearance-v01341|stingrayClearance|clampVisualRoll/);
 assert.doesNotMatch(game,/flight\.y\s*\+=\s*spec|flight\.y\s*\+=\s*STINGRAY_PRESENTATION/);
 assert.equal(spec.addedDrawCalls,0);
});
test("0.13.4.5 boot and menu are wired to the new production module",()=>{
 const html=read("./index.html"),boot=read("./boot-v01345.js");
 assert.match(html,/boot-v01345\.js\?v=0\.13\.4\.5/);
 assert.match(html,/data-game-module="game-v01345\.mjs"/);
 assert.match(html,/SKYLINE CIRCUIT · 0\.13\.4\.5/);
 assert.match(boot,/import\("\.\/game-v01345\.mjs\?v=0\.13\.4\.5"\)/);
});

test("deployed V4 3D asset has intact complete imported wing and tail geometry",()=>{
 // The archived V4 generator is not byte-identical to the checked-in hero.
 // Validate the actual shipped asset used by GLTFLoader instead.
 assert.equal(art.asset.version,"2.0");
 assert.equal(art.meshes.length,34);
 assert.equal(art.nodes.length,34);
 assert.equal(art.materials.length,9);
 assert.equal(art.buffers.length,1);
 assert.equal(art.scenes[0].nodes.length,34);
 assert.ok(!art.images&&!art.animations&&!art.skins);
 const names=new Set(art.meshes.map(m=>m.name));
 for(const name of ["Hero_Wing_L","Hero_Wing_R","Hero_Engine_L",
  "Hero_Engine_R","Hero_Hull_Spine","Hero_Canopy",...Array.from(
   {length:9},(_,i)=>"Hero_Tail_Plate_"+String(i+1).padStart(2,"0"))])
  assert.ok(names.has(name),"missing active V4 mesh "+name);
 const tris=art.meshes.reduce((sum,m)=>
  sum+art.accessors[m.primitives[0].indices].count/3,0);
 assert.ok(tris>3500&&tris<=8000);
 const wing=bounds("Hero_Wing_R");
 assert.equal(wing.max[0],4.04);
 assert.ok(wing.min[1]>=0);
});
