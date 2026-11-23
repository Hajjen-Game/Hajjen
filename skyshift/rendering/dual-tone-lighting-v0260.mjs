// SKYSHIFT 0.26.0 Pass 1 — Dual-Tone Lighting Architecture.
// Zone color stays on native emitter strips; graphite no longer receives
// ONLY the active palette color. A separate stable cyan cove / orange practical
// language produces deliberate cool-warm contrast even during gold or violet.
// This does NOT introduce PBR materials (reserved for 0.26.0 Pass 2).
import {installMicroSurfaceMetalDefinition}
 from "./micro-surface-metal-definition-v0251.mjs";
import {TUNNEL_PORTALS_0211,tunnelProfilePoint0211}
 from "../tunnel-megastructure-v0211.mjs";

export const DUAL_TONE_LIGHTING_0260=Object.freeze({
 version:"0.26.0",pass:1,id:"dual-tone-lighting-0260-pass1",
 base:"0.25.1",comparison:"?dualTone=classic",
 identity:"dark graphite + native zone-colored arcs + persistent ice-cyan coves + amber sconces",
 nativeWave:"existing original 9-stage palette and white-core crest",
 independentAnimationClocks:0,
 material:"original solar-isolated metal batches; no PBR replacement until pass 2",
 cyanFixtures:"20 exposed cyan wall coves + 20 high-tier accents; 20 amber companion strips",
 localBounce:"source-position-limited cyan and amber with restrained original zone tint",
 geometry:"unchanged road, ship, tunnel structural panels, bank, rails and collisions",
 sourceDrawCalls:1,sourceLights:0,newTextures:0,newRenderPasses:0,
 newColliders:0,changesPhysics:false,changesGrip:false,
 changesCamera:false,changesShip:false,changesRoad:false,
 changesRails:false,changesNativeNeon:false,changesSolarSeal:false,
 changesBloom:false,changesExposure:false,keepsMetalMicroDetail:true,
 mobile:"20 cyan cove quads, one batch; reduced highlights, unchanged metal meshes"
});
const clamp=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const ROLE_NAMES=Object.freeze({
 panel:"HARDSURFACE_PANELS",conduit:"STRUCTURAL_CONDUITS",
 shell:"CLOSED_SHELL",rib:"CURVED_RIBS"
});
// The last 0.25.0 fragment line follows 0.25.1's microfacet modulation.
// Inserting here replaces the *base metal's final color*, not native
// emissive strips / postprocessing. At uniform 0 we preserve 0.25.1 exactly.
const ANCHOR=" diffuseColor.rgb=mix(m25Original,m25Final,uDarkMetal0250);";
export function patchDualToneMetalShader(vertex,fragment,{role="panel",mobile=false}={}){
 if(!(role in ROLE_NAMES))throw Error("0.26.0 invalid metal role");
 for(const token of ["#include <common>",ANCHOR,
  "uniform float uMicroMetal0251;","uniform float uDarkMetal0250;",
  "vec3 m25Graphite=","vec3 m25Spectral=","vec3 m25Warm=",
  "vec3 m25Final=clamp(","float m25Wall=","float m25Roof=",
  "float m25Portal=","float m25Cavity=","float m25Bevel=",
  "float m25Grazing=","float m25Facing=","float m25Near=",
  "varying vec2 vNeonLocalSection;","varying float vRebirthTrack;",
  "diffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;"])
  if(!fragment.includes(token))
   throw Error("0.26.0 requires original 0.25.1 sun-sealed metal: "+token);
 if(!vertex.includes("#include <common>"))
  throw Error("0.26.0 missing banked metal vertex stage");
 const roleScale=(role==="panel"?1:role==="rib"?.86:role==="conduit"?.72:.68);
 const mobileScale=mobile?.83:1;
 const lines=[
  "// 0.26.0 P1: secondary cyan and orange have separate physical sites.",
  "// Never tint the whole tunnel with uTunnelOld or any global ambient.",
  "if(uDualTone0260>0.0001){",
  " vec3 d26OriginalMetal=m25Final;",
  " float d26Cavity=clamp(m25Cavity,0.0,1.0);",
  " float d26Bevel=clamp(m25Bevel,0.0,1.0);",
  " float d26Side=abs(vNeonLocalSection.x);",
  " float d26Height=vNeonLocalSection.y;",
  " float d26Face=1.0-0.95*d26Cavity;",
  " float d26Near=clamp(m25Near,0.0,1.0);",
  // Preserve existing brush and 3D edge details while reducing the old
  // blanket zone-tinted specular and slightly deepening the graphite.
  " vec3 d26Micro=clamp(d26OriginalMetal-",
  "  (m25Graphite+m25Spectral+m25Warm),",
  "  vec3(-0.045),vec3(0.10));",
  " vec3 d26Graphite=m25Graphite*0.80+d26Micro*0.67;",
  " d26Graphite*=1.0-0.08*d26Cavity;",
  " vec3 d26Zone=m25Spectral*0.55;",
  // Cold cyan tied to existing, banked wall/roof emitter falloff and
  // the 20 physically visible upper-wall cove segments from this pass.
  // Source masks include the real panel section and portal distance.
  " float d26UpperCove=smoothstep(14.0,20.0,d26Side)*",
  "  exp(-pow((d26Height-23.7)/4.5,2.0));",
  " float d26ColdSource=clamp(0.54*m25Wall+0.47*m25Roof+",
  "  0.72*d26UpperCove*(0.14+0.86*m25Portal),0.0,1.0);",
  " float d26ColdLobe=pow(d26ColdSource,1.65)*",
  "  (0.34+0.66*(d26Bevel+m25Grazing)*0.5);",
  " float d26ColdPower=min(0.17,d26ColdLobe*0.18)*",
  "  d26Face*"+roleScale.toFixed(2)+"*"+mobileScale.toFixed(2)+";",
  " vec3 d26Ice=vec3(0.050,0.69,0.88)*d26ColdPower;",
  // Amber stays a warm practical, confined to the existing portal side
  // where the original 20 small light fixtures are actually mounted.
  " float d26WarmSide=smoothstep(18.5,23.5,d26Side);",
  " float d26WarmHeight=smoothstep(9.0,13.4,d26Height)*",
  "  (1.0-smoothstep(18.5,21.7,d26Height));",
  " float d26WarmSource=pow(clamp(m25Portal,0.0,1.0),1.25)*",
  "  d26WarmSide*d26WarmHeight;",
  " float d26WarmPower=min(0.19,0.25*d26WarmSource)*",
  "  (0.40+0.60*(d26Bevel+m25Grazing)*0.5)*",
  "  (1.0-0.93*d26Cavity);",
  " vec3 d26Amber=vec3(0.91,0.32,0.075)*d26WarmPower;",
  " vec3 d26Output=clamp(d26Graphite+d26Zone+d26Ice+",
  "  m25Warm*0.66+d26Amber,vec3(0.002),vec3(0.30));",
  " m25Final=mix(d26OriginalMetal,d26Output,uDualTone0260);",
  "}"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment
  .replace("#include <common>",
   "#include <common>\nuniform float uDualTone0260;")
  .replace(ANCHOR,lines+"\n"+ANCHOR)};
}
export function installDualToneMetalShader(material,uniforms,{role="panel",mobile=false}={}){
 if(!(role in ROLE_NAMES)||!material?.isMeshBasicMaterial||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.26.0 requires original solar-isolated metal materials");
 const original=material.onBeforeCompile,cacheKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  original.call(this,shader,renderer);
  const patched=patchDualToneMetalShader(shader.vertexShader,shader.fragmentShader,
   {role,mobile});
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=patched.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return cacheKey.call(this)+"-dual-tone-lighting-0260-p1-"+role+
   (mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
}
// One batched, colored physical set of constant cool accents. Warm existing
// sconces and zone-changing neon meshes remain untouched in the base.
// Quad positions follow SAME original banked/corkscrew tunnel profile.
function makeCoolCoveBatch(THREE,positionAt,{lowMemory=false,
 vaultHeightClassic=false}={}){
 if(typeof positionAt!=="function")
  throw Error("0.26.0 needs real banked positionAt sampler");
 const positions=[],colors=[];
 const cyan=new THREE.Color(0x31ddf2);
 const amber=new THREE.Color(0xffa35d);
 function point(s,side,t,lower=false){
  const a=tunnelProfilePoint0211(lower?8:10,s,vaultHeightClassic);
  const b=tunnelProfilePoint0211(lower?9:11,s,vaultHeightClassic);
  // Move emitters in front of the 0.24.1 raised metal panel face:
  // old 0.19m offset left real strips hidden behind 0.58m relief.
  const x=Math.abs(a[0]*(1-t)+b[0]*t)-0.82;
  const y=a[1]*(1-t)+b[1]*t-0.085;
  const v=positionAt(s,side*x,y);
  if(!Number.isFinite(v.x+v.y+v.z))
   throw Error("0.26.0 cove position is non-finite");
  return [v.x,v.y,v.z];
 }
 function quad(a,b,c,d,tint=cyan){
  for(const q of [a,b,c,a,c,d]){
   positions.push(...q);
   colors.push(tint.r,tint.g,tint.b);
  }
 }
 let strips=0,shortAccents=0,warmStrips=0;
 for(const portal of TUNNEL_PORTALS_0211){
  const lo=portal+2.0,hi=Math.min(portal+16.0,367.2);
  if(lo+0.8>hi)continue;
  for(const side of [-1,1]){
   // An intermittent horizontal cove on each upper side wall. It is
   // far from existing lower amber practicals and clear of the deck.
   quad(point(lo,side,.31),point(hi,side,.31),
        point(hi,side,.41),point(lo,side,.41));
   strips++;
   // Warm detail has an independently colored physical emitter near
   // each existing orange portal practical, below upper cyan coves.
   const w0=portal+2.4,w1=Math.min(portal+5.1,367.1);
   if(w1-w0>0.7){
    quad(point(w0,side,.14,true),point(w1,side,.14,true),
     point(w1,side,.23,true),point(w0,side,.23,true),amber);
    warmStrips++;
   }
   if(!lowMemory&&portal+2.1<=367.2){
    // Tiny vertical cyan accent tied to that bay's portal, not a
    // copy of the native zone-colored full arch.
    quad(point(portal+1.4,side,.23),point(portal+2.1,side,.23),
         point(portal+2.1,side,.47),point(portal+1.4,side,.47));
    shortAccents++;
   }
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
 geometry.computeBoundingSphere();
 const material=new THREE.MeshBasicMaterial({
  color:0xffffff,vertexColors:true,side:THREE.DoubleSide,
  toneMapped:false,depthWrite:false,depthTest:true
 });
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name="SKYSHIFT 0.26.0 / stable cyan cove emitters";
 mesh.frustumCulled=true;mesh.renderOrder=2;
 return {mesh,strips,shortAccents,warmStrips};
}
export function installDualToneLightingPass1(THREE,world,options={}){
 const base=installMicroSurfaceMetalDefinition(THREE,world,options);
 const old=base.stats(),mobile=!!options.lowMemory;
 const fallback=reason=>({...base,
  stats(){return {...base.stats(),dualTone0260Enabled:false,
   dualTone0260Status:reason};},
  setDualToneComparison(){}
 });
 if(!old.microMetal0251Enabled||
  old.microMetal0251Status!=="active"||
  !old.microMetal0251PreservesDarkGraphite||
  !old.microMetal0251SolarSealed||
  !old.microMetal0251PreservesNativeNeon)
  return fallback("0.25.1-material-chain-not-ready");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const original=Object.entries(ROLE_NAMES)
  .filter(([role])=>!mobile||role!=="conduit")
  .map(([role,name])=>({role,
   mesh:group?.children?.find(m=>m.name==="Tunnel / "+name)}));
 const nativeEmitter=group?.children?.find(m=>m.name==="Tunnel / INTEGRATED_LIGHT");
 if(original.length!==(mobile?3:4)||
  !nativeEmitter?.material?.isMeshBasicMaterial||
  original.some(({mesh})=>!mesh?.material?.isMeshBasicMaterial||
   !mesh.geometry?.getAttribute?.("neonLocalSection")||
   !mesh.geometry?.getAttribute?.("glowWeight")))
  return fallback("original-metal-or-native-neon-missing");
 let coves;
 try{coves=makeCoolCoveBatch(THREE,options.positionAt,options);}
 catch(e){
  console.warn("SKYSHIFT 0.26.0 retaining 0.25.1 due to cove build error",e);
  return fallback("cove-geometry-failed");
 }
 const amount={value:1},uniforms={uDualTone0260:amount};
 for(const {role,mesh} of original)
  installDualToneMetalShader(mesh.material,uniforms,{role,mobile});
 group.add(coves.mesh);
 const state={
  dualTone0260Enabled:true,dualTone0260Status:"active",
  dualTone0260Pass:1,dualTone0260Version:"0.26.0",
  dualTone0260Batches:original.length,
  dualTone0260CyanCoveStrips:coves.strips,
  dualTone0260CyanAccents:coves.shortAccents,
  dualTone0260AmberAccentStrips:coves.warmStrips,
  dualTone0260LowMemory:mobile,
  dualTone0260PaletteMode:"native-zone-plus-constant-cyan-and-amber",
  dualTone0260WarmFixturesRetained:old.darkMetal0250Fixtures===20,
  dualTone0260NativeNeonUnchanged:true,dualTone0260SolarSealed:true,
  dualTone0260AddedDrawCalls:1,dualTone0260AddedDynamicLights:0,
  dualTone0260AddedTextures:0,dualTone0260ChangesRoad:false,
  dualTone0260ChangesShip:false,dualTone0260ChangesGRIP:false,
  dualTone0260ChangesPhysics:false,dualTone0260WaveSynchronized:true
 };
 return {...base,
  stats(){return {...base.stats(),...state,version:"0.26.0",
   dualTone0260Strength:amount.value};},
  setDualToneComparison(v){
   amount.value=clamp(v);
   coves.mesh.visible=amount.value>0.001;
  },
  dispose(){
   coves.mesh.removeFromParent();
   coves.mesh.geometry.dispose();
   coves.mesh.material.dispose();
   base.dispose?.();
  }
 };
}
