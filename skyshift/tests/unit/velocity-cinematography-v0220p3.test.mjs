// SKYSHIFT 0.22.0 Pass 3 — selective HDR cinematic blur regression.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {VELOCITY_CINEMA_0220_P3,VELOCITY_SHADER_0220_P3,
 velocityCinemaIntensity,installVelocityCinematography}
 from "../../rendering/velocity-cinematography-v0220p3.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("real speed and boost control optional blur, pause never smears",()=>{
 assert.equal(velocityCinemaIntensity({playing:false,speedMultiplier:4,boostMultiplier:1.4}),0);
 assert.equal(velocityCinemaIntensity({playing:true,speedMultiplier:1,boostMultiplier:1}),0);
 const cruising=velocityCinemaIntensity({playing:true,speedMultiplier:2.1});
 const boost=velocityCinemaIntensity({playing:true,speedMultiplier:2.1,boostMultiplier:1.4});
 assert.ok(cruising>0&&cruising<.40);
 assert.ok(boost>cruising);
 assert.ok(velocityCinemaIntensity({playing:true,speedMultiplier:3.6,boostMultiplier:1.4})<=.85);
 assert.equal(velocityCinemaIntensity({playing:true,speedMultiplier:3.6,boostMultiplier:1.4,comparison:0}),0);
 assert.equal(velocityCinemaIntensity({playing:true,speedMultiplier:3.6,lowMemory:true}),0);
 assert.equal(velocityCinemaIntensity({playing:true,speedMultiplier:3.6,adaptiveLevel:3}),0);
 const normal=velocityCinemaIntensity({playing:true,speedMultiplier:3.1,boostMultiplier:1.4});
 const medium=velocityCinemaIntensity({playing:true,speedMultiplier:3.1,boostMultiplier:1.4,adaptiveLevel:1});
 const slow=velocityCinemaIntensity({playing:true,speedMultiplier:3.1,boostMultiplier:1.4,adaptiveLevel:2});
 assert.ok(normal>medium&&medium>slow&&slow>0);
});
test("four HDR offsets and protected center preserve authored neon and driving line",()=>{
 const s=VELOCITY_SHADER_0220_P3.fragmentShader;
 assert.match(s,/uniform sampler2D tDiffuse/);
 assert.match(s,/texture2D\(tDiffuse,vUv\)/);
 assert.match(s,/peripheral=smoothstep\(0\.22,0\.48,dist\)/);
 assert.match(s,/float lane=1\.0-smoothstep/);
 assert.match(s,/float craft=1\.0-smoothstep/);
 assert.match(s,/1\.0-0\.94\*lane/);
 assert.match(s,/1\.0-0\.98\*craft/);
 assert.match(s,/uCinemaPixelSize\*uCinemaMaxPixels\*energy/);
 assert.match(s,/vec3 response=clean\.rgb\*0\.48/);
 assert.equal((s.match(/response\+=texture2D\(/g)||[]).length,4);
 assert.ok(s.includes("vec4(response,clean.a)"));
 assert.doesNotMatch(s,/sin\(|cos\(|uTime|gl_FragCoord|random/);
 assert.equal(VELOCITY_CINEMA_0220_P3.samples,5);
 assert.equal(VELOCITY_CINEMA_0220_P3.maxRadiusPx,7.5);
});
test("composer inserts exactly once between SMAA and final OutputPass",()=>{
 // A minimal faithful fake of THREE ShaderPass/EffectComposer.
 const input={name:"RenderPass"},bloom={name:"Bloom"},smaa={name:"SMAA"};
 const output={name:"OutputPass"};
 const composer={passes:[input,bloom,smaa,output],
  insertPass(p,i){this.passes.splice(i,0,p)},
  removePass(p){this.passes.splice(this.passes.indexOf(p),1)}};
 const pipeline={composer,output,
  makeShaderPass(shader){return {uniforms:shader.uniforms,enabled:true,dispose(){}};}
 };
 const Three={Vector2:class{
  constructor(x,y){this.x=x;this.y=y}
  set(x,y){this.x=x;this.y=y}
 }};
 const ctrl=installVelocityCinematography(Three,pipeline);
 assert.equal(ctrl.active,true);
 assert.equal(composer.passes[3],ctrl.pass);
 assert.equal(composer.passes[4],output);
 assert.equal(ctrl.stats().renderPasses,0);
 ctrl.update({playing:true,speedMultiplier:3.1,boostMultiplier:1.4});
 assert.equal(ctrl.stats().renderPasses,1);
 assert.equal(ctrl.stats().passIndex,3);
 assert.equal(ctrl.stats().outputIndex,4);
 ctrl.resize(1000,600,1.25);
 assert.equal(ctrl.pass.uniforms.uCinemaPixelSize.value.x,1/1250);
 assert.equal(ctrl.pass.uniforms.uCinemaPixelSize.value.y,1/750);
 ctrl.setComparison(0);assert.equal(ctrl.stats().enabled,false);
 ctrl.setComparison(1);assert.equal(ctrl.stats().enabled,true);
 ctrl.setQualityLevel(3);assert.equal(ctrl.stats().enabled,false);
 ctrl.setQualityLevel(0);assert.equal(ctrl.stats().enabled,true);
 ctrl.update({playing:false,speedMultiplier:4,boostMultiplier:1.4});
 assert.equal(ctrl.stats().renderPasses,0);
 ctrl.dispose();
 assert.equal(composer.passes.length,4);
 assert.equal(composer.passes[3],output);
});
test("low-memory and classic keep unchanged compositor at no cost",()=>{
 const unchanged=[{name:"RenderPass"},{name:"Bloom"},{name:"SMAA"},
  {name:"OutputPass"}];
 const composer={passes:unchanged.slice(),insertPass(){throw Error("not allowed")}};
 const a=installVelocityCinematography({},{
  composer,output:composer.passes[3]},{lowMemory:true});
 const b=installVelocityCinematography({},{
  composer,output:composer.passes[3]},{enabled:false});
 assert.equal(a.stats().disabledReason,"low-memory");
 assert.equal(b.stats().disabledReason,"comparison");
 assert.equal(composer.passes.length,4);
});
test("new release preserves older 0.22.0 and 0.22.0.2 visual comparisons",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/velocityCinemaEnabled=cinematicNeonEnabled/);
 assert.match(game,/get\("velocityCinema"\)!=="classic"/);
 assert.match(game,/installVelocityCinematography/);
 assert.match(game,/__skyshiftVelocityCinemaFrameProof/);
 assert.match(game,/__skyshiftVelocityCinemaProbe/);
 assert.match(game,/setInternalPixelRatio\(targetDpr/);
 assert.match(game,/velocityCinematography\?\.setQualityLevel/);
 assert.match(game,/speedMultiplier:\(flight\?\.currentSpeed\?\?0\)\/Math\.max\(1,TRIAL\.startSpeed\)/);
 assert.match(game,/compareBeforeVelocityCinema:"\?velocityCinema=classic"/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.\d+/);
 assert.match(read("./index.html"),/0\.26\.\d+/);
});
test("physically unchanged ship, grip, HDR white core and performance cap",()=>{
 const c=VELOCITY_CINEMA_0220_P3;
 for(const k of ["newMeshes","newLights","newPhysics","newCameraChanges",
  "newDrawBatchesWhenIdle"])assert.equal(c[k],0);
 for(const k of ["gameplayUnchanged","zoneWaveUnchanged",
  "shipReadabilityProtected","roadReadabilityProtected",
  "exteriorSunSealRetained"])assert.equal(c[k],true);
 const game=read("./game-v0210.mjs");
 assert.match(game,/createRoadSolarSpillController/);
 assert.match(game,/installCinematicNeonLighting/);
 assert.match(game,/createPremiumRoadSurfaceController/);
 assert.match(game,/stepFlight/);
});

import {adaptiveVelocityFov,horizontalFov,normalizeVelocityExperience,readVelocityExperience,saveVelocityExperience} from "../../core/velocity-experience-settings.mjs";
import {velocityBlurTarget,installAdaptiveVelocityBlur} from "../../rendering/adaptive-velocity-blur.mjs";
test("0.29.4 mobile reference preserved, desktop correction bounded and speed responsive",()=>{
 const mobile=780/360;
 assert.equal(adaptiveVelocityFov(75,mobile,3),75);
 assert.equal(adaptiveVelocityFov(75,16/9,3,false),75);
 const slow=adaptiveVelocityFov(75,16/9,1),fast=adaptiveVelocityFov(75,16/9,3);
 assert.ok(fast>slow&&slow>75);assert.ok(fast<=84);
 assert.ok(horizontalFov(fast,16/9)>horizontalFov(75,16/9));
 assert.ok(adaptiveVelocityFov(80.5,1,3)<=88.5);
});
test("0.29.4 four blur modes, boost response and adaptive budget",()=>{
 const f={playing:true,speedMultiplier:2.4,boostMultiplier:1};
 assert.equal(velocityBlurTarget({...f,mode:"off"}),0);
 assert.equal(velocityBlurTarget({...f,playing:false}),0);
 const low=velocityBlurTarget({...f,mode:"low"}),medium=velocityBlurTarget({...f,mode:"medium"}),high=velocityBlurTarget({...f,mode:"high"});
 assert.ok(high>medium&&medium>low&&low>0);
 assert.ok(velocityBlurTarget({...f,boostMultiplier:1.4})>high);
 assert.ok(velocityBlurTarget({...f,adaptiveLevel:2})<high);
 assert.ok(velocityBlurTarget({playing:true,speedMultiplier:4,boostMultiplier:1.4})<=.085);
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 assert.deepEqual(normalizeVelocityExperience(),{motionBlur:"high",adaptiveCamera:true});
 saveVelocityExperience(storage,{motionBlur:"off",adaptiveCamera:false});
 assert.deepEqual(readVelocityExperience(storage),{motionBlur:"off",adaptiveCamera:false});
});
test("0.29.4 one HDR pass, idle bypass, projected craft and restoration",()=>{
 class V2{constructor(x,y){this.set(x,y)}set(x,y){this.x=x;this.y=y;}}
 const output={},smaa={},composer={passes:[{},smaa,output],insertPass(p,i){this.passes.splice(i,0,p)},removePass(p){this.passes.splice(this.passes.indexOf(p),1)}};
 const c=installAdaptiveVelocityBlur({Vector2:V2},{composer,output,makeShaderPass:s=>({uniforms:s.uniforms,enabled:true,dispose(){}})});
 assert.equal(c.stats().renderPasses,0);
 c.resize(780,360);c.update({playing:true,speedMultiplier:2.5,boostMultiplier:1.4,craftX:.65,craftY:.31,snap:true});
 assert.equal(c.stats().renderPasses,1);assert.equal(c.stats().passIndex,2);assert.equal(c.stats().outputIndex,3);
 assert.deepEqual(c.stats().craft,{x:.65,y:.31});assert.equal(c.stats().aspect,780/360);
 c.setMode("off");assert.equal(c.stats().renderPasses,0);
 c.setMode("high");c.update({playing:false});assert.equal(c.stats().renderPasses,0);
 c.dispose();assert.equal(composer.passes.length,3);
});

test("0.29.4.1 stronger modes start earlier, retain original modes exactly and respect caps",()=>{
 for(const speedMultiplier of [1,1.4,2,2.5,4])for(const boostMultiplier of [1,1.2,1.4])for(const adaptiveLevel of [0,1,2]){
  const frame={playing:true,speedMultiplier,boostMultiplier,adaptiveLevel};
  for(const mode of ["off","low","medium","high"])
   assert.equal(velocityBlurTarget({...frame,mode,extremeEnabled:true}),velocityBlurTarget({...frame,mode}));
  const high=velocityBlurTarget({...frame,mode:"high"});
  const ultra=velocityBlurTarget({...frame,mode:"ultra",extremeEnabled:true});
  const extreme=velocityBlurTarget({...frame,mode:"extreme",extremeEnabled:true});
  assert.ok(extreme>ultra&&ultra>high);
  assert.ok(ultra<=.13&&extreme<=.18);
 }
 const f={playing:true,speedMultiplier:4,boostMultiplier:1.4,extremeEnabled:true};
 assert.equal(velocityBlurTarget({...f,mode:"ultra"}),.13);
 assert.equal(velocityBlurTarget({...f,mode:"extreme"}),.18);
 assert.ok(velocityBlurTarget({...f,mode:"extreme",adaptiveLevel:2})<.18);
 assert.equal(velocityBlurTarget({...f,mode:"extreme",playing:false}),0);
 assert.equal(velocityBlurTarget({...f,mode:"extreme",extremeEnabled:false}),0);
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 saveVelocityExperience(storage,{motionBlur:"extreme",adaptiveCamera:true},true);
 assert.equal(readVelocityExperience(storage,true).motionBlur,"extreme");
 assert.equal(readVelocityExperience(storage,false).motionBlur,"high");
});
test("0.29.4.1 one five-tap pass; new mask resets to original on High and Off",()=>{
 class V2{constructor(x,y){this.set(x,y)}set(x,y){this.x=x;this.y=y;}}
 const output={},composer={passes:[{},output],insertPass(p,i){this.passes.splice(i,0,p)},removePass(p){this.passes.splice(this.passes.indexOf(p),1)}};
 const c=installAdaptiveVelocityBlur({Vector2:V2},{composer,output,makeShaderPass:s=>({uniforms:s.uniforms,enabled:true,dispose(){}})},{mode:"extreme",extremeEnabled:true});
 c.update({playing:true,speedMultiplier:2,boostMultiplier:1.4,snap:true});
 assert.equal(c.stats().version,"0.29.4.1");assert.equal(c.stats().samples,5);
 assert.equal(c.stats().renderPasses,1);assert.equal(c.stats().peripheralExpansion,1);
 c.setMode("ultra");assert.equal(c.stats().peripheralExpansion,.65);
 c.setMode("high");assert.equal(c.stats().peripheralExpansion,0);
 c.setMode("off");assert.equal(c.stats().renderPasses,0);
 c.dispose();assert.equal(composer.passes.length,2);
});
