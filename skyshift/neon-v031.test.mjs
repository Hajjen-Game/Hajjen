import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root=new URL(".",import.meta.url);
const source=name=>readFileSync(new URL(name,root),"utf8");

test("renderer is wired to one pinned Three.js version and addon import map",()=>{
  const html=source("index.html");
  const game=source("game-v031.mjs");
  assert.match(html,/<script type="importmap">/);
  assert.match(html,/"three": "https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/build\/three\.module\.js"/);
  assert.match(html,/"three\/addons\/": "https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/examples\/jsm\/"/);
  assert.match(game,/import \* as THREE from "three"/);
  assert.match(game,/import \{ createNeonPipeline,createNeonKit,NEON_TUNING \} from "\.\/neon-v031\.mjs"/);
  assert.match(html,/src="\.\/game-v031\.mjs\?v=0\.3\.1"/);
});

test("post-processing runs scene, HDR bloom and output/tone mapping in correct order",()=>{
  const neon=source("neon-v031.mjs");
  const game=source("game-v031.mjs");
  const render=neon.indexOf("composer.addPass(render)");
  const bloom=neon.indexOf("composer.addPass(bloom)");
  const output=neon.indexOf("composer.addPass(output)");
  assert.ok(render>0&&bloom>render&&output>bloom);
  assert.match(game,/neonPipeline=createNeonPipeline\(THREE,renderer,scene,camera\)/);
  assert.match(game,/neonPipeline\?\.resize\(width,height\)/);
  assert.match(game,/if\(neonPipeline\)neonPipeline.render\(dt\)/);
  assert.match(game,/toneMapping=THREE.ACESFilmicToneMapping/);
});

test("neon core body and halo are distinct 3D geometry layers",()=>{
  const neon=source("neon-v031.mjs");
  const game=source("game-v031.mjs");
  assert.match(game,/const deck=\[\],colors=\[\],rim=\[\],rimHalo=\[\],rimCore=\[\]/);
  assert.match(game,/addQuad\(rimHalo/);
  assert.match(game,/addQuad\(rimCore/);
  assert.match(game,/new THREE.Mesh\(buildGeometry\(rimHalo\),neonKit.edgeHalo\)/);
  assert.match(game,/new THREE.Mesh\(buildGeometry\(rimCore\),neonKit.edgeCore\)/);
  assert.match(neon,/edgeCoreLuminance:3\.6/);
  assert.match(neon,/edgeBodyLuminance:2\.05/);
  assert.match(neon,/bloomThreshold:1\.06/);
  assert.match(neon,/AdditiveBlending/);
});

test("premium materials reach beacons arches ship and landing effects",()=>{
  const game=source("game-v031.mjs"),fx=source("premium-v031.mjs");
  assert.match(game,/neonKit\.beaconCore/);
  assert.match(game,/neonKit\.beaconHalo/);
  assert.match(game,/new THREE.MeshPhysicalMaterial/);
  assert.match(game,/new THREE.PointLight/);
  assert.match(game,/neonKit\.ship/);
  assert.match(fx,/multiplyScalar\(2\.45\)/);
  assert.match(fx,/multiplyScalar\(3\.25\)/);
  assert.doesNotMatch(fx,/shipGlow\.color\.lerp\(color/);
});

test("modern mobile displays get high quality default rather than an A51 cap",()=>{
  const game=source("game-v031.mjs"),neon=source("neon-v031.mjs");
  assert.match(neon,/maxPixelRatio:2/);
  assert.match(game,/NEON_TUNING\.maxPixelRatio/);
  assert.doesNotMatch(game,/matchMedia\("\(pointer:coarse\)"\)\.matches\?1\.35/);
});

test("finite Sky Trial gameplay, style score and fullscreen remain intact",()=>{
  const game=source("game-v031.mjs"),html=source("index.html");
  assert.match(game,/from "\.\/trial-v03\.mjs"/);
  assert.match(game,/from "\.\/fullscreen-v02\.mjs"/);
  assert.match(game,/function startImmersiveTrial/);
  assert.match(html,/id="fullscreen-btn"/);
  assert.match(html,/id="final-style"/);
  assert.match(game,/riskRouteStyleBonus/);
});
