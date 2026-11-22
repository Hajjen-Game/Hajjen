// SKYSHIFT 0.21.0-B: graded material/lighting invariants.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CINEMATIC_GRADE_0210B,installCinematicGradeHero} from "../../cinematic-grade-v0210b.mjs";
import {installCinematicHero} from "../../cinematic-hero-v0210.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
class Group {
 children=[];name="";
 add(x){this.children.push(x)}
 removeFromParent(){}
 traverse(fn){fn(this);for(const x of this.children)x.traverse?.(fn)}
 getObjectByName(name){if(this.name===name)return this;
  for(const x of this.children){if(x.name===name)return x;
   const a=x.getObjectByName?.(name);if(a)return a}
  return null}
}
class Geo{
 attributes={};setAttribute(n,v){this.attributes[n]=v}
 computeVertexNormals(){}computeBoundingSphere(){}dispose(){}
}
class Attribute{constructor(a,n){this.array=a;this.itemSize=n;this.count=a.length/n}}
class Mesh{constructor(geometry,material){this.geometry=geometry;this.material=material}traverse(fn){fn(this)}}
class Material{constructor(p){Object.assign(this,p)}dispose(){}}
const THREE={Group,BufferGeometry:Geo,Float32BufferAttribute:Attribute,Mesh,
 MeshBasicMaterial:Material,MeshStandardMaterial:Material,DoubleSide:2,AdditiveBlending:2};
const positionAt=(s,x,y)=>({x,y,z:s});
test("Phase B physically shaded architecture adds three batches without affecting race",()=>{
 const world=new Group(),old=installCinematicHero(THREE,new Group(),{positionAt});
 const b=installCinematicGradeHero(THREE,world,{positionAt});
 assert.equal(old.stats().drawBatches,4);
 assert.equal(b.stats().status,"active");
 assert.equal(b.stats().gradeActive,true);
 assert.equal(b.stats().drawBatches,7);
 assert.equal(b.stats().gradeDrawBatches,3);
 assert.equal(b.stats().addedDynamicLights,0);
 assert.equal(b.stats().addedRenderPasses,0);
 assert.equal(b.stats().colliders,0);
 assert.equal(b.stats().originalGRIPUntouched,true);
 assert.equal(b.stats().roadMeshUntouched,true);
 const hull=world.getObjectByName("SKYSHIFT · Cinematic Megastructure 0.21.0-A");
 assert.ok(hull);
 const metal=hull.children.find(x=>x.name.endsWith("/ HULL"));
 const facet=hull.children.find(x=>x.name.endsWith("/ FACET"));
 assert.equal(metal.material.metalness,CINEMATIC_GRADE_0210B.hullMetalness);
 assert.equal(facet.material.roughness,CINEMATIC_GRADE_0210B.facetRoughness);
});
test("4GB mobile has graded architecture and bounce, but no road sheen",()=>{
 const w=new Group(),m=installCinematicGradeHero(THREE,w,{lowMemory:true,positionAt});
 assert.equal(m.stats().status,"active");
 assert.equal(m.stats().drawBatches,5);
 assert.equal(m.stats().staticRoadSheen,false);
 assert.equal(m.stats().bakedLightBounce,true);
 const a=w.getObjectByName("SKYSHIFT · Material & Light Response 0.21.0-B");
 assert.equal(a.children.length,2);
});
test("authored overlays follow real road and never enter protected flight envelope",()=>{
 const w=new Group();installCinematicGradeHero(THREE,w,{positionAt});
 const a=w.getObjectByName("SKYSHIFT · Material & Light Response 0.21.0-B");
 for(const mesh of a.children){
  const positions=mesh.geometry.attributes.position.array;
  for(let i=0;i<positions.length;i+=3){
   const [x,y,s]=positions.slice(i,i+3);
   assert.ok(s>=80&&s<=368);
   if(mesh.name.endsWith("/ SHEEN")){
    assert.ok(y>=.09&&y<=.19);
    assert.ok(Math.abs(x)>=6.9&&Math.abs(x)<=11.55);
   }else assert.ok(!(Math.abs(x)<14.35&&y<25.6&&y>-6.25));
  }
 }
});
test("A/B still selects exactly Phase A; Aurora is excluded",()=>{
 const off=installCinematicGradeHero(THREE,new Group(),{track:"aurora",positionAt});
 assert.equal(off.stats().active,false);
 const game=read("./game-v0210.mjs");
 assert.match(game,/cinematicGradeEnabled\?installCinematicGradeHero:installCinematicHero/);
 assert.match(game,/cinematicGrade"\)!=="classic"/);
 assert.match(game,/compareBeforeCinematicGrade:"\?cinematicGrade=classic"/);
 assert.match(read("./browser-cinematic-hero-v0210.mjs"),/cinematicGrade=classic/);
});
