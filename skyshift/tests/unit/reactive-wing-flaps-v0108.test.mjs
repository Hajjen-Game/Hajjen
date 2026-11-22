// SKYSHIFT 0.10.8 — real, articulated wing control surfaces.
// Contract: two solid metal plates, one per physical wing, readable
// asymmetric steer/GRIP response, gentle spring recovery and bright edge only.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {REACTIVE_FLAPS,createFlapState,stepFlapState,resetFlapState,
 flapTargets,flapMount,installReactiveWingFlaps
} from "./reactive-wing-flaps-v0108.mjs";
const src=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const deg=r=>r*180/Math.PI;
const tick=(st,seconds,dt,view)=>{
 for(let i=0;i<Math.round(seconds/dt);i++)stepFlapState(st,dt,view);
 return st;
};
test("two model-specific plates sit INSIDE real wing outlines",()=>{
 for(const variant of ["manta","stingray"]){
  const left=flapMount(variant,-1),right=flapMount(variant,1);
  assert.equal(left.x,-right.x);
  assert.equal(left.y,right.y);
  assert.equal(left.z,right.z);
  assert.ok(Math.abs(right.x)>1.5&&Math.abs(right.x)<2.2);
  assert.ok(right.z>.2&&right.z<1.0);
 }
 assert.equal(REACTIVE_FLAPS.wingCount,2);
 assert.equal(REACTIVE_FLAPS.perWing,1);
});
test("neutral is fully stowed, RIGHT raises starboard, LEFT raises port",()=>{
 const flat=flapTargets();
 assert.equal(flat.port,0);assert.equal(flat.starboard,0);
 const right=flapTargets({steering:1,yawRate:.9,gripIntensity:0});
 const left=flapTargets({steering:-1,yawRate:-.9,gripIntensity:0});
 assert.ok(right.starboard>right.port);
 assert.ok(left.port>left.starboard);
 assert.ok(right.port>0 && left.starboard>0,"both plates move, one more");
 assert.ok(Math.abs(right.port-left.starboard)<1e-10);
 assert.ok(Math.abs(right.starboard-left.port)<1e-10);
});
test("GRIP visibly increases deployment, without extending beyond 34 degrees",()=>{
 const normal=flapTargets({steering:1,yawRate:.9,gripIntensity:0});
 const grip=flapTargets({steering:1,yawRate:.9,gripIntensity:1});
 assert.ok(grip.starboard>normal.starboard+.20);
 assert.ok(grip.port>normal.port+.08);
 assert.ok(deg(grip.starboard)>26);
 assert.ok(deg(grip.starboard)<=REACTIVE_FLAPS.maxAngleDegrees);
 assert.ok(REACTIVE_FLAPS.maxAddedDrawCalls<=6);
 assert.equal(REACTIVE_FLAPS.physicsChanged,false);
 assert.equal(REACTIVE_FLAPS.addedLights,0);
 assert.equal(REACTIVE_FLAPS.addedParticles,0);
});
test("analytic springs are FPS independent and settle after releasing steer",()=>{
 const input={steering:-.95,yawRate:-.7,gripIntensity:.9};
 const a=tick(createFlapState(),1,1/120,input);
 const b=tick(createFlapState(),1,1/30,input);
 assert.ok(Math.abs(a.port-b.port)<.001);
 assert.ok(Math.abs(a.starboard-b.starboard)<.001);
 assert.ok(a.port>a.starboard+.2);
 const angle=a.port;
 tick(a,.12,1/60,{});
 assert.ok(Math.abs(a.port)<angle,"no static raised flaps once steering ends");
 tick(a,.65,1/60,{});
 assert.ok(Math.abs(a.port)<.002);
 assert.ok(Math.abs(a.starboard)<.002);
 assert.ok(a.peakDegrees>26);
 assert.ok(a.peakDifferentialDegrees>15);
 assert.ok(a.gripFrames>0);
 resetFlapState(a);
 assert.equal(a.port,0);assert.equal(a.peakDegrees,0);
 const snapshot=JSON.stringify(a);stepFlapState(a,0,input);
 assert.equal(JSON.stringify(a),snapshot);
});
function fakeThree(){
 class Vec{
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 }
 class Group{
  constructor(){this.children=[];this.position=new Vec();this.scale=new Vec(1,1,1);
   this.rotation={x:0,y:0,z:0}}
  add(o){this.children.push(o);o.parent=this}
  removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(v=>v!==this)}
 }
 class Attr{constructor(array,size){this.array=array;this.itemSize=size}}
 class Geometry{
  constructor(){this.attributes={}}
  setAttribute(k,v){this.attributes[k]=v}
  computeVertexNormals(){}
  computeBoundingSphere(){}
  dispose(){}
 }
 class Material{constructor(props){Object.assign(this,props)}dispose(){}}
 class Mesh extends Group{
  constructor(geo,mat){super();this.geometry=geo;this.material=mat}
 }
 return {Group,Mesh,MeshStandardMaterial:Material,MeshBasicMaterial:Material,
  BufferGeometry:Geometry,Float32BufferAttribute:Attr,
  DoubleSide:2,AdditiveBlending:3};
}
test("real 3D meshes raise trailing edges and brighten the correct glow",()=>{
 const THREE=fakeThree(),ship=new THREE.Group();
 for(const variant of ["manta","stingray"]){
  const fx=installReactiveWingFlaps(THREE,ship,{variant});
  assert.equal(fx.stats().wingCount,2);
  const assemblies=ship.children.slice(-2);
  assert.equal(assemblies.length,2);
  for(const g of assemblies){
   assert.equal(g.children.length,2,"seat and mechanical hinged plate");
   assert.equal(g.children[1].children.length,2,"metal plate plus glow line");
   assert.equal(g.children[1].children[0].material.metalness,.76);
  }
  for(let i=0;i<100;i++)fx.frame(1/60,{steering:1,yawRate:.8,gripIntensity:1});
  const left=assemblies[0].children[1],right=assemblies[1].children[1];
  assert.ok(right.rotation.x<left.rotation.x,"starboard raises more on RIGHT");
  assert.ok(right.rotation.x<-.45,"plate physically rotates upward at hinge");
  assert.ok(right.children[1].material.opacity>left.children[1].material.opacity);
  assert.equal(right.children[1].material.blending,THREE.AdditiveBlending);
  assert.equal(right.children[1].material.fog,false);
  assert.ok(fx.stats().peakDegrees>25);
  assert.equal(fx.stats().physicsUnchanged,true);
  fx.reset();
  assert.ok(Math.abs(left.rotation.x)<1e-9);
  assert.ok(Math.abs(right.rotation.x)<1e-9);
  assert.ok(fx.stats().peakGlowOpacity<=.055);
  fx.dispose();
 }
});
test("production installs new flap system on both ships, not old floating vanes",()=>{
 const game=src("./game-v0108.mjs");
 const page=src("./index.html");
 const boot=src("./boot-v0108.js");
 assert.match(game,/installReactiveWingFlaps\(THREE,ship,\{variant:id\}/);
 assert.match(game,/reactiveWingFlaps\?\.dispose\(\)/);
 assert.match(game,/reactiveWingFlaps\?\.reset\(\)/);
 assert.match(game,/reactiveWingFlaps\?\.frame\(showroom\?dt:presentationDt/);
 assert.match(game,/reactiveWingFlaps:\{\.\.\.REACTIVE_FLAPS/);
 assert.doesNotMatch(game,/installVelocityVanes|velocityVanes\?\./);
 assert.match(game,/from "\.\/trial-v0901\.mjs"/);
 assert.match(game,/living-wake-v01071\.mjs/);
 assert.match(page,/data-game-module="game-v0108\.mjs"/);
 assert.match(boot,/game-v0108\.mjs\?v=0\.10\.8/);
});
