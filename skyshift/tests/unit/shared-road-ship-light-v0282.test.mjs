import test from "node:test";
import assert from "node:assert/strict";
import {SHARED_LIGHT_0282,createSharedSourceSampler0282,
 buildSharedRoadSourceData0282,patchSharedShipHull0282,
 installSharedRoadReflections0282,installSharedShipLight0282}
 from "../../tunnel/shared-road-ship-light-v0282.mjs";
import {patchCinematicRoadRebuild0263}
 from "../../rendering/cinematic-road-rebuild-v0263.mjs";
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

import {roadSectionMaskExpressionEF05} from "../../rendering/cinematic-road-rebuild-v0263.mjs";
import {planConfiguredTunnelModules0281} from "../../tunnel/true-shared-tunnel-renderer-v0281.mjs";
test("EF05 shared GGX road seals only actual tunnel intervals, preserves exterior and full-course shader",()=>{
 const vertex="#include <common>\n#include <project_vertex>";
 const fragment="#include <common>\n#include <lights_fragment_end>\n"+
  "#include <metalnessmap_fragment>\nfloat guided = 0.0;\nfloat padCoverage = 0.0;\nfloat whiteCore=0.0;\nvarying vec2 vTrackCoord;";
 const sections=[{start:25,end:625},{start:800,end:1120}];
 const expression=roadSectionMaskExpressionEF05(sections);
 assert.match(expression,/smoothstep\(25\.000000,37\.000000,s\)/);
 assert.match(expression,/smoothstep\(613\.000000,625\.000000,s\)/);
 assert.match(expression,/smoothstep\(800\.000000,812\.000000,s\)/);
 assert.throws(()=>roadSectionMaskExpressionEF05([{start:25,end:625},{start:620,end:800}]),/invalid/);
 const mask=(s)=>Function("s","smoothstep","clamp","return "+expression)(
  s,(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t)},(v,a,b)=>Math.max(a,Math.min(b,v)));
 for(const x of [0,25,625,700,800,1120,1199])assert.equal(mask(x),0);
 for(const x of [37,100,325,613,812,950,1108])assert.equal(mask(x),1);
 for(const mobile of [false,true]){
  const p=patchCinematicRoadRebuild0263(vertex,fragment,{fullTunnel:true,mobile,sections});
  assert.match(p.fragmentShader,/float r263Interior=uRoadRebuild0263\*roadTunnelMaskEF05/);
  assert.match(p.fragmentShader,/float roadSolarMask=uRoadRebuild0263\*roadTunnelMaskEF05/);
  assert.match(p.fragmentShader,/float r263Tunnel=roadTunnelMaskEF05/);
  assert.equal(p.vertexShader,patchCinematicRoadRebuild0263(vertex,fragment,{fullTunnel:true,mobile}).vertexShader);
  assert.doesNotMatch(patchCinematicRoadRebuild0263(vertex,fragment,{fullTunnel:true,mobile}).fragmentShader,/roadTunnelMaskEF05/);
 }
 const attrs={aTrackCoord:{count:3,getX:i=>[100,700,950][i]},position:{count:3}};
 const geometry={getAttribute:k=>attrs[k],setAttribute:(k,v)=>attrs[k]=v,deleteAttribute:k=>delete attrs[k]};
 const material={isMeshStandardMaterial:true,onBeforeCompile(){},customProgramCacheKey(){return "original"}};
 const before=material.onBeforeCompile,key=material.customProgramCacheKey;
 const sourceSampler=createSharedSourceSampler0282(sample,1200,planConfiguredTunnelModules0281(1200,sections));
 const controller=installSharedRoadReflections0282({Float32BufferAttribute:class{constructor(array,itemSize){this.array=array;this.itemSize=itemSize;}}},{getObjectByName:()=>({geometry,material})},{enabled:true,positionAt:sample,trackLength:1200,sourceSampler});
 assert.equal(controller.active,true);assert.equal(controller.stats().sectionAwareExteriorSeal,true);
 assert.deepEqual([...attrs.roadFixtureMasks0263.array.slice(2,4)],[0,0]);
 const shader={vertexShader:vertex,fragmentShader:fragment,uniforms:{}};
 material.onBeforeCompile(shader,{});
 assert.match(shader.fragmentShader,/roadTunnelMaskEF05/);
 assert.match(material.customProgramCacheKey(),/-sections-/);
 controller.dispose();assert.equal(material.onBeforeCompile,before);assert.equal(material.customProgramCacheKey,key);
 assert.equal(attrs.roadFixtureMasks0263,undefined);
});


test("EF06 shared hull lighting detaches old bindings and can reattach without accumulating materials",()=>{
 const THREE={Vector3:class{},Vector2:class{},Color:class{}};
 const original=function(){},key=function(){return "original";};
 const mat=()=>({isMeshStandardMaterial:true,color:{},onBeforeCompile:original,customProgramCacheKey:key});
 const a=mat(),b=mat(),ship=m=>({traverse:fn=>fn({isMesh:true,name:"fixture hull",material:m})});
 const ctl=installSharedShipLight0282(THREE,{enabled:true,positionAt:sample,trackLength:3400});
 assert.equal(ctl.active,true);
 assert.equal(ctl.attachShip(ship(a)),1);assert.equal(ctl.attachShip(ship(a)),0);
 ctl.detachShip();assert.equal(a.onBeforeCompile,original);assert.equal(a.customProgramCacheKey,key);
 assert.equal(ctl.stats().physicalHullMaterials,0);
 assert.equal(ctl.attachShip(ship(b)),1);assert.equal(ctl.stats().physicalHullMaterials,1);
 ctl.dispose();assert.equal(b.onBeforeCompile,original);assert.equal(ctl.stats().physicalHullMaterials,0);
});
