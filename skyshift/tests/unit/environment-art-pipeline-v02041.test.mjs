// SKYSHIFT 0.20.4.1 — sculpted neon Pass 3 regression
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {STATION_ART_02041,buildStationAsset} from "../../world/authoring/build-station-world-v02041.mjs";
import {WORLD_ART_02041,planStationWorld} from "../../world/environment-art-pipeline-v02041.mjs";
import {planStationWorld as oldWorld} from "../../world/environment-art-pipeline-v0204.mjs";
const file=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const asset=JSON.parse(file("./assets/worlds/continuum-neon-sculpted-v6.gltf"));
const old=JSON.parse(file("./assets/worlds/continuum-neon-bays-v5.gltf"));
function vertexBytes(doc,name,attribute){
 const mesh=doc.meshes.find(m=>m.name===name);
 assert.ok(mesh,name+" absent");
 const acc=doc.accessors[mesh.primitives[0].attributes[attribute]];
 const view=doc.bufferViews[acc.bufferView];
 return Buffer.from(doc.buffers[0].uri.split(",")[1],"base64")
  .subarray(view.byteOffset,view.byteOffset+view.byteLength);
}
test("new 0.20.4.1 glTF is authored deterministically under tight mobile budget",()=>{
 const b=buildStationAsset();
 assert.deepEqual(asset,b.gltf);
 assert.equal(asset.meshes.length,18);
 assert.equal(asset.materials.length,5);
 assert.equal(b.statistics.triangles,2224);
 assert.ok(b.statistics.triangles<WORLD_ART_02041.maxTrianglesPerAsset);
 assert.ok(file("./assets/worlds/continuum-neon-sculpted-v6.gltf").length<
  WORLD_ART_02041.maxAssetBytes);
 assert.equal(WORLD_ART_02041.maxBatchesHigh,5);
 assert.equal(WORLD_ART_02041.maxBatchesLow,3);
 assert.equal(WORLD_ART_02041.addedDynamicLights,0);
 assert.equal(WORLD_ART_02041.addedRenderPasses,0);
 assert.equal(WORLD_ART_02041.addedColliders,0);
 assert.equal(WORLD_ART_02041.addedPhysicsChanges,0);
});
test("walls, graphite, windows and aerodynamic clearance are byte-identical to Pass 3",()=>{
 assert.deepEqual(asset.meshes.map(x=>x.name),old.meshes.map(x=>x.name));
 assert.deepEqual(asset.materials,old.materials);
 for(const mesh of old.meshes){
  for(const attr of ["POSITION","NORMAL","COLOR_0"]){
   if(mesh.name.endsWith("_ENERGY")||mesh.name.endsWith("_HALO"))continue;
   assert.deepEqual(vertexBytes(asset,mesh.name,attr),
    vertexBytes(old,mesh.name,attr),
    "Accidental edit to station graphite, framing or glass: "+mesh.name);
  }
 }
 const n=planStationWorld(),p=oldWorld();
 assert.deepEqual(n.bays,p.bays);
 assert.equal(n.stats.sideWallInsideMeters,14.5);
 assert.equal(n.stats.panoramaWindowBays,6);
 assert.equal(n.stats.observationGroups,3);
 assert.equal(n.stats.openRoof,false);
 assert.equal(n.stats.closedCeiling,true);
 assert.equal(n.stats.roadWidthChanged,false);
 assert.equal(n.stats.physicsChanges,0);
 assert.equal(planStationWorld({track:"aurora"}).active,false);
});
test("new geometry changes actual integrated light faces, not flat wall materials",()=>{
 assert.notDeepEqual(vertexBytes(asset,"GATE_ENERGY","POSITION"),
  vertexBytes(old,"GATE_ENERGY","POSITION"));
 assert.notDeepEqual(vertexBytes(asset,"GATE_HALO","POSITION"),
  vertexBytes(old,"GATE_HALO","POSITION"));
 assert.notDeepEqual(vertexBytes(asset,"PANORAMA_START_ENERGY","POSITION"),
  vertexBytes(old,"PANORAMA_START_ENERGY","POSITION"));
 assert.notDeepEqual(vertexBytes(asset,"SERVICE_HALO","POSITION"),
  vertexBytes(old,"SERVICE_HALO","POSITION"));
 assert.equal(STATION_ART_02041.narrowerWallHalo,true);
 assert.equal(STATION_ART_02041.nonRepeatingArchitecturalGateAccents,true);
 assert.equal(STATION_ART_02041.observationExteriorJambsOnly,true);
 assert.equal(STATION_ART_02041.ceilingPortalsAtTrueGatesOnly,true);
 assert.equal(STATION_ART_02041.priorGraphiteAndGlazingUnchanged,true);
 assert.equal(WORLD_ART_02041.maxBatchesHigh,5);
 assert.equal(WORLD_ART_02041.maxBatchesLow,3);
});
test("sculpted neon stays outside the cockpit in every module",()=>{
 const buf=Buffer.from(asset.buffers[0].uri.split(",")[1],"base64");
 for(const mesh of asset.meshes.filter(x=>x.name.endsWith("_ENERGY")||
   x.name.endsWith("_HALO"))){
  const pos=asset.accessors[mesh.primitives[0].attributes.POSITION];
  const view=asset.bufferViews[pos.bufferView];
  for(let i=0;i<pos.count;i++){
   const offset=view.byteOffset+i*12;
   const x=buf.readFloatLE(offset),y=buf.readFloatLE(offset+4),
    z=buf.readFloatLE(offset+8);
   assert.ok(Number.isFinite(x+y+z));
   assert.ok(Math.abs(z)<=8.12);
   assert.ok(!(Math.abs(x)<14.2&&y>-6.2&&y<25.5),
    "Illuminated shoulder infringes ship flight envelope: "+mesh.name);
  }
 }
});
test("legacy 0.20.4 A/B, graphite A/B and old 120 Hz flight imports remain",()=>{
 const game=file("./game-v02041.mjs");
 assert.match(game,/from "\.\/trial-v0165\.mjs"/);
 assert.match(game,/from "\.\/flight\/unified-flight-v0165\.mjs"/);
 assert.match(game,/from "\.\/flight\/cinematic-v0165\.mjs"/);
 assert.match(game,/installSculptedNeonWorldArt/);
 assert.match(game,/installPremiumNeonWorldArt/);
 assert.match(game,/neonPolish"\)!=="classic"/);
 assert.match(game,/compareBeforeSculptedNeon:"\?neonPolish=classic"/);
 assert.match(game,/version:"0\.20\.4\.1"/);
 assert.match(file("./index.html"),/boot-v0205\.js\?v=0\.20\.5/);
 assert.match(file("./legacy/boot/boot-v02041.js"),/game-v02041\.mjs\?v=0\.20\.4\.1/);
});
