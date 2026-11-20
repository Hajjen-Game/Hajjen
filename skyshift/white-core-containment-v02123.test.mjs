// SKYSHIFT 0.21.2.3 — white-source containment vs previous fog-only fix.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {WHITE_CORE_02123,whiteCoreTunnelMask,patchRoadWhiteCore,
 createWhiteCoreContainment} from "./white-core-containment-v02123.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const shader=()=>({
 uniforms:{},
 vertexShader:"#include <common>\n#include <begin_vertex>",
 fragmentShader:"varying vec2 vTrackCoord;\n#include <common>\n"+
  "float whiteCore=0.0,whiteBloom=0.0;\n#include <lights_fragment_end>\n#include <opaque_fragment>"
});
const material=(pbr=true)=>({
 isMeshStandardMaterial:pbr,
 onBeforeCompile(){},customProgramCacheKey(){return "original-standard"},
 needsUpdate:false
});
test("only the first 368m lose neutral specular; fade exits smoothly",()=>{
 assert.equal(whiteCoreTunnelMask(-1),0);
 assert.equal(whiteCoreTunnelMask(0),1);
 assert.equal(whiteCoreTunnelMask(90),1);
 assert.equal(whiteCoreTunnelMask(178),1);
 assert.equal(whiteCoreTunnelMask(273),1);
 assert.equal(whiteCoreTunnelMask(333),1);
 assert.ok(whiteCoreTunnelMask(355)<1&&whiteCoreTunnelMask(355)>0);
 assert.equal(whiteCoreTunnelMask(368),0);
 assert.equal(whiteCoreTunnelMask(100,false),0);
 assert.equal(whiteCoreTunnelMask(NaN),0);
});
test("PBR road white specular reduced across FULL deck before HDR bloom",()=>{
 const m=patchRoadWhiteCore(material());
 const s=shader();m.onBeforeCompile(s,{});
 assert.match(s.fragmentShader,/reflectedLight\.directSpecular\*=mix\(1\.0,0\.14/);
 assert.match(s.fragmentShader,/reflectedLight\.indirectSpecular\*=mix\(1\.0,0\.38/);
 assert.match(s.fragmentShader,/reflectedLight\.directDiffuse\*=mix\(1\.0,0\.78/);
 assert.match(s.fragmentShader,/vTrackCoord\.x/);
 assert.match(s.fragmentShader,/wcNeutral/);
 assert.match(s.fragmentShader,/wcKeepCrest/);
 assert.match(s.fragmentShader,/whiteCore/);
 assert.match(s.fragmentShader,/coreContainRoad\*wcNeutral/);
 assert.doesNotMatch(s.fragmentShader,/abs\(vTrackCoord\.y\)/);
 assert.match(m.customProgramCacheKey(),/white-core-containment-02123/);
 assert.ok(m.needsUpdate);
});
test("ship reflection attenuated without modifying engine, emissive materials or grip",()=>{
 const hull=material(),fins=material(),engine=material(false);
 const ship={traverse(fn){
  for(const item of [
   {material:hull},{material:[fins,engine]},{material:hull}])fn(item);
 }};
 let railScale=0,whiteRail=0;
 const rail={setTunnelGlareScale(v){railScale=v},
  getTunnelGlareScale(){return railScale},
  setRailNeutralContainment(v){whiteRail=v},
  getRailNeutralContainment(){return whiteRail}};
 const controller=createWhiteCoreContainment({roadMaterial:material(),ship,railSurface:rail});
 const st=controller.stats();
 assert.equal(st.shipPbrMaterials,2);
 assert.equal(railScale,.34);
 assert.equal(whiteRail,1);
 assert.equal(st.railWhiteContainment,1);
 assert.equal(controller.update(178,true),1);
 const s=shader();hull.onBeforeCompile(s,{});
 assert.equal(s.uniforms.uWhiteCoreShipContainment.value,1);
 assert.match(s.fragmentShader,/uniform float uWhiteCoreShipContainment/);
 assert.match(s.fragmentShader,/reflectedLight\.directSpecular/);
 assert.match(s.fragmentShader,/reflectedLight\.indirectSpecular/);
 assert.match(s.fragmentShader,/reflectedLight\.directDiffuse/);
 const unchanged=shader();engine.onBeforeCompile(unchanged,{});
 assert.doesNotMatch(unchanged.fragmentShader,/uWhiteCoreShipContainment/);
 assert.equal(controller.update(700,true),0);
 assert.equal(s.uniforms.uWhiteCoreShipContainment.value,0);
 assert.equal(controller.update(200,false),0);
 assert.equal(WHITE_CORE_02123.worldLightChanges,0);
 assert.equal(WHITE_CORE_02123.globalBloomUnchanged,true);
 assert.equal(WHITE_CORE_02123.geometryChanged,false);
 assert.equal(WHITE_CORE_02123.gripChanged,false);
});
test("fleet swap and async hero PBR materials join same shared containment",()=>{
 const a=material(),b=material(),c=material();
 const one={traverse(fn){fn({material:a})}},two={traverse(fn){fn({material:[b,c]})}};
 const controller=createWhiteCoreContainment({roadMaterial:material(),ship:one});
 assert.equal(controller.stats().shipPbrMaterials,1);
 assert.equal(controller.attachShip(two),2);
 assert.equal(controller.attachShip(two),0);
 assert.equal(controller.stats().shipPbrMaterials,3);
 controller.update(234,true);
 for(const m of [a,b,c]){
  const s=shader();m.onBeforeCompile(s,{});
  assert.equal(s.uniforms.uWhiteCoreShipContainment.value,1);
 }
});
test("A/B preserves the old 0.21.2.2 and native palette wave",()=>{
 const g=read("./game-v0210.mjs");
 assert.match(g,/whiteCoreEnabled=exteriorSealEnabled/);
 assert.match(g,/whiteCore"\)!=="classic"/);
 assert.match(g,/whiteCoreEnabled\?createWhiteCoreContainment/);
 assert.match(g,/compareBeforeWhiteCore:"\?whiteCore=classic"/);
 assert.match(g,/whiteCoreContainment\?\.update\(view\.s/);
 assert.match(g,/whiteCoreContainment\?\.attachShip\(ship\)/);
 assert.match(g,/0\.22\.0\.2/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.[0123]/);
 assert.equal(WHITE_CORE_02123.addedPostprocessPasses,0);
 assert.equal(WHITE_CORE_02123.cameraChanged,false);
 assert.equal(WHITE_CORE_02123.steeringChanged,false);
});
