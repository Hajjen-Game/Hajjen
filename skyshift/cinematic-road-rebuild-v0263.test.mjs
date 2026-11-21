import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {patchRoadSolarSpillShader} from "./road-solar-spill-v02126.mjs";
import {patchPremiumRoadSurfaceShader} from "./premium-road-surface-v0215.mjs";
import {patchCinematicRoadReflectionShader} from "./cinematic-road-reflections-v0242.mjs";
import {
 ROAD_REBUILD_0263,nearestRoadFixtures0263,buildRoadSourceGeometry0263,
 patchCinematicRoadRebuild0263,installCinematicRoadRebuildShader0263,
 createCinematicRoadReflectionRebuild0263
} from "./cinematic-road-rebuild-v0263.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
function legacyFragment(){
 return [
 "#include <common>",
 "varying vec2 vTrackCoord;",
 "float trackS = vTrackCoord.x;",
 "float trackL = vTrackCoord.y;",
 "float absL = abs(trackL);",
 "vec3 zoneBase=uTrackBase,zoneBand=uTrackBand,zoneGuide=uTrackGuide;",
 "vec3 zoneAccent=uTrackAccent,zoneBoost=uTrackBoost;",
 "vec3 waveSpectrum=uTrackAccent;",
 "float waveCrest=0.0,waveHalo=0.0,waveAfter=0.0;",
 "float whiteCore=0.0,whiteBloom=0.0,whiteFilaments=0.0;",
 "float sideBand = 0.2,flowZone=0.0;",
 "float guided = 0.3;",
 "float padCoverage = 0.0;",
 "float spine = 0.0;",
 "vec3 road = mix(zoneBase, zoneBand, sideBand * (0.27 + 0.24 * flowZone));",
 "diffuseColor.rgb = road;",
 "#include <metalnessmap_fragment>",
 "#include <lights_fragment_end>",
 "reflectedLight.directDiffuse*=.08;",
 "#include <emissivemap_fragment>",
 "totalEmissiveRadiance += uTrackGuide * guided * 0.24;"
 ].join("\n");
}
const vertex="#include <common>\n#include <project_vertex>";
function compiled(mobile=false){
 let fragment=patchRoadSolarSpillShader(legacyFragment());
 fragment=patchPremiumRoadSurfaceShader(fragment);
 fragment=patchCinematicRoadReflectionShader(fragment,{mobile});
 return patchCinematicRoadRebuild0263(vertex,fragment,{mobile});
}
test("Pass 3 preserves original road geometry, physics and intentional white wave",()=>{
 assert.equal(ROAD_REBUILD_0263.version,"0.26.3");
 assert.equal(ROAD_REBUILD_0263.pass,3);
 assert.equal(ROAD_REBUILD_0263.material,"existing indexed road MeshStandardMaterial");
 assert.equal(ROAD_REBUILD_0263.comparison,"?roadRebuild=classic");
 for(const key of ["addedMeshes","addedDrawCalls","addedLights",
  "addedTextures","addedRenderPasses","addedColliders"])
  assert.equal(ROAD_REBUILD_0263[key],0,key);
 for(const key of ["changesRoadGeometry","changesRoadColliders",
  "changesShip","changesRails","changesCamera","changesPhysics","changesGRIP"])
  assert.equal(ROAD_REBUILD_0263[key],false,key);
 for(const key of ["preservesNativeWave","preservesWhiteCrest",
  "preservesEmissiveGuides","preservesRoadSolarSeal"])
  assert.equal(ROAD_REBUILD_0263[key],true,key);
});
test("fixture sampling comes from real existing 10 portals and is tunnel-bounded",()=>{
 const center=nearestRoadFixtures0263(165);
 assert.ok(center.cyanWeight>.95);
 assert.ok(center.amberWeight>.10);
 assert.ok(center.cyan.s>=158&&center.cyan.s<=172);
 assert.ok(center.amber.s>=158.4&&center.amber.s<=161.1);
 const far=nearestRoadFixtures0263(185);
 assert.ok(far.cyanWeight<center.cyanWeight);
 for(const s of [-4,369,600]){
  const p=nearestRoadFixtures0263(s);
  assert.equal(p.cyanWeight,0);
  assert.equal(p.amberWeight,0);
 }
 assert.throws(()=>nearestRoadFixtures0263(Number.NaN));
});
test("source positions follow original bank and preserve indexed deck",()=>{
 const coordinates=[165,-9,165,9,170,-3,170,3];
 const positions=[-9,0,165,9,0,165,-3,0,170,3,0,170];
 const geometry={
  getAttribute(key){
   const data=key==="aTrackCoord"?coordinates:
    key==="position"?positions:null;
   if(!data)return null;
   const n=key==="aTrackCoord"?2:3;
   return {count:data.length/n,getX(i){return data[i*n];}};
  },
  index:{count:6}
 };
 const positionAt=(s,l,y)=>({x:l,y,z:s});
 const result=buildRoadSourceGeometry0263(geometry,positionAt);
 assert.equal(result.count,4);
 assert.equal(result.vectors.roadCyanLeft0263.length,12);
 assert.equal(result.vectors.roadFixtureMasks0263.length,8);
 assert.ok(result.sourcePositions>=6);
 assert.ok(result.litCount>0);
 const left=result.vectors.roadCyanLeft0263;
 const right=result.vectors.roadCyanRight0263;
 assert.ok(left[0]<0&&right[0]>0);
 assert.equal(left[2],right[2]);
 assert.ok(result.vectors.roadArcTangent0263[2]>.95);
 assert.equal(geometry.index.count,6);
});
test("actual BRDF uses original colored fixture directions, not emissive fake",()=>{
 for(const mobile of [false,true]){
  const shader=compiled(mobile);
  assert.match(shader.vertexShader,/roadCyanLeft0263/);
  assert.match(shader.vertexShader,/vRoadFixtureMasks0263=roadFixtureMasks0263/);
  assert.match(shader.fragmentShader,/uniform float uRoadRebuild0263/);
  assert.match(shader.fragmentShader,/roughnessFactor=mix\(roughnessFactor,r263Rough,r263Interior\)/);
  assert.match(shader.fragmentShader,/metalnessFactor=mix/);
  assert.match(shader.fragmentShader,/reflectedLight.directDiffuse=r263DiffuseBefore/);
  assert.match(shader.fragmentShader,/RE_Direct\(r263Lamp,geometryPosition,geometryNormal,geometryViewDir/);
  assert.match(shader.fragmentShader,/reflectedLight.indirectSpecular \*= mix\(1.0,0.14,roadSolarMask\)/);
  assert.match(shader.fragmentShader,/1.0-0.92\*clamp\(whiteCore/);
  assert.match(shader.fragmentShader,/1.0-0.91\*clamp\(guided/);
  assert.match(shader.fragmentShader,/0.045,0.55,0.93/);
  assert.match(shader.fragmentShader,/1.0,0.36,0.095/);
  assert.match(shader.fragmentShader,/totalEmissiveRadiance\+=r42Mask/);
  const samples=(shader.fragmentShader.match(/RE_Direct\(r263Lamp,/g)||[]).length;
  assert.equal(samples,mobile?3:6);
  assert.doesNotMatch(shader.fragmentShader,/new DirectionalLight|PMREMGenerator|SSRPass/);
 }
 assert.throws(()=>patchCinematicRoadRebuild0263(vertex,legacyFragment()));
});
test("0.26.2 A/B resets legacy emission and native GGX in the same frame",()=>{
 let legacyValue=1;
 const legacy={setComparison(x){legacyValue=x;}};
 const geometry={
  attributes:{
   aTrackCoord:{count:4,getX(i){return [165,165,170,170][i];}},
   position:{count:4}
  },
  getAttribute(key){return this.attributes[key]??null;},
  setAttribute(key,x){this.attributes[key]=x;},
  deleteAttribute(key){delete this.attributes[key];}
 };
 const THREE={Float32BufferAttribute:class{
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;}
 }};
 const old=(shader)=>{shader.fragmentShader=compiled().fragmentShader;};
 const oldKey=()=>"-real-road-chain";
 const material={isMeshStandardMaterial:true,onBeforeCompile:old,
  customProgramCacheKey:oldKey,needsUpdate:false};
 const mesh={material,geometry};
 const controller=createCinematicRoadReflectionRebuild0263(THREE,mesh,{
  positionAt:(s,l,y)=>({x:l,y,z:s}),legacy
 });
 assert.equal(controller.stats().roadRebuild0263Active,true);
 assert.equal(controller.stats().roadRebuild0263CyanSamples,4);
 assert.equal(controller.stats().roadRebuild0263AmberSamples,2);
 assert.equal(legacyValue,.10);
 controller.setComparison(0);
 assert.equal(legacyValue,1);
 controller.setComparison(1);
 assert.equal(legacyValue,.10);
 assert.match(material.customProgramCacheKey(),/real-road-ggx-0263-high/);
 controller.dispose();
 assert.equal(legacyValue,1);
 assert.equal(material.onBeforeCompile,old);
 assert.equal(material.customProgramCacheKey,oldKey);
 assert.equal(geometry.getAttribute("roadFixtureMasks0263"),null);
});
test("boot and public A/B are version-scoped; no GRIP or ship rewrites",()=>{
 const game=read("./game-v0210.mjs"),
  boot=read("./boot-v0210.js"),
  html=read("./index.html");
 assert.match(game,/const roadRebuildEnabled=cinematicRoadEnabled/);
 assert.match(game,/get\("roadRebuild"\)!=="classic"/);
 assert.match(game,/createCinematicRoadReflectionRebuild0263\(THREE,/);
 assert.match(game,/__skyshiftRoadRebuildFrameProof/);
 assert.match(game,/createRoadSolarSpillController/);
 assert.match(game,/createUnifiedTunnelLightingController/);
 assert.match(game,/createShipWhiteSpillController/);
 assert.match(boot,/game-v0210\.mjs\?v=0\.26\.(?:3|4)/);
 assert.match(html,/Cinematic Road Reflection Rebuild|Lighting, Glow & Final Cohesion|Unified Light Response & Dark Titanium Rebalance/);
});
