// SKYSHIFT 0.20.4 — Pass 3 premium integrated neon architecture QA.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {STATION_ART_0204,buildStationAsset}
 from "../../world/authoring/build-station-world-v0204.mjs";
import {WORLD_ART_0204,planStationWorld,bakeTrackConformingBayGeometry}
 from "../../world/environment-art-pipeline-v0204.mjs";
import {planStationWorld as oldWorld}
 from "../../world/environment-art-pipeline-v0203.mjs";
import {TRIAL,SKYLINE_LEAP,positionAt} from "../../trial-v0165.mjs";
const file=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const gltf=JSON.parse(file("./assets/worlds/continuum-neon-bays-v5.gltf"));
const oldGltf=JSON.parse(file("./assets/worlds/continuum-graphite-bays-v5.gltf"));
function bytes(doc,name,attribute){
 const mesh=doc.meshes.find(x=>x.name===name);
 assert.ok(mesh,"Missing original GLTF mesh "+name);
 const a=doc.accessors[mesh.primitives[0].attributes[attribute]];
 const view=doc.bufferViews[a.bufferView];
 return Buffer.from(doc.buffers[0].uri.split(",")[1],"base64")
  .subarray(view.byteOffset,view.byteOffset+view.byteLength);
}
function sampleVertexColor(doc,meshName,expected){
 const buf=bytes(doc,meshName,"COLOR_0");
 for(let at=0;at<buf.length;at+=12)
  if([0,1,2].every((_,i)=>Math.abs(buf.readFloatLE(at+i*4)-
   ((expected>>(16-8*i))&255)/255)<.0001))return true;
 return false;
}
test("Pass 3 is imported neon only; station, curves, windows and pilot corridor unchanged",()=>{
 const p=planStationWorld(),original=oldWorld();
 assert.equal(TRIAL.length,3400);
 assert.ok(p.stats.end<SKYLINE_LEAP.start);
 assert.equal(p.stats.bayCount,18);
 assert.equal(p.stats.panoramaWindowBays,6);
 assert.equal(p.stats.observationGroups,3);
 assert.equal(p.stats.sideWallInsideMeters,14.5);
 assert.equal(p.stats.openRoof,false);
 assert.equal(p.stats.continuousUnderdeck,true);
 assert.equal(p.stats.closedCeiling,true);
 assert.equal(p.stats.colliders,0);
 assert.equal(p.stats.physicsChanges,0);
 assert.equal(p.stats.roadWidthChanged,false);
 assert.deepEqual(p.bays.map(b=>b.variant),original.bays.map(b=>b.variant));
 assert.equal(p.stats.premiumIntegratedNeon,true);
 assert.equal(p.stats.magentaWallGuides,true);
 assert.equal(p.stats.cyanCeilingCoves,true);
 assert.equal(p.stats.lightCoreWhite,true);
 assert.equal(p.stats.staticGlowHalo,true);
 assert.equal(planStationWorld({lowMemory:true}).stats.staticGlowHalo,false);
 assert.equal(planStationWorld({track:"aurora"}).active,false);
});
test("Authored glTF has five deliberate material layers and correct byte-for-byte generation",()=>{
 const authored=buildStationAsset();
 assert.deepEqual(authored.gltf,gltf);
 assert.equal(gltf.asset.version,"2.0");
 assert.equal(gltf.meshes.length,18);
 assert.deepEqual(gltf.materials.slice(0,4),oldGltf.materials);
 assert.equal(STATION_ART_0204.originalGraphitePalettePreserved,true);
 assert.equal(gltf.materials.length,5);
 assert.ok(authored.statistics.triangles<=WORLD_ART_0204.maxTrianglesPerAsset);
 assert.ok(file("./assets/worlds/continuum-neon-bays-v5.gltf").length<
  WORLD_ART_0204.maxAssetBytes);
 assert.equal(gltf.meshes.filter(m=>m.name.endsWith("_HALO")).length,4);
 assert.equal(gltf.meshes.filter(m=>m.name.endsWith("_GLASS")).length,2);
 assert.equal(STATION_ART_0204.addedPhysicalLights,0);
 assert.equal(STATION_ART_0204.additionalRenderPasses,0);
 assert.equal(WORLD_ART_0204.addedColliders,0);
 assert.equal(WORLD_ART_0204.addedDynamicLights,0);
 assert.equal(WORLD_ART_0204.addedRenderPasses,0);
 assert.equal(WORLD_ART_0204.maxBatchesHigh,5);
 assert.equal(WORLD_ART_0204.maxBatchesLow,3);
 assert.equal(WORLD_ART_0204.integratedMagentaWallGuides,true);
 assert.equal(WORLD_ART_0204.integratedCyanCeilingCoves,true);
});
test("The graphite station shell, glass and PBR values remain exactly as 0.20.3",()=>{
 for(const name of ["PANORAMA_START_SHELL","PANORAMA_END_SHELL",
  "SERVICE_SHELL","GATE_SHELL",
  "PANORAMA_START_GLASS","PANORAMA_END_GLASS"])
  for(const attr of ["POSITION","NORMAL","COLOR_0"])
   assert.deepEqual(bytes(gltf,name,attr),bytes(oldGltf,name,attr),
    name+"/"+attr+" must match the 0.20.3 graphite model");
 for(const name of ["SERVICE_GLASS","GATE_GLASS"])
  assert.ok(!gltf.meshes.some(x=>x.name===name));
});
test("Vivid pink wall, cyan ceiling, and white-hot core actually exist in authored vertex colors",()=>{
 for(const variant of STATION_ART_0204.bayTypes){
  assert.ok(sampleVertexColor(gltf,variant+"_ENERGY",0xff369e),
   variant+" has no integrated magenta wall guide");
  assert.ok(sampleVertexColor(gltf,variant+"_ENERGY",0x39cff5),
   variant+" has no integrated cyan ceiling cove");
  assert.ok(sampleVertexColor(gltf,variant+"_ENERGY",0xffe2f4),
   variant+" lacks a pink hot core");
  assert.ok(sampleVertexColor(gltf,variant+"_ENERGY",0xe5faff),
   variant+" lacks a blue-white hot core");
  assert.ok(sampleVertexColor(gltf,variant+"_HALO",0xb13b77));
  assert.ok(sampleVertexColor(gltf,variant+"_HALO",0x167ea4));
 }
});
test("All neon geometry is visually outside the original flight envelope",()=>{
 const decoded=Buffer.from(gltf.buffers[0].uri.split(",")[1],"base64");
 for(const mesh of gltf.meshes){
  const attr=gltf.accessors[mesh.primitives[0].attributes.POSITION];
  const view=gltf.bufferViews[attr.bufferView];
  for(let i=0;i<attr.count;i++){
   const at=view.byteOffset+i*12;
   const x=decoded.readFloatLE(at),y=decoded.readFloatLE(at+4),
    z=decoded.readFloatLE(at+8);
   assert.ok(Number.isFinite(x+y+z));
   assert.ok(Math.abs(z)<=8.12);
   assert.ok(!(Math.abs(x)<14.2&&y>-6.2&&y<25.5),
    "Neon/Halo breaches safe flight corridor "+mesh.name);
  }
 }
});
test("Curved and banked sidewall neon connects exactly across 18 authored bays",()=>{
 class Attr{
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize}
  getX(i){return this.array[3*i]}
  getY(i){return this.array[3*i+1]}
  getZ(i){return this.array[3*i+2]}
 }
 class Geo{
  attributes={};userData={};
  setAttribute(name,value){this.attributes[name]=value}
  computeVertexNormals(){}
  computeBoundingSphere(){}
 }
 const THREE={BufferGeometry:Geo,BufferAttribute:Attr};
 const nodes=new Map(WORLD_ART_0204.variants.map(variant=>[
  variant+"_ENERGY",{geometry:{attributes:{
   position:new Attr(new Float32Array([14.33,9.12,-8,14.33,9.12,8]),3),
   color:new Attr(new Float32Array([1,.2,.6,1,.2,.6]),3)
  }}}]));
 const mesh=bakeTrackConformingBayGeometry(THREE,planStationWorld(),nodes,
  "ENERGY",positionAt),points=mesh.attributes.position.array;
 for(let i=0;i<17;i++){
  const a=i*2,b=(i+1)*2+1;
  const d=Math.hypot(points[a*3]-points[b*3],points[a*3+1]-points[b*3+1],
   points[a*3+2]-points[b*3+2]);
  assert.ok(d<.00001,"Broken cove seam between bays "+i+" and "+(i+1));
 }
 assert.equal(mesh.userData.trackConforming,true);
});
test("Live entry uses 0.20.4 GLTF and optional halo; all prior versions remain selectable",()=>{
 const game=file("./legacy/game/game-v0204.mjs");
 for(const module of ["trial-v0165","flight/unified-flight-v0165","flight/cinematic-v0165"])
  assert.ok(game.includes('from "../../'+module+'.mjs"'));
 assert.match(game,/environment-art-pipeline-v0204\.mjs/);
 assert.match(game,/premiumNeonEnabled=graphiteGradeEnabled&&/);
 assert.match(game,/get\("neon"\)!=="classic"/);
 assert.match(game,/installPremiumNeonWorldArt/);
 assert.match(game,/compareBeforeNeon:"\?neon=classic"/);
 assert.match(game,/retainedGraphiteMaterials0203:true/);
 assert.match(game,/from "\.\.\/\.\.\/world\/environment-art-pipeline-v0203\.mjs"/);
 assert.match(game,/get\("materialGrade"\)!=="classic"/);
 assert.match(game,/version:"0\.20\.4"/);
 assert.match(file("./index.html"),/boot-v0205\.js\?v=0\.20\.5/);
 assert.match(file("./legacy/boot/boot-v0204.js"),/game-v0204\.mjs\?v=0\.20\.4/);
});
