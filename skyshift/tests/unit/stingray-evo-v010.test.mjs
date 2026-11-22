import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ENGINE_SOCKETS} from "../../manta-blade-v0484.mjs";
import {STINGRAY_EVO,STINGRAY_WING,createTailState,tailPoseStep}
 from "../../stingray-evo-v010.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
function sample(fps,view,duration=1.5){
 const state=createTailState();
 for(let i=0;i<Math.round(fps*duration);i++)
  tailPoseStep(state,1/fps,view);
 return state;
}
test("new ship is recognizable manta silhouette without changing engine and physics sockets",()=>{
 assert.equal(STINGRAY_EVO.segmentCount,9);
 assert.ok(STINGRAY_EVO.tailLengthMeters>=5);
 assert.ok(STINGRAY_EVO.additionalTailDrawCalls<=18);
 assert.equal(STINGRAY_EVO.newDynamicLights,0);
 assert.equal(STINGRAY_EVO.physicsChanged,false);
 assert.equal(STINGRAY_EVO.engineSocketsUnchanged,true);
 assert.equal(ENGINE_SOCKETS.length,2);
 assert.equal(STINGRAY_WING.length>=15,true);
 assert.ok(Math.max(...STINGRAY_WING.map(p=>p[0]))>3);
 assert.ok(STINGRAY_WING.every(([x,z])=>x>0&&Number.isFinite(z)));
});
test("GRIP meaningfully increases counter-steering bend at 60fps",()=>{
 const view={steering:.95,yawRate:1,gripIntensity:0,
  boostMultiplier:1,grounded:true};
 const normal=sample(60,view),grip=sample(60,{...view,gripIntensity:1});
 assert.ok(grip.yaw[8]<0,"tail counters right-hand turns");
 assert.ok(Math.abs(grip.yaw[8])>Math.abs(normal.yaw[8])*2.1);
 assert.ok(grip.peakJointDegrees>1.6);
 assert.ok(grip.peakGrip===1);
 assert.ok(grip.yaw.every(Number.isFinite));
 assert.ok(grip.pitch.every(Number.isFinite));
});
test("boost stiffens tail, air travel sends controlled pitch wave along links",()=>{
 const basic={steering:-.8,yawRate:-.9,
  gripIntensity:.6,grounded:true,boostMultiplier:1};
 const cruising=sample(120,basic);
 const boosting=sample(120,{...basic,boostMultiplier:1.4});
 assert.ok(Math.abs(boosting.yaw[8])<Math.abs(cruising.yaw[8])*.55);
 const flight=sample(120,{...basic,grounded:false,steering:0,
  yawRate:0,gripIntensity:0});
 assert.ok(Math.abs(flight.pitch[3])>.003);
 assert.ok(Math.abs(flight.pitch[3]-flight.pitch[6])>.005);
});
test("visual motors and tail run at 30/60/120Hz with stable interpolation",()=>{
 const view={steering:-.72,yawRate:-.61,gripIntensity:.9,
  grounded:true,boostMultiplier:1.16};
 const a=sample(30,view),b=sample(60,view),c=sample(120,view);
 for(let i=0;i<STINGRAY_EVO.segmentCount;i++){
  assert.ok(Math.abs(a.yaw[i]-b.yaw[i])<1e-8,"joint "+i+" 30/60");
  assert.ok(Math.abs(b.yaw[i]-c.yaw[i])<1e-8,"joint "+i+" 60/120");
 }
 const state=createTailState(),before=JSON.stringify([...state.yaw]);
 tailPoseStep(state,0,{steering:1,gripIntensity:1});
 assert.equal(JSON.stringify([...state.yaw]),before);
});
test("new mesh is a real procedurally rigged linked 3D ship, not an image",()=>{
 const src=read("./stingray-evo-v010.mjs");
 const game=read("./game-v0103.mjs");
 assert.match(src,/new THREE\.Group\(\)/);
 assert.match(src,/new THREE\.CylinderGeometry/);
 assert.match(src,/parent=joint/);
 assert.match(src,/links\[i\]\.rotation\.y=tail\.yaw\[i\]/);
 assert.match(game,/activeCraft\.frameTail/);
 assert.match(game,/demo\?\{steering:Math\.sin/);
 assert.match(game,/makeShip\(previewShipId\)/);
 assert.match(game,/worldLights,camera,bladeTips/);
});
