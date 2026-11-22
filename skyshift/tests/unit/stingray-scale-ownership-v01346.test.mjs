import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MANTA_WING_OUTLINE} from "../../manta-blade-v0484.mjs";
import {STINGRAY_PRESENTATION_01346 as spec,
 visualSettingsForShip,stableStingrayVisualRoll} from "../../stingray-presentation-v01346.mjs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
test("real HERO wing is scaled to Manta width instead of the failed 170/210 workaround",()=>{
 const m=JSON.parse(read("./assets/ships/stingray-evo-hero-v4.gltf"));
 const w=m.meshes.find(x=>x.name==="Hero_Wing_R");
 const half=m.accessors[w.primitives[0].attributes.POSITION].max[0];
 const standard=Math.max(...MANTA_WING_OUTLINE.map(p=>Math.abs(p[0])))*2;
 assert.equal(standard,5.8);
 assert.ok(Math.abs(half*2*spec.visualWingScale-standard)<1e-8);
 assert.equal(spec.screenSpaceCorrection,1);
 assert.deepEqual(visualSettingsForShip("stingray"),
  {scaleX:5.8/8.08,scaleY:.68,scaleZ:.68,lift:.26});
});
test("root scale is preserved through ALL engine animations",()=>{
 const engine=read("./engine-trails-v01346.mjs");
 const game=read("./game-v01346.mjs");
 assert.match(engine,/baseScale=Object\.freeze\(\{x:ship\.scale\.x,y:ship\.scale\.y,z:ship\.scale\.z\}\)/);
 assert.match(engine,/baseScale\.x\*\(1\+landAmount/);
 assert.match(engine,/baseScale\.y\*\(1-landAmount/);
 assert.match(engine,/baseScale\.z\*\(1\+jumpAmount/);
 assert.doesNotMatch(engine,/if\(currentShip\)currentShip\.scale\.set\(\s*1\+/);
 assert.match(game,/engine-trails-v01346\.mjs/);
 assert.match(game,/ship\.scale\.set\(visual\.scaleX,visual\.scaleY,visual\.scaleZ\)/);
 assert.match(game,/__skyshiftScreenBeamProbe/);
 assert.match(game,/const result=stepFlight\(flight,dt,\{steer,grip:gripHeld\}\)/);
 assert.doesNotMatch(game,/wing-clearance-v01341|stingrayClearance|clampVisualRoll/);
});
test("GRIP roll cap remains smooth, symmetric, and road-bank-relative",()=>{
 for(const road of [0,.45,-1.2,Math.PI]){
  for(const lean of [-.8,-.2,0,.2,.8]){
   const roll=stableStingrayVisualRoll(-road+lean,road);
   assert.ok(Math.abs(roll+road)<=.25000001);
   assert.ok(Math.abs(roll+road)<=Math.abs(lean)+1e-8);
  }
 }
 assert.equal(spec.modifyGrip,false);
 assert.equal(spec.modifySteering,false);
 assert.equal(spec.modifyCamera,false);
 assert.equal(spec.modifyPhysicalHover,false);
});
test("active 0.13.4.6 has a matching executable boot path",()=>{
 const page=read("./index.html"),boot=read("./boot-v01346.js");
 assert.match(page,/boot-v01346\.js\?v=0\.13\.4\.6/);
 assert.match(page,/game-v01346\.mjs/);
 assert.match(boot,/game-v01346\.mjs\?v=0\.13\.4\.6/);
});
