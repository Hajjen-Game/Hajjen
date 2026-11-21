import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SHIP_WHITE_SPILL_02125,createShipWhiteSpillController,
 patchShipWhiteSpillShader} from "./ship-white-spill-v02125.mjs";
const src=p=>readFileSync(new URL(p,import.meta.url),"utf8");
class Color{
 constructor(hex){this.hex=hex;this.isColor=true;this.r=.45;this.g=.55;this.b=.61}
 copy(c){this.hex=c.hex;this.r=c.r;this.g=c.g;this.b=c.b;return this}
 getHex(){return this.hex}
}
class Root{
 constructor(nodes){this.nodes=nodes}
 traverse(f){this.nodes.forEach(f)}
}
function mat(bright=true,type="physical"){
 return {
  color:bright?{r:.62,g:.65,b:.76}:{r:.02,g:.03,b:.05},
  isMeshPhysicalMaterial:type==="physical",
  isMeshStandardMaterial:type==="standard"||type==="physical",
  type:type==="physical"?"MeshPhysicalMaterial":"MeshStandardMaterial",
  clearcoat:type==="physical"?.72:undefined,
  roughness:.3,metalness:.72,needsUpdate:false,
  onBeforeCompile(){},customProgramCacheKey(){return "original"}
 };
}
function unitShader(){
 return {
  uniforms:{},
  fragmentShader:"#include <common>\n"+
   "#include <lights_physical_fragment>\n#include <lights_fragment_end>\n"
 };
}
const mesh=(name,material)=>({isMesh:true,name,material});
test("world key hull has neutral diffuse AND a separate physical clearcoat",()=>{
 const s=patchShipWhiteSpillShader(unitShader().fragmentShader);
 for(const key of ["material.clearcoat *= mix(1.0,0.14",
  "material.clearcoatRoughness=mix","reflectedLight.directDiffuse*=mix(1.0,0.16",
  "reflectedLight.directSpecular*=mix(1.0,0.10",
  "reflectedLight.indirectSpecular*=mix(1.0,0.38",
  "totalEmissiveRadiance+=uShipInteriorZoneColor"])
  assert.ok(s.includes(key),key);
 assert.match(s,/#ifdef USE_CLEARCOAT/);
 assert.equal(SHIP_WHITE_SPILL_02125.geometryChanged,false);
 assert.equal(SHIP_WHITE_SPILL_02125.engineLightsChanged,0);
 assert.equal(SHIP_WHITE_SPILL_02125.gripChanged,false);
 assert.equal(SHIP_WHITE_SPILL_02125.cameraChanged,false);
});
test("bright PBR hull only; cockpit, engine and decorative seams untouched",()=>{
 const titanium=mat(),wing=mat(),armor=mat(),
  graphite=mat(false),glass=mat(),nozzle=mat(),seam=mat(true,"basic");
 const root=new Root([
  mesh("Compact central manta spine",titanium),
  mesh("Two broad scalloped manta wings",wing),
  mesh("Premium bevelled shoulder armour",armor),
  mesh("Inset swept dorsal wing channels",graphite),
  mesh("Low integrated teardrop canopy",glass),
  mesh("Wing-integrated venturi thruster",nozzle),
  mesh("Premium wing seams and glowing thruster rings",seam),
  mesh("Two broad scalloped manta wings",wing)
 ]);
 const c=createShipWhiteSpillController({Color},root);
 assert.equal(c.stats().treatedHullMaterials,3);
 for(const m of [titanium,wing,armor]){
  assert.match(m.customProgramCacheKey(),/ship-white-containment-02125/);
  const shader=unitShader();m.onBeforeCompile(shader,{});
  assert.ok(shader.uniforms.uShipInteriorWhiteMask);
  assert.ok(shader.uniforms.uShipInteriorZoneColor);
  assert.match(shader.fragmentShader,/0.022\*uShipInteriorWhiteMask/);
 }
 for(const m of [graphite,glass,nozzle,seam])
  assert.equal(m.customProgramCacheKey(),"original");
});
test("local tunnel only, smooth transition, same zone color and restore for hangar",()=>{
 const c=createShipWhiteSpillController({Color},
  new Root([mesh("Premium bevelled shoulder armour",mat())]));
 const gold=new Color(0xffc266);
 assert.equal(c.update(165,gold,true),1);
 assert.equal(c.stats().zoneTint,0xffc266);
 assert.equal(c.stats().whiteMask,1);
 assert.ok(c.update(353,gold,true)<1);
 assert.equal(c.update(368,gold,true),0);
 assert.equal(c.update(165,gold,false),0);
 assert.equal(c.update(500,gold,true),0);
 c.setComparison(0);
 assert.equal(c.stats().whiteMask,0);
});
test("asynchronous glTF HERO ship surface can join the exact same uniform",()=>{
 const titanium=mat(),hero=mat();
 const c=createShipWhiteSpillController({Color},
  new Root([mesh("Compact central manta spine",titanium)]));
 assert.equal(c.attachShip(new Root([mesh("Hero V4 sculpted body",hero)])),1);
 assert.equal(c.attachShip(new Root([mesh("Hero V4 sculpted body",hero)])),0);
 assert.equal(c.stats().treatedHullMaterials,2);
 const a=unitShader(),b=unitShader();
 titanium.onBeforeCompile(a,{});hero.onBeforeCompile(b,{});
 assert.equal(a.uniforms.uShipInteriorWhiteMask,b.uniforms.uShipInteriorWhiteMask);
});
test("classic A/B, ship swap and 120Hz mechanics untouched",()=>{
 const s=src("./game-v0210.mjs");
 assert.match(s,/shipWhiteSpillEnabled=whiteCoreEnabled/);
 assert.match(s,/get\("shipWhite"\)!=="classic"/);
 assert.match(s,/compareBeforeShipWhite:"\?shipWhite=classic"/);
 assert.match(s,/shipWhiteSpill\?\.attachShip\(ship\)/);
 assert.match(s,/shipWhiteSpill\?\.update\(view\.s,targetAccent/);
 assert.match(src("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.[01234]/);
});
