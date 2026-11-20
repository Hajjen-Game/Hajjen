// SKYSHIFT 0.24.1 — proof of real machined faceting and solar-safe finish.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildStructuralTunnelData} from "./structural-tunnel-v0213.mjs";
import {patchPremiumMaterialShader} from "./premium-material-rebirth-v0220.mjs";
import {patchCinematicNeonShader} from "./cinematic-neon-lighting-v0220p2.mjs";
import {patchPhysicalMaterialShader} from "./physical-material-rebuild-v0230.mjs";
import {patchTrueMaterialDepthShader} from "./true-material-depth-v0231.mjs";
import {patchLightArchitectureShader} from "./cinematic-light-architecture-v0232.mjs";
import {patchUnifiedTunnelShader} from "./unified-tunnel-materials-v0233.mjs";
import {patchArchitecturalNeonShader} from "./architectural-neon-lighting-v0240.mjs";
import {PREMIUM_SURFACE_0241,patchPremiumSurfaceShader,installPremiumSurfaceShader}
 from "./premium-surface-craftsmanship-v0241.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const vertex="#include <common>\nattribute float trackS;\nattribute float glowWeight;\n#include <begin_vertex>";
const fragment="#include <common>\n#include <color_fragment>\ndiffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;";
function compose(mobile=false){
 const a=patchPremiumMaterialShader(vertex,fragment,{role:"panel",mobile});
 const b=patchCinematicNeonShader(a.vertexShader,a.fragmentShader,{mobile});
 const c=patchPhysicalMaterialShader(b.vertexShader,b.fragmentShader,{role:"panel",mobile});
 const d=patchTrueMaterialDepthShader(c.vertexShader,c.fragmentShader,{role:"panel",mobile});
 const e=patchLightArchitectureShader(d.vertexShader,d.fragmentShader,{role:"panel",mobile});
 const f=patchUnifiedTunnelShader(e.vertexShader,e.fragmentShader,{role:"panel"});
 const previous=patchArchitecturalNeonShader(f.vertexShader,f.fragmentShader,
  {role:"panel",mobile});
 return {previous,crafted:patchPremiumSurfaceShader(
  previous.vertexShader,previous.fragmentShader,{mobile})};
}
test("real 0.24.1 metal shader is additive and after all existing 0.24.0 lighting",()=>{
 for(const mobile of [true,false]){
  const {previous,crafted}=compose(mobile),f=crafted.fragmentShader;
  assert.equal(crafted.vertexShader,previous.vertexShader);
  assert.doesNotMatch(previous.fragmentShader,/uSurfaceCraft0241/);
  assert.match(f,/uniform float uSurfaceCraft0241/);
  assert.match(f,/float s41Face=clamp\(d31Face/);
  assert.match(f,/float s41Edge=clamp\(d31EdgeMask/);
  assert.match(f,/float s41Brush=0\.5\+0\.5\*sin/);
  assert.match(f,/float s41Detail=1\.0-smoothstep\(18\.0,70\.0,p23Distance\)/);
  assert.match(f,/float s41Cavity=clamp\(d31Recess/);
  assert.match(f,/vec3 s41Color=clamp\(rbTint/);
  assert.match(f,/diffuseColor.rgb\+=uSurfaceCraft0241\*s41Color\*s41Satin/);
  assert.ok(f.indexOf("diffuseColor.rgb+=uSurfaceCraft0241")>
   f.indexOf("diffuseColor.rgb+=a24Bounce;"));
  assert.match(f,/tunnelSpectrumTint\(\)\*vTunnelGlow/);
  assert.doesNotMatch(f,/sunPosition|uniform DirectionalLight|whiteCore0241/);
  if(mobile)assert.match(f,/s41Satin=min\(0\.055,s41Satin\)\*1\.15/);
  else assert.match(f,/s41Satin=min\(0\.055,s41Satin\)\*1\.0/);
 }
});
test("new surface pass can be disabled without removing the 0.24.0 shader",()=>{
 const old=compose(false).previous;
 assert.throws(()=>patchPremiumSurfaceShader(vertex,fragment));
 const m={isMeshBasicMaterial:true,onBeforeCompile(){},
  customProgramCacheKey(){return "pre";},needsUpdate:false};
 const uniform={uSurfaceCraft0241:{value:1}};
 installPremiumSurfaceShader(m,uniform,{mobile:false});
 const shader={vertexShader:old.vertexShader,fragmentShader:old.fragmentShader,uniforms:{}};
 m.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uSurfaceCraft0241,uniform.uSurfaceCraft0241);
 assert.match(m.customProgramCacheKey(),/premium-surface-0241-high/);
 uniform.uSurfaceCraft0241.value=0;
 assert.equal(shader.uniforms.uSurfaceCraft0241.value,0);
});
test("real sculpted high-profile facets remain portal-safe, mobile geometry unchanged",()=>{
 const at=(s,x,y)=>({x:s,y,z:x});
 const options={flowCohesion:true,depthStudy:true,unifiedDepth:true};
 const old=buildStructuralTunnelData(at,options);
 const fresh=buildStructuralTunnelData(at,{...options,surfaceCraftsmanship:true});
 assert.equal(old.craftsmanshipGeometry,false);
 assert.equal(fresh.craftsmanshipGeometry,true);
 assert.equal(fresh.plateCount,old.plateCount);
 assert.equal(fresh.secondaryArchCount,old.secondaryArchCount);
 assert.equal(fresh.geometryBatches,old.geometryBatches);
 assert.ok(fresh.totalTriangles>old.totalTriangles*1.15);
 assert.ok(fresh.totalTriangles<old.totalTriangles*2.2);
 assert.ok(fresh.primary.positions.every(Number.isFinite));
 assert.ok(fresh.primary.glowWeight.includes(0));
 assert.ok(fresh.primary.glowWeight.includes(.008));
 for(const [lo,hi] of [[12,50],[118,260],[316,353]])
  assert.ok(fresh.primary.trackS.filter(s=>s>lo&&s<hi).length>200);
 const oldMobile=buildStructuralTunnelData(at,{...options,lowMemory:true});
 const craftMobile=buildStructuralTunnelData(at,{...options,
  lowMemory:true,surfaceCraftsmanship:true});
 assert.equal(craftMobile.craftsmanshipGeometry,false);
 assert.equal(craftMobile.totalTriangles,oldMobile.totalTriangles);
 assert.deepEqual(craftMobile.primary.positions,oldMobile.primary.positions);
 assert.equal(craftMobile.geometryBatches,1);
 assert.equal(craftMobile.detail.triangles,0);
});
test("pass is constrained to tunnel; existing physics, wave and solar seal remain",()=>{
 const d=PREMIUM_SURFACE_0241;
 assert.equal(d.fullTunnelStart,0);
 assert.equal(d.fullTunnelEnd,368);
 assert.equal(d.baseVersion,"0.24.0");
 for(const name of ["additionalMeshes","additionalDrawCalls","additionalLights",
  "additionalTextures","additionalRenderPasses","newColliders"])
  assert.equal(d[name],0);
 for(const name of ["changesPhysics","changesGRIP","changesCamera",
  "changesRoad","changesShip","changesRails","changesZoneWave","changesSolarSeal"])
  assert.equal(d[name],false);
 assert.equal(d.preservesNativeNeon,true);
 const module=read("./premium-surface-craftsmanship-v0241.mjs");
 assert.match(module,/if\(!lowMemory\)\{/);
 assert.match(module,/buildTrueDepthGeometry\(THREE,options\.positionAt/);
 assert.match(module,/!newGeometry\.getAttribute\("physicalRight023"\)/);
 assert.match(module,/surfaceCraft0241NewDrawCalls:0/);
});
test("0.24.1 boot, original 0.24.0 A/B, and audit probe are wired",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/surfaceCraftEnabled=architecturalNeonEnabled/);
 assert.match(game,/surfaceCraftEnabled\?installPremiumSurfaceCraftsmanship/);
 assert.match(game,/__skyshiftSurfaceCraftProbe/);
 assert.match(game,/__skyshiftSurfaceCraftFrameProof/);
 assert.match(game,/compareBeforeSurfaceCraft:"\?surfaceCraft=classic"/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.\d+/);
 assert.match(read("./index.html"),/SKYSHIFT.*0\.26\.\d+/);
});
