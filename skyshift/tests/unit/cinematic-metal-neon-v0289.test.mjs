// SKYSHIFT 0.28.9 — isolated real source shaders and exact 0.28.8 rollback.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CINEMATIC_METAL_0289,cinematicMetalEnabled0289,
 cinematicComponentEnabled0289,patchSubstrateContrast0289,
 patchPhysicalStreaks0289,patchRoadGlints0289,
 wrapCinematicMetalShader0289,installCinematicTunnel0289,
 installCinematicRoad0289}
 from "../../rendering/cinematic-metal-neon-v0289.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("release applies to Vault 0.28.9+ only, 0.28.8 and older stay exact",()=>{
 for(const v of ["0.28.1","0.28.5","0.28.6","0.28.7","0.28.8"])
  assert.equal(cinematicMetalEnabled0289("?track=vault&v="+v),false);
 for(const v of ["?track=skyline&v=0.28.9","?track=aurora&v=0.28.9",
  "?track=vault&v=0.28.9&cinematicMetal=classic",
  "?track=vault&v=0.28.9&cinematicMetal=off"])
  assert.equal(cinematicMetalEnabled0289(v),false,v);
 assert.equal(cinematicMetalEnabled0289("?track=vault&v=0.28.9"),true);
 assert.equal(cinematicMetalEnabled0289("?track=vault&v=0.28.10"),true);
 for(const c of CINEMATIC_METAL_0289.independentControls){
  assert.equal(cinematicComponentEnabled0289(c,"?track=vault&v=0.28.9"),true);
  assert.equal(cinematicComponentEnabled0289(c,"?track=vault&v=0.28.9&"+c+"=classic"),false);
 }
});
const S=["#include <common>","uniform float uReflectionStability0286;",
 "float m25Wall=0.2;","float m25Roof=0.2;",
 "float m25Cavity=0.2;","float m25Bevel=0.2;",
 " m25Final=clamp(m25Final*s262Gain,vec3(0.002),vec3(0.30));"].join("\n");
test("actual graphite m25Final is darkened AFTER original stable 0.26.2 finish",()=>{
 for(const role of ["panel","rib","shell","conduit"]){
  const shader=patchSubstrateContrast0289(S,{role});
  assert.match(shader,/m25Final\*=mix/);
  assert.match(shader,/cm289Lamp/);
  assert.match(shader,/cm289Cavity/);
  assert.match(shader,/uniform float uCinematicContrast0289/);
  assert.equal(shader.split("m25Final=clamp(m25Final*s262Gain").length-1,1);
 }
 assert.throws(()=>patchSubstrateContrast0289(S,{role:"road"}));
 assert.throws(()=>patchSubstrateContrast0289(S.replace("float m25Roof=","float nope=")));
});
function mockPhysical(mobile=false){
 const c=mobile?2:3,w=mobile?1:2;
 return [
  "#include <common>","#include <color_fragment>",
  "#include <lights_physical_fragment>",
  "uniform float uPrecisionNeon0288;",
  "uniform float uReflectionStability0286;",
  "varying vec2 vPbrSection0260;",
  "varying float vPbrTrack0260;",
  "varying vec2 vLocalMask0261;",
  "float r65WallC=0.5;","float r65WallW=0.5;",
  "float l261CoolDistance=3.0;","float l261WarmDistance=4.0;",
  ...Array(c).fill("RE_Direct(l261Cool,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);"),
  ...Array(w).fill("RE_Direct(l261Warm,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);")
 ].join("\n");
}
test("real native GGX samples stay 5 High / 3 4GB; 0.28.6 ceiling anti-glitter intact",()=>{
 for(const mobile of [false,true])for(const role of ["panel","rib"]){
  const shader=patchPhysicalStreaks0289(mockPhysical(mobile),{mobile,role});
  const taps=mobile?3:5;
  assert.equal((shader.match(/RE_Direct\(l261/g)||[]).length,taps);
  assert.equal((shader.match(/color\*=1\.0\+uCinematicStrips0289/g)||[]).length,taps);
  assert.match(shader,/r65WallC/);
  assert.match(shader,/r65WallW/);
  assert.match(shader,/smoothstep\(20\.3,24\.1,vPbrSection0260\.y\)/);
  assert.match(shader,/roughnessFactor=mix/);
  assert.match(shader,/uCinematicContrast0289/);
 }
 assert.throws(()=>patchPhysicalStreaks0289(mockPhysical().replace("r65WallC","broken"),{role:"panel"}));
});
const ROAD=[
 "#include <common>","#include <color_fragment>",
 "uniform float uRoadRebuild0263;",
 "varying vec2 vTrackCoord;",
 "float roadSolarMask=1.0;",
 "float r263Grain=0.5;",
 "float r263Interior=1.0;",
 "vec2 r263Source=vec2(0.2);",
 "float r263Keep=0.3;",
 "float r263CoveBand=0.4;",
 "float r263AmberBand=0.4;",
 "vec3 r263Convolved=vec3(0.3);",
 "metalnessFactor=mix(metalnessFactor,0.41,r263Interior);",
 "reflectedLight.directSpecular+=r263Convolved*(r263Keep);"
].join("\n");
test("road stays physically sourced and retains white guides without Reflector",()=>{
 for(const mobile of [false,true]){
  const s=patchRoadGlints0289(ROAD,{mobile});
  assert.match(s,/cm289Wet/);
  assert.match(s,/cm289CyanBand/);
  assert.match(s,/cm289AmberBand/);
  assert.match(s,/r263Source\.x/);
  assert.match(s,/r263Convolved\+=uCinematicRoad0289/);
  assert.equal((s.match(/reflectedLight\.directSpecular\+=r263Convolved\*/g)||[]).length,1);
 }
 assert.throws(()=>patchRoadGlints0289(ROAD.replaceAll("r263Keep","missing")));
 for(const x of ["additionalMeshes","additionalLights","additionalPasses",
  "additionalTextures","additionalSamples"])
  assert.equal(CINEMATIC_METAL_0289[x],0,x);
});
test("shared renderer uses original material instances and restores shader hooks",()=>{
 const mk=p=>({isMeshPhysicalMaterial:p==="physical",
  isMeshBasicMaterial:p==="substrate",isMeshStandardMaterial:p==="road",
  onBeforeCompile(){},customProgramCacheKey(){return "old";},
  needsUpdate:false});
 const coats=["panel","rib"].map(role=>({
  name:"SKYSHIFT 0.26.0 P2 / true physical "+role,
  material:mk("physical")}));
 const subs=["HARDSURFACE_PANELS","CURVED_RIBS","CLOSED_SHELL","STRUCTURAL_CONDUITS"]
  .map(n=>({name:"Tunnel / "+n,material:mk("substrate")}));
 const group={children:[...coats,...subs]};
 const section={getObjectByName:n=>n==="SKYSHIFT · Tunnel Megastructure 0.21.1"?group:null};
 const all=group.children.map(x=>x.material),saved=all.map(m=>m.onBeforeCompile);
 const tunnel=installCinematicTunnel0289(section,{enabled:true});
 assert.equal(tunnel.active,true);
 assert.equal(tunnel.stats().nativePhysicalCoats,2);
 tunnel.setComparison({contrast:1,strips:0.7});
 assert.deepEqual(tunnel.stats().strength,{contrast:1,strips:0.7});
 tunnel.setComparison({contrast:0,strips:0});
 assert.deepEqual(tunnel.stats().strength,{contrast:0,strips:0});
 tunnel.dispose();tunnel.dispose();
 all.forEach((m,i)=>assert.equal(m.onBeforeCompile,saved[i]));
 const mat=mk("road"),before=mat.onBeforeCompile;
 const road=installCinematicRoad0289({getObjectByName:()=>({material:mat})},{enabled:true,road:false});
 assert.equal(road.active,true);
 assert.equal(road.stats().strength.road,0);
 road.setComparison({road:1});
 assert.equal(road.stats().strength.road,1);
 road.dispose();road.dispose();
 assert.equal(mat.onBeforeCompile,before);
});
test("game integrates PMREM-safe zero-strength source followed by native 0.28.9 activation",()=>{
 const renderer=read("./true-shared-tunnel-renderer-v0281.mjs");
 const game=read("./game-v0210.mjs");
 const html=read("./index.html");
 assert.match(renderer,/installCinematicTunnel0289\(section/);
 assert.match(renderer,/contrast:false,strips:false/);
 assert.match(renderer,/setCinematicMetalComparison\(values\)/);
 assert.match(renderer,/item\.cinematic\?\.dispose/);
 assert.match(game,/cinematicRoadFinish=installCinematicRoad0289\(world/);
 assert.match(game,/road:false/);
 assert.ok(game.indexOf("pmremPipeline=installPmremReflectionPipeline0284")<
  game.indexOf("trueSharedVault?.setCinematicMetalComparison?.("));
 assert.match(game,/__skyshiftCinematicMetalFrames/);
 assert.match(game,/cinematicMetalReleaseEnabled\?" · 0\.28\.9"/);
 assert.match(html,/(?:Shared Straight-Only Edge Lighting Parity · 0\.28\.9\.1|Ceiling Fixture Placement & Glow Cohesion · 0\.28\.9\.2|Premium Arch Optics & Chromatic Road Reflections · 0\.28\.9\.3|Unified Light Sources & Road Layer Cleanup · 0\.28\.9\.4|Road Light Spill Continuity & Wave-Coupled Cove Lighting · 0\.28\.9\.5|Curve Surface Artifact & Transition Seam Cleanup · 0\.28\.9\.6|Startup Stability & Shared Resource Deduplication · 0\.28\.9\.7)/);
});
