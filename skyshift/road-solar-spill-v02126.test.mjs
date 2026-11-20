// SKYSHIFT 0.21.2.6 — road-only PBR light-source isolation.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ROAD_SOLAR_SPILL_02126,roadSolarTunnelMask,
 patchRoadSolarSpillShader,createRoadSolarSpillController}
 from "./road-solar-spill-v02126.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const shader=()=>({
 uniforms:{},
 fragmentShader:"#include <common>\nvarying vec2 vTrackCoord;\n"+
  "float whiteCore=0.0,whiteBloom=0.0;\n"+
  "#include <lights_fragment_end>\n"+
  "reflectedLight.directDiffuse *= .78;\n"+
  "totalEmissiveRadiance += whiteCore;"
});
test("containment occupies only the first 368 metres with a smooth exit",()=>{
 assert.equal(roadSolarTunnelMask(-10),0);
 for(const s of [0,90,165,273,340])assert.equal(roadSolarTunnelMask(s),1);
 assert.ok(roadSolarTunnelMask(350)<1&&roadSolarTunnelMask(350)>0);
 assert.ok(roadSolarTunnelMask(362)<roadSolarTunnelMask(350));
 for(const s of [368,370,900])assert.equal(roadSolarTunnelMask(s),0);
 assert.equal(roadSolarTunnelMask(NaN),0);
});
test("only reflected PBR light changes; wave and emission remain intact",()=>{
 const original=shader().fragmentShader;
 const changed=patchRoadSolarSpillShader(original);
 assert.match(changed,/uniform float uRoadSolarSpillSeal/);
 assert.match(changed,/smoothstep\(340\.0,368\.0,vTrackCoord\.x\)/);
 assert.match(changed,/reflectedLight\.directDiffuse \*= mix\(1\.0,0\.08/);
 assert.match(changed,/reflectedLight\.indirectDiffuse \*= mix\(1\.0,0\.20/);
 assert.match(changed,/reflectedLight\.directSpecular \*= mix\(1\.0,0\.08/);
 assert.match(changed,/reflectedLight\.indirectSpecular \*= mix\(1\.0,0\.14/);
 assert.match(changed,/float whiteCore=0\.0/);
 assert.match(changed,/totalEmissiveRadiance \+= whiteCore/);
 assert.match(changed,/reflectedLight\.directDiffuse \*= \.78/);
 assert.equal((changed.match(/#include <lights_fragment_end>/g)||[]).length,1);
 assert.doesNotMatch(changed,/gl_FragColor\.rgb\s*\*=/);
 assert.throws(()=>patchRoadSolarSpillShader("#include <common>"));
});
test("same-frame A/B toggles only the existing road material without recompiling",()=>{
 const mat={isMeshStandardMaterial:true,onBeforeCompile(){},
  customProgramCacheKey(){return "premium"},needsUpdate:false};
 const ctrl=createRoadSolarSpillController(mat);
 assert.equal(ctrl.stats().seal,1);
 assert.match(mat.customProgramCacheKey(),/road-solar-spill-02126/);
 const s=shader();
 mat.onBeforeCompile(s,{});
 assert.equal(s.uniforms.uRoadSolarSpillSeal.value,1);
 const fixedKey=mat.customProgramCacheKey();
 ctrl.setComparison(0);
 assert.equal(s.uniforms.uRoadSolarSpillSeal.value,0);
 ctrl.setComparison(1);
 assert.equal(mat.customProgramCacheKey(),fixedKey);
 assert.equal(s.uniforms.uRoadSolarSpillSeal.value,1);
 assert.throws(()=>createRoadSolarSpillController({
  ...mat,isMeshStandardMaterial:false}));
});
test("game wiring preserves 0.21.2.5 ship, 0.21.2.4 rails and physics",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/roadSolarEnabled=whiteCoreEnabled/);
 assert.match(game,/get\("roadSolar"\)!=="classic"/);
 assert.match(game,/createRoadSolarSpillController\(premiumSurface\.material\)/);
 assert.match(game,/__skyshiftRoadSolarFrameProof/);
 assert.match(game,/shipWhiteSpill\?\.update/);
 assert.match(game,/setRailBodyContainment/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.24\.0/);
 assert.match(read("./index.html"),/0\.24\.0/);
 for(const k of ["extraDrawCalls","extraLights","extraRenderPasses"])
  assert.equal(ROAD_SOLAR_SPILL_02126[k],0);
 assert.equal(ROAD_SOLAR_SPILL_02126.gripChanged,false);
});
