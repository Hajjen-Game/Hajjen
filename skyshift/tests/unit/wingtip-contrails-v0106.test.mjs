// SKYSHIFT 0.10.6 — regression checks for two REAL wingtip emitters.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MANTA_WING_OUTLINE} from "../../manta-blade-v0484.mjs";
import {STINGRAY_WING} from "../../stingray-evo-v0104.mjs";
import {WINGTIP_CONTRAILS,wingtipAnchor,wingtipEmitters,contrailEnvelope,
 createWingtipContrails} from "../../wingtip-contrails-v0106.mjs";

const source=name=>readFileSync(new URL("../../"+name,import.meta.url),"utf8");
const speed=stage=>44*1.11**stage;
test("one precise origin at the physical OUTERMOST tip of each model",()=>{
 for(const [model,outline] of [["manta",MANTA_WING_OUTLINE],
  ["stingray",STINGRAY_WING]]){
  const origin=wingtipAnchor(model),emitters=wingtipEmitters(model);
  const xmax=Math.max(...outline.map(p=>p[0]));
  const tips=outline.filter(p=>Math.abs(p[0]-xmax)<1e-7);
  const z=(Math.min(...tips.map(p=>p[1]))+
   Math.max(...tips.map(p=>p[1])))/2;
  assert.equal(origin.x,xmax);
  assert.equal(origin.z,z);
  assert.equal(emitters.length,2);
  assert.equal(emitters[0].x,-xmax);
  assert.equal(emitters[1].x,xmax);
  assert.equal(emitters[0].z,z);
  assert.ok(origin.x>2.85,"outside inboard engine sockets");
 }
 assert.equal(wingtipAnchor("manta").x,2.90);
 assert.equal(wingtipAnchor("stingray").x,3.20);
});
test("zone 1 has NO contrails; high speed has only 1, then 2, then 3 per tip",()=>{
 const e=Array.from({length:9},(_,n)=>contrailEnvelope(speed(n)));
 assert.deepEqual(e.map(x=>x.count),[0,1,1,1,1,2,2,2,3]);
 for(let i=1;i<e.length;i++){
  assert.ok(e[i].length>e[i-1].length);
  assert.ok(e[i].brightness>e[i-1].brightness);
 }
 assert.ok(e[8].weights[0]>e[8].weights[1]);
 assert.ok(e[8].weights[1]>e[8].weights[2]);
 assert.ok(e[8].length<=WINGTIP_CONTRAILS.maxLengthMeters);
 assert.equal(WINGTIP_CONTRAILS.emitters,2);
 assert.equal(WINGTIP_CONTRAILS.maxStrandsPerTip,3);
});
test("boost and being airborne extend and brighten, while low memory keeps main tip",()=>{
 const base=contrailEnvelope(speed(6),1,true);
 const air=contrailEnvelope(speed(6),1,false);
 const boost=contrailEnvelope(speed(6),1.4,true);
 const both=contrailEnvelope(speed(6),1.4,false);
 assert.ok(air.length>base.length);
 assert.ok(air.brightness>base.brightness);
 assert.ok(boost.length>base.length);
 assert.ok(boost.brightness>base.brightness);
 assert.ok(both.length>boost.length);
 assert.ok(both.brightness>boost.brightness);
 assert.equal(contrailEnvelope(speed(8),1,true,true).count,2);
 assert.equal(WINGTIP_CONTRAILS.addedDrawCalls,1);
 assert.equal(WINGTIP_CONTRAILS.addedParticles,0);
 assert.equal(WINGTIP_CONTRAILS.addedLights,0);
 assert.equal(WINGTIP_CONTRAILS.physicsChanged,false);
});
function mockThree(){
 class Attribute{
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.needsUpdate=false}
  setUsage(){return this}
 }
 class Geometry{
  constructor(){this.attributes={}}
  setAttribute(k,v){this.attributes[k]=v}
  dispose(){}
 }
 class Vector3{constructor(x,y,z){Object.assign(this,{x,y,z})}}
 class Sphere{constructor(center,radius){Object.assign(this,{center,radius})}}
 class Material{constructor(props){Object.assign(this,props)}dispose(){}}
 class Mesh{
  constructor(geo,mat){this.geometry=geo;this.material=mat;this.visible=false}
  removeFromParent(){}
 }
 return {BufferAttribute:Attribute,BufferGeometry:Geometry,Vector3,Sphere,
  MeshBasicMaterial:Material,Mesh,DynamicDrawUsage:1,DoubleSide:2,
  AdditiveBlending:3};
}
test("all actual geometry channels START at both tips, never inboard",()=>{
 const THREE=mockThree(),ship={add(){}};
 for(const model of ["manta","stingray"]){
  const vfx=createWingtipContrails(THREE,ship,{variant:model});
  const buffers=vfx.mesh.geometry.attributes;
  assert.equal(vfx.mesh.visible,false);
  vfx.frame(0,{playing:true,speed:speed(8)});
  assert.equal(vfx.mesh.visible,false,"paused dt cannot animate");
  vfx.frame(1/60,{playing:true,speed:speed(8)});
  assert.equal(vfx.mesh.visible,true);
  const pos=buffers.position.array,clr=buffers.color.array;
  const tips=wingtipEmitters(model);
  for(let side=0;side<2;side++)for(let stream=0;stream<3;stream++)
   for(let layer=0;layer<2;layer++){
    const o=(((side*3+stream)*2+layer)*6)*18;
    const midpoint=(pos[o]+pos[o+3])/2;
    assert.ok(Math.abs(midpoint-tips[side].x)<1e-5);
    assert.ok(Math.abs(pos[o+2]-(tips[side].z+.025))<1e-5);
    assert.ok(clr[o]>=0);
   }
  const base=pos,previousLength=vfx.stats().lastLengthMeters;
  for(let i=0;i<60;i++)vfx.frame(1/60,{
   playing:true,speed:speed(8),boostMultiplier:1.4,grounded:false});
  assert.equal(buffers.position.array,base,"no dynamic geometry allocations");
  assert.ok(vfx.stats().peakLengthMeters>previousLength);
  assert.equal(vfx.stats().peakStrands,6);
  assert.equal(vfx.stats().tipX,tips[1].x);
  vfx.frame(1/60,{playing:false,speed:speed(8)});
  assert.equal(vfx.mesh.visible,false,"Hangar / menu shows no contrails");
  vfx.reset();assert.equal(vfx.stats().peakStrands,0);
  vfx.dispose();
 }
});
test("active game references only v0.10.6 wingtip emitter, not old vapor curtain",()=>{
 const game=source("./legacy/game/game-v0106.mjs");
 const page=source("./index.html");
 const boot=source("./legacy/boot/boot-v0106.js");
 assert.match(game,/createWingtipContrails\(THREE,ship,\{variant:id/);
 assert.match(game,/wingtipContrails\?\.dispose\(\)/);
 assert.match(game,/wingtipContrails\?\.reset\(\)/);
 assert.match(game,/wingtipContrails\?\.frame\(presentationDt/);
 assert.match(game,/wingtipContrails:\{\.\.\.WINGTIP_CONTRAILS/);
 assert.match(game,/__skyshiftWingtipInfo/);
 assert.doesNotMatch(game,/wing-vapor-v0105|createWingVaporFX/);
 assert.match(page,/data-game-module="game-v0106\.mjs"/);
 assert.match(boot,/game-v0106\.mjs\?v=0\.10\.6/);
 assert.match(game,/from "\.\/trial-v0901\.mjs"/);
});
