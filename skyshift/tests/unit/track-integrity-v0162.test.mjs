// SKYSHIFT 0.16.2 — Aurora separate, actual road/collision, no risk lines.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
// Track selector intentionally activates before importing the shared modules.
globalThis.location={search:"?track=aurora"};
const [selection,layout,trial,track3d,risk,boost,smooth,premium,aero,shadow,tt,racing]=
 await Promise.all([
 import("../../tracks/shared/track-selection-v0160.mjs"),
 import("../../tracks/shared/circuit-layout-v0160.mjs"),
 import("../../trial-v0162.mjs"),
 import("../../tracks/shared/track-3d-v0160.mjs"),
 import("../../risk-reward-v0160.mjs"),
 import("../../flight/boost/boost-v0160.mjs"),
 import("../../smooth-track-v0160.mjs"),
 import("../../premium-track-v0160.mjs"),
 import("../../tracks/barriers/aero-barrier-v0162.mjs"),
 import("../../shadow-tunnel-v0160.mjs"),
 import("../../time-trial-v0160.mjs"),
 import("../../racing-experience-v0160.mjs")]);
const src=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const near=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps,
 "expected "+a+" ≈ "+b);
test("two independent track choices exist; Aurora truly selected",()=>{
 assert.equal(selection.TRACKS_0160.length,3);
 assert.equal(selection.parseTrackId("?track=vault"),"vault");
 assert.equal(selection.ACTIVE_TRACK_0160.id,"aurora");
 assert.equal(selection.parseTrackId("?track=skyline"),"skyline");
 assert.equal(selection.parseTrackId("?track=aurora"),"aurora");
 assert.equal(selection.parseTrackId("?track=unsupported"),"skyline");
 assert.equal(layout.CIRCUIT.name,"AURORA RUN");
 assert.equal(trial.TRIAL.length,3400);
 assert.equal(trial.TRIAL.raceLength,10200);
 assert.equal(trial.TRIAL.laps,3);
 assert.equal(layout.AUTHORED_SECTIONS.length,12);
 assert.equal(layout.COURSE_SEGMENTS.filter(s=>s.type==="turn").length,6);
});
test("genuinely distinct 3D course closes without seam or short microbends",async()=>{
 near(layout.CIRCUIT_LENGTH,3400,1e-5);
 assert.ok(trial.LOOP_CLOSURE_ERROR_METERS<1,
  "underlying geometric closure drift must be <1m before compensation");
 near(trial.headingAt(3400)-trial.headingAt(0),Math.PI*2,1e-7);
 const a=trial.poseAt(0),z=trial.poseAt(3400);
 near(a.x,z.x);near(a.z,z.z);near(a.y,z.y);
 const old=await import("../../trial-v0151.mjs");
 const orig=old.positionAt(550),fresh=trial.positionAt(550);
 assert.ok(Math.hypot(orig.x-fresh.x,orig.z-fresh.z)>20,
  "Aurora cannot just recolor the Skyline course");
 for(let i=0;i<3400;i+=2){
  assert.ok(Number.isFinite(trial.positionAt(i).x));
  assert.ok(Math.abs(trial.curvatureAt(i))<=.011,
   "Aurora's switchbacks stay wide and fair");
  assert.equal(trial.widthAt(i),23.2);
 }
 const turnCount=trial.COURSE_SEGMENTS.filter(s=>s.turnAngle!==0).length;
 assert.equal(turnCount,6);
 assert.ok(trial.COURSE_SEGMENTS.some(s=>s.length>=440&&s.type==="turn"));
 assert.ok(trial.COURSE_SEGMENTS.some(s=>s.length>350&&s.type==="straight"));
});
test("no risk/SAFE lines, mandatory jumps, magnetic walls, or rotating corkscrew",()=>{
 assert.equal(risk.RHYTHM_GATES_0160.length,0);
 assert.equal(risk.BOOST_CHOICES_0160.length,0);
 assert.equal(risk.RACE_BOOST_CHOICES_0160.length,0);
 assert.equal(premium.GLSL_BOOST_PADS.length,0);
 assert.equal(premium.PREMIUM_TRACK.boostPads,0);
 assert.equal(trial.GAPS.length,0);
 assert.equal(trial.GRIP_APEX.fullGripRequiredAtFastestZone,false);
 assert.equal(track3d.TRACK_3D.jumpCount,0);
 assert.equal(track3d.TRACK_3D.corkscrew,false);
 assert.equal(track3d.TRACK_3D.wallRide,false);
 for(const s of [0,50,570,695,900,1650,3120,3399]){
  assert.equal(risk.riskChoiceAt(s,0),null);
  assert.equal(risk.riskCueAt(s,0,[]),null);
  assert.equal(trial.gapAt(s),null);
  assert.ok(trial.guardrailLateralLimit(s)>7);
 }
});
test("physical road, guardrails and geometry all follow the SAME new flight",()=>{
 const deck=smooth.createSmoothDeckData();
 assert.ok(deck.rows>3000&&deck.triangles>10000);
 const rail=aero.createAeroBarrierData();
 assert.ok(rail.positions.length>20000);
 assert.equal(premium.PREMIUM_TRACK.drawBatches,1);
 const sample=smooth.sampleDeckRows(20);
 for(const row of sample.filter((_,i)=>i%12===0))
  for(const p of row.points)
   assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z));
 const r=aero.sampleAeroProfile(1350,1);
 const edge=trial.positionAt(1350,trial.widthAt(1350)/2);
 assert.ok(Math.hypot(r[0].x-edge.x,r[0].z-edge.z)<3);
 near(trial.GEOMETRY_BREAKS.at(-1),3400);
 assert.equal(trial.GEOMETRY_BREAKS[0],0);
});
test("open hills and gentle bank follow complete selected lap geometry",()=>{
 assert.equal(track3d.ELEVATION_KEYS.at(-1).s,3400);
 assert.ok(track3d.elevationAt(2810)>12);
 assert.ok(track3d.elevationAt(1880)<0);
 assert.ok(track3d.magneticBankAt(1370)>0);
 assert.ok(Math.abs(track3d.magneticBankAt(800))<.14);
 near(track3d.elevationAt(0),track3d.elevationAt(3400));
 near(track3d.gradeAt(0),track3d.gradeAt(3400));
 assert.equal(shadow.SHADOW_TUNNEL.start,910);
 assert.equal(shadow.SHADOW_TUNNEL.end,1180);
 const tunnel=shadow.createShadowTunnelData();
 assert.ok(tunnel.shell.length>0);
 assert.ok(racing.RACING_0121.precisionWindows.every(w=>w.id.startsWith("aurora-")));
});
test("boost-free 120Hz driving retains steering and ordinary cruise",()=>{
 const st=trial.newFlightState();
 assert.equal(st.boostActivatedIds.length,0);
 for(let i=0;i<240;i++){
  const result=trial.stepFlight(st,1/120,{steer:0,grip:false});
  assert.equal(result.boostActivated,null);
 }
 assert.equal(st.boostActivations,0);
 assert.equal(st.boostMultiplier,1);
 assert.equal(st.safeBoosts,0);
 assert.equal(st.riskBoosts,0);
 assert.ok(st.s>50);
 assert.equal(st.failed,false);
 assert.equal(boost.BOOST_PADS.length,0);
});
test("empty risk-pad GLSL compiles to numeric zero, not missing expression",()=>{
 const fragment=premium.SURFACE_FRAGMENT_GLSL;
 assert.match(fragment,/float safeCoverage = 0\.0;/);
 assert.match(fragment,/float riskCoverage = 0\.0;/);
 assert.match(fragment,/float riskLead = 0\.0;/);
 assert.doesNotMatch(fragment,/float \w+\s*=\s*;/);
});
test("PB/ghost separate from Skyline while keeping Skyline saved records",async()=>{
 const original=(await import("../../time-trial-v0151.mjs")).TIME_TRIAL_0151;
 assert.notEqual(tt.TIME_TRIAL_0160.storageKey,original.storageKey);
 assert.notEqual(tt.TIME_TRIAL_0160.trackRevision,original.trackRevision);
 assert.equal(tt.TIME_TRIAL_0160.trackId,"aurora-flow-v0160");
 assert.equal(tt.TIME_TRIAL_0160.raceMeters,10200);
});
test("menu uses real circuit selector and Skyline-only Challenges not shown on Aurora",()=>{
 const html=src("./index.html"),game=src("./legacy/game/game-v0162.mjs"),
  boot=src("./legacy/boot/boot-v0162.js");
 assert.match(html,/id="track-picker"/);
 assert.match(html,/value="aurora"/);
 assert.match(html,/value="skyline"/);
 assert.match(boot,/game-v0162\.mjs\?v=0\.16\.2/);
 assert.match(game,/trackPicker\.addEventListener\("change"/);
 assert.match(game,/challengeButton\.classList\.toggle\("hidden",!ACTIVE_TRACK_0160\.hasSkylineChallenges\)/);
 assert.match(game,/from "\.\/trial-v0162\.mjs"/);
 assert.match(game,/from "\.\/tracks\/barriers\/aero-barrier-v0162\.mjs"/);
 assert.match(game,/from "\.\/shadow-tunnel-v0160\.mjs"/);
 assert.match(game,/ship\.rotation\.z=naturalRoll;/);
});


test("Aurora camera obeys Aurora's physical bank, never archived Skyline 360 roll",async()=>{
 const [camera,oldCamera]=await Promise.all([
  import("../../cinematic-v0162.mjs"),
  import("../../cinematic-v0901.mjs")]);
 // Regression: the old chase camera imported trial-v0901 and incorrectly
 // treated Aurora's final 3005-3338m turn as a full corkscrew.
 assert.ok(Math.abs(oldCamera.cameraBankAt(3180))>2,
  "reproduce the actual old final-corner 360-degree camera bug");
 for(let s=0;s<3400;s+=4){
  const bank=trial.bankAt(s),render=camera.cameraBankAt(s);
  assert.ok(Math.abs(bank)<=.121,"physical bank stays gentle");
  assert.ok(Math.abs(render)<=.121,
   "camera must never roll more than 7 degrees on Aurora at "+s);
  near(render,bank*.46,1e-8);
 }
 // Real camera preview altitude must follow the selected Aurora hills,
 // not the archived Skyline height profile.
 for(const at of [500,950,1110,1740,2650,2840,3180]){
  const p=trial.positionAt(at,0),y=trial.surfaceHeightAt(at)+trial.TRIAL.hoverHeight;
  const roll=trial.bankAt(at),ca=Math.cos(roll);
  const pose=camera.chasePose({worldX:p.x,worldZ:p.z,y,s:at,steering:0,
   clearance:0},{cameraHeading:trial.headingAt(at),hover:0},
   {preview:0});
  const delta=trial.heightAt(at+36)-trial.heightAt(at);
  const expected=y+1.25+Math.max(-7.5,Math.min(7.5,delta*.68));
  near(pose.lookY,expected,1e-6);
  assert.ok(Number.isFinite(pose.y));
 }
});
test("Aurora metal contact sparks are on Aurora rails, never old Skyline world space",async()=>{
 const sparks=await import("../../rail-scrape-sparks-v0162.mjs");
 const oldSparks=await import("../../rail-scrape-sparks-v01091.mjs");
 for(const s of [250,715,1530,2060,2750,3180]){
  for(const side of [-1,1]){
   const q=sparks.railContactPoint(s,side);
   const physical=trial.positionAt(s,side*(trial.widthAt(s)*.5-.69),.68);
   assert.ok(Math.hypot(q.x-physical.x,q.y-physical.y,q.z-physical.z)<1e-6);
   assert.equal(q.side,side);
  }
 }
 const wrong=oldSparks.railContactPoint(3180,-1);
 const correct=sparks.railContactPoint(3180,-1);
 assert.ok(Math.hypot(wrong.x-correct.x,wrong.z-correct.z)>30,
  "reproduce the old displaced metallic spark position");
});
test("No ghost right-apex guidance or Skyline-only leap signs on Aurora",()=>{
 const game=src("./legacy/game/game-v0162.mjs");
 assert.match(game,/const cue=isAurora\(\)\?\{visible:false/);
 assert.match(game,/if\(!isAurora\(\)\)makeBillboard\("SKYLINE LEAP"/);
 assert.match(game,/makeBillboard\(isAurora\(\)\?"LUMEN PASS":"SHADOW TUNNEL"/);
 assert.match(game,/ACTIVE_TRACK_0160\.name\+" COMPLETE"/);
 assert.match(game,/from "\.\/cinematic-v0162\.mjs"/);
 assert.match(game,/from "\.\/unified-flight-v0162\.mjs"/);
 assert.match(game,/from "\.\/rail-scrape-sparks-v0162\.mjs"/);
 const rig=src("./flight/unified-flight-v0162.mjs");
 assert.match(rig,/from "\.\/cinematic-v0162\.mjs"/);
 const realCamera=src("./cinematic-v0162.mjs");
 assert.match(realCamera,/from "\.\/trial-v0162\.mjs"/);
 assert.doesNotMatch(realCamera,/from "\.\/trial-v0901\.mjs"/);
});
test("Aurora rail tessellation cuts mobile triangles, collision/ship physics intact",async()=>{
 const rail=await import("../../tracks/barriers/aero-barrier-v0162.mjs");
 const optimized=rail.createAeroBarrierData();
 const archived=rail.createAeroBarrierData(.95);
 assert.ok(optimized.indices.length<archived.indices.length*.76,
  "fewer rail triangles on a 4GB mobile GPU");
 assert.ok(optimized.indices.length>archived.indices.length*.50,
  "do not over-decimate rail silhouette");
 assert.equal(trial.TRIAL.maxYawRate,1.24);
 assert.equal(trial.GAPS.length,0);
 assert.equal(trial.TRIAL.hoverHeight,1.05);
 const source=src("./tracks/barriers/aero-barrier-v0162.mjs");
 assert.match(source,/from "\.\.\/\.\.\/trial-v0162\.mjs"/);
 assert.match(source,/step=isAurora\(\)\?1\.55:AERO_BARRIER\.step/);
});
test("0.16.2 URLs and menu preserve independent courses and PB/ghosts",()=>{
 const html=src("./index.html"),game=src("./legacy/game/game-v0162.mjs");
 assert.match(html,/boot-v0162\.js\?v=0\.16\.2/);
 assert.match(src("./legacy/boot/boot-v0162.js"),/game-v0162\.mjs\?v=0\.16\.2/);
 assert.match(game,/trackPicker\.addEventListener\("change"/);
 assert.match(game,/from "\.\/time-trial-v0160\.mjs"/);
 assert.equal(tt.TIME_TRIAL_0160.storageKey,"skyshift-time-trial-ghost-aurora-0160");
});
