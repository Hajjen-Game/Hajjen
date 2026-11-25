// SKYSHIFT 0.27.3 — Full Tunnel Lighting & Visual Parity
// The actual Skyline 0.26.0 P2 native Three.MeshPhysicalMaterial GGX +
// 0.26.1 multi-sample finite strip shader + 0.26.5 wall response are reused.
// Their EXISTING shader functions receive Vault's actual 27m/42.5m emitter
// positions on all 3400m, never the old 368m constant. The original 0.27.2
// raised metal geometry and 0.26.2 atlas are also reused. No fake sun, SSR,
// global lighting or alternate GRIP/physics. ?vaultLighting=classic restores
// exactly the 0.27.2 appearance and controls for a same-frame comparison.
import {patchVaultMaterialShader0271}
 from "./vault-material-parity-v0271.mjs";
import {installTrueMetalPBRShader}
 from "../../rendering/true-metal-materials-v0260p2.mjs";
import {installLocalStripShader0261}
 from "../../rendering/local-reflections-v0261p1.mjs";
import {patchPhysicalWall0265}
 from "../../true-rail-wall-response-v0265.mjs";
import {vaultCrossSection0270}
 from "./full-tunnel-circuit-v0270.mjs";
import {widthAt} from "../../tracks/trials/trial-v0165.mjs";
import {sharedPhysicalPreset0280,SHARED_TUNNEL_ROUTES_0280} from "../../shared-tunnel-architecture-v0280.mjs";
import {patchVaultPremiumPhysical0274,patchVaultPremiumSource0274,
 patchVaultPremiumRail0274,vaultPremiumFinishAudit0274}
 from "./vault-premium-finish-v0274.mjs";
const ROOT="SKYSHIFT · Neon Vault Full Tunnel 0.27.0";
const PANEL="SKYLINE REAL-DEPTH HARDSURFACE_PANELS";
const CONDUIT="SKYLINE SERVICE CONDUITS";
const RAIL="Angular integrated aero-barrier body";
const BODY="CYAN ROOF + AMBER WALL + LOWER RAIL SOURCES";
const VAULT_ROUTE_0280=SHARED_TUNNEL_ROUTES_0280.vault.segments[0];
const END=VAULT_ROUTE_0280.end,ROOF_PITCH=VAULT_ROUTE_0280.roofPitch,ARCH_PITCH=VAULT_ROUTE_0280.amberPitch,RAIL_PITCH=VAULT_ROUTE_0280.railPitch;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const v=clamp((x-a)/Math.max(.0001,b-a));return v*v*(3-2*v)};
const fall=(d,w)=>Math.exp(-((d/w)**2));
const distInterval=(s,a,b)=>s<a?a-s:s>b?s-b:0;
export const VAULT_LIGHTING_0273=Object.freeze({
 version:"0.27.3",track:"vault",lengthMeters:END,
 sourceChain:["0.26.0 P2 native physical metal GGX",
  "0.26.1 finite strip multi-sample GGX",
  "0.26.5 source-masked wall roughness and response",
  "0.26.2 reused packed micro-normal/roughness atlas",
  "0.26.3.2 real short rail fixture positioning"],
 physicalMaterial:"MeshPhysicalMaterial",roadMaterial:"MeshStandardMaterial",
 roofSourcePitch:ROOF_PITCH,amberSourcePitch:ARCH_PITCH,
 railSourcePitch:RAIL_PITCH,
 highMetalTaps:7,mobileMetalTaps:5,
 railHighTaps:2,railMobileTaps:1,
 originalPanelsUnchanged:true,originalTrackUnchanged:true,
 originalShipUnchanged:true,originalCameraUnchanged:true,
 originalGRIPUnchanged:true,originalPhysicsUnchanged:true,
 skylineUnchanged:true,auroraUnchanged:true,
 noNewWorldLights:true,noNewPostprocess:true,noNewColliders:true,
 noSSR:true,noPMREM:true,sourceAtlasShared:true,
 comparison:"?vaultLighting=classic"
});
// The exact existing Vault emitter geometry lives in 0.27.0:
// 27m roof, start +6/end +17; 42.5m amber, +.13 to +2.1;
// 24m rail cyan +4.5 to +11. The GPU must see these same locations.
export function vaultFixtureAt0273(s,side,positionAt){
 if(!Number.isFinite(s)||s<0||s>END||![-1,1].includes(side)||
  typeof positionAt!=="function")throw Error("0.27.3 invalid real fixture input");
 const ck=clamp(Math.round((s-11.5)/ROOF_PITCH),0,125);
 const wk=clamp(Math.round((s-1.115)/ARCH_PITCH),0,80);
 const cs=clamp(ck*ROOF_PITCH+11.5,0,END),
  ws=clamp(wk*ARCH_PITCH+1.115,0,END);
 const cy=vaultCrossSection0270(side<0?13:17,cs)[1]-.94;
 const cold=positionAt(cs,side*8.8,cy);
 const warm=positionAt(ws,side*25.18,8.40);
 const cMask=fall(distInterval(s,ck*27+6,ck*27+17),9.0);
 const wMask=fall(distInterval(s,wk*42.5+.13,wk*42.5+2.1),7.5);
 return {cold,warm,cs,ws,ck,wk,cMask,wMask};
}
const nativeAttrs=[
 ["pbrColdPosition0260",3],["pbrWarmPosition0260",3],
 ["localStripAxis0261",3],["localStripMasks0261",2]
];
export function buildVaultPhysicalSources0273(geo,positionAt,{
 mobile=false
}={}){
 const arc=geo?.getAttribute?.("trackS"),
  section=geo?.getAttribute?.("neonLocalSection"),
  vertices=geo?.getAttribute?.("position");
 if(!arc||!section||!vertices||arc.count!==section.count||
  arc.count!==vertices.count||section.itemSize!==2||
  typeof positionAt!=="function")
  throw Error("0.27.3 requires actual Skyline facet-sculptor section data");
 const count=arc.count,cold=new Float32Array(count*3),
  warm=new Float32Array(count*3),axis=new Float32Array(count*3),
  masks=new Float32Array(count*2),cache=new Map();
 let bright=0,coldSamples=0,warmSamples=0;
 for(let i=0;i<count;i++){
  const s=arc.getX(i),lx=section.getX(i),ly=section.getY(i),
   side=lx<0?-1:1;
  if(!Number.isFinite(s+lx+ly)||s<0||s>END)
   throw Error("0.27.3 invalid original sculptor track coordinate");
  const k=(Math.round(s*10)/10)+":"+side;
  let f=cache.get(k);
  if(!f){
   f=vaultFixtureAt0273(s,side,positionAt);
   const h=vaultCrossSection0270(side<0?13:17,s)[1]-.94;
   const a=positionAt(clamp(s-1.0,0,END),side*8.8,h);
   const b=positionAt(clamp(s+1.0,0,END),side*8.8,h);
   const mag=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)||1;
   f.axis=[(b.x-a.x)/mag,(b.y-a.y)/mag,(b.z-a.z)/mag];
   cache.set(k,f);
  }
  cold.set([f.cold.x,f.cold.y,f.cold.z],i*3);
  warm.set([f.warm.x,f.warm.y,f.warm.z],i*3);
  axis.set(f.axis,i*3);
  // Native 0.26.1 finite-area taps only near the authored source bay.
  // 0.26.5 restricts the brighter response to WALL, not bright roof.
  const cc=f.cMask*(.28+.72*smooth(11,23,ly)),
   ww=f.wMask*smooth(12.5,20,Math.abs(lx))*
    (1-smooth(23,27,ly));
  masks.set([cc,ww],i*2);
  if(cc>.05) coldSamples++;
  if(ww>.05) warmSamples++;
  if(cc>.05||ww>.05)bright++;
 }
 return {cold,warm,axis,masks,vertices:count,bright,
  coldSamples,warmSamples,uniqueSamples:cache.size,mobile};
}
function installPhysicalShader0273(material,role,mobile,atlas,power,finish=null){
 const uniforms={uTrueMetal0260P2:power,uLocalReflections0261:power};
 installTrueMetalPBRShader(material,uniforms,{role,mobile});
 installLocalStripShader0261(material,uniforms,{role,mobile});
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.fragmentShader=shader.fragmentShader.replace("#include <common>",
   "#include <common>\nuniform float uFixtureTransport02643;");
  // The original 0.26.5 wall shader expects the 0.26.4.3 near-source
  // precursor. Vault already provides a real vLocalMask0261 derived from
  // its own 27m / 42.5m emitters, so supply the exact compatible mask
  // in the SAME physical source-map scope; do not port Skyline's 368m map.
  shader.fragmentShader=shader.fragmentShader.replace(
   "#include <lights_fragment_maps>",
   "float f42Near=clamp(max(vLocalMask0261.x*0.85,vLocalMask0261.y),0.0,1.0);\n"+
   "#include <lights_fragment_maps>");
  const wall=patchPhysicalWall0265(shader.vertexShader,
   shader.fragmentShader,{role,mobile});
  const metal=patchVaultMaterialShader0271(wall.vertexShader,
   wall.fragmentShader,{role:role==="panel"?"shell":"rib",mobile});
  // The approved 0.26.2 packed atlas also drives TRUE physical
  // GGX roughness instead of only its prior Basic albedo tint.
  const marker="#include <roughnessmap_fragment>";
  if(!metal.fragmentShader.includes(marker))
   throw Error("0.27.3 no native physical roughness anchor");
  const mapped=metal.fragmentShader.replace(marker,marker+
   "\nroughnessFactor=clamp(roughnessFactor+"+
   " (texture2D(uVaultMetalAtlas0271,vVaultMaterialCoord0271*vec2(.25,.58)).g-.52)*"+
   (mobile?".09":".16")+",.22,.68);");
  shader.vertexShader=metal.vertexShader;
  shader.fragmentShader=finish?
   patchVaultPremiumPhysical0274(mapped,{role,mobile}):mapped;
  if(finish)shader.uniforms.uVaultPremiumFinish0274=finish;
  shader.uniforms.uTrueRailWall0265=power;
  shader.uniforms.uFixtureTransport02643=power;
  shader.uniforms.uVaultMetalAtlas0271={value:atlas};
  shader.uniforms.uVaultMaterialStrength0271=power;
 };
 material.customProgramCacheKey=function(){
  return key.call(this)+"-vault-0273-shared-0260-0261-0265-"+role+
   (mobile?"-mobile":"-high")+(finish?"-finish0274":"");
 };
 material.needsUpdate=true;
}
function physicalCoat(THREE,role,mobile,atlas,power,finish=null){
 const m=new THREE.MeshPhysicalMaterial({
  ...sharedPhysicalPreset0280(role,mobile,"vault"),
  side:THREE.DoubleSide,forceSinglePass:true,
  transparent:true,
  blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,
  polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
 });
 installPhysicalShader0273(m,role,mobile,atlas,power,finish);
 return m;
}
const RAIL_FACE=[.16,.80,1,.88,.28,.08,0,0];
export function buildVaultRailSources0273(geo,positionAt,{
 mobile=false
}={}){
 const arc=geo?.getAttribute?.("aBarrierArc"),
  vertices=geo?.getAttribute?.("position");
 if(!arc||!vertices||arc.count!==vertices.count||
  arc.count%16!==0||typeof positionAt!=="function")
  throw Error("0.27.3 needs original indexed aero rail body");
 const n=arc.count,half=n/2;
 const a=new Float32Array(n*3),b=mobile?null:new Float32Array(n*3),
  mask=new Float32Array(n);
 let lit=0;
 for(let i=0;i<n;i++){
  const s=arc.getX(i),side=i<half?-1:1,profile=i%8;
  if(s<0||s>END||!RAIL_FACE[profile])continue;
  let k=Math.floor((s-4.5)/RAIL_PITCH);
  k=clamp(k,0,141);
  const cent=k*RAIL_PITCH+7.75;
  const near=Math.abs(s-cent)>RAIL_PITCH*.5?
   Math.round((s-7.75)/RAIL_PITCH)*RAIL_PITCH+7.75:cent;
  const d=Math.max(Math.abs(s-near)-3.25,0);
  const strength=RAIL_FACE[profile]*fall(d,mobile?5.0:6.5);
  if(strength<.0005)continue;
  const emit=(ss)=>{
   const t=clamp(ss,0,END);
   return positionAt(t,side*(widthAt(t)/2-.91),.18);
  };
  const p=emit(near);
  a.set([p.x,p.y,p.z],i*3);
  if(b){const q=emit(near+1.2);b.set([q.x,q.y,q.z],i*3);}
  mask[i]=strength;lit++;
 }
 return {a,b,mask,vertices:n,litVertices:lit};
}
export function patchVaultRailGGX0273(vertex,fragment,{mobile=false}={}){
 for(const k of ["#include <common>","#include <worldpos_vertex>"])
  if(!vertex.includes(k))throw Error("0.27.3 original rail vertex anchor "+k);
 for(const k of ["#include <common>","#include <lights_fragment_maps>",
  "#include <roughnessmap_fragment>","#include <metalnessmap_fragment>"])
  if(!fragment.includes(k))throw Error("0.27.3 original rail GGX fragment "+k);
 const hdr=[
  "attribute vec3 aVaultRailSourceA0273;",
  ...(mobile?[]:["attribute vec3 aVaultRailSourceB0273;"]),
  "attribute float aVaultRailMask0273;",
  "varying vec3 vVaultRailA0273;",
  ...(mobile?[]:["varying vec3 vVaultRailB0273;"]),
  "varying float vVaultRailMask0273;"
 ].join("\n");
 const fhead=[
  "uniform float uVaultRailResponse0273;",
  "varying vec3 vVaultRailA0273;",
  ...(mobile?[]:["varying vec3 vVaultRailB0273;"]),
  "varying float vVaultRailMask0273;"
 ].join("\n");
 const sample=(id,weight)=>[
  "{IncidentLight v27Rail;",
  " v27Rail.visible=true;",
  " v27Rail.direction=normalize("+id+"+vec3(.00001));",
  " float v27Range=length("+id+");",
  " v27Rail.color=vec3(.035,.51,.83)*",
  " (v27RailPower*"+weight+"*"+
   (mobile?"3.2":"4.8")+"/(1.0+pow(v27Range/3.5,2.0)));",
  " vec3 v27OldDiffuse=reflectedLight.directDiffuse;",
  " RE_Direct(v27Rail,geometryPosition,geometryNormal,geometryViewDir,",
  " geometryClearcoatNormal,material,reflectedLight);",
  " reflectedLight.directDiffuse=v27OldDiffuse;}"
 ].join("\n");
 const body=[
  "float v27RailPower=clamp(vVaultRailMask0273,0.,1.)*uVaultRailResponse0273;",
  "if(v27RailPower>.001){",
  sample("vVaultRailA0273",mobile?"1.0":"0.5"),
  ...(mobile?[]:[sample("vVaultRailB0273","0.5")]),
  "}"
 ].join("\n");
 return {vertexShader:vertex.replace("#include <common>",
  "#include <common>\n"+hdr)
  .replace("#include <worldpos_vertex>",
   "#include <worldpos_vertex>\n"+
   "vVaultRailA0273=(viewMatrix*vec4(aVaultRailSourceA0273,1.)).xyz-mvPosition.xyz;"+
   (mobile?"":"\nvVaultRailB0273=(viewMatrix*vec4(aVaultRailSourceB0273,1.)).xyz-mvPosition.xyz;")+
   "\nvVaultRailMask0273=aVaultRailMask0273;"),
  fragmentShader:fragment.replace("#include <common>",
   "#include <common>\n"+fhead)
   .replace("#include <roughnessmap_fragment>",
    "#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,"+
    (mobile?".46":".39")+",clamp(vVaultRailMask0273,0.,1.)*uVaultRailResponse0273*.92);")
   .replace("#include <metalnessmap_fragment>",
    "#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.52,clamp(vVaultRailMask0273,0.,1.)*uVaultRailResponse0273*.8);")
   .replace("#include <lights_fragment_maps>",
    body+"\n#include <lights_fragment_maps>")
 };
}
function wrapRail(rail,power,mobile,finish=null){
 const material=rail.material,prior=material.onBeforeCompile,
  key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  prior.call(this,shader,renderer);
  const p=patchVaultRailGGX0273(shader.vertexShader,
   shader.fragmentShader,{mobile});
  shader.vertexShader=p.vertexShader;
  shader.fragmentShader=finish?
   patchVaultPremiumRail0274(p.fragmentShader,{mobile}):p.fragmentShader;
  shader.uniforms.uVaultRailResponse0273=power;
  if(finish)shader.uniforms.uVaultPremiumFinish0274=finish;
 };
 material.customProgramCacheKey=function(){
  return key.call(this)+"-vault-rail-local-0273"+(mobile?"-mobile":"-high")+(finish?"-finish0274":"");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=prior;
  material.customProgramCacheKey=key;material.needsUpdate=true;};
}
function boostFixture(material,power,mobile,finish=null){
 const before=material.onBeforeCompile,key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  before.call(this,shader,renderer);
  const marker="#include <color_fragment>";
  if(!shader.fragmentShader.includes(marker))
   throw Error("0.27.3 old visible source shader missing vertex color");
  // Source ribbons are the actual inlaid geometry from 0.27.0.
  // Do not add distant white lights or increase exposure globally.
  shader.fragmentShader=shader.fragmentShader.replace(
   "#include <common>",
   "#include <common>\nuniform float uVaultFixtureResponse0273;");
  shader.fragmentShader=shader.fragmentShader.replace(marker,
   marker+"\nfloat v27Warm=step(diffuseColor.r,diffuseColor.b)*0.0+"+
   "step(diffuseColor.b*1.20,diffuseColor.r);"+
   "\nfloat v27Source= mix("+(mobile?"1.43":"2.10")+","+
   (mobile?"1.32":"1.65")+",v27Warm);"+
   "\ndiffuseColor.rgb*=mix(1.0,v27Source,uVaultFixtureResponse0273);");
  shader.uniforms.uVaultFixtureResponse0273=power;
  if(finish){
   shader.fragmentShader=patchVaultPremiumSource0274(shader.fragmentShader,{mobile});
   shader.uniforms.uVaultPremiumFinish0274=finish;
  }
 };
 material.customProgramCacheKey=function(){
  return key.call(this)+"-vault-practical-source-0273"+(mobile?"-4gb":"-high")+(finish?"-finish0274":"");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=before;
  material.customProgramCacheKey=key;material.needsUpdate=true;};
}
export function installVaultFullLighting0273(THREE,world,{
 enabled=true,track="vault",lowMemory=false,positionAt,
 foundation=null,architecture=null,materialParity=null,finishEnabled=false
}={}){
 const fallback=reason=>({active:false,stats:()=>({
  active:false,version:"0.27.3",reason}),setComparison(){},dispose(){}});
 if(!enabled)return fallback("classic");
 if(track!=="vault")return fallback("not-vault");
 if(!architecture?.active||!foundation?.active||
  architecture.stats?.().lengthMeters!==END||
  foundation.stats?.().coverageMeters!==END)
  return fallback("real 0.27.2 raised panels/0.27.0 tunnel not ready");
 const atlas=materialParity?.getMetalAtlas?.(),root=world?.getObjectByName?.(ROOT);
 if(!atlas||root?.children?.length!==20||typeof positionAt!=="function")
  return fallback("existing shared 0.26.2 atlas or original banked tunnel unavailable");
 const panels=[],emissive=[],rail=world.getObjectByName?.(RAIL);
 for(const chunk of root.children){
  if(!chunk?.children)return fallback("missing original Vault chunk");
  const panel=chunk.children.find(c=>c.name===PANEL),
   conduit=chunk.children.find(c=>c.name===CONDUIT),
   source=chunk.children.find(c=>c.name===BODY);
  if(!panel?.geometry?.getAttribute?.("neonLocalSection")||
   !panel.geometry.getAttribute("trackS")||
   !source?.material?.isMeshBasicMaterial||
   (!lowMemory&&!conduit?.geometry?.getAttribute("neonLocalSection")))
   return fallback("original 0.27.2 physical geometry/source missing");
  panels.push([chunk,panel,"panel"]);
  if(!lowMemory)panels.push([chunk,conduit,"rib"]);
  emissive.push(source);
 }
 if(!rail?.material?.isMeshStandardMaterial||
  !rail.geometry?.getAttribute?.("aBarrierArc"))
  return fallback("original indexed aero-barrier metal unavailable");
 const power={value:1},railPower={value:1};
 const finish=finishEnabled?{value:1}:null;
 const coats=[],attributes=[],materials=[],undo=[];
 let sourceVertices=0,litVertices=0,railLit=0;
 try{
  const panelMat=physicalCoat(THREE,"panel",lowMemory,atlas,power,finish);
  materials.push(panelMat);
  const ribMat=lowMemory?null:physicalCoat(THREE,"rib",lowMemory,atlas,power,finish);
  if(ribMat)materials.push(ribMat);
  for(const [chunk,mesh,role] of panels){
   const result=buildVaultPhysicalSources0273(mesh.geometry,positionAt,
    {mobile:lowMemory});
   for(const [name,size] of nativeAttrs){
    if(mesh.geometry.getAttribute(name))
     throw Error("duplicate native physical source attribute "+name);
    const attr=name==="pbrColdPosition0260"?result.cold:
     name==="pbrWarmPosition0260"?result.warm:
     name==="localStripAxis0261"?result.axis:result.masks;
    mesh.geometry.setAttribute(name,new THREE.Float32BufferAttribute(attr,size));
    attributes.push([mesh.geometry,name]);
   }
   const coat=new THREE.Mesh(mesh.geometry,role==="panel"?panelMat:ribMat);
   coat.name="SKYSHIFT 0.27.3 / real "+role+" finite GGX";
   coat.renderOrder=2;coat.frustumCulled=true;
   coat.castShadow=false;coat.receiveShadow=false;
   chunk.add(coat);coats.push(coat);
   sourceVertices+=result.vertices;litVertices+=result.bright;
  }
  const railSrc=buildVaultRailSources0273(rail.geometry,positionAt,
   {mobile:lowMemory});
  if(railSrc.litVertices<50)throw Error("no full-circuit cyan rail sources");
  for(const [name,arr,size] of [
   ["aVaultRailSourceA0273",railSrc.a,3],
   ...(lowMemory?[]:[["aVaultRailSourceB0273",railSrc.b,3]]),
   ["aVaultRailMask0273",railSrc.mask,1]
  ]){
   rail.geometry.setAttribute(name,new THREE.Float32BufferAttribute(arr,size));
   attributes.push([rail.geometry,name]);
  }
  railLit=railSrc.litVertices;
  undo.push(wrapRail(rail,railPower,lowMemory,finish));
  undo.push(boostFixture(emissive[0].material,power,lowMemory,finish));
 }catch(error){
  for(const m of coats)m.removeFromParent();
  for(const [g,n] of attributes)g.deleteAttribute(n);
  for(const f of undo.reverse())f();
  for(const m of materials)m.dispose();
  console.warn("SKYSHIFT 0.27.3 keeping source-safe 0.27.2 appearance",error);
  return fallback("native local GGX install failed: "+String(error?.message||error));
 }
 const state={active:true,status:"active",version:"0.27.3",
  coveredMeters:END,physicalCoats:coats.length,
  coatedChunks:20,physicalPrograms:lowMemory?1:2,
  nativeGGX:true,actualSkylinePBRFunctions:true,
  finiteSourceColdPitch:ROOF_PITCH,finiteSourceAmberPitch:ARCH_PITCH,
  sourceVertices,litVertices,railLitVertices:railLit,
  railSourceCount:Math.ceil(END/RAIL_PITCH),
  highTapCount:lowMemory?5:7,railTaps:lowMemory?1:2,
  originalFixtureBatchCount:20,fixtureRGBBoost:true,
  reusedMetalAtlas:true,addedAtlasCount:0,
  physicalCoatsAdded:coats.length,
  newDynamicLights:0,newColliders:0,newPostprocessPasses:0,
  originalRoadUnchanged:true,originalShipUnchanged:true,
  originalTrackUnchanged:true,originalGripUnchanged:true,
  originalCameraUnchanged:true,originalSkylineUnchanged:true,
  originalAuroraUnchanged:true,quality:lowMemory?"4GB":"High",
  premiumFinish:finishEnabled?vaultPremiumFinishAudit0274(true,1,lowMemory):
   vaultPremiumFinishAudit0274(false,0,lowMemory)};
 let disposed=false;
 return {active:true,stats:()=>({...state,strength:power.value,
   premiumFinish:vaultPremiumFinishAudit0274(!!finish,finish?.value??0,lowMemory)}),
  setFinishComparison(v){if(finish)finish.value=clamp(v);},
  setComparison(v){const x=clamp(v);power.value=x;railPower.value=x;
   for(const c of coats)c.visible=x>.001;},
  dispose(){
   if(disposed)return;disposed=true;
   for(const c of coats)c.removeFromParent();
   for(const [g,n] of attributes)g.deleteAttribute(n);
   for(const u of undo.reverse())u();
   for(const m of materials)m.dispose();
  }
 };
}
