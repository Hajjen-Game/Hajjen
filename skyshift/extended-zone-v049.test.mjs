// SKYSHIFT 0.4.9 — extended C2 route and world-space wave tests.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 TRIAL,COURSE_SEGMENTS,GEOMETRY_BREAKS,CHECKPOINTS,ARCHES,
 curvatureAt,headingAt,bankAt,positionAt,poseAt,validateTrial,
 speedAt,newFlightState,stepFlight,GUARDRAIL,guardrailLateralLimit
} from "./trial-v049.mjs";
import {BOOST_PADS,BOOST_CONFIG} from "./boost-v049.mjs";
import {MESH_SPEC,createSmoothDeckData} from "./smooth-track-v049.mjs";
import {AERO_BARRIER,createAeroBarrierData,createAeroDetailData} from "./aero-barrier-v049.mjs";
import {ZONE_WAVE,ZONE_PALETTES,newZoneWaveState,updateZoneWave,stageAtS} from "./zone-wave-v049.mjs";
import {
 PREMIUM_TRACK,GLSL_BOOST_PADS,SURFACE_FRAGMENT_GLSL,
 SURFACE_FRAGMENT_HELPERS,createPremiumTrackMaterial,patchPremiumShaders,
 premiumTrackCoordinates
} from "./premium-track-v049.mjs";
const source=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const near=(a,b,eps=1e-5)=>assert.ok(Math.abs(a-b)<=eps, `expected ${a} ≈ ${b}`);
const reference=await import("./trial-v048.mjs");
test("1530m authored course is exactly 3x, has six real bends, and preserves opening 424m",()=>{
 assert.equal(TRIAL.length,510*3);
 assert.equal(COURSE_SEGMENTS.length,13);
 const turns=COURSE_SEGMENTS.filter(s=>s.type==="turn");
 assert.equal(turns.length,6);
 assert.equal(COURSE_SEGMENTS[0].start,0);
 assert.equal(COURSE_SEGMENTS.at(-1).end,1530);
 assert.equal(ARCHES.at(-1).s,1523);
 assert.ok(CHECKPOINTS.at(-1)>1400);
 assert.deepEqual(validateTrial(),[]);
 for(let i=1;i<COURSE_SEGMENTS.length;i++)
  near(COURSE_SEGMENTS[i].start,COURSE_SEGMENTS[i-1].end);
 for(let s=0;s<=424;s+=4){
  near(curvatureAt(s),reference.curvatureAt(s));
  near(speedAt(s),reference.speedAt(s),1e-9);
  near(headingAt(s),reference.headingAt(s));
  const a=poseAt(s),b=reference.poseAt(s);
  near(a.x,b.x,.001);near(a.z,b.z,.001);
 }
 for(const bend of turns){
  const a=bend.start,b=bend.end;
  near(curvatureAt(a),0);
  near(curvatureAt(b),0);
  for(let x of [a,a+.1,b-.1,b])
   assert.ok(Math.abs(bankAt(x))<.40);
 }
 assert.ok(turns.some(t=>t.curvature<0));
 assert.ok(turns.some(t=>t.curvature>0));
 near(speedAt(850),47);
 near(speedAt(1530),47);
});
test("all five boosted road inlays are within real straights and authoritative rails",()=>{
 assert.equal(BOOST_PADS.length,5);
 assert.equal(GLSL_BOOST_PADS.length,BOOST_PADS.length);
 for(const pad of BOOST_PADS){
  const segment=COURSE_SEGMENTS.find(c=>c.type==="straight"&&pad.start>=c.start+10&&pad.end<=c.end-10);
  assert.ok(segment,`boost ${pad.id} not safely on straight`);
  near(curvatureAt((pad.start+pad.end)/2),0);
  assert.ok(Math.max(Math.abs(pad.lateralMin),Math.abs(pad.lateralMax))<
   guardrailLateralLimit(pad.start));
  const graphic=GLSL_BOOST_PADS.find(p=>p.id===pad.id);
  assert.deepEqual(graphic,{id:pad.id,start:pad.start,end:pad.end,
   min:pad.lateralMin,max:pad.lateralMax});
 }
 assert.equal(BOOST_CONFIG.multiplier,1.30);
 assert.equal(GUARDRAIL.collisionMargin,reference.GUARDRAIL.collisionMargin);
});
test("1530m smooth deck + aero barriers use the same extended geometry",()=>{
 const g=createSmoothDeckData();
 assert.equal(g.cols,7);
 assert.equal(g.rows,Math.ceil(TRIAL.length/MESH_SPEC.sampleStep)+1);
 assert.ok(g.triangles>30000&&g.triangles<55000);
 const {data,coords}=premiumTrackCoordinates();
 assert.equal(data.rows,g.rows);
 assert.equal(coords.length,2*g.rows*g.cols);
 const s=coords.at(-2);
 near(s,1530);
 const rails=createAeroBarrierData(),details=createAeroDetailData();
 assert.ok(rails.triangles>40000&&rails.triangles<75000);
 assert.ok(details.curveChevrons>40);
 assert.ok(details.accentAnchors.at(-1)===1530);
 for(const check of [900,1200,1500]){
  const p=positionAt(check,0,0);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));
 }
});
test("wave triggers 10/20/30 seconds exactly, with an initial front behind ship",()=>{
 const state=newZoneWaveState();
 let result=updateZoneWave(state,9.99,475);
 assert.equal(result.activeCount,0);assert.equal(result.stage,0);
 result=updateZoneWave(state,10,480);
 assert.deepEqual(result.started,[1]);
 assert.equal(state.waves[0].startS,390);
 assert.equal(result.fronts[0],390);
 assert.equal(stageAtS(state,480),0);
 // Player at 45m/s, front at 114m/s. It passes ~1.31s later.
 result=updateZoneWave(state,12,570);
 assert.equal(result.stage,1);
 assert.ok(result.fronts[0]>570);
 result=updateZoneWave(state,19.99,900);
 assert.equal(result.activeCount,1);
 result=updateZoneWave(state,20,905);
 assert.deepEqual(result.started,[2]);
 assert.equal(state.waves[1].startS,815);
 result=updateZoneWave(state,22,995);
 assert.equal(result.stage,2);
 result=updateZoneWave(state,30,1350);
 assert.deepEqual(result.started,[3]);
 assert.equal(state.waves[2].startS,1260);
 result=updateZoneWave(state,32,1440);
 assert.equal(result.stage,3);
 assert.deepEqual(state.activatedStages,[1,2,3]);
 assert.deepEqual(state.passedStages,[1,2,3]);
 assert.equal(state.waves.length,3);
});
test("wave positions are bound to flight-time (pause-safe), not render frame counts",()=>{
 const a=newZoneWaveState(),b=newZoneWaveState();
 for(let t=0;t<13.01;t+=1/120)updateZoneWave(a,t,5+45*t);
 for(let t=0;t<13.01;t+=1/30)updateZoneWave(b,t,5+45*t);
 // Sample both at exactly same time and player position.
 updateZoneWave(a,13,590);updateZoneWave(b,13,590);
 near(a.fronts[0],b.fronts[0],1);
 assert.equal(a.playerStage,b.playerStage);
 const prev=a.fronts[0];
 updateZoneWave(a,13,590);near(a.fronts[0],prev);
});
test("four track palettes are distinct and staged shader updates never rebuild geometry",()=>{
 assert.equal(ZONE_PALETTES.length,4);
 assert.equal(ZONE_WAVE.firstSeconds,10);
 assert.equal(ZONE_WAVE.frontMetersPerSecond,114);
 assert.equal(ZONE_WAVE.featherMeters,6);
 assert.equal(ZONE_WAVE.shaderUniformOnly,true);
 assert.equal(PREMIUM_TRACK.colorAnimation,true);
 assert.equal(PREMIUM_TRACK.drawBatches,1);
 assert.equal(PREMIUM_TRACK.floatingDecalBatches,0);
 assert.match(SURFACE_FRAGMENT_GLSL,/waveCrest/);
 assert.match(SURFACE_FRAGMENT_GLSL,/zoneBase/);
 assert.match(SURFACE_FRAGMENT_HELPERS,/uniform float uZoneFront3/);
 class C{constructor(value){this.value=value;}set(v){this.value=v;return this;}}
 class M{constructor(options){this.options=options;}}
 const THREE={Color:C,MeshStandardMaterial:M,DoubleSide:2};
 const track=createPremiumTrackMaterial(THREE);
 const shader={
  vertexShader:"#include <common>\n#include <begin_vertex>",
  fragmentShader:"#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>",
  uniforms:{}
 };
 track.material.onBeforeCompile(shader);
 for(let k=1;k<=3;k++){
  assert.ok(shader.uniforms["uZoneFront"+k]);
  assert.ok(shader.uniforms["uZone"+k+"Base"]);
  assert.ok(shader.uniforms["uZone"+k+"Guide"]);
 }
 const original=shader.uniforms.uZoneFront1;
 track.setWaveState({activeCount:2,fronts:[630,540,-10000]});
 assert.equal(shader.uniforms.uZoneFront1,original);
 assert.equal(original.value,630);
 assert.equal(shader.uniforms.uZoneActiveCount.value,2);
 assert.match(shader.fragmentShader,/wave1On/);
 assert.match(shader.fragmentShader,/totalEmissiveRadiance \+= zoneGuide/);
});
test("active 0.4.9 uses extended modules, dynamic palettes and no screen flash",()=>{
 const game=source("game-v049.mjs"),page=source("index.html");
 assert.match(page,/game-v049\.mjs\?v=0\.4\.9/);
 for(const dep of ["trial-v049","boost-v049","premium-track-v049","smooth-track-v049","aero-barrier-v049","zone-wave-v049"])
  assert.ok(game.includes(`from "./${dep}.mjs"`),dep);
 assert.match(game,/updateZoneWave\(zoneWave,flight\.elapsed,flight\.s\)/);
 assert.match(game,/premiumSurface\?\.setWaveState\(zoneWave\)/);
 assert.match(game,/zoneWave\.playerStage/);
 assert.match(game,/version:"0\.4\.9"/);
 assert.match(game,/skyshift-zone-v049-audit\.json/);
 assert.match(game,/ENGINE_SOCKETS/);
 assert.doesNotMatch(game,/UI\.flash\.classList\.add\("active"\)/);
 assert.ok(page.includes("1530 M"));
});
