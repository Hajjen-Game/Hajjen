import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PREMIUM_METAL_0262,buildPremiumMetalAtlas0262,
 makePremiumMetalTexture0262,patchPremiumMetalShader0262,
 installPremiumMetalShader0262,patchPremiumSubstrateShader0262} from "./premium-metal-surface-v0262.mjs";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const fragment=[
 "#include <common>",
 "varying float vPbrTrack0260;varying vec2 vPbrSection0260;",
 "#include <metalnessmap_fragment>",
 "#include <normal_fragment_maps>",
 "RE_Direct(l261Cool,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);"
].join("\n");
test("Pass 2 is a pure local material change, no global lighting or gameplay",()=>{
 const s=PREMIUM_METAL_0262;
 assert.equal(s.version,"0.26.2");assert.equal(s.pass,2);
 assert.equal(s.textureCount,1);
 for(const key of ["addedMeshes","addedDrawCalls","addedLights",
  "addedPostprocessPasses","addedReflectionProbes"])assert.equal(s[key],0);
 for(const key of ["changesRoad","changesRails","changesShip",
  "changesPhysics","changesGRIP","changesCamera","changesNativeNeon",
  "changesSolarSeal"])assert.equal(s[key],false,key);
 assert.equal(s.comparison,"?premiumMetal=classic");
 const src=read("./premium-metal-surface-v0262.mjs");
 assert.match(src,/installTrueLocalReflectionsPass1/);
 assert.doesNotMatch(src,/new THREE\.DirectionalLight|new THREE\.PointLight|new THREE\.RectAreaLight/);
 assert.doesNotMatch(src,/PMREMGenerator|WebGLRenderTarget/);
});
test("packed roughness and brushed normal map is deterministic and mobile-filtered",()=>{
 const high=buildPremiumMetalAtlas0262(256);
 const low=buildPremiumMetalAtlas0262(128);
 assert.equal(high.bytes,256*256*4);
 assert.equal(low.bytes,128*128*4);
 assert.deepEqual(buildPremiumMetalAtlas0262(256).pixels,high.pixels);
 assert.ok(new Set(high.pixels.filter((_,i)=>i%4===1)).size>25);
 assert.ok(new Set(high.pixels.filter((_,i)=>i%4===0)).size>20);
 assert.ok(low.pixels.every(Number.isFinite));
 assert.throws(()=>buildPremiumMetalAtlas0262(512));
});
test("runtime atlas is one mipmapped, low-anisotropy non-color DataTexture",()=>{
 class MockDataTexture{constructor(pixels,width,height,format,type){
  Object.assign(this,{image:{data:pixels,width,height},format,type});}
 }
 const T={DataTexture:MockDataTexture,RGBAFormat:3,UnsignedByteType:4,
  RepeatWrapping:5,LinearFilter:6,LinearMipmapLinearFilter:7,NoColorSpace:""};
 const desktop=makePremiumMetalTexture0262(T,false),mobile=makePremiumMetalTexture0262(T,true);
 assert.equal(desktop.image.width,256);assert.equal(mobile.image.width,128);
 assert.equal(desktop.anisotropy,2);assert.equal(mobile.anisotropy,1);
 assert.equal(desktop.colorSpace,T.NoColorSpace);
 assert.equal(desktop.generateMipmaps,true);
});
test("native GGX metal roughness receives the atlas; normal maps are cheaper on mobile",()=>{
 for(const role of ["panel","rib"])for(const mobile of [false,true]){
  const r=patchPremiumMetalShader0262("#include <common>",fragment,{role,mobile});
  assert.match(r.fragmentShader,/uniform sampler2D uMetalAtlas0262/);
  assert.match(r.fragmentShader,/uPremiumMetal0262/);
  assert.match(r.fragmentShader,/roughnessFactor=mix/);
  assert.match(r.fragmentShader,/RE_Direct\(l261Cool/);
  assert.match(r.fragmentShader,/vPbrTrack0260\*0\.25/);
  assert.match(r.fragmentShader,/vPbrSection0260\.y\*0\.58/);
  if(mobile)assert.doesNotMatch(r.fragmentShader,/dFdx\(-vViewPosition\)/);
  else assert.match(r.fragmentShader,/dFdx\(-vViewPosition\)/);
  assert.equal((r.fragmentShader.match(/#include <normal_fragment_maps>/g)||[]).length,1);
 }
 assert.throws(()=>patchPremiumMetalShader0262("",fragment,{role:"ship"}));
 assert.throws(()=>patchPremiumMetalShader0262("","#include <common>"));
});
test("uniform toggling offers a true same-frame 0.26.1 comparison",()=>{
 const old=function(){},key=function(){return "native-pbr-0261";};
 const material={isMeshPhysicalMaterial:true,onBeforeCompile:old,
  customProgramCacheKey:key,needsUpdate:false};
 const amount={value:1},uniforms={uPremiumMetal0262:amount,uMetalAtlas0262:{value:{}}};
 const restore=installPremiumMetalShader0262(material,uniforms,{role:"panel",mobile:false});
 const shader={vertexShader:"#include <common>",fragmentShader:fragment,uniforms:{}};
 material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uPremiumMetal0262,amount);
 assert.match(material.customProgramCacheKey(),/premium-titanium-0262-panel-high/);
 amount.value=0;assert.equal(shader.uniforms.uPremiumMetal0262.value,0);
 restore();assert.equal(material.onBeforeCompile,old);
 assert.equal(material.customProgramCacheKey,key);
});
test("game boot selects 0.26.2 without changing older pipeline or driving",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/premiumMetalEnabled=localReflectionsEnabled/);
 assert.match(game,/premiumMetalEnabled\?installPremiumMetalSurfaceLibrary/);
 assert.match(game,/localReflectionsEnabled\?installTrueLocalReflectionsPass1/);
 assert.match(game,/__skyshiftPremiumMetalProbe/);
 assert.match(game,/__skyshiftPremiumMetalFrameProof/);
 assert.match(game,/premiumMetal=classic/);
 assert.match(game,/createUnifiedTunnelLightingController/);
 assert.match(game,/createRoadSolarSpillController/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.[23]/);
 assert.match(read("./index.html"),/Cinematic Road Reflection Rebuild/);
});

test("packed atlas also defines the visible ORIGINAL solar-sealed graphite panels",()=>{
 const base=[
  "#include <common>",
  "varying float vRebirthTrack;varying vec2 vNeonLocalSection;",
  "float m25Cavity=0.0;",
  "float m25Wall=0.0;",
  "float m25Roof=0.0;",
  " m25Final=mix(d26OriginalMetal,d26Output,uDualTone0260);"
 ].join("\n");
 for(const role of ["panel","rib","shell","conduit"])
  for(const mobile of [false,true]){
   const r=patchPremiumSubstrateShader0262("#include <common>",base,{role,mobile});
   assert.match(r.fragmentShader,/uniform sampler2D uMetalAtlas0262/);
   assert.match(r.fragmentShader,/s262Gain=clamp/);
   assert.match(r.fragmentShader,/s262Face=1.0-clamp\(m25Cavity/);
   assert.match(r.fragmentShader,/s262Lit=clamp/);
   assert.match(r.fragmentShader,/m25Final=clamp\(m25Final\*s262Gain/);
   assert.doesNotMatch(r.fragmentShader,/new PointLight|sunlight|uDirectionalSun/);
  }
 assert.throws(()=>patchPremiumSubstrateShader0262("","#include <common>"));
});
