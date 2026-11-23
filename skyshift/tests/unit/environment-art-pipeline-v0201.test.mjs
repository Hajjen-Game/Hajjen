// SKYSHIFT 0.20.1 — Architectural Depth & Station Identity regression QA.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {WORLD_ART_0201,planStationWorld,bakeTrackConformingBayGeometry}
 from "../../world/environment-art-pipeline-v0201.mjs";
import {STATION_ART_0201,buildStationAsset}
 from "../../world/authoring/build-station-world-v0201.mjs";
import {TRIAL,SKYLINE_LEAP,positionAt} from "../../trial-v0165.mjs";
import {planStationWorld as planLegacyWorld}
 from "../../world/environment-art-pipeline-v0200.mjs";
const src=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const gltf=JSON.parse(src("./assets/worlds/continuum-enclosure-bays-v2.gltf"));
test("station becomes an enclosed interior; old highway remains exactly the same",()=>{
 const p=planStationWorld();
 assert.equal(p.stats.bayCount,18);
 assert.equal(p.stats.meters,288);
 assert.deepEqual([p.bays[0].start,p.bays.at(-1).end],[80,368]);
 assert.ok(p.bays.at(-1).end<SKYLINE_LEAP.start);
 assert.equal(TRIAL.length,3400);
 assert.equal(p.stats.closedCeiling,true);
 assert.equal(p.stats.openRoof,false);
 assert.equal(p.stats.continuousUnderdeck,true);
 assert.equal(p.stats.enclosedInterior,true);
 assert.equal(p.stats.sideWallInsideMeters,14.5);
 assert.ok(p.stats.sideWallInsideMeters-STATION_ART_0201.minSideClearance<.2);
 assert.equal(p.stats.roadWidthChanged,false);
 assert.equal(p.stats.physicsChanges,0);
 assert.equal(p.stats.colliders,0);
 assert.equal(p.stats.dynamicLights,0);
 assert.equal(WORLD_ART_0201.enclosedCrossSection,true);
 for(let i=1;i<p.bays.length;i++)
  assert.equal(p.bays[i].start,p.bays[i-1].end);
 const legacy=planLegacyWorld();
 assert.equal(legacy.stats.openRoof,true);
 assert.equal(legacy.stats.panoramaWindowBays,14);
});
test("two purposeful observational areas replace the continuous exposure to space",()=>{
 const p=planStationWorld();
 assert.equal(p.stats.panoramaWindowBays,4);
 assert.equal(p.stats.windowFraction,.222);
 assert.equal(p.stats.variants.PANORAMA,4);
 assert.equal(p.stats.variants.GATE,2);
 assert.equal(p.stats.variants.SERVICE,12);
 const windows=p.bays.filter(x=>x.variant==="PANORAMA");
 assert.deepEqual(windows.map(x=>x.index),[7,8,12,13]);
 assert.deepEqual(windows.map(x=>x.start),[192,208,272,288]);
 assert.equal(p.stats.windowsOnlyAtDesignedObservationBays,true);
 assert.equal(WORLD_ART_0201.windowsAreSelective,true);
});
test("authored glTF enclosure is a real deterministic compact 3D asset",()=>{
 const actual=buildStationAsset();
 assert.deepEqual(actual.gltf,gltf);
 assert.equal(STATION_ART_0201.id,"continuum-enclosure-bays-v2");
 assert.equal(gltf.asset.version,"2.0");
 assert.equal(gltf.meshes.length,12);
 assert.equal(gltf.materials.length,4);
 assert.ok(actual.statistics.triangles<2000);
 assert.ok(src("./assets/worlds/continuum-enclosure-bays-v2.gltf").length<280000);
 assert.match(gltf.buffers[0].uri,/^data:application\/octet-stream;base64,/);
 assert.equal(Buffer.from(gltf.buffers[0].uri.split(",")[1],"base64").length,
  gltf.buffers[0].byteLength);
 for(const type of STATION_ART_0201.bayTypes)
  for(const kind of ["SHELL","INLAY","ENERGY","GLASS"])
   assert.ok(gltf.meshes.some(mesh=>mesh.name===type+"_"+kind));
});
test("roof and station underdeck close sky void without obstructing ship",()=>{
 const bytes=Buffer.from(gltf.buffers[0].uri.split(",")[1],"base64");
 let roof=0,underdeck=0,nearSide=0;
 const extents={roofL:false,roofR:false,underL:false,underR:false};
 for(const mesh of gltf.meshes){
  const attributes=mesh.primitives[0].attributes;
  for(const attr of ["POSITION","NORMAL","COLOR_0"])
   assert.ok(Number.isInteger(attributes[attr]),mesh.name+" missing "+attr);
  const pos=gltf.accessors[attributes.POSITION];
  const view=gltf.bufferViews[pos.bufferView];
  for(let i=0;i<pos.count;i++){
   const offset=view.byteOffset+i*12;
   const x=bytes.readFloatLE(offset),
    y=bytes.readFloatLE(offset+4),z=bytes.readFloatLE(offset+8);
   assert.ok(Number.isFinite(x+y+z));
   assert.ok(Math.abs(z)<=8.12);
   assert.ok(!(Math.abs(x)<14.2&&y>-6.2&&y<25.5),
    "Visual shell must not intersect the original flight envelope: "+mesh.name);
   if((mesh.name.endsWith("_SHELL")||mesh.name.endsWith("_INLAY"))&&
      Math.abs(x)>14.2&&Math.abs(x)<16.3&&y>0&&y<8)nearSide++;
   if(mesh.name.endsWith("_SHELL")){
    if(y>=35){roof++;if(x<0)extents.roofL=true;if(x>0)extents.roofR=true}
    if(y<=-14){underdeck++;
     if(x<0)extents.underL=true;if(x>0)extents.underR=true}

   }
  }
 }
 assert.ok(roof>100,"Continuous roof needs actual volumetric surfaces");
 assert.ok(underdeck>100,"Station must have structural mass beneath the road");
 assert.ok(nearSide>10,"Near-side wall must appear close to original rail");
 assert.ok(Object.values(extents).every(Boolean),"Roof and underdeck on both sides");
});
test("low-memory retains enclosed cross-section, original driving physics stays authoritative",()=>{
 const low=planStationWorld({lowMemory:true});
 assert.equal(low.stats.panoramaWindowBays,4);
 assert.equal(low.stats.closedCeiling,true);
 assert.equal(low.stats.continuousUnderdeck,true);
 assert.equal(WORLD_ART_0201.maxBatchesHigh,4);
 assert.equal(WORLD_ART_0201.maxBatchesLow,3);
 assert.equal(planStationWorld({track:"aurora"}).active,false);
 const game=src("./game-v0201.mjs");
 assert.match(game,/from "\.\/trial-v0165\.mjs"/);
 assert.match(game,/from "\.\/flight\/unified-flight-v0165\.mjs"/);
 assert.match(game,/from "\.\/flight\/cinematic-v0165\.mjs"/);
 assert.match(game,/from "\.\/world\/environment-art-pipeline-v0201\.mjs"/);
 assert.match(game,/stationStyle"\)!=="classic"/);
 assert.match(game,/if\(rebirthEnabled\)stationWorld=\(enclosedStationEnabled\?/);
 assert.match(game,/version:"0\.20\.1"/);
 assert.match(src("./index.html"),/boot-v0205\.js\?v=0\.20\.5/);
 assert.match(src("./legacy/boot/boot-v0201.js"),/game-v0201\.mjs\?v=0\.20\.1/);
});
test("bay edge coordinates remain joined along the actual banking and curvature",()=>{
 class Attr{
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;
   this.count=array.length/itemSize}
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
 const nodes=new Map(WORLD_ART_0201.variants.map(variant=>[
  variant+"_SHELL",{geometry:{attributes:{
   position:new Attr(new Float32Array([15.8,10,-8,15.8,10,8]),3),
   color:new Attr(new Float32Array([.2,.3,.4,.2,.3,.4]),3)
  }}}
 ]));
 const baked=bakeTrackConformingBayGeometry(THREE,planStationWorld(),nodes,"SHELL",positionAt);
 const v=baked.attributes.position.array;
 function distance(a,b){
  return Math.hypot(v[3*a]-v[3*b],
   v[3*a+1]-v[3*b+1],v[3*a+2]-v[3*b+2]);
 }
 for(let i=0;i<17;i++)
  assert.ok(distance(i*2,(i+1)*2+1)<.00001,
   "Architectural station breaks at exact road coordinate "+i);
 assert.equal(baked.userData.trackConforming,true);
 assert.equal(baked.userData.bayCount,18);
});
