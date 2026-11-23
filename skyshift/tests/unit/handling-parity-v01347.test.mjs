// SKYSHIFT 0.13.4.7 — all steering and visual bank math MUST be identical.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MANTA_WING_OUTLINE} from "../../manta-blade-v0484.mjs";
import {STINGRAY_PRESENTATION_01347 as s,visualSettingsForShip}
 from "../../ships/stingray-presentation-v01347.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const game=read("./game-v01347.mjs");
test("both ships get the exact SAME unrestricted visual rotation",()=>{
 assert.match(game,/ship\.rotation\.z=naturalRoll;/);
 assert.match(game,/const naturalRoll=motion\.roll-roadBank-/);
 assert.doesNotMatch(game,/stableStingrayVisualRoll|clampVisualRoll|wing-clearance-v01341/);
 assert.doesNotMatch(game,/ship\.rotation\.z=activeShipId/);
 assert.equal(s.modifyVisualRoll,false);
 assert.equal(s.useDynamicWingClearance,false);
 assert.equal(s.modifyPhysicalRoll,false);
});
test("both ships use identical positioning, hover and no Stingray-only height",()=>{
 assert.match(game,/view\.worldX\+surfaceNormal\.x\*\(rideOffset\+motion\.hover\)/);
 assert.match(game,/view\.y\+surfaceNormal\.y\*motion\.hover/);
 assert.match(game,/view\.worldZ\+surfaceNormal\.z\*\(rideOffset\+motion\.hover\)/);
 assert.doesNotMatch(game,/const visualLift=activeShipId/);
 assert.equal(s.visualRoadNormalLiftMeters,0);
 assert.equal(visualSettingsForShip("stingray").lift,0);
 assert.equal(visualSettingsForShip("manta").lift,0);
 assert.equal(s.modifyPhysicalHover,false);
});
test("physical steering and GRIP still share a SINGLE stepFlight path",()=>{
 assert.match(game,/const result=stepFlight\(flight,dt,\{steer,grip:gripHeld\}\);/);
 const integrate=game.slice(game.indexOf("function integrate(dt){"),game.indexOf("function updatePalette("));
 assert.doesNotMatch(integrate,/if\s*\(activeShipId\s*===/);
 assert.equal(s.modifySteering,false);
 assert.equal(s.modifyGrip,false);
 assert.equal(s.modifyCamera,false);
 assert.match(game,/__skyshiftHandlingParityProbe/);
});
test("real wingtip scale and base-preserving engine FX remain unchanged",()=>{
 const gltf=JSON.parse(read("./assets/ships/stingray-evo-hero-v4.gltf"));
 const wing=gltf.meshes.find(m=>m.name==="Hero_Wing_R");
 const half=gltf.accessors[wing.primitives[0].attributes.POSITION].max[0];
 const manta=Math.max(...MANTA_WING_OUTLINE.map(p=>Math.abs(p[0])))*2;
 assert.ok(Math.abs(2*half*s.visualWingScale-manta)<1e-8);
 assert.deepEqual(visualSettingsForShip("stingray"),
  {scaleX:5.80/8.08,scaleY:.68,scaleZ:.68,lift:0});
 assert.match(game,/engine-trails-v01346\.mjs/);
 const fx=read("./engine-trails-v01346.mjs");
 assert.match(fx,/baseScale\.x\*\(1\+landAmount/);
});
test("version 0.13.4.7 is wired to the production page and bootstrap",()=>{
 const page=read("./index.html"),boot=read("./boot-v01347.js");
 assert.match(page,/boot-v01347\.js\?v=0\.13\.4\.7/);
 assert.match(page,/data-game-module="game-v01347\.mjs"/);
 assert.match(boot,/game-v01347\.mjs\?v=0\.13\.4\.7/);
});
