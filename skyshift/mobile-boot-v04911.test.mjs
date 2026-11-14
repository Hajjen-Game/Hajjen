// 0.4.9.1.1 – a failed or slow module must never leave a dead Android menu.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=name=>readFileSync(new URL(name,import.meta.url),"utf8");
test("Classic, dependency-free bootstrap loads before Three.js and captures import failures",()=>{
 const html=src("./index.html"),boot=src("./boot-v04911.js");
 assert.match(html,/boot-v0495\.js\?v=0\.4\.9\.5/);
 assert.doesNotMatch(html,/<script type="module" src="\.\/game-v04911/);
 assert.match(boot,/import\("\.\/game-v04911\.mjs\?v=0\.4\.9\.1\.1"\)\.catch\(fail\)/);
 assert.match(boot,/__skyshiftBootReady/);
 assert.match(boot,/__skyshiftBootFail/);
 assert.match(boot,/window\.addEventListener\("unhandledrejection"/);
 assert.match(boot,/e\.stopImmediatePropagation\(\)/);
 assert.match(boot,/location\.reload\(\)/);
 assert.match(boot,/app\.requestFullscreen/);
 assert.ok(html.includes('id="boot-state"'));
 assert.match(src("./style-v043.css"),/\.boot-state\.failed/);
});
test("Hotfix still builds the same wave, physics and ship, but controls init first",()=>{
 const s=src("./game-v04911.mjs");
 for(const mod of ["trial-v049.mjs","zone-wave-v0491.mjs",
  "premium-track-v0491.mjs","aero-barrier-v0491.mjs",
  "manta-blade-v0484.mjs","engine-trails-v0484.mjs"]){
  assert.ok(s.includes(mod),mod);
 }
 assert.match(s,/version:"0\.4\.9\.1\.1"/);
 assert.match(s,/skyshift-zone-v04911-audit\.json/);
 const buttons=s.lastIndexOf("installFullscreen();");
 const scene=s.lastIndexOf("initScene();");
 assert.ok(buttons>=0&&scene>buttons,"buttons must attach before scene creation");
 assert.match(s,/window\.__skyshiftBootReady\?\.\(enterPlaying\)/);
 assert.match(s,/window\.__skyshiftBootFail\?\.\(error\)/);
 assert.match(s,/antialias:!limitedMemory/);
 assert.match(s,/const safeDpr=limitedMemory\?1\.35/);
 assert.match(s,/const crossingPulse=waveResonanceStrength/);
 assert.match(s,/const charge=spectralChargeStrength/);
});
