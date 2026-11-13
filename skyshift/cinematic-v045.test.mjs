// SKYSHIFT 0.4.5 — cinematic camera, gentle nose/engine weight, no steering assist.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 CINEMATIC_DEFAULTS,createCinematicState,turnPreview,headingDelta,
 stepCinematic,chasePose,cinematicFov,engineLightFactor
} from "./cinematic-v045.mjs";
import {createFlightMotionState} from "./flight-motion-v044.mjs";
import {
 TRIAL,headingAt,positionAt,newFlightState,stepFlight
} from "./trial-v043.mjs";
const source=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const pose=(more={})=>({worldX:12,worldZ:-80,y:1,
 steering:0,yawRate:0,heading:0,clearance:0,...more});
function advance(state,view,preview,seconds=1,fps=60){
 for(let i=0;i<Math.round(seconds*fps);i++)
  stepCinematic(state,view,preview,1/fps);
 return state;
}
test("new camera is visibly LOWER and CLOSER than 0.4.4",()=>{
 assert.ok(CINEMATIC_DEFAULTS.cameraDistance<15.2);
 assert.ok(CINEMATIC_DEFAULTS.cameraHeight<9.5);
 assert.ok(CINEMATIC_DEFAULTS.cameraHeight>6);
 assert.ok(CINEMATIC_DEFAULTS.cameraLookAhead>=30);
 const motion=createFlightMotionState(0),cinematic=createCinematicState();
 const result=chasePose(pose(),motion,cinematic);
 assert.ok(result.y<pose().y+9.5);
 assert.ok(Math.abs(result.z-pose().worldZ)<15.2);
});
test("camera previews upcoming turn before ship reaches curvature",()=>{
 const future=headingAt(90+40),current=headingAt(90);
 const preview=turnPreview(current,future);
 assert.ok(Math.abs(preview)>.01);
 assert.ok(Math.abs(preview)<=CINEMATIC_DEFAULTS.previewMaximum);
 assert.equal(turnPreview(headingAt(30),headingAt(50)),0);
 const state=advance(createCinematicState(),pose(),preview,.5);
 assert.ok(Math.abs(state.preview)>0.01);
 assert.ok(state.maxPreviewDegrees>0);
});
test("preview biases ONLY camera look target, never camera position",()=>{
 const view=pose({worldX:101,worldZ:-142,steering:.3});
 const motion=createFlightMotionState(.4),state=createCinematicState();
 const noPreview=chasePose(view,motion,state);
 const withPreview=chasePose(view,motion,{...state,preview:.1});
 for(const axis of ["x","y","z"])
  assert.equal(withPreview[axis],noPreview[axis]);
 assert.ok(Math.abs(withPreview.lookX-noPreview.lookX)>2);
 // Camera always follows the independently steered world X position.
 const moved=chasePose({...view,worldX:110},motion,state);
 assert.equal(moved.x-noPreview.x,9);
});
test("angle wrap stays continuous and preview hard clamps",()=>{
 const wrap=headingDelta(3.13,-3.13);
 assert.ok(wrap>0&&wrap<.04);
 assert.ok(Math.abs(turnPreview(0,Math.PI/2))<=.12);
 assert.ok(Math.abs(turnPreview(0,-Math.PI/2))<=.12);
});
test("nose pose stays within two degrees, engine weight bounded",()=>{
 const state=advance(createCinematicState(),pose({steering:1,yawRate:1.24}),.1,1);
 assert.ok(state.noseYaw<0);
 assert.ok(Math.abs(state.noseYaw)<=1.9*Math.PI/180+1e-9);
 assert.ok(state.engineEnergy>.5&&state.engineEnergy<=1);
 assert.ok(engineLightFactor(state)<=1.12);
 const max=state.engineEnergy;
 advance(state,pose(),0,1);
 assert.ok(state.engineEnergy<max,"engine responds to neutral input");
});
test("camera/engine dynamics remain consistent at 20,30,60,120fps",()=>{
 const samples=[20,30,60,120].map(fps=>
  advance(createCinematicState(),pose({steering:-.45,yawRate:-.7}),.09,1,fps));
 for(const s of samples){
  assert.ok(Math.abs(s.preview-samples[0].preview)<1e-9);
  assert.ok(Math.abs(s.noseYaw-samples[0].noseYaw)<1e-9);
  assert.ok(Math.abs(s.engineEnergy-samples[0].engineEnergy)<1e-9);
 }
});
test("cinematic FOV stays moderate at existing double speed",()=>{
 assert.equal(TRIAL.startSpeed,44);
 assert.equal(TRIAL.endSpeed,47);
 assert.ok(cinematicFov(44,44)>64&&cinematicFov(44,44)<67);
 assert.ok(cinematicFov(47,44)<=70.5);
 assert.ok(cinematicFov(250,44)<=70.5);
});
test("pilot heading/road collision are still authoritative and unchanged",()=>{
 const f=newFlightState();
 const p=positionAt(50,0);
 for(let i=0;i<120;i++)stepFlight(f,1/120,{steer:.3});
 assert.notEqual(f.worldX,p.x);
 assert.ok(f.heading>0);
 assert.ok(f.steering>0);
 assert.ok(Number.isFinite(f.lateral));
 assert.equal(TRIAL.maxYawRate,1.24);
});
test("active 0.4.5 page wires cinematic preview and reused engine visuals",()=>{
 const game=source("game-v045.mjs");
 const fx=source("premium-v045.mjs");
 const html=source("index.html");
 assert.match(html,/game-v048\.mjs\?v=0\.4\.8/);
 assert.match(html,/style-v043\.css\?v=0\.4\.8/);
 assert.match(game,/from "\.\/cinematic-v045\.mjs"/);
 assert.match(game,/from "\.\/premium-v045\.mjs"/);
 assert.match(game,/turnPreview\(headingAt\(view\.s\),headingAt\(upcoming\)/);
 assert.match(game,/camera\.position\.lerp\(CAMERA_TARGET_POSITION,follow\)/);
 assert.match(game,/ship\.rotation\.y=-view\.heading\+cinematic\.noseYaw/);
 assert.match(game,/engineLightFactor\(cinematic\)/);
 assert.match(game,/skyshift-flight-v045-audit\.json/);
 assert.match(game,/version:"0\.4\.5"/);
 assert.doesNotMatch(game,/flight\.heading=headingAt\(/);
 assert.doesNotMatch(game,/flight\.worldX=positionAt\(/);
 assert.match(fx,/trailBound\.center\.copy\(ship\.position\)/);
 assert.match(fx,/motionWeight\?\.engineEnergy/);
});
