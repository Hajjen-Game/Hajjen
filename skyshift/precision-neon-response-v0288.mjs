// SKYSHIFT 0.28.8 — Precision Neon Emission & Local Metal Response.
// The 0.28.7 real L foot, original 0.26.x cyan cove and native local GGX
// quadrature are the ONLY targets. No extra lights, geometry, textures,
// bloom pass, road/ship changes, camera changes or gameplay modifications.
export const PRECISION_NEON_0288=Object.freeze({
 version:"0.28.8",name:"Precision Neon Emission & Local Metal Response",
 source:"real Skyline 0.26.5 fixtures and Vault 0.28.7 L foot",
 emission:"colored source core with controlled low-alpha halo",
 response:"short-reach original GGX light taps with existing wall mask",
 compare:"?track=vault&v=0.28.8&precisionNeon=classic",
 addedLights:0,addedMeshes:0,addedTextures:0,addedPasses:0,
 addedReflectionSamples:0,roadUntouched:true,shipUntouched:true,
 pmremUntouched:true,bloomPipelineUntouched:true,physicsUntouched:true,
 gripUntouched:true,boostUntouched:true,otherTracksUntouched:true
});
const COMMON="#include <common>",COLOR="#include <color_fragment>";
const SOURCE="SKYSHIFT · Tunnel Megastructure 0.21.1";
const COVE="SKYSHIFT 0.26.0 / stable cyan cove emitters";
const FOOT="SKYSHIFT 0.28.1 / original joined amber arch feet";
const COOL="RE_Direct(l261Cool,geometryPosition";
const WARM="RE_Direct(l261Warm,geometryPosition";
const clamp=x=>Number.isFinite(x)?Math.max(0,Math.min(1,x)):0;
export function precisionNeonEnabled0288(search=
 typeof location!=="undefined"?location.search:""){
 const p=new URLSearchParams(search||"");
 if(p.get("track")!=="vault"||
  ["off","classic"].includes(p.get("precisionNeon")))return false;
 const match=/^(\d+)\.(\d+)\.(\d+)(?:\.\d+)?$/.exec(p.get("v")||"");
 if(!match)return false;
 const [a,b,c]=match.slice(1).map(Number);
 return a>0||b>28||(b===28&&c>=8);
}
function requireAnchors(src,kind,anchors){
 if(typeof src!=="string"||anchors.some(k=>!src.includes(k)))
  throw Error("0.28.8 native "+kind+" shader chain missing "+
   anchors.filter(k=>!src?.includes(k)).join(","));
}
export function patchPrecisionNeon0288(fragment,{kind,role="panel",
 mobile=false}={}){
 if(!["physical","cove","foot"].includes(kind))
  throw Error("0.28.8 invalid source kind");
 if(kind==="physical"){
  if(!["panel","rib"].includes(role))throw Error("0.28.8 invalid GGX role");
  requireAnchors(fragment,kind,[COMMON,COOL,WARM,
   "uniform float uReflectionStability0286;",
   "varying vec2 vLocalMask0261;","float r65WallC=",
   "float r65WallW=","l261CoolDistance","l261WarmDistance"]);
  const coolGain=mobile?"0.105":"0.170";
  const warmGain=mobile?"0.085":"0.140";
  // Boost only the existing native GGX samples near their REAL sources.
  // r65WallC/W preserve the 0.26.5 solar-seal and wall/roof masks.
  // We retain all original roughness, normal, Fresnel and PMREM shading.
  let cool=0,warm=0;
  let f=fragment.replaceAll(COOL,hit=>{
   cool++;
   return "l261Cool.color*=1.0+uPrecisionNeon0288*"+coolGain+
    "*r65WallC*(1.0-smoothstep(2.0,9.2,l261CoolDistance));\n"+hit;
  }).replaceAll(WARM,hit=>{
   warm++;
   return "l261Warm.color*=1.0+uPrecisionNeon0288*"+warmGain+
    "*r65WallW*(1.0-smoothstep(1.5,7.5,l261WarmDistance));\n"+hit;
  });
  if(cool!==(mobile?2:3)||warm!==(mobile?1:2))
   throw Error("0.28.8 GGX source taps mismatch: "+cool+"/"+warm);
  return f.replace(COMMON,COMMON+"\nuniform float uPrecisionNeon0288;");
 }
 requireAnchors(fragment,kind,[COMMON,COLOR,
  "uniform float uReflectionStability0286;"]);
 if(kind==="cove"){
  const code=[
   "// 0.28.8: emphasize the actual colored source, not white spill.",
   "float p288Warm=smoothstep(0.08,0.35,diffuseColor.r-diffuseColor.b);",
   "float p288Core=smoothstep(0.38,1.08,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)));",
   "vec3 p288Hue=mix(vec3(0.970,1.047,1.062),vec3(1.055,1.017,0.970),p288Warm);",
   "diffuseColor.rgb*=mix(vec3(1.0),p288Hue*(1.0+0.115*p288Core),uPrecisionNeon0288);"
  ].join("\n");
  return fragment.replace(COMMON,COMMON+"\nuniform float uPrecisionNeon0288;")
   .replace(COLOR,COLOR+"\n"+code);
 }
 const footCode=[
  "// 0.28.8: preserve the connected 0.28.7 orange L silhouette.",
  "float p288BladeCore=smoothstep(0.54,0.86,clamp(diffuseColor.a,0.0,1.0));",
  "diffuseColor.rgb*=1.0+uPrecisionNeon0288*(0.035+0.19*p288BladeCore);",
  "diffuseColor.rgb+=vec3(0.0,0.052,0.017)*uPrecisionNeon0288*p288BladeCore;",
  "diffuseColor.a*=1.0-0.11*uPrecisionNeon0288*(1.0-p288BladeCore);"
 ].join("\n");
 return fragment.replace(COMMON,COMMON+"\nuniform float uPrecisionNeon0288;")
  .replace(COLOR,COLOR+"\n"+footCode);
}
export function wrapPrecisionNeon0288(material,uniform,options){
 const {kind}=options;
 const physical=kind==="physical";
 if(!material||
  !(physical?material.isMeshPhysicalMaterial:material.isMeshBasicMaterial)||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.28.8 original "+kind+" material missing");
 const before=material.onBeforeCompile,key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  before.call(this,shader,renderer);
  shader.fragmentShader=patchPrecisionNeon0288(shader.fragmentShader,options);
  shader.uniforms.uPrecisionNeon0288=uniform;
 };
 material.customProgramCacheKey=function(){
  return key.call(this)+"-precision-neon-v0288-"+kind+"-"+
   (options.role||"fixture")+(options.mobile?"-4GB":"-high");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=before;
  material.customProgramCacheKey=key;material.needsUpdate=true;};
}
const inactive=reason=>({active:false,setComparison(){},
 stats:()=>({active:false,version:"0.28.8",reason}),dispose(){}});
export function installPrecisionNeon0288(section,{enabled=false,
 lowMemory=false}={}){
 if(!enabled)return inactive("0.28.7 or classic");
 const group=section?.getObjectByName?.(SOURCE);
 if(!group)return inactive("original Skyline source missing");
 const get=name=>group.children.find(x=>x.name===name)?.material;
 const coats=["panel",...(!lowMemory?["rib"]:[])].map(role=>({
  kind:"physical",role,material:get("SKYSHIFT 0.26.0 P2 / true physical "+role)
 }));
 const cove=get(COVE);
 const foot=section.children.find(x=>x.name===FOOT)?.material;
 if(coats.some(x=>!x.material?.isMeshPhysicalMaterial)||
  !cove?.isMeshBasicMaterial||!foot?.isMeshBasicMaterial)
  return inactive("original GGX, cyan cove or 0.28.7 L missing");
 const power={value:1},undo=[];
 try{
  for(const {kind,role,material} of coats)
   undo.push(wrapPrecisionNeon0288(material,power,
    {kind,role,mobile:lowMemory}));
  undo.push(wrapPrecisionNeon0288(cove,power,{kind:"cove"}));
  undo.push(wrapPrecisionNeon0288(foot,power,{kind:"foot"}));
 }catch(e){
  for(const restore of undo.reverse())restore();
  return inactive("native shader chain unavailable: "+String(e?.message||e));
 }
 let disposed=false;
 return {active:true,setComparison:v=>{power.value=clamp(v);},
  stats:()=>({active:true,version:"0.28.8",strength:power.value,
   coats:coats.length,realCove:1,realArchFoot:1,
   ggxTaps:lowMemory?3:5,sourceModules:1,
   addedLights:0,addedMeshes:0,addedPasses:0,
   addedTextures:0,addedReflectionSamples:0,
   originalPmrem:true,originalStability0286:true,
   originalArchFoot0287:true,lowMemory:!!lowMemory,
   roadUntouched:true,shipUntouched:true,boostUntouched:true,
   gripUntouched:true,physicsUntouched:true}),
  dispose(){
   if(disposed)return;disposed=true;
   for(const restore of undo.reverse())restore();
  }};
}
