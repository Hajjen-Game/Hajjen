// SKYSHIFT 0.4.9.9.1 – Racing HUD Refinement.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {
 HUD_SPEC,createHudState,hudSignal,stepHudState,hudVisualFrame,createReactiveHud
} from "../../reactive-hud-v04991.mjs";
import {BOOST_CONFIG} from "../../flight/boost/boost-v0494.mjs";
import {TRIAL,GUARDRAIL} from "../../trial-v0494.mjs";
import {ZONE_WAVE} from "../../zone-wave-v0493.mjs";
const src=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const step=(s,n,flight)=>{for(let i=0;i<n;i++)stepHudState(s,1/120,flight);return s;};
test("HUD 2.1 removes redundant bank visual and banking updates",()=>{
 const html=src("./index.html");
 const js=src("./reactive-hud-v04991.mjs");
 const game=src("./legacy/game/game-v04991.mjs");
 assert.doesNotMatch(html,/hud-bank-gauge|hud-bank-instrument|bank-caption/);
 assert.doesNotMatch(js,/bankAngle|bankDegrees|bankNormalized|bankResponse|peakBank/);
 assert.doesNotMatch(game,/bankDegrees:motionState\.roll/);
 assert.match(game,/reactiveHud\.update\(/);
 assert.match(html,/hud-v2 hud-v21/);
 assert.equal(HUD_SPEC.version,"racing-hud-refinement-04991");
 assert.equal(HUD_SPEC.backgroundDrawCalls,0);
});
test("shield 9px, velocity 8px, course 6px layered diagonal bar design",()=>{
 const css=src("./style-v04991.css");
 const html=src("./index.html");
 assert.match(css,/--hud-shield-bar:9px/);
 assert.match(css,/--hud-speed-bar:8px/);
 assert.match(css,/--hud-zone-bar:6px/);
 for(const selector of ["shield-track racing-meter","speed-energy-track racing-meter",
  "zone-progress racing-meter"])
  assert.ok(html.includes(selector),selector);
 assert.match(css,/clip-path:polygon/);
 assert.match(css,/background:linear-gradient\(180deg,\s*rgba\(244,254,255/);
 assert.match(css,/background:repeating-linear-gradient/);
 assert.match(css,/skyshift-meter-charge/);
 assert.match(css,/skyshift-shield-energy/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.hud-v21\.hud-shield-low #shield-fill/);
 assert.match(css,/\.hud-v21 \.racing-meter #shield-fill/);
 assert.match(css,/\.hud-v21 \.racing-meter #zone-progress-fill/);
 assert.match(css,/\.hud-v21 \.racing-meter #speed-energy-fill/);
 assert.match(css,/\.hud-v21 \.hud-left/);
 assert.match(css,/\.hud-v21 \.hud-right/);
 assert.deepEqual(createReactiveHud({
  classList:{toggle(){},remove(){}},
  style:{setProperty(){}},
  querySelector(){return null}
 }).stats().barThicknessPx,{shield:9,speed:8,zone:6});
});
test("speed and zone energy respond to physics while idle layout stays quiet",()=>{
 const s=createHudState();
 assert.equal(hudVisualFrame(s).speedEnergy,0);
 assert.equal(hudVisualFrame(s).boostActive,false);
 assert.equal(hudVisualFrame(s).zoneShift,false);
 assert.equal(Object.hasOwn(s,"bank"),false);
 hudSignal(s,"boost");
 step(s,25,{boostMultiplier:1.4,speedRatio:2.6,shield:100});
 assert.equal(s.boostEvents,1);
 assert.ok(s.speed>.50);
 assert.equal(hudVisualFrame(s).boostActive,true);
 hudSignal(s,"zone");
 assert.equal(hudVisualFrame(s).zoneShift,true);
 step(s,230,{boostMultiplier:1,speedRatio:2,shield:100});
 assert.equal(hudVisualFrame(s).boostActive,false);
 assert.equal(hudVisualFrame(s).zoneShift,false);
 assert.equal(s.zoneEvents,1);
});
test("shield damage transient and persistent low-shield warning remain independent",()=>{
 const s=createHudState();
 hudSignal(s,"hit");
 step(s,12,{shield:22});
 assert.equal(hudVisualFrame(s,{shield:22}).shieldWarning,true);
 assert.equal(hudVisualFrame(s,{shield:22}).shieldHit,true);
 assert.equal(s.impactEvents,1);
 step(s,160,{shield:22});
 assert.equal(hudVisualFrame(s,{shield:22}).shieldHit,false);
 assert.equal(hudVisualFrame(s,{shield:22}).shieldWarning,true);
 step(s,1,{shield:90});
 assert.equal(hudVisualFrame(s,{shield:90}).shieldWarning,false);
});
test("HUD timestamps and event counters reset without fake pulses or new render passes",()=>{
 const root={classList:{toggle(){},remove(){}},
  style:{setProperty(){}},querySelector(){return null}};
 const hud=createReactiveHud(root);
 hud.onBoost();hud.onZone();hud.onImpact();
 assert.deepEqual([hud.stats().boostEvents,hud.stats().zoneEvents,
  hud.stats().shieldImpactEvents],[1,1,1]);
 assert.equal(hud.stats().noAdditionalRenderPasses,true);
 assert.equal(hud.stats().bankWidgetRemoved,true);
 assert.equal(hud.stats().updateRateHz,30);
 hud.reset({shield:100});
 assert.deepEqual([hud.stats().boostEvents,hud.stats().zoneEvents,
  hud.stats().shieldImpactEvents],[0,0,0]);
 const code=src("./reactive-hud-v04991.mjs");
 assert.doesNotMatch(code,/new\s+RenderPass|WebGLRenderer\s*\(|requestAnimationFrame\s*\(/);
 assert.equal(HUD_SPEC.reducedMotionSupported,true);
});
test("production page and boot load v04991; old gameplay and SMAA stay intact",()=>{
 const html=src("./index.html");
 const boot=src("./boot-v0103.js");
 const game=src("./game-v0103.mjs");
 const browser=src("./tests/browser/legacy/browser-smoke-v04991.mjs");
 assert.match(html,/style-v061\.css\?v=0\.6\.1/);
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(boot,/import\("\.\/game-v0103\.mjs\?v=0\.10\.3"\)/);
 assert.match(game,/from "\.\/reactive-hud-v04991\.mjs"/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 assert.match(browser,/racingMeters/);
 assert.match(browser,/phoneBars/);
 for(const dep of ["neon-v083","image-clarity-v083","premium-track-v0901",
  "aero-barrier-v0901","zone-wave-v060","trial-v0901","boost-v082",
  "boost-spring-v0495","velocity-language-v0496","engine-trails-v0496"])
  assert.ok(game.includes('from "./'+dep+'.mjs"'),dep);
 assert.equal(BOOST_CONFIG.multiplier,1.4);
 assert.equal(GUARDRAIL.height,.78);
 assert.equal(TRIAL.length,1530);
 assert.deepEqual([...ZONE_WAVE.triggers],[10,20,27]);
 assert.doesNotMatch(game,/beaconGeo|beaconHousing|pylonMesh/);
});
