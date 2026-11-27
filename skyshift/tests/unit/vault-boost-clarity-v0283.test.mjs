// 0.28.3 regression: VAULT has main boosts only, no SAFE/RISK side
// variants, no risk lane guide, and real emissive chevrons. Old Skyline,
// Aurora and Vault 0.28.2 retain their original feature/physics contracts.
import test from "node:test";
import assert from "node:assert/strict";
import {VAULT_BOOST_0283,VAULT_MAIN_BOOST_PADS_0283,
 VAULT_RACE_BOOST_PADS_0283,vaultBoostEnabled0283,
 vaultMainBoostAt0283} from "../../tracks/vault/vault-boost-clarity-v0283.mjs";

test("new Vault release only, historical versions and other courses unchanged",()=>{
 for(const v of ["0.27.4","0.28.0","0.28.1","0.28.2"])
  assert.equal(vaultBoostEnabled0283("?track=vault&v="+v),false);
 for(const t of ["skyline","aurora"])
  assert.equal(vaultBoostEnabled0283("?track="+t+"&v=0.28.3"),false);
 assert.equal(vaultBoostEnabled0283("?track=vault&v=0.28.3"),true);
 assert.equal(vaultBoostEnabled0283("?track=vault&v=0.28.4"),true);
 assert.equal(vaultBoostEnabled0283("?track=vault&v=0.28.9.9"),true);
 assert.equal(vaultBoostEnabled0283("?track=vault&v=0.28.10.1"),true);
 assert.equal(vaultBoostEnabled0283("?track=vault&v=0.28.9.8"),false);
 assert.equal(vaultBoostEnabled0283("?track=skyline&v=0.28.9.9"),false);
});
test("all 3 laps have 5 reachable central main pads and zero risk boosts",()=>{
 assert.equal(VAULT_MAIN_BOOST_PADS_0283.length,5);
 assert.equal(VAULT_RACE_BOOST_PADS_0283.length,15);
 assert.equal(VAULT_BOOST_0283.riskPadsPerLap,0);
 assert.equal(VAULT_BOOST_0283.riskGuideLines,0);
 for(const pad of VAULT_MAIN_BOOST_PADS_0283){
  assert.equal(pad.kind,"boost");
  assert.equal(pad.lateralMin,-pad.lateralMax);
  assert.ok(pad.lateralMax>=4);
  assert.equal(pad.multiplier,1.4);
  assert.ok(pad.end-pad.start>=30);
  assert.equal(vaultMainBoostAt0283((pad.start+pad.end)/2,0)?.id,pad.id+"-lap1");
  assert.equal(vaultMainBoostAt0283((pad.start+pad.end)/2,5.3),null);
 }
 assert.equal(vaultMainBoostAt0283(2210,5.4),null);
 assert.equal(vaultMainBoostAt0283(2390,-5.4),null);
 assert.equal(vaultMainBoostAt0283(2200+3400,0)?.id,"vault-sweeper-lap2");
 assert.equal(vaultMainBoostAt0283(2200+6800,0)?.id,"vault-sweeper-lap3");
 assert.equal(vaultMainBoostAt0283(NaN,0),null);
});
test("Vault runtime uses exactly the same authoritative pads for art and physics",async()=>{
 globalThis.location={search:"?track=vault&v=0.28.9.9"};
 const m=await import("../../flight/boost/risk-reward-v0160.mjs");
 const {BOOST_PADS,initBoostState,stepBoostState,boostPadAt}
  =await import("../../flight/boost/boost-v0160.mjs");
 assert.equal(m.VAULT_BOOST_0283_ACTIVE,true);
 assert.equal(m.RHYTHM_GATES_0160.length,0);
 assert.equal(m.BOOST_CHOICES_0160,VAULT_MAIN_BOOST_PADS_0283);
 assert.equal(m.RACE_BOOST_CHOICES_0160,VAULT_RACE_BOOST_PADS_0283);
 assert.equal(BOOST_PADS.length,5);
 assert.equal(m.riskCueAt(690,0,[]),null);
 assert.equal(m.approachingRiskGate(2200),null);
 assert.equal(boostPadAt(2210,5.4),null);
 const state=initBoostState({s:2210,lateral:0},44);
 const first=stepBoostState(state,1/120,44,true);
 assert.equal(first?.id,"vault-sweeper-lap1");
 assert.equal(state.boostActivations,1);
 assert.equal(state.riskBoosts,0);
 assert.equal(state.boostTargetMultiplier,1.4);
 state.lateral=5.4;
 assert.equal(stepBoostState(state,1/120,44,true),null);
});
test("existing deck gets genuine HDR arrow glow without risk guide artwork",async()=>{
 const {patchPremiumShaders,SURFACE_FRAGMENT_GLSL,
  VAULT_BOOST_GLOW_0283,GLSL_BOOST_PADS}
  =await import("../../rendering/road/premium-track-v0160.mjs");
 assert.equal(VAULT_BOOST_GLOW_0283.noAdditionalMeshes,true);
 assert.equal(GLSL_BOOST_PADS.length,5);
 assert.ok(GLSL_BOOST_PADS.every(p=>p.kind==="boost"));
 assert.ok(SURFACE_FRAGMENT_GLSL.includes("vaultHalo0283"));
 assert.ok(SURFACE_FRAGMENT_GLSL.includes("vaultRim0283"));
 assert.ok(SURFACE_FRAGMENT_GLSL.includes("float riskLead = 0.0;"));
 assert.ok(SURFACE_FRAGMENT_GLSL.includes("float laneSpine = 0.0;"));
 const result=patchPremiumShaders(
  "#include <common>\n#include <begin_vertex>",
  "#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>");
 assert.ok(result.fragmentShader.includes("trackChevronGlow0283"));
 assert.ok(result.fragmentShader.includes("float vaultChevron0283(float s,float lateral)"));
 assert.ok(result.fragmentShader.includes("5.45-1.24*abs(lateral)"));
 assert.ok(result.fragmentShader.includes("zoneBoost*(boostArrows*1.55"));
 assert.ok(result.fragmentShader.includes("vaultHalo0283*.46"));
 assert.ok(result.fragmentShader.includes("totalEmissiveRadiance"));
 assert.ok(!result.fragmentShader.includes("float boost_coastline_cut_risk"));
 assert.ok(SURFACE_FRAGMENT_GLSL.includes("vec3 road = mix(vec3(.006,.008,.012),zoneBase,.08);"));
 assert.ok(SURFACE_FRAGMENT_GLSL.includes("float spine = 0.0;"));
});
