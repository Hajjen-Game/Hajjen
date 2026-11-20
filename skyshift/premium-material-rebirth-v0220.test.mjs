// SKYSHIFT 0.22.0 — Pass 1: physically informed premium tunnel materials.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MATERIAL_REBIRTH_0220,patchPremiumMaterialShader,
 installPremiumMaterialShader,installPremiumMaterialRebirth}
 from "./premium-material-rebirth-v0220.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const basicV="#include <common>\nattribute float trackS;\n"+
 "attribute float glowWeight;\n#include <begin_vertex>\n";
const basicF="#include <common>\n#include <color_fragment>\n"+
 "diffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;\n";
const pbrV="#include <common>\n#include <begin_vertex>\n";
const pbrF="#include <common>\n#include <color_fragment>\n"+
 "#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>\n"+
 "#include <emissivemap_fragment>\n#include <lights_fragment_end>\n";
test("original mesh remains intact; actual normals, view and position author the finish",()=>{
 const r=patchPremiumMaterialShader(basicV,basicF,{role:"panel"});
 assert.match(r.vertexShader,/vRebirthPosition=\(modelMatrix\*vec4\(transformed,1\.0\)\)\.xyz/);
 assert.match(r.vertexShader,/vRebirthNormal=normalize\(mat3\(modelMatrix\)\*normal\)/);
 assert.match(r.vertexShader,/vRebirthTrack=trackS/);
 assert.match(r.vertexShader,/vRebirthClass=glowWeight/);
 assert.equal((r.vertexShader.match(/attribute float trackS;/g)||[]).length,1);
 assert.match(r.fragmentShader,/rbFacing=abs\(dot\(rbN,rbV\)\)/);
 assert.match(r.fragmentShader,/rbGraphite/);
 assert.match(r.fragmentShader,/rbSatin/);
 assert.match(r.fragmentShader,/rbBevel/);
 assert.match(r.fragmentShader,/rbCavity/);
 assert.match(r.fragmentShader,/rbGrain/);
 assert.match(r.fragmentShader,/mix\(rbOriginal,rbFinish,uRebirthMaterial\)/);
 assert.match(r.fragmentShader,/diffuseColor.rgb \+= tunnelSpectrumTint\(\)\*vTunnelGlow/);
 assert.doesNotMatch(r.fragmentShader,/reflectedLight\.directSpecular\*=mix/);
 assert.throws(()=>patchPremiumMaterialShader(basicV,basicF,{role:"bad"}));
});

test("0.21.2 native sun-isolated Basic shell and ribs accept 0.22.0 materials",()=>{
 const actual=read("./neon-interior-v0212.mjs");
 // These substitutions happen on every real sealed tunnel. The material
 // upgrade must NOT demand MeshStandardMaterial or reinstate exterior light.
 assert.match(actual,/shell\.material=bindTunnelSpectrumMaterial\(new THREE\.MeshBasicMaterial/);
 assert.match(actual,/ribs\.material=bindTunnelSpectrumMaterial\(new THREE\.MeshBasicMaterial/);
 for(const role of ["shell","rib"]){
  const upgraded=patchPremiumMaterialShader(basicV,basicF,{role});
  assert.match(upgraded.fragmentShader,/diffuseColor\.rgb \+= tunnelSpectrumTint\(\)\*vTunnelGlow/);
  assert.match(upgraded.fragmentShader,/rbGraphite/);
  assert.match(upgraded.fragmentShader,/rbSatin/);
  assert.match(upgraded.fragmentShader,/rbTint=rebirthPalette\(\)/);
  assert.match(upgraded.vertexShader,/vRebirthClass=0\.00/);
  assert.doesNotMatch(upgraded.fragmentShader,/reflectedLight\./);
  assert.doesNotMatch(upgraded.fragmentShader,/roughnessFactor=/);
  const mat={isMeshBasicMaterial:true,isMeshStandardMaterial:false,
   onBeforeCompile(){},customProgramCacheKey(){return "native-sealed-spectrum"},
   needsUpdate:false};
  installPremiumMaterialShader(mat,{uRebirthMaterial:{value:1}},{role});
  const shader={uniforms:{},vertexShader:basicV,fragmentShader:basicF};
  mat.onBeforeCompile(shader,{});
  assert.match(shader.fragmentShader,/rbFinish/);
  assert.ok(mat.needsUpdate);
 }
});

test("PBR original shell and ribs retain roughness/metalness but seal external sun",()=>{
 for(const role of ["shell","rib"]){
  const q=patchPremiumMaterialShader(pbrV,pbrF,{role});
  assert.match(q.vertexShader,/attribute float trackS/);
  assert.match(q.vertexShader,/vRebirthClass=0\.00/);
  assert.match(q.fragmentShader,/roughnessFactor=mix\(roughnessFactor,0\.57/);
  assert.match(q.fragmentShader,/metalnessFactor=mix\(metalnessFactor,0\./);
  assert.match(q.fragmentShader,/reflectedLight\.directDiffuse\*=mix\(1\.0,0\.13,uRebirthMaterial\)/);
  assert.match(q.fragmentShader,/reflectedLight\.directSpecular\*=mix\(1\.0,0\.025,uRebirthMaterial\)/);
  assert.match(q.fragmentShader,/totalEmissiveRadiance\+=uRebirthMaterial\*rbTint/);
  assert.match(q.fragmentShader,/uniform vec3 uRebirthOld/);
  assert.match(q.fragmentShader,/uRebirthActive\*feather/);
  assert.doesNotMatch(q.fragmentShader,/new THREE\.PointLight/);
 }
});
test("4GB tier reduces procedural detail without reducing material coverage",()=>{
 for(const role of ["panel","conduit","shell","rib"]){
  const v=role==="shell"||role==="rib"?pbrV:basicV;
  const f=role==="shell"||role==="rib"?pbrF:basicF;
  const high=patchPremiumMaterialShader(v,f,{role,mobile:false});
  const low=patchPremiumMaterialShader(v,f,{role,mobile:true});
  assert.ok(low.fragmentShader.includes("3.5+vRebirthPosition.y*1.25"));
  assert.ok(high.fragmentShader.includes("9.2+vRebirthPosition.y*3.1"));
  if(role==="shell"||role==="rib")
   assert.ok(low.fragmentShader.includes("roughnessFactor,0.69"));
  assert.ok(low.fragmentShader.length>500);
  assert.equal((low.fragmentShader.match(/uniform float uRebirthMaterial;/g)||[]).length,1);
 }
});
test("material A/B uses shared uniform and does not recompile on toggle",()=>{
 const base=()=>{};
 const mat={onBeforeCompile:base,customProgramCacheKey(){return "native-spectral"},
  needsUpdate:false};
 const u={uRebirthMaterial:{value:1}};
 installPremiumMaterialShader(mat,u,{role:"panel"});
 const shader={uniforms:{},vertexShader:basicV,fragmentShader:basicF};
 mat.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uRebirthMaterial,u.uRebirthMaterial);
 assert.match(mat.customProgramCacheKey(),/premium-metal-0220-panel-desktop/);
 assert.ok(mat.needsUpdate);
});
test("Pass 1 only changes tunnel material channels, never physics or PBR road",()=>{
 const c=MATERIAL_REBIRTH_0220;
 assert.deepEqual(c.targeted,[
  "HARDSURFACE_PANELS","STRUCTURAL_CONDUITS","CLOSED_SHELL","CURVED_RIBS"]);
 for(const k of ["newMeshes","addedDrawCalls","newTextures","newLights",
  "extraRenderPasses","additionalGeometry"])assert.equal(c[k],0);
 for(const k of ["physicsUnchanged","gripUnchanged","cameraUnchanged",
  "roadShaderUntouched","shipShaderUntouched","railShaderUntouched",
  "externalSunIsolated"])assert.equal(c[k],true);
 const game=read("./game-v0210.mjs");
 assert.match(game,/premiumMaterialRebirthEnabled=cinematicMotionEnabled/);
 assert.match(game,/get\("rebirthMaterial"\)!=="classic"/);
 assert.match(game,/installPremiumMaterialRebirth/);
 assert.match(game,/__skyshiftMaterialRebirthProbe/);
 assert.match(game,/__skyshiftMaterialRebirthFrameProof/);
 assert.match(game,/compareBeforePremiumMaterial:"\?rebirthMaterial=classic"/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.\d+/);
 assert.match(read("./index.html"),/0\.26\.\d+/);
});
test("each original shared batch receives one independent, cache-safe shader override",()=>{
 const targets=[
  {name:"HARDSURFACE_PANELS",role:"panel",standard:false},
  {name:"STRUCTURAL_CONDUITS",role:"conduit",standard:false},
  {name:"CLOSED_SHELL",role:"shell",standard:true},
  {name:"CURVED_RIBS",role:"rib",standard:true}
 ];
 const uniforms={uRebirthMaterial:{value:1}};
 const mats=targets.map(t=>({
  onBeforeCompile(){},customProgramCacheKey(){return "original";},
  needsUpdate:false,kind:t.name
 }));
 for(let i=0;i<mats.length;i++){
  const {role,standard}=targets[i];
  installPremiumMaterialShader(mats[i],uniforms,{role});
  const shader={uniforms:{},vertexShader:standard?pbrV:basicV,
   fragmentShader:standard?pbrF:basicF};
  mats[i].onBeforeCompile(shader,{});
  assert.equal(shader.uniforms.uRebirthMaterial,uniforms.uRebirthMaterial);
  assert.match(shader.fragmentShader,/rbFinish/);
  assert.ok(mats[i].needsUpdate);
  assert.match(mats[i].customProgramCacheKey(),new RegExp(role+"-desktop"));
 }
 assert.equal(new Set(mats.map(m=>m.customProgramCacheKey())).size,4);
 uniforms.uRebirthMaterial.value=0;
 assert.equal(mats.every(m=>m.needsUpdate),true);
 uniforms.uRebirthMaterial.value=1;
});
