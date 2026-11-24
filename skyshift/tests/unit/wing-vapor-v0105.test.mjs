// SKYSHIFT 0.10.5 — wing-pressure optics, independent of flight physics.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {speedPresenceAt} from "../../velocity-presence-v0104.mjs";
import {MANTA_WING_OUTLINE} from "../../manta-blade-v0484.mjs";
import {STINGRAY_WING} from "../../stingray-evo-v0104.mjs";
import {
 WING_VAPOR,trailingWingZ,vaporWingAnchors,
 wingVaporEnvelope
} from "../../wing-vapor-v0105.mjs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const speed=stage=>44*1.11**stage;
test("each wing vapor attaches to its actual outer-to-inner trailing edge",()=>{
 for(const [variant,outline] of [["manta",MANTA_WING_OUTLINE],
  ["stingray",STINGRAY_WING]]){
  const a=vaporWingAnchors(variant);
  assert.equal(a.length,7);
  for(let i=0;i<a.length;i++){
   assert.ok(a[i].x>0&&a[i].x<3.3);
   assert.ok(Math.abs(a[i].z-trailingWingZ(outline,a[i].x)-.07)<1e-8);
   if(i)assert.ok(a[i].x>a[i-1].x);
  }
 }
 assert.equal(trailingWingZ(MANTA_WING_OUTLINE,77),null);
});
test("speed zones 1–9 gradually introduce white streaks from both wings",()=>{
 const env=Array.from({length:9},(_,stage)=>wingVaporEnvelope(speed(stage)));
 assert.equal(env[0].count,0,"zero trails at ordinary launch speed");
 assert.deepEqual(env.map(x=>x.count),[0,1,2,3,4,5,6,7,7]);
 for(let i=1;i<9;i++){
  assert.ok(env[i].length>env[i-1].length);
  assert.ok(env[i].opacity>env[i-1].opacity);
  assert.ok(env[i].pressure>env[i-1].pressure);
  assert.ok(env[i].stages>=env[i-1].stages);
 }
 assert.equal(speedPresenceAt(speed(8)),1);
 assert.ok(env[8].length<=WING_VAPOR.maxLengthMeters);
});
test("airborne and real 40 percent boost add pressure without changing speed",()=>{
 const baseline=wingVaporEnvelope(speed(5),1,true,false);
 const airborne=wingVaporEnvelope(speed(5),1,false,false);
 const boost=wingVaporEnvelope(speed(5),1.4,true,false);
 const combined=wingVaporEnvelope(speed(5),1.4,false,false);
 assert.ok(airborne.length>baseline.length);
 assert.ok(airborne.opacity>baseline.opacity);
 assert.ok(boost.opacity>baseline.opacity);
 assert.ok(boost.length>baseline.length);
 assert.ok(combined.opacity>boost.opacity);
 assert.ok(combined.length>boost.length);
 assert.ok(combined.length<=10.8);
 assert.ok(airborne.airborne&&!baseline.airborne);
});
test("low memory restricts strand count and avoids extra GPU passes",()=>{
 const high=wingVaporEnvelope(speed(8),1.4,false,false);
 const low=wingVaporEnvelope(speed(8),1.4,false,true);
 assert.equal(high.count,7);
 assert.equal(low.count,4);
 assert.equal(WING_VAPOR.maxAdditionalDrawCalls,1);
 assert.equal(WING_VAPOR.addedLights,0);
 assert.equal(WING_VAPOR.addedParticles,0);
 assert.equal(WING_VAPOR.addedPostPasses,0);
 assert.equal(WING_VAPOR.physicsChanged,false);
 for(const speed of [0,44,88,120,1000]){
  const v=wingVaporEnvelope(speed);
  for(const key of ["fraction","length","opacity","pressure","count"])
   assert.ok(Number.isFinite(v[key]),key);
  assert.ok(v.length<=10.8&&v.count<=7);
 }
});
test("the live 0.10.5 build mounts production wing FX, reset and audit",()=>{
 const game=read("./legacy/game/game-v0105.mjs");
 const page=read("./index.html");
 const boot=read("./legacy/boot/boot-v0105.js");
 assert.match(game,/createWingVaporFX\(THREE,ship,\{variant:id/);
 assert.match(game,/wingVapor\?\.dispose\(\)/);
 assert.match(game,/wingVapor\?\.reset\(\)/);
 assert.match(game,/wingVapor\?\.frame\(presentationDt/);
 assert.match(game,/wingVapor:\{\.\.\.WING_VAPOR,/);
 assert.match(game,/installVaporSmokeHook\(\)/);
 assert.match(game,/trial-v0901\.mjs/);
 assert.match(game,/velocity-presence-v0104\.mjs/);
 assert.match(page,/data-game-module="game-v0105\.mjs"/);
 assert.match(boot,/game-v0105\.mjs\?v=0\.10\.5/);
});
