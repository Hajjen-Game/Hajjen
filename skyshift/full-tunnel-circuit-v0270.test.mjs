import test from "node:test";
import assert from "node:assert/strict";
import {FULL_TUNNEL_0270,vaultCrossSection0270,installFullTunnelCircuit0270}
 from "./full-tunnel-circuit-v0270.mjs";
import {TUNNEL_PROFILE_0211} from "./tunnel-megastructure-v0211.mjs";

class FakeGroup{
 constructor(){this.children=[];this.name="";this.parent=null;}
 add(obj){this.children.push(obj);obj.parent=this;}
 removeFromParent(){if(this.parent)
  this.parent.children=this.parent.children.filter(x=>x!==this);
  this.parent=null;}
 traverse(fn){fn(this);for(const x of this.children){
  if(typeof x.traverse==="function")x.traverse(fn);else fn(x);
 }}
}
class FakeBufferGeometry{
 attributes={};
 setAttribute(name,attr){this.attributes[name]=attr;}
 setIndex(a){this.index=a;}
 getAttribute(name){return this.attributes[name];}
 computeVertexNormals(){}
 computeBoundingSphere(){}
 dispose(){this.disposed=true;}
}
class FakeAttribute{
 constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize;}
 getX(i){return this.array[i*this.itemSize];}
}
class FakeMaterial{
 constructor(options){this.userData={};this.options=options;}
 dispose(){this.disposed=true;}
}
class FakeMesh{
 constructor(geometry,material){this.geometry=geometry;this.material=material;this.name="";this.frustumCulled=true;}
}
const THREE={Group:FakeGroup,BufferGeometry:FakeBufferGeometry,
 Float32BufferAttribute:FakeAttribute,MeshBasicMaterial:FakeMaterial,
 Mesh:FakeMesh,DoubleSide:"DoubleSide"};
const positionAt=(s,x,y)=>({x,y,z:s});
function build(lowMemory=false,track="vault",enabled=true){
 const world=new FakeGroup();
 const controller=installFullTunnelCircuit0270(THREE,world,
  {track,lowMemory,positionAt,enabled});
 return {world,controller,stats:controller.stats()};
}
test("the exact original vaulted profile is reused throughout full lap",()=>{
 assert.equal(FULL_TUNNEL_0270.profile,TUNNEL_PROFILE_0211.length);
 assert.equal(FULL_TUNNEL_0270.meters,3400);
 for(const s of [0,368,1020,1700,2800,3400]){
  assert.deepEqual(vaultCrossSection0270(0,s).map(x=>+x.toFixed(4)),
   TUNNEL_PROFILE_0211[0].map(x=>+x.toFixed(4)));
  const roof=vaultCrossSection0270(15,s);
  assert.ok(roof[1]>28&&roof[1]<30,"vault roof clears craft at "+s);
 }
 assert.throws(()=>vaultCrossSection0270(3,3401));
});
test("High quality covers all 3400m in 20 bounded cullable chunks",()=>{
 const a=build(),x=a.stats;
 assert.equal(x.active,true,JSON.stringify(x));
 assert.equal(x.roofClosed,true);assert.equal(x.sourceLit,true);
 assert.equal(x.coverageMeters,3400);assert.equal(x.chunks,20);
 assert.equal(x.materials,3);assert.equal(x.drawBatches,60);
 assert.equal(x.structuralProfileVertices,TUNNEL_PROFILE_0211.length);
 assert.equal(x.collidersAdded,0);
 assert.equal(a.world.children.length,1);
 const root=a.world.children[0];assert.equal(root.children.length,20);
 assert.ok(root.children.every(x=>x.children.length===3));
 assert.ok(root.children.every(x=>x.children.every(m=>m.frustumCulled)));
 const first=root.children[0].children[0].geometry.attributes.position.array;
 const last=root.children.at(-1).children[0].geometry.attributes.position.array;
 assert.ok(Math.abs(first[2]-0)<1e-7);
 assert.ok(Math.abs(last.at(-1)-3400)<1e-6);
 assert.ok(x.triangles>30000);
 a.controller.dispose();assert.equal(a.world.children.length,0);
});
test("4GB quality reduces geometry without reducing distance or fixture coverage",()=>{
 const high=build(),low=build(true);
 assert.equal(low.stats.coverageMeters,high.stats.coverageMeters);
 assert.equal(low.stats.chunks,high.stats.chunks);
 assert.equal(low.stats.drawBatches,high.stats.drawBatches);
 assert.ok(low.stats.triangles<high.stats.triangles);
 assert.equal(low.stats.quality,"4GB");
 assert.equal(low.stats.noGRIPChange,undefined);
 low.controller.dispose();high.controller.dispose();
});
test("legacy tracks and classic do NOT install another tunnel or alter road",()=>{
 for(const track of ["skyline","aurora"]){
  const x=build(false,track);
  assert.equal(x.stats.active,false);
  assert.equal(x.world.children.length,0);
  assert.equal(x.stats.originalRoadUntouched,true);
 }
 const disabled=build(false,"vault",false);
 assert.equal(disabled.stats.active,false);
 assert.equal(disabled.world.children.length,0);
});
