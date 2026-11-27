// SKYSHIFT 0.18.0 — art-only environment regression, no WebGL needed.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {CIRCUIT,SKYLINE_LEAP,MAGNETIC_WALL,CORKSCREW} from "../../tracks/trials/trial-v0165.mjs";
import {SIGNATURE_ENV_0180,signatureArchitecturePlan}
 from "../../world/signature-environment-v0180.mjs";
const src=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
test("Celestial Conduit is exactly one 300m Skyline S-section, away from hazards",()=>{
 const c=SIGNATURE_ENV_0180;
 assert.equal(c.end-c.start,300);
 assert.equal(c.start,1185);assert.equal(c.end,1485);
 assert.ok(c.start>SKYLINE_LEAP.end+300);
 assert.ok(c.end<MAGNETIC_WALL.start-100);
 assert.ok(c.end<CORKSCREW.start);
 assert.equal(CIRCUIT.lapLength,3400);
 assert.equal(c.physicsModule,"trial-v0165.mjs");
});
test("Every architecture endpoint stays outside rails or far above ship",()=>{
 const plan=signatureArchitecturePlan();
 assert.equal(plan.active,true);
 assert.equal(plan.stats.portals,6);
 assert.equal(plan.stats.extraDrawCalls,4);
 assert.ok(plan.beams.length>=150);
 for(const beam of plan.beams){
  for(const p of [beam.a,beam.b]){
   assert.ok(Number.isFinite(p[0])&&Number.isFinite(p[1])&&Number.isFinite(p[2]));
   assert.ok(Math.abs(p[1])>SIGNATURE_ENV_0180.roadHalfWidth+2.4||
     p[2]>SIGNATURE_ENV_0180.minimumCrossingHeight,
     "No beam endpoint intrudes on drivable flight corridor");
  }
  assert.ok(beam.a[0]>=SIGNATURE_ENV_0180.start-5);
  assert.ok(beam.b[0]<=SIGNATURE_ENV_0180.end+1);
 }
 assert.equal(plan.stats.addedColliders,0);
 assert.equal(plan.stats.dynamicLights,0);
 assert.equal(plan.stats.extraPasses,0);
});
test("Low-memory version retains hero silhouette and rails in 3 draw batches",()=>{
 const high=signatureArchitecturePlan(),low=signatureArchitecturePlan({lowMemory:true});
 assert.equal(low.stats.extraDrawCalls,3);
 assert.equal(low.stats.portals,high.stats.portals);
 assert.equal(low.stats.materials.rose,high.stats.materials.rose);
 assert.equal(low.stats.materials.alloy,high.stats.materials.alloy);
 assert.equal(low.stats.materials.white,0);
 assert.ok(low.beams.length<high.beams.length);
});
test("Environment is Skyline-only; Aurora stays physically and visually intact",()=>{
 const aurora=signatureArchitecturePlan({track:"aurora"});
 assert.equal(aurora.active,false);
 assert.deepEqual(aurora.beams,[]);
 assert.equal(aurora.stats.extraDrawCalls,0);
 assert.equal(aurora.stats.addedColliders,0);
});
test("Production uses original shared 120Hz steering, GRIP and camera",()=>{
 const game=src("./legacy/game/game-v0180.mjs"),html=src("./index.html");
 assert.match(game,/from "\.\.\/\.\.\/trial-v0165\.mjs"/);
 assert.match(game,/from "\.\.\/\.\.\/flight\/unified-flight-v0165\.mjs"/);
 assert.match(game,/from "\.\.\/\.\.\/flight\/cinematic-v0165\.mjs"/);
 assert.match(game,/from "\.\.\/\.\.\/signature-environment-v0180\.mjs"/);
 assert.match(game,/envEnabled/);
 assert.match(html,/boot-v0205\.js\?v=0\.20\.5/);
 assert.match(src("./legacy/boot/boot-v0180.js"),/game-v0180\.mjs\?v=0\.18\.0/);
});
