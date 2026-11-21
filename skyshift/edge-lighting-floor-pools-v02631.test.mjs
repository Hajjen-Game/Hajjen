import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {EDGE_FLOOR_02631,railSegment02631,nearestFoot02631,
 railSourceData02631,floorY02631,createEmitterGeometry02631,
 createFloorPoolGeometry02631,patchEdgeRoadShader02631,
 installEdgeRoadShader02631,installEdgeLightingFloorPools02631}
 from "./edge-lighting-floor-pools-v02631.mjs";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const p=(s,l,y)=>({x:l,y,z:s});
class Attr{
 constructor(array,size){this.array=array;this.itemSize=size;this.count=array.length/size;}
 getX(i){return this.array[i*this.itemSize];}
}
class Geometry{
 constructor(){this.attributes={};}
 getAttribute(n){return this.attributes[n]??null;}
 setAttribute(n,a){this.attributes[n]=a;}
 deleteAttribute(n){delete this.attributes[n];}
 computeBoundingSphere(){}
 dispose(){}
}
const THREE={
 BufferGeometry:Geometry,Float32BufferAttribute:Attr,
 MeshBasicMaterial:class{constructor(params){Object.assign(this,params);}dispose(){}},
 Mesh:class{constructor(geo,mat){this.geometry=geo;this.material=mat;this.visible=true;}
  removeFromParent(){this.parent?.remove(this);}},
 DoubleSide:2,AdditiveBlending:3
};
test("0.26.3.1 adds only rendered lighting to a protected race world",()=>{
 assert.equal(EDGE_FLOOR_02631.version,"0.26.3.1");
 assert.equal(EDGE_FLOOR_02631.base,"0.26.3");
 assert.equal(EDGE_FLOOR_02631.comparison,"?edgeFloor=classic");
 for(const key of ["changesPhysics","changesGRIP","changesShip",
  "changesCamera","changesNativeWave","changesWhiteCore",
  "changesWorldLights","roadGeometryChanged","railGeometryChanged",
  "railCollidersChanged","roadCollidersChanged"])assert.equal(EDGE_FLOOR_02631[key],false,key);
 assert.equal(EDGE_FLOOR_02631.additionalDrawBatches,2);
 assert.equal(EDGE_FLOOR_02631.additionalDynamicLights,0);
 assert.equal(EDGE_FLOOR_02631.additionalPostprocessPasses,0);
 assert.equal(EDGE_FLOOR_02631.additionalTextures,0);
 const code=read("./edge-lighting-floor-pools-v02631.mjs");
 assert.doesNotMatch(code,/new THREE\.(PointLight|DirectionalLight|RectAreaLight|SpotLight)/);
 assert.doesNotMatch(code,/new THREE\.(WebGLRenderTarget|PMREMGenerator)/);
});
test("cyan edge segment is intentionally broken at 24m metal bays, not arrows",()=>{
 assert.ok(railSegment02631(8)>.98);
 assert.equal(railSegment02631(23.5),0);
 assert.ok(railSegment02631(24+8)>.98);
 assert.equal(railSegment02631(-1),0);
 assert.equal(railSegment02631(369),0);
 assert.ok(railSegment02631(368-0.4)>=0);
});
test("amber foot pools follow exactly the original 10 bay portals",()=>{
 for(const p of [0,42,80,118,156,198,240,282,324,363]){
  assert.ok(nearestFoot02631(p+1.15).weight>.99);
 }
 assert.equal(nearestFoot02631(-2).weight,0);
 assert.equal(nearestFoot02631(369).weight,0);
 assert.throws(()=>nearestFoot02631(NaN));
});
test("portal foot geometry is on the original curved floor OUTSIDE track",()=>{
 for(const s of [1.5,44,165,300,366])
  for(const x of [-13.5,13.5,-18.15,18.15,-22.2,22.2]){
   const y=floorY02631(x,s);
   assert.ok(Number.isFinite(y)&&y>=.075&&y<1.6,JSON.stringify({s,x,y}));
  }
 assert.throws(()=>floorY02631(11,165));
 assert.throws(()=>floorY02631(26,165));
 const hi=createEmitterGeometry02631(THREE,p,false,false);
 const low=createEmitterGeometry02631(THREE,p,true,false);
 assert.equal(hi.feet,20);
 assert.equal(low.feet,20);
 assert.ok(hi.strips>low.strips);
 assert.equal(hi.geometry.getAttribute("position").count*3,
  hi.geometry.getAttribute("color").count*3);
 const glow=createFloorPoolGeometry02631(THREE,p,false,false),
  glowLow=createFloorPoolGeometry02631(THREE,p,false,true);
 assert.equal(glow.pools,20);
 assert.equal(glowLow.pools,20);
 assert.ok(glow.triangles>glowLow.triangles);
 assert.equal(glow.geometry.getAttribute("color").itemSize,4);
 const pos=glow.geometry.getAttribute("position");
 // All floor-pool vertices are beyond the original rail and ABOVE original floor.
 for(let i=0;i<pos.count;i++){
  const x=Math.abs(pos.array[i*3]);
  assert.ok(x>12.3&&x<24.65);
 }
});
test("road nearest real cyan rail coordinates stay inside original bank",()=>{
 const geo=new Geometry();
 geo.setAttribute("aTrackCoord",new Attr([100,-10,100,10,165,0,500,0],2));
 geo.setAttribute("position",new Attr(Array(12).fill(0),3));
 const d=railSourceData02631(geo,p);
 assert.equal(d.vertices,4);
 assert.equal(d.inside,3);
 assert.ok(d.lit>0);
 assert.ok(d.arrays.edgeLeft02631[0]<0);
 assert.ok(d.arrays.edgeRight02631[0]>0);
 assert.ok(d.arrays.edgeLeft02631[11]===0);
 assert.ok(d.arrays.edgeFootMask02631[3]===0);
});
test("solarisolated GGX road samples and calm edge lobe compile for high and 4GB",()=>{
 const v="#include <common>\n#include <project_vertex>";
 const frag=[
  "#include <common>","varying vec2 vTrackCoord;",
  "float roadSolarMask=0.0;",
  "float whiteCore=0.0;",
  "float guided=0.0;",
  "float padCoverage=0.0;",
  "float r263Keep=0.0;",
  "float r263Fresnel=0.0;",
  "RE_Direct(r263Lamp,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);",
  "  (r263Keep*r263Fresnel*r263Surface);"
 ].join("\n");
 for(const mobile of [true,false]){
  const out=patchEdgeRoadShader02631(v,frag,{mobile});
  assert.match(out.vertexShader,/attribute vec3 edgeLeft02631,edgeRight02631/);
  assert.match(out.vertexShader,/viewMatrix\*vec4\(edgeRight02631/);
  assert.match(out.fragmentShader,/uniform float uEdgeFloor02631/);
  assert.match(out.fragmentShader,/reflectedLight.directDiffuse=e31DiffuseBackup/);
  assert.match(out.fragmentShader,/1.0-0.97\*clamp\(whiteCore/);
  assert.match(out.fragmentShader,/reflectedLight.directSpecular\+=e31Cool\+e31Warm/);
  assert.equal((out.fragmentShader.match(/RE_Direct\(e31Light,/g)||[]).length,mobile?1:2);
 }
 assert.throws(()=>patchEdgeRoadShader02631(v,"#include <common>"));
});
test("installation toggles full 0.26.3 A/B without touching colliders or road mesh",()=>{
 const mat={isMeshStandardMaterial:true,onBeforeCompile(){},
  customProgramCacheKey(){return "unchanged-GGX";},needsUpdate:false};
 const orig=mat.onBeforeCompile;
 const geo=new Geometry();
 geo.setAttribute("aTrackCoord",new Attr([155,-9,155,9,165,0],2));
 geo.setAttribute("position",new Attr(Array(9).fill(0),3));
 const world={children:[],add(m){this.children.push(m);m.parent=this;},
  remove(m){this.children=this.children.filter(x=>x!==m);}};
 const road={material:mat,geometry:geo};
 const controller=installEdgeLightingFloorPools02631(THREE,world,road,{
  positionAt:p,lowMemory:false,roadRebuild:{
   stats(){return {roadRebuild0263Active:true};}
  }
 });
 const stats=controller.stats();
 assert.equal(stats.edgeFloor02631Active,true,JSON.stringify(stats));
 assert.equal(stats.edgeFloor02631FootLights,20);
 assert.equal(stats.edgeFloor02631FloorPools,20);
 assert.equal(stats.edgeFloor02631RailSamples,2);
 assert.equal(world.children.length,2);
 controller.setComparison(0);
 assert.ok(world.children.every(c=>!c.visible));
 assert.equal(controller.stats().edgeFloor02631Strength,0);
 controller.setComparison(1);
 assert.ok(world.children.every(c=>c.visible));
 assert.match(mat.customProgramCacheKey(),/edge-floor-02631-high/);
 controller.dispose();
 assert.equal(world.children.length,0);
 assert.equal(mat.onBeforeCompile,orig);
 assert.equal(geo.getAttribute("edgeLeft02631"),null);
});
test("game cache key exposes 0.26.3.1 and new same-camera GPU proof",()=>{
 const game=read("./game-v0210.mjs"),index=read("./index.html"),
  boot=read("./boot-v0210.js");
 assert.match(boot,/game-v0210\.mjs\?v=0\.26\.3\.1/);
 assert.match(index,/Edge Lighting & Floor Pools/);
 assert.match(game,/edgeFloorEnabled=roadRebuildEnabled/);
 assert.ok(game.includes('get("edgeFloor")!=="classic"'));
 assert.match(game,/__skyshiftEdgeFloorProbe/);
 assert.match(game,/__skyshiftEdgeFloorFrameProof/);
 assert.match(game,/installEdgeLightingFloorPools02631/);
 assert.match(game,/createRoadSolarSpillController/);
});
