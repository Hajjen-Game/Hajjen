import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {STINGRAY_EVO,STINGRAY_WING,createTailState,
 resetTailState,tailPoseStep} from "../../stingray-evo-v0101.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const base={steering:.88,yawRate:.84,gripIntensity:.8,
 boostMultiplier:1,speed:100,grounded:true};
function advance(fps,view,seconds=2.3,st=createTailState()){
 for(let i=0;i<Math.round(seconds*fps);i++)
  tailPoseStep(st,1/fps,view);
 return st;
}
const sumYaw=s=>Array.from(s.yaw).reduce((a,b)=>a+b,0);
test("futuristic stingray retains 9 real tail links, no physics changes or lights",()=>{
 assert.equal(STINGRAY_EVO.segmentCount,9);
 assert.ok(STINGRAY_EVO.tailLengthMeters>=6);
 assert.ok(STINGRAY_EVO.maxYawJointRadians>.075);
 assert.equal(STINGRAY_EVO.physicsChanged,false);
 assert.equal(STINGRAY_EVO.newDynamicLights,0);
 assert.ok(STINGRAY_EVO.additionalTailDrawCalls<=20);
 assert.ok(Math.max(...STINGRAY_WING.map(x=>x[0]))>3);
});
test("ordinary steering vs deliberate GRIP produces strongly differentiated silhouette",()=>{
 const normal=advance(60,{...base,gripIntensity:0});
 const grip=advance(60,base);
 assert.ok(sumYaw(grip)<-.14,"right steering pulls tail to the opposite side");
 assert.ok(Math.abs(sumYaw(grip))>Math.abs(sumYaw(normal))*1.75);
 assert.ok(grip.peakTipDeflectionDegrees>15,
  "articulated cumulative silhouette visibly bends");
 assert.ok(grip.peakGrip>.75);
});
test("tail releases with delayed physical after-swing, not hard snapped to neutral",()=>{
 const st=advance(60,{...base,gripIntensity:1});
 const loaded=sumYaw(st);
 tailPoseStep(st,1/60,{...base,steering:0,yawRate:0,gripIntensity:0});
 const released=sumYaw(st);
 assert.ok(Math.abs(released)>.1,"first release frame preserves momentum");
 assert.ok(Math.sign(released)===Math.sign(loaded));
 advance(60,{...base,steering:0,yawRate:0,gripIntensity:0},3,st);
 assert.ok(Math.abs(sumYaw(st))<Math.abs(released)*.55,
  "tail settles instead of remaining permanently bent");
 assert.ok(st.peakVelocity>.001);
});
test("boost straightens a loaded tail and air transitions ripple down the spine",()=>{
 const cruise=advance(120,base);
 const boosted=advance(120,{...base,boostMultiplier:1.4});
 assert.ok(Math.abs(sumYaw(boosted))<Math.abs(sumYaw(cruise))*.67);
 const st=createTailState();
 tailPoseStep(st,1/60,{...base,grounded:true});
 tailPoseStep(st,1/60,{...base,grounded:false});
 assert.equal(st.launches,1);
 advance(60,{...base,grounded:false},1.1,st);
 assert.ok(Math.abs(st.pitch[0]-st.pitch[8])>.001);
 tailPoseStep(st,1/60,{...base,grounded:true});
 assert.equal(st.landings,1);
});
test("30/60/120 fps animation stays close, capped and freezes at dt=0",()=>{
 const a=advance(30,base),b=advance(60,base),c=advance(120,base);
 for(let i=0;i<STINGRAY_EVO.segmentCount;i++){
  assert.ok(Math.abs(a.yaw[i]-b.yaw[i])<.006,"yaw 30/60 "+i);
  assert.ok(Math.abs(b.yaw[i]-c.yaw[i])<.006,"yaw 60/120 "+i);
  assert.ok(Math.abs(c.yaw[i])<=STINGRAY_EVO.maxYawJointRadians);
  assert.ok(Math.abs(c.pitch[i])<=STINGRAY_EVO.maxPitchJointRadians);
 }
 const snapshot=JSON.stringify([...a.yaw,...a.pitch]);
 tailPoseStep(a,0,{steering:-1,gripIntensity:1});
 assert.equal(JSON.stringify([...a.yaw,...a.pitch]),snapshot);
 resetTailState(a);
 assert.ok(a.yaw.every(x=>x===0)&&a.yawVelocity.every(x=>x===0));
});
test("archived 0.10.1 showroom remains intact while 0.10.3 is active",()=>{
 const html=read("./index.html"),boot=read("./boot-v0101.js"),
  game=read("./game-v0101.mjs"),css=read("./fleet-v0101.css");
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(boot,/game-v0101\.mjs\?v=0\.10\.1/);
 assert.match(game,/version:"0\.10\.1"/);
 assert.match(game,/stingray-evo-v0101\.mjs/);
 assert.match(game,/world\.visible=false/);
 assert.match(game,/world\.visible=true/);
 assert.match(game,/ship\.position\.set\(0,1\.62,0\)/);
 assert.match(game,/skyshift-stingray-kinetic-v0101-audit/);
 assert.match(game,/trial-v0901\.mjs/);
 assert.match(game,/tunnel-blackout-v0921\.mjs/);
 assert.match(css,/#app\.hangar-active \.topbar/);
 assert.match(read("./legacy/game/game-v010.mjs"),/version:"0\.10\.0"/);
});
