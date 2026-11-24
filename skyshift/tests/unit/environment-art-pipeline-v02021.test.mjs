// SKYSHIFT 0.20.2.1 — Observation Window Cleanup: geometry and physics gates.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {STATION_ART_02021,buildStationAsset}
 from "../../world/authoring/build-station-world-v02021.mjs";
import {WORLD_ART_02021,planStationWorld,bakeTrackConformingBayGeometry}
 from "../../world/environment-art-pipeline-v02021.mjs";
import {planStationWorld as previousPlan}
 from "../../world/environment-art-pipeline-v0202.mjs";
import {TRIAL,SKYLINE_LEAP,positionAt} from "../../trial-v0165.mjs";
const file=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const asset=JSON.parse(file("./assets/worlds/continuum-ribbon-bays-v4.gltf"));
test("3 long two-bay windows instead of 6 squared-off panes",()=>{
 const p=planStationWorld(),old=previousPlan();
 assert.equal(p.stats.bayCount,18);
 assert.equal(p.stats.panoramaWindowBays,6);
 assert.equal(p.stats.observationGroups,3);
 assert.equal(p.stats.unbrokenSolidHallBays,12);
 assert.equal(p.stats.windowFraction,.333);
 assert.equal(p.stats.closedCeiling,true);
 assert.equal(p.stats.continuousUnderdeck,true);
 assert.equal(p.stats.sideWallInsideMeters,14.5);
 assert.equal(p.stats.roadWidthChanged,false);
 assert.equal(p.stats.colliders,0);
 assert.equal(p.stats.dynamicLights,0);
 assert.equal(p.stats.physicsChanges,0);
 assert.equal(old.stats.panoramaWindowBays,p.stats.panoramaWindowBays);
 assert.equal(TRIAL.length,3400);
 assert.ok(p.stats.end<SKYLINE_LEAP.start);
 assert.deepEqual(p.bays.filter(x=>x.variant.startsWith("PANORAMA_"))
  .map(x=>x.variant),["PANORAMA_START","PANORAMA_END",
   "PANORAMA_START","PANORAMA_END","PANORAMA_START","PANORAMA_END"]);
 for(let i=1;i<p.bays.length;i++)
  assert.equal(p.bays[i].start,p.bays[i-1].end);
 assert.equal(WORLD_ART_02021.continuousRibbonMeters,32);
 assert.equal(WORLD_ART_02021.centerWindowMullions,0);
 assert.equal(WORLD_ART_02021.sealedBayFakeGlassPanels,0);
});
test("real glTF window ribbons have no fake GLASS in opaque service and gate bays",()=>{
 const authored=buildStationAsset();
 assert.deepEqual(authored.gltf,asset);
 assert.equal(authored.statistics.meshes,14);
 assert.equal(authored.statistics.materialCount,4);
 assert.ok(authored.statistics.triangles<2000);
 assert.ok(file("./assets/worlds/continuum-ribbon-bays-v4.gltf").length<
  WORLD_ART_02021.maxAssetBytes);
 assert.equal(STATION_ART_02021.centerMullions,0);
 assert.equal(STATION_ART_02021.closedBayDecorativeGlassPanels,0);
 assert.equal(STATION_ART_02021.observationBandLengthMeters,32);
 assert.deepEqual(asset.meshes.filter(x=>x.name.endsWith("_GLASS")).map(x=>x.name),
  ["PANORAMA_START_GLASS","PANORAMA_END_GLASS"]);
 const glassMat=asset.materials.find(x=>x.name==="Panoramic Glass");
 assert.ok(glassMat.pbrMetallicRoughness.baseColorFactor[3]<.06);
 for(const name of ["SERVICE_GLASS","GATE_GLASS","PANORAMA_GLASS"])
  assert.ok(!asset.meshes.some(x=>x.name===name));
});
test("solid walls, station deck, roof, unchanged 14.5m pilot clearance",()=>{
 const bytes=Buffer.from(asset.buffers[0].uri.split(",")[1],"base64");
 let roof=0,under=0,solidWall=0;
 for(const mesh of asset.meshes){
  const pos=asset.accessors[mesh.primitives[0].attributes.POSITION];
  const view=asset.bufferViews[pos.bufferView];
  for(let i=0;i<pos.count;i++){
   const at=view.byteOffset+i*12;
   const x=bytes.readFloatLE(at),y=bytes.readFloatLE(at+4),
    z=bytes.readFloatLE(at+8);
   assert.ok(Number.isFinite(x+y+z));
   assert.ok(Math.abs(z)<=8.12);
   assert.ok(!(Math.abs(x)<14.2&&y>-6.2&&y<25.5),
    "Station window collides with ship corridor: "+mesh.name);
   if(mesh.name==="SERVICE_SHELL"){
    if(y>34)roof++;
    if(y< -14)under++;
    if(Math.abs(x)>=15.7&&Math.abs(x)<=19.9&&y>=12.6&&y<=23.4)
     solidWall++;
   }
  }
 }
 assert.ok(roof>30&&under>30&&solidWall>35);
});
test("32m ribbons connect along actual curved/banked geometry",()=>{
 class Attr{
  constructor(a,n){this.array=a;this.itemSize=n;this.count=a.length/n}
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
 const nodes=new Map(WORLD_ART_02021.variants.map(variant=>[
  variant+"_SHELL",{geometry:{attributes:{
   position:new Attr(new Float32Array([15.8,10,-8,15.8,10,8]),3),
   color:new Attr(new Float32Array([.2,.3,.4,.2,.3,.4]),3)
  }}}]));
 const buffer=bakeTrackConformingBayGeometry(
  THREE,planStationWorld(),nodes,"SHELL",positionAt);
 const v=buffer.attributes.position.array;
 for(let i=0;i<17;i++){
  const a=i*2,b=(i+1)*2+1;
  assert.ok(Math.hypot(v[a*3]-v[b*3],v[a*3+1]-v[b*3+1],
   v[a*3+2]-v[b*3+2])<.00001);
 }
 assert.equal(buffer.userData.trackConforming,true);
});
test("original physics, 0.20.2 rollback and Aurora remain intact",()=>{
 assert.equal(planStationWorld({track:"aurora"}).active,false);
 const game=file("./legacy/game/game-v02021.mjs");
 for(const module of ["trial-v0165","flight/unified-flight-v0165","flight/cinematic-v0165"])
  assert.ok(game.includes('from "../../'+module+'.mjs"'));
 assert.match(game,/windowCleanup"\)!=="classic"/);
 assert.match(game,/installRibbonWindowArt/);
 assert.match(game,/compareBeforeCleanup:"\?windowCleanup=classic"/);
 assert.match(game,/version:"0\.20\.2\.1"/);
 assert.match(file("./index.html"),/boot-v0205\.js\?v=0\.20\.5/);
 assert.match(file("./legacy/boot/boot-v02021.js"),/game-v02021\.mjs\?v=0\.20\.2\.1/);
});
