import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CIRCUIT} from "./trial-v0165.mjs";
import {SHADOW_TUNNEL,tunnelIntensityAt} from "./shadow-tunnel-v0160.mjs";
import {blackoutLevelsAt,createTunnelBlackoutController} from "./tunnel-blackout-v0160.mjs";
import {UNIFIED_TUNNEL_LIGHTING_1,neonGalleryMaskAt,unifiedTunnelLevelsAt,
 createUnifiedTunnelLightingController} from "./unified-tunnel-lighting-v1.mjs";

const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<=eps,`${a} ≠ ${b}`);
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test("1.0: only spatial world-light policy differs; legacy shadow retained",()=>{
 const c=UNIFIED_TUNNEL_LIGHTING_1;
 assert.equal(c.neonStart,0);assert.equal(c.neonEnd,368);
 assert.equal(c.newDynamicLights,0);assert.equal(c.newDrawCalls,0);
 assert.equal(c.newRenderPasses,0);assert.equal(c.newMaterials,0);
 for(const role of ["preservesOldBlackout","preservesLocalEngineLights",
  "preservesNativeNeon","preservesWhiteCore","preservesFogSeal",
  "preservesRoadSolarSeal","preservesShipSpillSeal"])
  assert.equal(c[role],true,role);
 for(const key of ["changesPhysics","changesTrack","changesCamera"])
  assert.equal(c[key],false,key);
 assert.equal(c.shadowStart,SHADOW_TUNNEL.start);
 assert.equal(c.shadowEnd,SHADOW_TUNNEL.end);
 assert.equal(typeof createTunnelBlackoutController,"function");
});
test("1.0: gallery 0-368m is smooth and resets at lap boundaries",()=>{
 for(let lap=0;lap<3;lap++){
  const start=lap*CIRCUIT.lapLength;
  near(neonGalleryMaskAt(start),0);
  const a=neonGalleryMaskAt(start+7),b=neonGalleryMaskAt(start+14);
  assert.ok(a>0&&a<1);near(b,1);
  for(const s of [30,100,165,240,337])
   near(neonGalleryMaskAt(start+s),1);
  const exit=neonGalleryMaskAt(start+354);
  assert.ok(exit>0&&exit<1);
  near(neonGalleryMaskAt(start+368),0);
  near(neonGalleryMaskAt(start+500),0);
 }
 assert.equal(neonGalleryMaskAt(NaN),0);
 assert.equal(neonGalleryMaskAt(-Infinity),0);
});
test("1.0: keep exact legacy shadow room for all laps, outside untouched",()=>{
 for(let lap=0;lap<3;lap++){
  for(const offset of [SHADOW_TUNNEL.start,SHADOW_TUNNEL.start+15,
     SHADOW_TUNNEL.start+120,SHADOW_TUNNEL.end-15,SHADOW_TUNNEL.end,
     950,1450,3010]){
   const s=lap*CIRCUIT.lapLength+offset;
   assert.deepEqual(unifiedTunnelLevelsAt(s),blackoutLevelsAt(s));
  }
 }
 assert.equal(tunnelIntensityAt(2450),1);
});
test("1.0: neon-gallery world PBR lights strongly dim but emissives and engines are untouched",()=>{
 const c=UNIFIED_TUNNEL_LIGHTING_1;
 const a=unifiedTunnelLevelsAt(165),old=blackoutLevelsAt(165);
 near(a.darkness,1);
 near(a.ambient,c.neonAmbientAtCore);
 near(a.key,c.neonKeyAtCore);
 near(a.fill,c.neonFillAtCore);
 near(old.ambient,1);near(old.key,1);near(old.fill,1);
 for(const k of ["roadBody","roadBaseEmissive","bladeTip","background"])
  near(a[k],old[k]);
 assert.deepEqual(unifiedTunnelLevelsAt(165,undefined,c,0),old);
 assert.equal(unifiedTunnelLevelsAt(165).key<.50,true);
 const entry=unifiedTunnelLevelsAt(7);
 assert.ok(entry.key>a.key&&entry.key<1);
 assert.ok(unifiedTunnelLevelsAt(356).key>a.key);
});
test("1.0: shared controller retains engine lights and A/B restores 3 PBR baselines",()=>{
 const lights={ambient:{intensity:2},key:{intensity:3},fill:{intensity:.6}};
 const engine=[{intensity:5},{intensity:6}];
 const tips={baseOpacity:.7,material:{opacity:.7}};
 const star={isPoints:true,material:{opacity:.35}};
 const controller=createUnifiedTunnelLightingController({
  worldLights:lights,camera:{children:[star]},bladeTips:tips});
 controller.apply(165);
 near(lights.ambient.intensity,2*.72);
 near(lights.key.intensity,3*.38);
 near(lights.fill.intensity,.6*.56);
 near(star.material.opacity,.35);
 near(tips.material.opacity,.7);
 assert.deepEqual(engine,[{intensity:5},{intensity:6}]);
 controller.setComparison(0);
 near(lights.ambient.intensity,2);
 near(lights.key.intensity,3);
 near(lights.fill.intensity,.6);
 controller.setComparison(1);
 near(lights.key.intensity,3*.38);
 const audit=controller.audit();
 assert.equal(audit.externalLightControllerCount,1);
 assert.equal(audit.galleryAddedShaders,0);
 controller.apply(2450);
 near(lights.ambient.intensity,2*.004);
 near(lights.key.intensity,3*.008);
 near(lights.fill.intensity,.6*.004);
 controller.apply(600);
 near(lights.key.intensity,3);
 controller.reset();
 near(lights.ambient.intensity,2);
 near(lights.key.intensity,3);
 near(lights.fill.intensity,.6);
});
test("1.0: original road/ship shaders, neon and gameplay remain in place",()=>{
 const game=read("./game-v0210.mjs");
 const old=read("./tunnel-blackout-v0160.mjs");
 const unified=read("./unified-tunnel-lighting-v1.mjs");
 assert.match(game,/\?unifiedLighting=classic/);
 assert.match(game,/unifiedTunnelLightingEnabled=tunnelMegaEnabled&&exteriorSealEnabled/);
 assert.match(game,/createUnifiedTunnelLightingController:createTunnelBlackoutController/);
 assert.match(game,/__skyshiftUnifiedLightingProbe/);
 assert.match(game,/__skyshiftUnifiedLightingFrameProof/);
 assert.match(game,/installBlackoutRoadShading\(premiumSurface.material\)/);
 assert.match(game,/createRoadSolarSpillController\(premiumSurface.material\)/);
 assert.match(game,/createShipWhiteSpillController\(THREE,ship\)/);
 assert.match(game,/createNeonPipeline\(THREE,renderer,scene,camera/);
 assert.match(old,/levelsAt=blackoutLevelsAt/);
 assert.match(old,/Object.assign\(levels,levelsAt\(s,config\)\)/);
 assert.match(unified,/createTunnelBlackoutController\(/);
 assert.doesNotMatch(unified,/new THREE\.DirectionalLight|new THREE\.PointLight/);
});
