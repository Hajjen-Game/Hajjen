import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TRUE_METAL_0260_P2,patchTrueMetalPBRShader,
 installTrueMetalPBRShader,buildTrueMetalSources} from "../../rendering/true-metal-materials-v0260p2.mjs";
import {TUNNEL_PORTALS_0211} from "../../tunnel/tunnel-megastructure-v0211.mjs";
import {sharedPhysicalPreset0280} from "../../tunnel/shared-tunnel-architecture-v0280.mjs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const vertex="#include <common>\n#include <project_vertex>\n#include <worldpos_vertex>";
const fragment="#include <common>\n#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>\n#include <lights_physical_fragment>\n#include <lights_fragment_begin>";
test("genuine MeshPhysicalMaterial GGX receives two REAL localized lights, no global sun",()=>{
 const meta=TRUE_METAL_0260_P2;
 assert.equal(meta.pass,2);assert.equal(meta.version,"0.26.0");
 assert.equal(meta.realMetal,true);assert.equal(meta.retainsBaseShader,true);
 assert.equal(meta.changesSolarSeal,false);
 const old=read("./rendering/true-metal-materials-v0260p2.mjs");
 assert.match(old,/new THREE.MeshPhysicalMaterial\(/);
 // Source of truth moved from two copied literal fields to one shared
 // Skyline/Vault PBR preset; assert the actual values rather than text.
 assert.match(old,/sharedPhysicalPreset0280\(role,mobile,"skyline"\)/);
 const source=sharedPhysicalPreset0280("panel",false,"skyline");
 const vault=sharedPhysicalPreset0280("panel",false,"vault");
 assert.equal(source.metalness,.89);assert.equal(source.roughness,.36);
 assert.deepEqual(source,vault);
 const rib=sharedPhysicalPreset0280("rib",false,"skyline");
 assert.equal(rib.metalness,.83);assert.equal(rib.roughness,.30);
 assert.match(old,/RE_Direct\(pbrFixture0260/);
 assert.doesNotMatch(old,/new THREE\.PointLight|new THREE\.DirectionalLight/);
 for(const role of ["panel","rib"])
  for(const mobile of [false,true]){
   const patched=patchTrueMetalPBRShader(vertex,fragment,{role,mobile});
   assert.match(patched.vertexShader,/pbrColdPosition0260/);
   assert.match(patched.vertexShader,/pbrWarmPosition0260/);
   assert.match(patched.fragmentShader,/roughnessFactor=clamp/);
   assert.match(patched.fragmentShader,/metalnessFactor=clamp/);
   assert.match(patched.fragmentShader,/pbrColdFalloff0260/);
   assert.match(patched.fragmentShader,/pbrWarmFalloff0260/);
   assert.equal((patched.fragmentShader.match(/RE_Direct\(pbrFixture0260/g)||[]).length,2);
   assert.doesNotMatch(patched.fragmentShader,/#include <lights_fragment_begin>/);
   assert.match(patched.fragmentShader,/#include <lights_physical_fragment>/);
  }
 assert.throws(()=>patchTrueMetalPBRShader(vertex,fragment,{role:"ship"}));
 assert.throws(()=>patchTrueMetalPBRShader(vertex,"#include <common>"));
});
test("physical source positions follow REAL banked track and actual portal stations",()=>{
 const n=6;
 const s=[38,43,81,160,240,361], x=[-24,-23,24,0,20,-19],
       y=[16,22,26,27,14,12];
 const geom={getAttribute(name){
  const data={trackS:s,position:Array.from({length:n},()=>0),
   neonLocalSection:null};
  if(name==="neonLocalSection")return {count:n,getX:i=>x[i],getY:i=>y[i]};
  return data[name]&&{count:n,getX:i=>data[name][i]};
 }};
 const pos=(s,x,y)=>({x:x+s*.01,y:y+s*.003,z:s});
 const r=buildTrueMetalSources(geom,pos);
 assert.equal(r.vertices,n);
 assert.equal(r.cold.length,n*3);assert.equal(r.warm.length,n*3);
 assert.ok(r.portalSources>=3&&r.portalSources<=TUNNEL_PORTALS_0211.length*2);
 assert.ok(r.cold.every(Number.isFinite)&&r.warm.every(Number.isFinite));
 // Color and emitter coordinates remain static in WORLD, not in the camera.
 assert.notEqual(r.cold[0],r.cold[3]);
 assert.throws(()=>buildTrueMetalSources({},pos));
});
test("installed native physical shader exports a separate cache key and A/B uniform",()=>{
 const mat={isMeshPhysicalMaterial:true,onBeforeCompile(){},
  customProgramCacheKey(){return "three-physical";},needsUpdate:false};
 const controls={uTrueMetal0260P2:{value:1}};
 installTrueMetalPBRShader(mat,controls,{role:"panel",mobile:false});
 const shader={vertexShader:vertex,fragmentShader:fragment,uniforms:{}};
 mat.onBeforeCompile(shader,{});
 assert.equal(mat.needsUpdate,true);
 assert.equal(shader.uniforms.uTrueMetal0260P2,controls.uTrueMetal0260P2);
 assert.match(mat.customProgramCacheKey(),/true-metal-pbr-0260-p2-panel-high/);
 controls.uTrueMetal0260P2.value=0;
 assert.equal(shader.uniforms.uTrueMetal0260P2.value,0);
 assert.throws(()=>installTrueMetalPBRShader({isMeshBasicMaterial:true},controls));
});
test("boot, A/B controls and flight safeguards keep the complete original P1",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/trueMetalEnabled=dualToneEnabled/);
 assert.match(game,/trueMetalEnabled\?installTrueMetalMaterialsPass2/);
 assert.match(game,/dualToneEnabled\?installDualToneLightingPass1/);
 assert.match(game,/__skyshiftTrueMetalProbe/);
 assert.match(game,/__skyshiftTrueMetalFrameProof/);
 assert.match(game,/const classic=capture\(0\),physical=capture\(1\)/);
 assert.match(game,/compareBeforeTrueMetal:"\?trueMetal=classic"/);
 assert.match(game,/roadSolarSeal:roadSolarSpill/);
 assert.match(read("./rendering/dual-tone-lighting-v0260.mjs"),/installMicroSurfaceMetalDefinition/);
 const profile=TRUE_METAL_0260_P2;
 for(const key of ["addsDynamicLights","addsTextures","addsPostprocessPasses",
  "addsColliders"])assert.equal(profile[key],0);
 for(const key of ["changesRoad","changesShip","changesPhysics","changesGRIP",
  "changesCamera","changesNativeNeon","changesSolarSeal"])
  assert.equal(profile[key],false);
});
