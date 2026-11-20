// SKYSHIFT 0.24.2: original 0.24.1 road/shader ABI, local spectral
// reflections, exact-frame A/B and no physics/sun/white-crest regressions.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {patchRoadSolarSpillShader} from "./road-solar-spill-v02126.mjs";
import {patchPremiumRoadSurfaceShader} from "./premium-road-surface-v0215.mjs";
import {CINEMATIC_ROAD_0242,patchCinematicRoadReflectionShader,
 createCinematicRoadReflectionController}
 from "./cinematic-road-reflections-v0242.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
function roadFragment(){
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
function composed(mobile=false){
 const solar=patchRoadSolarSpillShader(roadFragment());
 const old=patchPremiumRoadSurfaceShader(solar);
 return {old,upgraded:patchCinematicRoadReflectionShader(old,{mobile})};
}
test("authentic 0.21.2.6 -> 0.21.5 -> 0.24.2 reflection chain preserves wave",()=>{
 for(const mobile of [false,true]){
  const {old,upgraded}=composed(mobile);
  assert.doesNotMatch(old,/uCinematicRoad0242/);
  assert.match(upgraded,/uniform float uCinematicRoad0242/);
  assert.match(upgraded,/roadPortalDistance/);
  assert.match(upgraded,/float r42Wall=/);
  assert.match(upgraded,/float r42Crown=/);
  assert.match(upgraded,/float r42Long=/);
  assert.match(upgraded,/vec3 r42Tint=clamp\(mix\(zoneAccent,waveSpectrum/);
  assert.match(upgraded,/float r42Keep=clamp\(\(1\.0-0\.94\*whiteCore\)/);
  assert.match(upgraded,/1\.0-0\.92\*clamp\(whiteBloom/);
  assert.match(upgraded,/totalEmissiveRadiance\+=r42Mask\*r42Colored/);
  assert.match(upgraded,/totalEmissiveRadiance\+=zoneAccent\*premiumRoadColoredBounce\*0\.65/);
  assert.match(upgraded,/reflectedLight\.directDiffuse \*= mix\(1\.0,0\.08,roadSolarMask\)/);
  assert.match(upgraded,/float whiteCore=0\.0/);
  assert.match(upgraded,/uPremiumRoadSurfaceSeal/);
  assert.match(upgraded,/uRoadSolarSpillSeal/);
  assert.match(upgraded,/uTrackAccent/);
  assert.match(upgraded,/zoneGuide/);
  assert.match(upgraded,/spine/);
  assert.equal((upgraded.match(/uniform float uCinematicRoad0242;/g)||[]).length,1);
  assert.doesNotMatch(upgraded,/gl_FragColor\.rgb\s*\*=|sunPosition|new DirectionalLight|vec3\(1\.0\)\*r42Colored/);
  assert.equal(upgraded.includes("float whiteCore=0.0"),old.includes("float whiteCore=0.0"));
  if(mobile){
   assert.match(upgraded,/r42Long=1\.0-smoothstep\(1\.0,26\.0,roadPortalDistance\)/);
   assert.match(upgraded,/r42Mask\*r42Colored\*0\.72/);
  }else{
   assert.match(upgraded,/r42Long=exp\(-0\.5\*pow\(roadPortalDistance\/25\.0,2\.0\)\)/);
   assert.match(upgraded,/r42Mask\*r42Colored\*1\.0/);
  }
 }
});
test("disabled 0.24.2 remains exact 0.24.1 original road shader and visuals",()=>{
 assert.throws(()=>patchCinematicRoadReflectionShader("#include <common>"));
 assert.throws(()=>patchCinematicRoadReflectionShader(roadFragment()));
 const material={
  isMeshStandardMaterial:true,
  onBeforeCompile(shader){shader.fragmentShader=composed(false).old;},
  customProgramCacheKey(){return "original-finish-road";},needsUpdate:false
 };
 const controller=createCinematicRoadReflectionController(material,{lowMemory:false});
 const shader={fragmentShader:roadFragment(),uniforms:{}};
 material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uCinematicRoad0242.value,1);
 assert.match(material.customProgramCacheKey(),/cinematic-road-0242-high/);
 controller.setComparison(0);
 assert.equal(shader.uniforms.uCinematicRoad0242.value,0);
 controller.setComparison(1);
 assert.equal(shader.uniforms.uCinematicRoad0242.value,1);
 controller.setComparison(15);
 assert.equal(controller.stats().seal,1);
 controller.setComparison(-5);
 assert.equal(controller.stats().seal,0);
 assert.equal(controller.stats().newDrawCalls,0);
 assert.equal(controller.stats().roadSolarSealRetained,true);
 assert.equal(controller.stats().whiteCoreUnchanged,true);
 assert.throws(()=>createCinematicRoadReflectionController({...material,isMeshStandardMaterial:false}));
});
test("no geometry, neutral sun, extra draw passes, steering, ship, GRIP or physics",()=>{
 const p=CINEMATIC_ROAD_0242;
 for(const key of ["additionalDrawCalls","additionalLights","additionalTextures",
  "additionalMeshes","additionalRenderPasses"])assert.equal(p[key],0);
 for(const key of ["changesRoadGeometry","changesRoadColliders",
  "changesGrip","changesPhysics","changesShip","changesRails",
  "changesCamera","changesWorldLighting"])assert.equal(p[key],false);
 for(const key of ["preservesGuideEmission","preservesWhiteCore",
  "preservesRoadSolarSeal","preservesZoneWave","usesOriginalDeck",
  "usesOriginalPortalPositions"])assert.equal(p[key],true);
 assert.equal(p.fullTunnelStart,0);
 assert.equal(p.fullTunnelSolidUntil,340);
 assert.equal(p.fullTunnelEnd,368);
 assert.equal(p.comparison,"?cinematicRoad=classic");
});
test("0.24.2 game boot, old 0.24.1 A/B and native stage wave hooks",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/cinematicRoadEnabled=premiumRoadEnabled/);
 assert.match(game,/cinematicRoadEnabled\?/);
 assert.match(game,/createCinematicRoadReflectionController\(premiumSurface\.material/);
 assert.match(game,/__skyshiftCinematicRoadProbe/);
 assert.match(game,/__skyshiftCinematicRoadFrameProof/);
 assert.match(game,/roadMask,emptyMask/);
 assert.match(game,/new THREE.MeshBasicMaterial\(\{/);
 assert.match(game,/compareBeforeCinematicRoad:"\?cinematicRoad=classic"/);
 assert.match(game,/roadSolarSpill=roadSolarEnabled\?createRoadSolarSpillController/);
 assert.match(game,/premiumRoadSurface=premiumRoadEnabled\?createPremiumRoadSurfaceController/);
 assert.match(game,/surfaceCraftEnabled\?installPremiumSurfaceCraftsmanship/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.25\.0/);
 assert.match(read("./index.html"),/SKYSHIFT.*0\.25\.0/);
});
