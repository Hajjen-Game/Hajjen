// SKYSHIFT 0.10.7.1 — physical-looking wake should move and decay, NOT be static.
// Tests assert meaningful world-space history instead of only emitter counts.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 LIVING_WAKE,wakeEnergy,createWakeHistory,recordWake,historyPoint,
 createLivingWakeFX
} from "../../living-wake-v01071.mjs";
const src=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const speed=n=>44*1.11**n;
test("quiet straight lines do not fully activate in early zones",()=>{
 const low=wakeEnergy({speed:speed(2)});
 const cruising=wakeEnergy({speed:speed(8)});
 const turning=wakeEnergy({speed:speed(8),yawRate:.92,steering:.75});
 const gripping=wakeEnergy({speed:speed(8),yawRate:.92,
  steering:.75,gripIntensity:.9});
 assert.equal(wakeEnergy({speed:44,boostMultiplier:1.4}).strength,0);
 assert.ok(low.strength<.002);
 assert.ok(cruising.strength<.09);
 assert.ok(turning.strength>cruising.strength*4);
 assert.ok(gripping.strength>turning.strength);
 assert.ok(gripping.strength<LIVING_WAKE.maxLightEnergy*4);
});
test("airborne and boost energize briefly, but speed alone is not a white laser",()=>{
 const base=wakeEnergy({speed:speed(7),yawRate:.3});
 const air=wakeEnergy({speed:speed(7),yawRate:.3,grounded:false});
 const boost=wakeEnergy({speed:speed(7),yawRate:.3,boostMultiplier:1.4});
 assert.ok(air.strength>base.strength);
 assert.ok(boost.strength>base.strength);
 assert.ok(wakeEnergy({speed:speed(2),gripIntensity:1}).strength<
  wakeEnergy({speed:speed(8),gripIntensity:1}).strength);
});
test("real WORLD history never follows the next ship movement",()=>{
 const h=createWakeHistory(),normal={x:1,y:0,z:0},up={x:0,y:1,z:0};
 for(let i=0;i<8;i++){
  h.time=i*.03;
  recordWake(h,{x:-2.9,y:2,z:-i*1.2},{x:2.9,y:2,z:-i*1.2},
   normal,up,.75);
 }
 const oldest=historyPoint(h,0,7);
 const firstLocation={x:oldest.x,y:oldest.y,z:oldest.z};
 h.time=.24;
 recordWake(h,{x:-1.8,y:2,z:-9.6},{x:4,y:2,z:-9.6},
  normal,up,.22);
 assert.deepEqual({x:oldest.x,y:oldest.y,z:oldest.z},firstLocation);
 assert.notEqual(historyPoint(h,0,0).x,historyPoint(h,0,8).x);
 assert.equal(h.count,9);
 assert.ok(h.motionMeters>5);
 assert.equal(h.discontinuities,0);
});
test("teleport never bridges the full screen with a giant wake",()=>{
 const h=createWakeHistory(),right={x:1},up={y:1};
 h.time=.02;recordWake(h,{x:-3,y:1,z:0},{x:3,y:1,z:0},right,up,.7);
 h.time=.05;recordWake(h,{x:-3,y:1,z:-2},{x:3,y:1,z:-2},right,up,.8);
 h.time=.08;recordWake(h,{x:80,y:1,z:-60},{x:86,y:1,z:-60},right,up,.8);
 assert.equal(h.count,1);assert.equal(h.discontinuities,1);
});
function fakeThree(){
 class Attribute{
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize}
  setUsage(){return this}
 }
 class Geometry{
  constructor(){this.attributes={}}
  setAttribute(name,attr){this.attributes[name]=attr}
  dispose(){}
 }
 class Vec{
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
  copy(v){return this.set(v.x,v.y,v.z)}
  applyMatrix4(m){this.x+=m.x;this.y+=m.y;this.z+=m.z;return this}
  transformDirection(){return this}
 }
 class Mat{constructor(o){Object.assign(this,o)}dispose(){}}
 class Mesh{
  constructor(g,m){this.geometry=g;this.material=m;this.visible=false}
  removeFromParent(){}
 }
 return {BufferGeometry:Geometry,BufferAttribute:Attribute,Vector3:Vec,
  MeshBasicMaterial:Mat,Mesh,NormalBlending:1,AdditiveBlending:4,DoubleSide:2,DynamicDrawUsage:3};
}
test("live mesh stores world path, fades after release and resets on pause",()=>{
 const THREE=fakeThree(),scene={items:[],add(o){this.items.push(o)}};
 const ship={matrixWorld:{x:0,y:1,z:0},updateMatrixWorld(){}};
 const camera={position:{x:0,y:6,z:15}};
 const fx=createLivingWakeFX(THREE,scene,ship,{variant:"manta"});
 const opts={playing:true,camera,speed:speed(8),yawRate:.95,
  steering:.8,gripIntensity:.95,grounded:false};
 for(let i=0;i<13;i++){
  ship.matrixWorld.z=-i*1.35;
  ship.matrixWorld.x=i*.14;
  fx.frame(.03,opts);
 }
 const old=historyPoint(fx.history,0,12),px=old.x,pz=old.z;
 const active=fx.stats();
 assert.ok(active.sampleCount>=13);
 assert.ok(active.historicalSpanMeters>12);
 assert.ok(active.activeSegments>1);
 assert.ok(active.peakLightEnergy>0);
 assert.ok(active.peakLightEnergy<=LIVING_WAKE.maxLightEnergy);
 assert.ok(active.peakLightEnergy>.1,
  "loaded turns should retain a visible but controlled white core");

 assert.equal(fx.mesh.visible,true);
 assert.equal(scene.items[0],fx.mesh);
 assert.ok(fx.mesh.geometry.attributes.position.array.some(v=>v!==0));
 assert.equal(fx.mesh.geometry.attributes.color.itemSize,4,
  "RGBA per-vertex transparency prevents opaque dark strips");
 assert.equal(fx.mesh.material.blending,THREE.AdditiveBlending,
  "additive white light cannot darken the track");
 assert.equal(fx.mesh.material.fog,false,
  "black tunnel fog must not turn white trails dark");
 assert.equal(fx.mesh.material.depthWrite,false);
 assert.equal(fx.stats().additiveLightOnly,true);
 assert.equal(fx.stats().materialFogDisabled,true);
 assert.equal(fx.stats().colorRgbaItemSize,4);

 assert.ok(fx.mesh.geometry.attributes.color.array.some((value,i)=>
  i%4===3 && value>0 && value<=.35),
  "wake opacity stays subdued and fades by age");

 ship.matrixWorld.z-=1.5;
 fx.frame(.03,opts);
 assert.equal(old.x,px);assert.equal(old.z,pz);
 const quiet={...opts,yawRate:0,steering:0,gripIntensity:0,
  grounded:true};
 for(let i=0;i<36;i++){
  ship.matrixWorld.z-=.7;
  fx.frame(.03,quiet);
 }
 assert.ok(fx.stats().currentEnergy<active.currentEnergy);
 fx.frame(.03,{...quiet,playing:false});
 assert.equal(fx.mesh.visible,false);
 assert.equal(fx.stats().sampleCount,0);
 fx.dispose();
});
test("low-memory keeps single dynamic batch, no game physics touched",()=>{
 assert.equal(LIVING_WAKE.addedDrawCalls,1);
 assert.equal(LIVING_WAKE.addedParticles,0);
 assert.equal(LIVING_WAKE.addedLights,0);
 assert.equal(LIVING_WAKE.addedPostPasses,0);
 assert.equal(LIVING_WAKE.physicsChanged,false);
 assert.ok(LIVING_WAKE.samplesPerTip<=30);
 assert.ok(LIVING_WAKE.maxLifetimeSeconds<.7);
 assert.ok(LIVING_WAKE.maxTrailMeters<=40);
});
test("production activates v0.10.7.1, deactivates old ship-attached trails",()=>{
 const game=src("./legacy/game/game-v01071.mjs");
 const index=src("./index.html");
 const boot=src("./legacy/boot/boot-v01071.js");
 assert.match(game,/createLivingWakeFX\(THREE,scene,ship,\{variant:id/);
 assert.match(game,/livingWake\?\.dispose\(\)/);
 assert.match(game,/livingWake\?\.reset\(\)/);
 assert.match(game,/livingWake\?\.frame\(presentationDt/);
 assert.match(game,/livingWake:\{\.\.\.LIVING_WAKE/);
 assert.match(game,/__skyshiftWakeSmoke/);
 assert.doesNotMatch(game,/wingtipContrails|createWingtipContrails|createWingVaporFX/);
 assert.match(index,/data-game-module="game-v01071\.mjs"/);
 assert.match(boot,/game-v01071\.mjs\?v=0\.10\.7\.1/);
 assert.match(game,/from "\.\/trial-v0901\.mjs"/);
});
