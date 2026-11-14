// SKYSHIFT 0.4.9.6 — speed-dependent ship, road and rail visual regression.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {VELOCITY_SPEC,createVelocityState,igniteVelocity,stepVelocityState}
 from "./velocity-language-v0496.mjs";
import {ENGINE_TRAIL_SPEC,trailMotionState} from "./engine-trails-v0496.mjs";
import {BOOST_CONFIG,BOOST_PADS} from "./boost-v0494.mjs";
import {TRIAL} from "./trial-v0494.mjs";
import {patchPremiumShaders,PREMIUM_TRACK,GLSL_BOOST_PADS}
 from "./premium-track-v0496.mjs";
import {patchRailShaders} from "./aero-barrier-v0496.mjs";
const src=f=>readFileSync(new URL(f,import.meta.url),"utf8");
const close=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
function run(fps=60,seconds=1.4){
 const state=createVelocityState(),h=1/fps;
 igniteVelocity(state);
 let multiplier=1;
 for(let i=0;i<Math.round(seconds*fps);i++){
  const active=(i+1)*h<.92,rate=active?.15:.23;
  multiplier+=((active?1.4:1)-multiplier)*(1-Math.exp(-h/rate));
  stepVelocityState(state,h,44*multiplier,44,multiplier);
 }
 return state;
}
test("unchanged +40% five-pad boost powers the new shared visuals",()=>{
 assert.equal(BOOST_CONFIG.multiplier,1.4);
 assert.equal(VELOCITY_SPEC.physicalBoostMultiplier,1.4);
 assert.equal(TRIAL.length,1530);
 assert.equal(BOOST_PADS.length,5);
 assert.equal(ENGINE_TRAIL_SPEC.boostMultiplier,1.4);
 assert.equal(ENGINE_TRAIL_SPEC.emitters,2);
 assert.equal(ENGINE_TRAIL_SPEC.layersPerEmitter,2);
 assert.equal(ENGINE_TRAIL_SPEC.segmentsPerEmitter,4);
 assert.equal(ENGINE_TRAIL_SPEC.extraDrawCalls,0);
 assert.equal(ENGINE_TRAIL_SPEC.newParticles,0);
 assert.equal(VELOCITY_SPEC.extraDrawCalls,0);
 assert.equal(GLSL_BOOST_PADS.length,BOOST_PADS.length);
});
test("short ignition recoil, pitch and world velocity are bounded and decay",()=>{
 const s=createVelocityState();
 stepVelocityState(s,1/60,44,44,1);
 assert.equal(s.flow,0);
 assert.equal(s.worldFlow,0);
 igniteVelocity(s);
 assert.equal(s.activations,1);
 assert.equal(s.recoilMeters,0,"no position snap on physical pad contact");
 const first=stepVelocityState(s,1/60,45,44,1.02);
 assert.ok(first.ignition>0);
 assert.ok(first.recoilMeters>.12&&first.recoilMeters<.27);
 assert.ok(Math.abs(first.pitchRadians)<.028);
 assert.ok(first.worldFlow>0);
 const last=run();
 assert.equal(last.activations,1);
 assert.ok(last.peakWorldFlow>.78&&last.peakWorldFlow<=1);
 assert.ok(last.peakEngineFlow>.8&&last.peakEngineFlow<=1);
 assert.ok(last.peakRecoilMeters>.1&&last.peakRecoilMeters<=.26);
 assert.ok(last.peakPitchDegrees<1.7);
 assert.ok(last.worldFlow<.5,"release returns to base visuals");
});
test("world shader phase preserves time continuity across render frame rates",()=>{
 const results=[20,30,60,120].map(fps=>run(fps));
 for(const s of results){
  assert.ok(Math.abs(s.peakWorldFlow-results[3].peakWorldFlow)<.10);
  assert.ok(Math.abs(s.peakRecoilMeters-results[3].peakRecoilMeters)<.05);
  assert.ok(Math.abs(s.flowPhaseMeters-results[3].flowPhaseMeters)<1.5);
 }
 const idle=createVelocityState();
 for(let i=0;i<120;i++)stepVelocityState(idle,1/120,44,44,1);
 close(idle.flowPhaseMeters,44);
 close(idle.worldFlow,0);
});
test("twin thrusters respond to 40% with longer chromatic and white-hot layers",()=>{
 const base=trailMotionState(44,1,.1,0,0);
 const third=trailMotionState(57.2,1.3,.1,0,.15,
  {engineFlow:.75,ignition:.25});
 const boost=trailMotionState(61.6,1.4,.1,0,.25,
  {engineFlow:1,ignition:.4});
 assert.ok(boost.length>third.length);
 assert.ok(boost.length>base.length+5);
 assert.ok(boost.length<=ENGINE_TRAIL_SPEC.maxBoostLengthMeters);
 assert.ok(boost.opacity>base.opacity+.20);
 assert.ok(third.boosted<1);
 close(boost.boosted,1);
 assert.match(src("./engine-trails-v0496.mjs"),/p\.inner\?/);
 assert.match(src("./engine-trails-v0496.mjs"),/new THREE\.Mesh\(geometry,material\)/);
});
test("road and rail velocity uniforms share spatial phase, retain spectral wave",()=>{
 const roadShader={
  vertex:"#include <common>\n#include <begin_vertex>",
  fragment:"#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>"
 };
 const road=patchPremiumShaders(roadShader.vertex,roadShader.fragment);
 const rail=patchRailShaders(roadShader.vertex,roadShader.fragment);
 for(const generated of [road.fragmentShader,rail.fragmentShader]){
  assert.match(generated,/uniform float uSpeedFlow;/);
  assert.match(generated,/uniform float uVelocityPhase;/);
  assert.match(generated,/spectralWhiteCore/);
  assert.match(generated,/vTrackCoord|vRailCoord/);
 }
 assert.match(road.fragmentShader,/velocityGlint/);
 assert.match(road.fragmentShader,/totalEmissiveRadiance \+=/);
 assert.match(rail.fragmentShader,/velocityRailPulse/);
 assert.ok(PREMIUM_TRACK.velocityReactiveGuides);
 for(const name of ["premium-track-v0496.mjs","aero-barrier-v0496.mjs"]){
  assert.match(src("./"+name),/setVelocityFlow\(intensity,phaseMeters\)/);
  assert.match(src("./"+name),/uVelocityPhase\.value=phaseMeters/);
 }
 assert.doesNotMatch(src("./premium-track-v0496.mjs"),/new THREE\.Mesh\(.*speed/i);
});
test("0.4.9.6 active browser, physics/camera integration, HUD and audit",()=>{
 const page=src("./index.html"),boot=src("./boot-v0496.js"),
  game=src("./game-v0496.mjs");
 assert.match(page,/boot-v0497\.js\?v=0\.4\.9\.7/);
 assert.match(page,/data-game-module="game-v0497\.mjs"/);
 assert.match(boot,/import\("\.\/game-v0496\.mjs\?v=0\.4\.9\.6"\)/);
 assert.match(boot,/__skyshiftBootFail/);
 for(const dep of ["engine-trails-v0496","premium-track-v0496",
  "aero-barrier-v0496","space-v0496","velocity-language-v0496",
  "boost-spring-v0495","boost-v0494","trial-v0494","zone-wave-v0493"])
  assert.match(game,new RegExp('from "\\./'+dep+'\\.mjs"'),dep);
 assert.match(game,/igniteVelocity\(velocityState\)/);
 assert.match(game,/stepVelocityState\(velocityState/);
 assert.match(game,/premiumSurface\?\.setVelocityFlow/);
 assert.match(game,/identitySurface\?\.setVelocityFlow/);
 assert.match(game,/spaceBackdrop\?\.setVelocityFlow/);
 assert.match(game,/velocity:velocityState/);
 assert.match(game,/camera\.position\.copy\(CAMERA_BASE_POSITION\)/);
 assert.match(game,/version:"0\.4\.9\.6"/);
 assert.match(game,/skyshift-velocity-v0496-audit\.json/);
 assert.match(game,/velocityLanguage:\{/);
 assert.doesNotMatch(game,/flight\.heading=headingAt\(/);
});
