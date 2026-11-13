// SKYSHIFT 0.4.9.1 — Spectral Zone Wave, material/color/rail sync.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 ZONE_WAVE,ZONE_PALETTES,SPECTRAL_FRONT_GLSL,newZoneWaveState,
 updateZoneWave,frontPaletteBlend,waveResonanceStrength
} from "./zone-wave-v0491.mjs";
import {
 PREMIUM_TRACK,SURFACE_FRAGMENT_GLSL,SURFACE_FRAGMENT_HELPERS,
 patchPremiumShaders,createPremiumTrackMaterial
} from "./premium-track-v0491.mjs";
import {
 AERO_BARRIER,createAeroDetailData,patchRailShaders,
 RAIL_SPECTRAL_VERTEX,RAIL_SPECTRAL_FRAGMENT,installAeroBarriers
} from "./aero-barrier-v0491.mjs";
import {TRIAL,speedAt,COURSE_SEGMENTS} from "./trial-v049.mjs";
const source=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const near=(x,y,e=1e-7)=>assert.ok(Math.abs(x-y)<=e,
 `expected ${x} near ${y}`);
test("Spectral wave keeps the signed world-arc front, broadens it to ~0.7s at cruise",()=>{
 assert.equal(ZONE_WAVE.direction,"behind-to-ahead");
 assert.deepEqual(ZONE_WAVE.triggers,[10,20,27]);
 assert.equal(ZONE_WAVE.behindMeters,90);
 assert.equal(ZONE_WAVE.frontMetersPerSecond,114);
 assert.equal(ZONE_WAVE.featherMeters,24);
 assert.ok(2*ZONE_WAVE.featherMeters/(114-47)>.65);
 assert.ok(2*ZONE_WAVE.featherMeters/(114-47)<.8);
 assert.equal(ZONE_WAVE.crestMeters,4.5);
 assert.equal(ZONE_WAVE.afterglowMeters,62);
 assert.equal(ZONE_WAVE.screenFlash,false);
 assert.equal(ZONE_WAVE.shaderUniformOnly,true);
});
test("First, second and early final spectral waves pass from behind without changing speed or course",()=>{
 const state=newZoneWaveState();
 let result=updateZoneWave(state,9.99,475);
 assert.equal(result.activeCount,0);
 result=updateZoneWave(state,10,480);
 assert.deepEqual(result.started,[1]);
 assert.equal(state.waves[0].startS,390);
 result=updateZoneWave(state,11.4,546);
 assert.equal(result.stage,1);
 result=updateZoneWave(state,20,940);
 assert.deepEqual(result.started,[2]);
 result=updateZoneWave(state,21.4,1006);
 assert.equal(result.stage,2);
 result=updateZoneWave(state,27,1280);
 assert.deepEqual(result.started,[3]);
 assert.equal(state.waves[2].startS,1190);
 result=updateZoneWave(state,28.4,1346);
 assert.equal(result.stage,3);
 assert.deepEqual(state.passedStages,[1,2,3]);
 assert.deepEqual(state.activatedStages,[1,2,3]);
 assert.ok(31.48-28.4>2.9,"final Jade zone needs time to be seen");
 assert.equal(TRIAL.length,1530);
 assert.equal(COURSE_SEGMENTS.length,13);
 assert.equal(speedAt(850),47);
});
test("Atmosphere transitions across the same spatial front, not one HUD cut",()=>{
 const state=newZoneWaveState();
 updateZoneWave(state,10,480);
 const front=state.fronts[0];
 const old=frontPaletteBlend(state,front+70);
 assert.equal(old.from,0);assert.equal(old.to,0);assert.equal(old.mix,0);
 const halfway=frontPaletteBlend(state,front);
 near(halfway.mix,.5);
 assert.equal(halfway.to,1);
 const next=frontPaletteBlend(state,front-70);
 assert.equal(next.from,0);assert.equal(next.to,1);assert.equal(next.mix,1);
 assert.equal(state.playerStage,0,"HUD remains tied to player wave crossing");
});
test("Manta twin engines have a restrained .62s resonance after actual crossing",()=>{
 const state=newZoneWaveState();
 updateZoneWave(state,10,480);
 updateZoneWave(state,11.5,540);
 const cross=state.stageTransitionSeconds.at(-1);
 near(waveResonanceStrength(state,cross),1);
 assert.ok(waveResonanceStrength(state,cross+.31)>.45);
 near(waveResonanceStrength(state,cross+.8),0);
 const reset=newZoneWaveState();
 near(waveResonanceStrength(reset,22),0);
});
test("Curated 4-stage spectrum is distinct: midnight, violet, solar and jade",()=>{
 assert.deepEqual(ZONE_PALETTES.map(p=>p.name),[
  "MIDNIGHT","ELECTRIC VIOLET","SOLAR GOLD","JADE SURGE"]);
 assert.equal(new Set(ZONE_PALETTES.map(p=>p.base)).size,4);
 assert.equal(new Set(ZONE_PALETTES.map(p=>p.accent)).size,4);
 for(const p of ZONE_PALETTES){
  const brightest=x=>{
   const a=[(x>>16)&255,(x>>8)&255,x&255];
   return .2126*a[0]+.7152*a[1]+.0722*a[2];
  };
  assert.ok(brightest(p.guide)>brightest(p.base)*1.8);
  assert.notEqual(p.accent,p.base);
 }
});
test("One road shader handles broad front, slender core and fading wake",()=>{
 assert.equal(PREMIUM_TRACK.drawBatches,1);
 assert.equal(PREMIUM_TRACK.floatingDecalBatches,0);
 assert.equal(PREMIUM_TRACK.colorAnimation,true);
 assert.equal(PREMIUM_TRACK.spectralLayerCount,3);
 assert.match(SPECTRAL_FRONT_GLSL,/spectralWaveOffset/);
 assert.match(SPECTRAL_FRONT_GLSL,/spectralAfterglow/);
 assert.match(SURFACE_FRAGMENT_HELPERS,/uniform float uZoneTime/);
 assert.match(SURFACE_FRAGMENT_GLSL,/waveSpectrum/);
 assert.match(SURFACE_FRAGMENT_GLSL,/waveAfter/);
 assert.match(SURFACE_FRAGMENT_GLSL,/crestEnergy/);
 const shader=patchPremiumShaders(
  "#include <common>\n#include <begin_vertex>",
  "#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>");
 assert.match(shader.vertexShader,/vTrackCoord = aTrackCoord/);
 assert.match(shader.fragmentShader,/spectralCore\(/);
 assert.match(shader.fragmentShader,/spectralAfterglow\(/);
 assert.match(shader.fragmentShader,/totalEmissiveRadiance \+= zoneGuide/);
});
test("Both pre-existing rail batches contain physical coordinates for same spectrally warped crest",()=>{
 assert.equal(AERO_BARRIER.drawBatches,3);
 const details=createAeroDetailData();
 for(const g of [details.light,details.dark]){
  assert.equal(g.coords.length,g.positions.length/3*2);
  assert.ok(g.coords.every(Number.isFinite));
  assert.ok(g.coords.some((x,i)=>i%2===0&&x>1200),
   "zone tail must be represented in existing rail vertex coordinates");
 }
 assert.match(RAIL_SPECTRAL_VERTEX,/aRailCoord/);
 assert.match(RAIL_SPECTRAL_FRAGMENT,/uRailNext3/);
 assert.match(RAIL_SPECTRAL_FRAGMENT,/spectralWaveOffset/);
 const railShader=patchRailShaders(
  "#include <common>\n#include <begin_vertex>",
  "#include <common>\n#include <color_fragment>");
 assert.match(railShader.vertexShader,/vRailCoord=aRailCoord/);
 assert.match(railShader.fragmentShader,/spectralCore/);
 assert.match(railShader.fragmentShader,/diffuseColor.rgb \*= railColor/);
});
test("Road material uniforms advance with flight clock, not wall-time or new geometry",()=>{
 class C{constructor(value){this.value=value;}set(v){this.value=v;return this;}}
 class M{constructor(options){Object.assign(this,options);}}
 const T={Color:C,MeshStandardMaterial:M,DoubleSide:2};
 const track=createPremiumTrackMaterial(T);
 const shader={vertexShader:"#include <common>\n#include <begin_vertex>",
  fragmentShader:"#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>",
  uniforms:{}};
 track.material.onBeforeCompile(shader);
 const state=newZoneWaveState();
 updateZoneWave(state,10,480);
 track.setWaveState(state);
 assert.equal(shader.uniforms.uZoneActiveCount.value,1);
 near(shader.uniforms.uZoneTime.value,10);
 near(shader.uniforms.uZoneFront1.value,state.fronts[0]);
 assert.equal(shader.uniforms.uZoneFeather.value,24);
 assert.ok(shader.uniforms.uZone1Accent.value);
});
test("Live 0.4.9.1 references synchronised wave modules and unchanged flight steering",()=>{
 const game=source("game-v0491.mjs"),html=source("index.html");
 assert.match(html,/game-v0491\.mjs\?v=0\.4\.9\.1/);
 for(const mod of ["zone-wave-v0491","premium-track-v0491","aero-barrier-v0491",
  "trial-v049","boost-v049","manta-blade-v0484","engine-trails-v0484"])
  assert.ok(game.includes(`from "./${mod}.mjs"`),mod);
 assert.match(game,/frontPaletteBlend\(zoneWave,flight\.s\)/);
 assert.match(game,/identitySurface\?\.setWaveState\(zoneWave\)/);
 assert.match(game,/waveResonanceStrength\(zoneWave,flight\.elapsed\)/);
 assert.match(game,/skyshift-zone-v0491-audit\.json/);
 assert.match(game,/version:"0\.4\.9\.1"/);
 assert.doesNotMatch(game,/UI\.flash\.classList\.add\("active"\)/);
 assert.equal(TRIAL.startSpeed,44);
 assert.equal(TRIAL.endSpeed,47);
});
