// SKYSHIFT 0.21.1 — actual enclosed-vault geometry and driving invariants.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TUNNEL_MEGA_0211,TUNNEL_PROFILE_0211,TUNNEL_PORTALS_0211,installTunnelMegastructure}
 from "./tunnel-megastructure-v0211.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
class Group{
 name="";children=[];add(x){this.children.push(x)}removeFromParent(){}
 traverse(f){f(this);for(const child of this.children)child.traverse?.(f)}
}
class Geo{
 attributes={};index=null;setAttribute(k,v){this.attributes[k]=v}
 setIndex(a){this.index={array:a,count:a.length}}
 computeVertexNormals(){}computeBoundingSphere(){}dispose(){}
}
class Attr{constructor(a,n){this.array=a;this.itemSize=n;this.count=a.length/n}}
class Mesh{constructor(geometry,material){this.geometry=geometry;this.material=material}
 traverse(f){f(this)}}
class Material{constructor(o){Object.assign(this,o)}dispose(){}}
const THREE={Group,BufferGeometry:Geo,Float32BufferAttribute:Attr,
 Mesh,MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 DoubleSide:2,AdditiveBlending:2};
const pos=(s,x,y)=>({x,y,z:s});
test("arched roof is closed over the road; floor connects continuously to both walls",()=>{
 const world=new Group(),inst=installTunnelMegastructure(THREE,world,{positionAt:pos});
 const stats=inst.stats();
 assert.equal(stats.active,true);
 assert.equal(stats.status,"active");
 assert.equal(stats.drawBatches,4);
 assert.equal(stats.sampledRings,185);
 assert.equal(stats.profilePoints,TUNNEL_PROFILE_0211.length);
 assert.ok(stats.trianglesRendered<15000);
 assert.ok(stats.trianglesRendered>5000);
 assert.equal(world.children.length,1);
 const shell=world.children[0].children[0].geometry;
 assert.ok(shell.index.count>25000,"A continuous indexed sweep, not disconnected wall slabs");
 const v=shell.attributes.position.array,section=TUNNEL_PROFILE_0211.length;
 for(let ring=0;ring<stats.sampledRings;ring++){
  const at=j=>Array.from(v.slice(3*(ring*section+j),3*(ring*section+j+1)));
  const left=at(0),right=at(section-1),apex=at((section-1)/2);
  assert.ok(left[0]<-12&&left[0]>-13);
  assert.ok(right[0]>12&&right[0]<13);
  assert.ok(Math.abs(apex[0])<.001&&apex[1]>29.5&&apex[1]<30.3,
   "Continuous roof must cover track center");
  for(let j=0;j<section-1;j++){
   const [x0,y0]=at(j),[x1,y1]=at(j+1);
   assert.ok(Math.hypot(x1-x0,y1-y0)<7,
    "Tunnel profile cannot have unconnected floor/wall/roof gaps");
  }
 }
 assert.ok(Math.abs(v[2]-0)<1e-6);
 assert.ok(Math.abs(v[v.length-1]-368)<1e-5);
 assert.equal(TUNNEL_PORTALS_0211.length,10);
 assert.ok(Math.abs(TUNNEL_MEGA_0211.roofHeight-29.623)<.001);
 assert.equal(TUNNEL_MEGA_0211.previousRoofHeight,34.15);
});
test("0.21.1.1 lowers vault without moving deck, lower walls or tunnel ribs off profile",()=>{
 const oldWorld=new Group(),newWorld=new Group();
 const old=installTunnelMegastructure(THREE,oldWorld,{positionAt:pos,vaultHeightClassic:true});
 const next=installTunnelMegastructure(THREE,newWorld,{positionAt:pos});
 assert.equal(old.stats().status,"active");
 assert.equal(next.stats().status,"active");
 const o=oldWorld.children[0].children[0].geometry.attributes.position.array;
 const n=newWorld.children[0].children[0].geometry.attributes.position.array;
 assert.equal(o.length,n.length);
 const count=TUNNEL_PROFILE_0211.length;
 const apex=(count-1)/2;
 for(let ring=0;ring<next.stats().sampledRings;ring++){
  const base=ring*count*3;
  const off=base+apex*3;
  assert.ok(o[off+1]-n[off+1]>=4.45&&o[off+1]-n[off+1]<5,
    "Only 4-5m lower at the crown, without flattening the tunnel");
  for(const edge of [0,1,2,3,4,count-5,count-4,count-3,count-2,count-1]){
   const p=base+edge*3;
   assert.ok(Math.abs(o[p]-n[p])<1e-6);
   assert.ok(Math.abs(o[p+1]-n[p+1])<1e-6);
   assert.ok(Math.abs(o[p+2]-n[p+2])<1e-6);
  }
 }
 assert.equal(next.stats().colliders,0);
 assert.equal(next.stats().originalGRIPUntouched,true);
});
test("shoulder is real geometry outside original rails; no space-visible gap beside track",()=>{
 const group=new Group(),inst=installTunnelMegastructure(THREE,group,{positionAt:pos});
 const shell=group.children[0].children[0].geometry.attributes.position.array;
 const n=TUNNEL_PROFILE_0211.length;
 for(let i=0;i<inst.stats().sampledRings;i++){
  for(let k of [0,1,2,3,4,n-5,n-4,n-3,n-2,n-1]){
   const p=3*(i*n+k),x=shell[p],y=shell[p+1];
   assert.ok(Math.abs(x)>12.2,"Don't overlap playable deck");
   assert.ok(y>=.05&&y<=1.7,
    "Solid bank must run continuously to the root of the vault");
  }
 }
 assert.equal(TUNNEL_MEGA_0211.solidSideShoulders,true);
 assert.equal(TUNNEL_MEGA_0211.continuousCrossSection,true);
});
test("low-memory tunnel retains opaque entire vault and integrated neon, drops only halo",()=>{
 const g=new Group(),low=installTunnelMegastructure(THREE,g,{
  track:"skyline",lowMemory:true,positionAt:pos});
 assert.equal(low.stats().active,true);
 assert.equal(low.stats().drawBatches,3);
 assert.ok(g.children[0].children.some(x=>x.name.endsWith("/ CLOSED_SHELL")));
 assert.ok(g.children[0].children.some(x=>x.name.endsWith("/ INTEGRATED_LIGHT")));
 assert.ok(!g.children[0].children.some(x=>x.name.endsWith("/ HALO")));
 const alt=installTunnelMegastructure(THREE,new Group(),{track:"aurora",positionAt:pos});
 assert.equal(alt.stats().active,false);
});
test("flight physics, steering, grip, camera, road and colors are not replaced",()=>{
 const x=TUNNEL_MEGA_0211;
 assert.equal(x.physicsChanges,0);
 assert.equal(x.gripChanges,0);
 assert.equal(x.cameraChanges,0);
 assert.equal(x.roadGeometryChanged,false);
 assert.equal(x.newDynamicLights,0);
 assert.equal(x.colliderCount,0);
 assert.equal(x.newRenderPasses,0);
 const game=read("./game-v0210.mjs");
 assert.match(game,/tunnelMegaEnabled\?\(neonInteriorEnabled\?\s*\(tunnelSpectrumEnabled\?\(exteriorSealEnabled\?installExteriorLightSeal:installNeonDrivenInterior\):installClassicNeonInterior\):\s*installTunnelMegastructure\)/);
 assert.match(game,/tunnelMega"\)!=="classic"/);
 assert.match(game,/compareBeforeTunnel:"\?tunnelMega=classic"/);
 const current=read("./boot-v0210.js").match(/game-v0210\.mjs\?v=(0\.23\.0)/)?.[1];
 assert.ok(current,"game entry must carry a published release key");
 assert.ok(read("./index.html").includes(`boot-v0210.js?v=${current}`),
  "HTML boot asset must match game entry exactly");
 const old=read("./game-v0205.mjs");
 assert.ok(!old.includes("tunnel-megastructure-v0211"));
});
