// SKYSHIFT 0.23.1 — real relief and distinct metal finish regressions.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildStructuralTunnelData}
 from "../../structural-tunnel-v0213.mjs";
import {patchPremiumMaterialShader} from "../../premium-material-rebirth-v0220.mjs";
import {patchCinematicNeonShader} from "../../cinematic-neon-lighting-v0220p2.mjs";
import {patchPhysicalMaterialShader} from "../../physical-material-rebuild-v0230.mjs";
import {TRUE_MATERIAL_0231,patchTrueMaterialDepthShader,
 buildTrueDepthGeometry,installTrueMaterialShader}
 from "../../true-material-depth-v0231.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const oldVertex="#include <common>\nattribute float trackS;\nattribute float glowWeight;\n#include <begin_vertex>";
const oldFragment="#include <common>\n#include <color_fragment>\ndiffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;";
const compose=(role,mobile=false)=>{
 const p1=patchPremiumMaterialShader(oldVertex,oldFragment,{role,mobile});
 const p2=patchCinematicNeonShader(p1.vertexShader,p1.fragmentShader,{mobile});
 const p23=patchPhysicalMaterialShader(p2.vertexShader,p2.fragmentShader,{role,mobile});
 return patchTrueMaterialDepthShader(p23.vertexShader,p23.fragmentShader,{role,mobile});
};
test("material glints are additive to existing native neon, not a new flat wall color",()=>{
 for(const role of ["panel","shell","rib","conduit"]){
  const shader=compose(role);
  const f=shader.fragmentShader;
  assert.match(f,/uniform float uTrueDepth0231/);
  assert.match(f,/vec3 d31Original=diffuseColor.rgb/);
  assert.match(f,/vec3 d31Out=d31Original/);
  assert.match(f,/d31Out\+=d31Raised\+d31Engraving\*d31Milled/);
  assert.match(f,/d31Chrome=rbTint/);
  assert.match(f,/diffuseColor.rgb=mix\(d31Original,d31Out,d31Strength\)/);
  assert.doesNotMatch(f,/vec3 d31FaceColor=|vec3 d31EdgeColor=|vec3 d31Dark=vec3/);
  assert.match(f,/float d31Near=max\(p23WallLight,p23RoofLight\)/);
  assert.match(f,/uTrueDepth0231\*p23Gallery/);
  assert.doesNotMatch(f,/DirectionalLight|sunPosition|reflectedLight\.directSpecular/);
  assert.equal(shader.vertexShader,patchPhysicalMaterialShader(
   patchCinematicNeonShader(
    patchPremiumMaterialShader(oldVertex,oldFragment,{role}).vertexShader,
    patchPremiumMaterialShader(oldVertex,oldFragment,{role}).fragmentShader
   ).vertexShader,
   patchCinematicNeonShader(
    patchPremiumMaterialShader(oldVertex,oldFragment,{role}).vertexShader,
    patchPremiumMaterialShader(oldVertex,oldFragment,{role}).fragmentShader
   ).fragmentShader,{role}
  ).vertexShader);
 }
});
test("mobile shader needs no new attributes or world light",()=>{
 const f=compose("panel",true).fragmentShader;
 assert.match(f,/d31Detail/);
 assert.match(f,/d31Chrome/);
 assert.doesNotMatch(f,/uniform DirectionalLight/);
 assert.match(f,/d31Chrome=rbTint/);
});
test("real raised plate creates extra cross-sectional triangles only in study area",()=>{
 const at=(s,x,y)=>({x:s,y,z:x});
 const baseline=buildStructuralTunnelData(at,{flowCohesion:true});
 const sculpted=buildStructuralTunnelData(at,{flowCohesion:true,depthStudy:true});
 assert.equal(baseline.plateCount,sculpted.plateCount);
 assert.ok(sculpted.totalTriangles>baseline.totalTriangles+300);
 assert.equal(sculpted.geometryBatches,baseline.geometryBatches);
 assert.ok(sculpted.depthStudy);
 const changed=new Set();
 const oldSegments=new Set();
 for(let i=0;i<sculpted.primary.trackS.length;i++){
  const s=sculpted.primary.trackS[i];
  if(s>120&&s<260)changed.add(Math.round(s));
  if(s<60)oldSegments.add(Math.round(s));
 }
 assert.ok(changed.size>30);
 assert.ok(oldSegments.size>10);
 // All geometry still went through the original road/roof clearance guard.
 assert.ok(sculpted.primary.positions.every(Number.isFinite));
 const low=buildStructuralTunnelData(at,{flowCohesion:true,depthStudy:true,lowMemory:true});
 const lowClassic=buildStructuralTunnelData(at,{flowCohesion:true,lowMemory:true});
 assert.equal(low.totalTriangles,lowClassic.totalTriangles);
 assert.equal(low.depthStudy,false);
});
test("new BufferGeometry carries original color, glow, track and banked light fields",()=>{
 const THREE={
  Float32BufferAttribute:class {
   constructor(v,size){this.array=Float32Array.from(v);this.itemSize=size;this.count=v.length/size}
   getX(i){return this.array[i*this.itemSize]}
   getY(i){return this.array[i*this.itemSize+1]}
   getZ(i){return this.array[i*this.itemSize+2]}
  },
  BufferGeometry:class {
   constructor(){this.attrs={}}
   setAttribute(k,a){this.attrs[k]=a;return this}
   getAttribute(k){return this.attrs[k]}
   computeVertexNormals(){}
   computeBoundingSphere(){}
  }
 };
 const at=(s,x,y)=>({x:s,y,z:x});
 const out=buildTrueDepthGeometry(THREE,at);
 const g=out.geometry;
 assert.ok(out.triangles>3000);
 assert.ok(out.vertices>10000);
 assert.ok(out.bankedFrames>50);
 for(const attr of ["position","color","trackS","glowWeight",
  "neonLocalSection","physicalRight023","physicalUp023"])
  assert.equal(g.getAttribute(attr).count,out.vertices,attr);
 assert.equal(g.getAttribute("neonLocalSection").itemSize,2);
 assert.equal(g.getAttribute("physicalRight023").itemSize,3);
 assert.equal(g.getAttribute("physicalUp023").itemSize,3);
});
test("shader composition and comparison modify uniform, not physical simulation",()=>{
 const f=compose("panel");
 const mat={
  isMeshBasicMaterial:true,onBeforeCompile(shader){},
  customProgramCacheKey(){return "original";},needsUpdate:false
 };
 const uni={uTrueDepth0231:{value:1}};
 installTrueMaterialShader(mat,uni,{role:"panel"});
 const shader={uniforms:{},vertexShader:f.vertexShader,fragmentShader:
  f.fragmentShader.replace("uniform float uTrueDepth0231;","")
   .replace(/float d31Strength=[\s\S]*?diffuseColor.rgb=mix\(d31Original,d31Out,d31Strength\);\n}/,"")};
 // On a live renderer the previous hooks compose Pass 1/2/0.23.0 first.
 mat.onBeforeCompile(shader,{});
 assert.ok(mat.needsUpdate);
 assert.equal(shader.uniforms.uTrueDepth0231,uni.uTrueDepth0231);
 uni.uTrueDepth0231.value=0;
 assert.equal(shader.uniforms.uTrueDepth0231.value,0);
 assert.match(mat.customProgramCacheKey(),/true-depth-0231-panel-high/);
 const p=TRUE_MATERIAL_0231;
 for(const key of ["newMeshes","addedDrawBatches","newLights","newTextures",
  "newColliders","newRenderPasses"])assert.equal(p[key],0);
 for(const key of ["solarSealed","physicsUnchanged","cameraUnchanged",
  "gripUnchanged","roadUnchanged","shipUnchanged"])assert.equal(p[key],true);
});

test("sealed vault and ribs remain on original 0.23.0 shader",()=>{
 const source=read("./true-material-depth-v0231.mjs");
 assert.match(source,/meshes\.filter\(\(\{role\}\)=>role==="panel"\|\|role==="conduit"\)/);
 assert.match(source,/trueDepth0231PreservedNativeNeon:true/);
 assert.match(source,/trueDepth0231UntouchedRoles:\["shell","rib"\]/);
 assert.doesNotMatch(source,/d31FaceColor|d31EdgeColor|d31CutColor/);
 assert.match(source,/version:"0\.23\.1\.1"/);
 const structural=read("./structural-tunnel-v0213.mjs");
 assert.match(structural,/const relief=\(s\)=>unifiedDepth\?1:smooth/);
 assert.match(structural,/shaped\(x,d0\)/);
});
test("game exposes real pass, version, and exact frame comparison",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/trueMaterialDepthEnabled=physicalMaterialEnabled/);
 assert.match(game,/installTrueMaterialDepthRebuild/);
 assert.match(game,/__skyshiftTrueDepthProbe/);
 assert.match(game,/__skyshiftTrueDepthFrameProof/);
 assert.match(game,/compareBeforeTrueDepth:"\?trueDepth=classic"/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.\d+/);
 assert.match(read("./index.html"),/0\.26\.\d+/);
});
