// SKYSHIFT 0.21.5 — premium surface shader, road-only coverage and ABI.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PREMIUM_ROAD_SURFACE_0215,premiumRoadInteriorMask,
 patchPremiumRoadSurfaceShader,createPremiumRoadSurfaceController}
 from "./premium-road-surface-v0215.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
function mockFragment(){return [
 "#include <common>",
 "varying vec2 vTrackCoord;",
 "float trackS = vTrackCoord.x;",
 "float trackL = vTrackCoord.y;",
 "float absL = abs(trackL);",
 "vec3 zoneBase=uTrackBase,zoneBand=uTrackBand,zoneAccent=uTrackAccent;",
 "float sideBand=0.0,flowZone=0.0;",
 "float whiteCore=0.0,whiteBloom=0.0,whiteFilaments=0.0;",
 "vec3 road = mix(zoneBase, zoneBand, sideBand * (0.27 + 0.24 * flowZone));",
 "float guided=1.0;",
 "road=mix(road,zoneGuide,guided);",
 "diffuseColor.rgb = road;",
 "#include <metalnessmap_fragment>",
 "#include <lights_fragment_end>",
 "#include <emissivemap_fragment>",
 "totalEmissiveRadiance += zoneGuide * guided * 0.24;",
 "vec3 wcKeepCrest=vec3(whiteCore);",
 "reflectedLight.directDiffuse*=.08;"
].join("\n")}
test("material only exists in 368m sealed tunnel and exits smoothly",()=>{
 for(const s of [0,90,165,273,340])assert.equal(premiumRoadInteriorMask(s),1);
 for(const s of [-10,368,500,1200,NaN])assert.equal(premiumRoadInteriorMask(s),0);
 assert.ok(premiumRoadInteriorMask(356)<1&&premiumRoadInteriorMask(356)>0);
 assert.ok(premiumRoadInteriorMask(363)<premiumRoadInteriorMask(356));
});
test("world-arc road grain, panel seams and subtle native neon shade preserved",()=>{
 const original=mockFragment(),modified=patchPremiumRoadSurfaceShader(original);
 assert.match(modified,/uniform float uPremiumRoadSurfaceSeal/);
 assert.match(modified,/roadPanelPhase=mod\(trackS/);
 assert.match(modified,/roadMaterialShade/);
 assert.match(modified,/roadShoulderSheen/);
 assert.match(modified,/premiumRoadColoredBounce/);
 assert.match(modified,/zoneAccent\*premiumRoadColoredBounce/);
 assert.match(modified,/roadPortalDistance/);
 assert.equal((modified.match(/exp\(/g)||[]).length,1,
  "only one authored portal bounce Gaussian per shaded fragment");
 assert.match(modified,/float whiteCore=0\.0/);
 assert.match(modified,/wcKeepCrest/);
 assert.match(modified,/zoneGuide \* guided \* 0\.24/);
 assert.match(modified,/reflectedLight\.directDiffuse\*=\.08/);
 assert.equal((modified.match(/#include <metalnessmap_fragment>/g)||[]).length,1);
 assert.equal((modified.match(/#include <emissivemap_fragment>/g)||[]).length,1);
 assert.match(modified,/roughnessFactor=mix\(roughnessFactor,0\.67/);
 assert.match(modified,/metalnessFactor=mix\(metalnessFactor,0\.22/);
 assert.doesNotMatch(modified,/gl_FragColor\.rgb\s*\*=/);
 assert.throws(()=>patchPremiumRoadSurfaceShader("#include <common>"));
});
test("safe exact-frame A/B uniform without altering road material identities",()=>{
 const original=()=>{};
 const mat={isMeshStandardMaterial:true,onBeforeCompile:original,
  customProgramCacheKey(){return "road-premium"},needsUpdate:false};
 const s={uniforms:{},fragmentShader:mockFragment()};
 const ctrl=createPremiumRoadSurfaceController(mat,{lowMemory:true});
 assert.ok(mat.needsUpdate);
 mat.onBeforeCompile(s,{});
 assert.equal(s.uniforms.uPremiumRoadSurfaceSeal.value,1);
 const key=mat.customProgramCacheKey();
 assert.match(key,/premium-road-0215/);
 ctrl.setComparison(0);
 assert.equal(s.uniforms.uPremiumRoadSurfaceSeal.value,0);
 ctrl.setComparison(1);
 assert.equal(s.uniforms.uPremiumRoadSurfaceSeal.value,1);
 assert.equal(mat.customProgramCacheKey(),key);
 assert.equal(ctrl.stats().lowMemory,true);
 assert.equal(ctrl.stats().roadSolarSealRetained,true);
 assert.throws(()=>createPremiumRoadSurfaceController({...mat,isMeshStandardMaterial:false}));
});
test("release toggles exact old 0.21.4 and preserves 0.21.2.6 light seal",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/premiumRoadEnabled=roadSolarEnabled/);
 assert.match(game,/get\("premiumRoad"\)!=="classic"/);
 assert.match(game,/createPremiumRoadSurfaceController/);
 assert.match(game,/__skyshiftPremiumRoadFrameProof/);
 assert.match(game,/createRoadSolarSpillController/);
 assert.match(game,/whiteCoreContainment=whiteCoreEnabled/);
 assert.match(game,/shipWhiteSpill=shipWhiteSpillEnabled/);
 assert.match(game,/installIntegratedNeonFlow/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.23\.3/);
 assert.match(read("./index.html"),/0\.23\.3/);
 assert.equal(PREMIUM_ROAD_SURFACE_0215.newDrawBatches,0);
 assert.equal(PREMIUM_ROAD_SURFACE_0215.collidersAdded,0);
 assert.equal(PREMIUM_ROAD_SURFACE_0215.gripChanged,false);
 assert.equal(PREMIUM_ROAD_SURFACE_0215.newRenderPasses,0);
});
