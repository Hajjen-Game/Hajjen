// SKYSHIFT 0.22.0 — Cinematic Visual Rebirth, Pass 1: Premium Materials.
// Existing graphite panel, inset and original vaulted-shell geometry receives
// a coherent physically informed, authored-metal finish instead of static
// flat blue material. Uses existing camera/world normals, original zone palette
// and a stable longitudinal grain. Fully isolated from the world sun:
// neutral direct/specular lighting on the PBR shell is attenuated; the metal
// highlights are small, colored and analytic. No lights, meshes, textures,
// UV atlases, render passes, camera or flight physics changes.
import {installCinematicEnergyMotion}
 from "./cinematic-energy-v0216.mjs";
import {createTunnelSpectrumUniforms,updateTunnelSpectrumUniforms}
 from "./tunnel-spectrum-v02121.mjs";

export const MATERIAL_REBIRTH_0220=Object.freeze({
 version:"0.22.0",pass:"1 — Premium Material Revolution",
 id:"cinematic-material-rebirth",
 targeted:["HARDSURFACE_PANELS","STRUCTURAL_CONDUITS","CLOSED_SHELL","CURVED_RIBS"],
 finish:"brushed-titanium-graphite / etched-recess / satin-edge",
 newMeshes:0,addedDrawCalls:0,newTextures:0,newLights:0,
 extraRenderPasses:0,additionalGeometry:0,
 materialUniformOnly:true,zonePaletteSynchronized:true,
 externalSunIsolated:true,roadShaderUntouched:true,
 shipShaderUntouched:true,railShaderUntouched:true,
 physicsUnchanged:true,gripUnchanged:true,cameraUnchanged:true,
 mobileProceduralDetail:"reduced",
 compare:"?rebirthMaterial=classic"
});
const clamp01=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const lightSafeRole=role=>["panel","conduit","shell","rib"].includes(role);
const rgb=(role)=>role==="panel"?[0.84,0.96,1.00]:
 role==="conduit"?[0.73,0.91,1.00]:
 role==="shell"?[0.85,0.96,1.00]:[0.91,0.97,1.00];

// Strings are shared by the CPU-only unit tests and the live Three.js path.
export function patchPremiumMaterialShader(vertex,fragment,{
 role="panel",mobile=false
}={}){
 if(!lightSafeRole(role))throw Error("0.22.0 invalid material role");
 // 0.21.2 Neon-Driven Interior deliberately replaces BOTH the shell and
 // curved ribs with MeshBasicMaterial to block external sun/hemisphere.
 // Never infer actual material type from a geometry role. Detect the shader
 // that was truly composed by earlier onBeforeCompile decorators instead.
 const standard=["#include <lights_fragment_end>",
  "#include <roughnessmap_fragment>","#include <metalnessmap_fragment>",
  "#include <emissivemap_fragment>"].every(chunk=>fragment.includes(chunk));
 const common="#include <common>",begin="#include <begin_vertex>";
 const color="#include <color_fragment>";
 if(!vertex.includes(common)||!vertex.includes(begin)||
    !fragment.includes(common)||!fragment.includes(color)||
    (standard&&!fragment.includes("#include <lights_fragment_end>"))||
    (standard&&!fragment.includes("#include <emissivemap_fragment>"))||
    (standard&&!fragment.includes("#include <roughnessmap_fragment>"))||
    (standard&&!fragment.includes("#include <metalnessmap_fragment>"))||
    (!standard&&!fragment.includes(
     "diffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;")))
  throw Error("0.22.0 original tunnel material GLSL anchors changed");
 const attr=vertex.includes("attribute float trackS;")?"":"attribute float trackS;\n";
 const vertexDeclarations=[
  "varying vec3 vRebirthPosition;",
  "varying vec3 vRebirthNormal;",
  "varying float vRebirthTrack;",
  "varying float vRebirthClass;"
 ].join("\n");
 const vertexAssign=[
  "vRebirthPosition=(modelMatrix*vec4(transformed,1.0)).xyz;",
  "vRebirthNormal=normalize(mat3(modelMatrix)*normal);",
  "vRebirthTrack=trackS;",
  (role==="shell"||role==="rib")?
   ("vRebirthClass="+(role==="shell"?"0.008":"0.004")+";"):
   "vRebirthClass=glowWeight;"
 ].join("\n");
 const tint=rgb(role);
 const fragmentCommon=[
  "uniform float uRebirthMaterial;",
  "uniform vec3 uRebirthOld;",
  "uniform vec3 uRebirthNext;",
  "uniform float uRebirthFront;",
  "uniform float uRebirthActive;",
  vertexDeclarations,
  "vec3 rebirthPalette(){",
  " float feather=1.0-smoothstep(-66.0,66.0,vRebirthTrack-uRebirthFront);",
  " return mix(uRebirthOld,uRebirthNext,uRebirthActive*feather);",
  "}"
 ].join("\n");
 const model=[
  "// Panel material response: diffuse graphite, satin machined face,",
  "// directional brushed grain, dark grooves and low-energy colored rims.",
  "vec3 rbN=normalize(vRebirthNormal);",
  "vec3 rbV=normalize(cameraPosition-vRebirthPosition);",
  "float rbFacing=abs(dot(rbN,rbV));",
  "float rbRim=pow(1.0-rbFacing,2.5);",
  "float rbMacro=0.50+0.50*sin(vRebirthTrack*0.17+vRebirthPosition.y*0.08);",
  "float rbGrain=0.50+0.50*sin(vRebirthTrack*"+(mobile?"3.5":"9.2")+
   "+vRebirthPosition.y*"+(mobile?"1.25":"3.1")+");",
  "float rbBevel=step(0.002,vRebirthClass)*",
  "  (1.0-step(0.007,vRebirthClass));",
  "float rbCavity=1.0-step(0.001,vRebirthClass);",
  "vec3 rbOriginal=diffuseColor.rgb;",
  "float rbLuma=dot(rbOriginal,vec3(0.26,0.61,0.13));",
  // Neutralize the solid-blue tile colors, retaining a subtle cool finish.
  "vec3 rbGraphite=mix(rbOriginal,rbLuma*vec3("+
   tint.map(x=>x.toFixed(2)).join(",")+"),"+(role==="panel"?"0.48":"0.37")+");",
  "float rbShape=(0.72+0.22*rbFacing+0.17*rbMacro)*",
  "  (0.93+0.12*rbGrain)*(1.0-0.46*rbCavity);",
  // Metal highlight angle authored inside the enclosed vault; its color
  // follows existing wave palette and NEVER draws a white world-sun streak.
  "vec3 rbLightDir=normalize(vec3(-0.32,0.70,0.62));",
  "float rbLight=pow(max(0.0,abs(dot(rbN,normalize(rbV+rbLightDir)))), "+
   (mobile?"16.0":"24.0")+");",
  "float rbSatin=(0.026+0.047*rbRim+0.084*rbBevel+0.056*rbLight)*",
  "  (0.65+0.35*rbMacro)*(1.0-0.75*rbCavity);",
  "vec3 rbTint=rebirthPalette();",
  "vec3 rbFinish=rbGraphite*rbShape+rbTint*rbSatin;",
  "diffuseColor.rgb=mix(rbOriginal,rbFinish,uRebirthMaterial);"
 ].join("\n");
 // Append AFTER the existing 0.21.2.1 native palette response for Basic
 // panel/conduit materials, without overriding the 9-color wave function.
 const basicAnchor="diffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;";
 const colorAnchor=standard?color:basicAnchor;
 let v=vertex
  .replace(common,common+"\n"+attr+vertexDeclarations)
  .replace(begin,begin+"\n"+vertexAssign);
 let f=fragment
  .replace(common,common+"\n"+fragmentCommon)
  .replace(colorAnchor,colorAnchor+"\n"+model);
 if(standard){
  // Only apply native PBR controls when the preceding renderer actually
  // supplies a MeshStandard shader. Current closed tunnel surfaces are Basic,
  // which already ignore exterior world lighting by construction.
  const rough="#include <roughnessmap_fragment>";
  const metal="#include <metalnessmap_fragment>";
  const lights="#include <lights_fragment_end>";
  const emit="#include <emissivemap_fragment>";
  f=f.replace(rough,rough+"\n"+
   "roughnessFactor=mix(roughnessFactor,"+(mobile?"0.69":"0.57")+
   "+0.08*rbGrain,uRebirthMaterial);")
   .replace(metal,metal+"\n"+
   "metalnessFactor=mix(metalnessFactor,"+
   (role==="shell"?"0.46":"0.58")+
   "+0.06*rbMacro,uRebirthMaterial);")
   .replace(lights,lights+"\n"+[
    "// 0.22.0 shell/ribs do NOT accept the exterior world's neutral sun.",
    "reflectedLight.directDiffuse*=mix(1.0,0.13,uRebirthMaterial);",
    "reflectedLight.indirectDiffuse*=mix(1.0,0.24,uRebirthMaterial);",
    "reflectedLight.directSpecular*=mix(1.0,0.025,uRebirthMaterial);",
    "reflectedLight.indirectSpecular*=mix(1.0,0.08,uRebirthMaterial);"
   ].join("\n"))
   .replace(emit,emit+"\n"+
    // Add only a small local colored metallic contribution. Lighting pass 2
    // will author the actual surface-to-neon bounce.
    "totalEmissiveRadiance+=uRebirthMaterial*rbTint*"+
    "(0.019+0.046*rbBevel+0.033*rbRim)*(1.0-0.68*rbCavity);");
 }
 return {vertexShader:v,fragmentShader:f};
}
export function installPremiumMaterialShader(material,uniforms,{
 role="panel",mobile=false
}={}){
 if(!material||typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw Error("0.22.0 requires an existing Three material");
 if(!lightSafeRole(role))throw Error("0.22.0 invalid material role");
 const oldCompile=material.onBeforeCompile,oldKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  oldCompile.call(this,shader,renderer);
  Object.assign(shader.uniforms,uniforms);
  const out=patchPremiumMaterialShader(shader.vertexShader,shader.fragmentShader,
   {role,mobile});
  shader.vertexShader=out.vertexShader;
  shader.fragmentShader=out.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return oldKey.call(this)+"-skyshift-premium-metal-0220-"+role+
   (mobile?"-mobile":"-desktop");
 };
 material.needsUpdate=true;
}
export function installPremiumMaterialRebirth(THREE,world,options={}){
 const base=installCinematicEnergyMotion(THREE,world,options);
 const old=base.stats();
 if(!old.active||!old.cinematicEnergyEnabled||old.cinematicStatus!=="active")
  return base;
 const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
 if(!group)throw Error("0.22.0 requires original vaulted 0.21.1 shell");
 const lookup=[
  ["Tunnel / HARDSURFACE_PANELS","panel"],
  ["Tunnel / STRUCTURAL_CONDUITS","conduit"],
  ["Tunnel / CLOSED_SHELL","shell"],
  ["Tunnel / CURVED_RIBS","rib"]
 ];
 const palette=createTunnelSpectrumUniforms(THREE);
 const blend={value:1};
 const uniforms={
  uRebirthMaterial:blend,
  uRebirthOld:palette.uTunnelOld,
  uRebirthNext:palette.uTunnelNext,
  uRebirthFront:palette.uTunnelFront,
  uRebirthActive:palette.uTunnelActive
 };
 let materials=0,originalBasic=0,originalPbr=0;
 // Validate all expected materials BEFORE touching them, avoiding a partial
 // update if a future version changes the base/world architecture.
 const existing=lookup.map(([name,role])=>{
  const mesh=group.children.find(m=>m.name===name);
  if(role==="conduit"&&options.lowMemory)return null;
  if(!mesh?.material||!mesh?.geometry?.getAttribute?.("trackS"))
   throw Error("0.22.0 missing expected vault material/arc: "+name);
  // MeshBasicMaterial here is intentional in 0.21.2, not a missing PBR
  // feature. Keep its sun-isolated native spectral hook and layer the metal
  // finish analytically on top, without changing the material class.
  if(!mesh.material.isMeshBasicMaterial&&
     !mesh.material.isMeshStandardMaterial)
   throw Error("0.22.0 unsupported original tunnel material: "+name);
  return {mesh,role};
 }).filter(Boolean);
 for(const {mesh,role} of existing){
  installPremiumMaterialShader(mesh.material,uniforms,{
   role,mobile:!!options.lowMemory
  });
  if(mesh.material.isMeshStandardMaterial)originalPbr++;
  else originalBasic++;
  materials++;
 }
 const state={
  rebirthMaterialEnabled:true,rebirthMaterialPass:"1",
  rebirthMaterialVersion:"0.22.0",rebirthMaterialStatus:"active",
  rebirthMaterials:materials,rebirthBasicMaterials:originalBasic,
  rebirthPbrMaterials:originalPbr,rebirthNoNewDrawBatches:true,
  rebirthWorldSunSealed:true,rebirthMobile:!!options.lowMemory,
  rebirthCameraUntouched:true,rebirthPhysicsUntouched:true,
  rebirthComparison:MATERIAL_REBIRTH_0220.compare
 };
 return {
  ready:base.ready,
  stats(){return {...base.stats(),...state,
   version:"0.22.0",rebirthMaterialBlend:blend.value};},
  updateWave(wave){
   base.updateWave?.(wave);
   updateTunnelSpectrumUniforms(palette,wave);
  },
  updateMotion(frame){base.updateMotion?.(frame)},
  setMotionComparison(value){base.setMotionComparison?.(value)},
  setMotionSample(frame){base.setMotionSample?.(frame)},
  setMaterialComparison(value){blend.value=clamp01(value)},
  dispose(){base.dispose?.()}
 };
}
