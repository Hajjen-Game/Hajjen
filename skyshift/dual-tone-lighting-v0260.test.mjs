// SKYSHIFT 0.26.0 Pass 1: independent chromatic lights over dark metal.
// Full shader chain from 0.22 through 0.25.1; original world physics untouched.
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
import {patchMicroSurfaceMetalShader} from "./micro-surface-metal-definition-v0251.mjs";
import {DUAL_TONE_LIGHTING_0260,patchDualToneMetalShader,
 installDualToneMetalShader} from "./dual-tone-lighting-v0260.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const vertex="#include <common>\nattribute float trackS;\nattribute float glowWeight;\n#include <begin_vertex>";
const fragment="#include <common>\n#include <color_fragment>\ndiffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;";
function fullChain(role="panel",mobile=false){
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
 const i=patchDarkMetallicShader(h.vertexShader,h.fragmentShader,{role,mobile});
 const old=patchMicroSurfaceMetalShader(i.vertexShader,i.fragmentShader,{role,mobile});
 const dual=patchDualToneMetalShader(old.vertexShader,old.fragmentShader,{role,mobile});
 return {old,dual};
}
test("all sun-isolated original metal roles support mixed light without replacing PBR",()=>{
 for(const role of ["panel","conduit","shell","rib"])
  for(const mobile of role==="conduit"?[false]:[false,true]){
   const {old,dual}=fullChain(role,mobile);
   const s=dual.fragmentShader;
   assert.equal(dual.vertexShader,old.vertexShader);
   assert.doesNotMatch(old.fragmentShader,/uDualTone0260/);
   assert.equal(s.match(/uniform float uDualTone0260;/g)?.length,1);
   for(const match of [/vec3 d26Graphite=/,/vec3 d26Zone=/,
    /float d26ColdSource=/,/vec3 d26Ice=vec3\(0\.050,0\.69,0\.88\)/,
    /vec3 d26Amber=vec3\(0\.91,0\.32,0\.075\)/,
    /d26UpperCove=/,/d26WarmSource=/,
    /m25Final=mix\(d26OriginalMetal,d26Output,uDualTone0260\)/,
    /diffuseColor.rgb=mix\(m25Original,m25Final,uDarkMetal0250\)/,
    /vec3 m51Crafted=/,/diffuseColor.rgb \+= tunnelSpectrumTint\(\)\*vTunnelGlow/])
     assert.match(s,match);
   assert.ok(s.indexOf("m25Final=mix(d26OriginalMetal")>
    s.indexOf("m25Final=mix(m25Final,m51Crafted"));
   assert.ok(s.indexOf("m25Final=mix(d26OriginalMetal")<
    s.indexOf("diffuseColor.rgb=mix(m25Original,m25Final"));
   assert.doesNotMatch(s,/uniform DirectionalLight|sunPosition|raytrace026|texture2D\(/);
  }
});
test("A/B uniform zero leaves EXACT previous 0.25.1 material shader output",()=>{
 assert.throws(()=>patchDualToneMetalShader(vertex,fragment));
 assert.throws(()=>patchDualToneMetalShader(vertex,fragment,{role:"ship"}));
 const old=fullChain().old;
 const material={isMeshBasicMaterial:true,onBeforeCompile(){},
  customProgramCacheKey(){return "prior-0251";},needsUpdate:false};
 const uniforms={uDualTone0260:{value:1}};
 installDualToneMetalShader(material,uniforms,{role:"panel",mobile:false});
 const shader={vertexShader:old.vertexShader,fragmentShader:old.fragmentShader,uniforms:{}};
 material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uDualTone0260,uniforms.uDualTone0260);
 assert.equal(material.needsUpdate,true);
 assert.match(material.customProgramCacheKey(),/dual-tone-lighting-0260-p1-panel-high/);
 uniforms.uDualTone0260.value=0;
 assert.equal(shader.uniforms.uDualTone0260.value,0);
 assert.match(shader.fragmentShader,/if\(uDualTone0260>0\.0001\)/);
 assert.equal((shader.fragmentShader.match(/uniform float uMicroMetal0251/g)||[]).length,1);
});
test("no paid assets, no new dynamic light, no physics/PBR phase 2 changes",()=>{
 const a=DUAL_TONE_LIGHTING_0260;
 assert.equal(a.version,"0.26.0");
 assert.equal(a.pass,1);
 assert.equal(a.base,"0.25.1");
 assert.equal(a.comparison,"?dualTone=classic");
 assert.equal(a.sourceDrawCalls,1);
 for(const p of ["sourceLights","newTextures","newRenderPasses","newColliders",
  "independentAnimationClocks"])assert.equal(a[p],0);
 for(const p of ["changesPhysics","changesGrip","changesCamera",
  "changesShip","changesRoad","changesRails","changesNativeNeon",
  "changesSolarSeal","changesBloom","changesExposure"])
  assert.equal(a[p],false);
 assert.equal(a.keepsMetalMicroDetail,true);
 const src=read("./dual-tone-lighting-v0260.mjs");
 assert.match(src,/for\(const portal of TUNNEL_PORTALS_0211\)/);
 assert.match(src,/tunnelProfilePoint0211\(lower\?8:10,s,vaultHeightClassic\)/);
 assert.match(src,/tunnelProfilePoint0211\(lower\?9:11,s,vaultHeightClassic\)/);
 assert.match(src,/color:0xffffff,vertexColors:true,side:THREE.DoubleSide/);
 assert.match(src,/const nativeEmitter=group\?\.children/);
 assert.match(src,/const amber=new THREE.Color\(0xffa35d\)/);
 assert.match(src,/warmStrips\+\+/);
 assert.match(src,/coves\.mesh\.visible=amount\.value>0\.001/);
 assert.doesNotMatch(src,/new THREE\.PointLight|new THREE\.DirectionalLight/);
});
test("0.26.0 pass 1 boot, same-frame A/B and all previous passes remain wired",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/dualToneEnabled=microMetalEnabled/);
 assert.match(game,/dualToneEnabled\?installDualToneLightingPass1/);
 assert.match(game,/__skyshiftDualToneProbe/);
 assert.match(game,/__skyshiftDualToneFrameProof/);
 assert.match(game,/compareBeforeDualTone:"\?dualTone=classic"/);
 assert.match(game,/dual=capture\(1\)/);
 assert.match(game,/const roadMask=directRoadMask\(\)/);
 assert.match(game,/darkMetalEnabled\?installDarkMetallicFoundation/);
 assert.match(game,/microMetalEnabled\?installMicroSurfaceMetalDefinition/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.[012]/);
 assert.match(read("./index.html"),/SKYSHIFT.*0\.26\.[012]/);
});
