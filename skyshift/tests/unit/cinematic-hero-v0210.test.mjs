// SKYSHIFT 0.21.0 Phase A — structural and unchanged-physics acceptance.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {HERO_0210,HERO_BAYS_0210,planCinematicHero,installCinematicHero}
 from "../../cinematic-hero-v0210.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
class Group{
 children=[];name="";add(m){this.children.push(m)}
 removeFromParent(){}
 traverse(fn){this.children.forEach(fn)}
}
class BufferGeometry{
 attributes={};setAttribute(k,v){this.attributes[k]=v}
 computeVertexNormals(){}computeBoundingSphere(){}dispose(){}
}
class Attr{constructor(a,n){this.array=a;this.itemSize=n;this.count=a.length/n}}
class Mesh{constructor(geometry,material){this.geometry=geometry;this.material=material}}
class Material{constructor(p){Object.assign(this,p)}dispose(){}}
const THREE={Group,BufferGeometry,Float32BufferAttribute:Attr,Mesh,
 MeshBasicMaterial:Material,MeshStandardMaterial:Material,DoubleSide:2,
 AdditiveBlending:2};
const positionAt=(s,x,y)=>({x,y,z:s});
test("hero completely replaces the old station in the same 288m track interval",()=>{
 const p=planCinematicHero();
 assert.equal(p.active,true);assert.equal(p.bays.length,18);
 assert.equal(p.bays[0].start,80);assert.equal(p.bays.at(-1).end,368);
 assert.ok(new Set(HERO_BAYS_0210).size>=6);
 assert.equal(planCinematicHero("aurora").active,false);
 assert.equal(HERO_0210.roadMeshUntouched,true);
 assert.equal(HERO_0210.physicsChanges,0);
 assert.equal(HERO_0210.dynamicLights,0);
 assert.equal(HERO_0210.extraRenderPasses,0);
});
test("new station has load-bearing 3D geometry instead of legacy square-panel asset",()=>{
 const world=new Group();
 const installed=installCinematicHero(THREE,world,{positionAt});
 const stat=installed.stats();
 assert.equal(stat.status,"active");
 assert.equal(stat.drawBatches,4);
 assert.equal(stat.installedBays,18);
 assert.ok(stat.trianglesRendered>1500);
 assert.ok(stat.trianglesRendered<12000,
  "Phase A must not explode mobile draw or triangle budget");
 assert.equal(world.children.length,1);
 assert.match(world.children[0].name,/Cinematic Megastructure/);
 let maxX=0,highInner=0,lowerSide=0;
 for(const mesh of world.children[0].children){
  const positions=mesh.geometry.attributes.position.array;
  for(let i=0;i<positions.length;i+=3){
   const [x,y,s]=positions.slice(i,i+3);
   assert.ok(Number.isFinite(x+y+s));
   assert.ok(s>=80&&s<=368);
   assert.ok(!(Math.abs(x)<14.35&&y<25.6&&y>-6.25),
    "No architectural mesh may cut into original flight clearance");
   maxX=Math.max(maxX,Math.abs(x));
   if(y>27&&Math.abs(x)<12)highInner++;
   if(y>10&&y<24&&Math.abs(x)>14.4&&Math.abs(x)<20)lowerSide++;
  }
 }
 assert.ok(maxX>25,"Station needs actual lateral depth");
 assert.ok(highInner>200,"Hero needs thick inset monumental overhead forms");
 assert.ok(lowerSide>1000,"Hero needs properly sculpted wall surface");
 assert.equal(stat.colliders,0);
 assert.equal(stat.originalGRIPUntouched,true);
});
test("low-memory mobile omits only optional halo; Aurora stays unchanged",()=>{
 const low=installCinematicHero(THREE,new Group(),{positionAt,lowMemory:true});
 assert.equal(low.stats().drawBatches,3);
 assert.equal(low.stats().status,"active");
 const off=installCinematicHero(THREE,new Group(),{
  track:"aurora",positionAt});
 assert.equal(off.stats().active,false);
});
test("new version is actually wired as the default, with an exact classic A/B",()=>{
 const g=read("./game-v0210.mjs"),boot=read("./boot-v0210.js");
 const html=read("./index.html");
 assert.match(g,/import \{HERO_0210,installCinematicHero\}/);
 assert.match(g,/cinematicHeroEnabled\?\(cinematicGradeEnabled\?installCinematicGradeHero:installCinematicHero\)/);
 assert.match(g,/cinematicHero"\)!=="classic"/);
 assert.match(g,/compareBeforeCinematicHero:"\?cinematicHero=classic"/);
 const current=boot.match(/game-v0210\.mjs\?v=(0\.26\.\d+)/)?.[1];
 assert.ok(current,"a real 0.23.1 module build must be published");
 assert.ok(html.includes(`boot-v0210.js?v=${current}`),
  "HTML boot cache key must match the exact game-module version");
 assert.equal(read("./legacy/game/game-v0205.mjs").includes(
  'from "./cinematic-hero-v0210.mjs"'),false,
  "The 0.20.5 engine baseline stays untouched");
});
