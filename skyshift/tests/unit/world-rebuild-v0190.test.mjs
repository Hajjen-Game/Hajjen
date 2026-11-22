// SKYSHIFT 0.19.0 — static world planning / physics integrity.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 WORLD_0190,worldArchitecturePlan,worldBeamClear
} from "./world-rebuild-v0190.mjs";
import {TRIAL,SKYLINE_LEAP,MAGNETIC_WALL,CORKSCREW}
 from "../../trial-v0165.mjs";
const src=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
test("3 authored chapters, Skyline geometry unchanged",()=>{
 const chapters=WORLD_0190.chapters;
 assert.deepEqual(chapters.map(x=>x.id),["orbital","conduit","cathedral"]);
 assert.ok(chapters.every(x=>x.end>x.start));
 assert.ok(chapters.every((x,i)=>i===0||x.start>chapters[i-1].end));
 assert.equal(TRIAL.length,3400);
 assert.ok(chapters[0].start<180,"First major environment visible near start");
 assert.ok(chapters[1].start>SKYLINE_LEAP.end+300);
 assert.ok(chapters[1].end<MAGNETIC_WALL.start);
 assert.ok(chapters[2].start>CORKSCREW.start-1100);
 assert.equal(WORLD_0190.activePhysics,"trial-v0165.mjs");
});
test("all near/mid/far architecture is outside the flight corridor",()=>{
 const p=worldArchitecturePlan({track:"skyline"});
 assert.equal(p.active,true);
 assert.ok(p.beams.length>=350);
 assert.ok(p.beams.every(worldBeamClear));
 assert.ok(p.stats.chapters.every(x=>x.beams>90));
 assert.equal(p.stats.colliders,0);
 assert.equal(p.stats.dynamicLights,0);
 assert.equal(p.stats.renderPasses,0);
 assert.ok(p.stats.drawBatches<=WORLD_0190.highDrawBatches);
});
test("low memory keeps monument silhouettes without extra GPU passes",()=>{
 const high=worldArchitecturePlan(),low=worldArchitecturePlan({lowMemory:true});
 assert.ok(low.beams.length<high.beams.length);
 assert.equal(low.stats.materials.core,0);
 assert.equal(low.stats.chapters.length,3);
 assert.ok(low.stats.chapters.every(x=>x.beams>60));
 assert.equal(low.stats.drawBatches,WORLD_0190.lowDrawBatches);
 assert.equal(high.stats.drawBatches,WORLD_0190.highDrawBatches);
});
test("Skyline module cannot change Aurora",()=>{
 const other=worldArchitecturePlan({track:"aurora"});
 assert.equal(other.active,false);
 assert.equal(other.beams.length,0);
 assert.equal(other.stats.drawBatches,0);
});
test("the final executable uses original GRIP and flight physics",()=>{
 const game=src("./game-v0190.mjs");
 const html=src("./index.html");
 assert.match(game,/from "\.\/trial-v0165\.mjs"/);
 assert.match(game,/from "\.\/unified-flight-v0165\.mjs"/);
 assert.match(game,/from "\.\/cinematic-v0165\.mjs"/);
 assert.match(game,/from "\.\/world-rebuild-v0190\.mjs"/);
 assert.match(game,/worldEnabled=envEnabled/);
 assert.match(game,/track:TRACK_ID_0160,lowMemory:limitedMemory,positionAt/);
 assert.match(game,/version:"0\.19\.0"/);
 assert.match(html,/boot-v0205\.js\?v=0\.20\.5/);
 assert.match(src("./boot-v0190.js"),/game-v0190\.mjs\?v=0\.19\.0/);
});
