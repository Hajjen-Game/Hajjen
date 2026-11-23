// SKYSHIFT 0.26.4.1 — Unified Light Response & Dark Titanium Rebalance
// Final optical correction after 0.26.4, using ONLY existing solar-isolated
// banked panels/ribs and physically located cyan/amber native GGX fixtures.
// No new lamps, sun/IBL, unbounded bloom, new texture or fullscreen passes.
// Darker graphite base, retained brushed micro detail and brighter COLOR-
// CORRECT fixture response on the same panels, not a global camera grade.
export const UNIFIED_METAL_LIGHT_02641=Object.freeze({
 version:"0.26.4.1",base:"0.26.4",
 id:"unified-local-metal-response-and-dark-titanium-02641",
 comparison:"?unifiedLight=classic",
 roles:["panel","rib","shell","conduit"],
 graphite:{panel:.74,rib:.83,shell:.88,conduit:.92},
 sourceSamples:"existing 0.26.0 PBR cyan+amber and 0.26.1 finite-area GGX",
 cyanCove:"original 0.26.0 persistent cyan cove, no new light",
 preservedRoadGGX:true,preservedMicroNormals:true,
 preservedRoofNeon:true,preservedNativeZoneWave:true,
 preservedSolarSeal:true,preservedWhiteCore:true,
 preservedStraightOnlyEdges:true,preservedConnectedAmberFloor:true,
 preservedCollision:true,preservedGRIP:true,preservedShip:true,
 preservedCamera:true,preservedPhysics:true,
 newMeshes:0,newDrawCalls:0,newDynamicLights:0,newTextures:0,
 newRenderPasses:0,SSRAdded:false,PMREMAdded:false,
 newReflectionSamples:0
});
const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,
 Number.isFinite(value)?value:min));
const COMMON="#include <common>";
const SUBSTRATE=" m25Final=clamp(m25Final*s262Gain,vec3(0.002),vec3(0.30));";
const DIRECT="RE_Direct(pbrFixture0260,geometryPosition";
const COOL="RE_Direct(l261Cool,geometryPosition";
const WARM="RE_Direct(l261Warm,geometryPosition";
const METAL_ROLES=["panel","rib"];
const SUBSTRATE_ROLES=["panel","rib","shell","conduit"];
const COATS_PREFIX="SKYSHIFT 0.26.0 P2 / true physical ";
const SUBSTRATE_NAMES={
 panel:"HARDSURFACE_PANELS",rib:"CURVED_RIBS",
 shell:"CLOSED_SHELL",conduit:"STRUCTURAL_CONDUITS"
};
export const COVE_NAME_02641="SKYSHIFT 0.26.0 / stable cyan cove emitters";
const response={
 high:{cyan:[1.22,1.26,1.30],warm:[1.32,1.26,1.16],
  localCyan:[1.19,1.22,1.24],localWarm:[1.27,1.21,1.15]},
 mobile:{cyan:[1.06,1.07,1.08],warm:[1.09,1.07,1.04],
  localCyan:[1.04,1.05,1.06],localWarm:[1.06,1.05,1.03]}
};
const glVec=(a)=>"vec3("+a.map(x=>x.toFixed(3)).join(",")+")";
// Uniform-driven local PBR source gains, not post-process coloration.
// Native RE_Direct physically applies GGX roughness, Fresnel and BRDF.
// The external white key, indirect IBL and white-core are still disabled
// upstream by the *existing* solar-isolated shader chain.
export function patchLocalResponse02641(vertex,fragment,{role="panel",mobile=false}={}){
 if(!METAL_ROLES.includes(role)||
  !fragment.includes(COMMON)||
  !fragment.includes("uniform sampler2D uMetalAtlas0262;")||
  !fragment.includes("uniform float uLocalReflections0261;")||
  !fragment.includes("vPbrCold0260")||
  !fragment.includes("vPbrWarm0260")||
  !fragment.includes("vec3 irradiance=vec3(0.0);")||
  !fragment.includes("vec3 iblIrradiance=vec3(0.0);")||
  !fragment.includes("roughnessFactor=mix(roughnessFactor,m262R,uPremiumMetal0262);"))
  throw Error("0.26.4.1 requires actual solar-isolated premium GGX, not a substitute shader");
 let physical=0,localCyan=0,localWarm=0;
 const gains=mobile?response.mobile:response.high;
 let source=fragment.replaceAll(DIRECT,match=>{
  const gain=physical++===0?gains.cyan:gains.warm;
  return "pbrFixture0260.color*=mix(vec3(1.0),"+glVec(gain)+
   ",uMetalLightResponse02641);\n"+match;
 });
 source=source.replaceAll(COOL,match=>{
  localCyan++;
  return "l261Cool.color*=mix(vec3(1.0),"+glVec(gains.localCyan)+
   ",uMetalLightResponse02641);\n"+match;
 });
 source=source.replaceAll(WARM,match=>{
  localWarm++;
  return "l261Warm.color*=mix(vec3(1.0),"+glVec(gains.localWarm)+
   ",uMetalLightResponse02641);\n"+match;
 });
 if(physical!==2||localCyan!==(mobile?2:3)||localWarm!==(mobile?1:2))
  throw Error("0.26.4.1 source mismatch: "+[physical,localCyan,localWarm]);
 source=source.replace(COMMON,
  COMMON+"\nuniform float uMetalLightResponse02641;");
 return {vertexShader:vertex,fragmentShader:source,sources:{
  original:physical,cyan:localCyan,warm:localWarm
 }};
}
export function patchTitaniumSubstrate02641(vertex,fragment,{role="panel",mobile=false}={}){
 if(!SUBSTRATE_ROLES.includes(role)||
  !fragment.includes(COMMON)||
  !fragment.includes(SUBSTRATE)||
  !fragment.includes("float m25Cavity=")||
  !fragment.includes("float m25Wall=")||
  !fragment.includes("float m25Roof=")||
  !fragment.includes("float m25Portal=")||
  !fragment.includes("uniform sampler2D uMetalAtlas0262;")||
  !fragment.includes("uniform float uPremiumMetal0262;"))
  throw Error("0.26.4.1 requires existing micro-brushed graphite substrate");
 const base=UNIFIED_METAL_LIGHT_02641.graphite[role];
 const body=[
  "// 0.26.4.1 dark brushed titanium: body-only, retain lit bevel relief.",
  "float m41Lit=clamp(max(m25Wall,m25Roof)*0.66+",
  "  clamp(m25Portal,0.0,1.0)*0.23,0.0,1.0);",
  "float m41Cavity=clamp(m25Cavity,0.0,1.0);",
  "float m41Base=mix("+base.toFixed(3)+",0.976,m41Lit*0.60);",
  "float m41Preserve=mix(m41Base,1.0,0.09*m41Cavity);",
  "m25Final*=mix(1.0,m41Preserve,uMetalLightResponse02641);"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment.replace(COMMON,
  COMMON+"\nuniform float uMetalLightResponse02641;")
  .replace(SUBSTRATE,SUBSTRATE+"\n"+body)};
}
export function installMetalLightShader02641(material,uniform,role,mobile=false,
 substrate=false){
 const correct=substrate?"isMeshBasicMaterial":"isMeshPhysicalMaterial";
 if(!material?.[correct]||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.26.4.1 requires the original "+correct+" "+role);
 const old=material.onBeforeCompile,oldKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  old.call(this,shader,renderer);
  const out=substrate?
   patchTitaniumSubstrate02641(shader.vertexShader,shader.fragmentShader,
    {role,mobile}):
   patchLocalResponse02641(shader.vertexShader,shader.fragmentShader,
    {role,mobile});
  shader.vertexShader=out.vertexShader;
  shader.fragmentShader=out.fragmentShader;
  shader.uniforms.uMetalLightResponse02641=uniform;
 };
 material.customProgramCacheKey=function(){
  return oldKey.call(this)+"-unified-metal-light-02641-"+role+
   (substrate?"-substrate":"-physical")+(mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=old;
  material.customProgramCacheKey=oldKey;material.needsUpdate=true;};
}
export function installUnifiedMetalLighting02641(THREE,world,stationWorld,{
 enabled=true,lowMemory=false
}={}){
 const fallback=reason=>({
  active:false,setComparison(){},dispose(){},
  stats(){return {unifiedMetal02641Active:false,
   unifiedMetal02641Status:reason};}
 });
 if(!enabled)return fallback("comparison");
 const prev=stationWorld?.stats?.();
 if(!prev?.premiumMetal0262Enabled||!prev?.premiumMetal0262SolarSealed||
  !prev?.localReflections0261SunIsolated)
  return fallback("original-0.26.2-premium-sun-isolated-PBR-unavailable");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const physical=METAL_ROLES.filter(role=>!lowMemory||role==="panel")
  .map(role=>({role,mesh:group?.children?.find(x=>
   x.name===COATS_PREFIX+role)}));
 const substrates=SUBSTRATE_ROLES.filter(role=>!lowMemory||role!=="conduit")
  .map(role=>({role,mesh:group?.children?.find(x=>
   x.name==="Tunnel / "+SUBSTRATE_NAMES[role])}));
 if(physical.some(x=>!x.mesh?.material?.isMeshPhysicalMaterial)||
  substrates.some(x=>!x.mesh?.material?.isMeshBasicMaterial))
  return fallback("original-panel-rib-micro-meshes-unavailable");
 const cove=world?.getObjectByName?.(COVE_NAME_02641);
 // It is a legacy 0.26.0 bright cyan source. It may be absent on some
 // reduced-complexity profiles: PBR/source shader improvements still apply.
 const originalCove=cove?.material?.color?.clone?.()??null;
 const uniform={value:1},restore=[];
 try{
  for(const {role,mesh} of physical)
   restore.push(installMetalLightShader02641(mesh.material,uniform,role,
    lowMemory,false));
  for(const {role,mesh} of substrates)
   restore.push(installMetalLightShader02641(mesh.material,uniform,role,
    lowMemory,true));
 }catch(error){
  for(const done of restore.reverse())done();
  console.warn("SKYSHIFT 0.26.4.1 keeping previous titanium",error);
  return fallback("unified-metal-compile-precheck-failed");
 }
 const coveGain=lowMemory?1.045:1.120;
 const setComparison=v=>{
  uniform.value=clamp(v);
  if(originalCove)cove.material.color.setRGB(
   originalCove.r*(1+(coveGain-1)*uniform.value),
   originalCove.g*(1+(coveGain-1)*uniform.value),
   originalCove.b*(1+(coveGain-1)*uniform.value));
 };
 setComparison(1);
 return {active:true,setComparison,
  stats(){return {
   unifiedMetal02641Active:true,unifiedMetal02641Status:"active",
   unifiedMetal02641Version:"0.26.4.1",
   unifiedMetal02641Strength:uniform.value,
   unifiedMetal02641LowMemory:!!lowMemory,
   unifiedMetal02641PhysicalCoats:physical.length,
   unifiedMetal02641Substrates:substrates.length,
   unifiedMetal02641RealCyanAndAmber:true,
   unifiedMetal02641CoveUpdated:Boolean(originalCove),
   unifiedMetal02641NewLights:0,unifiedMetal02641NewMeshes:0,
   unifiedMetal02641NewPasses:0,unifiedMetal02641NewTextures:0,
   unifiedMetal02641WhiteSolarSealed:true,
   unifiedMetal02641StraightOnlyCyanUnchanged:true,
   unifiedMetal02641ConnectedAmberUnchanged:true,
   unifiedMetal02641NativeGGX:true,
   unifiedMetal02641NativeWaveUnchanged:true,
   unifiedMetal02641PhysicsUnchanged:true,unifiedMetal02641ShipUnchanged:true
  }},
  dispose(){uniform.value=0;
   if(originalCove)cove.material.color.copy(originalCove);
   for(const done of restore.reverse())done();
  }
 };
}
