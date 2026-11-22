import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {installFullTunnelCircuit0270}
 from "./full-tunnel-circuit-v0270.mjs";
import {TUNNEL_PROFILE_0211} from "./tunnel-megastructure-v0211.mjs";
import {buildPremiumMetalAtlas0262} from "./premium-metal-surface-v0262.mjs";
import {VAULT_MATERIAL_PARITY_0271,buildVaultMaterialCoords0271,
 patchVaultMaterialShader0271,installVaultMaterialParity0271}
 from "./vault-material-parity-v0271.mjs";

const read=x=>readFileSync(new URL(x,import.meta.url),"utf8");
class FakeGroup{
 constructor(){this.children=[];this.name="";this.parent=null;}
 add(obj){this.children.push(obj);obj.parent=this;}
 removeFromParent(){if(this.parent)
  this.parent.children=this.parent.children.filter(x=>x!==this);
  this.parent=null;}
 getObjectByName(name){
  if(this.name===name)return this;
  for(const c of this.children){
   if(c.name===name)return c;
   const found=c.getObjectByName?.(name);
   if(found)return found;
  }
  return undefined;
 }
 traverse(fn){fn(this);for(const c of this.children){
  if(c.traverse)c.traverse(fn);else fn(c);
 }}
}
class FakeGeometry{
 constructor(){this.attributes={};this.index=null;}
 setAttribute(name,attr){this.attributes[name]=attr;}
 getAttribute(name){return this.attributes[name];}
 deleteAttribute(name){delete this.attributes[name];}
 setIndex(x){this.index=x;}
 computeVertexNormals(){}
 computeBoundingSphere(){}
 dispose(){}
}
class FakeAttribute{
 constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize;}
 getX(i){return this.array[i*this.itemSize];}
}
class FakeMaterial{
 constructor(opts){Object.assign(this,opts);this.isMeshBasicMaterial=true;
  this.userData={};this.onBeforeCompile=function(){};
  this.customProgramCacheKey=function(){return "basic-shader";};}
 dispose(){this.disposed=true;}
}
class FakeTexture{
 constructor(data,w,h){this.image={data,width:w,height:h};this.name="";}
 dispose(){this.disposed=true;}
}
class FakeMesh{
 constructor(g,m){this.geometry=g;this.material=m;this.name="";}
}
const THREE={
 Group:FakeGroup,BufferGeometry:FakeGeometry,
 Float32BufferAttribute:FakeAttribute,MeshBasicMaterial:FakeMaterial,
 Mesh:FakeMesh,DataTexture:FakeTexture,
 DoubleSide:2,RGBAFormat:1023,UnsignedByteType:1009,
 RepeatWrapping:1000,LinearFilter:1006,LinearMipmapLinearFilter:1008,
 NoColorSpace:""
};
const positionAt=(s,x,y)=>({x,y,z:s});
const shellCoord=(m,i)=>m.geometry.getAttribute("aVaultMaterialCoord0271").array[i*2];
const fakeVert="#include <common>\n#include <project_vertex>";
const fakeFrag="#include <common>\n#include <color_fragment>";
function setup(lowMemory=false,enabled=true,track="vault"){
 const world=new FakeGroup();
 const foundation=installFullTunnelCircuit0270(THREE,world,{
  enabled:true,track:"vault",lowMemory,positionAt
 });
 assert.equal(foundation.active,true,JSON.stringify(foundation.stats()));
 const before=world.getObjectByName("SKYSHIFT · Neon Vault Full Tunnel 0.27.0");
 const originalChildren=before.children.map(ch=>ch.children.slice());
 const shell=before.children[0].children[0],rib=before.children[0].children[1];
 const oldShellHook=shell.material.onBeforeCompile,oldRibHook=rib.material.onBeforeCompile;
 const material=installVaultMaterialParity0271(THREE,world,{
  foundation,enabled,lowMemory,track
 });
 return {world,foundation,material,root:before,originalChildren,
  oldShellHook,oldRibHook};
}
test("0.27.1 reuses exact 0.26.2 packed texture; does not claim native GGX",()=>{
 const v=VAULT_MATERIAL_PARITY_0271;
 assert.equal(v.version,"0.27.1");assert.equal(v.base,"0.27.0");
 assert.equal(v.nativeGGXImported,false);
 assert.equal(v.addedTextures,1);assert.equal(v.addedDrawCalls,0);
 for(const k of ["originalFixturesUnchanged","originalVaultGeometryUnchanged",
  "originalWorldSunSealUnchanged","originalRailUnchanged",
  "originalRoadUnchanged","originalShipUnchanged",
  "originalFlightUnchanged","originalGRIPUnchanged",
  "originalSkylineUnchanged","originalAuroraUnchanged"])
  assert.equal(v[k],true,k);
 assert.equal(buildPremiumMetalAtlas0262(256).pixels.length,256*256*4);
});
test("original indexed shell UVs are global in track metres, not reset at chunks",()=>{
 const x=setup();
 const a=x.root.children[0].children[0],b=x.root.children[1].children[0];
 const z=x.root.children.at(-1).children[0];
 const n=TUNNEL_PROFILE_0211.length;
 assert.equal(shellCoord(a,0),0);
 assert.equal(shellCoord(b,0),170);
 assert.equal(shellCoord(z,z.geometry.getAttribute("position").count-n),3400);
 // First row is physically the same cross-section at every chunk seam.
 const end=a.geometry.getAttribute("position").count-n;
 for(let j=0;j<n;j++){
  const left=a.geometry.getAttribute("aVaultMaterialCoord0271").array;
  const right=b.geometry.getAttribute("aVaultMaterialCoord0271").array;
  assert.equal(left[(end+j)*2],right[j*2]);
  assert.equal(left[(end+j)*2+1],right[j*2+1]);
 }
 x.material.dispose();x.foundation.dispose();
});
test("ribs align to actual 42.5m authored portals without tiling resets",()=>{
 const x=setup();
 for(const idx of [0,1,6,19]){
  const rib=x.root.children[idx].children[1],
   uv=rib.geometry.getAttribute("aVaultMaterialCoord0271");
  assert.equal(uv.count,rib.geometry.getAttribute("position").count);
  assert.ok(uv.getX(0)>=idx*170);
  assert.ok(uv.getX(uv.count-1)<=Math.min(3400,(idx+1)*170));
 }
 x.material.dispose();x.foundation.dispose();
});
test("shader inserts real atlas UV with seams, milling and legacy vertex source color intact",()=>{
 for(const role of ["shell","rib"])for(const mobile of [false,true]){
  const p=patchVaultMaterialShader0271(fakeVert,fakeFrag,{role,mobile});
  assert.match(p.vertexShader,/aVaultMaterialCoord0271/);
  assert.match(p.vertexShader,/vVaultMaterialCoord0271=aVaultMaterialCoord0271;/);
  assert.match(p.fragmentShader,/texture2D\(uVaultMetalAtlas0271,v271Tile\)/);
  assert.match(p.fragmentShader,/v271SeamLong/);
  assert.match(p.fragmentShader,/v271Titanium/);
  assert.match(p.fragmentShader,/diffuseColor\.rgb\*=mix/);
  assert.equal(p.fragmentShader.includes("v271Brushed"),!mobile);
  assert.ok(p.fragmentShader.includes("#include <color_fragment>"));
  assert.ok(!p.fragmentShader.includes("RE_Direct("));
  assert.ok(!p.fragmentShader.includes("directionalLights"));
 }
 assert.throws(()=>patchVaultMaterialShader0271("",fakeFrag));
});
test("existing 20 shell + 20 rib meshes, 60 draw batches unchanged High and 4GB",()=>{
 for(const mobile of [false,true]){
  const x=setup(mobile),status=x.material.stats();
  assert.equal(status.active,true,JSON.stringify(status));
  assert.equal(status.version,"0.27.1");
  assert.equal(status.atlasSize,mobile?128:256);
  assert.equal(status.decoratedMeshCount,40);
  assert.equal(status.decoratedSpanMeters,3400);
  assert.equal(status.addedDrawCalls,0);
  assert.equal(status.addedDynamicLights,0);
  assert.equal(status.addedRenderPasses,0);
  assert.equal(status.materialPrograms,2);
  assert.equal(x.root.children.length,20);
  assert.equal(x.foundation.stats().drawBatches,60);
  for(let i=0;i<20;i++){
   assert.equal(x.root.children[i].children.length,3);
   assert.deepEqual(x.root.children[i].children,x.originalChildren[i]);
   assert.ok(x.root.children[i].children[0].geometry.getAttribute("aVaultMaterialCoord0271"));
   assert.ok(x.root.children[i].children[1].geometry.getAttribute("aVaultMaterialCoord0271"));
   assert.equal(x.root.children[i].children[2].geometry.getAttribute("aVaultMaterialCoord0271"),undefined);
  }
  const shell=x.root.children[0].children[0],rib=x.root.children[0].children[1];
  assert.notEqual(shell.material.onBeforeCompile,x.oldShellHook);
  assert.notEqual(rib.material.onBeforeCompile,x.oldRibHook);
  x.material.setComparison(0);
  assert.equal(x.material.stats().strength,0);
  x.material.setComparison(1);
  assert.equal(x.material.stats().strength,1);
  x.material.dispose();
  assert.equal(shell.material.onBeforeCompile,x.oldShellHook);
  assert.equal(rib.material.onBeforeCompile,x.oldRibHook);
  assert.equal(shell.geometry.getAttribute("aVaultMaterialCoord0271"),undefined);
  x.foundation.dispose();
 }
});
test("classic, skyline, aurora never install new material",()=>{
 for(const [enabled,track] of [[false,"vault"],[true,"skyline"],[true,"aurora"]]){
  const x=setup(false,enabled,track);
  assert.equal(x.material.active,false);
  assert.equal(x.root.children[0].children[0].geometry.getAttribute("aVaultMaterialCoord0271"),undefined);
  x.foundation.dispose();
 }
});
test("game version, same-frame proof and comparison wired without changing existing physics",()=>{
 const g=read("./game-v0210.mjs"),h=read("./index.html");
 assert.match(g,/installVaultMaterialParity0271/);
 assert.match(g,/vaultMaterialParityEnabled=fullTunnelFoundationEnabled/);
 assert.match(g,/__skyshiftVaultMaterialProbe/);
 assert.match(g,/__skyshiftVaultMaterialFrameProof/);
 assert.match(g,/vaultMaterialComparison:"\?vaultMaterial=classic"/);
 assert.match(h,/(?:Neon Vault Material Parity|Architectural Geometry & Panel Parity|Full Tunnel Lighting & Visual Parity|Premium Tunnel Cohesion & Finish|Shared Tunnel Architecture 1.0|True Shared Tunnel Renderer|Shared Road Reflections & Ship Light Response|Vault Main Boost Glow & Risk Lane Cleanup|PMREM Reflection Pipeline 1.0|Shared Tunnel Spatial Wavefront Parity|Reflection Stability & Luminous Strip Definition|Arch Foot Light Assembly & Corner Signature|Precision Neon Emission & Local Metal Response|Cinematic Metal & Neon Reflection Rebalance|Shared Straight-Only Edge Lighting Parity|Ceiling Fixture Placement & Glow Cohesion|Premium Arch Optics & Chromatic Road Reflections|Unified Light Sources & Road Layer Cleanup|Road Light Spill Continuity & Wave-Coupled Cove Lighting|Curve Surface Artifact & Transition Seam Cleanup|Startup Stability & Shared Resource Deduplication)/);
 assert.match(g,/selected==="vault"\?"(?:0\.27\.(?:1|2|3|4)|0\.28\.[0123456789](?:\.[0-9]+)?)"/);
});
