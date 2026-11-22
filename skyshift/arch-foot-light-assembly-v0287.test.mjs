import test from "node:test";
import assert from "node:assert/strict";
import {TUNNEL_PORTALS_0211} from "./tunnel-megastructure-v0211.mjs";
import {archFootRelease0287,ARCH_FOOT_0287,
 buildArchFootAssembly0287,installArchFootAssembly0287}
 from "./arch-foot-light-assembly-v0287.mjs";
import {planTrueSharedTunnel0281} from "./true-shared-tunnel-renderer-v0281.mjs";

class BufferAttribute{
 constructor(array,itemSize){this.array=new Float32Array(array);this.itemSize=itemSize;this.count=this.array.length/itemSize;}
}
class BufferGeometry{
 constructor(){this.attributes={};this.disposed=false;}
 setAttribute(name,value){this.attributes[name]=value;return this;}
 getAttribute(name){return this.attributes[name];}
 computeBoundingSphere(){this.bounded=true;}
 computeVertexNormals(){this.normals=true;}
 dispose(){this.disposed=true;}
}
class MeshStandardMaterial{
 constructor(options){Object.assign(this,options);this.isMeshStandardMaterial=true;this.disposed=false;}
 dispose(){this.disposed=true;}
}
class Mesh{
 constructor(geometry,material){this.geometry=geometry;this.material=material;this.visible=true;this.isMesh=true;}
 removeFromParent(){this.parent?.remove(this);}
}
const THREE={BufferGeometry,Float32BufferAttribute:BufferAttribute,MeshStandardMaterial,Mesh,DoubleSide:2};
const sample=(s,x,y)=>({x,y,z:s});
const sourceName="SKYSHIFT 0.28.1 / original joined amber arch feet";
const sharedName="SKYSHIFT · Tunnel Megastructure 0.21.1";

test("0.28.7 release gate only changes new Vault: classic toggle and all historical art unchanged",()=>{
 for(const v of ["0.28.1","0.28.2","0.28.3","0.28.4","0.28.5","0.28.6"])
  assert.equal(archFootRelease0287("?track=vault&v="+v),false);
 assert.equal(archFootRelease0287("?track=vault&v=0.28.7"),true);
 assert.equal(archFootRelease0287("?track=vault&v=0.28.8"),true);
 assert.equal(archFootRelease0287("?track=vault&v=0.28.7&archFoot=classic"),false);
 assert.equal(archFootRelease0287("?track=skyline&v=0.28.7"),false);
 assert.equal(archFootRelease0287("?track=aurora&v=0.28.7"),false);
 assert.equal(ARCH_FOOT_0287.roadUntouched,true);
 assert.equal(ARCH_FOOT_0287.duplicateFootMeshes,0);
 assert.equal(ARCH_FOOT_0287.addedDynamicLights,0);
 assert.equal(ARCH_FOOT_0287.addedColliders,0);
});
test("geometry uses same original full 368m portals and safe banked wall shoulder",()=>{
 for(const mobile of [false,true]){
  const g=buildArchFootAssembly0287(THREE,sample,{lowMemory:mobile});
  assert.equal(g.fixtures,TUNNEL_PORTALS_0211.length*2);
  assert.equal(g.verticals,g.fixtures*(mobile?5:9));
  assert.equal(g.horizontals,g.fixtures*8);
  assert.equal(g.originalPortals,TUNNEL_PORTALS_0211.length);
  assert.equal(g.glowCells,TUNNEL_PORTALS_0211.length*2*(mobile?5:9)*(mobile?4:7));
  assert.equal(g.emitterGeometry.getAttribute("color").itemSize,4);
  assert.equal(g.emitterGeometry.getAttribute("color").count,
   g.emitterGeometry.getAttribute("position").count);
  assert.equal(g.mountGeometry.getAttribute("color"),undefined);
  assert.equal(g.mountGeometry.normals,true);
  assert.ok(g.emitterTriangles>g.mountTriangles);
  const p=g.emitterGeometry.getAttribute("position").array;
  for(let i=0;i<p.length;i+=3){
   const [x,y,s]=[p[i],p[i+1],p[i+2]];
   assert.ok(Number.isFinite(x+y+s));
   assert.ok(Math.abs(x)>=19.2, "not on the racing deck x="+x);
   assert.ok(Math.abs(x)<=25.75,"fixture did not fit actual arch x="+x);
   assert.ok(y>=0&&y<=3.7,"fixture is above lower arch / below floor y="+y);
   assert.ok(s>=0&&s<368,"portal out of 368m source");
  }
  g.emitterGeometry.dispose();g.mountGeometry.dispose();
 }
 const sections=planTrueSharedTunnel0281(3400);
 assert.equal(sections.length,10);
 assert.equal(sections.at(-1).end,3400);
});
test("install REPLACES original source foot geometry with joined L, never duplicates it, and cleanly reverts",()=>{
 const old=new BufferGeometry(),mat={isMeshBasicMaterial:true};
 const foot=new Mesh(old,mat);foot.name=sourceName;
 foot.renderOrder=3;
 const children=[foot],group={name:sharedName};
 const section={
  children,
  getObjectByName(n){return n===sharedName?group:null;},
  add(mesh){mesh.parent=this;children.push(mesh);},
  remove(mesh){children.splice(children.indexOf(mesh),1);mesh.parent=null;}
 };
 const off=installArchFootAssembly0287(THREE,section,sample,{enabled:false});
 assert.equal(off.active,false);
 assert.equal(foot.geometry,old);
 const mod=installArchFootAssembly0287(THREE,section,sample,{enabled:true});
 assert.equal(mod.active,true);
 assert.equal(mod.stats().fixtures,20);
 assert.equal(children.filter(x=>x.name===sourceName).length,1);
 assert.equal(children.length,2,"existing foot + one graphite mount only");
 assert.ok(foot.geometry!==old);
 assert.equal(foot.renderOrder,3);
 assert.equal(mod.stats().darkBaseStructuralBatches,1);
 assert.equal(mod.stats().addedLightSources,0);
 assert.equal(mod.stats().duplicateFootMeshes,0);
 const replacement=foot.geometry;
 const mount=children[1];
 mod.setComparison(0);
 assert.equal(foot.geometry,old,"classic uses the original visible 0.28.6 emitter");
 assert.equal(foot.visible,true);
 assert.equal(mount.visible,false);
 mod.setComparison(1);
 assert.equal(foot.geometry,replacement,"new source returns at exact pose");
 assert.equal(mount.visible,true);
 assert.equal(mount.material.isMeshStandardMaterial,true);
 assert.ok(mount.geometry.getAttribute("position").count>100);
 mod.dispose();mod.dispose();
 assert.equal(foot.geometry,old);
 assert.equal(foot.visible,true);
 assert.equal(children.length,1);
 assert.equal(replacement.disposed,true);
 assert.equal(mount.geometry.disposed,true);
 assert.equal(mount.material.disposed,true);
 assert.equal(old.disposed,false);
});
