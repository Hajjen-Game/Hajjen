import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {VAULT_LIGHTING_0273,vaultFixtureAt0273,buildVaultPhysicalSources0273,
 buildVaultRailSources0273,patchVaultRailGGX0273,installVaultFullLighting0273}
 from "./vault-full-lighting-v0273.mjs";
import {vaultCrossSection0270}
 from "./full-tunnel-circuit-v0270.mjs";
import {buildVaultArchitectureData0272}
 from "./vault-architectural-parity-v0272.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const positionAt=(s,x,y)=>({x,y,z:s});
class A{
 constructor(arr,itemSize){this.array=arr;this.itemSize=itemSize;this.count=arr.length/itemSize;}
 getX(i){return this.array[i*this.itemSize];}
 getY(i){return this.array[i*this.itemSize+1];}
}
const fake=map=>({getAttribute:k=>map[k]});
test("0.27.3 uses the original Skyline real GGX chain; no new world light or physics",()=>{
 const v=VAULT_LIGHTING_0273;
 assert.equal(v.version,"0.27.3");assert.equal(v.lengthMeters,3400);
 assert.equal(v.physicalMaterial,"MeshPhysicalMaterial");
 assert.equal(v.highMetalTaps,7);assert.equal(v.mobileMetalTaps,5);
 assert.equal(v.roofSourcePitch,27);assert.equal(v.amberSourcePitch,42.5);
 assert.equal(v.railSourcePitch,24);
 assert.deepEqual(v.sourceChain.slice(0,3),[
  "0.26.0 P2 native physical metal GGX",
  "0.26.1 finite strip multi-sample GGX",
  "0.26.5 source-masked wall roughness and response"]);
 for(const prop of ["originalPanelsUnchanged","originalTrackUnchanged",
  "originalShipUnchanged","originalCameraUnchanged",
  "originalGRIPUnchanged","originalPhysicsUnchanged",
  "skylineUnchanged","auroraUnchanged","noNewWorldLights",
  "noNewPostprocess","noNewColliders","sourceAtlasShared"])
  assert.equal(v[prop],true,prop);
});
test("real Vault source anchors follow actual authored roof, amber and C2 geometry",()=>{
 for(const s of [0,12,368,995,1840,3230,3400]){
  for(const side of [-1,1]){
   const p=vaultFixtureAt0273(s,side,positionAt);
   assert.ok(p.cs>=0&&p.cs<=3400);
   assert.ok(p.ws>=0&&p.ws<=3400);
   assert.equal(p.cold.x,side*8.8);assert.equal(p.warm.x,side*25.18);
   assert.ok(p.cold.y>19&&p.cold.y<32,"real roof y "+p.cold.y);
   assert.equal(p.warm.y,8.4);
   assert.ok(p.cMask>=0&&p.cMask<=1);
   assert.ok(p.wMask>=0&&p.wMask<=1);
  }
 }
 assert.throws(()=>vaultFixtureAt0273(3401,1,positionAt));
 assert.throws(()=>vaultFixtureAt0273(100,0,positionAt));
});
test("real 0.27.2 sculptor emits true local attributes for physical GGX all lap",()=>{
 for(const chunk of [0,5,10,19]){
  const part=buildVaultArchitectureData0272(positionAt,chunk,{lowMemory:true}).primary;
  assert.ok(part.localSection.length>5000);
  assert.equal(part.localSection.length,part.positions.length/3*2);
  const geo=fake({trackS:new A(part.trackS,1),
   neonLocalSection:new A(part.localSection,2),
   position:new A(part.positions,3)});
  const q=buildVaultPhysicalSources0273(geo,positionAt,{mobile:true});
  assert.equal(q.vertices,part.trackS.length);
  assert.equal(q.cold.length,q.vertices*3);
  assert.equal(q.warm.length,q.vertices*3);
  assert.equal(q.axis.length,q.vertices*3);
  assert.equal(q.masks.length,q.vertices*2);
  assert.ok(q.bright>100);
  assert.ok(q.coldSamples>50);
  assert.ok(q.warmSamples>20);
  for(const k of [q.cold,q.warm,q.axis,q.masks])
   assert.ok(Array.from(k.slice(0,200)).every(Number.isFinite));
 }
});
test("true existing indexed aero-rail samples 24m source windows across 3400m",()=>{
 const s=[5,8,15,29,990,1840,3230,3390];
 const a=s.concat(s).flatMap(x=>Array(8).fill(x));
 const geo=fake({aBarrierArc:new A(a,1),
  position:new A(new Float32Array(a.length*3),3)});
 const high=buildVaultRailSources0273(geo,positionAt),
  low=buildVaultRailSources0273(geo,positionAt,{mobile:true});
 assert.ok(high.litVertices>15);
 assert.equal(high.vertices,a.length);
 assert.equal(high.a.length,a.length*3);
 assert.equal(high.b.length,a.length*3);
 assert.equal(low.b,null);
 assert.ok(high.mask.some(x=>x>0.4));
 assert.equal(high.mask[7],0,"buried rail profile must remain matte");
 assert.ok(high.mask.at(-8)>0.01,"last portion of full circuit still lit");
});
test("0.27.3 rail uses native GGX on original MeshStandardMaterial material",()=>{
 const vs="#include <common>\n#include <worldpos_vertex>";
 const fs=[
  "#include <common>","#include <roughnessmap_fragment>",
  "#include <metalnessmap_fragment>","#include <lights_fragment_maps>"
 ].join("\n");
 for(const mobile of [false,true]){
  const x=patchVaultRailGGX0273(vs,fs,{mobile});
  assert.match(x.vertexShader,/aVaultRailSourceA0273/);
  assert.match(x.fragmentShader,/uVaultRailResponse0273/);
  assert.match(x.fragmentShader,/RE_Direct\(v27Rail,geometryPosition/);
  assert.match(x.fragmentShader,/reflectedLight\.directDiffuse=v27OldDiffuse/);
  assert.equal(x.vertexShader.includes("aVaultRailSourceB0273"),!mobile);
  assert.equal((x.fragmentShader.match(/RE_Direct\(v27Rail/g)||[]).length,mobile?1:2);
 }
 assert.throws(()=>patchVaultRailGGX0273("",fs));
});
test("the build does not install on older circuits or comparison classic",()=>{
 const base=installVaultFullLighting0273({},null,{enabled:false,track:"vault"});
 assert.equal(base.active,false);
 const skyline=installVaultFullLighting0273({},null,{enabled:true,track:"skyline"});
 assert.equal(skyline.active,false);
 const g=read("./game-v0210.mjs");
 assert.match(g,/vaultFullLightingEnabled=vaultArchitectureEnabled/);
 assert.match(g,/installVaultFullLighting0273/);
 assert.match(g,/vaultFullLightingComparison:"\?vaultLighting=classic"/);
 assert.match(g,/__skyshiftVaultLightingFrameProof/);
 assert.match(g,/selected==="vault"\?"(?:0\.27\.(?:3|4)|0\.28\.[012345])"/);
 assert.match(read("./index.html"),/(?:Full Tunnel Lighting & Visual Parity · 0\.27\.3|Premium Tunnel Cohesion & Finish · 0\.27\.4|Shared Tunnel Architecture 1.0 · 0\.28\.0|True Shared Tunnel Renderer · 0\.28\.1|Shared Road Reflections & Ship Light Response · 0\.28\.2|Vault Main Boost Glow & Risk Lane Cleanup · 0\.28\.3|PMREM Reflection Pipeline 1.0 · 0\.28\.4|Shared Tunnel Spatial Wavefront Parity · 0\.28\.5)/);
});
