// SKYSHIFT 0.24.0 — architectural neon must compose onto 0.23.3,
// preserve original native emissive, and never alter flight/solar materials.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {patchPremiumMaterialShader} from "./premium-material-rebirth-v0220.mjs";
import {patchCinematicNeonShader} from "./cinematic-neon-lighting-v0220p2.mjs";
import {patchPhysicalMaterialShader} from "./physical-material-rebuild-v0230.mjs";
import {patchTrueMaterialDepthShader} from "./true-material-depth-v0231.mjs";
import {patchLightArchitectureShader} from "./cinematic-light-architecture-v0232.mjs";
import {patchUnifiedTunnelShader} from "./unified-tunnel-materials-v0233.mjs";
import {ARCHITECTURAL_NEON_0240,patchArchitecturalNeonShader,
 installArchitecturalNeonShader} from "./architectural-neon-lighting-v0240.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const v="#include <common>\nattribute float trackS;\nattribute float glowWeight;\n#include <begin_vertex>";
const f="#include <common>\n#include <color_fragment>\ndiffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;";
const compose=(role="panel",mobile=false)=>{
 const a=patchPremiumMaterialShader(v,f,{role,mobile});
 const b=patchCinematicNeonShader(a.vertexShader,a.fragmentShader,{mobile});
 const c=patchPhysicalMaterialShader(b.vertexShader,b.fragmentShader,{role,mobile});
 const d=(role==="panel"||role==="conduit")?
  patchTrueMaterialDepthShader(c.vertexShader,c.fragmentShader,{role,mobile}):c;
 const e=(role==="panel"||(!mobile&&role==="conduit"))?
  patchLightArchitectureShader(d.vertexShader,d.fragmentShader,{role,mobile}):d;
 const g=patchUnifiedTunnelShader(e.vertexShader,e.fragmentShader,{role});
 return {original:g,newLighting:patchArchitecturalNeonShader(
  g.vertexShader,g.fragmentShader,{role,mobile})};
};
test("0.24.0 composes real banked neon across panel, conduit, shell and ribs",()=>{
 for(const role of ["panel","conduit","shell","rib"]){
  for(const mobile of (role==="conduit"?[false]:[false,true])){
   const {original,newLighting}=compose(role,mobile);
   const x=newLighting.fragmentShader;
   assert.equal(newLighting.vertexShader,original.vertexShader);
   assert.match(x,/uniform float uArchitecturalNeon024/);
   assert.match(x,/float a24WallCove=/);
   assert.match(x,/float a24RoofCove=/);
   assert.match(x,/float a24Collar=a24Portal/);
   assert.match(x,/float a24MetalGlint=/);
   assert.match(x,/a24Tint=clamp\(rbTint/);
   assert.match(x,/diffuseColor.rgb\+=a24Bounce/);
   assert.match(x,/uUnifiedExtent0233/);
   assert.match(x,/float p23WallLight=/);
   assert.match(x,/float p23RoofLight=/);
   assert.match(x,/float cinemaArch=/);
   assert.match(x,/tunnelSpectrumTint\(\)\*vTunnelGlow/);
   assert.doesNotMatch(x,/uniform DirectionalLight|sunPosition|whiteCore024|vec3\(1\.0,1\.0,1\.0\)\*a24/);
   assert.ok(x.lastIndexOf("diffuseColor.rgb+=a24Bounce;")>
    x.lastIndexOf(role==="panel"||role==="conduit"?
     "diffuseColor.rgb=c32Before+c32Strength*c32Contribution;":
     "diffuseColor.rgb=mix(p23Original, mix(p23Result,max(p23Original,p23Result),uUnifiedExtent0233), p23Mix);"));
  }
 }
});
test("4GB uses the original varyings with lower luminous response",()=>{
 const hi=compose("panel",false).newLighting;
 const mobile=compose("panel",true).newLighting;
 assert.equal(hi.vertexShader.includes("attribute vec3 physicalRight023;"),true);
 assert.equal(mobile.vertexShader.includes("attribute vec3 physicalRight023;"),false);
 assert.match(hi.fragmentShader,/a24MetalGlint\)\*1\.0\)/);
 assert.match(mobile.fragmentShader,/a24MetalGlint\)\*\.65\)/);
 assert.match(mobile.fragmentShader,/smoothstep\(15\.0,22\.0,a24X\)/);
});
test("shader rejects unsupported targets, preserves material override and exact-frame toggle",()=>{
 assert.throws(()=>patchArchitecturalNeonShader(v,f));
 assert.throws(()=>patchArchitecturalNeonShader(v,f,{role:"ship"}));
 const old=compose("panel").original;
 const material={isMeshBasicMaterial:true,onBeforeCompile(){},
  customProgramCacheKey(){return "previous";},needsUpdate:false};
 const uniforms={uArchitecturalNeon024:{value:1}};
 installArchitecturalNeonShader(material,uniforms,{role:"panel",mobile:false});
 const shader={vertexShader:old.vertexShader,fragmentShader:old.fragmentShader,uniforms:{}};
 material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uArchitecturalNeon024,uniforms.uArchitecturalNeon024);
 assert.match(shader.fragmentShader,/diffuseColor.rgb\+=a24Bounce;/);
 assert.match(material.customProgramCacheKey(),/architectural-neon-0240-panel-high/);
 assert.equal(material.needsUpdate,true);
 uniforms.uArchitecturalNeon024.value=0;
 assert.equal(shader.uniforms.uArchitecturalNeon024.value,0);
});
test("zero geometry/light budget, original GRIP, flight, road, solar and wave",()=>{
 const p=ARCHITECTURAL_NEON_0240;
 for(const key of ["newMeshes","newLights","newDrawCalls","newTextures","newRenderPasses"])
  assert.equal(p[key],0);
 for(const key of ["geometryChanged","roadChanged","shipChanged","railsChanged",
  "physicsChanged","gripChanged","cameraChanged"])assert.equal(p[key],false);
 for(const key of ["exteriorSolarSealed","preservesNativeNeon","nativeWaveSynchronized"])
  assert.equal(p[key],true);
 assert.equal(p.fullTunnelMeters,368);
 assert.equal(p.comparison,"?architecturalNeon=classic");
});
test("game, build labels and exact-frame WebGL hooks are 0.24.0",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/architecturalNeonEnabled=unifiedTunnelEnabled/);
 assert.match(game,/architecturalNeonEnabled\?installArchitecturalNeonLighting/);
 assert.match(game,/__skyshiftArchitecturalNeonProbe/);
 assert.match(game,/__skyshiftArchitecturalNeonFrameProof/);
 assert.match(game,/compareBeforeArchitecturalNeon:"\?architecturalNeon=classic"/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.24\.2/);
 assert.match(read("./index.html"),/SKYSHIFT.*0\.24\.2/);
});
