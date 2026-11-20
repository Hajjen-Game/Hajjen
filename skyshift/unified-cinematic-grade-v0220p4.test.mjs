// SKYSHIFT 0.22.0 Pass 4 — unified cinematic HDR grade regression.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {UNIFIED_GRADE_0220_P4,UNIFIED_GRADE_SHADER_0220_P4,
 gradeAmount,installUnifiedCinematicGrade}
 from "./unified-cinematic-grade-v0220p4.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");

test("grade is visible at cruise, boosts moderately and remains off for paused/4GB",()=>{
 const base=gradeAmount({playing:true,speedMultiplier:1,boostMultiplier:1});
 const boost=gradeAmount({playing:true,speedMultiplier:3,boostMultiplier:1.4});
 assert.ok(base>=.79&&base<=.83);
 assert.ok(boost>base&&boost<=1);
 assert.equal(gradeAmount({playing:false,speedMultiplier:4,boostMultiplier:1.4}),0);
 assert.equal(gradeAmount({playing:true,speedMultiplier:4,lowMemory:true}),0);
 assert.equal(gradeAmount({playing:true,speedMultiplier:4,adaptiveLevel:3}),0);
 assert.equal(gradeAmount({playing:true,speedMultiplier:4,comparison:0}),0);
 const level0=gradeAmount({playing:true,boostMultiplier:1.4});
 const level1=gradeAmount({playing:true,boostMultiplier:1.4,adaptiveLevel:1});
 const level2=gradeAmount({playing:true,boostMultiplier:1.4,adaptiveLevel:2});
 assert.ok(level0>level1&&level1>level2&&level2>0);
});
test("original white core, road and ship stay protected while surfaces gain spectral depth",()=>{
 const f=UNIFIED_GRADE_SHADER_0220_P4.fragmentShader;
 assert.match(f,/float highlightLock=1\.0-smoothstep\(0\.93,1\.78,lum\)/);
 assert.match(f,/road\*=1\.0-smoothstep/);
 assert.match(f,/float ship=1\.0-smoothstep/);
 assert.match(f,/1\.0-0\.91\*road/);
 assert.match(f,/1\.0-0\.97\*ship/);
 assert.match(f,/vec3 rich=mix\(neutral,source\.rgb,1\.19\)/);
 assert.match(f,/vec3 graphite=rich\*contrast/);
 assert.match(f,/vec3 colored=max\(nearby-vec3\(gradeLuma\(nearby\)\),vec3\(0\.0\)\)/);
 assert.match(f,/vec3 wrap=colored\*0\.17\*sourceShadow\*weight/);
 assert.match(f,/vec4\(finished,source\.a\)/);
 assert.equal((f.match(/vec3 [abcd]=texture2D\(/g)||[]).length,4);
 assert.equal(UNIFIED_GRADE_0220_P4.localSamples,5);
 assert.doesNotMatch(f,/gl_FragCoord|uTime|sunPosition|exposure|random/);
});
test("Pass 4 follows existing optional velocity streak and precedes final OutputPass",()=>{
 const scene={},bloom={},smaa={},velocity={};
 const output={},composer={passes:[scene,bloom,smaa,velocity,output],
  insertPass(p,i){this.passes.splice(i,0,p)},
  removePass(p){this.passes.splice(this.passes.indexOf(p),1)}};
 const pipeline={composer,output,makeShaderPass(shader){
  return {enabled:true,uniforms:shader.uniforms,dispose(){}};
 }};
 const Three={Vector2:class{
  constructor(x,y){this.x=x;this.y=y}
  set(x,y){this.x=x;this.y=y}
 }};
 const ctl=installUnifiedCinematicGrade(Three,pipeline);
 assert.equal(ctl.active,true);
 assert.equal(composer.passes[3],velocity);
 assert.equal(composer.passes[4],ctl.pass);
 assert.equal(composer.passes[5],output);
 assert.equal(ctl.stats().enabled,false);
 ctl.update({playing:true,speedMultiplier:1,boostMultiplier:1});
 assert.equal(ctl.stats().renderPasses,1);
 assert.equal(ctl.stats().intensity,.81);
 ctl.resize(1000,600,1.5);
 assert.equal(ctl.pass.uniforms.uUnifiedPixel.value.x,1/1500);
 assert.equal(ctl.pass.uniforms.uUnifiedPixel.value.y,1/900);
 ctl.setComparison(0);
 assert.equal(ctl.stats().renderPasses,0);
 ctl.setComparison(1);
 assert.equal(ctl.stats().renderPasses,1);
 ctl.setQualityLevel(3);
 assert.equal(ctl.stats().renderPasses,0);
 ctl.setQualityLevel(0);
 assert.equal(ctl.stats().renderPasses,1);
 ctl.update({playing:false});
 assert.equal(ctl.stats().renderPasses,0);
 ctl.dispose();
 assert.equal(composer.passes.length,5);
 assert.equal(composer.passes[4],output);
});
test("low memory/older releases are exact four/five-pass originals",()=>{
 const stages=[{},{},{},{}];
 const composer={passes:stages,insertPass(){throw Error("unwanted pass")}};
 const pipe={composer,output:stages[3]};
 const low=installUnifiedCinematicGrade({},pipe,{lowMemory:true});
 const classic=installUnifiedCinematicGrade({},pipe,{enabled:false});
 assert.equal(low.stats().disabledReason,"low-memory");
 assert.equal(classic.stats().disabledReason,"comparison");
 assert.equal(stages.length,4);
});
test("unified pipeline never changes physical lighting, flight, ships or global bloom",()=>{
 const p=UNIFIED_GRADE_0220_P4;
 for(const k of ["newLights","newMeshes","newTextures","newPhysics",
  "globalExposureChange","globalBloomChange","lowMemoryExtraPasses"])
  assert.equal(p[k],0);
 for(const k of ["changedRoadShader","changedShipShader","changedCamera",
  "changedGrip","changedNativeWave","changedWhiteSolarSeal"])
  assert.equal(p[k],false);
 const game=read("./game-v0210.mjs");
 assert.match(game,/installVelocityCinematography/);
 assert.match(game,/installCinematicNeonLighting/);
 assert.match(game,/createWhiteCoreContainment/);
 assert.match(game,/createRoadSolarSpillController/);
 assert.match(game,/installUnifiedCinematicGrade/);
});
test("versioned A/B, adaptive device control and same-frame proof remain available",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/unifiedGradeEnabled=cinematicNeonEnabled/);
 assert.match(game,/get\("unifiedGrade"\)!=="classic"/);
 assert.match(game,/__skyshiftUnifiedGradeProbe/);
 assert.match(game,/__skyshiftUnifiedGradeFrameProof/);
 assert.match(game,/unifiedCinematicGrade\?\.setQualityLevel/);
 assert.match(game,/unifiedCinematicGrade\?\.resize/);
 assert.match(game,/unifiedCinematicGrade\?\.update/);
 assert.match(game,/compareBeforeUnifiedGrade:"\?unifiedGrade=classic"/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.24\.1/);
 assert.match(read("./index.html"),/0\.24\.1/);
});
