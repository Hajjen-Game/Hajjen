import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 LOCAL_REFLECTIONS_0261,nearestFixtureMask0261,
 buildLocalStripFrame0261,patchLocalStripReflectionShader0261,
 installLocalStripShader0261
} from "../../rendering/local-reflections-v0261p1.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const vertex="#include <common>\n#include <project_vertex>\n#include <worldpos_vertex>\nvarying vec3 vPbrCold0260;varying vec3 vPbrWarm0260;";
const fragment="#include <common>\nvarying vec3 vPbrCold0260;\nvarying vec3 vPbrWarm0260;\n"+
 "vec3 geometryPosition=-vViewPosition;\nRE_Direct(pbrFixture0260,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);\n"+
 "#include <lights_fragment_maps>";
test("finite GGX lights reuse physical P2 but do not reintroduce solar, environment, SSR or lights",()=>{
 const p=LOCAL_REFLECTIONS_0261;
 assert.equal(p.version,"0.26.1");assert.equal(p.pass,1);
 assert.equal(p.coldSpanMeters,12);assert.equal(p.warmSpanMeters,2.7);
 assert.equal(p.addedDrawCalls,0);assert.equal(p.addedLights,0);
 assert.equal(p.addedMaterials,0);assert.equal(p.addedTextures,0);
 assert.equal(p.addedReflectionProbes,0);assert.equal(p.addedPostprocessPasses,0);
 for(const key of ["changesRoad","changesRails","changesShip",
 "changesHandling","changesGRIP","changesCamera","changesNativeNeon",
 "changesSolarSeal"])assert.equal(p[key],false,key);
 const s=read("./rendering/local-reflections-v0261p1.mjs");
 assert.match(s,/installTrueMetalMaterialsPass2/);
 assert.match(s,/new THREE\.Float32BufferAttribute/);
 assert.doesNotMatch(s,/new THREE\.PointLight|new THREE\.RectAreaLight|new THREE\.DirectionalLight/);
 assert.doesNotMatch(s,/PMREMGenerator|new THREE\.WebGLRenderTarget/);
});
test("finite strip masks are authored only at real cyan/amber emitters",()=>{
 let cold=nearestFixtureMask0261(165),warm=nearestFixtureMask0261(159);
 assert.equal(cold[0],1);
 assert.equal(warm[1],1);
 const gap=nearestFixtureMask0261(35);
 assert.ok(gap[0]<cold[0]&&gap[0]>=0);
 assert.ok(gap[1]<warm[1]&&gap[1]>=0);
 for(const s of [0,40,156,165,198,320,367])
  for(const v of nearestFixtureMask0261(s))assert.ok(v>=0&&v<=1);
 assert.throws(()=>nearestFixtureMask0261(NaN));
});
test("world-space fixture axes follow the existing banked path, not the camera",()=>{
 const n=6;const s=[0,3,42,165,280,367];
 const sections=[-23,-21,22,24,-20,21];
 const attrs={trackS:{count:n,getX:i=>s[i]},
  position:{count:n},neonLocalSection:{count:n,getX:i=>sections[i]}};
 const geometry={getAttribute:key=>attrs[key]};
 const pos=(s,x,y)=>({x:x+s*.05,y:y+s*.012,z:s*1.3});
 const v=buildLocalStripFrame0261(geometry,pos);
 assert.equal(v.vertices,n);
 assert.equal(v.axis.length,3*n);assert.equal(v.masks.length,2*n);
 assert.ok(v.uniqueSamples>=n);
 assert.ok(v.axis.every(Number.isFinite)&&v.masks.every(Number.isFinite));
 for(let i=0;i<n;i++)
  assert.ok(Math.abs(Math.hypot(...v.axis.slice(3*i,3*i+3))-1)<1e-5);
 assert.throws(()=>buildLocalStripFrame0261({},pos));
});
test("physical strip integration uses native RE_Direct GGX with high and mobile variants",()=>{
 for(const role of ["panel","rib"])
  for(const mobile of [false,true]){
   const s=patchLocalStripReflectionShader0261(vertex,fragment,{role,mobile});
   assert.match(s.vertexShader,/localStripAxis0261/);
   assert.match(s.vertexShader,/localStripMasks0261/);
   assert.match(s.fragmentShader,/uLocalReflections0261/);
   assert.match(s.fragmentShader,/vPbrCold0260/);
   assert.match(s.fragmentShader,/vPbrWarm0260/);
   assert.match(s.fragmentShader,/#include <lights_fragment_maps>/);
   const n=(s.fragmentShader.match(/RE_Direct\(l261/g)||[]).length;
   assert.equal(n,mobile?3:5,role+"/"+mobile);
   assert.equal((s.fragmentShader.match(/\bIncidentLight l261Cool;/g)||[]).length,1);
   assert.equal((s.fragmentShader.match(/\bIncidentLight l261Warm;/g)||[]).length,1);
  }
 assert.throws(()=>patchLocalStripReflectionShader0261(vertex,fragment,{role:"ship"}));
 assert.throws(()=>patchLocalStripReflectionShader0261(vertex,"#include <common>"));
});
test("same shader program cache key, uniform-only A/B, clean restoration",()=>{
 const material={isMeshPhysicalMaterial:true,
  onBeforeCompile(){},customProgramCacheKey(){return "P2-GGX";},
  needsUpdate:false};
 const prior=material.onBeforeCompile,cache=material.customProgramCacheKey;
 const u={uLocalReflections0261:{value:1}};
 const restore=installLocalStripShader0261(material,u,{role:"panel",mobile:false});
 const shader={vertexShader:vertex,fragmentShader:fragment,uniforms:{}};
 material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uLocalReflections0261,u.uLocalReflections0261);
 assert.match(material.customProgramCacheKey(),/local-strip-reflections-0261-panel-high/);
 u.uLocalReflections0261.value=0;
 assert.equal(shader.uniforms.uLocalReflections0261.value,0);
 restore();assert.equal(material.onBeforeCompile,prior);
 assert.equal(material.customProgramCacheKey,cache);
 assert.throws(()=>installLocalStripShader0261({},u,{role:"panel"}));
});
test("game integration preserves 0.26.0 P2, Unified Lighting, real road and GRIP",()=>{
 const s=read("./game-v0210.mjs");
 assert.match(s,/localReflectionsEnabled=trueMetalEnabled/);
 assert.match(s,/localReflectionsEnabled\?installTrueLocalReflectionsPass1/);
 assert.match(s,/trueMetalEnabled\?installTrueMetalMaterialsPass2/);
 assert.match(s,/__skyshiftLocalReflectionsProbe/);
 assert.match(s,/__skyshiftLocalReflectionsFrameProof/);
 assert.match(s,/localReflections=classic/);
 assert.match(s,/createUnifiedTunnelLightingController/);
 assert.match(s,/createRoadSolarSpillController/);
 assert.match(s,/createShipWhiteSpillController/);
 assert.match(s,/nativeWave:Boolean\(premiumSurface\?\.setWaveState\)/);
});
