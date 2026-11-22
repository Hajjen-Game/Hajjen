// SKYSHIFT 0.13.3 — verify the SHIPPED mesh and the actual showroom.
// These tests do not pretend a Blender GLB was exported; the checked-in V2
// is a self-contained glTF authored by the reproducible offline source.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildStingrayHeroV2GLTF,HERO_V2_SPEC}
 from "../../blender/stingray-hero-v2-source-v0133.mjs";
import {SHIP_ART_0133,requestedShipArt,assessHeroAsset}
 from "../../ship-art-pipeline-v0133.mjs";
import {createStingrayHeroShowroom,HANGAR_HERO_0133}
 from "../../hangar-hero-v0133.mjs";
const source=readFileSync(new URL("../../"+"./assets/ships/stingray-evo-hero-v2.gltf",
 import.meta.url),"utf8");
const asset=JSON.parse(source);
const binary=Buffer.from(asset.buffers[0].uri.split(",")[1],"base64");
const mesh=n=>{const i=asset.meshes.findIndex(m=>m.name===n);
 assert.ok(i>=0,"missing mesh "+n);return asset.meshes[i]};
function points(name){
 const p=mesh(name).primitives[0],
  acc=asset.accessors[p.attributes.POSITION],
  view=asset.bufferViews[acc.bufferView],
  offset=(view.byteOffset??0)+(acc.byteOffset??0);
 const dv=new DataView(binary.buffer,binary.byteOffset+offset,acc.count*12);
 return Array.from({length:acc.count},(_,i)=>
  [dv.getFloat32(i*12,true),dv.getFloat32(i*12+4,true),
   dv.getFloat32(i*12+8,true)]);
}
const range=(pts,k)=>[Math.min(...pts.map(p=>p[k])),
 Math.max(...pts.map(p=>p[k]))];
const expected=["Hero_Hull_Spine","Hero_Wing_L","Hero_Wing_R",
 "Hero_Canopy","Hero_Engine_L","Hero_Engine_R","Hero_Edge_L",
 "Hero_Edge_R",...Array.from({length:9},(_,i)=>
 "Hero_Tail_Plate_"+String(i+1).padStart(2,"0"))];
test("the deployed hero V2 glTF is fully reproducible from checked-in source",()=>{
 const built=buildStingrayHeroV2GLTF();
 assert.equal(source,built.content,"Asset must equal the authored sculpt exactly");
 assert.equal(built.stats.triangles,3356);
 assert.equal(built.stats.meshes,34);
 assert.equal(built.stats.materials,9);
 assert.ok(source.length<SHIP_ART_0133.maxAssetBytes);
 assert.ok(!asset.images&&!asset.textures&&!asset.skins&&!asset.animations);
 assert.ok(!asset.extensionsUsed?.includes("KHR_lights_punctual"));
 assert.equal(HERO_V2_SPEC.physicsChanged,false);
});
test("all real 17 mesh sockets and the 9 articulated plates exist",()=>{
 for(const name of expected)assert.ok(asset.nodes.some(n=>n.name===name));
 assert.equal(asset.meshes.length,34);
 assert.equal(asset.materials.length,9);
 assert.equal(binary.byteLength,asset.buffers[0].byteLength);
 assert.equal(SHIP_ART_0133.tailSegments,9);
 assert.equal(SHIP_ART_0133.tailSegmentLength,.68);
 assert.equal(SHIP_ART_0133.hasCollision,false);
});
test("manta wings are truly three-dimensional curved surfaces, not 2D plates",()=>{
 for(const side of ["L","R"]){
  const wing=points("Hero_Wing_"+side),x=range(wing,0),
   height=range(wing,1),depth=range(wing,2);
  assert.ok(x[0]<-3.76||x[1]>3.76,"wings must span ±3.78 m");
  assert.ok(height[1]>.50&&height[0]<.11,
   "wing sculpt must have high crown and thick lower surface");
  assert.ok(depth[0]<-2.30&&depth[1]>2.50);
  assert.ok(mesh("Hero_Wing_"+side).primitives[0].indices!==undefined);
  const rise=wing.filter(p=>Math.abs(Math.abs(p[0])-1.39)<.003);
  assert.ok(range(rise,1)[1]-range(rise,1)[0]>.18,
   "thick cambered wing root must be measurable in actual vertex data");
 }
});
test("the raised glazed canopy and inset engine pods have proper 3D volume",()=>{
 const canopy=points("Hero_Canopy"),y=range(canopy,1);
 assert.ok(y[1]>.94,"canopy should rise above body");
 assert.ok(y[0]<.35&&y[1]-y[0]>.58);
 for(const [name,x] of [["Hero_Engine_L",-1.99],
  ["Hero_Engine_R",1.99]]){
  const pts=points(name),xs=range(pts,0),z=range(pts,2),yy=range(pts,1);
  assert.ok(Math.abs((xs[0]+xs[1])/2-x)<.005);
  assert.ok(z[0]<1.14&&z[1]>2.40);
  assert.ok(yy[1]-yy[0]>.48,"engine nacelle is a real 3D fairing");
 }
 const glass=asset.materials.find(m=>m.name.includes("Smoked glass"));
 assert.ok(glass.pbrMetallicRoughness.metallicFactor<.2);
 assert.ok(glass.emissiveFactor[2]>.08);
});
test("nine armored tail plates keep original local pivots and taper",()=>{
 let previous=Infinity;
 for(let i=1;i<=9;i++){
  const n="Hero_Tail_Plate_"+String(i).padStart(2,"0"),
   pts=points(n),width=range(pts,0),z=range(pts,2),y=range(pts,1);
  assert.ok(z[0]>=-.001&&z[1]<.68,"tail must be joint-local");
  assert.ok(y[1]-y[0]>.07,"mechanical plate has depth");
  const size=width[1]-width[0];
  assert.ok(size<previous,"tail must taper tipward");
  previous=size;
 }
 assert.ok(previous<.25);
});
test("hero defaults only on Stingray and has explicit classic fallback",()=>{
 assert.equal(requestedShipArt(""),"hero");
 assert.equal(requestedShipArt("?shipArt=hero"),"hero");
 assert.equal(requestedShipArt("?shipArt=classic"),"procedural");
 assert.equal(requestedShipArt("?shipArt=off"),"procedural");
 assert.equal(SHIP_ART_0133.defaultMode,"hero");
 assert.equal(SHIP_ART_0133.v0133HeroDefault,true);
 assert.equal(SHIP_ART_0133.assetPath,
  "./assets/ships/stingray-evo-hero-v2.gltf");
 assert.equal(SHIP_ART_0133.maxDrawCalls,34);
});
test("published scene passes the real runtime budget/mesh contract",()=>{
 const materialPool=asset.materials.map(m=>({name:m.name})),
  children=asset.nodes.map(node=>{
   const p=asset.meshes[node.mesh].primitives[0],obj={
    isMesh:true,name:node.name,material:materialPool[p.material],
    geometry:{
     attributes:{position:{count:asset.accessors[p.attributes.POSITION].count}},
     index:{count:asset.accessors[p.indices].count}},
    traverse(f){f(this)}
   };
   return obj;
  });
 const root={traverse(f){for(const c of children)c.traverse(f)}};
 const result=assessHeroAsset(root);
 assert.equal(result.valid,true,JSON.stringify(result.errors));
 assert.equal(result.meshes,34);
 assert.equal(result.triangles,3356);
 assert.equal(result.materials,9);
 assert.equal(result.textureImages,0);
 assert.equal(result.lights,0);
 assert.equal(result.skinned,0);
});
class Vec3{
 constructor(x=0,y=0,z=0){this.set(x,y,z)}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 copy(v){return this.set(v.x,v.y,v.z)}
}
class Scene{
 constructor(){this.list=[]}
 add(...items){this.list.push(...items)}
 remove(...items){this.list=this.list.filter(v=>!items.includes(v))}
}
class Obj{constructor(){this.position=new Vec3()}updateMatrixWorld(){}}
class Directional extends Obj{
 constructor(c,i){super();this.color=c;this.intensity=i;
  this.castShadow=false;this.visible=false}
}
test("showroom enhances only paused Hangar; two lights go dark in races",()=>{
 const THREE={Object3D:Obj,DirectionalLight:Directional,Vector3:Vec3};
 const scene=new Scene(),rig=createStingrayHeroShowroom(THREE,scene);
 const ship={localToWorld(v){return v}},camera={
  fov:67,position:new Vec3(),updateProjectionMatrix(){this.updated=true},
  lookAt(v){this.target={x:v.x,y:v.y,z:v.z}}
 };
 assert.equal(rig.frame({hangar:true,ship,shipId:"stingray",camera,time:1}),true);
 assert.equal(rig.stats().lightsVisible,2);
 assert.ok(camera.fov>=61&&camera.fov<=62);
 assert.ok(camera.position.z<8.0&&camera.position.y>2.5);
 assert.ok(camera.target.x<-4.0);
 assert.equal(rig.frame({hangar:false,ship,shipId:"stingray",camera}),false);
 assert.equal(rig.stats().lightsVisible,0);
 assert.equal(rig.stats().extraLightsInRace,0);
 assert.equal(HANGAR_HERO_0133.originalRaceCameraUnchanged,true);
 assert.equal(HANGAR_HERO_0133.originalTrackVisible,true);
});
