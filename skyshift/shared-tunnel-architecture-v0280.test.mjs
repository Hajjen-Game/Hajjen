import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TUNNEL_PROFILE_0211,sampleSharedTunnelProfile0280,
 tunnelProfilePoint0211} from "./tunnel-megastructure-v0211.mjs";
import {buildSharedTunnelSection0280} from "./structural-tunnel-v0213.mjs";
import {vaultCrossSection0270} from "./full-tunnel-circuit-v0270.mjs";
import {SHARED_TUNNEL_STYLE_0280,SHARED_TUNNEL_ROUTES_0280,
 makeTunnelPlan0280,tunnelReleaseAtLeast0280,
 sharedTunnelVersionActive0280,sharedPhysicalPreset0280}
 from "./shared-tunnel-architecture-v0280.mjs";
import {createSharedTunnelRuntime0280}
 from "./shared-tunnel-runtime-v0280.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const pos=(s,x,y)=>({x,y,z:s});
const eq=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,String(a)+" != "+String(b));
test("original Skyline is one immutable source of panels, atlas and native coat",()=>{
 const p=SHARED_TUNNEL_STYLE_0280;
 assert.equal(p.geometry.panelDepthMeters,.58);
 assert.equal(p.geometry.panelBayMeters,22);
 assert.equal(p.geometry.panelSpanMeters,20.8);
 assert.equal(p.panels.palette.panel,0x142638);
 assert.equal(p.panels.palette.shadow,0x06111c);
 assert.equal(p.physical.atlasHigh,256);
 assert.equal(p.physical.atlas4GB,128);
 assert.ok(Object.isFrozen(p.panels.palette));
 assert.ok(Object.isFrozen(p.physical.panel));
 assert.match(read("./structural-tunnel-v0213.mjs"),/SHARED_TUNNEL_STYLE_0280\.panels\.palette/);
 assert.match(read("./vault-architectural-parity-v0272.mjs"),/buildSharedTunnelSection0280\(positionAt,SHARED_PLAN/);
});
test("one source profile has IDENTICAL Skyline 368m and Vault 3400m geometry",()=>{
 for(const s of [0,18,150,184,321,368])for(let j=0;j<TUNNEL_PROFILE_0211.length;j++){
  const a=tunnelProfilePoint0211(j,s),b=sampleSharedTunnelProfile0280(j,s,{start:0,period:368});
  eq(a[0],b[0]);eq(a[1],b[1]);
  const [x,y]=TUNNEL_PROFILE_0211[j],bend=.5-.5*Math.cos(2*Math.PI*s/368),
   strength=Math.max(0,Math.min(1,(y-4)/20));
  eq(a[0],x*(1+.015*bend*strength));
  eq(a[1],(y<=9?y:9+(y-9)*.82)+.55*bend*strength);
 }
 for(const s of [0,11,368,620,995,1840,3230,3400])
 for(let j=0;j<TUNNEL_PROFILE_0211.length;j++){
  const a=vaultCrossSection0270(j,s),b=sampleSharedTunnelProfile0280(j,s,{start:0,period:620});
  eq(a[0],b[0]);eq(a[1],b[1]);
 }
});
test("three current course plans are independent but consume one common look",()=>{
 const s=makeTunnelPlan0280({track:"skyline",trackLength:6500}),
  v=makeTunnelPlan0280({track:"vault",trackLength:3400,quality:"4GB"}),
  a=makeTunnelPlan0280({track:"aurora",trackLength:5200});
 assert.equal(s.totalEnclosedMeters,368);
 assert.equal(s.intervals[0].portals.length,10);
 assert.equal(v.totalEnclosedMeters,3400);
 assert.equal(v.totalChunks,20);
 assert.equal(v.intervals[0].portals.length,81);
 assert.equal(v.intervals[0].profilePeriod,620);
 assert.equal(a.totalChunks,0);
 assert.equal(s.style,v.style);
 assert.equal(SHARED_TUNNEL_ROUTES_0280.vault.segments[0].fixturePreset,"vault-source-0273");
});
test("future track with jumps and 2 disjoint tunnels reuses original Skyline sculptor",()=>{
 const p=makeTunnelPlan0280({
  track:"future",trackLength:6200,quality:"4GB",
  sections:[{start:845,end:1260,profilePeriod:415,portalPitch:42.5},
   {start:0,end:235,profilePeriod:235,portalPitch:42.5}]
 });
 assert.equal(p.totalEnclosedMeters,650);
 assert.equal(p.totalChunks,5);
 assert.equal(p.segmentAt(500),null);
 assert.equal(p.segmentAt(1000).start,845);
 for(let si=0;si<p.intervals.length;si++){
  for(let ci=0;ci<p.intervals[si].chunks.length;ci++){
   const chunk=p.intervals[si].chunks[ci];
   const d=buildSharedTunnelSection0280(pos,p,{
    segmentIndex:si,chunkIndex:ci,lowMemory:true,
    panelStepMeters:SHARED_TUNNEL_STYLE_0280.geometry.panelStep4GBMeters
   });
   assert.ok(d.primary.triangles>300);
   assert.ok(d.plateCount>0);
   assert.ok(d.primary.trackS.every(s=>s>=chunk.start-1e-8&&s<=chunk.end+1e-8));
   assert.ok(d.primary.positions.every(Number.isFinite));
  }
 }
});
test("bad overlap, style or position is rejected before creating any world geometry",()=>{
 const f={track:"future",trackLength:2500};
 assert.throws(()=>makeTunnelPlan0280(f));
 assert.throws(()=>makeTunnelPlan0280({...f,styleId:"fake",sections:[]}));
 assert.throws(()=>makeTunnelPlan0280({...f,quality:"ultra",sections:[]}));
 assert.throws(()=>makeTunnelPlan0280({...f,sections:[
  {start:0,end:900,profilePeriod:200},{start:850,end:1200,profilePeriod:200}
 ]}),/overlapping/);
 assert.throws(()=>makeTunnelPlan0280({...f,sections:[
  {start:2000,end:2600,profilePeriod:200}
 ]}),/outside/);
 assert.throws(()=>sampleSharedTunnelProfile0280(31,100));
 assert.throws(()=>sampleSharedTunnelProfile0280(5,100,{period:0}));
});
test("physical coat is shared, with deliberately preserved mobile opacity per track",()=>{
 const a=sharedPhysicalPreset0280("panel",false,"skyline"),
  b=sharedPhysicalPreset0280("panel",false,"vault");
 assert.deepEqual(a,b);
 assert.equal(a.metalness,.89);assert.equal(a.roughness,.36);
 assert.equal(a.opacity,.60);assert.equal(a.clearcoat,.14);
 assert.equal(sharedPhysicalPreset0280("panel",true,"skyline").opacity,.60);
 assert.equal(sharedPhysicalPreset0280("panel",true,"vault").opacity,.51);
 assert.equal(sharedPhysicalPreset0280("rib",true,"vault").opacity,.41);
 assert.equal(sharedPhysicalPreset0280("rib",true,"skyline").opacity,.49);
 assert.throws(()=>sharedPhysicalPreset0280("road"));
 assert.match(read("./true-metal-materials-v0260p2.mjs"),/sharedPhysicalPreset0280\(role,mobile,"skyline"\)/);
 assert.match(read("./vault-full-lighting-v0273.mjs"),/sharedPhysicalPreset0280\(role,mobile,"vault"\)/);
});
test("0.27 historical comparisons stay versioned, 0.28+ unlocks previous layers",()=>{
 for(const v of ["0.20.4","0.26.5","0.27.0","xyz"])
  assert.equal(tunnelReleaseAtLeast0280(v,1),false);
 for(const v of ["0.27.1","0.27.4","0.28.0","0.29.1","1.0.0"])
  assert.equal(tunnelReleaseAtLeast0280(v,1),true);
 assert.equal(tunnelReleaseAtLeast0280("0.27.2",3),false);
 assert.equal(tunnelReleaseAtLeast0280("0.28.0",4),true);
 assert.equal(sharedTunnelVersionActive0280("0.27.4"),false);
 assert.equal(sharedTunnelVersionActive0280("0.28.0"),true);
});
test("one runtime delegates original Skyline installer with explicit shared plan",()=>{
 const w={},three={},r=createSharedTunnelRuntime0280(three,w,{
  track:"skyline",trackLength:6500,positionAt:pos
 });
 let calls=0;
 const mounted=r.installSkyline((t,world,opts)=>{
  calls++;assert.equal(t,three);assert.equal(world,w);
  assert.equal(opts.sharedTunnelPlan0280.styleId,SHARED_TUNNEL_STYLE_0280.id);
  return {stats:()=>({active:true,structuralPlates:100})};
 },{track:"skyline"});
 assert.ok(mounted);assert.equal(calls,1);
 assert.equal(r.audit().skyline.sourcePanels,100);
 assert.throws(()=>r.installSkyline(()=>{}),/duplicate/);
 const classic=createSharedTunnelRuntime0280(three,w,{
  track:"skyline",trackLength:6500,positionAt:pos,enabled:false
 });
 classic.installSkyline((_t,_w,opts)=>{
  assert.equal(opts.sharedTunnelPlan0280,undefined);
  return {stats:()=>({active:true})};
 });
});
test("race engine, GRIP and roads are not involved in the new shared visual pipeline",()=>{
 const g=read("./game-v0210.mjs");
 assert.match(g,/createSharedTunnelRuntime0280\(THREE,world/);
 assert.match(g,/sharedTunnelRuntime\.installVault\(/);
 assert.match(g,/sharedTunnelRuntime\.installSkyline\(/);
 assert.match(g,/__skyshiftSharedTunnelAudit/);
 assert.match(g,/tunnelReleaseAtLeast0280/);
 assert.match(g,/selected==="vault"\?"0\.28\.[0123456789]"/);
 assert.match(read("./shared-tunnel-runtime-v0280.mjs"),/originalPhysicsUntouched:true/);
});
