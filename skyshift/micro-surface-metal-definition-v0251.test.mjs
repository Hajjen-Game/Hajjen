// SKYSHIFT 0.25.1 — all 0.23–0.25 material stages, exact A/B,
// panel/conduit/shell/rib, 4GB and no gameplay/solar/road change.
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
import {patchDarkMetallicShader} from "./dark-metallic-foundation-v0250.mjs";
import {MICRO_SURFACE_METAL_0251,patchMicroSurfaceMetalShader,
 installMicroSurfaceShader} from "./micro-surface-metal-definition-v0251.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const vertex="#include <common>\nattribute float trackS;\nattribute float glowWeight;\n#include <begin_vertex>";
const fragment="#include <common>\n#include <color_fragment>\ndiffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;";
function compose(role="panel",mobile=false){
 const a=patchPremiumMaterialShader(vertex,fragment,{role,mobile});
 const b=patchCinematicNeonShader(a.vertexShader,a.fragmentShader,{mobile});
 const c=patchPhysicalMaterialShader(b.vertexShader,b.fragmentShader,{role,mobile});
 const d=role==="panel"||role==="conduit"?
  patchTrueMaterialDepthShader(c.vertexShader,c.fragmentShader,{role,mobile}):c;
 const e=role==="panel"||(!mobile&&role==="conduit")?
  patchLightArchitectureShader(d.vertexShader,d.fragmentShader,{role,mobile}):d;
 const f=patchUnifiedTunnelShader(e.vertexShader,e.fragmentShader,{role});
 const g=patchArchitecturalNeonShader(f.vertexShader,f.fragmentShader,{role,mobile});
 const h=role==="panel"?
  patchPremiumSurfaceShader(g.vertexShader,g.fragmentShader,{mobile}):g;
 const previous=patchDarkMetallicShader(h.vertexShader,h.fragmentShader,{role,mobile});
 return {previous,crafted:patchMicroSurfaceMetalShader(
  previous.vertexShader,previous.fragmentShader,{role,mobile})};
}
test("all high/4GB tunnel metals retain original composition, dark base, neon",()=>{
 for(const role of ["panel","conduit","shell","rib"]){
  for(const mobile of role==="conduit"?[false]:[false,true]){
   const {previous,crafted}=compose(role,mobile);
   assert.equal(crafted.vertexShader,previous.vertexShader);
   assert.doesNotMatch(previous.fragmentShader,/uMicroMetal0251/);
   const f=crafted.fragmentShader;
   assert.match(f,/uniform float uMicroMetal0251/);
   assert.match(f,/float m51Rough=clamp/);
   assert.match(f,/float m51Stria=sin/);
   assert.match(f,/float m51Facet=/);
   assert.match(f,/float m51Polish=/);
   assert.match(f,/float m51Cavity=/);
   assert.match(f,/vec3 m51Crafted=m51Body\+m25Spectral\+m25Warm/);
   assert.match(f,/m25Final=mix\(m25Final,m51Crafted,uMicroMetal0251\)/);
   assert.match(f,/diffuseColor.rgb=mix\(m25Original,m25Final,uDarkMetal0250\)/);
   assert.match(f,/diffuseColor.rgb \+= tunnelSpectrumTint\(\)\*vTunnelGlow/);
   assert.match(f,/uUnifiedExtent0233/);
   assert.ok(f.indexOf("m25Final=mix(m25Final,m51Crafted")>
    f.indexOf("vec3 m25Final=clamp(m25Graphite"));
   assert.ok(f.indexOf("m25Final=mix(m25Final,m51Crafted")<
    f.indexOf("diffuseColor.rgb=mix(m25Original,m25Final"));
   if(mobile)assert.doesNotMatch(f,/float m51Seed=fract/);
   else assert.match(f,/float m51Seed=fract/);
   assert.doesNotMatch(f,/uniform DirectionalLight|new PointLight|whiteCore0251/);
  }
 }
});
test("classic comparison preserves 0.25.0 metal output including emission",()=>{
 assert.throws(()=>patchMicroSurfaceMetalShader(vertex,fragment));
 assert.throws(()=>patchMicroSurfaceMetalShader(vertex,fragment,{role:"ship"}));
 const old=compose("panel").previous;
 const material={isMeshBasicMaterial:true,onBeforeCompile(){},
  customProgramCacheKey(){return "old";},needsUpdate:false};
 const uniforms={uMicroMetal0251:{value:1}};
 installMicroSurfaceShader(material,uniforms,{role:"panel",mobile:false});
 const shader={vertexShader:old.vertexShader,fragmentShader:old.fragmentShader,uniforms:{}};
 material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uMicroMetal0251,uniforms.uMicroMetal0251);
 assert.match(material.customProgramCacheKey(),/micro-surface-metal-0251-panel-high/);
 assert.equal(material.needsUpdate,true);
 uniforms.uMicroMetal0251.value=0;
 assert.equal(shader.uniforms.uMicroMetal0251.value,0);
 assert.match(shader.fragmentShader,/if\(uMicroMetal0251>0\.0001\)/);
});
test("no new render passes, geometry, lights, textures, road/ship/physics mutations",()=>{
 const spec=MICRO_SURFACE_METAL_0251;
 for(const key of ["additionalMeshes","additionalDrawCalls","additionalLights",
  "additionalTextures","additionalRenderPasses","additionalVertexAttributes"])
  assert.equal(spec[key],0);
 for(const key of ["changesGeometry","changesRoad","changesShip","changesRails",
  "changesCamera","changesPhysics","changesGrip","changesZoneWave",
  "changesSolarSeal"])assert.equal(spec[key],false);
 assert.equal(spec.keepsOriginalNeon,true);
 assert.equal(spec.keeps0250DarkGraphite,true);
 assert.equal(spec.comparison,"?microMetal=classic");
 const mod=read("./micro-surface-metal-definition-v0251.mjs");
 assert.match(mod,/installDarkMetallicFoundation\(THREE,world,options\)/);
 assert.match(mod,/mesh\?\.material\?\.isMeshBasicMaterial/);
 assert.match(mod,/m51Local\*m51Facet\*m51Near\*m51Face/);
});
test("game boots current 0.25.1; native 0.25.0 remains exact A/B",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/microMetalEnabled=darkMetalEnabled/);
 assert.match(game,/microMetalEnabled\?installMicroSurfaceMetalDefinition/);
 assert.match(game,/__skyshiftMicroMetalProbe/);
 assert.match(game,/__skyshiftMicroMetalFrameProof/);
 assert.match(game,/compareBeforeMicroMetal:"\?microMetal=classic"/);
 assert.match(game,/const roadMask=directRoadMask\(\)/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.[012345]/);
 assert.match(read("./index.html"),/SKYSHIFT.*0\.26\.[012345]/);
});
