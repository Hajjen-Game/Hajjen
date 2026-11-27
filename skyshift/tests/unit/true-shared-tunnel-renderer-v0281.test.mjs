import test from "node:test";
import assert from "node:assert/strict";
import {TRUE_SHARED_RENDERER_0281,planTrueSharedTunnel0281,
 adaptSourcePosition0281,installTrueSharedTunnelRenderer0281}
 from "../../tunnel/true-shared-tunnel-renderer-v0281.mjs";

test("0.28.1 uses source renderer, not an independently colored Vault skin",()=>{
 assert.equal(TRUE_SHARED_RENDERER_0281.renderer,
  "installPremiumMetalSurfaceLibrary");
 assert.equal(TRUE_SHARED_RENDERER_0281.sourceLength,368);
 assert.equal(TRUE_SHARED_RENDERER_0281.changesFlight,false);
 assert.equal(TRUE_SHARED_RENDERER_0281.changesGrip,false);
 assert.equal(TRUE_SHARED_RENDERER_0281.addsColliders,0);
});
test("all 3400 metres are covered by balanced real Skyline source modules",()=>{
 const modules=planTrueSharedTunnel0281(3400);
 assert.equal(modules.length,10);
 assert.equal(modules[0].start,0);
 assert.equal(modules.at(-1).end,3400);
 for(let i=0;i<modules.length;i++){
  const item=modules[i];
  assert.ok(Math.abs(item.meters-340)<1e-7);
  assert.ok(Math.abs(item.scale-340/368)<1e-7);
  if(i)assert.equal(item.start,modules[i-1].end);
 }
 assert.equal(planTrueSharedTunnel0281(368).length,1);
 assert.equal(planTrueSharedTunnel0281(736).length,2);
});
test("source geometry transforms only the along-track coordinate, with unchanged bank/lateral/height",()=>{
 const module=planTrueSharedTunnel0281(3400)[6];
 const sampler=(s,x,y)=>({s,x,y});
 const point=adaptSourcePosition0281(sampler,module);
 assert.deepEqual(point(0,-24.1,12),{s:2040,x:-24.1,y:12});
 assert.deepEqual(point(184,-13.5,29),{s:2210,x:-13.5,y:29});
 assert.deepEqual(point(368,24.1,2),{s:2380,x:24.1,y:2});
 assert.throws(()=>point(369,0,0),/outside module/);
 assert.throws(()=>adaptSourcePosition0281(null,module),/banked/);
});
test("old renderer remains available, and non-Vault tracks cannot receive Vault modules",()=>{
 assert.equal(installTrueSharedTunnelRenderer0281(null,null,{
  enabled:false,track:"vault"}).active,false);
 assert.equal(installTrueSharedTunnelRenderer0281(null,null,{
  enabled:true,track:"skyline"}).active,false);
 assert.equal(installTrueSharedTunnelRenderer0281(null,null,{
  enabled:true,track:"aurora"}).active,false);
 assert.throws(()=>planTrueSharedTunnel0281(0),/finite/);
 assert.throws(()=>planTrueSharedTunnel0281(200000),/budget/);
});

import {planConfiguredTunnelModules0281,validateSharedTunnelPolicy,
 installConfiguredSharedTunnel} from "../../tunnel/true-shared-tunnel-renderer-v0281.mjs";

test("EF05 explicit full-course plan retains the exact approved Vault source module layout",()=>{
 assert.deepEqual(planConfiguredTunnelModules0281(3400,[{start:0,end:3400}]),
  planTrueSharedTunnel0281(3400));
 assert.deepEqual(planConfiguredTunnelModules0281(368,[{start:0,end:368}]),
  planTrueSharedTunnel0281(368));
});
test("EF05 same renderer plan accepts independent banked/elevated disjoint sections",()=>{
 const modules=planConfiguredTunnelModules0281(1200,[{start:800,end:1120},{start:25,end:625}]);
 assert.equal(modules.length,3);
 assert.equal(modules[0].start,25);assert.equal(modules[1].end,625);
 assert.equal(modules[2].start,800);assert.equal(modules[2].end,1120);
 const track=(s,x,h)=>({x:Math.cos(s/100)*80+x*Math.cos(s/40),
  y:Math.sin(s/80)*6+x*Math.sin(s/40)+h,z:s});
 for(const m of modules){
  const sample=adaptSourcePosition0281(track,m);
  assert.deepEqual(sample(0,3,2),track(m.start,3,2));
  assert.deepEqual(sample(184,3,2),track(m.start+m.meters/2,3,2));
  assert.deepEqual(sample(368,3,2),track(m.end,3,2));
 }
 assert.throws(()=>planConfiguredTunnelModules0281(1200,[{start:25,end:625},{start:624,end:800}]),/overlapping/);
 assert.throws(()=>planConfiguredTunnelModules0281(1200,[{start:800,end:1201}]),/outside|invalid/);
});
test("EF05 explicit renderer policy needs no track name or URL and validates before allocating",()=>{
 const policy={spatialWave:true,stableStrips:true,archFeet:true,precisionNeon:true,
  cinematicMetal:true,straightOnly:true,ceilingFixtures:true,premiumArch:true,
  waveCove:true,fastFrames:false,straightRanges:[{from:40,to:120,id:"fixture"}]};
 const validated=validateSharedTunnelPolicy(policy,200);
 assert.ok(Object.isFrozen(validated));assert.ok(Object.isFrozen(validated.straightRanges[0]));
 assert.throws(()=>validateSharedTunnelPolicy({...policy,straightRanges:undefined},200),/straight ranges/);
 assert.throws(()=>validateSharedTunnelPolicy({...policy,straightRanges:[{from:40,to:201}]},200),/outside/);
 assert.equal(installConfiguredSharedTunnel(null,null,{trackLength:200,sections:[],policy}).active,false);
 // Enter the actual original renderer with arbitrary track metadata, without
 // a fake success result: missing Three/world is rejected before allocation.
 assert.throws(()=>installConfiguredSharedTunnel(null,null,{
  track:"independent-fixture",trackLength:200,sections:[{start:20,end:180}],policy,
  positionAt:(s,x,y)=>({x,y,z:s})}),/original Three/);
});

import {omitLegacyRoadResponseEF05} from "../../tunnel/true-shared-tunnel-renderer-v0281.mjs";
test("EF05 obsolete source allocation is omitted only for current clean production",()=>{
 for(const version of ["0.28.9.7","0.28.9.8","0.28.9.9"]){
  const current="?track=vault&v="+version;
  assert.equal(omitLegacyRoadResponseEF05(current,true),true);
  assert.equal(omitLegacyRoadResponseEF05(current,false),false);
  assert.equal(omitLegacyRoadResponseEF05(current+"&startupAudit=1&trackRepairSmoke=1",true),true);
  for(const q of ["&roadLayers=classic","&unifiedSourcesSmoke=1","&archOpticsSmoke=1","&archLegacyRoad=off","&startupFrameProof=1"])
   assert.equal(omitLegacyRoadResponseEF05(current+q,true),false);
 }
 assert.equal(omitLegacyRoadResponseEF05("?track=vault&v=0.28.9.4",true),false);
 assert.equal(omitLegacyRoadResponseEF05("?track=skyline&v=0.28.9.7",true),false);
 assert.equal(omitLegacyRoadResponseEF05("?track=skyline&v=0.28.9.8",true),false);
});
