// SKYSHIFT 0.20.3 — Dark Material Regrade, strictly art-only.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {GRAPHITE_PALETTE_0203,STATION_ART_0203,buildStationAsset}
 from "../../world/authoring/build-station-world-v0203.mjs";
import {WORLD_ART_0203,planStationWorld}
 from "../../world/environment-art-pipeline-v0203.mjs";
import {WORLD_ART_02021,planStationWorld as originalPlan}
 from "../../world/environment-art-pipeline-v02021.mjs";
const f=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const before=JSON.parse(f("./assets/worlds/continuum-ribbon-bays-v4.gltf"));
const after=JSON.parse(f("./assets/worlds/continuum-graphite-bays-v5.gltf"));
const raw=doc=>Buffer.from(doc.buffers[0].uri.split(",")[1],"base64");
function meshAttribute(doc,meshName,kind){
 const mesh=doc.meshes.find(m=>m.name===meshName);
 assert.ok(mesh,"Missing "+meshName);
 const attribute=doc.accessors[mesh.primitives[0].attributes[kind]];
 const view=doc.bufferViews[attribute.bufferView];
 const buf=raw(doc);
 return new Float32Array(buf.buffer.slice(
  buf.byteOffset+view.byteOffset,
  buf.byteOffset+view.byteOffset+view.byteLength));
}
const avgLuma=v=>v.reduce((sum,x,i)=>{
 const weight=[.2126,.7152,.0722][i%3];
 return sum+x*weight;
},0)/(v.length/3);
test("checked-in graphite glTF is exactly reproducible and mobile-safe",()=>{
 const built=buildStationAsset();
 assert.deepEqual(after,built.gltf);
 assert.equal(after.asset.version,"2.0");
 assert.equal(built.statistics.meshes,14);
 assert.equal(built.statistics.triangles,1856);
 assert.equal(built.statistics.materialCount,4);
 assert.ok(f("./assets/worlds/continuum-graphite-bays-v5.gltf").length<
  WORLD_ART_0203.maxAssetBytes);
 assert.equal(WORLD_ART_0203.maxBatchesHigh,4);
 assert.equal(WORLD_ART_0203.maxBatchesLow,3);
 assert.equal(WORLD_ART_0203.addedColliders,0);
 assert.equal(WORLD_ART_0203.addedPhysicsChanges,0);
 assert.equal(WORLD_ART_0203.addedDynamicLights,0);
 assert.equal(WORLD_ART_0203.addedRenderPasses,0);
});
test("all 14 station meshes have byte-identical geometry, including windows",()=>{
 assert.deepEqual(after.meshes.map(m=>m.name),before.meshes.map(m=>m.name));
 assert.deepEqual(after.nodes.map(n=>n.name),before.nodes.map(n=>n.name));
 for(const mesh of after.meshes){
  for(const attr of ["POSITION","NORMAL"]){
   assert.deepEqual(meshAttribute(after,mesh.name,attr),
    meshAttribute(before,mesh.name,attr),
    "Material regrade altered "+mesh.name+" "+attr);
  }
  const previous=meshAttribute(before,mesh.name,"COLOR_0");
  const updated=meshAttribute(after,mesh.name,"COLOR_0");
  if(mesh.name.endsWith("_ENERGY")||mesh.name.endsWith("_GLASS"))
   assert.deepEqual(updated,previous,
    "Neon and window optics must remain 0.20.2.1 original");
  else{
   assert.equal(updated.length,previous.length);
   assert.ok(avgLuma(updated)<=avgLuma(previous)*.87,
    "Expected architectural surface to be darker: "+mesh.name);
   assert.ok(avgLuma(updated)>=avgLuma(previous)*.55,
    "Avoid black / unreadable architecture: "+mesh.name);
  }
 }
});
test("graphite maintains tiered facet luminance, energy accent palette",()=>{
 const lum=x=>((x>>16)&255)*.2126+((x>>8)&255)*.7152+
  (x&255)*.0722;
 const p=GRAPHITE_PALETTE_0203;
 assert.ok(lum(p.roofLit)>lum(p.roof)*1.35);
 assert.ok(lum(p.bevel)>lum(p.side)*1.4);
 assert.ok(lum(p.rim)>lum(p.side)*1.7);
 assert.ok(lum(p.panelLit)>lum(p.panel)*1.35);
 assert.ok(lum(p.side)>18,"The principal wall still needs readable midtones");
 assert.equal(p.whiteCore,0xc3f6ff);
 assert.equal(p.cove,0x56d6eb);
 assert.equal(p.coveWarm,0xffbda4);
 assert.equal(STATION_ART_0203.stationPbrOnly,true);
 assert.equal(STATION_ART_0203.shellEmissiveAdded,false);
 assert.equal(STATION_ART_0203.roadAndShipMaterialsUnchanged,true);
});
test("PBR is nonemissive on metal and never changes main neon brightness",()=>{
 for(let i=0;i<4;i++){
  assert.equal(after.materials[i].name,before.materials[i].name);
  const a=after.materials[i],b=before.materials[i];
  if(i===0||i===1){
   assert.equal(a.emissiveFactor,undefined);
   assert.ok(a.pbrMetallicRoughness.metallicFactor<=
    b.pbrMetallicRoughness.metallicFactor);
  }else{
   assert.deepEqual(a,b,"Original ENERGY/GLASS material must be untouched");
  }
 }
 assert.equal(after.materials[0].pbrMetallicRoughness.metallicFactor,.22);
 assert.equal(after.materials[1].pbrMetallicRoughness.metallicFactor,.12);
});
test("world, bank, handling, old lighting and A/B baselines are intact",()=>{
 const p=planStationWorld(),q=originalPlan();
 assert.deepEqual(p.bays,q.bays);
 assert.equal(p.stats.panoramaWindowBays,6);
 assert.equal(p.stats.observationGroups,3);
 assert.equal(p.stats.closedCeiling,true);
 assert.equal(p.stats.continuousUnderdeck,true);
 assert.equal(p.stats.sideWallInsideMeters,14.5);
 assert.equal(p.stats.roadWidthChanged,false);
 assert.equal(p.stats.physicsChanges,0);
 assert.equal(WORLD_ART_0203.sceneLightsUnchanged,true);
 assert.equal(WORLD_ART_0203.roadMaterialUnchanged,true);
 assert.equal(WORLD_ART_0203.lowMemoryUsesSamePalette,true);
 assert.equal(planStationWorld({track:"aurora"}).active,false);
 const game=f("./game-v0203.mjs");
 for(const base of ["tracks/trials/trial-v0165","flight/unified-flight-v0165","flight/cinematic-v0165",
  "world/environment-art-pipeline-v02021","world/environment-art-pipeline-v0203"])
  assert.ok(game.includes('from "./'+base+'.mjs"'),base+" must remain imported");
 assert.match(game,/materialGrade"\)!=="classic"/);
 assert.match(game,/graphiteGradeEnabled\?installGraphiteWorldArt/);
 assert.match(game,/compareBeforeMaterial:"\?materialGrade=classic"/);
 assert.doesNotMatch(game,/world-material-readability-v0191/);
 assert.match(game,/version:"0\.20\.3"/);
 assert.match(f("./material-grade-v0203.html"),/boot-v0203\.js\?v=0\.20\.3/);
 assert.match(f("./legacy/boot/boot-v0203.js"),/game-v0203\.mjs\?v=0\.20\.3/);
});
