// SKYSHIFT 0.21.6 — speed-driven native flow without camera/physics changes.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CINEMATIC_ENERGY_0216,cinematicEnergyFrame,
 patchCinematicFlowFragment,patchCinematicRoadFragment}
 from "./cinematic-energy-v0216.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const glowShader=[
 "#include <common>",
 "varying float vTunnelTrack;",
 "varying float vTunnelGlow;",
 "diffuseColor.rgb = tunnelSpectrumTint()*vTunnelGlow;"
].join("\n");
const deckShader=[
 "#include <common>","varying vec2 vTrackCoord;",
 "float trackS = vTrackCoord.x;","float trackL = vTrackCoord.y;",
 "vec3 zoneAccent=uTrackAccent;",
 "float whiteCore=0.0;",
 "#include <emissivemap_fragment>",
 "totalEmissiveRadiance += uTrackGuide*1.0;",
 "reflectedLight.directSpecular*=0.08;"
].join("\n");
test("motion derives only from existing velocity, boost and phase",()=>{
 let fast=cinematicEnergyFrame({flow:1,boost:1,phaseMeters:164.25});
 assert.deepEqual(fast,{flow:1,boost:1,phaseMeters:164.25});
 assert.equal(cinematicEnergyFrame({flow:1,boost:1,playing:false}).flow,0);
 assert.equal(cinematicEnergyFrame({flow:1,boost:1,playing:false}).boost,0);
 assert.equal(cinematicEnergyFrame({flow:2,boost:3,phaseMeters:Infinity}).phaseMeters,0);
 const mobile=cinematicEnergyFrame({flow:1,lowMemory:true});
 assert.equal(mobile.flow,.72);
 assert.ok(cinematicEnergyFrame({flow:0,boost:1}).flow===0);
});
test("flow-core shader modifies existing emitted neon, not generic tunnel shell",()=>{
 const s=patchCinematicFlowFragment(glowShader);
 assert.match(s,/uniform float uCinemaFlow/);
 assert.match(s,/uniform float uCinemaBoost/);
 assert.match(s,/uniform float uCinemaPhase/);
 assert.match(s,/vTunnelTrack-uCinemaPhase/);
 assert.match(s,/diffuseColor\.rgb\*=1\.0\+cinemaRailBody/);
 assert.match(s,/tunnelSpectrumTint\(\)\*vTunnelGlow/);
 assert.ok(s.includes("pow(0.5+0.5*sin"));
 assert.equal(s.split("diffuseColor.rgb = tunnelSpectrumTint()*vTunnelGlow;").length-1,1);
 assert.throws(()=>patchCinematicFlowFragment("#include <common>"));
});
test("road energy uses native spectral accent and stays inside tunnel shoulder",()=>{
 const s=patchCinematicRoadFragment(deckShader);
 assert.match(s,/cinemaOuter/); // only outer road shoulders are lit
 assert.match(s,/smoothstep\(338\.0,368\.0,trackS\)/);
 assert.match(s,/smoothstep\(7\.25,8\.65,abs\(trackL\)\)/);
 assert.match(s,/smoothstep\(10\.1,11\.15,abs\(trackL\)\)/);
 assert.match(s,/totalEmissiveRadiance\+=zoneAccent\*cinemaShoulderPower/);
 assert.match(s,/float whiteCore=0\.0/);
 assert.match(s,/reflectedLight\.directSpecular\*=0\.08/);
 assert.equal(s.split("#include <emissivemap_fragment>").length-1,1);
 assert.doesNotMatch(s,/gl_FragColor\s*=/);
 assert.throws(()=>patchCinematicRoadFragment("#include <common>"));
});
test("UI/boot keeps old 0.21.5 A/B and new cinematics off in classic mode",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/cinematicMotionEnabled=integratedNeonFlowEnabled&&premiumRoadEnabled/);
 assert.match(game,/get\("cinematicMotion"\)!=="classic"/);
 assert.match(game,/installCinematicEnergyMotion/);
 assert.match(game,/updateMotion\?\.\(\{/);
 assert.match(game,/phaseMeters:velocityState\.flowPhaseMeters/);
 assert.match(game,/playing:uiState\.mode==="playing"/);
 assert.match(game,/__skyshiftCinematicMotionFrameProof/);
 assert.match(game,/compareBeforeCinematicMotion:"\?cinematicMotion=classic"/);
 assert.match(game,/createRoadSolarSpillController/);
 assert.match(game,/createPremiumRoadSurfaceController/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.22\.0/);
 assert.match(read("./index.html"),/0\.22\.0/);
});
test("no extra render work or gameplay changes",()=>{
 const a=CINEMATIC_ENERGY_0216;
 for(const k of ["newMeshes","newDrawBatches","newRenderPasses",
  "neutralLightAdded","localLightsAdded","newTimers"])
  assert.equal(a[k],0);
 for(const k of ["gripChanged","cameraChanged","shipChanged","trackChanged",
  "fullScreenMotionBlur"])
  assert.equal(a[k],false);
 assert.equal(a.solarSealUnchanged,true);
});
