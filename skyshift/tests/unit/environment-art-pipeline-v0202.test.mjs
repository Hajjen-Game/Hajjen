// SKYSHIFT 0.20.2 / PASS 1 — Observation Windows Balance.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {WORLD_ART_0202,planStationWorld,bakeTrackConformingBayGeometry}
 from "../../environment-art-pipeline-v0202.mjs";
import {WORLD_ART_0201,planStationWorld as planOld}
 from "../../environment-art-pipeline-v0201.mjs";
import {STATION_ART_0202,buildStationAsset}
 from "../../build-station-world-v0202.mjs";
import {TRIAL,SKYLINE_LEAP,positionAt} from "../../trial-v0165.mjs";
const file=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const asset=JSON.parse(file("./assets/worlds/continuum-observation-bays-v3.gltf"));
const previous=JSON.parse(file("./assets/worlds/continuum-enclosure-bays-v2.gltf"));
test("window balance: exactly three pairs separated by enclosed bulkheads",()=>{
 const p=planStationWorld(),old=planOld();
 assert.deepEqual([p.stats.start,p.stats.end,p.stats.bayCount],[80,368,18]);
 assert.equal(TRIAL.length,3400);
 assert.ok(p.stats.end<SKYLINE_LEAP.start);
 assert.deepEqual(p.bays.filter(x=>x.variant==="PANORAMA").map(x=>x.index),
  [3,4,7,8,12,13]);
 assert.deepEqual(p.bays.filter(x=>x.variant==="PANORAMA").map(x=>x.start),
  [128,144,192,208,272,288]);
 assert.equal(p.stats.observationGroups,3);
 assert.equal(p.stats.observationsArePaired,true);
 assert.equal(p.stats.panoramaWindowBays,6);
 assert.equal(p.stats.unbrokenSolidHallBays,12);
 assert.equal(p.stats.variants.GATE,2);
 assert.equal(p.stats.variants.SERVICE,10);
 assert.equal(p.stats.windowFraction,.333);
 assert.equal(old.stats.panoramaWindowBays,4);
 assert.equal(old.stats.windowFraction,.222);
 assert.equal(p.stats.openRoof,false);
 assert.equal(p.stats.closedCeiling,true);
 assert.equal(p.stats.continuousUnderdeck,true);
 assert.equal(p.stats.enclosedInterior,true);
 assert.equal(p.stats.sideWallInsideMeters,old.stats.sideWallInsideMeters);
 assert.equal(p.stats.roofSoffitHeightMeters,old.stats.roofSoffitHeightMeters);
 assert.equal(p.stats.roadWidthChanged,false);
 assert.equal(p.stats.physicsChanges,0);
 assert.equal(p.stats.colliders,0);
 assert.equal(p.stats.dynamicLights,0);
});
test("window apertures enlarged modestly while architecture remains in the same safety envelope",()=>{
 assert.equal(STATION_ART_0202.observationGlassWidth,11.8);
 assert.equal(STATION_ART_0202.observationRevealHeight,7.43);
 assert.equal(STATION_ART_0202.originalHallWidthUnchanged,true);
 assert.equal(STATION_ART_0202.originalLightingUnchanged,true);
 assert.equal(WORLD_ART_0202.windowGlassHeightMeters,7.43);
 assert.equal(WORLD_ART_0202.windowGlassWidthMeters,11.8);
 assert.equal(WORLD_ART_0202.unchangedGlobalLighting,true);
 assert.equal(WORLD_ART_0202.unchangedHullClearance,true);
 assert.equal(WORLD_ART_0202.maxBatchesHigh,4);
 assert.equal(WORLD_ART_0202.maxBatchesLow,3);
 assert.equal(WORLD_ART_0202.addedDynamicLights,0);
 assert.equal(WORLD_ART_0202.addedRenderPasses,0);
 assert.ok(WORLD_ART_0202.windowGlassWidthMeters<16);
 assert.ok(WORLD_ART_0202.windowGlassHeightMeters<10);
 const oldSource=file("./build-station-world-v0201.mjs");
 const newSource=file("./build-station-world-v0202.mjs");
 assert.match(newSource,/glass\.quad\(\[15\.64\*sign,14\.53,-5\.9\]/);
 assert.match(oldSource,/glass\.quad\(\[15\.64\*sign,15\.0,-5\.1\]/);
});
test("the checked-in 0.20.2 glTF exactly matches its authoring code",()=>{
 const built=buildStationAsset();
 assert.deepEqual(built.gltf,asset);
 assert.equal(asset.asset.version,"2.0");
 assert.equal(built.statistics.meshes,12);
 assert.equal(built.statistics.materialCount,4);
 assert.ok(built.statistics.triangles<=WORLD_ART_0202.maxTrianglesPerAsset);
 assert.ok(file("./assets/worlds/continuum-observation-bays-v3.gltf").length<
  WORLD_ART_0202.maxAssetBytes);
 assert.equal(asset.buffers.length,1);
 assert.equal(asset.meshes.filter(x=>x.name.endsWith("_GLASS")).length,3);
 assert.equal(asset.extensionsUsed.includes("KHR_materials_emissive_strength"),true);
});
test("window framing changed, sealed service and gate module geometry did not",()=>{
 function bytesAndAttributes(doc,name){
  const mesh=doc.meshes.find(x=>x.name===name);
  assert.ok(mesh,name+" must exist");
  const decoded=Buffer.from(doc.buffers[0].uri.split(",")[1],"base64");
  const attrs=mesh.primitives[0].attributes;
  return ["POSITION","NORMAL","COLOR_0"].map(kind=>{
   const acc=doc.accessors[attrs[kind]];
   const view=doc.bufferViews[acc.bufferView];
   return [...decoded.subarray(view.byteOffset,view.byteOffset+view.byteLength)];
  });
 }
 for(const name of ["SERVICE_SHELL","SERVICE_INLAY","SERVICE_ENERGY",
  "SERVICE_GLASS","GATE_SHELL","GATE_INLAY","GATE_ENERGY","GATE_GLASS"])
  assert.deepEqual(bytesAndAttributes(asset,name),bytesAndAttributes(previous,name),
   name+" must remain literally the same as in 0.20.1");
 assert.notDeepEqual(bytesAndAttributes(asset,"PANORAMA_SHELL"),
  bytesAndAttributes(previous,"PANORAMA_SHELL"));
 assert.notDeepEqual(bytesAndAttributes(asset,"PANORAMA_GLASS"),
  bytesAndAttributes(previous,"PANORAMA_GLASS"));
});
test("every station vertex remains outside original ship flight envelope",()=>{
 const decoded=Buffer.from(asset.buffers[0].uri.split(",")[1],"base64");
 for(const mesh of asset.meshes){
  const attrs=mesh.primitives[0].attributes;
  assert.ok(Number.isInteger(attrs.POSITION));
  assert.ok(Number.isInteger(attrs.NORMAL));
  assert.ok(Number.isInteger(attrs.COLOR_0));
  const p=asset.accessors[attrs.POSITION];
  const view=asset.bufferViews[p.bufferView];
  for(let i=0;i<p.count;i++){
   const o=view.byteOffset+i*12;
   const x=decoded.readFloatLE(o),y=decoded.readFloatLE(o+4),
    z=decoded.readFloatLE(o+8);
   assert.ok(Number.isFinite(x+y+z));
   assert.ok(Math.abs(z)<=8.12);
   assert.ok(!(Math.abs(x)<14.2&&y>-6.2&&y<25.5),
    "visual geometry in ship corridor: "+mesh.name);
  }
 }
});
test("actual curved and banked track seams remain joined after window change",()=>{
 class Attr{
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize}
  getX(i){return this.array[i*3]}
  getY(i){return this.array[i*3+1]}
  getZ(i){return this.array[i*3+2]}
 }
 class Geo{
  attributes={};userData={};
  setAttribute(k,v){this.attributes[k]=v}
  computeVertexNormals(){}
  computeBoundingSphere(){}
 }
 const THREE={BufferGeometry:Geo,BufferAttribute:Attr};
 const nodes=new Map(WORLD_ART_0202.variants.map(variant=>[
  variant+"_SHELL",{geometry:{attributes:{
   position:new Attr(new Float32Array([15.8,10,-8,15.8,10,8]),3),
   color:new Attr(new Float32Array([.2,.3,.4,.2,.3,.4]),3)
  }}}
 ]));
 const baked=bakeTrackConformingBayGeometry(THREE,planStationWorld(),nodes,"SHELL",positionAt);
 const a=baked.attributes.position.array;
 for(let i=0;i<17;i++){
  const j=i*2,k=(i+1)*2+1;
  const d=Math.hypot(a[j*3]-a[k*3],a[j*3+1]-a[k*3+1],a[j*3+2]-a[k*3+2]);
  assert.ok(d<.00001,"curved station seam "+i+" is visible");
 }
 assert.equal(baked.userData.trackConforming,true);
});
test("active game uses new window art with explicit 0.20.1 comparison, not new handling",()=>{
 assert.equal(planStationWorld({track:"aurora"}).active,false);
 const game=file("./game-v0202.mjs");
 assert.match(game,/from "\.\/trial-v0165\.mjs"/);
 assert.match(game,/from "\.\/flight\/unified-flight-v0165\.mjs"/);
 assert.match(game,/from "\.\/flight\/cinematic-v0165\.mjs"/);
 assert.match(game,/from "\.\/environment-art-pipeline-v0202\.mjs"/);
 assert.match(game,/get\("windows"\)!=="classic"/);
 assert.match(game,/installObservationWorldArt:installEnclosedWorldArt/);
 assert.match(game,/compareBeforeWindows:"\?windows=classic"/);
 assert.doesNotMatch(game,/world-material-readability-v0191\.mjs/);
 assert.match(game,/version:"0\.20\.2"/);
 assert.match(file("./index.html"),/boot-v0205\.js\?v=0\.20\.5/);
 assert.match(file("./boot-v0202.js"),/game-v0202\.mjs\?v=0\.20\.2/);
});
