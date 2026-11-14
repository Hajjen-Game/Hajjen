import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {NEON_TUNING,validateNeonBalance} from "./neon-balance-v032.mjs";

const here=new URL(".",import.meta.url);
const src=(file)=>readFileSync(new URL(file,here),"utf8");
const old={bloomStrength:1.18,bloomRadius:.48,edgeCoreLuminance:3.6,
  beaconCoreLuminance:3.9,haloOpacity:.16,shipLuminance:3.0,enginePointIntensity:12};

test("neon balance tuning passes invariants and preserves premium native resolution",()=>{
  assert.deepEqual(validateNeonBalance(),[]);
  assert.equal(NEON_TUNING.maxPixelRatio,2);
  assert.equal(NEON_TUNING.edgeBodyLuminance<NEON_TUNING.bloomThreshold,true);
  assert.equal(NEON_TUNING.bloomThreshold<NEON_TUNING.edgeCoreLuminance,true);
});

test("0.3.2 materially reduces bloom radius and energy rather than hardware quality",()=>{
  assert.ok(NEON_TUNING.bloomStrength<old.bloomStrength*.5);
  assert.ok(NEON_TUNING.bloomRadius<old.bloomRadius*.5);
  assert.ok(NEON_TUNING.edgeCoreLuminance<old.edgeCoreLuminance*.6);
  assert.ok(NEON_TUNING.beaconCoreLuminance<old.beaconCoreLuminance*.5);
  assert.ok(NEON_TUNING.haloOpacity<old.haloOpacity*.3);
  assert.ok(NEON_TUNING.shipLuminance<old.shipLuminance*.55);
  assert.ok(NEON_TUNING.enginePointIntensity<old.enginePointIntensity*.3);
});

test("unsafe visual tuning is detected before going to production",()=>{
  assert.ok(validateNeonBalance({...NEON_TUNING,bloomStrength:2}).length>0);
  assert.ok(validateNeonBalance({...NEON_TUNING,edgeBodyLuminance:1.8}).length>0);
  assert.ok(validateNeonBalance({...NEON_TUNING,enginePointIntensity:15}).length>0);
  assert.ok(validateNeonBalance({...NEON_TUNING,maxPixelRatio:1.3}).length>0);
});

test("refined rail geometry keeps three discrete layers with narrow halo",()=>{
  const game=src("game-v032.mjs");
  assert.match(game,/rimHalo=\[\],rimCore=\[\]/);
  assert.match(game,/addQuad\(rimHalo,null,toVec\(d,off-\.072/);
  assert.match(game,/addQuad\(rimCore,null,toVec\(d,off\+\.052/);
  assert.match(game,/new THREE.Mesh\(buildGeometry\(rimCore\),neonKit.edgeCore\)/);
});

test("beacons, archs, engine fill and flight FX follow the new tuning",()=>{
  const game=src("game-v032.mjs"),fx=src("premium-v032.mjs");
  assert.match(game,/NEON_TUNING\.archBodyLuminance/);
  assert.match(game,/NEON_TUNING\.archCoreLuminance/);
  assert.match(game,/NEON_TUNING\.archHaloOpacity/);
  assert.match(game,/NEON_TUNING\.enginePointIntensity/);
  assert.match(game,/new THREE.BoxGeometry\(\.17,1\.78,\.21\)/);
  assert.match(fx,/NEON_TUNING\.engineTrailLuminance/);
  assert.match(fx,/NEON_TUNING\.impactLuminance/);
  assert.doesNotMatch(fx,/multiplyScalar\(3\.25\)/);
});

test("HDR composer remains active, with one core Three.js instance and tone mapping",()=>{
  const html=src("index.html"),game=src("game-v032.mjs"),neon=src("neon-v032.mjs");
  assert.match(html,/src="\.\/boot-v0495\.js\?v=0\.4\.9\.5"/);
  // The 0.3.2 renderer remains in the repo as the approved lighting baseline.
  assert.match(src("game-v0331.mjs"),/from "\.\/neon-v032\.mjs"/);
  assert.match(html,/<script type="importmap">/);
  assert.match(html,/three@0\.180\.0/);
  assert.match(neon,/UnrealBloomPass/);
  assert.match(neon,/OutputPass/);
  assert.match(neon,/createNeonPipeline/);
  assert.match(game,/NEON_TUNING\.exposure/);
  assert.match(game,/neonPipeline\.render\(dt\)/);
});

test("no gameplay modifications, checkpoints and fullscreen remain the same",()=>{
  const game=src("game-v032.mjs");
  assert.match(game,/from "\.\/trial-v03\.mjs"/);
  assert.match(game,/from "\.\/fullscreen-v02\.mjs"/);
  assert.match(game,/function startImmersiveTrial/);
  assert.match(game,/riskRouteStyleBonus/);
  assert.match(game,/version:"0\.3\.2"/);
});
