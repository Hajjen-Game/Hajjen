// SKYSHIFT 0.13.2.1 — actual published glTF, not a future Blender promise.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SHIP_ART_0132,assessHeroAsset} from "../../ships/ship-art-pipeline-v0132.mjs";
const path=new URL("../../"+"./assets/ships/stingray-evo-hero-v1.gltf",import.meta.url);
const source=readFileSync(path,"utf8"),model=JSON.parse(source);
const named=name=>{
 const idx=model.meshes.findIndex(x=>x.name===name);
 assert.ok(idx>=0,"missing mesh "+name);
 return model.accessors[model.meshes[idx].primitives[0].attributes.POSITION];
};
test("actual preview asset is self-contained glTF 2.0, on track and light",()=>{
 assert.equal(model.asset.version,"2.0");
 assert.ok(source.length<SHIP_ART_0132.maxAssetBytes);
 assert.ok(model.buffers[0].uri.startsWith("data:application/octet-stream;base64,"));
 const buf=Buffer.from(model.buffers[0].uri.split(",")[1],"base64");
 assert.equal(buf.byteLength,model.buffers[0].byteLength);
 assert.equal(model.materials.length,8);
 assert.ok(model.meshes.length<=SHIP_ART_0132.maxDrawCalls);
 assert.ok(!model.images&&!model.textures&&!model.skins&&!model.animations);
 assert.ok(!model.extensionsUsed?.includes("KHR_lights_punctual"));
});
test("actual new wings have visibly broader manta silhouette",()=>{
 const left=named("Hero_Wing_L"),right=named("Hero_Wing_R");
 assert.ok(left.min[0]<=-3.7&&right.max[0]>=3.7);
 assert.ok(left.max[0]<0&&right.min[0]>0);
 assert.ok(right.min[2]<-2.3&&right.max[2]>2.45);
 const canopy=named("Hero_Canopy");
 assert.ok(canopy.max[1]>.72,"visibly raised low glass dome");
 assert.ok(canopy.min[2]<-2.4);
});
test("original engine sockets remain ±1.99m and nine plates are in local joint space",()=>{
 const L=named("Hero_Engine_L"),R=named("Hero_Engine_R");
 assert.ok(Math.abs((L.min[0]+L.max[0])/2+1.99)<.02);
 assert.ok(Math.abs((R.min[0]+R.max[0])/2-1.99)<.02);
 for(let i=1;i<=9;i++){
  const p=named("Hero_Tail_Plate_"+String(i).padStart(2,"0"));
  assert.ok(p.min[2]>=-.001&&p.max[2]<.68,
   "tail plates must mount directly into existing nine-joint animation");
 }
});
test("full named glTF scene passes same production strict runtime validator",()=>{
 const sharedMaterials=model.materials.map(m=>({name:m.name})),children=[];
 for(const node of model.nodes.filter(n=>n.mesh!==undefined)){
  const mesh=model.meshes[node.mesh],p=mesh.primitives[0],
   geo={attributes:{position:{count:model.accessors[p.attributes.POSITION].count}},
     index:{count:model.accessors[p.indices].count}};
  children.push({name:node.name,isMesh:true,geometry:geo,
   material:sharedMaterials[p.material],traverse(f){f(this)}});
 }
 const fake={isMesh:false,children,traverse(f){
  f(this);for(const n of children)n.traverse(f);
 }};
 const score=assessHeroAsset(fake);
 assert.deepEqual(score.errors,[]);
 assert.equal(score.valid,true);
 assert.equal(score.requiredNodes,17);
 assert.ok(score.triangles>1200&&score.triangles<8000);
 assert.equal(score.materials,8);
 assert.equal(score.meshes,34);
});
