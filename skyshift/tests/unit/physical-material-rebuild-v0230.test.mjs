// SKYSHIFT 0.23.0 P1 — metallic light response and solar-seal regressions.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PHYSICAL_MATERIAL_0230,buildPhysicalMaterialFrames,
 patchPhysicalMaterialShader,installPhysicalMaterialShader}
 from "../../physical-material-rebuild-v0230.mjs";
import {patchPremiumMaterialShader}
 from "../../premium-material-rebirth-v0220.mjs";
import {patchCinematicNeonShader}
 from "../../cinematic-neon-lighting-v0220p2.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const vs="#include <common>\nattribute float trackS;\nattribute float glowWeight;\n#include <begin_vertex>";
const fs="#include <common>\n#include <color_fragment>\ndiffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;";
function compose(role,mobile=false){
 const a=patchPremiumMaterialShader(vs,fs,{role,mobile});
 const b=patchCinematicNeonShader(a.vertexShader,a.fragmentShader,{mobile});
 return patchPhysicalMaterialShader(b.vertexShader,b.fragmentShader,{role,mobile});
}
test("GGX metal composes AFTER the actual original sun-sealed neon/materials",()=>{
 for(const role of ["panel","conduit","shell","rib"]){
  const shader=compose(role);
  assert.match(shader.fragmentShader,/physicalGGX023/);
  assert.match(shader.fragmentShader,/p23WallOffset/);
  assert.match(shader.fragmentShader,/p23RoofOffset/);
  assert.match(shader.fragmentShader,/p23Rough=clamp/);
  assert.match(shader.fragmentShader,/p23Cavity=rbCavity/);
  assert.match(shader.fragmentShader,/p23Gallery=smoothstep\(78\.0,98\.0,vRebirthTrack\)/);
  assert.match(shader.fragmentShader,/diffuseColor\.rgb=mix\(p23Original,p23Result,p23Mix\)/);
  assert.ok(shader.fragmentShader.indexOf("p23Original=diffuseColor.rgb")>
   shader.fragmentShader.indexOf("diffuseColor.rgb+=uCinematicNeonMix"));
  assert.match(shader.vertexShader,/attribute vec3 physicalRight023/);
  assert.match(shader.vertexShader,/attribute vec3 physicalUp023/);
  assert.doesNotMatch(shader.fragmentShader,/reflectedLight\.directSpecular|sunPosition/);
 }
});
test("4GB material still changes the metal but never allocates new attributes",()=>{
 const shader=compose("panel",true);
 assert.doesNotMatch(shader.vertexShader,/physicalRight023/);
 assert.doesNotMatch(shader.vertexShader,/physicalUp023/);
 assert.doesNotMatch(shader.fragmentShader,/vPhysicalRight023/);
 assert.match(shader.fragmentShader,/p23Spec=\(0\.08\*p23WallLight/);
 assert.match(shader.fragmentShader,/p23Gallery/);
});
test("source bank frame is orthogonal and follows true track space",()=>{
 const at=(s,x,y)=>({x:s*.8+x*.60-y*.70,
  y:x*.80+y*.525,z:s*.6+x*.04+y*.49});
 const points=[[84,0,25],[84,25,18],[165,18,27],[165,-24,12],[284,0,29]];
 const vertices=[],arc=[];
 for(const [s,x,y] of points){
  const p=at(s,x,y);vertices.push(p.x,p.y,p.z);arc.push(s);
 }
 const geom={getAttribute(name){
  if(name==="trackS")return {count:arc.length,getX:i=>arc[i]};
  if(name==="position")return {count:arc.length,
   getX:i=>vertices[i*3],getY:i=>vertices[i*3+1],
   getZ:i=>vertices[i*3+2]};
 }};
 const result=buildPhysicalMaterialFrames(geom,at);
 assert.equal(result.vertices,5);
 assert.equal(result.frames,3);
 for(let i=0;i<5;i++){
  const r=Array.from(result.right.slice(i*3,i*3+3));
  const u=Array.from(result.up.slice(i*3,i*3+3));
  assert.ok(Math.abs(Math.hypot(...r)-1)<.001);
  assert.ok(Math.abs(Math.hypot(...u)-1)<.001);
  assert.ok(Math.abs(r.reduce((sum,v,j)=>sum+v*u[j],0))<.001);
 }
 assert.throws(()=>buildPhysicalMaterialFrames(geom,()=>({x:0,y:0,z:0})));
});
test("A/B uses shared uniform without replacing base mesh/material",()=>{
 const shaderBefore=patchPremiumMaterialShader(vs,fs,{role:"panel"});
 const shaderBase=patchCinematicNeonShader(shaderBefore.vertexShader,shaderBefore.fragmentShader);
 const uniform={uPhysical023:{value:1}};
 const mat={onBeforeCompile(){},customProgramCacheKey(){return "original";}};
 installPhysicalMaterialShader(mat,uniform,{role:"panel"});
 const shader={uniforms:{},vertexShader:shaderBase.vertexShader,
  fragmentShader:shaderBase.fragmentShader};
 mat.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uPhysical023,uniform.uPhysical023);
 assert.match(mat.customProgramCacheKey(),/physical0230-panel-full/);
 uniform.uPhysical023.value=0;
 assert.equal(shader.uniforms.uPhysical023.value,0);
});
test("reference bay preserves sun seal, lane and controls; game mounts new version",()=>{
 const profile=PHYSICAL_MATERIAL_0230;
 assert.equal(profile.referenceStart,78);
 assert.equal(profile.referenceEnd,304);
 for(const key of ["newMeshes","newDrawCalls","newLights","newRenderPasses",
  "newTextures","newColliders"])assert.equal(profile[key],0);
 for(const key of ["physicsUnchanged","gripUnchanged","cameraUnchanged",
  "shipShaderUnchanged","roadShaderUnchanged","preserveSolarIsolation"])
  assert.equal(profile[key],true);
 const game=read("./game-v0210.mjs");
 assert.match(game,/physicalMaterialEnabled=cinematicNeonEnabled/);
 assert.match(game,/installPhysicalMaterialRebuild/);
 assert.match(game,/__skyshiftPhysicalMaterialProbe/);
 assert.match(game,/__skyshiftPhysicalMaterialFrameProof/);
 assert.match(game,/compareBeforePhysicalMaterial:"\?physicalMaterial=classic"/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.\d+/);
 assert.match(read("./index.html"),/0\.26\.\d+/);
});
