import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 UNIFIED_METAL_LIGHT_02641,COVE_NAME_02641,
 patchLocalResponse02641,patchTitaniumSubstrate02641,
 installUnifiedMetalLighting02641
} from "./unified-metal-light-response-v02641.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const direct="RE_Direct(pbrFixture0260,geometryPosition";
const cool="RE_Direct(l261Cool,geometryPosition";
const warm="RE_Direct(l261Warm,geometryPosition";
const makeMetal=(mobile=false)=>[
 "#include <common>",
 "uniform sampler2D uMetalAtlas0262;",
 "uniform float uLocalReflections0261;",
 "varying vec3 vPbrCold0260;",
 "varying vec3 vPbrWarm0260;",
 "vec3 irradiance=vec3(0.0);",
 "vec3 iblIrradiance=vec3(0.0);",
 "roughnessFactor=mix(roughnessFactor,m262R,uPremiumMetal0262);",
 ...Array(2).fill(direct),
 ...Array(mobile?2:3).fill(cool),
 ...Array(mobile?1:2).fill(warm)
].join("\n");
const makeSubstrate=()=>[
 "#include <common>",
 "uniform sampler2D uMetalAtlas0262;",
 "uniform float uPremiumMetal0262;",
 "float m25Cavity=0.0;",
 "float m25Wall=0.0;",
 "float m25Roof=0.0;",
 "float m25Portal=0.0;",
 " m25Final=clamp(m25Final*s262Gain,vec3(0.002),vec3(0.30));"
].join("\n");
class Color{
 constructor(r=1,g=1,b=1){this.r=r;this.g=g;this.b=b;}
 clone(){return new Color(this.r,this.g,this.b);}
 setRGB(r,g,b){this.r=r;this.g=g;this.b=b;return this;}
 copy(other){return this.setRGB(other.r,other.g,other.b);}
}
const phys=(isPhysical)=>({
 isMeshPhysicalMaterial:isPhysical,isMeshBasicMaterial:!isPhysical,
 onBeforeCompile(){},customProgramCacheKey(){return "original";},
 needsUpdate:false
});
function mockWorld(mobile=false,hasCove=true){
 const group={children:[
 ...["panel","rib"].filter(r=>!mobile||r==="panel").map(role=>({
  name:"SKYSHIFT 0.26.0 P2 / true physical "+role,
  material:phys(true)
 })),
 ...["panel","rib","shell","conduit"].filter(r=>!mobile||r!=="conduit")
 .map(role=>({name:"Tunnel / "+({
  panel:"HARDSURFACE_PANELS",rib:"CURVED_RIBS",
  shell:"CLOSED_SHELL",conduit:"STRUCTURAL_CONDUITS"})[role],
  material:phys(false)}))
 ]};
 const cove=hasCove?{name:COVE_NAME_02641,
  material:{color:new Color(1,1,1)}}:null;
 const world={getObjectByName(name){return name===
  "SKYSHIFT · Tunnel Megastructure 0.21.1"?group:name===COVE_NAME_02641?cove:null;}};
 const station={stats(){return {premiumMetal0262Enabled:true,
  premiumMetal0262SolarSealed:true,localReflections0261SunIsolated:true};}};
 return {world,station,group,cove};
}
test("design retains PBR, original lamp geometry, zone wave, ship and physics",()=>{
 const c=UNIFIED_METAL_LIGHT_02641;
 assert.equal(c.version,"0.26.4.1");
 assert.equal(c.base,"0.26.4");
 assert.equal(c.comparison,"?unifiedLight=classic");
 for(const k of ["preservedRoadGGX","preservedMicroNormals",
  "preservedRoofNeon","preservedNativeZoneWave",
  "preservedSolarSeal","preservedWhiteCore",
  "preservedStraightOnlyEdges","preservedConnectedAmberFloor",
  "preservedCollision","preservedGRIP","preservedShip",
  "preservedCamera","preservedPhysics"])assert.equal(c[k],true,k);
 for(const k of ["newMeshes","newDrawCalls","newDynamicLights",
  "newTextures","newRenderPasses","newReflectionSamples"])assert.equal(c[k],0,k);
});
test("local PBR amplifies only actual finite GGX cyan/amber samples and no sun",()=>{
 for(const mobile of [false,true]){
  const code=makeMetal(mobile);
  const r=patchLocalResponse02641("#include <common>",code,{mobile});
  assert.match(r.fragmentShader,/uniform float uMetalLightResponse02641;/);
  assert.match(r.fragmentShader,/pbrFixture0260.color\*=mix\(vec3\(1.0\)/);
  assert.match(r.fragmentShader,/l261Cool.color\*=mix\(vec3\(1.0\)/);
  assert.match(r.fragmentShader,/l261Warm.color\*=mix\(vec3\(1.0\)/);
  assert.equal(r.sources.original,2);
  assert.equal(r.sources.cyan,mobile?2:3);
  assert.equal(r.sources.warm,mobile?1:2);
  assert.ok(r.fragmentShader.includes("vec3 irradiance=vec3(0.0);"));
  assert.ok(r.fragmentShader.includes("vec3 iblIrradiance=vec3(0.0);"));
  assert.ok(r.fragmentShader.includes("roughnessFactor=mix(roughnessFactor,m262R,uPremiumMetal0262);"));
  assert.equal((r.fragmentShader.match(/RE_Direct\(/g)||[]).length,mobile?5:7);
 }
 assert.throws(()=>patchLocalResponse02641("","#include <common>"));
});
test("dark titanium preserved near lit bevels and untouched at zero",()=>{
 const cfg=UNIFIED_METAL_LIGHT_02641.graphite;
 assert.ok(cfg.panel<cfg.rib&&cfg.rib<cfg.shell&&cfg.shell<cfg.conduit);
 for(const role of ["panel","rib","shell","conduit"]){
  const r=patchTitaniumSubstrate02641("",makeSubstrate(),{role});
  assert.match(r.fragmentShader,/m41Base=mix\(/);
  assert.ok(r.fragmentShader.includes(cfg[role].toFixed(3)));
  assert.match(r.fragmentShader,/m25Final\*=mix\(1.0,m41Preserve,uMetalLightResponse02641\)/);
  assert.ok(r.fragmentShader.includes("m25Final=clamp(m25Final*s262Gain"));
  assert.match(r.fragmentShader,/m41Cavity/);
 }
 assert.throws(()=>patchTitaniumSubstrate02641("","#include <common>"));
});
test("high mounts original 2 Physical GGX and 4 sealed graphite roles, with reversible cove",()=>{
 const m=mockWorld(false);
 const originals=m.group.children.map(x=>x.material.onBeforeCompile);
 const installed=installUnifiedMetalLighting02641({},m.world,m.station,{});
 let s=installed.stats();
 assert.equal(s.unifiedMetal02641Active,true,JSON.stringify(s));
 assert.equal(s.unifiedMetal02641PhysicalCoats,2);
 assert.equal(s.unifiedMetal02641Substrates,4);
 assert.equal(s.unifiedMetal02641NewLights,0);
 assert.equal(m.cove.material.color.g,1.12);
 assert.ok(m.group.children.every((x,i)=>x.material.onBeforeCompile!==originals[i]));
 installed.setComparison(0);
 assert.deepEqual(m.cove.material.color,new Color(1,1,1));
 assert.equal(installed.stats().unifiedMetal02641Strength,0);
 installed.setComparison(1);
 installed.dispose();
 assert.deepEqual(m.cove.material.color,new Color(1,1,1));
 assert.ok(m.group.children.every((x,i)=>x.material.onBeforeCompile===originals[i]));
});
test("4GB does not add any more GGX samples, fixtures or draw calls",()=>{
 const m=mockWorld(true,false);
 const installed=installUnifiedMetalLighting02641({},m.world,m.station,{
  lowMemory:true
 });
 const s=installed.stats();
 assert.equal(s.unifiedMetal02641PhysicalCoats,1);
 assert.equal(s.unifiedMetal02641Substrates,3);
 assert.equal(s.unifiedMetal02641CoveUpdated,false);
 assert.equal(s.unifiedMetal02641LowMemory,true);
 installed.dispose();
});
test("unavailable previous materials & comparison are safe no-ops",()=>{
 const a=mockWorld();
 const c=installUnifiedMetalLighting02641({},a.world,a.station,{enabled:false});
 assert.equal(c.stats().unifiedMetal02641Active,false);
 const d=installUnifiedMetalLighting02641({},a.world,{stats:()=>({})},{});
 assert.equal(d.stats().unifiedMetal02641Active,false);
});
test("v0.26.4.1 inherits 0.26.4 HDR and 0.26.3.3 straight-only lighting",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/installUnifiedMetalLighting02641/);
 assert.match(game,/installFinalCohesion0264/);
 assert.match(game,/installStraightOnlyEdgeLighting02633/);
 assert.ok(game.includes('get("unifiedLight")!=="classic"'));
 assert.match(game,/__skyshiftUnifiedLightFrameProof/);
 assert.match(game,/createRoadSolarSpillController/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.4\.1/);
 assert.match(read("./index.html"),/Unified Light Response & Dark Titanium Rebalance/);
});
