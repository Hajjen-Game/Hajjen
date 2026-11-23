// SKYSHIFT 0.13.4 — test the actual shipped 3D mesh, not an idealized mock.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildStingrayHeroV3GLTF,HERO_V3_SPEC}
 from "../../blender/stingray-hero-v3-source-v0134.mjs";
import {SHIP_ART_0134,assessHeroAsset,requestedShipArt}
 from "../../ships/ship-art-pipeline-v0134.mjs";
import {HANGAR_HERO_0134,createStingrayHeroShowroom}
 from "../../ships/hangar-hero-v0134.mjs";
const source=readFileSync(new URL("../../"+"./assets/ships/stingray-evo-hero-v3.gltf",
 import.meta.url),"utf8");
const asset=JSON.parse(source);
const binary=Buffer.from(asset.buffers[0].uri.split(",")[1],"base64");
function mesh(name){
 const j=asset.meshes.findIndex(m=>m.name===name);
 assert.ok(j>=0,"Missing sculpted V3 part "+name);
 return asset.meshes[j];
}
function points(name){
 const p=mesh(name).primitives[0],
  a=asset.accessors[p.attributes.POSITION],
  v=asset.bufferViews[a.bufferView],
  start=(v.byteOffset??0)+(a.byteOffset??0),
  d=new DataView(binary.buffer,binary.byteOffset+start,a.count*12);
 return Array.from({length:a.count},(_,i)=>[
  d.getFloat32(i*12,true),d.getFloat32(i*12+4,true),
  d.getFloat32(i*12+8,true)]);
}
const ext=(a,k)=>[Math.min(...a.map(v=>v[k])),Math.max(...a.map(v=>v[k]))];
const countTriangles=()=>asset.meshes.reduce((n,m)=>
 n+asset.accessors[m.primitives[0].indices].count/3,0);
test("V3 sculpt is reproducible, self-contained and A51-budgeted",()=>{
 const built=buildStingrayHeroV3GLTF();
 assert.equal(source,built.content,"Published 3D file differs from source generator");
 assert.equal(countTriangles(),4184);
 assert.equal(asset.meshes.length,34);
 assert.equal(asset.materials.length,9);
 assert.equal(binary.length,asset.buffers[0].byteLength);
 assert.ok(source.length<700000);
 assert.ok(!asset.images&&!asset.textures&&!asset.skins&&!asset.animations);
 assert.equal(HERO_V3_SPEC.physicsChanged,false);
});
test("manta outline has more sweep and span, without angular wing notches",()=>{
 for(const side of ["L","R"]){
  const p=points("Hero_Wing_"+side);
  const x=ext(p,0),z=ext(p,2),y=ext(p,1);
  assert.ok(x[0]<=-4.039||x[1]>=4.039);
  assert.ok(z[0]<-2.47&&z[1]>2.48);
  assert.ok(y[1]>.48&&y[0]<.15);
  // 17 stations × 15 chord samples with a distinct lower wing surface.
  assert.equal(p.length,17*15*2);
  assert.ok(ext(p.filter(v=>Math.abs(Math.abs(v[0])-1.45)<.002),1)[1]-
    ext(p.filter(v=>Math.abs(Math.abs(v[0])-1.45)<.002),1)[0]>.17);
 }
 assert.equal(HERO_V3_SPEC.wingHalfSpan,4.04);
});
test("glass is LOWER, LONGER and integral to centerline than v0.13.3",()=>{
 const a=points("Hero_Canopy"),y=ext(a,1),z=ext(a,2);
 assert.ok(y[1]<.78&&y[1]>.68,"cockpit must not be a tall capsule");
 assert.ok(z[0]<-2.77&&z[1]>.68,"canopy must be long and tapered");
 const glass=asset.materials.find(m=>m.name.includes("Smoked glass"));
 assert.ok(glass);
 assert.ok(glass.pbrMetallicRoughness.baseColorFactor[2]<.10);
 assert.ok(glass.emissiveFactor[2]<.06);
});
test("twin aerodynamic engine housings emerge from wings at legacy sockets",()=>{
 for(const [side,x] of [["L",-1.99],["R",1.99]]){
  const p=points("Hero_Engine_"+side),xs=ext(p,0),ys=ext(p,1),zs=ext(p,2);
  assert.ok(Math.abs((xs[0]+xs[1])/2-x)<.003);
  assert.ok(zs[0]<.92&&zs[1]>2.51);
  assert.ok(ys[1]-ys[0]>.50);
  assert.ok(mesh("Hero_Detail_Engine_Core_"+side));
 }
});
test("nine joint-local tail plates start stronger and taper substantially",()=>{
 const widths=[];
 for(let i=1;i<=9;i++){
  const p=points("Hero_Tail_Plate_"+String(i).padStart(2,"0")),
   x=ext(p,0),y=ext(p,1),z=ext(p,2);
  widths.push(x[1]-x[0]);
  assert.ok(z[0]>=-.001&&z[1]<.68);
  assert.ok(y[1]-y[0]>.065);
 }
 assert.ok(widths[0]>.78);
 assert.ok(widths[8]<.24);
 for(let i=1;i<9;i++)assert.ok(widths[i]<widths[i-1]);
 assert.equal(SHIP_ART_0134.tailSegments,9);
});
test("hard surface recesses and restrained accents preserve nine PBR materials",()=>{
 assert.ok(asset.meshes.some(m=>m.name==="Hero_Detail_Vent_A_L"));
 assert.ok(asset.meshes.some(m=>m.name==="Hero_Detail_Vent_B_R"));
 const body=asset.materials.find(m=>m.name.includes("swept manta"));
 assert.ok(body.pbrMetallicRoughness.baseColorFactor[2]<.4);
 const violet=asset.materials.find(m=>m.name.includes("wing rim"));
 assert.ok(violet.emissiveFactor[0]<.6);
 const cockpit=asset.materials.find(m=>m.name.includes("embedded canopy"));
 assert.ok(cockpit.pbrMetallicRoughness.roughnessFactor>=.18);
});
test("published geometry passes runtime node/materials/triangle validation",()=>{
 const materialPool=asset.materials.map(m=>({name:m.name}));
 const children=asset.nodes.map(node=>{
  const prim=asset.meshes[node.mesh].primitives[0];
  return {name:node.name,isMesh:true,
   material:materialPool[prim.material],
   geometry:{attributes:{position:{count:asset.accessors[prim.attributes.POSITION].count}},
    index:{count:asset.accessors[prim.indices].count}},
   traverse(f){f(this)}};
 });
 const root={traverse(f){for(const c of children)c.traverse(f)}};
 const a=assessHeroAsset(root);
 assert.equal(a.valid,true,JSON.stringify(a.errors));
 assert.equal(a.triangles,4184);
 assert.equal(a.meshes,34);
 assert.equal(a.materials,9);
 assert.equal(a.lights,0);
 assert.equal(a.skinned,0);
 assert.equal(a.textureImages,0);
});
test("Stingray new default, Manta unaffected and old model remains selectable",()=>{
 assert.equal(requestedShipArt(""),"hero");
 assert.equal(requestedShipArt("?shipArt=classic"),"procedural");
 assert.equal(requestedShipArt("?shipArt=off"),"procedural");
 assert.equal(SHIP_ART_0134.assetPath,"../assets/ships/stingray-evo-hero-v3.gltf");
 assert.equal(SHIP_ART_0134.defaultMode,"hero");
 assert.equal(SHIP_ART_0134.hasCollision,false);
});
// Camera coordinates are in ship-local units. The important fixed landmark
// points should all land inside the rightmost 55% on a 1536×690 landscape
// screen without clipping the tail into the Hangar footer.
function project(point){
 const eye=HANGAR_HERO_0134.localEye,look=HANGAR_HERO_0134.localLook;
 const sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
 const norm=v=>{const mag=Math.hypot(...v);return v.map(x=>x/mag)};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const forward=norm(sub(look,eye)),right=norm(cross(forward,[0,1,0])),
  up=cross(right,forward),d=sub(point,eye),depth=dot(d,forward),
  k=Math.tan(HANGAR_HERO_0134.heroFov*Math.PI/360);
 return [768*(1+dot(d,right)/(depth*k*1536/690)),
  345*(1-dot(d,up)/(depth*k))];
}
test("Hangar camera keeps BOTH wing tips, nose and entire mechanical tail visible",()=>{
 const landmarks=[
  [-4.04,.18,.33],[4.04,.18,.33],[0,.1,-3.22],
  [0,.16,7.8],[0,.73,-1.3],[-1.99,.22,2.56],[1.99,.22,2.56]
 ];
 for(const pt of landmarks){
  const [x,y]=project(pt);
  assert.ok(x>710&&x<1450&&y>275&&y<573,
   "clipped silhouette part "+JSON.stringify({pt,x,y}));
 }
 assert.ok(HANGAR_HERO_0134.keyIntensity<.8);
 assert.ok(HANGAR_HERO_0134.rimIntensity<.4);
 assert.equal(HANGAR_HERO_0134.gameplayLights,0);
});
class Vector{constructor(x=0,y=0,z=0){this.set(x,y,z)}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 copy(v){return this.set(v.x,v.y,v.z)}}
class Obj{constructor(){this.position=new Vector()}updateMatrixWorld(){}}
class Light extends Obj{constructor(){super();this.visible=false;this.castShadow=false}}
class Scene{constructor(){this.nodes=[]}add(...a){this.nodes.push(...a)}
 remove(...a){this.nodes=this.nodes.filter(x=>!a.includes(x))}}
test("extra showcase lighting is disabled outside hangar",()=>{
 const rig=createStingrayHeroShowroom({
  Object3D:Obj,DirectionalLight:Light,Vector3:Vector},new Scene());
 const ship={localToWorld(v){return v}},
  camera={position:new Vector(),fov:67,lookAt(){},updateProjectionMatrix(){}};
 assert.equal(rig.frame({hangar:true,ship,shipId:"stingray",camera,time:1}),true);
 assert.equal(rig.stats().lightsVisible,2);
 assert.equal(rig.frame({hangar:false,ship,shipId:"stingray",camera}),false);
 assert.equal(rig.stats().lightsVisible,0);
 assert.equal(rig.stats().extraLightsInRace,0);
});
