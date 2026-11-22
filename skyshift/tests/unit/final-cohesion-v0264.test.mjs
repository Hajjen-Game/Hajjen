import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 FINAL_COHESION_0264,SOURCE_NAMES_0264,FINAL_COHESION_SHADER_0264,
 finalCohesionBloom0264,finalFixtureGain0264,installFinalCohesion0264
} from "../../final-cohesion-v0264.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
class Color{
 constructor(r=1,g=1,b=1){this.r=r;this.g=g;this.b=b;}
 clone(){return new Color(this.r,this.g,this.b);}
 setRGB(r,g,b){this.r=r;this.g=g;this.b=b;return this;}
 copy(other){return this.setRGB(other.r,other.g,other.b);}
}
class Vector2{
 constructor(x,y){this.x=x;this.y=y;}
 set(x,y){this.x=x;this.y=y;}
}
const THREE={Vector2};
function harness({mobile=false,includeFixtures=true}={}){
 const output={name:"OutputPass"},grade={name:"Original grade"};
 const composer={
  passes:[{name:"RenderPass"},{name:"UnrealBloomPass"},{name:"SMAAPass"},grade,output],
  insertPass(pass,i){this.passes.splice(i,0,pass);},
  removePass(pass){this.passes=this.passes.filter(x=>x!==pass);}
 };
 const bloom={strength:.43,radius:.21,threshold:1.40,enabled:true};
 const fixture=(name)=>({name,material:{color:new Color(1,1,1)}});
 const cyan=fixture(SOURCE_NAMES_0264.cyan),amber=fixture(SOURCE_NAMES_0264.amber);
 const world={getObjectByName(name){
  if(!includeFixtures)return null;
  return name===cyan.name?cyan:name===amber.name?amber:null;
 }};
 const pipeline={composer,bloom,output,makeShaderPass(shader){
  return {uniforms:shader.uniforms,enabled:true,dispose(){this.disposed=true;}};
 }};
 return {pipeline,world,cyan,amber,output,bloom,mobile};
}
test("Pass 4 protects solar seal, straight edge placement, physics and actual metal GGX",()=>{
 assert.equal(FINAL_COHESION_0264.version,"0.26.4");
 assert.equal(FINAL_COHESION_0264.comparison,"?finalCohesion=classic");
 assert.equal(FINAL_COHESION_0264.additionalPassesHigh,1);
 assert.equal(FINAL_COHESION_0264.additionalPasses4GB,0);
 assert.equal(FINAL_COHESION_0264.additionalTextures,0);
 assert.equal(FINAL_COHESION_0264.additionalLights,0);
 assert.equal(FINAL_COHESION_0264.additionalMeshes,0);
 for(const k of ["ambientLightUnchanged","exposureUnchanged","whiteSolarSealUnchanged",
  "metalGGXUnchanged","roadGGXUnchanged","straightOnlyRailUnchanged",
  "connectedAmberFloorUnchanged","curveArrowsUnchanged",
  "physicsUnchanged","GRIPUnchanged","shipUnchanged","nativeZoneWaveUnchanged"])
  assert.equal(FINAL_COHESION_0264[k],true,k);
 assert.equal(FINAL_COHESION_0264.bloomHigh.strength,.52);
 assert.ok(FINAL_COHESION_0264.bloomHigh.radius<=.25);
 assert.ok(FINAL_COHESION_0264.bloomHigh.threshold>1.25);
});
test("HDR bloom settings are subtle, deterministic and EXACTLY recoverable",()=>{
 const initial={strength:.43,radius:.21,threshold:1.4};
 const first=finalCohesionBloom0264(initial,{comparison:0});
 assert.deepEqual(first,initial);
 assert.deepEqual(finalCohesionBloom0264(initial,{lowMemory:false,comparison:1}),
  FINAL_COHESION_0264.bloomHigh);
 assert.deepEqual(finalCohesionBloom0264(initial,{lowMemory:true,comparison:1}),
  FINAL_COHESION_0264.bloom4GB);
 const halfway=finalCohesionBloom0264(initial,{comparison:.5});
 assert.ok(halfway.strength>initial.strength&&halfway.strength<.52);
 assert.ok(halfway.threshold>1.28&&halfway.threshold<1.4);
});
test("new HDR gains apply only existing cyan and amber sources, not arrows, ship or road",()=>{
 assert.match(SOURCE_NAMES_0264.cyan,/straight track ONLY/);
 assert.match(SOURCE_NAMES_0264.amber,/one-piece amber arch-foot/);
 assert.deepEqual(finalFixtureGain0264("cyan",{comparison:0}),{r:1,g:1,b:1});
 const high=finalFixtureGain0264("cyan");
 const low=finalFixtureGain0264("cyan",{lowMemory:true});
 assert.ok(high.b>low.b&&high.b<=1.4);
 const amber=finalFixtureGain0264("amber");
 assert.ok(amber.r>amber.b);
 assert.throws(()=>finalFixtureGain0264("corner"));
});
test("selective finish is linear HDR, chromatic and retains whites/graphite/ship",()=>{
 const s=FINAL_COHESION_SHADER_0264.fragmentShader;
 assert.match(s,/texture2D\(tDiffuse,vUv\)/);
 assert.match(s,/if\(uFinalCohesion0264<0.001\)/);
 assert.match(s,/chroma=c264Color/);
 assert.match(s,/highlightGuard/);
 assert.match(s,/blackGuard/);
 assert.match(s,/shipMask/);
 assert.match(s,/roadMask/);
 assert.match(s,/nearChroma/);
 assert.match(s,/gl_FragColor=vec4\(max\(rich,vec3\(0.0\)\),source.a\)/);
 assert.doesNotMatch(s,/gl_FragColor\s*=\s*vec4\(\s*vec3\(1\)/);
 assert.doesNotMatch(read("./final-cohesion-v0264.mjs"),
  /new THREE\.(PointLight|DirectionalLight|RectAreaLight|PMREMGenerator|WebGLRenderTarget)/);
});
test("high graphics inserts one finish before OutputPass, after original grade",()=>{
 const h=harness(),original=[...h.pipeline.composer.passes];
 const c=installFinalCohesion0264(THREE,h.pipeline,h.world,{});
 const s=c.stats();
 assert.equal(s.finalCohesion0264Active,true);
 assert.equal(s.finalCohesion0264Status,"active");
 assert.equal(s.finalCohesion0264ExtraPasses,1);
 assert.equal(s.finalCohesion0264PassIndex,4);
 assert.equal(s.finalCohesion0264OutputIndex,5);
 assert.equal(h.pipeline.composer.passes.at(-1),h.output);
 assert.equal(h.pipeline.composer.passes[3],original[3]);
 assert.equal(s.finalCohesion0264Bloom.strength,.52);
 assert.ok(h.cyan.material.color.b>1.2);
 assert.ok(h.amber.material.color.r>1.2);
 c.resize(1536,870,2);
 assert.ok(Math.abs(c.pass.uniforms.uFinalPixel0264.value.x-1/3072)<1e-9);
 c.setComparison(0);
 assert.equal(c.pass.enabled,false);
 assert.equal(h.bloom.strength,.43);
 assert.equal(h.bloom.radius,.21);
 assert.equal(h.bloom.threshold,1.4);
 assert.deepEqual(h.cyan.material.color,new Color());
 assert.deepEqual(h.amber.material.color,new Color());
 c.setComparison(1);
 assert.equal(c.pass.enabled,true);
 assert.equal(h.bloom.strength,.52);
 c.dispose();
 assert.equal(h.pipeline.composer.passes.length,original.length);
 assert.deepEqual(h.pipeline.composer.passes,original);
 assert.deepEqual(h.cyan.material.color,new Color());
 assert.deepEqual(h.amber.material.color,new Color());
 assert.equal(h.bloom.strength,.43);
});
test("4GB stays in the existing composer; no expensive extra full-screen pass",()=>{
 const h=harness(),before=h.pipeline.composer.passes.length;
 const c=installFinalCohesion0264(THREE,h.pipeline,h.world,{lowMemory:true});
 const s=c.stats();
 assert.equal(s.finalCohesion0264LowMemory,true);
 assert.equal(s.finalCohesion0264ExtraPasses,0);
 assert.equal(h.pipeline.composer.passes.length,before);
 assert.equal(h.bloom.strength,.44);
 assert.ok(h.cyan.material.color.r<1.2);
 c.setComparison(0);
 assert.equal(h.bloom.threshold,1.40);
 c.dispose();
});
test("classic flag and missing prerequisite restore original pipeline untouched",()=>{
 const h=harness();
 const c=installFinalCohesion0264(THREE,h.pipeline,h.world,{enabled:false});
 assert.equal(c.stats().finalCohesion0264Active,false);
 assert.equal(h.bloom.strength,.43);
 assert.equal(h.pipeline.composer.passes.length,5);
 const bad=harness({includeFixtures:false});
 const f=installFinalCohesion0264(THREE,bad.pipeline,bad.world,{});
 assert.equal(f.stats().finalCohesion0264Active,false);
 assert.equal(bad.bloom.strength,.43);
});
test("released Pass 4 must KEEP the 0.26.3.3 STRAIGHT-only rail implementation",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/roadReflectionRelease\[2\]>3/);
 assert.match(game,/installStraightOnlyEdgeLighting02633/);
 assert.match(game,/installFinalCohesion0264/);
 assert.ok(game.includes('get("finalCohesion")!=="classic"'));
 assert.match(game,/__skyshiftFinalCohesionFrameProof/);
 assert.match(game,/createRoadSolarSpillController/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.(?:4|5)/);
 assert.match(read("./index.html"),/Lighting, Glow & Final Cohesion|Unified Light Response & Dark Titanium Rebalance|Reflection Cohesion & Premium Surface Finish|Unified Fixture Light Transport & Surface Response|True Rail & Wall Local Light Response/);
});
