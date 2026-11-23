// SKYSHIFT 0.28.6 — Reflection Stability & Luminous Strip Definition.
// VAULT-only final source-material finishing, after the original 0.26.5
// GGX/metal chain and the 0.28.5 global spatial wavefront decorators.
//
// Visual hypothesis: small 0.26.2 atlas normals plus 0.26.4.2 near-light
// roughness trimming generate subpixel specular lobe shimmer in motion.
// We leave the real emitters / lamps / source positions untouched and
// stabilise the physical METAL RESPONSE, not the flight or light clock.
// Each gain is reversible, and no new light/geometry/draw pass is created.
export const STABILITY_0286=Object.freeze({
 version:"0.28.6",name:"Reflection Stability & Luminous Strip Definition",
 target:"real Skyline 0.26.5 physical panel/rib and graphite substrate",
 metalRoughness:"roof satin, wall slightly glossy, screen derivative limited",
 atlasNormal:"reduce existing 0.26.2 micro-normal amplitude on High",
 cyan:"existing original cove emitter core, not a virtual reflected streak",
 amber:"existing warm sconce core and connected arch-foot alpha",
 pmrem:"retain genuine static 0.28.4 PMREM without new probes",
 compare:"?track=vault&v=0.28.6&reflectionStability=classic",
 extraLights:0,extraMeshes:0,extraDrawCalls:0,extraRenderPasses:0,
 originalRoadGGX:true,originalShipLight:true,originalZoneWave:true,
 physicsUntouched:true,gripUntouched:true,boostUntouched:true,
 roadUntouched:true,skylineUntouched:true,auroraUntouched:true
});
const COMMON="#include <common>";
const PHYSICAL="#include <lights_physical_fragment>";
const COLOR="#include <color_fragment>";
const SUBSTRATE=" m25Final=clamp(m25Final*s262Gain,vec3(0.002),vec3(0.30));";
const mnames=["panel","rib"];
const substrateNames=[
 "Tunnel / HARDSURFACE_PANELS","Tunnel / CURVED_RIBS",
 "Tunnel / CLOSED_SHELL","Tunnel / STRUCTURAL_CONDUITS"
];
const energyName="SKYSHIFT 0.26.0 / stable cyan cove emitters";
const footName="SKYSHIFT 0.28.1 / original joined amber arch feet";
const haloName="Tunnel / HALO";
const sourceName="SKYSHIFT · Tunnel Megastructure 0.21.1";
const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
export function reflectionStabilityEnabled0286(search=
 typeof location!=="undefined"?location.search:""){
 const params=new URLSearchParams(search||"");
 if(params.get("track")!=="vault"||
  ["classic","off"].includes(params.get("reflectionStability")))
  return false;
 const v=/^(\d+)\.(\d+)\.(\d+)(?:\.\d+)?$/.exec(params.get("v")||"");
 if(!v)return false;
 const [a,b,c]=v.slice(1).map(Number);
 return a>0||b>28||(b===28&&c>=6);
}
function expectAnchor(fragment,anchors,role){
 if(typeof fragment!=="string"||anchors.some(a=>!fragment.includes(a)))
  throw Error("0.28.6 missing original "+role+" shader chain "+
   anchors.filter(a=>!fragment?.includes(a)).join(","));
}
export function patchPhysicalStability0286(fragment,{role="panel",
 mobile=false}={}){
 if(!mnames.includes(role))throw Error("0.28.6 invalid physical role");
 expectAnchor(fragment,[COMMON,PHYSICAL,
  "varying vec2 vPbrSection0260;",
  "roughnessFactor=mix(roughnessFactor,m262R,uPremiumMetal0262);",
  "RE_Direct(pbrFixture0260",
  "RE_Direct(l261"],"native GGX "+role);
 const high=mobile?"0.450":"0.435",roof=mobile?"0.525":"0.565";
 const target=[
  "// 0.28.6: stabilize physically based metal, not the luminous core.",
  "float st286Roof=smoothstep(21.2,27.0,vPbrSection0260.y);",
  // fwidth is pixel footprint: roughness floor rises only when micro-normals
  // are undersampled at grazing angles. Bound to avoid matte clipping.
  "float st286Alias=clamp(length(dFdx(normal))+length(dFdy(normal)),0.0,1.0);",
  "float st286Floor=mix("+high+","+roof+",st286Roof)+0.085*st286Alias;",
  "roughnessFactor=mix(roughnessFactor,",
  " max(roughnessFactor,min(0.73,st286Floor)),uReflectionStability0286);"
 ].join("\n");
 let f=fragment.replace(COMMON,COMMON+
  "\nuniform float uReflectionStability0286;");
 // Actual original normal atlas is applied in the NORMAL chunk, BEFORE
 // the native physical lighting chunk. Keep it, but reduce subpixel strength.
 if(!mobile){
  const original="float m262Amp="+(role==="rib"?"0.12":"0.21")+";";
  if(!f.includes(original))throw Error("0.28.6 original micro-normal missing");
  f=f.replace(original,
   "float m262Amp=mix("+(role==="rib"?"0.12,0.052":"0.21,0.084")+
   ",uReflectionStability0286);");
 }
 return f.replace(PHYSICAL,target+"\n"+PHYSICAL);
}
export function patchSubstrateStability0286(fragment,{role="panel"}={}){
 if(!["panel","rib","shell","conduit"].includes(role))
  throw Error("0.28.6 invalid graphite role");
 expectAnchor(fragment,[COMMON,SUBSTRATE,
  "float m25Roof=","float s262Gain=clamp("],"native graphite "+role);
 const factor=role==="panel"?.44:role==="rib"?.43:
  role==="shell"?.37:.33;
 const stabilize=[
  "// Reduce high-frequency 0.26.2 metal grain IN THE ROOF substrate.",
  "float st286RoofBase=clamp(m25Roof,0.0,1.0);",
  "s262Gain=mix(s262Gain,1.0+(s262Gain-1.0)*",
  " (1.0-"+factor.toFixed(3)+"*st286RoofBase),uReflectionStability0286);"
 ].join("\n");
 return fragment.replace(COMMON,COMMON+
  "\nuniform float uReflectionStability0286;")
  .replace(SUBSTRATE,stabilize+"\n"+SUBSTRATE);
}
export function patchCoveDefinition0286(fragment){
 expectAnchor(fragment,[COMMON,COLOR],"actual cyan/amber emitter");
 const code=[
  "// Original geometry and vertex colors are the light source.",
  "float st286Warm=smoothstep(0.04,0.32,",
  " diffuseColor.r-diffuseColor.b);",
  "float st286SourcePower=mix(1.19,1.045,st286Warm);",
  "diffuseColor.rgb*=mix(1.0,st286SourcePower,",
  " uReflectionStability0286);"
 ].join("\n");
 return fragment.replace(COMMON,COMMON+
  "\nuniform float uReflectionStability0286;")
  .replace(COLOR,COLOR+"\n"+code);
}
export function patchAmberFoot0286(fragment){
 expectAnchor(fragment,[COMMON,COLOR],"actual connected amber feet");
 const code=[
  "// Feather existing vertex-alpha source, without a harder hotspot.",
  "float st286OldAlpha=clamp(diffuseColor.a,0.0,1.0);",
  "float st286NewAlpha=min(1.0,pow(st286OldAlpha,0.82)*0.94);",
  "diffuseColor.a=mix(diffuseColor.a,st286NewAlpha,",
  " uReflectionStability0286);"
 ].join("\n");
 return fragment.replace(COMMON,COMMON+
  "\nuniform float uReflectionStability0286;")
  .replace(COLOR,COLOR+"\n"+code);
}
export function wrapStabilityShader0286(material,power,kind,options={}){
 const physical=kind==="physical";
 if(!material||typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function"||
  !(physical?material.isMeshPhysicalMaterial:material.isMeshBasicMaterial))
  throw Error("0.28.6 missing real "+kind+" source shader");
 const old=material.onBeforeCompile,key=material.customProgramCacheKey;
 const patch=kind==="physical"?f=>patchPhysicalStability0286(f,options):
  kind==="substrate"?f=>patchSubstrateStability0286(f,options):
  kind==="cove"?patchCoveDefinition0286:patchAmberFoot0286;
 material.onBeforeCompile=function(shader,renderer){
  old.call(this,shader,renderer);
  shader.fragmentShader=patch(shader.fragmentShader);
  shader.uniforms.uReflectionStability0286=power;
 };
 material.customProgramCacheKey=function(){
  return key.call(this)+"-vault-satin-strips-0286-"+kind+"-"+
   (options.role||"native")+(options.mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=old;
  material.customProgramCacheKey=key;material.needsUpdate=true;};
}
const inactive=reason=>({active:false,setComparison(){},
 stats:()=>({active:false,reason,version:"0.28.6"}),dispose(){}});
export function installReflectionStability0286(section,{enabled=false,
 lowMemory=false}={}){
 if(!enabled)return inactive("classic");
 const group=section?.getObjectByName?.(sourceName);
 if(!group)return inactive("original shared source tunnel unavailable");
 const get=name=>group.children.find(x=>x.name===name);
 const coats=mnames.filter(role=>!lowMemory||role==="panel")
  .map(role=>({role,material:get("SKYSHIFT 0.26.0 P2 / true physical "+
    role)?.material}));
 const substrates=[
  {role:"panel",name:substrateNames[0]},
  {role:"rib",name:substrateNames[1]},
  {role:"shell",name:substrateNames[2]},
  ...(!lowMemory?[{role:"conduit",name:substrateNames[3]}]:[])
 ].map(x=>({role:x.role,material:get(x.name)?.material}));
 const cove=get(energyName)?.material,
  halo=get(haloName)?.material;
 const foot=section.children.find(x=>x.name===footName)?.material;
 if(coats.some(x=>!x.material?.isMeshPhysicalMaterial)||
  substrates.some(x=>!x.material?.isMeshBasicMaterial)||
  !cove?.isMeshBasicMaterial||!foot?.isMeshBasicMaterial||
  (!lowMemory&&!halo?.isMeshBasicMaterial))
  return inactive("original Skyline physical metal, cove or amber missing");
 const amount={value:1},restore=[];
 const oldHalo=halo?.opacity??0.15;
 const applyHalo=()=>{
  if(halo)halo.opacity=oldHalo*(1+0.20*amount.value);
 };
 try{
  for(const {role,material} of coats)
   restore.push(wrapStabilityShader0286(material,amount,"physical",
    {role,mobile:lowMemory}));
  for(const {role,material} of substrates)
   restore.push(wrapStabilityShader0286(material,amount,"substrate",
    {role,mobile:lowMemory}));
  restore.push(wrapStabilityShader0286(cove,amount,"cove"));
  restore.push(wrapStabilityShader0286(foot,amount,"foot"));
  applyHalo();
 }catch(e){
  for(const undo of restore.reverse())undo();
  if(halo)halo.opacity=oldHalo;
  console.warn("SKYSHIFT 0.28.6 keeping original source finish",e);
  return inactive("shader install failed: "+String(e?.message||e));
 }
 let disposed=false;
 return {active:true,
  setComparison:value=>{amount.value=clamp(value);applyHalo();},
  stats:()=>({active:true,version:"0.28.6",
   physicalCoats:coats.length,substrateLayers:substrates.length,
   coveEmitterMaterials:1,amberFootMaterials:1,
   originalSourceBatches:true,roofSatin:true,filteredMicroNormals:true,
   sourceLimitedSofterAmber:true,coveCoreBoost:1.19,
   haloOpacity:halo?.opacity??null,strength:amount.value,
   lowMemory:!!lowMemory,addedLights:0,addedMeshes:0,
   addedDrawCalls:0,addedRenderPasses:0,
   originalGGXKept:true,originalPMREMKept:true,
   physicsUntouched:true,gripUntouched:true,
   roadUntouched:true,boostUntouched:true}),
  dispose(){
   if(disposed)return;disposed=true;
   for(const undo of restore.reverse())undo();
   if(halo)halo.opacity=oldHalo;
  }};
}
