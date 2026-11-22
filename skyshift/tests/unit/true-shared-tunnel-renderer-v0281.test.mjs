import test from "node:test";
import assert from "node:assert/strict";
import {TRUE_SHARED_RENDERER_0281,planTrueSharedTunnel0281,
 adaptSourcePosition0281,installTrueSharedTunnelRenderer0281}
 from "../../true-shared-tunnel-renderer-v0281.mjs";

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
