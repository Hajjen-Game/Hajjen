// SKYSHIFT 0.4.9.9 — HUD director is purely presentational.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {
 HUD_SPEC,createHudState,hudSignal,stepHudState,
 hudVisualFrame,createReactiveHud
} from "../../ui/reactive-hud-v0499.mjs";
import {GUARDRAIL,TRIAL} from "../../trial-v0494.mjs";
import {BOOST_CONFIG} from "../../flight/boost/boost-v0494.mjs";
import {ZONE_WAVE} from "../../zone-wave-v0493.mjs";
const source=n=>readFileSync(new URL("../../"+n,import.meta.url),"utf8");
const near=(a,b,eps=.02)=>assert.ok(Math.abs(a-b)<eps,
 String(a)+" not near "+String(b));
function tick(state,seconds,flight={}){
 for(let i=0;i<Math.round(seconds*120);i++)
  stepHudState(state,1/120,flight);
 return state;
}
test("quiet HUD is physically linked to speed, steering and shield without fabricated input",()=>{
 const s=createHudState();
 tick(s,.6,{boostMultiplier:1,bankDegrees:0,speedRatio:1,shield:100,zoneStage:0});
 const view=hudVisualFrame(s,{shield:100});
 near(view.boostStrength,0,.001);
 near(view.bankAngle,0,.001);
 near(view.speedEnergy,0,.001);
 assert.equal(view.shieldPercent,100);
 assert.equal(view.shieldWarning,false);
 assert.equal(view.boostActive,false);
 assert.equal(s.zoneEvents,0);
 assert.equal(s.boostEvents,0);
});
test("boost ignition sparks quickly, then boost energy follows actual physical multiplier",()=>{
 const s=createHudState();
 hudSignal(s,"boost");
 assert.equal(s.boostEvents,1);
 assert.ok(hudVisualFrame(s).boostActive);
 tick(s,.3,{boostMultiplier:1.4,speedRatio:2.7,shield:100});
 assert.ok(s.boost>.9);
 assert.ok(s.speed>.7);
 assert.equal(s.peakBoost,s.boost);
 tick(s,1.6,{boostMultiplier:1,speedRatio:1.7,shield:100});
 assert.ok(s.boost<.001);
 assert.equal(hudVisualFrame(s).boostActive,false);
});
test("zone crest wakes the centre without a permanent overlay",()=>{
 const s=createHudState();
 hudSignal(s,"zone");
 assert.equal(s.zoneEvents,1);
 assert.ok(hudVisualFrame(s).zoneShift);
 tick(s,1.3,{zoneStage:3});
 assert.equal(s.zoneStage,3);
 assert.equal(hudVisualFrame(s).zoneShift,false);
 near(s.zone,Math.exp(-HUD_SPEC.zoneFade*1.3),.002);
});
test("impact and low shield are separate: transient tap versus persistent warning",()=>{
 const s=createHudState();
 hudSignal(s,"hit");
 assert.equal(s.impactEvents,1);
 assert.ok(hudVisualFrame(s).shieldHit);
 tick(s,.3,{shield:22});
 const active=hudVisualFrame(s,{shield:22});
 assert.equal(active.shieldWarning,true);
 assert.equal(active.shieldPercent,22);
 tick(s,1,{shield:22});
 assert.equal(hudVisualFrame(s,{shield:22}).shieldHit,false);
 assert.equal(hudVisualFrame(s,{shield:22}).shieldWarning,true);
 tick(s,.1,{shield:90});
 assert.equal(hudVisualFrame(s,{shield:90}).shieldWarning,false);
});
test("bank display follows interpolated craft roll, bounded to 24°, not track curvature",()=>{
 const s=createHudState();
 tick(s,.6,{bankDegrees:28});
 assert.ok(s.bank>.95&&s.bank<=1);
 near(hudVisualFrame(s).bankAngle,24,.5);
 tick(s,1.1,{bankDegrees:-24});
 near(hudVisualFrame(s).bankAngle,-24,.3);
 assert.ok(s.peakBank<=1);
});
test("pause halts HUD energy timers and resets do not keep stale impulses",()=>{
 const s=createHudState();hudSignal(s,"boost");hudSignal(s,"zone");
 stepHudState(s,0,{boostMultiplier:1});
 near(s.boost,.98,.001);
 near(s.zone,1,.001);
 const root={classList:{toggle(){},remove(){}},
  querySelector(){return null;},style:{setProperty(){}}};
 const hud=createReactiveHud(root);
 hud.onBoost();hud.onZone();hud.onImpact();
 assert.deepEqual([hud.stats().boostEvents,hud.stats().zoneEvents,
   hud.stats().shieldImpactEvents],[1,1,1]);
 hud.reset({shield:100});
 assert.deepEqual([hud.stats().boostEvents,hud.stats().zoneEvents,
   hud.stats().shieldImpactEvents],[0,0,0]);
});
test("HUD is DOM-only, throttled, and provides event counters for exported logs",()=>{
 assert.equal(HUD_SPEC.backgroundDrawCalls,0);
 assert.ok(HUD_SPEC.reducedMotionSupported);
 assert.ok(HUD_SPEC.updateIntervalSeconds>=1/60);
 const mod=source("./ui/reactive-hud-v0499.mjs");
 assert.doesNotMatch(mod,/new\s+(?:THREE\.)?WebGLRenderer|new\s+RenderPass|requestAnimationFrame\s*\(|setInterval\s*\(/);
 const root={classList:{toggle(){},remove(){}},
  querySelector(){return null;},style:{setProperty(){}}};
 const hud=createReactiveHud(root);
 hud.onBoost();hud.update(1/60,{shield:100,boostMultiplier:1.3,
  bankDegrees:-16,speedRatio:2.1,zoneStage:2});
 assert.equal(hud.stats().boostEvents,1);
 assert.equal(hud.stats().noAdditionalRenderPasses,true);
});
test("live production page keeps the archived HUD telemetry and controls",()=>{
 const html=source("./index.html"),css=source("./style-v061.css"),
  game=source("./legacy/game/game-v060.mjs"),boot=source("./boot-v0103.js");
 assert.match(html,/style-v061\.css\?v=0\.6\.1/);
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(boot,/import\("\.\/game-v0103\.mjs\?v=0\.10\.3"\)/);
 for(const id of ["hud","shield-fill","shield-text","flight-state",
   "shield-status","zone-number","sector-name","zone-progress-fill",
   "speed","speed-energy-fill","distance","start-btn","stick","stick-knob",
   "jump-btn","fullscreen-btn","menu-fullscreen-btn","pause-btn","toast"])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/hud-v2/);
 assert.match(html,/hud-module-heading/);
 assert.match(css,/\.hud-v2\.hud-boost-active/);
 assert.match(css,/\.hud-v2\.hud-zone-active/);
 assert.match(css,/\.hud-v2\.hud-shield-hit/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/env\(safe-area-inset-left\)/);
 assert.match(css,/#mobile-controls \.stick-track/);
 assert.match(game,/from "\.\/reactive-hud-v04991\.mjs"/);
 assert.match(game,/reactiveHud\.onBoost\(\)/);
 assert.match(game,/reactiveHud\.onZone\(\)/);
 assert.match(game,/reactiveHud\.onImpact\(\)/);
 assert.doesNotMatch(game,/bankDegrees:motionState\.roll\*180\/Math\.PI/);
 assert.match(game,/reactiveHud\.update\(/);
 assert.match(game,/reactiveHud:reactiveHud\.stats\(\)/);
 assert.match(game,/version:"0\.6\.0"/);
 assert.match(game,/skyshift-skyline-circuit-v060-audit\.json/);
});
test("old flight physics, spectrum timing, SMAA, boosts and elevated corner rails survive",()=>{
 const game=source("./legacy/game/game-v0499.mjs");
 for(const dep of ["trial-v0494","boost-v0494","boost-spring-v0495",
  "velocity-language-v0496","engine-trails-v0496","zone-wave-v0493",
  "aero-barrier-v0497","premium-track-v0498","neon-v0498","image-clarity-v0498"])
  assert.ok(game.includes('from "./'+dep+'.mjs"'),dep);
 assert.equal(TRIAL.length,1530);
 assert.equal(GUARDRAIL.height,.78);
 assert.equal(BOOST_CONFIG.multiplier,1.4);
 assert.deepEqual([...ZONE_WAVE.triggers],[10,20,27]);
 assert.doesNotMatch(game,/beaconGeo|beaconHousing|pylonMesh/);
 assert.doesNotMatch(game,/flight\.heading=headingAt\(/);
});
