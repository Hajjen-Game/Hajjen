// SKYSHIFT 0.25.1 — Micro Surface Metal Definition.
// A localized metal finish on TOP of 0.25.0 dark graphite. The existing
// sun-isolated MeshBasicMaterial is not PBR: "roughness" here is an
// explicitly authored microfacet/specular approximation (not a PBR map).
// No overlays, textures, lamps, new geometry, or changes to native neon.
import {installDarkMetallicFoundation} from "./dark-metallic-foundation-v0250.mjs";

export const MICRO_SURFACE_METAL_0251=Object.freeze({
 version:"0.25.1",id:"micro-surface-metal-definition-0251",
 base:"0.25.0",comparison:"?microMetal=classic",fullTunnelMeters:368,
 finish:"directional brushed graphite + variable microfacet lobe + milling",
 details:"bevel glints, sparse machined scratches, genuinely darker recessed joints",
 lighting:"existing banked wall/crown neon and original amber portal practicals",
 materialModel:"procedural metal microfacet approximation in solar-sealed Basic shader",
 mobile:"lower-frequency filtered grain, no sparse scratch sampling",
 additionalMeshes:0,additionalDrawCalls:0,additionalLights:0,
 additionalTextures:0,additionalRenderPasses:0,additionalVertexAttributes:0,
 changesGeometry:false,changesRoad:false,changesShip:false,
 changesRails:false,changesCamera:false,changesPhysics:false,
 changesGrip:false,changesZoneWave:false,changesSolarSeal:false,
 keepsOriginalNeon:true,keeps0250DarkGraphite:true
});
const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const ROLES={panel:"HARDSURFACE_PANELS",conduit:"STRUCTURAL_CONDUITS",
 shell:"CLOSED_SHELL",rib:"CURVED_RIBS"};
const ANCHOR=" vec3 m25Final=clamp(m25Graphite+m25Spectral+m25Warm,\n  vec3(0.002),vec3(0.32));";
const FOLLOW=" diffuseColor.rgb=mix(m25Original,m25Final,uDarkMetal0250);";
export function patchMicroSurfaceMetalShader(vertex,fragment,{role="panel",mobile=false}={}){
 if(!(role in ROLES))throw Error("0.25.1 invalid sun-isolated metal role");
 if(!vertex.includes("#include <common>")||
  !fragment.includes("#include <common>")||
  !fragment.includes(ANCHOR)||!fragment.includes(FOLLOW)||
  !fragment.includes("uniform float uDarkMetal0250;")||
  !fragment.includes("uniform float uUnifiedExtent0233;")||
  !fragment.includes("vec3 m25Graphite=")||
  !fragment.includes("vec3 m25Spectral=")||
  !fragment.includes("float m25Local=")||
  !fragment.includes("float m25Grazing=")||
  !fragment.includes("float m25Bevel=")||
  !fragment.includes("float m25Cavity=")||
  !fragment.includes("float m25Near=")||
  !fragment.includes("vec3 m25Tint=")||
  !fragment.includes("varying float vRebirthTrack;")||
  !fragment.includes("varying vec2 vNeonLocalSection;"))
  throw Error("0.25.1 requires complete 0.25.0 graphite / neon shader chain");
 const faceRole=role==="panel",ribRole=role==="rib";
 const quality=mobile?.62:1;
 const roleStrength=faceRole?1:ribRole?.82:role==="conduit"?.75:.50;
 const lines=[
  "// 0.25.1: surface response after 0.25.0 graphite, NOT extra ambient.",
  "if(uMicroMetal0251>0.0001){",
  " float m51Near=1.0-smoothstep(18.0,"+(mobile?"60.0":"73.0")+",p23Distance);",
  " float m51Cavity=clamp(m25Cavity,0.0,1.0);",
  " float m51Bevel=clamp(m25Bevel,0.0,1.0);",
  " float m51Face=1.0-m51Cavity;",
  " vec2 m51UV=vec2(vRebirthTrack,vNeonLocalSection.y);",
  // Brushing follows the ORIGINAL banked track; no world-space decals.
  // Lower frequencies / reduced strength on mobile avoid crawling stripes.
  " float m51Warp=0.14*sin(m51UV.x*0.29+m51UV.y*0.38);",
  " float m51Stria=sin(m51UV.y*"+(mobile?"8.0":"23.0")+
   "+m51UV.x*0.42+m51Warp);",
  " float m51Cross=sin(m51UV.x*"+(mobile?"2.8":"7.1")+
   "+m51UV.y*1.43);",
  " float m51Brush=clamp(0.5+0.34*m51Stria+0.16*m51Cross,0.0,1.0);",
  // Roughness BREAKUP changes the distribution of the neon highlight.
  // For these original MeshBasicMaterial batches there is no true
  // physical roughness uniform; emulate it in the local specular lobe.
  " float m51Macro=0.5+0.5*sin(m51UV.x*0.22+m51UV.y*0.41);",
  " float m51Rough=clamp("+(faceRole?".38":ribRole?".29":".43")+
   "+0.105*m51Macro+0.085*(m51Brush-0.5)+0.13*m51Cavity,0.22,0.73);",
  " float m51Lobe=pow(max(0.0,1.0-m25Facing),",
  "  mix(1.4,4.5,m51Rough));",
  " float m51Local=clamp(0.54*m25Wall+0.60*m25Roof+",
  "  0.34*m25Portal,0.0,1.0);",
  // Specular exists only near the real existing emitters, strongly
  // shaped by the roughness and real geometry bevel/cavity masks.
  " float m51Facet=(0.25+0.75*m51Bevel)*",
  "  (0.36+0.64*m51Lobe)*(1.0-m51Rough);",
  " float m51Polish=m51Local*m51Facet*m51Near*m51Face;",
  " float m51Finish=0.090*m51Polish*"+
   roleStrength.toFixed(2)+"*"+quality.toFixed(2)+";",
  " float m51Mill=0.018*(m51Brush-0.5)*m51Near*m51Face*",
  "  (0.35+0.65*m51Local);",
  // Milling changes charcoal itself ONLY subtly; graphite stays dark.
  " vec3 m51Body=m25Graphite*(1.0+0.21*m51Mill+",
  "  0.11*(m51Brush-0.5)*m51Near);",
  " m51Body*=1.0-0.16*m51Cavity;",
  " vec3 m51Chrome=m25Tint*max(0.0,m51Finish+",
  "  0.012*m51Bevel*m51Local*(1.0-m51Rough));",
  ...(mobile?[]:[
   // Sparse 3D machining score: a high-tier detail visible only in the
   // light, never an all-over scratches texture/noisy white pattern.
   " float m51Seed=fract(sin(floor(m51UV.x*0.41)*12.9898+",
   "  floor(m51UV.y*0.72)*78.233)*43758.5453);",
   " float m51Score=step(0.93,m51Seed)*",
   "  pow(max(0.0,0.5+0.5*sin(m51UV.y*9.0+",
   "  m51UV.x*0.16)),16.0);",
   " m51Chrome+=m25Tint*(0.025*m51Score*m51Near*",
   "  m51Local*m51Face);"
  ]),
  // Protect genuine black joints, do not amplify emitter geometry
  // (emitter is a separate, untouched material), or warm the scene.
  " vec3 m51Crafted=m51Body+m25Spectral+m25Warm+",
  "  m51Chrome*(1.0-0.92*m51Cavity);",
  " m51Crafted=clamp(m51Crafted,vec3(0.002),vec3(0.32));",
  " m25Final=mix(m25Final,m51Crafted,uMicroMetal0251);",
  "}"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment
  .replace("#include <common>",
   "#include <common>\nuniform float uMicroMetal0251;")
  .replace(ANCHOR,ANCHOR+"\n"+lines)};
}
export function installMicroSurfaceShader(material,uniforms,{role="panel",mobile=false}={}){
 if(!(role in ROLES)||!material?.isMeshBasicMaterial||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.25.1 only supports existing sun-isolated metal batches");
 const old=material.onBeforeCompile,oldKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  old.call(this,shader,renderer);
  const patched=patchMicroSurfaceMetalShader(shader.vertexShader,
   shader.fragmentShader,{role,mobile});
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=patched.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return oldKey.call(this)+"-micro-surface-metal-0251-"+role+
   (mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
}
export function installMicroSurfaceMetalDefinition(THREE,world,options={}){
 const base=installDarkMetallicFoundation(THREE,world,options);
 const previous=base.stats(),mobile=!!options.lowMemory;
 const fallback=reason=>({...base,stats(){return {...base.stats(),
  microMetal0251Enabled:false,microMetal0251Status:reason};
 },setMicroMetalComparison(){}});
 if(!previous.darkMetal0250Enabled||
  previous.darkMetal0250Status!=="active"||
  !previous.darkMetal0250NativeEmitterUntouched||
  !previous.darkMetal0250SolarSealed)
  return fallback("0.25.0-not-ready");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const targets=Object.entries(ROLES).filter(([role])=>!mobile||role!=="conduit")
  .map(([role,name])=>({role,
   mesh:group?.children?.find(o=>o.name==="Tunnel / "+name)}));
 if(targets.length!==(mobile?3:4)||
  targets.some(({mesh})=>!mesh?.material?.isMeshBasicMaterial||
   !mesh.geometry?.getAttribute?.("neonLocalSection")||
   !mesh.geometry?.getAttribute?.("glowWeight")))
  return fallback("original-metal-batch-unavailable");
 const amount={value:1},uniforms={uMicroMetal0251:amount};
 for(const {role,mesh} of targets)
  installMicroSurfaceShader(mesh.material,uniforms,{role,mobile});
 const state={
  microMetal0251Enabled:true,microMetal0251Status:"active",
  microMetal0251Version:"0.25.1",microMetal0251Batches:targets.length,
  microMetal0251LowMemory:mobile,
  microMetal0251PreservesDarkGraphite:true,
  microMetal0251PreservesNativeNeon:true,
  microMetal0251SolarSealed:true,
  microMetal0251AddedDrawCalls:0,microMetal0251AddedLights:0,
  microMetal0251AddedTextures:0,microMetal0251ChangesRoad:false,
  microMetal0251ChangesShip:false,microMetal0251ChangesGRIP:false,
  microMetal0251ChangesPhysics:false,microMetal0251WaveSynchronized:true
 };
 return {...base,
  stats(){return {...base.stats(),...state,
   microMetal0251Strength:amount.value,version:"0.25.1"};},
  setMicroMetalComparison(v){amount.value=clamp(v);}
 };
}
