// SKYSHIFT Architecture Cleanup 2.0 — final Stage N cross-track contract.
// Independent of visuals: demonstrates current course separation and reusable
// geometry for a future course without changing any released renderer or physics.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TRACKS_0160} from '../../tracks/shared/track-selection-v0160.mjs';
import {SHARED_TUNNEL_STYLE_0280,SHARED_TUNNEL_ROUTES_0280,
 makeTunnelPlan0280} from '../../tunnel/shared-tunnel-architecture-v0280.mjs';
import {buildSharedTunnelSection0280} from '../../tunnel/structural-tunnel-v0213.mjs';
import {createSharedTunnelRuntime0280} from '../../tunnel/shared-tunnel-runtime-v0280.mjs';
import {planTrueSharedTunnel0281,adaptSourcePosition0281,
 TRUE_SHARED_RENDERER_0281} from '../../tunnel/true-shared-tunnel-renderer-v0281.mjs';

const rootRead=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const pos=(s,lateral,height)=>({x:lateral,y:height,z:s});

test('Stage N: all three shipped routes have one shared style and separate geometry',()=>{
 assert.deepEqual(TRACKS_0160.map(t=>t.id),['skyline','aurora','vault']);
 assert.equal(new Set(TRACKS_0160.map(t=>t.trackRevision)).size,3);
 const configs={
  skyline:makeTunnelPlan0280({track:'skyline',trackLength:3400}),
  aurora:makeTunnelPlan0280({track:'aurora',trackLength:3400}),
  vault:makeTunnelPlan0280({track:'vault',trackLength:3400,quality:'4GB'})
 };
 assert.equal(configs.skyline.totalEnclosedMeters,368);
 assert.equal(configs.skyline.intervals.length,1);
 assert.equal(configs.aurora.totalEnclosedMeters,0);
 assert.equal(configs.aurora.totalChunks,0);
 assert.equal(configs.vault.totalEnclosedMeters,3400);
 assert.equal(configs.vault.intervals.length,1);
 assert.equal(configs.vault.totalChunks,20);
 assert.equal(configs.skyline.style,configs.vault.style);
 assert.equal(configs.aurora.style,configs.vault.style);
 assert.equal(configs.skyline.style,SHARED_TUNNEL_STYLE_0280);
 assert.equal(SHARED_TUNNEL_ROUTES_0280.aurora.segments.length,0);
 assert.equal(SHARED_TUNNEL_ROUTES_0280.skyline.segments[0].fixturePreset,'skyline-original-0265');
 assert.equal(SHARED_TUNNEL_ROUTES_0280.vault.segments[0].fixturePreset,'vault-source-0273');
 for(const track of TRACKS_0160){
  const runtime=createSharedTunnelRuntime0280({}, {},{
   track:track.id,trackLength:3400,positionAt:pos,lowMemory:track.id==='vault'
  });
  assert.equal(runtime.audit().styleId,SHARED_TUNNEL_STYLE_0280.id);
  assert.equal(runtime.audit().track,track.id);
  assert.equal(runtime.audit().sectionCount,configs[track.id].intervals.length);
  runtime.dispose();
 }
});

test('Stage N: Vault reuses actual Skyline source but keeps the shared race engine',()=>{
 assert.equal(TRUE_SHARED_RENDERER_0281.renderer,'installPremiumMetalSurfaceLibrary');
 assert.equal(TRUE_SHARED_RENDERER_0281.changesRoad,false);
 assert.equal(TRUE_SHARED_RENDERER_0281.changesRails,false);
 assert.equal(TRUE_SHARED_RENDERER_0281.changesShip,false);
 assert.equal(TRUE_SHARED_RENDERER_0281.changesFlight,false);
 assert.equal(TRUE_SHARED_RENDERER_0281.changesGrip,false);
 const modules=planTrueSharedTunnel0281(3400);
 assert.equal(modules.length,10);
 assert.equal(modules[0].start,0);
 assert.equal(modules.at(-1).end,3400);
 const sample=adaptSourcePosition0281(pos,modules[4]);
 assert.deepEqual(sample(0,-2.5,12),{x:-2.5,y:12,z:1360});
 assert.deepEqual(sample(368,2.5,6),{x:2.5,y:6,z:1700});
 const game=rootRead('game-v0210.mjs');
 assert.match(game,/createSharedTunnelRuntime0280\(THREE,world/);
 assert.match(game,/sharedTunnelRuntime\.installTrueShared\(/);
 assert.match(game,/sharedTunnelRuntime\.installVault\(/);
 assert.match(game,/sharedTunnelRuntime\.installSkyline\(/);
 const physics=rootRead('tracks/trials/trial-v0165.mjs');
 assert.match(physics,/\.\.\/shared\/track-selection-v0160\.mjs/);
 assert.match(physics,/\.\.\/shared\/circuit-layout-v0160\.mjs/);
});

test('Stage N: a fourth course can reuse the existing sculptor with separated tunnel sections',()=>{
 const future=makeTunnelPlan0280({
  track:'future-contract-probe',trackLength:6200,quality:'4GB',
  sections:[
   {start:845,end:1260,profilePeriod:415,portalPitch:42.5},
   {start:0,end:235,profilePeriod:235,portalPitch:42.5}
  ]
 });
 assert.equal(future.totalEnclosedMeters,650);
 assert.equal(future.totalChunks,5);
 assert.deepEqual(future.intervals.map(x=>x.start),[0,845]);
 assert.equal(future.segmentAt(600),null);
 assert.equal(future.segmentAt(1000).start,845);
 const runtime=createSharedTunnelRuntime0280({}, {},{
  track:'future-contract-probe',trackLength:6200,
  positionAt:pos,lowMemory:true,sections:[
   {start:845,end:1260,profilePeriod:415,portalPitch:42.5},
   {start:0,end:235,profilePeriod:235,portalPitch:42.5}
  ]
 });
 assert.equal(runtime.audit().sectionCount,2);
 assert.equal(runtime.audit().chunkCount,5);
 assert.equal(runtime.audit().styleId,SHARED_TUNNEL_STYLE_0280.id);
 runtime.dispose();
 let chunks=0;
 for(let si=0;si<future.intervals.length;si++)
  for(let ci=0;ci<future.intervals[si].chunks.length;ci++){
   const part=future.intervals[si].chunks[ci];
   const mesh=buildSharedTunnelSection0280(pos,future,{
    segmentIndex:si,chunkIndex:ci,lowMemory:true,
    panelStepMeters:SHARED_TUNNEL_STYLE_0280.geometry.panelStep4GBMeters
   });
   assert.ok(mesh.primary.triangles>300);
   assert.ok(mesh.plateCount>0);
   assert.ok(mesh.primary.positions.every(Number.isFinite));
   assert.ok(mesh.primary.trackS.every(s=>s>=part.start-1e-8&&s<=part.end+1e-8));
   chunks++;
  }
 assert.equal(chunks,5);
 assert.throws(()=>makeTunnelPlan0280({
  track:'bad-future',trackLength:6200,
  sections:[{start:0,end:900,profilePeriod:200},
   {start:850,end:1200,profilePeriod:200}]
 }),/overlapping/);
});
