// SKYSHIFT 0.19.2 — Pass 2 hero art and visual-only steering isolation.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ORBITAL_HERO_0192,heroArchitecturePlan,retiredPrimitiveStation}
 from "../../orbital-hero-v0192.mjs";
import {worldArchitecturePlan} from "../../world-rebuild-v0190.mjs";
import {TRIAL,SKYLINE_LEAP,MAGNETIC_WALL}
 from "../../trial-v0165.mjs";
const src=file=>readFileSync(new URL("../../"+file,import.meta.url),"utf8");
test("one authored hero station between the Skyline launch and the leap",()=>{
 const h=ORBITAL_HERO_0192;
 assert.equal(h.stationS,278);
 assert.ok(h.stationS>160&&h.stationS<SKYLINE_LEAP.start);
 assert.ok(h.structureEnd<SKYLINE_LEAP.start);
 assert.ok(h.stationS<MAGNETIC_WALL.start);
 assert.equal(TRIAL.length,3400);
 assert.equal(h.addedColliders,0);
 assert.equal(h.addedPhysicsChanges,0);
 assert.equal(h.extraRenderPasses,0);
 assert.equal(h.materialPass1Reverted,true);
});
test("authored ring is a deep segmented shell with physically modeled inlays",()=>{
 const p=heroArchitecturePlan();
 assert.equal(p.armorSegments,20);
 assert.ok(p.recessedFaces>=18);
 assert.ok(p.arms>=6);
 assert.ok(p.beacons<=6);
 assert.ok(p.stats.triangles.shell>250);
 assert.ok(p.stats.triangles.inlays>70);
 assert.ok(p.stats.triangles.energy<p.stats.triangles.inlays/4,
  "The landmark is mostly sculpture, not glowing pipes");
 for(const [points,tints] of [
  [p.surfaces,p.surfaceTints],[p.details,p.detailTints],
  [p.emissive,p.emissiveTints]]){
  assert.equal(points.length,tints.length);
  for(const v of points){
   assert.ok(v.every(Number.isFinite));
   assert.ok(Math.abs(v[1])>=15.6||v[2]>=19.0,
    "The flight corridor remains obstruction-free");
  }
 }
});
test("Samsung-tier hero retains the important large surfaces and light windows",()=>{
 const high=heroArchitecturePlan(),low=heroArchitecturePlan({lowMemory:true});
 assert.equal(low.armorSegments,12);
 assert.equal(low.recessedFaces,12);
 assert.equal(low.beacons,4);
 assert.ok(low.stats.vertexCount<high.stats.vertexCount);
 assert.ok(low.stats.vertexCount>=700);
 assert.ok(low.stats.triangles.shell>low.stats.triangles.energy*12);
 assert.equal(ORBITAL_HERO_0192.staticKeyLightsHigh,1);
 assert.equal(ORBITAL_HERO_0192.staticKeyLightsLow,0);
});
test("only first primitive station is replaced and legacy source is preserved",()=>{
 for(const lowMemory of [false,true]){
  const w=worldArchitecturePlan({lowMemory});
  const hidden=w.beams.filter(retiredPrimitiveStation);
  assert.equal(hidden.length,lowMemory?21:55);
  assert.ok(hidden.every(x=>x.chapter==="orbital"));
  assert.ok(hidden.every(x=>x.a[1]<-40||x.b[1]<-40));
  assert.ok(!hidden.some(x=>x.a[0]>320));
  assert.equal(w.stats.beams,lowMemory?343:425);
  assert.equal(w.stats.colliders,0);
 }
 const worldSource=src("./world-rebuild-v0190.mjs");
 assert.match(worldSource,/steel:0x18283f,plum:0x28213d,black:0x0b1326/);
 assert.doesNotMatch(worldSource,/READABILITY_0191/);
});
test("production keeps archived physics, camera, 0.19.0 chapters and versioned A/B",()=>{
 const game=src("./game-v0192.mjs");
 assert.match(game,/from "\.\/trial-v0165\.mjs"/);
 assert.match(game,/from "\.\/flight\/unified-flight-v0165\.mjs"/);
 assert.match(game,/from "\.\/flight\/cinematic-v0165\.mjs"/);
 assert.match(game,/from "\.\/world-rebuild-v0190\.mjs"/);
 assert.match(game,/from "\.\/orbital-hero-v0192\.mjs"/);
 assert.match(game,/architectureEnabled=worldEnabled&&/);
 assert.match(game,/if\(architectureEnabled\)orbitalHero=installOrbitalHero/);
 assert.doesNotMatch(game,/world-material-readability-v0191\.mjs/);
 assert.match(game,/version:"0\.19\.2"/);
 assert.match(src("./index.html"),/boot-v0205\.js\?v=0\.20\.5/);
 assert.match(src("./boot-v0192.js"),/game-v0192\.mjs\?v=0\.19\.2/);
});
