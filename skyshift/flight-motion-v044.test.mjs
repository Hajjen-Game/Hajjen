// SKYSHIFT 0.4.4 — motion feel, handling regression and active-page integration.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 MOTION_DEFAULTS,dampedSpring,followAngle,
 createFlightMotionState,stepFlightMotion
} from "./flight-motion-v044.mjs";
import {
 TRIAL,newFlightState,stepFlight,positionAt,clamp
} from "./trial-v043.mjs";
import {
 capturePose,interpolatePose,createFrameClock,advanceFrame
} from "./frame-pacing-v044.mjs";
const source=name=>readFileSync(new URL(name,import.meta.url),"utf8");
const pose=(changes={})=>({steering:0,trackBank:0,yawRate:0,sideVelocity:0,
 heading:0,vy:0,...changes});
function runMotion(target,seconds=1,rate=60,state=createFlightMotionState()){
 for(let i=0;i<seconds*rate;i++)
  stepFlightMotion(state,target,1/rate,i/rate);
 return state;
}
test("pilot produces readable bank on FLAT track independent of road banking",()=>{
 const right=runMotion(pose({steering:.65}),.7);
 const left=runMotion(pose({steering:-.65}),.7);
 assert.ok(right.roll < -10*Math.PI/180);
 assert.ok(left.roll > 10*Math.PI/180);
 assert.ok(Math.abs(right.roll)<.59);
 assert.ok(Math.abs(left.roll)<.59);
 assert.ok(right.maxVisualBankDegrees>10);
});
test("road banking adds to pilot input but cannot exceed stable visual bounds",()=>{
 const state=runMotion(pose({steering:1,trackBank:.384}),1);
 assert.ok(Math.abs(state.roll)<=.58+1e-7);
 assert.ok(Number.isFinite(state.rollVelocity));
 assert.ok(MOTION_DEFAULTS.pilotBankDegrees>=15);
});
test("release recovers smoothly without oscillatory rolling or changing heading",()=>{
 const state=runMotion(pose({steering:1}),.65);
 const initial=Math.abs(state.roll);
 const release=pose({steering:0});
 let last=initial;
 for(let i=0;i<100;i++){
  stepFlightMotion(state,release,1/120,.65+i/120);
  assert.ok(Math.abs(state.roll)<last+1e-8,"no sign-flip wobble on release");
  last=Math.abs(state.roll);
 }
 assert.ok(last<initial*.08);
 assert.equal(state.cameraHeading,0);
});
test("critical damping is frame rate invariant for constant targets",()=>{
 const samples=[20,30,60,120].map(fps=>{
  let x=0,v=0;
  for(let i=0;i<fps;i++){
   const result=dampedSpring(x,v,1,12,1/fps);
   x=result.position;v=result.velocity;
  }
  return x;
 });
 for(const x of samples)assert.ok(Math.abs(x-samples[0])<1e-9);
 for(const delta of [.008,.016,.033,.05,.1]){
  const value=dampedSpring(0,0,.8,20,delta);
  assert.ok(Number.isFinite(value.position)&&Number.isFinite(value.velocity));
  assert.ok(value.position>=0&&value.position<=.8);
 }
});
test("hover remains subtle and pitch follows turn load rather than bouncing",()=>{
 const state=runMotion(pose({steering:.8,yawRate:.9,sideVelocity:12}),1);
 assert.ok(state.hover<=MOTION_DEFAULTS.hoverTravelMeters);
 assert.ok(state.hover>=-MOTION_DEFAULTS.hoverTravelMeters);
 assert.ok(state.maxHoverMeters>0);
 assert.ok(state.pitch<0);
 assert.ok(state.maxVisualPitchDegrees<8.1);
 const neutral=runMotion(pose(),1,60,state);
 assert.ok(Math.abs(neutral.pitch)<.02);
});
test("camera yaw takes shortest path at wrap and horizon roll is restrained",()=>{
 const a=followAngle(3.12,-3.12,10,1/60);
 assert.ok(a>3.12&&a<3.2);
 const motion=runMotion(pose({heading:1,steering:1}),1);
 assert.ok(motion.cameraHeading>.8&&motion.cameraHeading<1);
 assert.ok(Math.abs(motion.cameraRoll)<=.04);
});
test("new frame interpolation carries yaw and lateral speeds at fixed physics rate",()=>{
 const first={worldX:0,worldZ:0,y:1,heading:0,s:1,lateral:0,
  steering:.1,vy:0,yawRate:.1,sideVelocity:0,grounded:true};
 const second={...first,worldX:1,heading:.2,
  steering:.5,yawRate:.5,sideVelocity:12};
 const mid=interpolatePose(first,second,.5);
 assert.ok(Math.abs(mid.yawRate-.3)<1e-8);
 assert.equal(mid.sideVelocity,6);
 const clock=createFrameClock();let fixed=0;
 for(let i=0;i<60;i++)advanceFrame(clock,1/60,dt=>{fixed++;});
 assert.equal(fixed,120);
 const live=capturePose(newFlightState());
 assert.ok(Number.isFinite(live.yawRate));
 assert.ok(Number.isFinite(live.sideVelocity));
});
test("0.4.3 pilot-owned steering and double-speed track remain unchanged",()=>{
 assert.equal(TRIAL.startSpeed,44);
 assert.equal(TRIAL.endSpeed,47);
 assert.equal(TRIAL.maxYawRate,1.24);
 assert.equal(TRIAL.length,510);
 const target=positionAt(55,0,0);
 const state=newFlightState(),beforeX=state.worldX;
 for(let i=0;i<30;i++)stepFlight(state,1/120,{steer:.5});
 assert.notEqual(state.worldX,beforeX);
 assert.ok(state.heading>0);
 assert.ok(state.steering>0);
 assert.equal(typeof target.x,"number");
 assert.ok(clamp(state.lateral,-12,12)===state.lateral);
});
test("active game uses interpolated 0.4.4 motion, independent camera and audit",()=>{
 const game=source("game-v044.mjs");
 const html=source("index.html");
 assert.match(game,/from "\.\/flight-motion-v044\.mjs"/);
 assert.match(game,/from "\.\/frame-pacing-v044\.mjs"/);
 assert.match(game,/from "\.\/trial-v043\.mjs"/);
 assert.match(game,/stepFlightMotion\(motionState,/);
 assert.match(game,/ship\.rotation\.z=motion\.roll/);
 assert.match(game,/ship\.rotation\.x=motion\.pitch/);
 assert.match(game,/motion\.cameraHeading/);
 assert.match(game,/\?flightlab=1/);
 assert.match(game,/version:"0\.4\.4"/);
 assert.match(game,/skyshift-flight-v044-audit\.json/);
 assert.match(html,/game-v045\.mjs\?v=0\.4\.5/);
 assert.match(html,/style-v043\.css\?v=0\.4\.5/);
 assert.doesNotMatch(game,/headingAt\(view\.s\)/);
});
