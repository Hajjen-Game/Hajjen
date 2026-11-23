// SKYSHIFT 0.20.5 — Architectural & Surface Rebirth acceptance tests.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {STATION_ART_0205,buildStationAsset} from "../../world/authoring/build-station-world-v0205.mjs";
import {WORLD_ART_0205,planStationWorld,bakeTrackConformingBayGeometry}
 from "../../world/environment-art-pipeline-v0205.mjs";
import {planStationWorld as oldWorld}
 from "../../world/environment-art-pipeline-v02041.mjs";
import {positionAt,TRIAL,SKYLINE_LEAP} from "../../trial-v0165.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const newer=JSON.parse(read("./assets/worlds/continuum-architecture-v7.gltf"));
const older=JSON.parse(read("./assets/worlds/continuum-neon-sculpted-v6.gltf"));
function verts(doc,meshName,attr="POSITION"){
 const node=doc.meshes.find(x=>x.name===meshName);
 assert.ok(node,"Missing GLTF mesh "+meshName);
 const accessor=doc.accessors[node.primitives[0].attributes[attr]];
 const view=doc.bufferViews[accessor.bufferView];
 const bytes=Buffer.from(doc.buffers[0].uri.split(",")[1],"base64");
 return new Float32Array(bytes.buffer.slice(
  bytes.byteOffset+view.byteOffset,
  bytes.byteOffset+view.byteOffset+view.byteLength));
}
test("two genuinely different interior sections plus the same 3 panoramic ribbons",()=>{
 const p=planStationWorld(),old=oldWorld();
 assert.equal(p.stats.bayCount,18);
 assert.deepEqual(p.bays.map(x=>x.variant),[
  "GATE","SERVICE_VAULT","SERVICE_SPINE","PANORAMA_START","PANORAMA_END",
  "SERVICE_SPINE","SERVICE_VAULT","PANORAMA_START","PANORAMA_END",
  "SERVICE_VAULT","SERVICE_SPINE","SERVICE_VAULT","PANORAMA_START",
  "PANORAMA_END","SERVICE_SPINE","SERVICE_VAULT","SERVICE_SPINE","GATE"
 ]);
 assert.equal(p.stats.vaultedHalls,5);
 assert.equal(p.stats.serviceNaves,5);
 assert.equal(p.stats.panoramaWindowBays,6);
 assert.equal(p.stats.observationGroups,3);
 assert.equal(p.stats.stationArchitecturalDepthMeters,4.5);
 assert.equal(p.stats.roadWidthChanged,false);
 assert.equal(p.stats.roadGeometryRebuild,false);
 assert.equal(p.stats.roadMaterialReplacement,false);
 assert.equal(p.stats.closedCeiling,true);
 assert.equal(p.stats.continuousUnderdeck,true);
 assert.equal(TRIAL.length,3400);
 assert.ok(p.stats.end<SKYLINE_LEAP.start);
 assert.deepEqual(p.bays.map(x=>[x.start,x.end]),
  old.bays.map(x=>[x.start,x.end]));
 assert.equal(planStationWorld({track:"aurora"}).active,false);
});
test("checked-in six-material GLTF reproducible, lightweight and zero added physics",()=>{
 const actual=buildStationAsset();
 assert.deepEqual(actual.gltf,newer);
 assert.equal(newer.meshes.length,25);
 assert.equal(newer.materials.length,6);
 assert.equal(actual.statistics.triangles,3000);
 assert.ok(actual.statistics.triangles<3500);
 assert.ok(read("./assets/worlds/continuum-architecture-v7.gltf").length<
  WORLD_ART_0205.maxAssetBytes);
 assert.equal(WORLD_ART_0205.maxBatchesHigh,6);
 assert.equal(WORLD_ART_0205.maxBatchesLow,4);
 assert.equal(WORLD_ART_0205.addedColliders,0);
 assert.equal(WORLD_ART_0205.addedPhysicsChanges,0);
 assert.equal(WORLD_ART_0205.addedDynamicLights,0);
 assert.equal(WORLD_ART_0205.addedRenderPasses,0);
 assert.equal(WORLD_ART_0205.surfaceCollisionChanges,0);
 assert.equal(STATION_ART_0205.noRealtimeReflections,true);
 assert.equal(STATION_ART_0205.vaultedHallAndServiceNave,true);
 assert.equal(STATION_ART_0205.unchangedHandling,true);
});
test("original pink/cyan/white light, panorama and graphite metallurgy preserved",()=>{
 for(const kind of ["ENERGY","GLASS","HALO"]){
  if(kind==="GLASS")for(const v of ["PANORAMA_START","PANORAMA_END"])
   for(const attr of ["POSITION","COLOR_0","NORMAL"])
    assert.deepEqual(verts(newer,v+"_"+kind,attr),verts(older,v+"_"+kind,attr));
  else for(const v of ["PANORAMA_START","PANORAMA_END","GATE"])
   for(const attr of ["POSITION","COLOR_0","NORMAL"])
    assert.deepEqual(verts(newer,v+"_"+kind,attr),verts(older,v+"_"+kind,attr));
 }
 assert.deepEqual(newer.materials.slice(0,5),older.materials);
 assert.ok(!newer.meshes.some(x=>x.name.startsWith("SERVICE_")&&
  (x.name.endsWith("_GLASS")||x.name.endsWith("_SHEEN"))));
 const newVault=verts(newer,"SERVICE_VAULT_SHELL");
 const newSpine=verts(newer,"SERVICE_SPINE_SHELL");
 assert.notDeepEqual(newVault,newSpine,
  "Hall identities must be real 3D geometry, not differently named recolors");
 assert.ok(newVault.length>verts(older,"SERVICE_SHELL").length);
});
test("angled station ribs are 3D and completely outside original cockpit envelope",()=>{
 const meshes=newer.meshes;
 let structuralUpper=0,structuralNearWall=0,roofForms=0,glints=0;
 for(const mesh of meshes){
  const v=verts(newer,mesh.name);
  for(let i=0;i<v.length;i+=3){
   const [x,y,z]=[v[i],v[i+1],v[i+2]];
   assert.ok(Number.isFinite(x+y+z));
   assert.ok(Math.abs(z)<=8.12,"GLTF bay extends past longitudinal seam: "+mesh.name);
   if(mesh.name.endsWith("_SHEEN")){
    glints++;
    assert.ok(y>=.125&&y<=.15);
    assert.ok(Math.abs(x)>7&&Math.abs(x)<12,
     "Road sheen only on the actual racing surface");
   }else{
    assert.ok(!(Math.abs(x)<14.2&&y>-6.2&&y<25.5),
     "Solid architecture enters ship clearance: "+mesh.name);
   }
   if(mesh.name.startsWith("SERVICE_")&&mesh.name.endsWith("_SHELL")){
    if(y>28.4&&Math.abs(x)<14.3)structuralUpper++;
    if(y>11&&y<24&&Math.abs(x)>15.5&&Math.abs(x)<18.2)
     structuralNearWall++;
   }
   if(mesh.name.startsWith("SERVICE_")&&mesh.name.endsWith("_INLAY")&&
      y>28.2)roofForms++;
  }
 }
 assert.ok(structuralUpper>50,"Need substantial diagonal high roof");
 assert.ok(structuralNearWall>50,"Need strong wall mass");
 assert.ok(roofForms>40,"Need substantial coffered ceiling");
 assert.ok(glints>20,"Need actual broad fake neon return on racing deck");
});
test("real curvature-baked station seam still closes perfectly on banked sections",()=>{
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
 const nodes=new Map(WORLD_ART_0205.variants.map(name=>[
  name+"_SHELL",{geometry:{attributes:{
   position:new Attr(new Float32Array([15.8,10,-8,15.8,10,8]),3),
   color:new Attr(new Float32Array([.2,.3,.4,.2,.3,.4]),3)
  }}}
 ]));
 const geo=bakeTrackConformingBayGeometry(
  THREE,planStationWorld(),nodes,"SHELL",positionAt);
 const v=geo.attributes.position.array;
 for(let k=0;k<17;k++){
  const a=2*k,b=2*(k+1)+1;
  const dist=Math.hypot(v[3*a]-v[3*b],
   v[3*a+1]-v[3*b+1],v[3*a+2]-v[3*b+2]);
  assert.ok(dist<.00001,"Station seam broken at bay "+k);
 }
 assert.equal(geo.userData.trackConforming,true);
 assert.equal(geo.userData.bayCount,18);
});
test("gameplay and lower versions are preserved; active boot and fair A/B",()=>{
 const game=read("./game-v0205.mjs");
 for(const m of ["trial-v0165","flight/unified-flight-v0165","flight/cinematic-v0165",
  "world/environment-art-pipeline-v02041","world/environment-art-pipeline-v0205"])
  assert.ok(game.includes('from "./'+m+'.mjs"'));
 assert.match(game,/architecturePass"\)!=="classic"/);
 assert.match(game,/installArchitecturalWorldArt/);
 assert.match(game,/compareBeforeArchitecture:"\?architecturePass=classic"/);
 assert.match(game,/version:"0\.20\.5"/);
 assert.match(read("./index.html"),/boot-v0205\.js\?v=0\.20\.5/);
 assert.match(read("./legacy/boot/boot-v0205.js"),/game-v0205\.mjs\?v=0\.20\.5/);
});
