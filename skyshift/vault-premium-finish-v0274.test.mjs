import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {VAULT_PREMIUM_FINISH_0274,patchVaultPremiumPhysical0274,
 patchVaultPremiumSource0274,patchVaultPremiumRail0274,
 vaultPremiumFinishAudit0274}
 from "./vault-premium-finish-v0274.mjs";
const source=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const PBR=[
 "#include <common>",
 "varying vec2 vVaultMaterialCoord0271;",
 "varying vec2 vLocalMask0261;",
 "#include <color_fragment>",
 "#include <roughnessmap_fragment>",
 "#include <metalnessmap_fragment>"
].join("\n");
const EMISSIVE="#include <common>\nfloat v27Warm=0.0;\n"+
 "diffuseColor.rgb*=mix(1.0,v27Source,uVaultFixtureResponse0273);";
const RAIL="#include <common>\n"+
 "varying float vVaultRailMask0273;\n"+
 "#include <metalnessmap_fragment>";
test("0.27.4 reuses every older source and retains both High and mobile real panels",()=>{
 const a=VAULT_PREMIUM_FINISH_0274;
 assert.equal(a.version,"0.27.4");
 assert.equal(a.lengthMeters,3400);
 assert.equal(a.highPanelBayMeters,22);
 assert.equal(a.priorPanelMeshesRetained,true);
 assert.equal(a.largeMobilePanelSilhouetteRetained,true);
 for(const k of ["priorSkylineShadersRetained","priorLocalSourcesRetained",
  "priorEmissiveFixturesRetained","noOutdoorLights","noAddedDrawCalls",
  "noNewTextures","noNewGeometry","noNewShaderLights",
  "noPostprocess","noNewColliders","physicsUnchanged",
  "gripUnchanged","shipUnchanged","roadUnchanged",
  "otherTracksUnchanged"])assert.equal(a[k],true,k);
});
test("all original 0.26.x metal GGX hooks remain, while 22m finish stays in real track metres",()=>{
 for(const mobile of [false,true])for(const role of ["panel","rib"]){
  const x=patchVaultPremiumPhysical0274(PBR,{mobile,role});
  assert.match(x,/uVaultPremiumFinish0274/);
  assert.match(x,/vVaultMaterialCoord0271\.x\+1\.6\)\/22\.0/);
  assert.match(x,/vLocalMask0261/);
  assert.match(x,/vf4TargetR/);
  assert.match(x,/roughnessFactor=mix/);
  assert.match(x,/diffuseColor\.rgb\*=mix/);
  assert.match(x,/metalnessFactor=mix/);
  assert.equal(x.includes("vf4Cell="),!mobile);
  for(const hook of ["#include <common>","#include <color_fragment>",
   "#include <roughnessmap_fragment>",
   "#include <metalnessmap_fragment>"])
   assert.ok(x.includes(hook));
  assert.ok(!x.includes("PointLight"));
 }
 assert.throws(()=>patchVaultPremiumPhysical0274(PBR,{role:"road"}));
 assert.throws(()=>patchVaultPremiumPhysical0274("#include <common>"));
});
test("the existing cyan / amber emitter pixels are reshaped without new light geometry",()=>{
 for(const mobile of [false,true]){
  const x=patchVaultPremiumSource0274(EMISSIVE,{mobile});
  assert.match(x,/uVaultPremiumFinish0274/);
  assert.match(x,/vf4SourceBalance/);
  assert.match(x,/v27Warm/);
  assert.match(x,/diffuseColor.rgb\*=mix\(1.0,v27Source,uVaultFixtureResponse0273\)/);
  assert.ok(!x.includes("PointLight"));
 }
 assert.throws(()=>patchVaultPremiumSource0274(""));
});
test("rail finish only reshapes roughness of existing near-source GGX",()=>{
 for(const mobile of [false,true]){
  const x=patchVaultPremiumRail0274(RAIL,{mobile});
  assert.match(x,/roughnessFactor=mix/);
  assert.match(x,/vVaultRailMask0273/);
  assert.match(x,/uVaultPremiumFinish0274/);
  assert.match(x,/#include <metalnessmap_fragment>/);
 }
 assert.throws(()=>patchVaultPremiumRail0274("#include <common>"));
});
test("the actual 0.27.3 controller remains functional with opt-in 0.27.4 shader finish",()=>{
 const f=source("./vault-full-lighting-v0273.mjs"),g=source("./game-v0210.mjs");
 assert.match(f,/finishEnabled=false/);
 assert.match(f,/patchVaultPremiumPhysical0274\(mapped/);
 assert.match(f,/patchVaultPremiumSource0274/);
 assert.match(f,/patchVaultPremiumRail0274/);
 assert.match(f,/setFinishComparison\(v\)/);
 assert.match(g,/vaultPremiumFinishEnabled=vaultFullLightingEnabled/);
 assert.match(g,/installVaultFullLighting0273/);
 assert.match(g,/finishEnabled:vaultPremiumFinishEnabled/);
 assert.match(g,/vaultPremiumFinishComparison:"\?vaultFinish=classic"/);
 assert.match(g,/__skyshiftVaultFinishFrameProof/);
 assert.match(g,/selected==="vault"\?"0\.27\.4"/);
 assert.match(source("./index.html"),/Premium Tunnel Cohesion & Finish · 0\.27\.4/);
});
test("new finish QA is a true independent A/B of 0.27.3, not a physics feature",()=>{
 const t=vaultPremiumFinishAudit0274(true,1,false);
 assert.equal(t.active,true);
 assert.equal(t.enabledAmount,1);
 const b=vaultPremiumFinishAudit0274(true,0.4,true);
 assert.equal(b.mobile,true);
 assert.equal(b.enabledAmount,0.4);
 const off=vaultPremiumFinishAudit0274(false,1,true);
 assert.equal(off.enabledAmount,0);
 for(const k of ["sculptedPanelsRetained","originalFixtureBaysRetained",
  "onlyVault","priorGGXRetained"])assert.equal(t[k],true,k);
 for(const k of ["atlasCountAdded","worldLightsAdded","drawCallsAdded",
  "geometryAdded","collidersAdded","shaderLightSamplesAdded",
  "postprocessAdded"])assert.equal(t[k],0,k);
});
