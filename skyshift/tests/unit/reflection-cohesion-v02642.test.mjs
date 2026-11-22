import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 REFLECTION_FINISH_02642,FOOT_BAND_NAME_02642,
 patchMetalFinish02642,patchRoadFinish02642,patchJoinedFootFinish02642,
 wrapFinishShader02642,installPremiumReflectionFinish02642
} from "../../reflection-cohesion-v02642.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const roughMetal=" roughnessFactor=mix(roughnessFactor,m262R,uPremiumMetal0262);";
const roughRoad="roughnessFactor=mix(roughnessFactor,r263Rough,r263Interior);";
const metalShader=(mobile=false)=>[
 "#include <common>",
 "uniform float uMetalLightResponse02641;",
 "uniform float uLocalReflections0261;",
 "varying vec2 vLocalMask0261;",
 roughMetal,
 ...Array(mobile?2:3).fill("l261CoolDistance/"+(mobile?"12.8":"14.4")),
 ...Array(mobile?1:2).fill("l261WarmDistance/"+(mobile?"10.4":"11.6"))
].join("\n");
const roadShader=[
 "#include <common>",roughRoad,
 "float e31Power=uEdgeFloor02631*e31In*e31Bay*e31Safe*clamp(vEdgeStraight02633,0.0,1.0);",
 " float r263CoveBand=exp(-pow((r263Lateral-6.7)/2.2,2.0))+",
 "  0.48*exp(-pow((r263Lateral-9.1)/1.7,2.0));",
 " float r263AmberBand=exp(-pow((r263Lateral-7.5)/2.05,2.0));",
 "vec3 r263Convolved=vec3(0.045,0.54,0.90)*(r263Source.x*r263CoveBand*0.38)+",
 "vec3(1.0,0.33,0.075)*(r263Source.y*r263AmberBand*0.29);",
 "reflectedLight.directSpecular+=r263Convolved*(r263Keep*r263Fresnel*r263Surface);",
 "float e31FootBand=exp(-pow((e31L-10.60)/2.15,2.0));"
].join("\n");
function material(type){return {
 [type]:true,
 onBeforeCompile(){},
 customProgramCacheKey(){return "original-solar-sealed-material"},
 needsUpdate:false
};}
function setup(mobile=false){
 const coats=["panel",...(mobile?[]:["rib"])].map(role=>({
  name:"SKYSHIFT 0.26.0 P2 / true physical "+role,
  material:material("isMeshPhysicalMaterial")
 }));
 const foot={name:FOOT_BAND_NAME_02642,material:material("isMeshBasicMaterial")};
 const group={children:coats},road={material:material("isMeshStandardMaterial")};
 const world={getObjectByName(name){return name===
  "SKYSHIFT · Tunnel Megastructure 0.21.1"?group:
  name===FOOT_BAND_NAME_02642?foot:null;}};
 const active=k=>({stats(){return {[k]:true};}});
 const opts={lowMemory:mobile,metalState:active("unifiedMetal02641Active"),
  roadRebuild:active("roadRebuild0263Active"),
  straightEdges:active("straightEdges02633Active"),
  finalCohesion:active("finalCohesion0264Active")};
 return {coats,foot,road,world,opts};
}
test("0.26.4.2 retains real dark titanium and no new render/lights",()=>{
 const c=REFLECTION_FINISH_02642;
 assert.equal(c.version,"0.26.4.2");
 assert.equal(c.base,"0.26.4.1");
 assert.equal(c.comparison,"?reflectionFinish=classic");
 for(const key of ["graphiteBaseUnchanged","roughnessMicroAtlasUnchanged",
  "originalPhysicalSamplesUnchanged","straightOnlyCyanSourcesUnchanged",
  "curveArrowsUnchanged","connectedAmberSourceGeometryUnchanged",
  "solarSealUnchanged","originalRoadUnchanged",
  "GRIPUnchanged","shipUnchanged","physicsUnchanged","zoneWaveUnchanged"])
  assert.equal(c[key],true,key);
 for(const k of ["addedDirectLightSamples","addedDrawCalls","addedLights",
  "addedTextures","addedRenderPasses"])assert.equal(c[k],0,k);
 assert.ok(c.high.roadCoveWidth>2.2);
 assert.ok(c.high.roadAmberWidth>2.05);
 assert.ok(c.high.metalCoolReach>14.4);
});
test("metal modifies ONLY original local GGX near source while preserving microatlas",()=>{
 for(const mobile of [false,true]){
  const src=metalShader(mobile);
  const patch=patchMetalFinish02642("#include <common>",src,{mobile});
  assert.match(patch.fragmentShader,/uniform float uReflectionFinish02642/);
  assert.match(patch.fragmentShader,/l261CoolDistance\/mix\(/);
  assert.match(patch.fragmentShader,/l261WarmDistance\/mix\(/);
  assert.match(patch.fragmentShader,/vLocalMask0261\.x/);
  assert.match(patch.fragmentShader,/m262R,uPremiumMetal0262/);
  assert.match(patch.fragmentShader,/roughnessFactor=max\(0\.20/);
  assert.equal((patch.fragmentShader.match(/l261CoolDistance\/mix\(/g)||[]).length,
   mobile?2:3);
  assert.equal((patch.fragmentShader.match(/l261WarmDistance\/mix\(/g)||[]).length,
   mobile?1:2);
  assert.equal((patch.fragmentShader.match(/RE_Direct\(/g)||[]).length,0);
 }
 assert.throws(()=>patchMetalFinish02642("","#include <common>"));
});
test("road extends colored shoulders, preserves bend cyan guard and road white safety",()=>{
 for(const mobile of [false,true]){
  const result=patchRoadFinish02642("#include <common>",roadShader,{mobile});
  const s=result.fragmentShader;
  assert.match(s,/roughnessFactor=max\(0\.265/);
  assert.match(s,/r263Lateral-6\.7\)\/mix\(2\.2/);
  assert.match(s,/r263Lateral-7\.5\)\/mix\(2\.05/);
  assert.match(s,/r263Source\.x\*r263CoveBand\*mix\(0\.38/);
  assert.match(s,/r263Source\.y\*r263AmberBand\*mix\(0\.29/);
  assert.match(s,/vEdgeStraight02633,0\.0,1\.0/);
  assert.match(s,/r263Keep\*r263Fresnel\*r263Surface/);
  assert.match(s,/e31L-10\.60\)\/mix\(2\.15/);
  assert.ok(!s.includes("uReflectionFinish02642 * vec3(1.0)"));
 }
 assert.throws(()=>patchRoadFinish02642("","not road"));
});
test("arch-floor diffuse alpha changes but connected geometry and source core remain",()=>{
 const code="#include <common>\n#include <color_fragment>\n gl_FragColor=diffuseColor;";
 const r=patchJoinedFootFinish02642("vertex",code);
 assert.match(r.fragmentShader,/pow\(f42Alpha,0\.840\)/);
 assert.match(r.fragmentShader,/diffuseColor\.a=mix/);
 assert.match(r.fragmentShader,/uReflectionFinish02642/);
 assert.match(r.fragmentShader,/gl_FragColor=diffuseColor/);
 assert.throws(()=>patchJoinedFootFinish02642("","no color fragment"));
});
test("high + 4GB reuse same old meshes, restore original shader cache and comparison",()=>{
 for(const mobile of [false,true]){
  const s=setup(mobile);
  const materials=[...s.coats.map(x=>x.material),s.road.material,s.foot.material];
  const originals=materials.map(m=>m.onBeforeCompile);
  const module=installPremiumReflectionFinish02642({},s.world,s.road,s.opts);
  const q=module.stats();
  assert.equal(q.reflectionFinish02642Active,true,JSON.stringify(q));
  assert.equal(q.reflectionFinish02642MetalCoats,mobile?1:2);
  assert.equal(q.reflectionFinish02642JoinedAmber,1);
  assert.equal(q.reflectionFinish02642NewLights,0);
  assert.equal(q.reflectionFinish02642NewPasses,0);
  assert.equal(q.reflectionFinish02642LowMemory,mobile);
  assert.ok(materials.every((m,i)=>m.onBeforeCompile!==originals[i]));
  module.setComparison(0);
  assert.equal(module.stats().reflectionFinish02642Strength,0);
  module.setComparison(1);
  assert.equal(module.stats().reflectionFinish02642Strength,1);
  assert.ok(materials.every(m=>m.customProgramCacheKey().includes("-premium-reflection-02642-")));
  module.dispose();
  assert.ok(materials.every((m,i)=>m.onBeforeCompile===originals[i]));
  assert.ok(materials.every(m=>m.customProgramCacheKey()==="original-solar-sealed-material"));
 }
});
test("original prerequisites cannot be bypassed; classic does no shader edits",()=>{
 const a=setup();
 assert.equal(installPremiumReflectionFinish02642({},a.world,a.road,
  {...a.opts,enabled:false}).stats().reflectionFinish02642Active,false);
 assert.equal(installPremiumReflectionFinish02642({},a.world,a.road,
  {...a.opts,metalState:null}).stats().reflectionFinish02642Active,false);
});
test("live 0.26.4.2 release only after 0.26.4.1 and clean classic comparison",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/reflectionFinishEnabled=unifiedLightResponseEnabled/);
 assert.match(game,/installPremiumReflectionFinish02642/);
 assert.match(game,/installStraightOnlyEdgeLighting02633/);
 assert.match(game,/__skyshiftReflectionFinishFrameProof/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.(?:4\.[23]|5)/);
 assert.match(read("./index.html"),/Reflection Cohesion & Premium Surface Finish|Unified Fixture Light Transport & Surface Response|True Rail & Wall Local Light Response/);
});
