import test from "node:test";
import assert from "node:assert/strict";
import {createPremiumTrackMaterial} from "../../premium-track-v0901.mjs";
import {shadeTunnelRoadGLSL} from "../../shadow-tunnel-v092.mjs";
import {patchBlackoutRoadFragment} from "../../tunnel-blackout-v0921.mjs";
import {patchSmartRoadShader as oldShader} from "../../core/visual-fidelity-v0113.mjs";
import {FIDELITY_0114,selectFidelityProfile,createFidelityDirector,
 resetFidelityDirector,advanceFidelityDirector,fidelityAudit,
 createSmartPremiumTrackMaterial,patchRefinedRoadShaders}
 from "../../core/visual-fidelity-v0114.mjs";
import {perfConfig} from "../../core/performance-audit-v0114.mjs";
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
const getProfile=(lowMemory,preset="baseline")=>
 selectFidelityProfile({lowMemory,preset});
test("A51 default is identical to the original shader and optimized bloom",()=>{
 const original=createPremiumTrackMaterial(THREE);
 const ref=createSmartPremiumTrackMaterial(THREE,getProfile(true));
 assert.equal(ref.fidelityShaderEnabled,false);
 assert.deepEqual(compile(ref.material),compile(original.material));
 assert.equal(ref.material.customProgramCacheKey(),
  original.material.customProgramCacheKey());
 assert.equal(FIDELITY_0114.defaultLowMemoryBloomScale,.78);
 assert.equal(FIDELITY_0114.defaultPremiumBloomScale,.88);
 assert.equal(getProfile(true).mode,"classic-pbr");
 assert.equal(getProfile(false).mode,"vertex-nearfield-pbr-sheen");
});
test("refined shader computes near-field distance once per vertex",()=>{
 const ref=createSmartPremiumTrackMaterial(THREE,getProfile(false));
 const shader=compile(ref.material);
 assert.equal(ref.fidelityShaderEnabled,true);
 assert.match(shader.vertexShader,/uniform float uFidelityArc;/);
 assert.match(shader.vertexShader,/uniform float uCircuitLength;/);
 assert.match(shader.vertexShader,/varying float vFidelityMask;/);
 assert.match(shader.vertexShader,/fidelityDist = min\(fidelityDist, uCircuitLength - fidelityDist\)/);
 assert.match(shader.vertexShader,/vFidelityMask = fidelityNear\*fidelityLane/);
 assert.match(shader.fragmentShader,/float fidelityDetail = vFidelityMask\*uFidelityEnergy/);
 assert.doesNotMatch(shader.fragmentShader,/fidelityDelta|float fidelityNear|float fidelityLane/);
 assert.match(shader.fragmentShader,/guided\*fidelityDetail\*\.085/);
 assert.match(shader.fragmentShader,/roughnessFactor - fidelityDetail\*\.055/);
 assert.equal(shader.uniforms.uFidelityArc.value,0);
 assert.equal(shader.uniforms.uFidelityEnergy.value,0);
 assert.equal(shader.uniforms.uCircuitLength.value,3400);
 assert.equal(ref.material.options.roughness,.38);
 assert.equal(ref.material.options.metalness,.52);
 assert.ok(ref.material.customProgramCacheKey().includes("-smart-fidelity-0114-vertex"));
 assert.equal(FIDELITY_0114.refinedPixelModOps,0);
 assert.equal(FIDELITY_0114.refinedPixelSmoothsteps,0);
 assert.equal(FIDELITY_0114.extraDrawCalls,0);
 assert.equal(FIDELITY_0114.extraRenderPasses,0);
});
test("0.11.3 legacy shader A/B is literally equal to its archived fragment",()=>{
 const base=createPremiumTrackMaterial(THREE);
 const legacy=createSmartPremiumTrackMaterial(THREE,getProfile(true,"fidelity-legacy"));
 const old=compile(base.material);
 const fresh=compile(legacy.material);
 assert.equal(fresh.fragmentShader,oldShader(old.fragmentShader));
 assert.equal(fresh.vertexShader,old.vertexShader);
 assert.equal(legacy.fidelityShaderVariant,"fragment-nearfield-pbr-sheen");
 assert.ok(fresh.fragmentShader.includes("mod(trackS - uFidelityArc"));
 assert.ok(legacy.material.customProgramCacheKey().includes("-smart-fidelity-0113-legacy"));
});
test("refined, old and classic material all respect 0.9.2 tunnel and black-room shading",()=>{
 for(const p of [getProfile(false),getProfile(true,"fidelity-legacy"),getProfile(true)]){
  const surface=createSmartPremiumTrackMaterial(THREE,p);
  const shader=compile(surface.material);
  const shaded=shadeTunnelRoadGLSL(shader.fragmentShader);
  const dark=patchBlackoutRoadFragment(shaded);
  assert.match(dark,/tunnelShade \* 0\.997/);
  assert.match(dark,/totalEmissiveRadiance \*=\s*\(1\.0 - tunnelShade/);
  assert.ok(dark.includes("whiteCore*0.72"));
  assert.ok(dark.includes("diffuseColor.rgb = road *"));
 }
});
test("all three A/B modes preserve fixed DPR, bloom and unrelated presets",()=>{
 for(const preset of ["fidelity-on","fidelity-off","fidelity-legacy"]){
  const config=perfConfig("?perf=1&perfPreset="+preset);
  assert.equal(config.preset,preset);
  assert.equal(config.fixedQuality,true);
 }
 assert.equal(getProfile(true,"fidelity-on").premium,true);
 assert.equal(getProfile(true,"fidelity-legacy").legacy,true);
 assert.equal(getProfile(true,"fidelity-off").premium,false);
 assert.equal(getProfile(false,"fidelity-off").premium,false);
 assert.equal(perfConfig("?perf=1&perfPreset=bloom-full").preset,"bloom-full");
 assert.equal(perfConfig("?perf=1&perfPreset=baseline").preset,"baseline");
 assert.equal(perfConfig("?perf=1&perfPreset=invalid").validPreset,false);
});
function smooth(a,b,x){
 const t=Math.max(0,Math.min(1,(x-a)/(b-a)));
 return t*t*(3-2*t);
}
function oldMask(s,arc,lateral,length){
 let d=((s-arc+.5*length)%length+length)%length-.5*length;
 return (1-smooth(26,74,Math.abs(d)))*
  smooth(2.8,4.6,Math.abs(lateral))*
  (1-smooth(9.2,10.2,Math.abs(lateral)));
}
function refinedVertexMask(s,arc,lateral,length){
 let d=Math.abs(s-arc);
 d=Math.min(d,length-d);
 return (1-smooth(26,74,d))*
  smooth(2.8,4.6,Math.abs(lateral))*
  (1-smooth(9.2,10.2,Math.abs(lateral)));
}
test("vertex and pixel near-field mask match at physical deck vertices, including lap seam",()=>{
 for(const arc of [0,1.2,159,1700,3330,3399]){
  for(const s of [0,.8,2,25,26,50,74,100,159,1700,3325,3380,3398,3400]){
   for(const lat of [-11.6,-9,-8,-4.4,-3.9,0,3.9,4.4,8,9,11.6]){
    const a=oldMask(s,arc,lat,3400);
    const b=refinedVertexMask(s,arc,lat,3400);
    assert.ok(Math.abs(a-b)<1e-10,
     `arc=${arc} s=${s} lat=${lat}: old=${a} new=${b}`);
   }
  }
 }
});
test("fidelity director retains frame-rate stable response and no physics changes",()=>{
 const p=getProfile(false);
 const state=createFidelityDirector(p);
 const twin=createFidelityDirector(p);
 for(let i=0;i<180;i++)advanceFidelityDirector(state,1/60,{
  s:3402,speed:101.4,boostMultiplier:1.4,wave:1});
 for(let i=0;i<360;i++)advanceFidelityDirector(twin,1/120,{
  s:3402,speed:101.4,boostMultiplier:1.4,wave:1});
 assert.ok(Math.abs(twin.energy-state.energy)<1e-12);
 assert.equal(state.arc,2);
 const surface=createSmartPremiumTrackMaterial(THREE,p);
 const shader=compile(surface.material);
 surface.setFidelitySignal(state);
 assert.equal(shader.uniforms.uFidelityArc.value,2);
 assert.equal(shader.uniforms.uFidelityEnergy.value,state.energy);
 const audit=fidelityAudit(state);
 assert.equal(audit.shaderStage,"vertex");
 assert.equal(audit.pixelModOps,0);
 assert.equal(audit.pilotPhysicsChanged,false);
 assert.equal(audit.whiteCoreUnchanged,true);
 const snap=state.energy;
 advanceFidelityDirector(state,1/60,{playing:false,s:-1});
 assert.equal(state.energy,snap);
 resetFidelityDirector(state);assert.equal(state.updates,0);
});
test("strict shader anchors catch incompatible Three versions",()=>{
 assert.throws(()=>patchRefinedRoadShaders("vertex","fragment"),/unsupported/);
});
