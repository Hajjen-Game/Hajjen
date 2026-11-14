// SKYSHIFT 0.4.9.2 – White-Core Spectral Wave & Cinematic Energy.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 ZONE_WAVE,ZONE_PALETTES,SPECTRAL_FRONT_GLSL,
 newZoneWaveState,updateZoneWave,horizonWaveCue,waveResonanceStrength
} from "./zone-wave-v0492.mjs";
import {
 PREMIUM_TRACK,SURFACE_FRAGMENT_GLSL,SURFACE_FRAGMENT_HELPERS,
 createPremiumTrackMaterial,patchPremiumShaders
} from "./premium-track-v0492.mjs";
import {
 AERO_BARRIER,RAIL_SPECTRAL_FRAGMENT,RAIL_SPECTRAL_VERTEX,
 patchRailShaders,createAeroDetailData
} from "./aero-barrier-v0492.mjs";
import {TRIAL,speedAt} from "./trial-v049.mjs";
const source=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const close=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const smooth=(a,b,v)=>{
 const t=Math.max(0,Math.min(1,(v-a)/(b-a)));
 return t*t*(3-2*t);
};
const white=x=>1-smooth(1.25,ZONE_WAVE.whiteCoreMeters,Math.abs(x));
test("Neutral white energy is NOT simply the next palette accent",()=>{
 assert.equal(ZONE_WAVE.whiteCoreMeters,5.6);
 assert.equal(ZONE_WAVE.whiteBloomMeters,19);
 assert.ok(ZONE_WAVE.whiteCoreEnergy>=1.4);
 assert.equal(ZONE_WAVE.frontMetersPerSecond,114);
 assert.equal(ZONE_WAVE.featherMeters,24);
 assert.equal(ZONE_WAVE.filamentRangeMeters,19);
 assert.equal(ZONE_WAVE.screenFlash,false);
 assert.equal(ZONE_PALETTES.length,4);
 assert.match(SPECTRAL_FRONT_GLSL,/spectralWhiteCore\(/);
 assert.match(SPECTRAL_FRONT_GLSL,/spectralWhiteBloom\(/);
 assert.match(SPECTRAL_FRONT_GLSL,/spectralFilaments\(/);
 assert.ok(ZONE_PALETTES.every(p=>p.accent!==0xffffff));
 close(white(0),1);
 close(white(-3.1),white(3.1));
 close(white(5.6),0);
 assert.ok(white(2.5)>.7);
 // At 22 FPS, ~0.16s core exposure spans several drawn frames.
 assert.ok(2*ZONE_WAVE.whiteCoreMeters/(114-47)>.16);
});
test("Cinematic horizon cue follows physical front, not screen timers",()=>{
 const wave=newZoneWaveState();
 close(horizonWaveCue(wave,480),0);
 updateZoneWave(wave,10,480);
 close(horizonWaveCue(wave,480),0);
 updateZoneWave(wave,10.789,480);
 const crest=wave.fronts[0];
 assert.ok(Math.abs(crest-480)<1);
 assert.ok(horizonWaveCue(wave,480)>.95);
 updateZoneWave(wave,11.4,540);
 assert.equal(wave.playerStage,1);
 assert.ok(waveResonanceStrength(wave,11.4)>.95);
 updateZoneWave(wave,12.7,600);
 close(waveResonanceStrength(wave,12.7),0);
 assert.deepEqual(wave.triggers,[10,20,27]);
});
test("Road surface retains one indexed draw batch yet composes 5 energy layers",()=>{
 assert.equal(PREMIUM_TRACK.drawBatches,1);
 assert.equal(PREMIUM_TRACK.floatingDecalBatches,0);
 assert.equal(PREMIUM_TRACK.spectralLayerCount,5);
 assert.equal(PREMIUM_TRACK.lowGraphicsFilamentsDisabled,true);
 assert.equal(TRIAL.length,1530);
 assert.equal(speedAt(1000),47);
 assert.match(SURFACE_FRAGMENT_GLSL,/neutralEnergy/);
 assert.match(SURFACE_FRAGMENT_GLSL,/whiteCore\*\.91/);
 assert.match(SURFACE_FRAGMENT_GLSL,/whiteBloom\*\.26/);
 assert.match(SURFACE_FRAGMENT_HELPERS,/uWaveDetail/);
 class C{constructor(v){this.v=v;}set(v){this.v=v;return this;}}
 class M{constructor(x){Object.assign(this,x);}}
 const THREE={Color:C,MeshStandardMaterial:M,DoubleSide:2};
 const track=createPremiumTrackMaterial(THREE);
 const shader={vertexShader:"#include <common>\n#include <begin_vertex>",
  fragmentShader:"#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>",uniforms:{}};
 track.material.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/spectralWhiteCore/);
 assert.match(shader.fragmentShader,/whiteCore\*1\.52/);
 assert.match(shader.fragmentShader,/whiteBloom\*0\.46/);
 assert.ok(shader.uniforms.uWaveDetail);
 assert.equal(shader.uniforms.uWaveDetail.value,1);
 track.setDetailMode("low");
 assert.equal(shader.uniforms.uWaveDetail.value,0);
 track.setDetailMode("high");
 assert.equal(shader.uniforms.uWaveDetail.value,1);
 const wave=newZoneWaveState();updateZoneWave(wave,10,480);
 track.setWaveState(wave);
 assert.equal(shader.uniforms.uZoneActiveCount.value,1);
 close(shader.uniforms.uZoneTime.value,10);
 close(shader.uniforms.uZoneFront1.value,390);
});
test("Rails use SAME spectral functions and white core in original accent batch",()=>{
 assert.equal(AERO_BARRIER.drawBatches,3);
 assert.equal(AERO_BARRIER.whiteCoreReady,true);
 assert.match(RAIL_SPECTRAL_VERTEX,/aRailCoord/);
 assert.match(RAIL_SPECTRAL_FRAGMENT,/spectralWhiteCore/);
 assert.match(RAIL_SPECTRAL_FRAGMENT,/spectralWhiteBloom/);
 assert.match(RAIL_SPECTRAL_FRAGMENT,/spectralFilaments/);
 assert.match(RAIL_SPECTRAL_FRAGMENT,/diffuseColor\.a=min/);
 assert.match(RAIL_SPECTRAL_FRAGMENT,/railWhite\*1\.65/);
 const compiled=patchRailShaders(
  "#include <common>\n#include <begin_vertex>",
  "#include <common>\n#include <color_fragment>");
 assert.match(compiled.fragmentShader,/uniform float uWaveDetail/);
 assert.match(compiled.fragmentShader,/spectralWhiteCore/);
 const detail=createAeroDetailData();
 assert.ok(detail.light.coords.length>20000);
 assert.equal(detail.light.coords.length,detail.light.positions.length/3*2);
});
test("0.4.9.2 keeps independent Android bootstrap and original flight physics",()=>{
 const boot=source("boot-v0492.js"),page=source("index.html"),game=source("game-v0492.mjs");
 assert.match(page,/boot-v0492\.js\?v=0\.4\.9\.2/);
 assert.match(page,/data-game-module="game-v0492\.mjs"/);
 assert.match(boot,/import\("\.\/game-v0492\.mjs\?v=0\.4\.9\.2"\)/);
 assert.match(boot,/__skyshiftBootFail/);
 assert.match(game,/version:"0\.4\.9\.2"/);
 assert.match(game,/skyshift-zone-v0492-audit\.json/);
 for(const dep of ["trial-v049","boost-v049","manta-blade-v0484","engine-trails-v0484",
  "premium-track-v0492","aero-barrier-v0492","zone-wave-v0492","cinematic-v045"])
  assert.ok(game.includes(`from "./${dep}.mjs"`),dep);
 assert.match(game,/identitySurface\?\.setDetailMode\(waveDetail\)/);
 assert.match(game,/premiumSurface\?\.setDetailMode\(waveDetail\)/);
 assert.match(game,/horizonWaveCue\(zoneWave,flight\.s\)/);
 assert.doesNotMatch(game,/UI\.flash\.classList\.add\("active"\)/);
 assert.equal(TRIAL.startSpeed,44);
 assert.equal(TRIAL.endSpeed,47);
});
