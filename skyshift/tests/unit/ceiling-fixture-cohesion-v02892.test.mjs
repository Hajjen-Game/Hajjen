import test from "node:test";
import assert from "node:assert/strict";
import {ZONE_PALETTES} from "../../zone-wave-v060.mjs";
import {planTrueSharedTunnel0281}
 from "../../tunnel/true-shared-tunnel-renderer-v0281.mjs";
import {CEILING_FIXTURE_02892,ceilingFixtureEnabled02892,
 panelSeamPoint02892,buildCeilingFixtureGeometry02892,
 patchCeilingFixtureShader02892,installCeilingFixtureCohesion02892}
 from "../../tunnel/ceiling-fixture-cohesion-v02892.mjs";

class FakeAttribute {
 constructor(array,itemSize){this.array=new Float32Array(array);
  this.itemSize=itemSize;this.count=this.array.length/itemSize;}
}
class FakeGeometry {
 constructor(){this.attributes={};this.disposed=false;}
 setAttribute(name,value){this.attributes[name]=value;return this;}
 getAttribute(name){return this.attributes[name];}
 computeBoundingSphere(){this.boundingSphere={radius:1};}
 dispose(){this.disposed=true;}
}
class FakeColor {
 constructor(hex){this.hex=hex;}
 setHex(hex){this.hex=hex;return this;}
 getHex(){return this.hex;}
}
const THREE={BufferGeometry:FakeGeometry,
 Float32BufferAttribute:FakeAttribute,Color:FakeColor,NormalBlending:1};
const point=(s,x,y)=>({x,y,z:s});
const params=v=>"?track=vault&v="+v;

test("0.28.9.2 applies only to new Vault version with exact rollback",()=>{
 assert.equal(ceilingFixtureEnabled02892(params("0.28.9.1")),false);
 assert.equal(ceilingFixtureEnabled02892(params("0.28.9.2")),true);
 assert.equal(ceilingFixtureEnabled02892(params("0.28.9.3")),true);
 assert.equal(ceilingFixtureEnabled02892(params("0.28.10")),true);
 assert.equal(ceilingFixtureEnabled02892("?track=skyline&v=0.28.9.2"),false);
 assert.equal(ceilingFixtureEnabled02892("?track=aurora&v=0.28.9.2"),false);
 assert.equal(ceilingFixtureEnabled02892(params("0.28.9.2")+
  "&ceilingFixtures=classic"),false);
 assert.equal(ceilingFixtureEnabled02892(params("0.28.9.2")+
  "&ceilingFixtures=off"),false);
 assert.equal(CEILING_FIXTURE_02892.extraDrawCalls,0);
 assert.equal(CEILING_FIXTURE_02892.extraLights,0);
});
test("old cyan T on panel face is replaced by real banked upper seam",()=>{
 const a=panelSeamPoint02892(point,110,1,"upper"),
  b=panelSeamPoint02892(point,110,-1,"upper"),
  c=panelSeamPoint02892(point,110,1,"wall");
 assert.ok(a.x>13&&a.x<24&&a.y>22,"roof/upper seam after original vaulted compression");
 assert.equal(a.x,-b.x,"mirrored real contour");
 assert.ok(c.y<a.y,"orange companion lives in wall reveal");
 assert.throws(()=>panelSeamPoint02892(point,369,1,"upper"),/sampler/);
 assert.throws(()=>panelSeamPoint02892(point,110,0,"wall"),/sampler/);
});
test("High and 4GB reuse one original cove draw mesh and remove T caps",()=>{
 for(const lowMemory of [false,true]){
  const q=buildCeilingFixtureGeometry02892(THREE,point,{lowMemory});
  const p=q.geometry.getAttribute("position"),
   colors=q.geometry.getAttribute("color"),
   arc=q.geometry.getAttribute("fixtureTrackS02892"),
   alpha=q.geometry.getAttribute("fixtureAlpha02892"),
   warm=q.geometry.getAttribute("fixtureWarm02892");
  assert.equal(q.cyanStrips,20);
  assert.equal(q.warmStrips,20);
  assert.equal(q.detachedTAccents,0);
  assert.ok(q.coreQuads>q.cyanStrips+q.warmStrips);
  assert.equal(q.haloQuads,q.coreQuads*2);
  assert.equal(p.count,colors.count);
  assert.equal(p.count,arc.count);
  assert.equal(p.count,alpha.count);
  assert.equal(p.count,warm.count);
  assert.ok([...p.array].every(Number.isFinite));
  assert.ok([...arc.array].every(x=>x>=0&&x<=368));
  assert.ok([...alpha.array].every(x=>x>=0&&x<=1));
  assert.ok([...alpha.array].some(x=>x>.90),"core of short amber fixture must remain visible");
  assert.ok(new Set([...warm.array]).has(0));
  assert.ok(new Set([...warm.array]).has(1));
  assert.ok(q.triangles<11000,"bounded 4GB/High geometry");
  q.geometry.dispose();
  assert.equal(q.geometry.disposed,true);
 }
});
test("shader uses same nine zone palettes and shared banked world arc",()=>{
 const v="#include <common>\n#include <begin_vertex>",
  f="#include <common>\n#include <color_fragment>";
 const x=patchCeilingFixtureShader02892(v,f);
 assert.match(x.vertexShader,/attribute float fixtureTrackS02892;/);
 assert.match(x.fragmentShader,/uF92Old/);
 assert.match(x.fragmentShader,/uF92Next/);
 assert.match(x.fragmentShader,/uF92Start\+vF92Arc\*uF92Scale/);
 assert.match(x.fragmentShader,/uF92Front/);
 assert.match(x.fragmentShader,/uF92Lap/);
 assert.match(x.fragmentShader,/diffuseColor.a\*=clamp\(vF92Alpha/);
 assert.match(x.fragmentShader,/smoothstep\(-66.0,66.0/);
 assert.throws(()=>patchCeilingFixtureShader02892("missing",f),/anchors/);
});
test("real original cove geometry is replaced and reverts with NO extra scene object",()=>{
 const geometry=new FakeGeometry();
 const material={isMeshBasicMaterial:true,transparent:false,depthWrite:false,
  blending:4,needsUpdate:false,
  onBeforeCompile(shader){shader.fragmentShader+="\n// original cove";},
  customProgramCacheKey(){return "original-cove";}
 };
 const before=material.onBeforeCompile,key=material.customProgramCacheKey;
 const mesh={name:"SKYSHIFT 0.26.0 / stable cyan cove emitters",
  material,geometry};
 const group={children:[mesh]};
 const section={getObjectByName(n){
  return n==="SKYSHIFT · Tunnel Megastructure 0.21.1"?group:null;}};
 const module=planTrueSharedTunnel0281(3400)[3];
 const q=installCeilingFixtureCohesion02892(THREE,section,point,module,{
  enabled:true,lowMemory:false,trackLength:3400});
 assert.equal(q.active,true);
 assert.equal(group.children.length,1);
 assert.notEqual(mesh.geometry,geometry);
 assert.equal(material.transparent,true);
 assert.equal(material.blending,THREE.NormalBlending);
 assert.equal(q.stats().sameMeshAndDrawCall,true);
 assert.equal(q.stats().removedTAccents,20);
 const shader={vertexShader:"#include <common>\n#include <begin_vertex>",
  fragmentShader:"#include <common>\n#include <color_fragment>",
  uniforms:{}};
 material.onBeforeCompile(shader,null);
 assert.match(shader.fragmentShader,/original cove/);
 assert.match(shader.fragmentShader,/f92Signed/);
 assert.ok(material.customProgramCacheKey().includes("02892"));
 q.updateWave({shaderBaseStage:2,activeCount:1,fronts:[1400]});
 assert.equal(q.stats().waveStageColors[0],ZONE_PALETTES[2].light);
 assert.equal(q.stats().waveStageColors[1],ZONE_PALETTES[3].light);
 assert.equal(q.stats().waveFront,1400);
 assert.equal(shader.uniforms.uF92Start.value,module.start);
 assert.equal(shader.uniforms.uF92Scale.value,module.scale);
 assert.equal(shader.uniforms.uF92Front.value,1400);
 const upgraded=mesh.geometry;
 q.dispose();
 q.dispose();
 assert.equal(mesh.geometry,geometry);
 assert.equal(material.onBeforeCompile,before);
 assert.equal(material.customProgramCacheKey,key);
 assert.equal(material.transparent,false);
 assert.equal(material.blending,4);
 assert.equal(upgraded.disposed,true);
 assert.equal(group.children.length,1);
});
test("non-Vault / historic path touches no source or shader",()=>{
 const off=installCeilingFixtureCohesion02892(null,null,null,null,{
  enabled:false});
 assert.equal(off.active,false);
 assert.equal(off.stats().active,false);
 off.updateWave(null);off.dispose();
});
