import test from "node:test";
import assert from "node:assert/strict";
import {STABILITY_0286,reflectionStabilityEnabled0286,
 patchPhysicalStability0286,patchSubstrateStability0286,
 patchCoveDefinition0286,patchAmberFoot0286,
 wrapStabilityShader0286,installReflectionStability0286}
 from "../../tunnel/reflection-stability-strips-v0286.mjs";
test("only Vault 0.28.6+ can opt into stabilised real source; previous builds and Skyline unchanged",()=>{
 for(const version of ["0.28.0","0.28.1","0.28.2","0.28.3","0.28.4","0.28.5"])
  assert.equal(reflectionStabilityEnabled0286("?track=vault&v="+version),false);
 for(const track of ["skyline","aurora"])
  assert.equal(reflectionStabilityEnabled0286("?track="+track+"&v=0.28.6"),false);
 assert.equal(reflectionStabilityEnabled0286("?track=vault&v=0.28.6"),true);
 assert.equal(reflectionStabilityEnabled0286("?track=vault&v=0.28.7"),true);
 assert.equal(reflectionStabilityEnabled0286("?track=vault&v=0.28.6&reflectionStability=classic"),false);
 for(const flag of ["physicsUntouched","gripUntouched","boostUntouched",
  "roadUntouched","skylineUntouched","originalGGXKept"].filter(x=>x in STABILITY_0286))
  assert.ok(STABILITY_0286[flag],flag);
 assert.equal(STABILITY_0286.extraDrawCalls,0);
});
const pbr="#include <common>\nvarying vec2 vPbrSection0260;"+
 "\nroughnessFactor=mix(roughnessFactor,m262R,uPremiumMetal0262);"+
 "\nfloat m262Amp=0.21;"+
 "\nRE_Direct(pbrFixture0260,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);"+
 "\nRE_Direct(l261Cool,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);"+
 "\n#include <lights_physical_fragment>";
test("original native GGX remains intact; roof roughness and normal derivative filtering cap subpixel shimmer",()=>{
 const f=patchPhysicalStability0286(pbr,{role:"panel",mobile:false});
 for(const anchor of ["uReflectionStability0286",
  "st286Roof=smoothstep(21.2,27.0,vPbrSection0260.y)",
  "length(dFdx(normal))+length(dFdy(normal))",
  "roughnessFactor=mix(roughnessFactor",
  "float m262Amp=mix(0.21,0.084,uReflectionStability0286)",
  "RE_Direct(pbrFixture0260","RE_Direct(l261Cool"])
  assert.ok(f.includes(anchor),anchor);
 assert.ok(f.includes("#include <lights_physical_fragment>"));
 assert.ok(!f.includes("vec3(1.0,1.0,1.0)"));
 const mobile=pbr.replace("float m262Amp=0.21;","");
 const filtered=patchPhysicalStability0286(mobile,{role:"panel",mobile:true});
 assert.ok(filtered.includes("0.450,0.525"));
 assert.ok(!filtered.includes("float m262Amp=mix"));
 assert.throws(()=>patchPhysicalStability0286("missing fragments"),/requires|missing/);
});
test("substrate satin smoothing retains original dual-tone palette and physical source masks",()=>{
 const fragment="#include <common>\nfloat m25Roof=0.0;"+
 "\nfloat s262Gain=clamp(1.0,0.76,1.20);"+
 "\n m25Final=clamp(m25Final*s262Gain,vec3(0.002),vec3(0.30));";
 const next=patchSubstrateStability0286(fragment,{role:"panel"});
 assert.ok(next.includes("m25Roof"));
 assert.ok(next.includes("s262Gain=mix(s262Gain"));
 assert.ok(next.includes("m25Final=clamp"));
 assert.throws(()=>patchSubstrateStability0286(fragment,{role:"nonsense"}),/invalid/);
});
test("only existing luminous source colors and original amber vertex alpha are adjusted; no white/additional fixture",()=>{
 const f="#include <common>\n#include <color_fragment>";
 const c=patchCoveDefinition0286(f);
 const a=patchAmberFoot0286(f);
 assert.ok(c.includes("mix(1.19,1.045,st286Warm)"));
 assert.ok(c.includes("diffuseColor.r-diffuseColor.b"));
 assert.ok(a.includes("pow(st286OldAlpha,0.82)*0.94"));
 assert.ok(!c.includes("vec3(1.0)"));
 assert.ok(!a.includes("vec3(1.0)"));
 assert.equal(STABILITY_0286.extraLights,0);
});
test("actual original 10 source modules support reversibility & same-frame material A/B",()=>{
 const make=(name,physical=false)=>({
  name,isMesh:true,material:{
   isMeshBasicMaterial:!physical,isMeshPhysicalMaterial:physical,
   onBeforeCompile(shader){
    shader.fragmentShader=physical?pbr:
     name.startsWith("Tunnel /")?
      "#include <common>\nfloat m25Roof=0.0;"+
       "\nfloat s262Gain=clamp(1.0,0.76,1.20);"+
       "\n m25Final=clamp(m25Final*s262Gain,vec3(0.002),vec3(0.30));":
      "#include <common>\n#include <color_fragment>";
   },
   customProgramCacheKey(){return "native"},
   opacity:.15,needsUpdate:false
  }
 });
 const children=[
  make("SKYSHIFT 0.26.0 P2 / true physical panel",true),
  make("SKYSHIFT 0.26.0 P2 / true physical rib",true),
  ...["HARDSURFACE_PANELS","CURVED_RIBS","CLOSED_SHELL",
   "STRUCTURAL_CONDUITS"].map(x=>make("Tunnel / "+x)),
  make("SKYSHIFT 0.26.0 / stable cyan cove emitters"),
  make("Tunnel / HALO")
 ];
 const foot=make("SKYSHIFT 0.28.1 / original joined amber arch feet");
 const group={children};
 const section={
  children:[foot],
  getObjectByName(name){
   return name==="SKYSHIFT · Tunnel Megastructure 0.21.1"?group:null;
  }
 };
 const old=children.map(m=>m.material.onBeforeCompile);
 const install=installReflectionStability0286(section,{enabled:true});
 assert.equal(install.active,true);
 assert.equal(install.stats().physicalCoats,2);
 assert.equal(install.stats().substrateLayers,4);
 assert.equal(install.stats().coveEmitterMaterials,1);
 assert.equal(install.stats().amberFootMaterials,1);
 assert.equal(install.stats().haloOpacity,.18);
 let shader={fragmentShader:"",uniforms:{}};
 children[0].material.onBeforeCompile(shader,{});
 assert.ok(shader.fragmentShader.includes("st286Roof"));
 assert.equal(shader.uniforms.uReflectionStability0286.value,1);
 install.setComparison(0);
 assert.equal(shader.uniforms.uReflectionStability0286.value,0);
 assert.equal(install.stats().haloOpacity,.15);
 install.setComparison(1);
 assert.equal(install.stats().haloOpacity,.18);
 install.dispose();install.dispose();
 children.forEach((m,i)=>assert.equal(m.material.onBeforeCompile,old[i]));
 assert.equal(installReflectionStability0286(section,{enabled:false}).active,false);
});
