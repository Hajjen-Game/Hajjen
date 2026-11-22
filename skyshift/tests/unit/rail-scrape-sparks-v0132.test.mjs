// SKYSHIFT 0.10.9.1 — safety: sparks ONLY from real guardrail contact;
// world ballistic history; same glow logic on both ship models; no physics.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {poseAt,widthAt,GUARDRAIL,positionAt,surfaceNormalAt} from "../../trial-v0901.mjs";
import {RAIL_SPARKS,railContactPoint,sparkDemand,
 createSparkState,advanceSparkState,resetSparkState,createRailScrapeSparks
} from "./rail-scrape-sparks-v01091.mjs";
const src=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const speed=stage=>44*1.11**stage;
test("collision anchors follow the ACTUAL banked rail face on both sides",()=>{
 for(const s of [180,520,900,1800,2250]){
  const p=poseAt(s),left=railContactPoint(s,-1),right=railContactPoint(s,1);
  assert.equal(left.side,-1);assert.equal(right.side,1);
  const lx=(left.x-p.x)*p.rightX+(left.z-p.z)*p.rightZ;
  const rx=(right.x-p.x)*p.rightX+(right.z-p.z)*p.rightZ;
  assert.ok(lx<-.1&&rx>.1);
  // Wall rides and corkscrews can invert world Y. Height is measured along
  // the physical banked road NORMAL, not the global up axis.
  const base=positionAt(s,widthAt(s)*.5-.69,0);
  const n=surfaceNormalAt(s);
  const h=(right.x-base.x)*n.x+(right.y-base.y)*n.y+
   (right.z-base.z)*n.z;
  assert.ok(Math.abs(h-.68)<1e-5,
   "sparks emerge 0.68m above the actual banked contact surface");
  assert.ok(Math.abs(right.backwardX+p.forwardX)<1e-9);
  assert.ok(Math.abs(left.backwardZ+p.forwardZ)<1e-9);
  assert.ok(widthAt(s)/2-GUARDRAIL.collisionMargin>0);
 }
 assert.equal(railContactPoint(520,0),null);
});
test("not near-rail steering; zero emission without REAL physical contact",()=>{
 const scenarios=[
  {contacting:false,side:1,speed:speed(8),scrubIntensity:1},
  {contacting:true,side:0,speed:speed(8),scrubIntensity:1},
  {contacting:true,side:1,grounded:false,speed:speed(8)},
  {contacting:false,side:-1,started:true,speed:speed(8)}
 ];
 for(const info of scenarios){
  const d=sparkDemand(info);
  assert.equal(d.active,false);
  assert.equal(d.burst,0);
  assert.equal(d.rate,0);
 }
 const light=sparkDemand({contacting:true,side:-1,grounded:true,
  speed:speed(1),scrubIntensity:0,started:true});
 const heavy=sparkDemand({contacting:true,side:-1,grounded:true,
  speed:speed(8),scrubIntensity:1,started:true});
 assert.ok(light.burst>=3&&light.burst<=9);
 assert.ok(heavy.burst>light.burst);
 assert.ok(heavy.rate>light.rate);
 assert.ok(heavy.pressure>light.pressure);
});
test("initial impact once, sustained scrape stochastic and old particles fly away",()=>{
 const st=createSparkState(),root=railContactPoint(520,1);
 const info={contacting:true,side:1,grounded:true,speed:speed(8),
  scrubIntensity:1,contactSerial:1};
 advanceSparkState(st,1/60,info,root);
 assert.equal(st.bursts,1);
 assert.ok(st.flash.active,"the impact creates a brief white flash");
 assert.equal(st.impactFlashes,1);
 assert.ok(st.emitted>=8);
 assert.ok(st.live>0);
 const first=st.particles.find(p=>p.active);
 const from={x:first.x,y:first.y,z:first.z};
 for(let i=0;i<15;i++)
  advanceSparkState(st,1/60,info,root);
 assert.equal(st.bursts,1,"continuous rail scraping never retriggers initial burst");
 assert.ok(st.emitted>10,"intermittent flecks keep spawning during scrape");
 assert.ok(st.contactSeconds>.20);
 const beforeEnd=st.emitted;
 const release={contacting:false,side:0,grounded:true,speed:speed(8),
  scrubIntensity:0,contactSerial:1};
 for(let i=0;i<10;i++)advanceSparkState(st,1/60,release,null);
 assert.equal(st.emitted,beforeEnd,"release MUST stop emitter");
 assert.ok(st.travelFrames>0);
 assert.notDeepEqual({x:first.x,y:first.y,z:first.z},from);
 for(let i=0;i<50;i++)advanceSparkState(st,1/60,release,null);
 assert.equal(st.live,0,"flecks die rather than remaining static behind ship");
 assert.equal(st.flash.active,false,"flash must vanish after a fraction of a second");
 assert.equal(st.emitted,beforeEnd);
 assert.equal(st.bursts,1);
 resetSparkState(st);
 assert.equal(st.emitted,0);
 assert.equal(st.peakVisible,0);
 assert.equal(st.impactFlashes,0);
});
test("contact side changes generate an independent new impact on correct wall",()=>{
 const st=createSparkState();
 const right={contacting:true,side:1,grounded:true,
  speed:speed(6),scrubIntensity:.7,contactSerial:1};
 const left={...right,side:-1,contactSerial:2};
 advanceSparkState(st,1/60,right,railContactPoint(520,1));
 const rightEmission=st.emitted;
 advanceSparkState(st,1/60,left,railContactPoint(520,-1));
 assert.equal(st.bursts,2);
 assert.ok(st.emitted>rightEmission);
 assert.equal(st.recentSource.side,-1);
 assert.ok(st.peakVisible<=RAIL_SPARKS.cap);
});
function fakeThree(){
 class Attribute{
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.needsUpdate=false}
  setUsage(){return this}
 }
 class Geometry{
  constructor(){this.attributes={};this.drawRange={start:0,count:0}}
  setAttribute(name,attr){this.attributes[name]=attr}
  setDrawRange(start,count){this.drawRange={start,count}}
  dispose(){}
 }
 class Material{constructor(options){Object.assign(this,options)}dispose(){}}
 class Mesh{
  constructor(geometry,material){this.geometry=geometry;this.material=material}
  removeFromParent(){}
 }
 return {BufferAttribute:Attribute,BufferGeometry:Geometry,MeshBasicMaterial:Material,
  Mesh,AdditiveBlending:3,DoubleSide:2,DynamicDrawUsage:1};
}
test("actual batched geometry emits white-gold RGBA streaks and no scene lights",()=>{
 const THREE=fakeThree(),scene={add(x){this.last=x}};
 for(const lowMemory of [false,true]){
  const fx=createRailScrapeSparks(THREE,scene,{lowMemory});
  const camera={position:{x:0,y:7,z:15}};
  const root=railContactPoint(520,1);
  assert.equal(scene.last,fx.mesh);
  const state=fx.state,geo=fx.mesh.geometry;
  assert.equal(geo.attributes.color.itemSize,4);
  assert.equal(geo.attributes.position.itemSize,3);
  assert.equal(fx.mesh.material.blending,THREE.AdditiveBlending);
  assert.equal(fx.mesh.material.fog,false);
  assert.equal(fx.mesh.material.depthWrite,false);
  fx.frame(1/60,{playing:true,camera,railContact:null,
   contacting:false,side:0,speed:speed(8)});
  assert.equal(fx.mesh.visible,false);
  fx.frame(1/60,{playing:true,camera,railContact:root,
   contacting:true,side:1,grounded:true,scrubIntensity:1,speed:speed(8),
   contactSerial:1});
  const loaded=fx.stats();
  assert.equal(loaded.impactBursts,1);
  assert.ok(loaded.activeSparks>0);
  assert.ok(loaded.lastDrawVertices>0);
  assert.equal(loaded.lastDrawVertices,
   loaded.activeSparks*12+RAIL_SPARKS.flashVertices,
   "white contact flash shares the sparks' single draw call");
  assert.ok(loaded.peakParticleWidthMeters>=.048);
  assert.ok(loaded.peakFlashOpacity>.55);
  assert.equal(loaded.impactFlashes,1);
  assert.equal(loaded.flashVisible,true);
  assert.equal(loaded.sparkCoreWhite,true);
  assert.ok(geo.attributes.position.array.some(v=>v!==0));
  assert.ok(geo.attributes.color.array.some((v,i)=>
   i%4===3&&v>.03&&v<1));
  assert.equal(loaded.additiveLightOnly,true);
  assert.equal(loaded.rgbaColorAttribute,4);
  assert.equal(loaded.noExtraLights,true);
  assert.equal(loaded.physicsUnchanged,true);
  for(let k=0;k<42;k++)fx.frame(1/60,{playing:true,camera,
   railContact:null,contacting:false,side:0,speed:speed(8)});
  assert.equal(fx.stats().activeSparks,0);
  assert.equal(fx.stats().flashVisible,false);
  assert.equal(fx.mesh.visible,false);
  fx.frame(1/60,{playing:false,camera});
  assert.equal(fx.stats().emitted,0);
  assert.equal(geo.drawRange.count,0);
  fx.dispose();
  assert.equal(state.cap,lowMemory?52:104);
 }
 assert.equal(RAIL_SPARKS.maxAddedDrawCalls,1);
 assert.equal(RAIL_SPARKS.physicsChanged,false);
 assert.equal(RAIL_SPARKS.colliderChanged,false);
 assert.equal(RAIL_SPARKS.shieldChanged,false);
});
test("visible white cores and brief contact flare never emit without collision",()=>{
 const st=createSparkState(),contact=railContactPoint(520,1);
 const collision={contacting:true,side:1,grounded:true,
  speed:speed(8),scrubIntensity:1,contactSerial:1};
 advanceSparkState(st,1/60,collision,contact);
 const active=st.particles.filter(p=>p.active);
 assert.ok(active.length>=10);
 assert.ok(active.every(p=>p.width>=.048&&p.tail>=.34));
 assert.ok(st.peakParticleWidth>=RAIL_SPARKS.minVisibleCoreWidthMeters);
 assert.ok(st.flash.active);
 assert.ok(Math.abs(st.flash.x-contact.x)<1e-10);
 const count=st.emitted;
 for(let i=0;i<10;i++)advanceSparkState(st,1/60,
  {...collision,contacting:false,side:0},null);
 assert.ok(!st.flash.active);
 assert.equal(st.impactFlashes,1);
 assert.equal(st.emitted,count);
 assert.equal(RAIL_SPARKS.maxAddedDrawCalls,1);
 assert.equal(RAIL_SPARKS.flashVertices,12);
});
test("active game observes physics-owned railContacting, never approximate proximity",()=>{
 const game=src("./game-v0132.mjs"),
  page=src("./index.html"),boot=src("./boot-v0132.js");
 assert.match(game,/createRailScrapeSparks\(THREE,scene/);
 assert.match(game,/railSparks\?\.dispose\(\)/);
 assert.match(game,/railSparks\?\.reset\(\)/);
 assert.match(game,/railContactPoint\(view\.s,sparkSide\)/);
 assert.match(game,/contacting:flight\.railContacting,side:sparkSide/);
 assert.match(game,/contactSerial:flight\.railContactStarts/);
 assert.match(game,/__skyshiftSparkInfo/);
 assert.match(game,/railScrapeSparks:\{\.\.\.RAIL_SPARKS/);
 assert.match(game,/reactiveWingFlaps\?\.frame\(showroom\?dt:presentationDt/);
 assert.match(game,/livingWake\?\.frame\(presentationDt/);
 assert.doesNotMatch(game,/stepFlight=.*railSpark|const contacted=\s*railSpark/);
 assert.match(page,/data-game-module="game-v0132\.mjs"/);
 assert.match(boot,/game-v0132\.mjs\?v=0\.13\.2/);
});
