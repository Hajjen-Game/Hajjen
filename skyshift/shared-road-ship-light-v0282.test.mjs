import test from "node:test";
import assert from "node:assert/strict";
import {SHARED_LIGHT_0282,createSharedSourceSampler0282,
 buildSharedRoadSourceData0282,patchSharedShipHull0282,
 installSharedRoadReflections0282,installSharedShipLight0282}
 from "./shared-road-ship-light-v0282.mjs";
import {patchCinematicRoadRebuild0263}
 from "./cinematic-road-rebuild-v0263.mjs";
const sample=(s,x,y)=>({x,y,z:s});
test("source fixtures really repeat from original Skyline renderer at 10 Vault banks",()=>{
 const sampler=createSharedSourceSampler0282(sample,3400);
 assert.equal(sampler.modules.length,10);
 for(const s of [0,24,110,338,340,550,1390,1840,3060,3387]){
  const local=sampler.localFor(s);
  assert.ok(local.index>=0&&local.index<10);
  assert.ok(local.s>=0&&local.s<=368);
  const f=sampler.nearest(s);
  assert.equal(f.cyanLeft.length,3);
  assert.ok(f.cyanLeft.every(Number.isFinite));
  assert.ok(f.amberRight.every(Number.isFinite));
  assert.ok(f.fixtures.cyanWeight>=0&&f.fixtures.cyanWeight<=1);
 }
 assert.equal(sampler.localFor(340).index,1);
 assert.equal(sampler.localFor(680).index,2);
 assert.equal(sampler.localFor(3399).index,9);
});
test("shared source physical positions continue through all 3400 metres, no road collider changes",()=>{
 const rows=[0,82,290,340,341,1440,1840,3060,3380,3399],
  lateral=[-9.8,0,9.8];
 const coords=rows.flatMap(s=>lateral.flatMap(x=>[s,x]));
 const position={count:coords.length/2};
 const attributes={
  position,aTrackCoord:{count:position.count,getX:i=>coords[i*2]}
 };
 const geometry={getAttribute:key=>attributes[key]};
 const data=buildSharedRoadSourceData0282(geometry,sample,3400);
 assert.equal(data.count,rows.length*lateral.length);
 assert.equal(data.modules,10);
 assert.ok(data.litCount>10);
 assert.ok(data.sourcePositions>10);
 assert.equal(data.vectors.roadFixtureMasks0263.length,data.count*2);
 for(const attr of Object.keys(data.vectors))
  assert.ok(data.vectors[attr].every(Number.isFinite),attr);
 assert.equal(SHARED_LIGHT_0282.newRoadColliders,0);
 assert.equal(SHARED_LIGHT_0282.changedGrip,false);
});
test("ship response contains colored physical PBR only, never neutral world wash",()=>{
 const fragment="#include <common>\n#include <lights_physical_fragment>\n#include <lights_fragment_end>";
 const patched=patchSharedShipHull0282(fragment);
 for(const part of ["u282CyanLeft","u282AmberRight","RE_Direct",
  "u282HullStrength","u282SourceWeight","totalEmissiveRadiance"])
  assert.ok(patched.includes(part),part);
 assert.ok(!patched.includes("uWhiteCoreShipContainment"));
 assert.ok(!patched.includes("vec3(1.0,1.0,1.0)"));
 assert.throws(()=>patchSharedShipHull0282("not PBR"),/requires original/);
});
test("true original road 0.26.3 shader has a separate Vault full-course mode",()=>{
 const anchor="#include <common>\n#include <lights_fragment_end>\n"+
  "#include <metalnessmap_fragment>\n"+
  "float guided = 0.0;\nfloat padCoverage = 0.0;\n"+
  "float whiteCore=0.0;\nvarying vec2 vTrackCoord;";
 const patched=patchCinematicRoadRebuild0263(
  "#include <common>\n#include <project_vertex>",anchor,{fullTunnel:true});
 assert.match(patched.fragmentShader,/float r263Tunnel=1\.0;/);
 assert.ok(patched.fragmentShader.includes("smoothstep(5.0,8.5,abs(vTrackCoord.y))"));
 assert.match(patched.fragmentShader,/float r263Interior=uRoadRebuild0263;/);
 assert.match(patched.fragmentShader,/RE_Direct/);
 assert.match(patched.fragmentShader,/float roadSolarMask=uRoadRebuild0263;/);
 assert.ok(patched.fragmentShader.includes("reflectedLight.directSpecular*=mix(1.0,0.08,roadSolarMask);"));
 assert.ok(patched.fragmentShader.includes("reflectedLight.indirectSpecular*=mix(1.0,0.14,roadSolarMask);"));
 assert.doesNotMatch(patched.fragmentShader,/uRoadSolarSpillSeal/);
});
test("non-Vault and classic paths are inert and cannot alter Skyline",()=>{
 assert.equal(installSharedRoadReflections0282(null,null,{enabled:false}).active,false);
 assert.equal(installSharedShipLight0282(null,{enabled:false}).active,false);
 assert.throws(()=>createSharedSourceSampler0282(null,3400),/needs/);
 assert.throws(()=>createSharedSourceSampler0282(sample,0),/needs/);
});
