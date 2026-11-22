// SKYSHIFT 0.10.4 — deterministic shared visual signals and regression guard.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {VELOCITY_PRESENCE,speedPresenceAt,createVelocityPresenceState,
 stepVelocityPresence,velocityPresenceAudit} from "../../velocity-presence-v0104.mjs";
import {trailMotionState} from "../../engine-trails-v0104.mjs";
const source=n=>readFileSync(new URL("../../"+n,import.meta.url),"utf8");
const tick=(st,view,seconds=1)=>{for(let i=0;i<Math.ceil(seconds*120);i++)
 stepVelocityPresence(st,1/120,view);return st;};
test("all nine physical cruise stages progressively energize speed presentation",()=>{
 const levels=Array.from({length:9},(_,i)=>44*1.11**i);
 const signals=levels.map(speedPresenceAt);
 assert.equal(signals[0],0);
 assert.equal(signals[8],1);
 for(let i=1;i<signals.length;i++)assert.ok(signals[i]>signals[i-1]);
 assert.equal(speedPresenceAt(44*1.11**8*1.4),1);
 const states=levels.map(speed=>tick(createVelocityPresenceState(),
  {speed,boostMultiplier:1,grounded:true},3));
 for(let i=1;i<states.length;i++){
  assert.ok(states[i].trackFlow>states[i-1].trackFlow,"track grows at "+i);
  assert.ok(states[i].engineLoad>states[i-1].engineLoad,"engines grow at "+i);
 }
 assert.ok(states[8].trackFlow>.5);
 assert.ok(states[8].engineLoad>.4);
 assert.ok(states[0].trackFlow<.1);
});
test("boost has its own onset and release without resetting cruise intensity",()=>{
 const st=tick(createVelocityPresenceState(),
  {speed:94,boostMultiplier:1,grounded:true},2);
 const before=st.engineLoad;
 tick(st,{speed:94*1.4,boostMultiplier:1.4,grounded:true},1);
 assert.ok(st.surge>.98);
 assert.ok(st.engineLoad>before);
 assert.ok(st.cameraDistance<=VELOCITY_PRESENCE.maxAdditionalCameraDistanceMeters);
 tick(st,{speed:94,boostMultiplier:1,grounded:true},2);
 assert.ok(st.surge<.01);
 assert.ok(st.speed>.75);
});
test("takeoff, flight attitude, trick protection and landing recover without camera discontinuities",()=>{
 const st=createVelocityPresenceState();
 tick(st,{speed:101,grounded:true,verticalSpeed:0},1);
 const prior=st.landings;
 tick(st,{speed:101,grounded:false,verticalSpeed:20,steering:.6},.25);
 assert.equal(st.launches,1);
 assert.ok(st.air>.75);
 assert.ok(st.airPitch>0);
 assert.ok(st.wingDeflection<-.01);
 tick(st,{speed:101,grounded:false,verticalSpeed:-18,steering:-.6},.3);
 assert.ok(st.airPitch<0);
 tick(st,{speed:101,grounded:false,trickActive:true,verticalSpeed:0,steering:1},.4);
 assert.ok(Math.abs(st.airRoll)<.006);
 tick(st,{speed:101,grounded:true,verticalSpeed:0},.1);
 assert.equal(st.landings,prior+1);
 assert.ok(st.landing>0);
 tick(st,{speed:101,grounded:true,verticalSpeed:0},2);
 assert.ok(st.air<.01);
 assert.ok(st.landing<.001);
 assert.ok(st.cameraAirLift<.01);
});
test("animation is FPS robust, finite, bounded and pause-safe",()=>{
 const view={speed:103,boostMultiplier:1.15,grounded:false,verticalSpeed:12,steering:.35};
 const a=createVelocityPresenceState(),b=createVelocityPresenceState();
 for(let i=0;i<120;i++)stepVelocityPresence(a,1/120,view);
 for(let i=0;i<30;i++)stepVelocityPresence(b,1/30,view);
 for(const key of ["speed","surge","air","airPitch","engineLoad","trackFlow",
  "cameraDistance","fovBonus"]){
  assert.ok(Number.isFinite(a[key]));
  assert.ok(Math.abs(a[key]-b[key])<.01,key+" dt error");
 }
 const snapshot=JSON.stringify(a);
 stepVelocityPresence(a,0,{speed:999,grounded:true});
 assert.equal(JSON.stringify(a),snapshot);
 assert.ok(Math.abs(a.hullPitch)<.086);
 assert.ok(a.fovBonus<=1.15);
 assert.ok(a.trackFlow<=1&&a.starFlow<=.68);
 assert.equal(velocityPresenceAudit(a).pilotPhysicsUnchanged,true);
});
test("engine trails no longer saturate in early zones",()=>{
 const low=trailMotionState(44),mid=trailMotionState(75),high=trailMotionState(44*1.11**8);
 assert.ok(mid.length>low.length);
 assert.ok(high.length>mid.length);
 assert.ok(high.opacity>mid.opacity);
 assert.ok(high.length<13);
});
test("production game uses all five passes without changing 120Hz flight physics",()=>{
 const game=source("./game-v0104.mjs");
 const idx=source("./index.html");
 const boot=source("./boot-v0104.js");
 assert.match(game,/stepVelocityPresence\(velocityPresence/);
 assert.match(game,/velocityVanes\?\.frame\(velocityPresence/);
 assert.match(game,/signatureFlight\.pitch\+velocityPresence\.hullPitch/);
 assert.match(game,/velocityPresence\.cameraAirLift/);
 assert.match(game,/velocityPresence\.trackFlow/);
 assert.match(game,/presence:velocityPresence/);
 assert.match(game,/velocityPresenceAudit\(velocityPresence\)/);
 assert.match(idx,/data-game-module="game-v0104\.mjs"/);
 assert.match(boot,/game-v0104\.mjs\?v=0\.10\.4/);
 assert.equal(VELOCITY_PRESENCE.addedPhysicsForces,0);
 assert.match(game,/from "\.\/trial-v0901\.mjs"/);
});
