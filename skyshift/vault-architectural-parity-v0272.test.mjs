import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildStructuralTunnelData,sampleStructuralFacet}
 from "./structural-tunnel-v0213.mjs";
import {vaultCrossSection0270}
 from "./full-tunnel-circuit-v0270.mjs";
import {buildVaultArchitectureData0272,VAULT_ARCHITECTURE_0272}
 from "./vault-architectural-parity-v0272.mjs";
import {TUNNEL_PROFILE_0211}
 from "./tunnel-megastructure-v0211.mjs";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const pos=(s,x,y)=>({x,y,z:s});
test("actual original Skyline 0.24.1 panel sculptor is imported, not imitated",()=>{
 assert.equal(VAULT_ARCHITECTURE_0272.originalBuilder,"buildStructuralTunnelData");
 assert.equal(VAULT_ARCHITECTURE_0272.originalPanelDepthMeters,.58);
 assert.equal(VAULT_ARCHITECTURE_0272.originalStructuralPortalPitchMeters,42.5);
 assert.equal(VAULT_ARCHITECTURE_0272.trackLengthMeters,3400);
 const source=read("./vault-architectural-parity-v0272.mjs");
 // Vault now calls the SAME public Skyline sculptor entry point that
 // Skyline uses, rather than duplicating the original 0.24.1 builder.
 assert.match(source,/import \{buildSharedTunnelSection0280\}/);
 const originalBuilder=read("./structural-tunnel-v0213.mjs");
 assert.match(originalBuilder,/return buildStructuralTunnelData\(positionAt,/);
 assert.match(source,/depthStudy:true/);
 assert.match(source,/unifiedDepth:true,surfaceCraftsmanship:true/);
 assert.match(source,/profilePoint:vaultCrossSection0270/);
 assert.match(source,/patchVaultMaterialShader0271/);
 assert.doesNotMatch(source,/new THREE\.PointLight|new THREE\.DirectionalLight/);
});
test("unchanged Skyline default facet still uses original 368m profile and limits",()=>{
 const s=sampleStructuralFacet(178,12,.5,.58);
 const original=buildStructuralTunnelData(pos,{lowMemory:true});
 assert.equal(original.geometryBatches,1);
 assert.ok(s[2]>=25.95);
 assert.ok(original.primary.triangles>2000);
 assert.ok(original.primary.trackS.every(x=>x>=0&&x<=368));
 assert.throws(()=>sampleStructuralFacet(430,12,.5,.58));
 assert.doesNotThrow(()=>sampleStructuralFacet(430,12,.5,.58,{
  arcStart:340,arcEnd:510,profilePoint:vaultCrossSection0270}));
});
test("high/mobile real 3D panels follow the actual C2 banked vault far beyond 368m",()=>{
 for(const lowMemory of [false,true]){
  const samples=[0,5,10,19].map(chunk=>
   buildVaultArchitectureData0272(pos,chunk,{lowMemory}));
  assert.equal(samples.length,4);
  let triangles=0;
  for(const r of samples){
   assert.ok(r.primary.triangles>2500,"primary real panels missing in "+r.chunkIndex);
   assert.ok(r.primary.positions.length/3===r.primary.trackS.length);
   assert.ok(r.primary.materialProfile.length===r.primary.trackS.length);
   assert.ok(r.primary.glowWeight.length===r.primary.trackS.length);
   assert.ok(r.plateCount>15);
   assert.equal(r.copiedFromOriginalSkylineSource,true);
   assert.equal(r.physicallyRaisedPanels,true);
   assert.ok(r.primary.trackS.every(x=>x>=r.from&&x<=r.to));
   assert.ok(r.primary.positions.every(Number.isFinite));
   for(let i=0;i<r.primary.positions.length;i+=3){
    const x=r.primary.positions[i],y=r.primary.positions[i+1];
    assert.ok(Math.abs(x)>=12.2||y>=25.95,
     "0.27.2 entered craft/road envelope on chunk "+r.chunkIndex);
   }
   if(lowMemory)assert.equal(r.detail.triangles,0);
   else assert.ok(r.detail.triangles>300,"original service conduits absent");
   triangles+=r.totalTriangles;
  }
  assert.ok(triangles>(lowMemory?10000:15000),
   "original Skyline mobile panel geometry remains a meaningful but reduced silhouette");
 }
});
test("the 0.27.1 shared metal atlas and culling preserve previous batch and flight APIs",()=>{
 const g=read("./game-v0210.mjs");
 const a=read("./vault-architectural-parity-v0272.mjs");
 assert.match(g,/installVaultArchitectureParity0272/);
 assert.match(g,/vaultArchitectureEnabled=vaultMaterialParityEnabled/);
 assert.match(g,/vaultArchitectureComparison:"\?vaultArchitecture=classic"/);
 assert.match(g,/__skyshiftVaultArchitectureProbe/);
 assert.match(g,/__skyshiftVaultArchitectureFrameProof/);
 assert.match(a,/const atlas=materialParity\?\.getMetalAtlas\?\.\(\);/);
 assert.match(a,/mesh\.frustumCulled=true/);
 assert.match(a,/newColliders:0,worldLightsAdded:0,postprocessPassesAdded:0/);
 for(const name of ["originalTrackGeometryUnchanged","originalRoadUnchanged",
  "originalRailUnchanged","originalShipUnchanged","originalPhysicsUnchanged",
  "originalGripUnchanged","originalCameraUnchanged","originalSkylineUnchanged",
  "originalAuroraUnchanged","noDynamicLights","noNewRenderPasses"])
  assert.equal(VAULT_ARCHITECTURE_0272[name],true,name);
 const old=read("./vault-material-parity-v0271.mjs");
 assert.match(old,/getMetalAtlas\(\)\{return atlas;\}/);
 assert.match(read("./index.html"),/(?:Architectural Geometry & Panel Parity · 0\.27\.2|Full Tunnel Lighting & Visual Parity · 0\.27\.3|Premium Tunnel Cohesion & Finish · 0\.27\.4|Shared Tunnel Architecture 1.0 · 0\.28\.0|True Shared Tunnel Renderer · 0\.28\.1|Shared Road Reflections & Ship Light Response · 0\.28\.2)/);
});
