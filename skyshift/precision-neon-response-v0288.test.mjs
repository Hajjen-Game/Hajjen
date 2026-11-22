// SKYSHIFT 0.28.8 source-preserving and rollback regression gates.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {precisionNeonEnabled0288,patchPrecisionNeon0288,
 installPrecisionNeon0288,PRECISION_NEON_0288}
 from "./precision-neon-response-v0288.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");

test("0.28.8 enabled only for new Vault; classic restores exact 0.28.7",()=>{
 for(const v of ["0.28.1","0.28.4","0.28.5","0.28.6","0.28.7"])
  assert.equal(precisionNeonEnabled0288("?track=vault&v="+v),false);
 assert.equal(precisionNeonEnabled0288("?track=vault&v=0.28.8"),true);
 assert.equal(precisionNeonEnabled0288("?track=vault&v=0.28.9"),true);
 for(const v of ["?track=vault&v=0.28.8&precisionNeon=classic",
  "?track=vault&v=0.28.8&precisionNeon=off",
  "?track=skyline&v=0.28.8","?track=aurora&v=0.28.8"])
  assert.equal(precisionNeonEnabled0288(v),false,v);
});
test("native physical GGX is preserved with 5 High / 3 mobile source taps",()=>{
 for(const mobile of [false,true]){
  for(const role of ["panel","rib"]){
   const c=mobile?2:3,w=mobile?1:2;
   const f=[
    "#include <common>",
    "uniform float uReflectionStability0286;",
    "varying vec2 vLocalMask0261;",
    "float r65WallC=1.0;",
    "float r65WallW=1.0;",
    "float l261CoolDistance=4.0;",
    "float l261WarmDistance=4.0;",
    ...Array(c).fill("RE_Direct(l261Cool,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);"),
    ...Array(w).fill("RE_Direct(l261Warm,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);")
   ].join("\n");
   const x=patchPrecisionNeon0288(f,{kind:"physical",role,mobile});
   assert.equal(x.split("RE_Direct(l261Cool").length-1,c);
   assert.equal(x.split("RE_Direct(l261Warm").length-1,w);
   assert.equal(x.split("l261Cool.color*=").length-1,c);
   assert.equal(x.split("l261Warm.color*=").length-1,w);
   assert.match(x,/r65WallC/);
   assert.match(x,/smoothstep\(2\.0,9\.2,l261CoolDistance\)/);
   assert.match(x,/uPrecisionNeon0288/);
   assert.throws(()=>patchPrecisionNeon0288(f.replace("float r65WallC=","float gone="),{kind:"physical",role,mobile}));
  }
 }
});
test("cyan cove and existing orange L distinguish core from halo; no new area lights",()=>{
 const original="#include <common>\nuniform float uReflectionStability0286;\n#include <color_fragment>";
 const cyan=patchPrecisionNeon0288(original,{kind:"cove"});
 const warm=patchPrecisionNeon0288(original,{kind:"foot"});
 assert.match(cyan,/p288Hue/);assert.match(cyan,/p288Core/);
 assert.match(warm,/p288BladeCore/);
 assert.match(warm,/diffuseColor\.a\*=1\.0/);
 for(const v of [cyan,warm])
  assert.match(v,/uniform float uPrecisionNeon0288/);
 assert.throws(()=>patchPrecisionNeon0288("#include <color_fragment>",{kind:"foot"}));
 for(const key of ["addedLights","addedMeshes","addedTextures",
  "addedPasses","addedReflectionSamples"])assert.equal(PRECISION_NEON_0288[key],0);
});
test("10 modules reuse original material batches and all comparison uniforms restore",()=>{
 const mat=physical=>({isMeshPhysicalMaterial:physical,
  isMeshBasicMaterial:!physical,onBeforeCompile(){},
  customProgramCacheKey(){return "native";},needsUpdate:false});
 const prefix="SKYSHIFT 0.26.0 P2 / true physical ";
 const SOURCE="SKYSHIFT · Tunnel Megastructure 0.21.1";
 const COVE="SKYSHIFT 0.26.0 / stable cyan cove emitters";
 const FOOT="SKYSHIFT 0.28.1 / original joined amber arch feet";
 for(const lowMemory of [false,true]){
  const group={children:[
   {name:prefix+"panel",material:mat(true)},
   {name:prefix+"rib",material:mat(true)},
   {name:COVE,material:mat(false)}
  ]};
  const foot={name:FOOT,material:mat(false)};
  const section={children:[foot],
   getObjectByName(name){return name===SOURCE?group:null}};
  const all=[...group.children.map(x=>x.material),foot.material];
  const callbacks=all.map(x=>x.onBeforeCompile);
  const precise=installPrecisionNeon0288(section,{enabled:true,lowMemory});
  assert.equal(precise.active,true);
  assert.equal(precise.stats().coats,lowMemory?1:2);
  for(const power of [0,1,0.4]){
   precise.setComparison(power);
   assert.equal(precise.stats().strength,power);
  }
  precise.dispose();precise.dispose();
  all.forEach((m,i)=>assert.equal(m.onBeforeCompile,callbacks[i]));
 }
});
test("shared renderer and game own lifecycle, not a parallel Vault imitation",()=>{
 const shared=read("./true-shared-tunnel-renderer-v0281.mjs");
 const game=read("./game-v0210.mjs");
 const html=read("./index.html");
 assert.match(shared,/installPrecisionNeon0288\(section/);
 assert.match(shared,/setPrecisionNeonComparison\(value\)/);
 assert.match(shared,/item\.precision\?\.dispose\?\.\(\)/);
 assert.match(game,/__skyshiftPrecisionNeonFrameProof/);
 assert.match(game,/precisionNeonReleaseEnabled\?" · 0\.28\.8"/);
 assert.match(html,/(?:Shared Straight-Only Edge Lighting Parity|Ceiling Fixture Placement & Glow Cohesion|Premium Arch Optics & Chromatic Road Reflections|Unified Light Sources & Road Layer Cleanup)/);
 assert.match(html,/0\.28\.9/);
 assert.doesNotMatch(read("./precision-neon-response-v0288.mjs"),
  /new THREE\.(PointLight|RectAreaLight|Reflector|PMREMGenerator|WebGLRenderTarget)/);
});
