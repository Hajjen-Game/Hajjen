// SKYSHIFT 0.26.4.2 — Reflection Cohesion & Premium Surface Finish
// Target: the ACTUAL user-captured PC frame already has the right dark metal
// and light geometry. Improve the physical reflection shape, not exposure.
// Reuses 0.26.4.1 MeshPhysical GGX coats, 0.26.3 indexed road GGX,
// 0.26.3.3 straight-only edge mask and 0.26.3.2 joined amber floor meshes.
// No new light, SSR, PMREM, camera pass, model, texture, collision or input.
export const REFLECTION_FINISH_02642=Object.freeze({
 version:"0.26.4.2",base:"0.26.4.1",
 comparison:"?reflectionFinish=classic",
 title:"Reflection Cohesion & Premium Surface Finish",
 high:{metalCoolReach:18.2,metalWarmReach:15.2,
  metalRoughnessTrim:0.071,roadCoveWidth:3.15,
  roadAmberWidth:2.72,roadColdStrength:.61,roadWarmStrength:.43,
  roadRoughnessTrim:.042,footFeatherExponent:.84},
 mobile:{metalCoolReach:14.2,metalWarmReach:12.0,
  metalRoughnessTrim:.030,roadCoveWidth:2.55,
  roadAmberWidth:2.22,roadColdStrength:.47,roadWarmStrength:.34,
  roadRoughnessTrim:.020,footFeatherExponent:.93},
 graphiteBaseUnchanged:true,roughnessMicroAtlasUnchanged:true,
 originalPhysicalSamplesUnchanged:true,addedDirectLightSamples:0,
 straightOnlyCyanSourcesUnchanged:true,curveArrowsUnchanged:true,
 connectedAmberSourceGeometryUnchanged:true,solarSealUnchanged:true,
 whiteCoreUnchanged:true,originalRoadUnchanged:true,
 boostUnchanged:true,GRIPUnchanged:true,shipUnchanged:true,
 cameraUnchanged:true,zoneWaveUnchanged:true,physicsUnchanged:true,
 addedDrawCalls:0,addedLights:0,addedTextures:0,addedRenderPasses:0
});
export const FOOT_BAND_NAME_02642=
 "SKYSHIFT 0.26.3.2 / one-piece amber arch-foot and floor bands";
const clamp=(x)=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const COMMON="#include <common>";
const ROUGH_METAL=" roughnessFactor=mix(roughnessFactor,m262R,uPremiumMetal0262);";
const ROUGH_ROAD="roughnessFactor=mix(roughnessFactor,r263Rough,r263Interior);";
const COLOR="#include <color_fragment>";
const number=(v)=>Number(v).toFixed(3);
// Compiled shaders already include 0.26.0 PBR fixtures, 0.26.1 finite
// emitter sampling, 0.26.2 normal+roughness atlas and 0.26.4.1 gains.
// Gently broaden those *source-limited* reflections and adjust only the
// roughness close to a REAL fixture. Never change the dark substrate.
export function patchMetalFinish02642(vertex,fragment,{mobile=false}={}){
 const preset=mobile?REFLECTION_FINISH_02642.mobile:REFLECTION_FINISH_02642.high;
 const originalCool=mobile?"12.8":"14.4";
 const originalWarm=mobile?"10.4":"11.6";
 for(const anchor of [COMMON,ROUGH_METAL,
  "uniform float uMetalLightResponse02641;",
  "uniform float uLocalReflections0261;",
  "varying vec2 vLocalMask0261;",
  "l261CoolDistance/"+originalCool,
  "l261WarmDistance/"+originalWarm,
  "roughnessFactor=mix(roughnessFactor,m262R,uPremiumMetal0262);"]){
  if(!fragment.includes(anchor))
   throw Error("0.26.4.2 requires real premium-metal + local GGX anchor: "+anchor);
 }
 let f=fragment.replace(COMMON,COMMON+"\nuniform float uReflectionFinish02642;");
 // Previous source mask and exp(-distance^2) still gate EVERY contribution.
 f=f.replaceAll("l261CoolDistance/"+originalCool,
   "l261CoolDistance/mix("+originalCool+","+number(preset.metalCoolReach)+",uReflectionFinish02642)");
 f=f.replaceAll("l261WarmDistance/"+originalWarm,
   "l261WarmDistance/mix("+originalWarm+","+number(preset.metalWarmReach)+",uReflectionFinish02642)");
 const rough=[
  ROUGH_METAL,
  "// Premium finish: only close to the physically installed cyan/amber coves.",
  "float f42Near=clamp(max(vLocalMask0261.x*0.85,vLocalMask0261.y),0.0,1.0);",
  "roughnessFactor=max(0.20,roughnessFactor-",
  "  "+number(preset.metalRoughnessTrim)+"*f42Near*uReflectionFinish02642);"
 ].join("\n");
 f=f.replace(ROUGH_METAL,rough);
 return {vertexShader:vertex,fragmentShader:f};
}
// The original ROAD reflection uses actual banked ceiling/arch LED sources
// and GGX: widen only their colored lateral glancing response. DO NOT touch
// the lower short cyan e31Power: that is masked to STRAIGHTS via 0.26.3.3.
// Preserve arrow/pad/whiteCore protection and graphite road diffuse.
export function patchRoadFinish02642(vertex,fragment,{mobile=false}={}){
 const preset=mobile?REFLECTION_FINISH_02642.mobile:REFLECTION_FINISH_02642.high;
 const needles=[
  COMMON,ROUGH_ROAD,
  "float e31Power=uEdgeFloor02631*e31In*e31Bay*e31Safe*clamp(vEdgeStraight02633,0.0,1.0);",
  " float r263CoveBand=exp(-pow((r263Lateral-6.7)/2.2,2.0))+",
  "  0.48*exp(-pow((r263Lateral-9.1)/1.7,2.0));",
  " float r263AmberBand=exp(-pow((r263Lateral-7.5)/2.05,2.0));",
  "(r263Source.x*r263CoveBand*0.38)",
  "(r263Source.y*r263AmberBand*0.29)",
  "r263Keep*r263Fresnel*r263Surface",
  "e31FootBand=exp(-pow((e31L-10.60)/2.15,2.0));"
 ];
 for(const n of needles)if(!fragment.includes(n))
  throw Error("0.26.4.2 missing indexed sun-sealed road GGX anchor: "+n);
 let f=fragment.replace(COMMON,COMMON+"\nuniform float uReflectionFinish02642;");
 // Microfacet response: keep the road's black base and existing roughness
 // grain but permit a controlled specular ridge toward the REAL side LEDs.
 f=f.replace(ROUGH_ROAD,[
  ROUGH_ROAD,
  "float f42Shoulder=smoothstep(3.6,8.7,abs(vTrackCoord.y));",
  "roughnessFactor=max(0.265,roughnessFactor-",
  "  "+number(preset.roadRoughnessTrim)+"*f42Shoulder*",
  "  r263Interior*uReflectionFinish02642);"
 ].join("\n"));
 f=f.replace(
  "(r263Lateral-6.7)/2.2",
  "(r263Lateral-6.7)/mix(2.2,"+number(preset.roadCoveWidth)+",uReflectionFinish02642)");
 f=f.replace(
  "(r263Lateral-7.5)/2.05",
  "(r263Lateral-7.5)/mix(2.05,"+number(preset.roadAmberWidth)+",uReflectionFinish02642)");
 f=f.replace("(r263Source.x*r263CoveBand*0.38)",
  "(r263Source.x*r263CoveBand*mix(0.38,"+
   number(preset.roadColdStrength)+",uReflectionFinish02642))");
 f=f.replace("(r263Source.y*r263AmberBand*0.29)",
  "(r263Source.y*r263AmberBand*mix(0.29,"+
   number(preset.roadWarmStrength)+",uReflectionFinish02642))");
 // Same portal-foot weight and original amber source; soften the colored
 // GLANCING footprint, not the position or opacity of the arch fixture.
 f=f.replace("(e31L-10.60)/2.15",
  "(e31L-10.60)/mix(2.15,"+
   number(mobile?2.28:2.60)+",uReflectionFinish02642)");
 return {vertexShader:vertex,fragmentShader:f};
}
// Very small, seamless softening of original joined amber foot-floor bands.
// Source center stays fixed; only the *translucent alpha falloff* is smoothed.
// Uses the original MeshBasicMaterial and original premade vertex-alpha mesh.
export function patchJoinedFootFinish02642(vertex,fragment,{mobile=false}={}){
 if(!fragment.includes(COMMON)||!fragment.includes(COLOR))
  throw Error("0.26.4.2 requires existing vertex-alpha amber foot shader");
 const exp=number((mobile?REFLECTION_FINISH_02642.mobile:
  REFLECTION_FINISH_02642.high).footFeatherExponent);
 const next=[
  COLOR,
  "float f42Alpha=clamp(diffuseColor.a,0.0,1.0);",
  "float f42Soft=pow(f42Alpha,"+exp+")*0.965;",
  "diffuseColor.a=mix(diffuseColor.a,",
  "  mix(diffuseColor.a,f42Soft,0.72),uReflectionFinish02642);"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment
  .replace(COMMON,COMMON+"\nuniform float uReflectionFinish02642;")
  .replace(COLOR,next)};
}
export function wrapFinishShader02642(material,uniform,type,mobile){
 const expected=type==="metal"?"isMeshPhysicalMaterial":
  type==="road"?"isMeshStandardMaterial":"isMeshBasicMaterial";
 if(!material?.[expected]||typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.26.4.2 original PBR/material chain missing: "+type);
 const previous=material.onBeforeCompile,oldKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  const patch=type==="metal"?patchMetalFinish02642:
   type==="road"?patchRoadFinish02642:patchJoinedFootFinish02642;
  const updated=patch(shader.vertexShader,shader.fragmentShader,{mobile});
  shader.vertexShader=updated.vertexShader;
  shader.fragmentShader=updated.fragmentShader;
  shader.uniforms.uReflectionFinish02642=uniform;
 };
 material.customProgramCacheKey=function(){
  return oldKey.call(this)+"-premium-reflection-02642-"+type+
   (mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=previous;
  material.customProgramCacheKey=oldKey;material.needsUpdate=true;};
}
export function installPremiumReflectionFinish02642(THREE,world,roadMesh,{
 enabled=true,lowMemory=false,metalState=null,roadRebuild=null,
 straightEdges=null,finalCohesion=null
}={}){
 const fallback=reason=>({active:false,setComparison(){},dispose(){},
  stats:()=>({reflectionFinish02642Active:false,
   reflectionFinish02642Status:reason})});
 if(!enabled)return fallback("classic");
 if(!metalState?.stats?.().unifiedMetal02641Active||
  !roadRebuild?.stats?.().roadRebuild0263Active||
  !straightEdges?.stats?.().straightEdges02633Active||
  !finalCohesion?.stats?.().finalCohesion0264Active)
  return fallback("physical-metal-ggx-road-straight-edge-or-bloom-missing");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const coats=["panel","rib"].filter(role=>!lowMemory||role==="panel")
  .map(role=>group?.children?.find(mesh=>
   mesh.name==="SKYSHIFT 0.26.0 P2 / true physical "+role));
 const foot=world?.getObjectByName?.(FOOT_BAND_NAME_02642);
 if(!coats.length||coats.some(x=>!x?.material?.isMeshPhysicalMaterial)||
  !roadMesh?.material?.isMeshStandardMaterial||
  !foot?.material?.isMeshBasicMaterial)
  return fallback("original-physical-metal-road-joined-foot-unavailable");
 const amount={value:1},restore=[];
 try{
  for(const mesh of coats)
   restore.push(wrapFinishShader02642(mesh.material,amount,"metal",lowMemory));
  restore.push(wrapFinishShader02642(roadMesh.material,amount,"road",lowMemory));
  restore.push(wrapFinishShader02642(foot.material,amount,"foot",lowMemory));
 }catch(error){
  for(const undo of restore.reverse())undo();
  console.warn("SKYSHIFT 0.26.4.2 retains previous graphics",error);
  return fallback("shader-finish-install-failed");
 }
 const state={
  reflectionFinish02642Active:true,reflectionFinish02642Status:"active",
  reflectionFinish02642Version:"0.26.4.2",
  reflectionFinish02642MetalCoats:coats.length,
  reflectionFinish02642RoadMaterials:1,
  reflectionFinish02642JoinedAmber:1,
  reflectionFinish02642OriginalGGXSamples:true,
  reflectionFinish02642StraightOnlyCyan:true,
  reflectionFinish02642WhiteSolarSealed:true,
  reflectionFinish02642GraphiteUnchanged:true,
  reflectionFinish02642LowMemory:!!lowMemory,
  reflectionFinish02642NewDrawCalls:0,
  reflectionFinish02642NewLights:0,reflectionFinish02642NewTextures:0,
  reflectionFinish02642NewPasses:0,reflectionFinish02642NewColliders:0,
  reflectionFinish02642GRIPUnchanged:true,
  reflectionFinish02642PhysicsUnchanged:true,
  reflectionFinish02642ShipUnchanged:true,
  reflectionFinish02642NativeWaveUnchanged:true
 };
 return {active:true,setComparison(v){amount.value=clamp(v);},
  stats:()=>({...state,reflectionFinish02642Strength:amount.value}),
  dispose(){amount.value=0;for(const undo of restore.reverse())undo();}
 };
}
