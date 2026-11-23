// SKYSHIFT 0.10.3 — premium hull details and genuinely living idle tail.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {STINGRAY_EVO,createTailState,tailPoseStep}
 from "../../stingray-evo-v0103.mjs";
import {SHIP_POLISH,buildShipPolish} from "../../ships/ship-polish-v0103.mjs";
import {MANTA_POLISH,buildPremiumMantaBlade}
 from "../../ships/manta-blade-v0103.mjs";
import {ENGINE_SOCKETS} from "../../manta-blade-v0484.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
function sample(fps,view,seconds=6){
 const st=createTailState(),track=[];
 for(let k=0;k<Math.round(seconds*fps);k++){
  tailPoseStep(st,1/fps,view);
  if(k%Math.max(1,Math.round(fps/4))===0)track.push(st.tipX);
 }
 return {st,track};
}
const idle={steering:0,yawRate:0,gripIntensity:0,grounded:true,
 boostMultiplier:1,speed:112};
test("Stingray tail visibly travels in straight-line idle at real speeds",()=>{
 const a=sample(60,idle),slow=sample(60,{...idle,speed:44});
 assert.ok(a.st.neutralSamples>=350);
 assert.ok(a.st.peakIdleTipMeters>.10,
  "neutral tail tip must move visibly, not freeze at centerline");
 assert.ok(a.st.peakIdleTipMeters<.9,
  "neutral tail is restrained, never a distracting snake");
 assert.ok(a.st.peakIdleTipMeters>slow.st.peakIdleTipMeters*1.15);
 assert.ok(Math.max(...a.track)-Math.min(...a.track)>.17,
  "tip should sway both sides during sustained straight flight");
 assert.equal(STINGRAY_EVO.physicsChanged,false);
 assert.equal(STINGRAY_EVO.newDynamicLights,0);
});
test("GRIP still steers tail in correct direction and boost stiffens it",()=>{
 const input={...idle,speed:100,steering:.91,yawRate:.83,gripIntensity:.9};
 const right=sample(60,input),left=sample(60,{...input,steering:-.91,yawRate:-.83});
 const noGrip=sample(60,{...input,gripIntensity:0});
 const boost=sample(60,{...input,boostMultiplier:1.4});
 const sum=st=>[...st.yaw].reduce((x,y)=>x+y,0);
 assert.ok(sum(right.st)>.16 && sum(left.st)<-.16);
 assert.ok(sum(right.st)>sum(noGrip.st)*1.7);
 assert.ok(sum(boost.st)<sum(right.st)*.72);
});
test("time-based idle motion remains similar at 30, 60, 120 fps",()=>{
 const a=sample(30,idle,3),b=sample(60,idle,3),c=sample(120,idle,3);
 for(let k=0;k<STINGRAY_EVO.segmentCount;k++){
  assert.ok(Math.abs(a.st.yaw[k]-b.st.yaw[k])<.008);
  assert.ok(Math.abs(b.st.yaw[k]-c.st.yaw[k])<.008);
  assert.ok(Math.abs(c.st.yaw[k])<=STINGRAY_EVO.maxYawJointRadians);
 }
 const previous=a.st.tipX;
 tailPoseStep(a.st,0,{...idle,steering:1});
 assert.equal(a.st.tipX,previous,"animation must freeze on pause");
});
test("compact four-batch geometry for two ships is separate from physics",()=>{
 assert.equal(SHIP_POLISH.maxAdditionalDrawCalls,4);
 assert.equal(SHIP_POLISH.addedLights,0);
 assert.equal(SHIP_POLISH.addedPasses,0);
 assert.equal(MANTA_POLISH.physicsChanged,false);
 assert.equal(ENGINE_SOCKETS.length,2);
 assert.equal(STINGRAY_EVO.sharedSurfaceDrawCalls,4);
 // Lightweight Three.js material/geometry spy checks actual built vertices.
 const meshes=[],colors=[],mkColor=(hex)=>({
  v:hex,clone(){return mkColor(this.v)},
  copy(other){this.v=other.v;return this},
  multiplyScalar(v){this.scale=v;return this}
 });
 class Mat{constructor(config){this.color=mkColor(config.color);}}
 class Geo{
  setAttribute(_key,attr){this.pos=attr.array;return this}
  computeVertexNormals(){}
  computeBoundingSphere(){}
 }
 class Attr{constructor(array){this.array=array}}
 class Mesh{
  constructor(g,m){this.geometry=g;this.material=m;meshes.push(this)}
 }
 const THREE={BufferGeometry:Geo,Float32BufferAttribute:Attr,Mesh,
  MeshPhysicalMaterial:Mat,MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,
  DoubleSide:2};
 const ship={add(x){colors.push(x)}};
 const fx=buildShipPolish(THREE,ship,{engineSockets:ENGINE_SOCKETS,
  variant:"stingray"});
 assert.equal(fx.surfaces.length,4);
 assert.equal(colors.length,4);
 assert.ok(meshes.every(x=>x.geometry.pos.length>0));
 assert.ok(meshes.every(x=>[...x.geometry.pos].every(Number.isFinite)));
 fx.frame(1/60,{speed:130,gripIntensity:.7,boostMultiplier:1.4});
 assert.ok(fx.stats().peakGlow>1);
 fx.reset();
 assert.equal(fx.stats().updates,0);
});
test("production 0.10.3 preserves normal track Hangar, GRIP and 760m blackout",()=>{
 const html=read("./index.html"),boot=read("./boot-v0103.js"),
  game=read("./game-v0103.mjs"),old=read("./game-v0102.mjs");
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/manta-blade-v0103\.mjs/);
 assert.match(game,/stingray-evo-v0103\.mjs/);
 assert.match(game,/buildPremiumMantaBlade/);
 assert.match(game,/activeCraft\?\.framePolish/);
 assert.match(game,/activeCraft\?\.resetPolish/);
 assert.match(game,/surfacePolish:activeCraft\?\.polishStats/);
 assert.match(game,/shadow-tunnel-v092\.mjs/);
 assert.match(game,/tunnel-blackout-v0921\.mjs/);
 assert.match(game,/kinetic-camera-v090\.mjs/);
 assert.match(game,/trial-v0901\.mjs/);
 assert.match(game,/world\.visible=true/);
 assert.match(old,/version:"0\.10\.2"/);
});
