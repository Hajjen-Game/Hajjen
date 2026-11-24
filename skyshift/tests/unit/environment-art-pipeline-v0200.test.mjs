// SKYSHIFT 0.20.0 — World Art Pipeline deterministic regression tests.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {WORLD_ART_0200,planStationWorld,bakeTrackConformingBayGeometry} from "../../world/environment-art-pipeline-v0200.mjs";
import {STATION_ART_0200,buildStationAsset} from "../../world/authoring/build-station-world-v0200.mjs";
import {TRIAL,SKYLINE_LEAP,positionAt} from "../../trial-v0165.mjs";
const src=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const gltf=JSON.parse(src("./assets/worlds/continuum-bays-v1.gltf"));
test("World Art station is contiguous, coherent, and fits before first Skyline leap",()=>{
 const p=planStationWorld();
 assert.equal(p.stats.bayCount,18);
 assert.equal(p.stats.meters,288);
 assert.equal(p.bays[0].start,80);
 assert.equal(p.bays.at(-1).end,368);
 assert.ok(p.bays.at(-1).end<SKYLINE_LEAP.start);
 assert.equal(TRIAL.length,3400);
 for(let i=1;i<p.bays.length;i++)
  assert.equal(p.bays[i].start,p.bays[i-1].end);
 assert.equal(p.stats.variants.GATE,2);
 assert.ok(p.stats.panoramaWindowBays>=12);
 assert.equal(p.stats.openRoof,true);
 assert.equal(p.stats.colliders,0);
 assert.equal(p.stats.physicsChanges,0);
});
test("Real glTF asset is checked in, reproducible, compact and self-contained",()=>{
 const {gltf:recreated,statistics}=buildStationAsset();
 assert.deepEqual(gltf,recreated);
 assert.equal(gltf.asset.version,"2.0");
 assert.equal(statistics.meshes,12);
 assert.equal(statistics.materialCount,4);
 assert.ok(statistics.triangles<=WORLD_ART_0200.maxTrianglesPerAsset);
 assert.ok(src("./assets/worlds/continuum-bays-v1.gltf").length<=WORLD_ART_0200.maxAssetBytes);
 assert.equal(gltf.buffers.length,1);
 assert.match(gltf.buffers[0].uri,/^data:application\/octet-stream;base64,/);
 const decoded=Buffer.from(gltf.buffers[0].uri.split(",")[1],"base64");
 assert.equal(decoded.byteLength,gltf.buffers[0].byteLength);
 assert.equal(gltf.meshes.length,12);
 assert.equal(gltf.meshes.filter(x=>x.name.includes("GLASS")).length,3);
});
test("Every mesh has authored normals and colors and avoids flight envelope",()=>{
 const bytes=Buffer.from(gltf.buffers[0].uri.split(",")[1],"base64");
 for(const mesh of gltf.meshes){
  const prim=mesh.primitives[0],attrs=prim.attributes;
  assert.ok(Number.isInteger(attrs.POSITION));
  assert.ok(Number.isInteger(attrs.NORMAL));
  assert.ok(Number.isInteger(attrs.COLOR_0));
  const pos=gltf.accessors[attrs.POSITION];
  const view=gltf.bufferViews[pos.bufferView];
  assert.equal(pos.count%3,0);
  assert.ok(pos.count>0);
  for(let i=0;i<pos.count;i++){
   const at=view.byteOffset+i*12;
   const x=bytes.readFloatLE(at),y=bytes.readFloatLE(at+4),
    z=bytes.readFloatLE(at+8);
   assert.ok([x,y,z].every(Number.isFinite));
   assert.ok(Math.abs(x)>=17.5||y>=30,
    "Interior geometry must remain outside pilot corridor: "+mesh.name);
   assert.ok(Math.abs(z)<=8.2,"All modules join with at most 0.2m overlap at joint fins");
  }
 }
 assert.ok(gltf.materials.find(x=>x.name==="Panoramic Glass")?.alphaMode==="BLEND");
});
test("Low-memory version retains whole interior without glass draw batches",()=>{
 const low=planStationWorld({lowMemory:true});
 assert.equal(low.bays.length,18);
 assert.equal(low.stats.panoramaWindowBays,14);
 assert.equal(low.stats.openRoof,true);
 assert.equal(WORLD_ART_0200.maxBatchesHigh,4);
 assert.equal(WORLD_ART_0200.maxBatchesLow,3);
 assert.equal(WORLD_ART_0200.addedDynamicLights,0);
 assert.equal(WORLD_ART_0200.addedRenderPasses,0);
});
test("Aurora remains independent and classic mode loads legacy geometry",()=>{
 assert.equal(planStationWorld({track:"aurora"}).active,false);
 assert.equal(planStationWorld({track:"aurora"}).bays.length,0);
 const game=src("./legacy/game/game-v0200.mjs");
 assert.match(game,/from "\.\.\/\.\.\/trial-v0165\.mjs"/);
 assert.match(game,/from "\.\.\/\.\.\/flight\/unified-flight-v0165\.mjs"/);
 assert.match(game,/from "\.\.\/\.\.\/flight\/cinematic-v0165\.mjs"/);
 assert.match(game,/from "\.\.\/\.\.\/world\/environment-art-pipeline-v0200\.mjs"/);
 assert.match(game,/if\(rebirthEnabled\)stationWorld=installWorldArt/);
 assert.match(game,/if\(envEnabled&&!rebirthEnabled\)signatureEnvironment=/);
 assert.match(game,/version:"0\.20\.0"/);
 assert.match(src("./index.html"),/boot-v0205\.js\?v=0\.20\.5/);
 assert.match(src("./legacy/boot/boot-v0200.js"),/game-v0200\.mjs\?v=0\.20\.0/);
});

test("Real curves have zero station-bay seam distance, even in banked turns",()=>{
 // Minimal THREE-shaped BufferGeometry harness; exercises the *same bake*
 // routine as Chrome without needing a second copy of the placement math.
 class Attr{
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize}
  getX(i){return this.array[3*i]}
  getY(i){return this.array[3*i+1]}
  getZ(i){return this.array[3*i+2]}
 }
 class Geo{
  attributes={};userData={};
  setAttribute(k,v){this.attributes[k]=v}
  computeVertexNormals(){}
  computeBoundingSphere(){}
 }
 const THREE={BufferGeometry:Geo,BufferAttribute:Attr};
 const variants=WORLD_ART_0200.variants;
 const nodes=new Map(variants.map(variant=>[
  variant+"_SHELL",{geometry:{attributes:{
   position:new Attr(new Float32Array([25,15,-8,25,15,8]),3),
   color:new Attr(new Float32Array([.2,.4,.6,.2,.4,.6]),3)
  }}}
 ]));
 const geo=bakeTrackConformingBayGeometry(THREE,planStationWorld(),nodes,
  "SHELL",positionAt);
 const positions=geo.attributes.position.array;
 const d=(a,b)=>Math.hypot(
  positions[3*a]-positions[3*b],
  positions[3*a+1]-positions[3*b+1],
  positions[3*a+2]-positions[3*b+2]);
 for(let i=0;i<17;i++)
  assert.ok(d(i*2,(i+1)*2+1)<.00001,
   "Seam between actual curved station bays "+i+" and "+(i+1)+" must close");
 assert.equal(geo.userData.trackConforming,true);
 assert.equal(geo.userData.bayCount,18);
});
