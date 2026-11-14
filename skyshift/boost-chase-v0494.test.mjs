// SKYSHIFT 0.4.9.4 — +40% physical boost and camera follow inertia.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BOOST_CONFIG,BOOST_PADS,stepBoostState,initBoostState} from "./boost-v0494.mjs";
import {BOOST_CONFIG as OLD_BOOST} from "./boost-v049.mjs";
import {TRIAL,newFlightState,stepFlight} from "./trial-v0494.mjs";
import {TRIAL as OLD_TRIAL} from "./trial-v049.mjs";
import {BOOST_CHASE,createBoostChaseState,onBoostChase,cameraBoostResponse,
 capCameraBoostTrail} from "./boost-chase-v0494.mjs";
const src=f=>readFileSync(new URL(f,import.meta.url),"utf8");
test("all five original pads give an actual 40% physical speed target",()=>{
 assert.equal(BOOST_CONFIG.multiplier,1.4);
 assert.equal(OLD_BOOST.multiplier,1.3);
 assert.equal(BOOST_PADS.length,5);
 assert.equal(BOOST_CONFIG.durationSeconds,.92);
 assert.equal(BOOST_CONFIG.attackSeconds,.15);
 assert.equal(TRIAL.length,1530);
 assert.equal(TRIAL.maxYawRate,OLD_TRIAL.maxYawRate);
 assert.equal(TRIAL.startSpeed,OLD_TRIAL.startSpeed);
 for(const pad of BOOST_PADS){
  const f=initBoostState({s:pad.start+1,lateral:0,grounded:true},44);
  let activations=0,max=0;
  for(let i=0;i<115;i++){
   if(stepBoostState(f,1/120,44,true))activations++;
   max=Math.max(max,f.boostMultiplier);
  }
  assert.equal(activations,1,pad.id);
  assert.ok(max>1.38,"not reaching 40% peak");
  assert.equal(f.boostActivatedIds[0],pad.id);
 }
 const baseline=newFlightState();
 assert.equal(baseline.boostMultiplier,1);
 const forward=stepFlight(baseline,1/120,{steer:0});
 assert.equal(forward.boostActivated,null);
});
test("boost camera gives a lag phase, catch-up phase, and full recovery",()=>{
 const s=createBoostChaseState();
 assert.equal(cameraBoostResponse(s,1/60,10.4),10.4);
 onBoostChase(s);
 assert.equal(s.activations,1);
 let first=[];
 for(let i=0;i<90;i++)first.push(cameraBoostResponse(s,1/60,10.4));
 assert.ok(first.slice(0,20).every(v=>v===BOOST_CHASE.lagResponse));
 assert.ok(first.some(v=>v===BOOST_CHASE.recoveryResponse));
 assert.equal(first.at(-1),10.4);
 assert.equal(s.lagRemaining,0);
 assert.equal(s.recoveryRemaining,0);
 assert.ok(BOOST_CHASE.maxTrailingMeters<=10);
});
test("camera lag has a capped FORWARD separation, not a steering correction",()=>{
 const s=createBoostChaseState();
 const camera={x:4,y:8,z:5};
 const target={x:4,y:8,z:-20};
 capCameraBoostTrail(camera,target,0,s);
 assert.equal(camera.x,4);
 assert.equal(camera.y,8);
 assert.ok(Math.abs(camera.z-(-10))<1e-9);
 assert.equal(s.maxTrailingMeters,10);
 const side={x:3,y:9,z:1};
 capCameraBoostTrail(side,{x:22,y:9,z:1},Math.PI/2,s);
 assert.ok(Math.abs(side.x-12)<1e-9);
 assert.equal(side.y,9);
 assert.ok(Math.abs(side.z-1)<1e-9);
});
test("live page and game use new boost, camera, and resilient mobile bootstrap",()=>{
 const html=src("./index.html"),boot=src("./boot-v0494.js");
 const game=src("./game-v0494.mjs");
 assert.match(html,/boot-v0496\.js\?v=0\.4\.9\.6/);
 assert.match(html,/data-game-module="game-v0496\.mjs"/);
 assert.match(boot,/import\("\.\/game-v0494\.mjs\?v=0\.4\.9\.4"\)/);
 assert.match(boot,/__skyshiftBootFail/);
 assert.match(game,/from "\.\/boost-v0494\.mjs"/);
 assert.match(game,/from "\.\/trial-v0494\.mjs"/);
 assert.match(game,/from "\.\/boost-chase-v0494\.mjs"/);
 assert.match(game,/onBoostChase\(boostChase\)/);
 assert.match(game,/cameraBoostResponse\(boostChase/);
 assert.match(game,/capCameraBoostTrail\(camera\.position/);
 assert.match(game,/BOOST ENGAGED · \+40% SPEED/);
 assert.match(game,/version:"0\.4\.9\.4"/);
 assert.match(game,/skyshift-boost-v0494-audit\.json/);
 assert.match(game,/from "\.\/zone-wave-v0493\.mjs"/);
 assert.doesNotMatch(game,/flight\.heading=headingAt\(/);
});
