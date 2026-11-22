// SKYSHIFT 0.10.3: player-confirmed turn direction + live track Hangar regression.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {STINGRAY_EVO,createTailState,tailPoseStep}
 from "../../stingray-evo-v0102.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const input={steering:.91,yawRate:.80,gripIntensity:.90,
 boostMultiplier:1,speed:104,grounded:true};
function run(view,seconds=2,fps=60,st=createTailState()){
 for(let i=0;i<Math.round(seconds*fps);i++)tailPoseStep(st,1/fps,view);
 return st;
}
const total=st=>[...st.yaw].reduce((a,b)=>a+b,0);
test("right and left steering bend all nine articulated links in SAME sign",()=>{
 const right=run(input),left=run({...input,steering:-.91,yawRate:-.80});
 assert.ok(right.yaw.every(v=>v>0),
  "RIGHT steer must visually move articulated +Z tail to ship RIGHT");
 assert.ok(left.yaw.every(v=>v<0),
  "LEFT steer must visually move tail toward ship LEFT");
 assert.ok(total(right)>.16);
 assert.ok(total(left)<-.16);
 assert.ok(right.peakTipDeflectionDegrees>15);
 assert.equal(STINGRAY_EVO.physicsChanged,false);
 assert.equal(STINGRAY_EVO.newDynamicLights,0);
});
test("ordinary turn stays gentler than GRIP, boost straightens, inertia retained",()=>{
 const regular=run({...input,gripIntensity:0});
 const gripped=run(input);
 const boosted=run({...input,boostMultiplier:1.4});
 assert.ok(total(gripped)>total(regular)*1.75);
 assert.ok(total(boosted)<total(gripped)*.67);
 tailPoseStep(gripped,1/60,{...input,steering:0,yawRate:0,gripIntensity:0});
 assert.ok(total(gripped)>.09,"after-swing remains visible on release");
 run({...input,steering:0,yawRate:0,gripIntensity:0},3,60,gripped);
 assert.ok(Math.abs(total(gripped))<.07,"spring settles to neutral");
});
test("same-side animation remains bounded on slow phones and after direction reversal",()=>{
 const right=run(input);
 const reversal=run({...input,steering:-1,yawRate:-1},2,30,right);
 assert.ok(total(reversal)<-.12);
 for(const v of reversal.yaw){
  assert.ok(Number.isFinite(v));
  assert.ok(Math.abs(v)<=STINGRAY_EVO.maxYawJointRadians);
 }
 const paused=total(reversal);
 tailPoseStep(reversal,0,{steering:1,yawRate:1});
 assert.equal(total(reversal),paused);
});
test("0.10.3 returns to the live racing track Hangar without changing pilot physics",()=>{
 const html=read("./index.html"),game=read("./game-v0103.mjs"),
  boot=read("./boot-v0103.js"),css=read("./fleet-v0102.css");
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/stingray-evo-v0103\.mjs/);
 assert.match(game,/world\.visible=true/);
 assert.doesNotMatch(game,/world\.visible=false/);
 assert.match(game,/placeShip\(now\/1000,dt,view,motionState,cinematicState\)/);
 assert.match(game,/ship\.position\.x-6\.5/);
 assert.doesNotMatch(game,/ship\.position\.set\(0,1\.62,0\)/);
 assert.match(game,/trial-v0901\.mjs/);
 assert.match(game,/signature-flight-v091\.mjs/);
 assert.match(game,/tunnel-blackout-v0921\.mjs/);
 assert.match(css,/hangar-active \.topbar/);
 assert.equal(STINGRAY_EVO.segmentCount,9);
 assert.match(read("./game-v0101.mjs"),/version:"0\.10\.1"/);
});
