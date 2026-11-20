// SKYSHIFT 0.23.2 Pass 2: preserve native neon while adding real local glints.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {patchPremiumMaterialShader}
 from "./premium-material-rebirth-v0220.mjs";
import {patchCinematicNeonShader}
 from "./cinematic-neon-lighting-v0220p2.mjs";
import {patchPhysicalMaterialShader}
 from "./physical-material-rebuild-v0230.mjs";
import {patchTrueMaterialDepthShader}
 from "./true-material-depth-v0231.mjs";
import {LIGHT_ARCHITECTURE_0232,patchLightArchitectureShader,
 installLightArchitectureShader}
 from "./cinematic-light-architecture-v0232.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const v="#include <common>\nattribute float trackS;\nattribute float glowWeight;\n#include <begin_vertex>";
const f="#include <common>\n#include <color_fragment>\ndiffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;";
function compose(role="panel",mobile=false){
 const p1=patchPremiumMaterialShader(v,f,{role,mobile});
 const p2=patchCinematicNeonShader(p1.vertexShader,p1.fragmentShader,{mobile});
 const p23=patchPhysicalMaterialShader(p2.vertexShader,p2.fragmentShader,{role,mobile});
 const p31=patchTrueMaterialDepthShader(p23.vertexShader,p23.fragmentShader,{role,mobile});
 return {previous:p31,updated:patchLightArchitectureShader(
  p31.vertexShader,p31.fragmentShader,{role,mobile})};
}
test("shaders for panel/conduit compose only after exact sun-sealed metal stack",()=>{
 for(const role of ["panel","conduit"]){
  for(const mobile of [true,false]){
   const {previous,updated}=compose(role,mobile);
   const frag=updated.fragmentShader;
   assert.equal(updated.vertexShader,previous.vertexShader);
   assert.match(frag,/uniform float uLightArchitecture0232/);
   assert.match(frag,/vec3 c32Before=diffuseColor.rgb/);
   assert.match(frag,/diffuseColor.rgb=c32Before\+c32Strength\*c32Contribution/);
   assert.match(frag,/float c32Gallery=smoothstep\(88\.0,110\.0,vRebirthTrack\)/);
   assert.match(frag,/vec3 c32Palette=clamp\(rbTint/);
   assert.match(frag,/c32PortalBoost/);
   assert.match(frag,/c32Recess/);
   assert.doesNotMatch(frag,/DirectionalLight|sunPosition|reflectedLight\.directSpecular/);
   assert.doesNotMatch(frag,/vec3 c32Before=vec3\(/);
   assert.ok(frag.indexOf("float c32Gallery=")>
    frag.indexOf("diffuseColor.rgb=mix(d31Original,d31Out,d31Strength)"));
   assert.match(frag,/\(c32Spec\+c32Edge\+c32PortalBoost\)\*\s+0\.(64|95)\);/);
   if(mobile){
    assert.doesNotMatch(frag,/vec3 c32N=normalize/);
    assert.doesNotMatch(frag,/c32WallSpec=pow/);
   }else{
    assert.match(frag,/vec3 c32N=normalize\(vRebirthNormal\)/);
    assert.match(frag,/normalize\(c32V\+p23Lw\)/);
    assert.match(frag,/normalize\(c32V\+p23Lr\)/);
   }
  }
 }
});
test("reject unsupported roles and missing shader dependencies",()=>{
 assert.throws(()=>patchLightArchitectureShader(v,f));
 assert.throws(()=>patchLightArchitectureShader(v,f,{role:"shell"}));
 assert.throws(()=>patchLightArchitectureShader(v,f,{role:"rib"}));
 const {updated}=compose();
 assert.match(updated.fragmentShader,/uLightArchitecture0232/);
});
test("uniform toggles new reflections without replacing base emissive shader",()=>{
 const {previous}=compose("panel",false);
 const originalMaterial={isMeshBasicMaterial:true,
  onBeforeCompile(){},customProgramCacheKey(){return "old";}};
 const control={uLightArchitecture0232:{value:1}};
 installLightArchitectureShader(originalMaterial,control,{role:"panel",mobile:false});
 const shader={vertexShader:previous.vertexShader,
  fragmentShader:previous.fragmentShader,uniforms:{}};
 originalMaterial.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uLightArchitecture0232,control.uLightArchitecture0232);
 assert.match(shader.fragmentShader,/diffuseColor.rgb=c32Before\+c32Strength\*c32Contribution/);
 assert.match(originalMaterial.customProgramCacheKey(),/light-architecture-0232-panel-high/);
 assert.equal(originalMaterial.needsUpdate,true);
 control.uLightArchitecture0232.value=0;
 assert.equal(shader.uniforms.uLightArchitecture0232.value,0);
});
test("all native neon systems and flight mechanics remain protected",()=>{
 const data=LIGHT_ARCHITECTURE_0232;
 assert.deepEqual(data.targetMeshes,["HARDSURFACE_PANELS","STRUCTURAL_CONDUITS"]);
 assert.deepEqual(data.untouched,["CLOSED_SHELL","CURVED_RIBS","ROAD","SHIP"]);
 for(const key of ["extraLights","extraDrawCalls","extraMeshes",
   "additionalTextures","additionalRenderPasses"])
  assert.equal(data[key],0);
 for(const key of ["changesGeometry","changesPhysics","changesGRIP",
   "changesCamera","changesRoad","changesShip"])assert.equal(data[key],false);
 assert.equal(data.preservesNativeNeon,true);
 assert.equal(data.preservesRoadSolarSeal,true);
 const source=read("./cinematic-light-architecture-v0232.mjs");
 assert.match(source,/targets=Object.entries\(roleMap\)/);
 assert.match(source,/lightArchitecture0232Untouched:\["shell","rib","road","ship"\]/);
 assert.match(source,/if\(!baseStats.trueDepth0231Enabled/);
});
test("game and release distinguish pass-2 and old 0.23.1.1 for A/B",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/lightArchitectureEnabled=trueMaterialDepthEnabled/);
 assert.match(game,/installCinematicLightArchitecture/);
 assert.match(game,/__skyshiftLightArchitectureProbe/);
 assert.match(game,/__skyshiftLightArchitectureFrameProof/);
 assert.match(game,/compareBeforeLightArchitecture:"\?lightArchitecture=classic"/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.\d+/);
 assert.match(read("./index.html"),/0\.26\.\d+/);
});
