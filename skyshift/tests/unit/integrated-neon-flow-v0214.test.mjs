// SKYSHIFT 0.21.4: optical guidance and exact original-track invariants.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {INTEGRATED_NEON_FLOW_0214,buildIntegratedNeonFlowData}
 from "../../rendering/integrated-neon-flow-v0214.mjs";
import {buildStructuralTunnelData}
 from "../../structural-tunnel-v0213.mjs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const pos=(s,x,y)=>({x,y,z:s});
test("4 deliberate uninterrupted light flows follow original banked arch",()=>{
 const d=buildIntegratedNeonFlowData(pos);
 assert.equal(d.paths.length,4);
 assert.deepEqual(d.paths.map(p=>p.name),[
  "LEFT_WALL","RIGHT_WALL","LEFT_CROWN","RIGHT_CROWN"]);
 assert.equal(d.batchCount,2);
 assert.equal(d.segmentsPerPath,184);
 assert.equal(d.cores.triangles,4*184*4);
 assert.equal(d.recesses.triangles,4*184*4);
 for(const geom of [d.cores,d.recesses]){
  assert.equal(geom.positions.length,geom.colors.length);
  assert.equal(geom.positions.length/3,geom.trackS.length);
  assert.equal(geom.trackS.length,geom.glowWeight.length);
  assert.ok(geom.positions.every(Number.isFinite));
  assert.ok(geom.trackS.every(s=>s>=0&&s<=368));
  for(let i=0;i<geom.trackS.length;i++){
   const x=geom.positions[i*3],y=geom.positions[i*3+1];
   assert.ok(Math.abs(x)>=12.2||y>=25.95,
    "No luminous detail or channel may intersect ship/road envelope");
  }
 }
 assert.ok(Math.max(...d.cores.glowWeight)>.7);
 assert.ok(Math.max(...d.cores.glowWeight)<=.8);
 assert.ok(d.cores.glowWeight.some(w=>w<.06),"endpoints taper gently");
 assert.equal(d.paths.filter(p=>p.name.includes("WALL")).length,2);
 assert.equal(d.paths.filter(p=>p.name.includes("CROWN")).length,2);
});
test("neon ribbon follows nontrivial bank and turn, not straight fake x/z",()=>{
 const curved=(s,x,y)=>{
  const yaw=s/225,bank=.18*Math.sin(s/70);
  return {x:s*.25+x*Math.cos(yaw)-y*Math.sin(bank),
   y:y*Math.cos(bank)+x*Math.sin(bank),
   z:s*.86+x*Math.sin(yaw)};
 };
 const d=buildIntegratedNeonFlowData(curved);
 assert.ok(d.cores.positions.every(Number.isFinite));
 const xyz=d.cores.positions;
 let length=0; // Adjacent longitudinal samples on one strand
 for(let i=0;i<40;i++){
  const k=i*12;
  length+=Math.hypot(xyz[k+12]-xyz[k],xyz[k+13]-xyz[k+1],
   xyz[k+14]-xyz[k+2]);
 }
 assert.ok(length>25);
 assert.equal(INTEGRATED_NEON_FLOW_0214.physicsUnchanged,true);
});
test("low-memory has one batch with fewer samples and zero recess geometry",()=>{
 const hi=buildIntegratedNeonFlowData(pos);
 const mobile=buildIntegratedNeonFlowData(pos,{lowMemory:true});
 assert.equal(mobile.batchCount,1);
 assert.equal(mobile.recesses.triangles,0);
 assert.ok(mobile.segmentsPerPath<hi.segmentsPerPath);
 assert.ok(mobile.triangles<hi.triangles*.34);
 assert.equal(mobile.paths.length,4);
});
test("0.21.4 specifically calms repetitive panel rhythm without altering 0.21.3",()=>{
 const original=buildStructuralTunnelData(pos);
 const calmer=buildStructuralTunnelData(pos,{flowCohesion:true});
 assert.ok(original.plateCount>=500);
 assert.ok(calmer.plateCount<original.plateCount*.8);
 assert.equal(original.architecturalBayPitch,14);
 assert.equal(calmer.architecturalBayPitch,22);
 assert.ok(calmer.secondaryArchCount<original.secondaryArchCount);
 assert.equal(calmer.geometryBatches,original.geometryBatches);
 const high=original.primary.colors,low=calmer.primary.colors;
 const avg=(v)=>v.reduce((a,b)=>a+b,0)/v.length;
 assert.ok(avg(low)<avg(high)*.7,"muted graphite must be darker, not just fewer panels");
});
test("flow cannot revive exterior light, replace steering or allocate lighting passes",()=>{
 const c=INTEGRATED_NEON_FLOW_0214;
 assert.equal(c.paths,4);assert.equal(c.newLights,0);
 assert.equal(c.newRenderPasses,0);assert.equal(c.newColliders,0);
 assert.equal(c.roadUnchanged,true);assert.equal(c.railUnchanged,true);
 assert.equal(c.shipUnchanged,true);assert.equal(c.gripUnchanged,true);
 assert.equal(c.cameraUnchanged,true);assert.equal(c.globalSunUnchanged,true);
 assert.equal(c.globalBloomUnchanged,true);
 const code=read("./rendering/integrated-neon-flow-v0214.mjs");
 assert.match(code,/installStructuralTunnelRebuild/);
 assert.match(code,/flowCohesion:true/);
 assert.match(code,/bindTunnelSpectrumMaterial/);
 assert.match(code,/updateTunnelSpectrumUniforms/);
 assert.match(code,/fog:false/);
 assert.match(code,/depthWrite:false/);
 assert.doesNotMatch(code,/new THREE\.PointLight|new THREE\.DirectionalLight/);
 const game=read("./game-v0210.mjs");
 assert.match(game,/integratedNeonFlowEnabled=structuralTunnelEnabled/);
 assert.match(game,/get\("tunnelFlow"\)!=="classic"/);
 assert.match(game,/installIntegratedNeonFlow/);
 assert.match(game,/compareBeforeIntegratedFlow:"\?tunnelFlow=classic"/);
 assert.match(game,/__skyshiftFlowFrameProof/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.\d+/);
 assert.match(read("./index.html"),/0\.26\.\d+/);
});
