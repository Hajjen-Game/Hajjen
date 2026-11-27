import test from "node:test";
import assert from "node:assert/strict";
import {createPremiumTrackMaterial,patchPremiumShaders}
 from "../../rendering/road/premium-track-v0901.mjs";
import {shadeTunnelRoadGLSL} from "../../tunnel/shadow-tunnel-v092.mjs";
import {patchBlackoutRoadFragment} from "../../tunnel/tunnel-blackout-v0921.mjs";
import {FIDELITY_0113,selectFidelityProfile,createFidelityDirector,
 resetFidelityDirector,advanceFidelityDirector,fidelityAudit,
 createSmartPremiumTrackMaterial,patchSmartRoadShader}
 from "../../core/visual-fidelity-v0113.mjs";
import {perfConfig} from "../../core/performance-audit-v0113.mjs";
const VERT="#include <common>\nvoid main(){#include <begin_vertex>}";
const FRAG="#include <common>\nvoid main(){#include <color_fragment>\n"+
 "#include <roughnessmap_fragment>\n#include <emissivemap_fragment>}";
class Color{
 constructor(hex){this.value=hex}
 set(hex){this.value=hex;return this}
}
class MeshStandardMaterial{
 constructor(options){this.options=options;this.needsUpdate=false}
}
const THREE={Color,MeshStandardMaterial};
function compile(mat){
 const shader={vertexShader:VERT,fragmentShader:FRAG,uniforms:{}};
 mat.onBeforeCompile(shader,null);
 return shader;
}
test("low memory uses identical original shader and optimized bloom semantics",()=>{
 const baseline=createPremiumTrackMaterial(THREE);
 const on=selectFidelityProfile({lowMemory:true});
 const surface=createSmartPremiumTrackMaterial(THREE,on);
 const original=compile(baseline.material);
 const same=compile(surface.material);
 assert.equal(surface.fidelityShaderEnabled,false);
 assert.deepEqual(same,original);
 assert.equal(surface.material.customProgramCacheKey(),
  baseline.material.customProgramCacheKey());
 assert.equal(FIDELITY_0113.defaultLowMemoryBloomScale,.78);
 assert.equal(FIDELITY_0113.defaultPremiumBloomScale,.88);
});
test("premium-only road material remains a single mesh with tunable existing shader",()=>{
 const profile=selectFidelityProfile({lowMemory:false});
 const surface=createSmartPremiumTrackMaterial(THREE,profile);
 const shader=compile(surface.material);
 assert.equal(surface.fidelityShaderEnabled,true);
 assert.ok(shader.fragmentShader.includes("uniform float uFidelityArc;"));
 assert.ok(shader.fragmentShader.includes("uniform float uFidelityEnergy;"));
 assert.ok(shader.fragmentShader.includes("guided*fidelityDetail*.085"));
 assert.ok(shader.fragmentShader.includes("roughnessFactor - fidelityDetail*.055"));
 assert.ok(shader.fragmentShader.includes("diffuseColor.rgb = road;"));
 assert.equal(surface.material.options.roughness,.38);
 assert.equal(surface.material.options.metalness,.52);
 assert.ok(shader.uniforms.uFidelityArc);
 assert.ok(shader.uniforms.uFidelityEnergy);
 const state=createFidelityDirector(profile);
 advanceFidelityDirector(state,1/60,{s:3402,speed:85,playing:true});
 surface.setFidelitySignal(state);
 assert.equal(shader.uniforms.uFidelityArc.value,2);
 assert.equal(shader.uniforms.uFidelityEnergy.value,state.energy);
 assert.equal(FIDELITY_0113.extraRenderPasses,0);
 assert.equal(FIDELITY_0113.extraDrawCalls,0);
 assert.equal(FIDELITY_0113.extraTextures,0);
});
test("premium shader preserves both 0.9.2 tunnel and blackout patches",()=>{
 const profile=selectFidelityProfile({lowMemory:false});
 const surface=createSmartPremiumTrackMaterial(THREE,profile);
 const shader=compile(surface.material);
 const shadow=shadeTunnelRoadGLSL(shader.fragmentShader);
 const blackout=patchBlackoutRoadFragment(shadow);
 assert.match(blackout,/roughnessFactor - fidelityDetail\*\.055/);
 assert.match(blackout,/tunnelShade \* 0\.997/);
 assert.match(blackout,/totalEmissiveRadiance \*=\s*\(1\.0 - tunnelShade/);
 assert.ok(blackout.includes("whiteCore*0.72"));
 assert.ok(blackout.includes("uFidelityEnergy"));
});
test("force-on/force-off presets isolate smart fidelity without altering other perf configurations",()=>{
 const full=selectFidelityProfile({lowMemory:true,
  preset:perfConfig("?perf=1&perfPreset=fidelity-on").preset});
 const off=selectFidelityProfile({lowMemory:false,
  preset:perfConfig("?perf=1&perfPreset=fidelity-off").preset});
 assert.equal(full.premium,true);
 assert.equal(off.premium,false);
 assert.equal(full.forced,true);
 assert.equal(off.forced,true);
 assert.equal(perfConfig("?perf=1&perfPreset=bloom-full").preset,"bloom-full");
 assert.equal(perfConfig("?perf=1&perfPreset=baseline").preset,"baseline");
 assert.equal(perfConfig("?perf=1&perfPreset=unknown").validPreset,false);
});
test("premium energy bounded, frame-rate consistent, loop-wrapped, paused safely",()=>{
 const premium=selectFidelityProfile({lowMemory:false});
 const st60=createFidelityDirector(premium);
 const st120=createFidelityDirector(premium);
 for(let i=0;i<180;i++)
  advanceFidelityDirector(st60,1/60,{s:3402,speed:101.4,
   boostMultiplier:1.4,wave:1,playing:true});
 for(let i=0;i<360;i++)
  advanceFidelityDirector(st120,1/120,{s:3402,speed:101.4,
   boostMultiplier:1.4,wave:1,playing:true});
 assert.ok(st60.energy<=1&&st60.energy>=0);
 assert.ok(Math.abs(st60.energy-st120.energy)<1e-12);
 assert.equal(st60.arc,2);
 const snapshot={energy:st60.energy,updates:st60.updates};
 advanceFidelityDirector(st60,1/60,{s:-1,playing:false,speed:44});
 assert.equal(st60.energy,snapshot.energy);
 assert.equal(st60.updates,snapshot.updates);
 assert.equal(st60.arc,3399);
 const low=createFidelityDirector(selectFidelityProfile({lowMemory:true}));
 for(let i=0;i<120;i++)advanceFidelityDirector(low,1/60,{
   s:300,speed:130,boostMultiplier:1.4,wave:1});
 assert.equal(low.energy,0);
 const audit=fidelityAudit(st120);
 assert.equal(audit.pilotPhysicsChanged,false);
 assert.equal(audit.whiteCoreUnchanged,true);
 assert.equal(audit.extraRenderPasses,0);
 resetFidelityDirector(st120);
 assert.equal(st120.updates,0);
});
test("strict GLSL validation catches incompatible Three shader revisions",()=>{
 assert.throws(()=>patchSmartRoadShader("#include <common>"),/unsupported/);
 const base=patchPremiumShaders(VERT,FRAG);
 assert.ok(base.fragmentShader.includes("diffuseColor.rgb = road;"));
});
