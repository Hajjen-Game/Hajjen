// SKYSHIFT 0.23.2 — Cinematic Light Architecture / Pass 2
// Localized neon reflections on AUTHORED metal facets only.
// Existing original tunnel neon, PBR road, ship, old white solar
// containment, zone wave, and GRIP/camera/flight remain untouched.
import {installTrueMaterialDepthRebuild}
 from "./true-material-depth-v0231.mjs";

export const LIGHT_ARCHITECTURE_0232=Object.freeze({
 version:"0.23.2",id:"cinematic-light-architecture-0232",
 pass:"2 — Local Neon Reflection & Contrast",
 targetMeshes:["HARDSURFACE_PANELS","STRUCTURAL_CONDUITS"],
 untouched:["CLOSED_SHELL","CURVED_RIBS","ROAD","SHIP"],
 referenceStart:78,referenceEnd:304,
 highlightStrength:"controlled tinted, bevel-weighted analytic metal glints",
 extraLights:0,extraDrawCalls:0,extraMeshes:0,
 additionalTextures:0,additionalRenderPasses:0,
 changesGeometry:false,changesPhysics:false,changesGRIP:false,
 changesCamera:false,changesRoad:false,changesShip:false,
 preservesNativeNeon:true,preservesRoadSolarSeal:true,
 comparison:"?lightArchitecture=classic",
 pixelProof:"?lightArchitectureSmoke=1&lightArchitectureFrameProof=1"
});
const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const roleMap=Object.freeze({panel:"HARDSURFACE_PANELS",
 conduit:"STRUCTURAL_CONDUITS"});

export function patchLightArchitectureShader(vertex,fragment,{
 role="panel",mobile=false
}={}){
 if(!(role in roleMap))throw Error("0.23.2 unsupported metal role");
 const common="#include <common>";
 const anchor="diffuseColor.rgb=mix(d31Original,d31Out,d31Strength);";
 // P1–P4's original color is already finished at this position. Only
 // append energy from neon, NEVER replace the surface's existing RGB.
 if(!fragment.includes(common)||!fragment.includes(anchor)||
    !fragment.includes("float p23WallLight=")||
    !fragment.includes("float p23RoofLight=")||
    !fragment.includes("float cinemaArch=")||
    !fragment.includes("vec3 rbTint=rebirthPalette();")||
    !fragment.includes("float d31EdgeMask=")||
    !fragment.includes("varying vec2 vNeonLocalSection;"))
  throw Error("0.23.2 needs original sun-sealed Pass 1/2/0.23.1.1 shader");
 if(!mobile&&(!fragment.includes("vec3 p23Lw=")||
   !fragment.includes("vec3 p23Lr=")))
  throw Error("0.23.2 needs authentic banked emitter vectors");
 const glints=mobile?[
  // On 4GB: no new vertex streams and no expensive world normal basis.
  "float c32Spec=(.10+.24*d31Grazing)*",
  " (c32Wall*.72+c32Crown*.58)*",
  " (c32Bevel*.85+c32Face*.10);"
 ]:[
  // Specular lobe follows each real, banked panel normal. Reflection
  // moves naturally as camera traverses a curved/banked road.
  "vec3 c32N=normalize(vRebirthNormal);",
  "if(!gl_FrontFacing)c32N=-c32N;",
  "vec3 c32V=normalize(cameraPosition-vRebirthPosition);",
  "float c32WallSpec=pow(max(0.0,dot(c32N,",
  " normalize(c32V+p23Lw))),24.0);",
  "float c32CrownSpec=pow(max(0.0,dot(c32N,",
  " normalize(c32V+p23Lr))),22.0);",
  "float c32Spec=(.20+.28*d31Grazing)*",
  " (c32Wall*c32WallSpec+c32Crown*c32CrownSpec)*",
  " (c32Bevel*.83+c32Face*.14);"
 ];
 const body=[
  "// 0.23.2 only adds colored, bounded local neon reflection.",
  "float c32Gallery=smoothstep(88.0,110.0,vRebirthTrack)*",
  " (1.0-smoothstep(280.0,302.0,vRebirthTrack));",
  "float c32Strength=uLightArchitecture0232*c32Gallery;",
  "if(c32Strength>0.0001){",
  " vec3 c32Before=diffuseColor.rgb;",
  " float c32Wall=p23WallLight;",
  " float c32Crown=p23RoofLight;",
  " float c32Source=max(c32Wall,c32Crown);",
  // Body of neon should not be a huge flat fill. Broad glass / emitter
  // surfaces already have native glow and are not touched by this pass.
  " float c32Proximity=smoothstep(0.07,0.43,c32Source);",
  " float c32Bevel=clamp(d31EdgeMask,0.0,1.0);",
  " float c32Face=clamp(d31Face,0.0,1.0);",
  " float c32Recess=clamp(d31Recess,0.0,1.0);",
  " float c32Grazing=d31Grazing;",
  " float c32Portal=clamp(cinemaArch,0.0,1.0);",
  ...glints,
  // Soft iris through the existing portals, not a new moving lamp.
  // Portal enhancement acts only on metal with actual light incidence.
  " float c32PortalBoost=(.055+.095*c32Portal)*",
  "  c32Proximity*(.66*c32Bevel+.10*c32Face);",
  " float c32Edge=(.055+.09*c32Grazing)*c32Proximity*",
  "  (c32Bevel*.85+c32Face*.11);",
  " float c32Total=min(0.22,(c32Spec+c32Edge+c32PortalBoost)*",
  (mobile?"  0.64);":"  0.95);"),
  " vec3 c32Palette=clamp(rbTint,vec3(0.0),vec3(.76));",
  " vec3 c32Contribution=c32Palette*c32Total*",
  "  (1.0-.97*c32Recess);",
  // Critical guard: additive, preserves native emission, unchanged
  // scene exposure, NO neutral-white light and NO solar shader alteration.
  " diffuseColor.rgb=c32Before+c32Strength*c32Contribution;",
  "}"
 ].join("\n");
 return {
  vertexShader:vertex,
  fragmentShader:fragment
   .replace(common,common+"\nuniform float uLightArchitecture0232;")
   .replace(anchor,anchor+"\n"+body)
 };
}

export function installLightArchitectureShader(material,uniforms,opts={}){
 const role=opts.role||"panel";
 if(!material?.isMeshBasicMaterial||
    !roleMap[role]||
    typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw Error("0.23.2 requires sun-isolated tunnel Basic material");
 const previousCompile=material.onBeforeCompile;
 const previousKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previousCompile.call(this,shader,renderer);
  const out=patchLightArchitectureShader(shader.vertexShader,
   shader.fragmentShader,opts);
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=out.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return previousKey.call(this)+"-skyshift-light-architecture-0232-"+role+
   (opts.mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
}

export function installCinematicLightArchitecture(THREE,world,options={}){
 const base=installTrueMaterialDepthRebuild(THREE,world,options);
 const baseStats=base.stats();
 const inactive=(reason)=>({...base,
  stats(){return {...base.stats(),lightArchitecture0232Enabled:false,
    lightArchitecture0232Status:reason};},
  setLightArchitectureComparison(){}
 });
 if(!baseStats.trueDepth0231Enabled||
   baseStats.trueDepth0231Status!=="active"||
   !baseStats.trueDepth0231PreservedNativeNeon)
  return inactive("previous-pass-not-ready");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const lowMemory=!!options.lowMemory;
 const targets=Object.entries(roleMap)
  .filter(([role])=>!lowMemory||role==="panel")
  .map(([role,name])=>({role,
   mesh:group?.children?.find(m=>m.name==="Tunnel / "+name)}));
 if(targets.some(({mesh})=>!mesh?.material?.isMeshBasicMaterial||
   !mesh?.geometry?.getAttribute?.("neonLocalSection")))
  return inactive("original-neon-surface-missing");
 // No changes to the shell, ribs, road, ship or any geometry.
 const control={value:1},uniforms={uLightArchitecture0232:control};
 for(const {role,mesh} of targets)
  installLightArchitectureShader(mesh.material,uniforms,{
   role,mobile:lowMemory
  });
 const state={
  lightArchitecture0232Enabled:true,
  lightArchitecture0232Status:"active",
  lightArchitecture0232Version:"0.23.2",
  lightArchitecture0232MaterialBatches:targets.length,
  lightArchitecture0232Untouched:["shell","rib","road","ship"],
  lightArchitecture0232PreservedNativeNeon:true,
  lightArchitecture0232SolarSealed:true,
  lightArchitecture0232AddedDrawCalls:0,
  lightArchitecture0232AddedLights:0,
  lightArchitecture0232GeometryUnchanged:true,
  lightArchitecture0232LowMemory:lowMemory
 };
 return {
  ...base,
  stats(){return {...base.stats(),...state,
    lightArchitecture0232Strength:control.value,version:"0.23.2"};},
  setLightArchitectureComparison(v){control.value=clamp(v);}
 };
}
