// SKYSHIFT 0.4.9.7 — Elevated Rails & Corner Readability.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 AERO_BARRIER,AERO_PROFILE,cornerRailEmphasisAt,railHeightAt,
 sampleAeroProfile,createAeroBarrierData,createAeroDetailData,
 patchRailShaders
} from "./aero-barrier-v0497.mjs";
import {AERO_BARRIER as PRIOR,createAeroDetailData as priorDetail}
 from "./aero-barrier-v0496.mjs";
import {GUARDRAIL,TRIAL,headingAt,widthAt,guardrailLateralLimit}
 from "./trial-v0494.mjs";
const source=name=>readFileSync(new URL(name,import.meta.url),"utf8");
const epsilon=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,
  "Expected "+a+" to equal "+b);
test("straight rails are 27% taller, corners rise smoothly and collision is unchanged",()=>{
 assert.equal(TRIAL.length,1530);
 assert.equal(GUARDRAIL.height,.78);
 assert.equal(PRIOR.height,.78);
 assert.equal(AERO_BARRIER.height,.99);
 assert.equal(AERO_BARRIER.bendHeightMeters,1.11);
 assert.equal(AERO_BARRIER.physicalColliderHeightMeters,.78);
 assert.equal(AERO_BARRIER.colliderUnchanged,true);
 assert.equal(AERO_PROFILE.length,8);
 epsilon(railHeightAt(30),.99);
 assert.ok(railHeightAt(160)>1.10);
 assert.ok(railHeightAt(160)<=1.11);
 assert.ok(cornerRailEmphasisAt(30)===0);
 const step=.5;
 let largestJump=0;
 for(let s=0;s<TRIAL.length-step;s+=step){
  const a=railHeightAt(s),b=railHeightAt(s+step);
  assert.ok(a>=.99-1e-9&&a<=1.11+1e-9);
  assert.ok(Number.isFinite(b));
  largestJump=Math.max(largestJump,Math.abs(b-a));
 }
 assert.ok(largestJump<.02,"no rapid short-segment wall height jumps");
 const l=guardrailLateralLimit(160);
 epsilon(l,widthAt(160)/2-GUARDRAIL.collisionMargin);
 assert.ok(Number.isFinite(headingAt(160)));
});
test("visual armor uses the same track coordinate mesh; no extra panel breaks",()=>{
 const rail=createAeroBarrierData();
 assert.equal(rail.columns,AERO_PROFILE.length);
 assert.equal(rail.rows,Math.ceil(TRIAL.length/AERO_BARRIER.step)+1);
 assert.equal(rail.positions.length,rail.colors.length);
 assert.equal(rail.indices.length/3,rail.triangles);
 assert.equal(AERO_BARRIER.drawBatches,PRIOR.drawBatches);
 assert.equal(AERO_BARRIER.drawBatches,3);
 const near=sampleAeroProfile(30,1);
 const bend=sampleAeroProfile(160,1);
 assert.equal(near.length,8);
 assert.equal(bend.length,8);
 for(const pt of [...near,...bend])
  assert.ok(Number.isFinite(pt.x)&&Number.isFinite(pt.y)&&Number.isFinite(pt.z));
});
test("clearer curve chevrons are genuinely denser and wider than 0.4.9.6",()=>{
 assert.ok(AERO_BARRIER.curveArrowPitchMeters<PRIOR.curveArrowPitchMeters);
 assert.ok(AERO_BARRIER.arrowCurvatureThreshold<PRIOR.arrowCurvatureThreshold);
 assert.ok(AERO_BARRIER.capLightWidthMeters>PRIOR.capLightWidthMeters);
 const next=createAeroDetailData(),before=priorDetail();
 assert.ok(next.curveChevrons>before.curveChevrons*1.3,
  "must have substantially more marked corners");
 assert.equal(next.light.colors.length,next.light.positions.length);
 assert.equal(next.light.chevrons.length,next.light.positions.length/3);
 assert.equal(next.dark.chevrons.length,next.dark.positions.length/3);
 assert.ok(next.light.chevrons.some(Boolean),"tag directional faces");
 assert.ok(next.dark.chevrons.every(x=>x===0));
 assert.ok(next.light.colors.some(x=>x>1.2),
  "corner arrow accents must be stronger than cap stripe");
 assert.ok(next.light.quads>before.light.quads);
 assert.equal(next.panelSeams,before.panelSeams);
 assert.equal(next.shoulderMarks,before.shoulderMarks);
});
test("spectral front and white-core ripple now also emphasize directional chevrons",()=>{
 const v="#include <common>\n#include <begin_vertex>";
 const f="#include <common>\n#include <color_fragment>";
 const patched=patchRailShaders(v,f);
 assert.match(patched.vertexShader,/attribute float aRailChevron;/);
 assert.match(patched.vertexShader,/vRailChevron=aRailChevron;/);
 assert.match(patched.fragmentShader,/varying float vRailChevron;/);
 assert.match(patched.fragmentShader,/spectralWhiteCore/);
 assert.match(patched.fragmentShader,/spectralWhiteBloom/);
 assert.match(patched.fragmentShader,/velocityRailPulse/);
 assert.match(patched.fragmentShader,/float chevronResponse=vRailChevron/);
 assert.match(patched.fragmentShader,/uRailFront1/);
 const src=source("./aero-barrier-v0497.mjs");
 assert.match(src,/aRailChevron/);
 assert.match(src,/setWaveState\(state\)/);
 assert.match(src,/setVelocityFlow\(intensity,phaseMeters\)/);
});
test("active 0.4.9.7 removes all instanced roadside pillars, keeps finish arch",()=>{
 const html=source("./index.html");
 const boot=source("./boot-v0497.js");
 const game=source("./game-v0497.mjs");
 assert.match(html,/boot-v0498\.js\?v=0\.4\.9\.8/);
 assert.match(html,/data-game-module="game-v0498\.mjs"/);
 assert.match(boot,/import\("\.\/game-v0497\.mjs\?v=0\.4\.9\.7"\)/);
 assert.match(boot,/__skyshiftBootFail/);
 assert.match(game,/from "\.\/aero-barrier-v0497\.mjs"/);
 for(const dep of ["premium-track-v0496","zone-wave-v0493",
   "boost-v0494","trial-v0494","boost-spring-v0495",
   "engine-trails-v0496","velocity-language-v0496"])
  assert.ok(game.includes('from "./'+dep+'.mjs"'),dep);
 assert.match(game,/function buildDecor\(\)\{/);
 assert.match(game,/if\(arch.label==="FINISH"\)/);
 assert.doesNotMatch(game,/new THREE\.InstancedMesh/);
 assert.doesNotMatch(game,/beaconGeo|beaconCore|beaconGlow|beaconHousing|pylonMesh/);
 assert.match(game,/roadsidePillarInstances:0/);
 assert.match(game,/removedRoadsidePillars:true/);
 assert.match(game,/elevatedBendHeightMeters:AERO_BARRIER\.bendHeightMeters/);
 assert.match(game,/version:"0\.4\.9\.7"/);
 assert.match(game,/skyshift-rails-v0497-audit\.json/);
 assert.doesNotMatch(game,/flight\.heading=headingAt\(/);
});
