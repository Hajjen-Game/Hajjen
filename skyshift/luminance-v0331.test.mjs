import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LUMINANCE,validateLuminance} from "./luminance-v0331.mjs";
import {createSurfacePlan,validateSurfacePlan,IDENTITY_RULES} from "./identity-v0331.mjs";
import {NEON_TUNING} from "./neon-balance-v032.mjs";
import {TRIAL,GAPS,CHECKPOINTS} from "./trial-v03.mjs";

const read=file=>readFileSync(new URL(file,import.meta.url),"utf8");
const brightness=hex=>{
  const r=(hex>>16)&255,g=(hex>>8)&255,b=hex&255;
  return .2126*r+.7152*g+.0722*b;
};

test("luminance constraints pass and prevent return to overbloomed 0.3.1",()=>{
  assert.deepEqual(validateLuminance(),[]);
  assert.ok(LUMINANCE.exposure<=1.06);
  assert.ok(LUMINANCE.exposure>NEON_TUNING.exposure);
  assert.equal(NEON_TUNING.bloomStrength,.43);
  assert.equal(NEON_TUNING.bloomRadius,.21);
  assert.equal(NEON_TUNING.bloomThreshold,1.40);
  assert.equal(NEON_TUNING.maxPixelRatio,2);
});

test("road midtones and opaque deck plates are substantially lifted",()=>{
  assert.ok(brightness(LUMINANCE.roadBase)>=brightness(0x14233a)*1.7);
  assert.ok(brightness(LUMINANCE.panelColor)>=brightness(0x17283f)*1.6);
  assert.ok(brightness(LUMINANCE.panelColor)>brightness(LUMINANCE.roadBase)*.93);
  assert.equal(IDENTITY_RULES.deckPlate,LUMINANCE.panelColor);
  assert.equal(IDENTITY_RULES.deckSeam,LUMINANCE.seamColor);
});

test("rock and world architectural midtones are visible without lit geometry overload",()=>{
  assert.ok(brightness(LUMINANCE.rockColor)>=brightness(0x0a1528)*1.7);
  assert.ok(brightness(LUMINANCE.towerColor)>brightness(0x101d32)*1.5);
  assert.ok(LUMINANCE.backgroundAccent<NEON_TUNING.bloomThreshold);
  assert.ok(LUMINANCE.landmarkAccent<NEON_TUNING.bloomThreshold);
});

test("three sector atmospheres preserve color separation with visible distant fog",()=>{
  assert.equal(LUMINANCE.sectors.length,3);
  assert.ok(LUMINANCE.fogDensity<.008);
  const originals=[0x10263a,0x1a2140,0x251b36];
  for(let i=0;i<3;i++)
    assert.ok(brightness(LUMINANCE.sectors[i].fog)>brightness(originals[i])*1.25);
  assert.notEqual(LUMINANCE.sectors[0].fog,LUMINANCE.sectors[1].fog);
  assert.notEqual(LUMINANCE.sectors[1].fog,LUMINANCE.sectors[2].fog);
});

test("collision-aligned 0.3.3 deck detailing remains the exact same authored plan",()=>{
  const newPlan=createSurfacePlan();
  assert.deepEqual(validateSurfacePlan(newPlan),[]);
  assert.ok(newPlan.length>130);
  assert.ok(newPlan.some(p=>p.kind==="plate"));
  assert.equal(TRIAL.length,1300);
  assert.equal(GAPS.length,6);
  assert.equal(CHECKPOINTS.length,5);
});

test("renderer integrates only midtone and atmosphere changes, not gameplay/bloom",()=>{
  const game=read("game-v0331.mjs");
  assert.match(game,/from "\.\/trial-v03\.mjs"/);
  assert.match(game,/from "\.\/neon-v032\.mjs"/);
  assert.match(game,/from "\.\/premium-v032\.mjs"/);
  assert.match(game,/from "\.\/fullscreen-v02\.mjs"/);
  assert.match(game,/from "\.\/identity-v0331\.mjs"/);
  assert.match(game,/from "\.\/luminance-v0331\.mjs"/);
  assert.match(game,/scene\.fog=new THREE\.FogExp2\(COLOR\[0\]\.fog,LUMINANCE\.fogDensity\)/);
  assert.match(game,/renderer\.toneMappingExposure=LUMINANCE\.exposure/);
  assert.match(game,/neonPipeline=createNeonPipeline\(THREE,renderer,scene,camera\)/);
  assert.match(game,/version:"0\.3\.3\.1"/);
  assert.doesNotMatch(game,/function stepFlight/);
});

test("luminance safety rules reject dangerous settings",()=>{
  assert.ok(validateLuminance({...LUMINANCE,exposure:1.3}).length);
  assert.ok(validateLuminance({...LUMINANCE,roadBase:0x061122}).length);
  assert.ok(validateLuminance({...LUMINANCE,panelColor:0x05090e}).length);
  assert.ok(validateLuminance({...LUMINANCE,vignetteEdgeOpacity:.7}).length);
});

test("app serves new assets, reduces vignette, and keeps fullscreen UI",()=>{
  const html=read("index.html"),css=read("style-v0331.css");
  assert.match(html,/src="\.\/game-v034\.mjs\?v=0\.3\.4\.1"/);
  assert.match(html,/href="\.\/style-v034\.css\?v=0\.3\.4"/);
  assert.match(html,/id="fullscreen-btn"/);
  assert.match(css,/rgba\(1,4,13,\.19\)/);
});
