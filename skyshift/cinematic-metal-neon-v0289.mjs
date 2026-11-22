// SKYSHIFT 0.28.9 — Cinematic Metal & Neon Reflection Rebalance.
//
// Deliberately reuses the REAL 0.26.5 Skyline materials copied into Vault
// by the 0.28.1 shared installer, the existing 0.28.7 L and 0.28.8 neon,
// and the ORIGINAL 0.28.2 banked GGX road shader. No new meshes, probes,
// texture reads, area lights, draw calls, reflection passes or camera tricks.
// Uniform = 0 produces the exact 0.28.8 image at the same frame.
export const CINEMATIC_METAL_0289=Object.freeze({
 version:"0.28.9",title:"Cinematic Metal & Neon Reflection Rebalance",
 foundation:"0.28.8 physically connected shared Skyline tunnel + original indexed road",
 compare:"?track=vault&v=0.28.9&cinematicMetal=classic",
 independentControls:["cinematicContrast","cinematicStrips","cinematicRoad"],
 darkMetal:"reduce unlit graphite, preserve local lamp glints and cavity detail",
 sourceStreaks:"existing 0.26.1 finite GGX taps, native wall masks and 0.28.6 stable normals",
 road:"original 0.28.2 full-course native GGX source vectors; no fake projected mirror",
 additionalMeshes:0,additionalLights:0,additionalPasses:0,
 additionalTextures:0,additionalSamples:0,gameplayModified:false,
 skylineModified:false,auroraModified:false,shipModified:false,
 originalRoadGeometryModified:false,originalPMREMModified:false,
 originalBloomModified:false
});
const COMMON="#include <common>";
const COLOR="#include <color_fragment>";
const PHYSICAL="#include <lights_physical_fragment>";
const SUBSTRATE=" m25Final=clamp(m25Final*s262Gain,vec3(0.002),vec3(0.30));";
const ROUGH_ROAD="metalnessFactor=mix(metalnessFactor,0.41,r263Interior);";
const SPEC_ROAD="reflectedLight.directSpecular+=r263Convolved*";
const COOL="RE_Direct(l261Cool,geometryPosition";
const WARM="RE_Direct(l261Warm,geometryPosition";
const GROUP="SKYSHIFT · Tunnel Megastructure 0.21.1";
const physicalPrefix="SKYSHIFT 0.26.0 P2 / true physical ";
const substrateNames=Object.freeze({
 panel:"HARDSURFACE_PANELS",rib:"CURVED_RIBS",
 shell:"CLOSED_SHELL",conduit:"STRUCTURAL_CONDUITS"
});
const clamp=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
function ensure(shader,part,keys){
 if(typeof shader!=="string"||keys.some(x=>!shader.includes(x)))
  throw Error("0.28.9 original "+part+" shader missing "+
   keys.filter(x=>!shader?.includes(x)).join(","));
}
export function cinematicMetalEnabled0289(search=
 typeof location!=="undefined"?location.search:""){
 const p=new URLSearchParams(search||"");
 if(p.get("track")!=="vault"||
  ["off","classic"].includes(p.get("cinematicMetal")))return false;
 const m=/^(\d+)\.(\d+)\.(\d+)(?:\.\d+)?$/.exec(p.get("v")||"");
 if(!m)return false;
 const [a,b,c]=m.slice(1).map(Number);
 return a>0||b>28||(b===28&&c>=9);
}
export function cinematicComponentEnabled0289(component,search=
 typeof location!=="undefined"?location.search:""){
 if(!CINEMATIC_METAL_0289.independentControls.includes(component))
  throw Error("0.28.9 invalid component");
 return cinematicMetalEnabled0289(search)&&
  !["off","classic"].includes(new URLSearchParams(search||"").get(component));
}
export function patchSubstrateContrast0289(fragment,{role="panel"}={}){
 if(!Object.hasOwn(substrateNames,role))throw Error("0.28.9 invalid graphite role");
 ensure(fragment,"substrate "+role,[COMMON,SUBSTRATE,
  "uniform float uReflectionStability0286;",
  "float m25Wall=","float m25Roof=","float m25Cavity=",
  "float m25Bevel="]);
 const base={panel:0.47,rib:0.54,shell:0.49,conduit:0.61}[role];
 const lines=[
  "// 0.28.9: dark unlit metal; preserve ORIGINAL source-limited bevels.",
  "float cm289Lamp=clamp(0.62*m25Wall+0.46*m25Roof+",
  " 0.32*m25Bevel,0.0,1.0);",
  "float cm289Cavity=clamp(m25Cavity,0.0,1.0);",
  "float cm289Unlit=mix("+base.toFixed(3)+",0.91,cm289Lamp);",
  "cm289Unlit*=1.0-0.12*cm289Cavity;",
  "m25Final*=mix(vec3(1.0),",
  " vec3(cm289Unlit*0.95,cm289Unlit,cm289Unlit*1.08),",
  " uCinematicContrast0289);"
 ].join("\n");
 return fragment.replace(COMMON,COMMON+
   "\nuniform float uCinematicContrast0289;")
  .replace(SUBSTRATE,SUBSTRATE+"\n"+lines);
}
export function patchPhysicalStreaks0289(fragment,{role="panel",
 mobile=false}={}){
 if(!["panel","rib"].includes(role))throw Error("0.28.9 invalid physical role");
 ensure(fragment,"GGX "+role,[COMMON,COLOR,PHYSICAL,COOL,WARM,
  "uPrecisionNeon0288","uReflectionStability0286",
  "vPbrSection0260","vPbrTrack0260","vLocalMask0261",
  "float r65WallC=","float r65WallW=","l261CoolDistance","l261WarmDistance"]);
 let cool=0,warm=0;
 const col=["// 0.28.9 deep titanium base, not a white fill.",
  "float cm289Near=clamp(vLocalMask0261.x+vLocalMask0261.y,0.0,1.0);",
  "float cm289Dark=mix(0.49,0.82,cm289Near);",
  "diffuseColor.rgb*=mix(vec3(1.0),",
  "vec3(cm289Dark*0.94,cm289Dark,cm289Dark*1.075),uCinematicContrast0289);"
 ].join("\n");
 // This is the ORIGINAL physically computed BRDF. Reweight existing
 // finite-distance lamps, not source-free colored paint or another lamp.
 // The old 0.26.5 source masks prevent roof and non-source white spill.
 const sourceColor=fragment.replaceAll(COOL,match=>{
  cool++;
  return "l261Cool.color*=1.0+uCinematicStrips0289*"+
   (mobile?"1.08":"1.72")+
   "*r65WallC*(1.0-smoothstep(2.3,10.5,l261CoolDistance));\n"+match;
 }).replaceAll(WARM,match=>{
  warm++;
  return "l261Warm.color*=1.0+uCinematicStrips0289*"+
   (mobile?"0.86":"1.31")+
   "*r65WallW*(1.0-smoothstep(1.7,8.7,l261WarmDistance));\n"+match;
 });
 if(cool!==(mobile?2:3)||warm!==(mobile?1:2))
  throw Error("0.28.9 original physical GGX tap count drift "+
   cool+"/"+warm);
 const stable=[
  "// Keep 0.28.6's robust roof anti-glitter floor intact.",
  "float cm289Wall=(1.0-smoothstep(20.3,24.1,vPbrSection0260.y))*",
  " smoothstep(10.5,17.0,abs(vPbrSection0260.x));",
  "float cm289Fixture=clamp(vLocalMask0261.x+vLocalMask0261.y,0.0,1.0);",
  "float cm289Brush=0.5+0.5*sin(vPbrTrack0260*0.085+",
  " vPbrSection0260.y*0.45);",
  "float cm289Target="+(mobile?"0.438":"0.400")+"+0.026*cm289Brush;",
  "float cm289Weight=cm289Wall*cm289Fixture*uCinematicStrips0289;",
  "roughnessFactor=mix(roughnessFactor,",
  " max(cm289Target,min(roughnessFactor,cm289Target+0.012)),",
  " 0.78*cm289Weight);"
 ].join("\n");
 return sourceColor
  .replace(COMMON,COMMON+
   "\nuniform float uCinematicContrast0289;\nuniform float uCinematicStrips0289;")
  .replace(COLOR,COLOR+"\n"+col)
  .replace(PHYSICAL,stable+"\n"+PHYSICAL);
}
export function patchRoadGlints0289(fragment,{mobile=false}={}){
 ensure(fragment,"original Vault indexed PBR road",[COMMON,COLOR,
  ROUGH_ROAD,SPEC_ROAD,"uRoadRebuild0263","vTrackCoord",
  "r263CoveBand","r263AmberBand","r263Source","r263Keep",
  "roadSolarMask","r263Grain","r263Convolved"]);
 const rough=[
  "// 0.28.9: small-scale satin-to-polished variation, no Reflector.",
  "float cm289Side=smoothstep(2.0,9.3,abs(vTrackCoord.y));",
  "float cm289Flow=0.5+0.5*sin(vTrackCoord.x*0.093+",
  " vTrackCoord.y*0.23);",
  "float cm289Wet="+(mobile?"0.384":"0.355")+"+0.025*cm289Flow;",
  "float cm289RoughWeight=uCinematicRoad0289*r263Interior*",
  " (0.12+0.88*cm289Side);",
  "roughnessFactor=mix(roughnessFactor,cm289Wet,0.38*cm289RoughWeight);",
  "metalnessFactor=mix(metalnessFactor,0.41,0.10*cm289RoughWeight);"
 ].join("\n");
 const streak=[
  "// Longitudinal, source-masked color glints: existing road tangent +",
  "// source positions (r263Source), same wave and guides as 0.28.8.",
  "float cm289Across=abs(vTrackCoord.y);",
  "float cm289CyanBand=exp(-pow((cm289Across-8.0)/1.75,2.0));",
  "float cm289AmberBand=exp(-pow((cm289Across-8.5)/1.65,2.0));",
  "float cm289StableFlow=0.85+0.15*",
  " sin(vTrackCoord.x*0.12+vTrackCoord.y*0.075);",
  "vec3 cm289Tint=vec3(0.018,0.48,0.74)*",
  " (r263Source.x*cm289CyanBand*"+(mobile?"0.10":"0.19")+")+",
  " vec3(0.76,0.24,0.042)*",
  " (r263Source.y*cm289AmberBand*"+(mobile?"0.065":"0.135")+");",
  "r263Convolved+=uCinematicRoad0289*cm289Tint*cm289StableFlow;"
 ].join("\n");
 return fragment.replace(COMMON,COMMON+"\nuniform float uCinematicRoad0289;")
  .replace(ROUGH_ROAD,ROUGH_ROAD+"\n"+rough)
  .replace(SPEC_ROAD,streak+"\n"+SPEC_ROAD);
}
export function wrapCinematicMetalShader0289(material,uniforms,{
 kind,role="panel",mobile=false
}={}){
 const physical=kind==="physical",road=kind==="road";
 const correct=physical?material?.isMeshPhysicalMaterial:
  road?material?.isMeshStandardMaterial:material?.isMeshBasicMaterial;
 if(!correct||typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.28.9 expected original "+kind+" material");
 const old=material.onBeforeCompile,key=material.customProgramCacheKey;
 const patch=kind==="physical"?f=>patchPhysicalStreaks0289(f,{role,mobile}):
  kind==="road"?f=>patchRoadGlints0289(f,{mobile}):
  f=>patchSubstrateContrast0289(f,{role});
 material.onBeforeCompile=function(shader,renderer){
  old?.call(this,shader,renderer);
  shader.fragmentShader=patch(shader.fragmentShader);
  if(kind==="physical"){
   shader.uniforms.uCinematicContrast0289=uniforms.contrast;
   shader.uniforms.uCinematicStrips0289=uniforms.strips;
  }else if(road)shader.uniforms.uCinematicRoad0289=uniforms.road;
  else shader.uniforms.uCinematicContrast0289=uniforms.contrast;
 };
 material.customProgramCacheKey=function(){
  return key.call(this)+"-cinematic-metal-0289-"+kind+"-"+role+
   (mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=old;material.customProgramCacheKey=key;
  material.needsUpdate=true;};
}
const inactive=reason=>({active:false,setComparison(){},
 stats:()=>({active:false,reason,version:"0.28.9"}),dispose(){}});
export function installCinematicTunnel0289(section,{
 enabled=false,lowMemory=false,contrast=true,strips=true
}={}){
 if(!enabled)return inactive("0.28.8 or cinematicMetal=classic");
 const group=section?.getObjectByName?.(GROUP);
 if(!group)return inactive("original Skyline shared group missing");
 const get=name=>group.children.find(x=>x.name===name)?.material;
 const coats=["panel",...(!lowMemory?["rib"]:[])].map(role=>({
  kind:"physical",role,material:get(physicalPrefix+role)
 }));
 const substrates=Object.entries(substrateNames)
  .filter(([role])=>!lowMemory||role!=="conduit")
  .map(([role,name])=>({kind:"substrate",role,
   material:get("Tunnel / "+name)}));
 if(coats.some(x=>!x.material?.isMeshPhysicalMaterial)||
  substrates.some(x=>!x.material?.isMeshBasicMaterial))
  return inactive("original physical GGX or graphite source missing");
 const uniforms={contrast:{value:contrast?1:0},strips:{value:strips?1:0}};
 const undo=[];
 try{
  for(const m of [...coats,...substrates])
   undo.push(wrapCinematicMetalShader0289(m.material,uniforms,
    {kind:m.kind,role:m.role,mobile:lowMemory}));
 }catch(e){
  for(const f of undo.reverse())f();
  return inactive("native shared shader unavailable: "+String(e.message||e));
 }
 let disposed=false;
 return {active:true,setComparison(values={}){
  if("contrast" in values)uniforms.contrast.value=clamp(values.contrast);
  if("strips" in values)uniforms.strips.value=clamp(values.strips);
 },stats:()=>({active:true,version:"0.28.9",
  strength:{contrast:uniforms.contrast.value,strips:uniforms.strips.value},
  nativePhysicalCoats:coats.length,nativeSubstrates:substrates.length,
  addedMeshes:0,addedLights:0,addedTextures:0,
  addedPasses:0,addedBRDFSamples:0,originalStability0286:true,
  originalPrecision0288:true,originalSourceModules:1,
  lowMemory:!!lowMemory}),
  dispose(){if(disposed)return;disposed=true;
   for(const f of undo.reverse())f();}
 };
}
export function installCinematicRoad0289(world,{
 enabled=false,lowMemory=false,road=true
}={}){
 if(!enabled)return inactive("0.28.8 or cinematicMetal=classic");
 const material=world?.getObjectByName?.
  ("Zone Ribbon · integrated PBR racing deck")?.material;
 if(!material?.isMeshStandardMaterial)
  return inactive("original indexed road material missing");
 const uniforms={road:{value:road?1:0}};
 let restore;
 try{restore=wrapCinematicMetalShader0289(material,uniforms,
  {kind:"road",mobile:lowMemory});}
 catch(e){return inactive("original Vault road GGX chain missing: "+
  String(e.message||e));}
 let disposed=false;
 return {active:true,setComparison(values={}){
  if("road" in values)uniforms.road.value=clamp(values.road);
 },stats:()=>({active:true,version:"0.28.9",
  strength:{road:uniforms.road.value},originalRoadMaterial:true,
  originalSourceVectors:true,originalWhiteZone:true,
  originalRoadGeometry:true,addedDrawCalls:0,addedWorldLights:0,
  addedPasses:0,addedSamples:0,lowMemory:!!lowMemory}),
  dispose(){if(disposed)return;disposed=true;restore();}
 };
}
