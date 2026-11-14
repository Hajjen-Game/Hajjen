// SKYSHIFT 0.4.9.8 — HDR SMAA + adaptive phone image clarity.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CLARITY,clarityProfile,dprForAdaptiveLevel,clarityAudit}
 from "./image-clarity-v0498.mjs";
import {createAdaptiveQuality,nextAdaptiveRatio}
 from "./frame-pacing-v044.mjs";
import {PREMIUM_TRACK,SURFACE_FRAGMENT_HELPERS,patchPremiumShaders}
 from "./premium-track-v0498.mjs";
import {AERO_BARRIER} from "./aero-barrier-v0497.mjs";
import {GUARDRAIL} from "./trial-v0494.mjs";
import {BOOST_CONFIG} from "./boost-v0494.mjs";
const src=name=>readFileSync(new URL(name,import.meta.url),"utf8");
const near=(a,b,tolerance=.00001)=>assert.ok(Math.abs(a-b)<tolerance,
 String(a)+" != "+String(b));
test("Samsung 4GB path retains current DPR cap, but now has true fallback tiers",()=>{
 const q=clarityProfile(4,2.625);
 assert.equal(q.lowMemory,true);
 assert.equal(q.aa,"SMAA");
 near(q.renderDpr,1.35);
 assert.deepEqual(q.internalTiers,[1.35,1.18,1]);
 near(dprForAdaptiveLevel(q,0),1.35);
 near(dprForAdaptiveLevel(q,1),1.18);
 near(dprForAdaptiveLevel(q,2),1);
 near(dprForAdaptiveLevel(q,50),1);
 near(dprForAdaptiveLevel(q,-5),1.35);
 assert.equal(q.aaPassCount,1);
});
test("current iPhone and high end profiles preserve up-to-2x pixel density",()=>{
 for(const memory of [undefined,0,6,8]){
  const q=clarityProfile(memory,3);
  assert.equal(q.lowMemory,false);
  assert.deepEqual(q.internalTiers,[2,1.75,1.5]);
  assert.equal(q.renderDpr,2);
 }
 assert.deepEqual(clarityProfile(4,1.2).internalTiers,[1.2,1.18,1]);
 assert.deepEqual(clarityProfile(8,1).internalTiers,[1,1,1]);
 assert.equal(CLARITY.temporalAA,false);
});
test("frame pacing director now has real effect on Samsung offscreen DPR",()=>{
 const q=createAdaptiveQuality(),phone=clarityProfile(4,2.625);
 let change=null;
 for(let i=0;i<135;i++){
  const val=nextAdaptiveRatio(q,31,12000+i*31,2);
  if(val!==null)change=val;
 }
 assert.ok(q.level>0,"sustained slow frames must downshift");
 assert.ok(change!==null,"director emits a tier change");
 assert.ok(dprForAdaptiveLevel(phone,q.level)<phone.renderDpr,
  "4GB offscreen resolution actually decreases");
 assert.ok(dprForAdaptiveLevel(phone,q.level)>=1.0);
 const fast=createAdaptiveQuality();
 for(let i=0;i<130;i++)
  nextAdaptiveRatio(fast,14,12000+i*16,2);
 assert.equal(fast.level,0,"fast GPUs keep premium image quality");
});
test("bloom still precedes SMAA, OutputPass stays last, and resize reaches SMAA",()=>{
 const code=src("./neon-v0498.mjs");
 assert.match(code,/from "three\/addons\/postprocessing\/SMAAPass\.js"/);
 assert.match(code,/new SMAAPass\(\)/);
 assert.match(code,/composer\.addPass\(scenePass\)/);
 assert.match(code,/composer\.addPass\(bloom\)/);
 assert.match(code,/composer\.addPass\(smaa\)/);
 assert.match(code,/composer\.addPass\(output\)/);
 const additions=[...code.matchAll(/composer\.addPass\((\w+)\)/g)].map(x=>x[1]);
 assert.deepEqual(additions,["scenePass","bloom","smaa","output"]);
 assert.deepEqual(CLARITY.passes,
  ["RenderPass","UnrealBloomPass","SMAAPass","OutputPass"]);
 assert.match(code,/composer\.setPixelRatio\(safe\)/);
 assert.match(code,/composer\.setSize\(width,height\)/);
 assert.match(code,/smaa\.dispose\(\)/);
 assert.equal(CLARITY.newLights,0);
});
test("distant road guides are spatially filtered; original white spectral waves retained",()=>{
 const shader=patchPremiumShaders(
  "#include <common>\n#include <begin_vertex>",
  "#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>");
 assert.match(shader.fragmentShader,/fwidth\(x\)/);
 assert.match(SURFACE_FRAGMENT_HELPERS,/float footprint = min\(0\.85,/);
 assert.match(shader.fragmentShader,/spectralWhiteCore/);
 assert.match(shader.fragmentShader,/spectralWhiteBloom/);
 assert.match(shader.fragmentShader,/uVelocityPhase/);
 assert.match(shader.fragmentShader,/uZoneFront1/);
 assert.match(PREMIUM_TRACK.version,/0498/);
 assert.equal(AERO_BARRIER.height,.99);
 assert.equal(AERO_BARRIER.bendHeightMeters,1.11);
 assert.equal(GUARDRAIL.height,.78);
 assert.equal(BOOST_CONFIG.multiplier,1.4);
});
test("exported image report contains actual pass order and render tier",()=>{
 const profile=clarityProfile(4,2.625);
 const pipeline={internalPixelRatio:1.18,smaa:{enabled:true},
  composer:{passes:[{constructor:{name:"RenderPass"}},
   {constructor:{name:"UnrealBloomPass"}},
   {constructor:{name:"SMAAPass"}},
   {constructor:{name:"OutputPass"}}]}};
 const audit=clarityAudit(profile,pipeline);
 assert.equal(audit.antiAliasing,"SMAA");
 assert.equal(audit.canvasDpr,1.35);
 assert.equal(audit.internalDpr,1.18);
 assert.equal(audit.lowMemory,true);
 assert.ok(audit.smaaEnabled);
 assert.deepEqual(audit.actualPassOrder,CLARITY.passes);
});
test("production boot uses 0.4.9.8 without touching ship physics or scenery",()=>{
 const html=src("./index.html"),boot=src("./boot-v0498.js"),
  game=src("./game-v0498.mjs"),smoke=src("./browser-smoke-v0498.mjs");
 assert.match(html,/boot-v0498\.js\?v=0\.4\.9\.8/);
 assert.match(html,/data-game-module="game-v0498\.mjs"/);
 assert.match(boot,/import\("\.\/game-v0498\.mjs\?v=0\.4\.9\.8"\)/);
 for(const dep of ["neon-v0498","image-clarity-v0498","premium-track-v0498",
  "aero-barrier-v0497","zone-wave-v0493","trial-v0494",
  "boost-v0494","boost-spring-v0495","velocity-language-v0496"])
  assert.ok(game.includes('from "./'+dep+'.mjs"'),"missing "+dep);
 assert.match(game,/claritySettings=selectClarityProfile/);
 assert.match(game,/renderer\.setPixelRatio\(claritySettings\.renderDpr\)/);
 assert.match(game,/dprForAdaptiveLevel\(claritySettings,adaptiveQuality\.level\)/);
 assert.match(game,/window\.__skyshiftClarityInfo=/);
 assert.match(game,/imageClarity:clarityAudit/);
 assert.match(game,/version:"0\.4\.9\.8"/);
 assert.match(game,/skyshift-clarity-v0498-audit\.json/);
 assert.match(smoke,/actualPassOrder/);
 assert.match(smoke,/deviceMemory/);
 assert.match(smoke,/Android-landscape touch/);
 assert.doesNotMatch(game,/beaconGeo|beaconHousing|pylonMesh/);
});
