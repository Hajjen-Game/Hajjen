// SKYSHIFT 0.25.0 — major contrast rebuild, not a cosmetic cyan adjustment.
// Real previous shader chain tested for every tunnel role and mobile tier.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {patchPremiumMaterialShader} from "./premium-material-rebirth-v0220.mjs";
import {patchCinematicNeonShader} from "./cinematic-neon-lighting-v0220p2.mjs";
import {patchPhysicalMaterialShader} from "./physical-material-rebuild-v0230.mjs";
import {patchTrueMaterialDepthShader} from "./true-material-depth-v0231.mjs";
import {patchLightArchitectureShader} from "./cinematic-light-architecture-v0232.mjs";
import {patchUnifiedTunnelShader} from "./unified-tunnel-materials-v0233.mjs";
import {patchArchitecturalNeonShader} from "./architectural-neon-lighting-v0240.mjs";
import {patchPremiumSurfaceShader} from "./premium-surface-craftsmanship-v0241.mjs";
import {DARK_METALLIC_FOUNDATION_0250,patchDarkMetallicShader,installDarkMetalShader}
 from "./dark-metallic-foundation-v0250.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const vertex="#include <common>\nattribute float trackS;\nattribute float glowWeight;\n#include <begin_vertex>";
const fragment="#include <common>\n#include <color_fragment>\ndiffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;";
function compose(role="panel",mobile=false){
 const a=patchPremiumMaterialShader(vertex,fragment,{role,mobile});
 const b=patchCinematicNeonShader(a.vertexShader,a.fragmentShader,{mobile});
 const c=patchPhysicalMaterialShader(b.vertexShader,b.fragmentShader,{role,mobile});
 const d=role==="panel"||role==="conduit"?
  patchTrueMaterialDepthShader(c.vertexShader,c.fragmentShader,{role,mobile}):c;
 const e=(role==="panel"||(!mobile&&role==="conduit"))?
  patchLightArchitectureShader(d.vertexShader,d.fragmentShader,{role,mobile}):d;
 const f=patchUnifiedTunnelShader(e.vertexShader,e.fragmentShader,{role});
 const g=patchArchitecturalNeonShader(f.vertexShader,f.fragmentShader,{role,mobile});
 const previous=role==="panel"?
  patchPremiumSurfaceShader(g.vertexShader,g.fragmentShader,{mobile}):g;
 return {previous,rebuilt:patchDarkMetallicShader(
  previous.vertexShader,previous.fragmentShader,{role,mobile})};
}
test("all four FULL 0.24 metal shader chains transform to dark charcoal after old neon",()=>{
 for(const role of ["panel","conduit","shell","rib"]){
  for(const mobile of role==="conduit"?[false]:[false,true]){
   const {previous,rebuilt}=compose(role,mobile),f=rebuilt.fragmentShader;
   assert.equal(rebuilt.vertexShader,previous.vertexShader);
   assert.doesNotMatch(previous.fragmentShader,/uDarkMetal0250/);
   assert.match(f,/uniform float uDarkMetal0250/);
   assert.match(f,/vec3 m25Graphite=/);
   assert.match(f,/float m25Wall=pow\(clamp\(p23WallLight/);
   assert.match(f,/float m25Roof=pow\(clamp\(p23RoofLight/);
   assert.match(f,/float m25Portal=pow\(clamp\(cinemaArch/);
   assert.match(f,/float m25Amber=/);
   assert.match(f,/m25Graphite\+m25Spectral\+m25Warm/);
   assert.match(f,/diffuseColor.rgb=mix\(m25Original,m25Final,uDarkMetal0250\)/);
   assert.match(f,/vec3 rbTint=rebirthPalette\(\)/);
   assert.match(f,/diffuseColor.rgb \+= tunnelSpectrumTint\(\)\*vTunnelGlow/);
   assert.match(f,/float p23Gallery=mix\(/);
   assert.match(f,/uArchitecturalNeon024/);
   assert.ok(f.lastIndexOf("m25Graphite+m25Spectral+m25Warm")>
    f.lastIndexOf("diffuseColor.rgb+=a24Bounce;"));
   if(role==="panel")
    assert.ok(f.lastIndexOf("m25Graphite+m25Spectral+m25Warm")>
     f.lastIndexOf("diffuseColor.rgb+=uSurfaceCraft0241*s41Color*s41Satin;"));
   assert.doesNotMatch(f,/uniform DirectionalLight|sunPosition|texture2D\(/);
  }
 }
});
test("A/B zero recovers exact 0.24.2 shader and retains original compiled class",()=>{
 assert.throws(()=>patchDarkMetallicShader(vertex,fragment));
 assert.throws(()=>patchDarkMetallicShader(vertex,fragment,{role:"ship"}));
 const old=compose("panel",false).previous;
 const material={isMeshBasicMaterial:true,onBeforeCompile(){},
  customProgramCacheKey(){return "pre";},needsUpdate:false};
 const uniform={uDarkMetal0250:{value:1}};
 installDarkMetalShader(material,uniform,{role:"panel",mobile:false});
 const shader={vertexShader:old.vertexShader,fragmentShader:old.fragmentShader,uniforms:{}};
 material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uDarkMetal0250,uniform.uDarkMetal0250);
 assert.match(material.customProgramCacheKey(),/dark-metal-foundation-0250-panel-high/);
 assert.equal(material.needsUpdate,true);
 uniform.uDarkMetal0250.value=0;
 assert.equal(shader.uniforms.uDarkMetal0250.value,0);
});
test("this pass only changes tunnel metal pixels and 20 static amber practicals",()=>{
 const a=DARK_METALLIC_FOUNDATION_0250;
 assert.equal(a.fullTunnelMeters,368);
 assert.equal(a.metalRoleCountHigh,4);
 assert.equal(a.metalRoleCountMobile,3);
 assert.equal(a.addedDynamicLights,0);
 assert.equal(a.addedDrawCalls,1);
 for(const k of ["addedTextures","addedRenderPasses","addedColliders"])assert.equal(a[k],0);
 for(const k of ["changesRoad","changesShip","changesRails","changesCamera",
  "changesGrip","changesPhysics","changesZoneWave","changesExteriorSolarSeal"])
  assert.equal(a[k],false);
 assert.equal(a.preservesNativeEmission,true);
 const src=read("./dark-metallic-foundation-v0250.mjs");
 assert.match(src,/for\(const portal of TUNNEL_PORTALS_0211\)/);
 assert.match(src,/tunnelProfilePoint0211\(8,portal/);
 assert.match(src,/group.add\(practical.mesh\)/);
 assert.match(src,/const emitter=group\?\.children/);
 assert.match(src,/practical.mesh.visible=amount.value>0.001/);
 assert.doesNotMatch(src,/new THREE\.PointLight|new THREE\.DirectionalLight/);
});
test("0.25.0 game integration and exact before/after same-frame check",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/darkMetalEnabled=surfaceCraftEnabled/);
 assert.match(game,/darkMetalEnabled\?installDarkMetallicFoundation/);
 assert.match(game,/__skyshiftDarkMetalProbe/);
 assert.match(game,/__skyshiftDarkMetalFrameProof/);
 assert.match(game,/compareBeforeDarkMetal:"\?darkMetal=classic"/);
 assert.match(game,/cinematicRoadEnabled\?[\s\S]*createCinematicRoadReflectionController/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.25\.0/);
 assert.match(read("./index.html"),/SKYSHIFT.*0\.25\.0/);
});
