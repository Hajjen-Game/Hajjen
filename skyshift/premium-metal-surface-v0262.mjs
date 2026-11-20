// SKYSHIFT 0.26.2 — Premium Metal Surface Library (Pass 2 / 4).
// A physically based, locally lit material finish for the EXISTING panel/rib
// MeshPhysicalMaterial coats. No new mesh, draw call, road, ship, light or sun.
// Packed, mipmapped data texture: R/B micro-normal, G roughness, A milling.
// Directional brushing follows the original banked tunnel track coordinates.
// No global IBL or environment light; 0.26.1 finite GGX sources remain intact.
import {installTrueLocalReflectionsPass1} from "./local-reflections-v0261p1.mjs";
export const PREMIUM_METAL_0262=Object.freeze({
 version:"0.26.2",pass:2,id:"premium-metal-surface-library-0262",
 finish:"dark brushed titanium panels, satin ribs, machined edges",
 graphiteSubstrate:"same packed atlas on original solar-sealed dark panel bodies",
 technique:"mipmapped packed micro-normal/roughness atlas sampled in native physical GGX shader",
 textureSizeHigh:256,textureSize4GB:128,
 textureCount:1,addedMeshes:0,addedDrawCalls:0,addedLights:0,
 addedPostprocessPasses:0,addedReflectionProbes:0,
 changesRoad:false,changesRails:false,changesShip:false,
 changesPhysics:false,changesGRIP:false,changesCamera:false,
 changesNativeNeon:false,changesSolarSeal:false,
 comparison:"?premiumMetal=classic"
});
const ROLES=["panel","rib"];
const COMMON="#include <common>",ROUGH="#include <metalnessmap_fragment>";
const NORMAL="#include <normal_fragment_maps>";
const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number.isFinite(v)?v:a));
const fract=x=>x-Math.floor(x);
function noise(x,y){return fract(Math.sin(x*127.1+y*311.7)*43758.5453123);}
export function buildPremiumMetalAtlas0262(size=256){
 if(size!==128&&size!==256)throw Error("0.26.2 atlas quality must be 128 or 256");
 const pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(y+.5)/size;
  const wave=Math.sin(v*Math.PI*(size===256?156:68)+
   .33*Math.sin(u*21.0)+.18*Math.sin(u*73.0));
  const cross=Math.sin(u*41.0+v*17.0);
  const broad=Math.sin(u*8.5+v*4.9);
  const grain=noise(x,y)-.5;
  const score=noise(Math.floor(x/13),Math.floor(y/9));
  const scoreLine=score>.925?Math.pow(Math.max(0,Math.cos(v*60.0)),12):0;
  const rough=clamp(.58+.13*wave+.11*broad+.06*grain+.09*scoreLine,.33,.88);
  const i=(y*size+x)*4;
  pixels[i]=Math.round(clamp(128+22*wave+6*grain,0,255));
  pixels[i+1]=Math.round(rough*255);
  pixels[i+2]=Math.round(clamp(128+9*cross+5*grain,0,255));
  pixels[i+3]=Math.round(clamp(200+35*broad-40*scoreLine,0,255));
 }
 return {pixels,size,bytes:pixels.byteLength};
}
export function makePremiumMetalTexture0262(THREE,mobile=false){
 const atlas=buildPremiumMetalAtlas0262(mobile?128:256);
 const texture=new THREE.DataTexture(atlas.pixels,atlas.size,atlas.size,
  THREE.RGBAFormat,THREE.UnsignedByteType);
 texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;
 texture.magFilter=THREE.LinearFilter;
 texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.generateMipmaps=true;texture.anisotropy=mobile?1:2;
 texture.colorSpace=THREE.NoColorSpace;
 texture.needsUpdate=true;texture.name="SKYSHIFT 0.26.2 / packed titanium finish";
 return texture;
}
export function patchPremiumMetalShader0262(vertex,fragment,{role="panel",mobile=false}={}){
 if(!ROLES.includes(role))throw Error("0.26.2 only supports tunnel metal coats");
 for(const token of [COMMON,ROUGH,NORMAL,"vPbrTrack0260","vPbrSection0260",
  "RE_Direct(l261"])if(!fragment.includes(token))
  throw Error("0.26.2 requires live 0.26.1 locally lit physical shader: "+token);
 const header=[
  "uniform sampler2D uMetalAtlas0262;",
  "uniform float uPremiumMetal0262;",
  "// Atlas UV is locked to original banked track geometry, never the camera.",
  "// Local metal coordinates reuse 0.26.0 physical metal varyings."
 ].join("\n");
 const rough=[
  "if(uPremiumMetal0262>0.0001){",
  " vec4 m262=texture2D(uMetalAtlas0262,vec2(vPbrTrack0260*0.25,vPbrSection0260.y*0.58));",
  " float m262Polish="+(role==="rib"?"0.89":"1.0")+";",
  " float m262R=clamp(roughnessFactor*",
  "   (0.68+0.48*m262.g)*m262Polish,0.24,0.68);",
  " roughnessFactor=mix(roughnessFactor,m262R,uPremiumMetal0262);",
  "}"
 ].join("\n");
 const normal=mobile?"// 0.26.2 mobile: filtered roughness only; skip per-pixel tangent derivatives.":[
  "if(uPremiumMetal0262>0.0001){",
  " vec2 m262UV=vec2(vPbrTrack0260*0.25,vPbrSection0260.y*0.58);",
  " vec4 m262N=texture2D(uMetalAtlas0262,m262UV);",
  " vec3 m262DX=dFdx(-vViewPosition),m262DY=dFdy(-vViewPosition);",
  " vec2 m262TX=dFdx(m262UV),m262TY=dFdy(m262UV);",
  " vec3 m262T=m262DX*m262TY.y-m262DY*m262TX.y;",
  " vec3 m262B=m262DY*m262TX.x-m262DX*m262TY.x;",
  " if(dot(m262T,m262T)>0.0000001&&dot(m262B,m262B)>0.0000001){",
  "  m262T=normalize(m262T);m262B=normalize(m262B);",
  "  vec2 m262Grain=(m262N.rb*2.0-1.0);",
  "  float m262Amp="+(role==="rib"?"0.12":"0.21")+";",
  "  normal=normalize(normal+uPremiumMetal0262*m262Amp*",
  "    (m262T*m262Grain.x+m262B*m262Grain.y));",
  " }",
  "}"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment
  .replace(COMMON,COMMON+"\n"+header)
  .replace(ROUGH,rough+"\n"+ROUGH)
  .replace(NORMAL,NORMAL+"\n"+normal)};
}
export function installPremiumMetalShader0262(material,uniforms,opts){
 if(!material?.isMeshPhysicalMaterial||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.26.2 requires actual locally lit MeshPhysicalMaterial");
 const prior=material.onBeforeCompile,priorKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  prior.call(this,shader,renderer);
  const patched=patchPremiumMetalShader0262(shader.vertexShader,
   shader.fragmentShader,opts);
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=patched.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return priorKey.call(this)+"-premium-titanium-0262-"+opts.role+
   (opts.mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=prior;
  material.customProgramCacheKey=priorKey;material.needsUpdate=true;};
}
// The 0.26.0 graphite underneath the translucent GGX coat needs surface
// definition too. Otherwise micro-normals affect only a thin additive layer
// and the tunnel still reads as flat stripes at full racing speed. Sample the
// SAME packed atlas on the original, already sun-isolated substrate. Restrict
// changes to bounded charcoal values and locally lit bevels; never emit light.
const SUBSTRATE_ANCHOR=" m25Final=mix(d26OriginalMetal,d26Output,uDualTone0260);";
export function patchPremiumSubstrateShader0262(vertex,fragment,
 {role="panel",mobile=false}={}){
 if(!["panel","rib","shell","conduit"].includes(role)||
  !fragment.includes(SUBSTRATE_ANCHOR)||
  !fragment.includes("float m25Cavity=")||
  !fragment.includes("float m25Wall=")||
  !fragment.includes("float m25Roof=")||
  !fragment.includes("varying float vRebirthTrack;")||
  !fragment.includes("varying vec2 vNeonLocalSection;"))
  throw Error("0.26.2 requires existing sealed graphite/dual-tone substrate");
 const factor=role==="panel"?.80:role==="rib"?.58:
  role==="conduit"?.42:.34;
 const body=[
  "if(uPremiumMetal0262>0.0001){",
  " vec2 s262UV=vec2(vRebirthTrack*0.25,vNeonLocalSection.y*0.58);",
  " vec4 s262=texture2D(uMetalAtlas0262,s262UV);",
  " float s262Face=1.0-clamp(m25Cavity,0.0,1.0);",
  " float s262Lit=clamp(0.25+0.75*max(m25Wall,m25Roof),0.25,1.0);",
  " float s262Grain=(s262.g-0.58)*0.90+(s262.r-0.50)*0.40;",
  " float s262Mill=(s262.a-0.78)*0.12;",
  " float s262Gain=clamp(1.0+(",
  "   s262Grain+s262Mill)*s262Lit*s262Face*"+factor.toFixed(2)+
   "*uPremiumMetal0262,0.76,1.20);",
  " m25Final=clamp(m25Final*s262Gain,vec3(0.002),vec3(0.30));",
  "}"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment
  .replace("#include <common>","#include <common>\nuniform sampler2D uMetalAtlas0262;\nuniform float uPremiumMetal0262;")
  .replace(SUBSTRATE_ANCHOR,SUBSTRATE_ANCHOR+"\n"+body)};
}
export function installPremiumSubstrateShader0262(material,uniforms,opts){
 if(!material?.isMeshBasicMaterial||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.26.2 substrate must be original sealed MeshBasicMaterial");
 const old=material.onBeforeCompile,oldKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  old.call(this,shader,renderer);
  const patched=patchPremiumSubstrateShader0262(shader.vertexShader,
   shader.fragmentShader,opts);
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=patched.fragmentShader;
 };
 material.customProgramCacheKey=function(){return oldKey.call(this)+
  "-premium-titanium-substrate-0262-"+opts.role+
  (opts.mobile?"-4gb":"-high");};
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=old;
  material.customProgramCacheKey=oldKey;material.needsUpdate=true;};
}
export function installPremiumMetalSurfaceLibrary(THREE,world,options={}){
 const base=installTrueLocalReflectionsPass1(THREE,world,options);
 const prev=base.stats(),mobile=!!options.lowMemory;
 const fallback=reason=>({...base,stats(){return {...base.stats(),
  premiumMetal0262Enabled:false,premiumMetal0262Status:reason};},
  setPremiumMetalComparison(){}});
 if(!prev.localReflections0261Enabled||prev.localReflections0261Status!=="active"||
  !prev.localReflections0261SunIsolated||!prev.trueMetal0260P2NativeGGX)
  return fallback("0.26.1-physical-local-reflections-unavailable");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const targets=ROLES.filter(role=>!mobile||role==="panel")
  .map(role=>({role,mesh:group?.children?.find(child=>
   child.name==="SKYSHIFT 0.26.0 P2 / true physical "+role)}));
 if(targets.some(({mesh})=>!mesh?.material?.isMeshPhysicalMaterial))
  return fallback("0.26.1-metal-coats-unavailable");
 const substrateRoles=["panel","rib","shell",...(mobile?[]:["conduit"])];
 const substrates=substrateRoles.map(role=>({role,mesh:group?.children?.find(
  child=>child.name==="Tunnel / "+({panel:"HARDSURFACE_PANELS",
  rib:"CURVED_RIBS",shell:"CLOSED_SHELL",
  conduit:"STRUCTURAL_CONDUITS"})[role])}));
 if(substrates.some(({mesh})=>!mesh?.material?.isMeshBasicMaterial))
  return fallback("0.26.0-graphite-substrate-unavailable");
 const power={value:1},texture=makePremiumMetalTexture0262(THREE,mobile);
 const uniforms={uPremiumMetal0262:power,uMetalAtlas0262:{value:texture}};
 const restores=[];
 try{
  for(const {role,mesh} of targets){
   restores.push(installPremiumMetalShader0262(mesh.material,uniforms,
    {role,mobile}));
  }
  for(const {role,mesh} of substrates){
   restores.push(installPremiumSubstrateShader0262(mesh.material,uniforms,
    {role,mobile}));
  }
 }catch(error){
  for(const restore of restores)restore();
  texture.dispose();
  console.warn("SKYSHIFT 0.26.2 retaining previous local metal",error);
  return fallback("premium-material-install-failed");
 }
 const stats={
  premiumMetal0262Enabled:true,premiumMetal0262Status:"active",
  premiumMetal0262Pass:2,premiumMetal0262Version:"0.26.2",
  premiumMetal0262PhysicalGGX:true,premiumMetal0262SolarSealed:true,
  premiumMetal0262KeepsLocalReflections:true,
  premiumMetal0262Textures:1,premiumMetal0262TextureSize:mobile?128:256,
  premiumMetal0262Batches:targets.length,
  premiumMetal0262SubstrateBatches:substrates.length,
  premiumMetal0262Mobile:mobile,premiumMetal0262AddedDrawCalls:0,
  premiumMetal0262AddedDynamicLights:0,
  premiumMetal0262AddedRenderPasses:0,
  premiumMetal0262ChangesRoad:false,premiumMetal0262ChangesShip:false,
  premiumMetal0262ChangesGRIP:false,premiumMetal0262ChangesNativeNeon:false
 };
 return {...base,
  stats(){return {...base.stats(),...stats,
   premiumMetal0262Strength:power.value,version:"0.26.2"};},
  setPremiumMetalComparison(v){power.value=clamp(v,0,1);},
  dispose(){for(const restore of restores)restore();
   texture.dispose();base.dispose?.();}
 };
}
