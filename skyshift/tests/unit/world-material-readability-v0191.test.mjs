// SKYSHIFT 0.19.1 — Pass 1 material/readability deterministic QA.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 READABILITY_0191,READABLE_TINTS_0191,
 readableTint,perceivedLuma,patchReadableSurfaceFragment,
 installReadableFinish
} from "../../world-material-readability-v0191.mjs";
import {worldArchitecturePlan} from "../../world-rebuild-v0190.mjs";
import {signatureArchitecturePlan} from "../../signature-environment-v0180.mjs";
const file=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
test("authoritative world geometry and original track physics remain unchanged",()=>{
 const high=worldArchitecturePlan(),low=worldArchitecturePlan({lowMemory:true});
 assert.equal(high.stats.beams,425);
 assert.equal(low.stats.beams,343);
 assert.equal(high.stats.colliders,0);
 assert.equal(high.stats.drawBatches,4);
 assert.equal(low.stats.drawBatches,3);
 assert.equal(signatureArchitecturePlan().stats.beams,219);
 assert.equal(READABILITY_0191.extraMeshes,0);
 assert.equal(READABILITY_0191.extraDynamicLights,0);
 assert.equal(READABILITY_0191.extraRenderPasses,0);
 assert.equal(READABILITY_0191.addedDrawCalls,0);
});
test("slate/violet/cathedral material midtones rise, energy accents untouched",()=>{
 for(const tone of READABLE_TINTS_0191){
  assert.equal(readableTint(tone.old),tone.new);
  assert.ok(perceivedLuma(tone.new)>perceivedLuma(tone.old)*1.5);
 }
 assert.ok(perceivedLuma(readableTint(0x0b1326))>
  perceivedLuma(0x0b1326)*3.5);
 for(const tone of [0x8deaff,0x65bfff,0xff66bf,0xf5fbff,0xffbb7c])
  assert.equal(readableTint(tone),tone);
 assert.ok(READABILITY_0191.steelMetalness<.68);
 assert.ok(READABILITY_0191.vaultMetalness<.7);
});
test("baked fill uses existing standard-material emission, no extra draw or lights",()=>{
 const shader="vec4 diffuseColor=vec4(1.0);\n"+
  "#include <emissivemap_fragment>\n"+
  "gl_FragColor=vec4(diffuseColor.rgb,1.0);";
 const patched=patchReadableSurfaceFragment(shader,.33);
 assert.match(patched,/totalEmissiveRadiance \+= diffuseColor\.rgb \* 0\.330/);
 assert.equal(patched.match(/emissivemap_fragment/g).length,1);
 assert.throws(()=>patchReadableSurfaceFragment(shader,0),/incompatible/);
 assert.throws(()=>patchReadableSurfaceFragment("frag",.33),/incompatible/);
 const material={needsUpdate:false,onBeforeCompile(shader){shader.fragmentShader=shader.fragmentShader;},
  customProgramCacheKey(){return "standard";}};
 installReadableFinish(material,.33,"steel");
 const result={fragmentShader:shader};
 material.onBeforeCompile(result,null);
 assert.match(result.fragmentShader,/Static baked ambient response/);
 assert.equal(material.customProgramCacheKey(),"standard-readable-0191-steel-0.330");
 assert.equal(material.needsUpdate,true);
});
test("live 0.19.1 renderer includes only opt-in material change",()=>{
 const game=file("./game-v0191.mjs");
 assert.match(game,/materialsEnabled=new URLSearchParams\(location\.search\)/);
 assert.match(game,/if\(materialsEnabled\)readabilityAudit=applyReadableWorldMaterials/);
 assert.match(game,/from "\.\/world-material-readability-v0191\.mjs"/);
 assert.match(game,/from "\.\/trial-v0165\.mjs"/);
 assert.match(game,/from "\.\/flight\/unified-flight-v0165\.mjs"/);
 assert.match(game,/from "\.\/flight\/cinematic-v0165\.mjs"/);
 assert.match(game,/from "\.\/world-rebuild-v0190\.mjs"/);
 assert.match(game,/from "\.\/signature-environment-v0180\.mjs"/);
 assert.match(file("./index.html"),/boot-v0191\.js\?v=0\.19\.1/);
 assert.match(file("./boot-v0191.js"),/game-v0191\.mjs\?v=0\.19\.1/);
});
