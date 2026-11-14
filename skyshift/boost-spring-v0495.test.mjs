// SKYSHIFT 0.4.9.5 – Inertial Boost Camera & Speed Punch.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BOOST_CONFIG,BOOST_PADS,initBoostState,stepBoostState} from "./boost-v0494.mjs";
import {TRIAL,newFlightState,stepFlight} from "./trial-v0494.mjs";
import {
 BOOST_SPRING,createBoostSpringState,triggerBoostSpring,stepBoostSpring,
 boostFovTarget,boostFovResponse
} from "./boost-spring-v0495.mjs";
const src=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const close=(a,b,epsilon=1e-7)=>
 assert.ok(Math.abs(a-b)<epsilon,`${a} differs from ${b}`);
function simulate(fps){
 const state=createBoostSpringState(),dt=1/fps,base=44;
 let multiplier=1,peak=0,peakTime=0,last=0;
 triggerBoostSpring(state,base,BOOST_CONFIG.multiplier);
 for(let i=0;i<Math.round(1.2*fps);i++){
  const t=(i+1)*dt,active=t<.92;
  const target=active?BOOST_CONFIG.multiplier:1;
  const tau=active?BOOST_CONFIG.attackSeconds:BOOST_CONFIG.releaseSeconds;
  multiplier+=(target-multiplier)*(1-Math.exp(-dt/tau));
  const lag=stepBoostSpring(state,dt,base*(multiplier-1));
  assert.ok(Number.isFinite(lag)&&lag>=0&&lag<BOOST_SPRING.maxVisualLagMeters);
  if(lag>peak){peak=lag;peakTime=t;}
  if(i===Math.round(.75*fps)-1)last=lag;
 }
 return {peak,peakTime,last,tail:state.lagMeters,activations:state.activations};
}
test("40% boost remains physical, and all five single-use pads remain unchanged",()=>{
 assert.equal(BOOST_CONFIG.multiplier,1.4);
 assert.equal(TRIAL.length,1530);
 assert.equal(BOOST_PADS.length,5);
 assert.equal(TRIAL.maxYawRate,1.24);
 const pad=BOOST_PADS[0];
 const s=initBoostState({s:pad.start+1,lateral:0},44);
 for(let i=0;i<120;i++)stepBoostState(s,1/120,44,true);
 assert.ok(s.peakBoostMultiplier>1.38);
 assert.equal(s.boostActivations,1);
 const flight=newFlightState();
 assert.equal(stepFlight(flight,1/120,{steer:0}).boostActivated,null);
});
test("one acceleration-driven critical-damping pulse peaks 0.12–0.22s then returns smoothly",()=>{
 const s=createBoostSpringState();
 assert.equal(stepBoostSpring(s,1/60,0),0);
 triggerBoostSpring(s,44,1.4);
 assert.equal(s.lagMeters,0,"no instantaneous camera position teleport");
 assert.ok(s.rawVelocityMetersPerSecond>0);
 const r=simulate(120);
 assert.equal(r.activations,1);
 assert.ok(r.peakTime>=.12&&r.peakTime<=.22,`peak at ${r.peakTime}`);
 assert.ok(r.peak>=3.6&&r.peak<=4.8,`peak ${r.peak}`);
 assert.ok(r.last<1.2,`recovery at 0.75s: ${r.last}`);
 assert.ok(r.tail<.2,`tail at 1.2s: ${r.tail}`);
});
test("spring is frame-rate stable from 20 to 120FPS, without abrupt clamps",()=>{
 const results=[20,30,60,120].map(simulate);
 for(const r of results){
  assert.ok(Math.abs(r.peak-results[3].peak)<.18,`fps peak ${r.peak}`);
  assert.ok(Math.abs(r.peakTime-results[3].peakTime)<.04,`fps peak time ${r.peakTime}`);
  assert.ok(Math.abs(r.tail-results[3].tail)<.04,`fps recovery ${r.tail}`);
 }
 const state=createBoostSpringState();
 triggerBoostSpring(state,300,1.4);
 for(let i=0;i<100;i++){
  const lag=stepBoostSpring(state,1/60,40);
  assert.ok(lag<BOOST_SPRING.maxVisualLagMeters);
 }
 assert.ok(state.maxLagMeters<BOOST_SPRING.maxVisualLagMeters,
  "smooth tanh envelope always stays strictly inside the cap");
});
test("FOV has independent boost punch, bounded up to 75 degrees",()=>{
 close(boostFovTarget(70.5,1,1.4),70.5);
 close(boostFovTarget(70.5,1.4,1.4),74.2);
 close(boostFovTarget(74,1.4,1.4),75);
 assert.equal(boostFovResponse(70,74.2),BOOST_SPRING.fovRiseResponse);
 assert.equal(boostFovResponse(74.2,70),BOOST_SPRING.fovFallResponse);
 assert.ok(BOOST_SPRING.fovRiseResponse>BOOST_SPRING.fovFallResponse);
});
test("active page uses independent baseline camera/aim and spring inertia",()=>{
 const page=src("./index.html"),boot=src("./boot-v0495.js"),
  game=src("./game-v0495.mjs");
 assert.match(page,/boot-v0498\.js\?v=0\.4\.9\.8/);
 assert.match(page,/data-game-module="game-v0498\.mjs"/);
 assert.match(boot,/import\("\.\/game-v0495\.mjs\?v=0\.4\.9\.5"\)/);
 assert.match(boot,/__skyshiftBootFail/);
 assert.match(game,/from "\.\/boost-spring-v0495\.mjs"/);
 assert.match(game,/from "\.\/boost-v0494\.mjs"/);
 assert.match(game,/from "\.\/trial-v0494\.mjs"/);
 assert.match(game,/from "\.\/zone-wave-v0493\.mjs"/);
 assert.match(game,/CAMERA_BASE_POSITION\.lerp\(CAMERA_TARGET_POSITION,follow\)/);
 assert.match(game,/cameraLook\.lerp\(CAMERA_TARGET_LOOK,follow\)/);
 assert.match(game,/camera\.position\.copy\(CAMERA_BASE_POSITION\)/);
 assert.match(game,/stepBoostSpring\(boostSpring/);
 assert.match(game,/boostFovTarget\(baseFov,flight\.boostMultiplier/);
 assert.match(game,/triggerBoostSpring\(boostSpring/);
 assert.doesNotMatch(game,/cameraBoostResponse\(/);
 assert.doesNotMatch(game,/capCameraBoostTrail\(/);
 assert.match(game,/version:"0\.4\.9\.5"/);
 assert.match(game,/skyshift-boost-v0495-audit\.json/);
 assert.doesNotMatch(game,/flight\.heading=headingAt\(/);
});
