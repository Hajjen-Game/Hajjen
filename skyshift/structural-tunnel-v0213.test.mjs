// SKYSHIFT 0.21.3 — actual curved 3D architectural rebuild invariants.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TUNNEL_PROFILE_0211,tunnelProfilePoint0211}
 from "./tunnel-megastructure-v0211.mjs";
import {STRUCTURAL_TUNNEL_0213,sampleStructuralFacet,
 buildStructuralTunnelData} from "./structural-tunnel-v0213.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const pos=(s,x,y)=>({x,y,z:s});
test("raised panels conform to ORIGINAL 0.21.1 vaulted sections",()=>{
 for(const s of [0,42,104,165,245,339,368])
  for(const j of [5,7,9,11,12,13,14,15,16,17,18,19,21,23,25]){
   const point=sampleStructuralFacet(s,j,.5,.32);
   const a=tunnelProfilePoint0211(j,s),b=tunnelProfilePoint0211(j+1,s);
   const sx=(a[0]+b[0])/2,sy=(a[1]+b[1])/2;
   assert.ok(Math.abs(Math.hypot(point[1]-sx,point[2]-sy)-.32)<.0001,
    "panel depth must be measured from original profile");
   assert.ok(Number.isFinite(point[1]+point[2]));
   assert.ok(Math.abs(point[1])>=12.2||point[2]>=25.95,
    "vault details never cut into road/ship envelope");
  }
 assert.equal(TUNNEL_PROFILE_0211.length,31);
});
test("high-quality detail creates three-dimensional wall, ceiling and support geometry",()=>{
 const d=buildStructuralTunnelData(pos);
 assert.equal(d.geometryBatches,2);
 assert.ok(d.plateCount>=500);
 assert.ok(d.secondaryArchCount>=10);
 assert.ok(d.primary.triangles>16000);
 assert.ok(d.detail.triangles>2500);
 assert.equal(d.totalTriangles,d.primary.triangles+d.detail.triangles);
 for(const item of [d.primary,d.detail]){
  assert.equal(item.positions.length,item.colors.length);
  assert.equal(item.positions.length/3,item.trackS.length);
  assert.equal(item.trackS.length,item.glowWeight.length);
  assert.ok(item.positions.every(Number.isFinite));
  assert.ok(item.colors.every(n=>Number.isFinite(n)&&n>=0&&n<=1));
  assert.ok(item.trackS.every(n=>n>=0&&n<=368));
  for(let i=0;i<item.trackS.length;i++){
   const x=item.positions[3*i],y=item.positions[3*i+1];
   assert.ok(Math.abs(x)>=12.2||y>=25.95,"Unsafe road intrusion");
  }
 }
});
test("4GB mode preserves essential structural rhythm at a fraction of geometry",()=>{
 const hi=buildStructuralTunnelData(pos);
 const lo=buildStructuralTunnelData(pos,{lowMemory:true});
 assert.equal(lo.geometryBatches,1);
 assert.equal(lo.detail.triangles,0);
 assert.ok(lo.plateCount>220);
 assert.ok(lo.plateCount<hi.plateCount);
 assert.ok(lo.secondaryArchCount>=5);
 assert.ok(lo.totalTriangles<hi.totalTriangles*.65,
  "mobile structural detail budget should be well under desktop");
 assert.ok(lo.primary.positions.every(Number.isFinite));
});
test("exact same original curved cross-section works with legacy tall ceiling",()=>{
 const old=buildStructuralTunnelData(pos,{lowMemory:true,vaultHeightClassic:true});
 assert.ok(old.totalTriangles>1000);
 const low=sampleStructuralFacet(160,15,.5,.32);
 const tall=sampleStructuralFacet(160,15,.5,.32,{vaultHeightClassic:true});
 assert.ok(tall[2]>low[2]+4,"classic ceiling returns to higher arch");
});
test("no world-light, physics, spectral wave or road-material overrides",()=>{
 assert.equal(STRUCTURAL_TUNNEL_0213.newColliders,0);
 assert.equal(STRUCTURAL_TUNNEL_0213.roadGeometryChanged,false);
 assert.equal(STRUCTURAL_TUNNEL_0213.gripChanged,false);
 assert.equal(STRUCTURAL_TUNNEL_0213.steeringChanged,false);
 assert.equal(STRUCTURAL_TUNNEL_0213.cameraChanged,false);
 assert.equal(STRUCTURAL_TUNNEL_0213.newDynamicLights,0);
 assert.equal(STRUCTURAL_TUNNEL_0213.globalLightsChanged,0);
 assert.equal(STRUCTURAL_TUNNEL_0213.additionalPostprocessPasses,0);
 assert.equal(STRUCTURAL_TUNNEL_0213.newDrawBatchesDesktop,2);
 assert.equal(STRUCTURAL_TUNNEL_0213.newDrawBatchesMobile,1);
 const code=read("./structural-tunnel-v0213.mjs");
 assert.match(code,/bindTunnelSpectrumMaterial/);
 assert.match(code,/updateTunnelSpectrumUniforms/);
 assert.match(code,/installExteriorLightSeal/);
 assert.match(code,/fog:false/);
 assert.match(code,/depthWrite:true/);
 assert.doesNotMatch(code,/new THREE\.PointLight|new THREE\.DirectionalLight/);
 const game=read("./game-v0210.mjs");
 assert.match(game,/structuralTunnelEnabled=exteriorSealEnabled/);
 assert.match(game,/get\("tunnelStructure"\)!=="classic"/);
 assert.match(game,/installStructuralTunnelRebuild/);
 assert.match(game,/compareBeforeStructure:"\?tunnelStructure=classic"/);
 assert.match(game,/__skyshiftStructureFrameProof/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.24\.1/);
 assert.match(read("./index.html"),/0\.24\.1/);
});
