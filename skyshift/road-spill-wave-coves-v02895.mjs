// SKYSHIFT 0.28.9.5 — Road Light Spill Continuity & Wave-Coupled Cove Lighting.
// Shared authoring, actual Skyline 0.26.3.2 6.5m/24m edge fixtures and
// original banked 0.26.0 physical/painted metal. Vault is first live rollout;
// the same source shader adapters accept a native Skyline module at 1:1.
// No new lights/meshes, geometry, road attributes, collisions, render passes.
import {ZONE_PALETTES,ZONE_WAVE} from "./zone-wave-v060.mjs";
import {sharedWaveColors02894} from "./unified-tunnel-light-sources-v02894.mjs";
import {vaultStraightMask02891} from "./shared-straight-edge-parity-v02891.mjs";

export const ROAD_SPILL_COVE_02895=Object.freeze({
 version:"0.28.9.5",name:"Road Light Spill Continuity & Wave-Coupled Cove Lighting",
 reference:"Skyline 0.26.3.3 short lower lip strips and original graphite response",
 sources:"same 4.5m start / 6.5m source / 24m period / 0.28.9.1 straight clearance",
 road:"continuous analytic local source-distance and soft Fresnel response",
 wall:"existing dual-tone ice-cyan substrate + actual 0.26.x GGX physical coats",
 palette:"original 9 zone-wave-v060 colors, ONE shared 66m traveling wave",
 noNewGeometry:true,noNewLights:true,noNewDrawCalls:true,noNewAttributes:true,
 noExtraPostprocessing:true,nightMetalRetained:true,shipUntouched:true,
 controlsUntouched:true,gripUntouched:true,archFootRetained:true,
 archivedSkylineUntouched:true,
 comparisons:["?roadSpill=classic","?coveWave=classic"]
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
function release(search,track){
 const p=new URLSearchParams(search||"");
 if(p.get("track")!==track)return false;
 const m=/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(p.get("v")||"");
 if(!m)return false;
 const v=m.slice(1).map(x=>Number(x||0));
 return v[0]>0||v[1]>28||(v[1]===28&&(v[2]>9||
  (v[2]===9&&v[3]>=5)));
}
export function roadSpillEnabled02895(search=
 typeof location!=="undefined"?location.search:""){
 const p=new URLSearchParams(search||"");
 return release(search,"vault")&&
  !["classic","off"].includes(p.get("roadSpill"));
}
export function coveWaveEnabled02895(search=
 typeof location!=="undefined"?location.search:""){
 const p=new URLSearchParams(search||"");
 return release(search,"vault")&&
  !["classic","off"].includes(p.get("coveWave"));
}
export function smoothPulse02895(s,{
 moduleMeters=340,sourceMeters=368,pitch=24,from=4.5,length=6.5
}={}){
 if(!Number.isFinite(s)||!Number.isFinite(moduleMeters)||moduleMeters<=0||
  !Number.isFinite(sourceMeters)||sourceMeters<=0)return 0;
 const within=((s%moduleMeters)+moduleMeters)%moduleMeters*
  (sourceMeters/moduleMeters);
 const center=from+length*.5;
 const delta=Math.abs(((within-center+pitch*10000+pitch*.5)%pitch)-pitch*.5);
 const t=clamp((delta-(length*.5-.32))/2.7);
 return 1-t*t*(3-2*t);
}
export function sampleEdgeSpill02895(s,lateral,{
 straightMask=vaultStraightMask02891,moduleMeters=340,sourceMeters=368
}={}){
 const mask=typeof straightMask==="function"?straightMask(s):straightMask;
 const longitudinal=smoothPulse02895(s,{moduleMeters,sourceMeters});
 const lateralMask=Math.exp(-Math.pow((Math.abs(lateral)-10.4)/3.05,2));
 return clamp(mask)*longitudinal*lateralMask;
}
const GLSL_COMMON="#include <common>";
const GGX_ANCHOR=/reflectedLight\.directSpecular\+=u94Tint\*u94Cool\*(?:0\.045|0\.065);\n\}/;
export function patchRoadSpill02895(vertex,fragment,{
 moduleMeters=340,sourceMeters=368,lowMemory=false
}={}){
 if(!fragment.includes(GLSL_COMMON)||
  !fragment.includes("varying float vEdgeStraight02891;")||
  !fragment.includes("float r263CoveBand=")||
  !fragment.includes("r263Source.x*r263CoveBand*0.38")||
  !GGX_ANCHOR.test(fragment)||
  !fragment.includes("float r263Fresnel=")||
  !fragment.includes("vTrackCoord.x"))
  throw Error("0.28.9.5 missing original real 0.28.9.4 road GGX chain");
 const header=[
  "uniform vec3 uS95Old,uS95Next;",
  "uniform float uS95Front,uS95Active,uS95Lap,uS95Strength;"
 ].join("\n");
 const prefix=[
  "// Actual source lip: short 6.5m fixture each 24m authored source.",
  "float s95Local=mod(vTrackCoord.x,"+moduleMeters.toFixed(4)+")*"+
   (sourceMeters/moduleMeters).toFixed(8)+";",
  "float s95Delta=abs(mod(s95Local-(4.5+3.25)+24.0*100.5,24.0)-12.0);",
  "float s95Shape=1.0-smoothstep(2.93,6.0,s95Delta);",
  "float s95RoadSide=abs(vTrackCoord.y);",
  "float s95Across=exp(-pow((s95RoadSide-10.4)/3.05,2.0));",
  "float s95Safe=clamp(vEdgeStraight02891,0.0,1.0);",
  "float s95Energy=uS95Strength*s95Shape*s95Across*s95Safe;",
  "// Old broad cove/road GGX is attenuated between physical lip lamps.",
  "float s95BroadTrim=mix(1.0,0.25+0.75*s95Shape,uS95Strength);"
 ].join("\n");
 let f=fragment.replace(GLSL_COMMON,GLSL_COMMON+"\n"+header)
 .replace("float r263CoveBand=",prefix+"\nfloat r263CoveBand=")
 .replace("r263Source.x*r263CoveBand*0.38",
  "r263Source.x*r263CoveBand*0.38*s95BroadTrim");
 const marker=f.match(GGX_ANCHOR)?.[0];
 if(!marker)throw Error("0.28.9.5 tail/source-lobe anchor unavailable");
 const spill=[
  "// One smooth, locally supported color lobe, no rectangle/extra light mesh.",
  "float s95Signed=mod(vTrackCoord.x-uS95Front+.5*uS95Lap,uS95Lap)-.5*uS95Lap;",
  "float s95Mix=uS95Active*(1.0-smoothstep(-"+
   ZONE_WAVE.atmosphereTransitionMeters.toFixed(1)+","+
   ZONE_WAVE.atmosphereTransitionMeters.toFixed(1)+",s95Signed));",
  "vec3 s95Tint=mix(uS95Old,uS95Next,clamp(s95Mix,0.0,1.0));",
  "float s95GuideSafe=(1.0-.91*clamp(guided,0.0,1.0))*",
  " (1.0-.95*clamp(whiteCore,0.0,1.0))*",
  " (1.0-.86*clamp(padCoverage,0.0,1.0));",
  "float s95Finish=s95Energy*s95GuideSafe*r263Keep;",
  "reflectedLight.directSpecular+=s95Tint*s95Finish*"+
    (lowMemory?"0.13":"0.19")+"*(0.46+0.54*r263Fresnel);",
  "// Almost imperceptible substrate bounce; dark center is not painted.",
  "reflectedLight.directDiffuse+=s95Tint*s95Finish*"+
    (lowMemory?"0.013":"0.019")+";"
 ].join("\n");
 f=f.replace(marker,marker+"\n"+spill);
 return {vertexShader:vertex,fragmentShader:f};
}
const BASIC="vec3 d26Ice=vec3(0.050,0.69,0.88)*d26ColdPower;";
const COOL="l261Cool.color=vec3(0.07,0.64,0.97)";
const PBR=/pbrFixture0260\.color=vec3\([^)]+\)/;
export function patchWallCoveWave02895(vertex,fragment,{
 kind="substrate"
}={}){
 if(!["substrate","physical"].includes(kind)||
  !fragment.includes(GLSL_COMMON)||
  !(kind==="substrate"?fragment.includes(BASIC):
    fragment.includes("vPbrTrack0260")&&PBR.test(fragment)))
  throw Error("0.28.9.5 missing real 0.26.x cyan metal response "+kind);
 const declare=[
  "uniform vec3 uW95Old,uW95Next;",
  "uniform float uW95Front,uW95Active,uW95Start,uW95Scale,uW95Lap,uW95Power;",
  "vec3 w95Color(float sourceS){",
  "float s=uW95Start+sourceS*uW95Scale;",
  "float d=mod(s-uW95Front+.5*uW95Lap,uW95Lap)-.5*uW95Lap;",
  "float t=uW95Active*(1.0-smoothstep(-"+
   ZONE_WAVE.atmosphereTransitionMeters.toFixed(1)+","+
   ZONE_WAVE.atmosphereTransitionMeters.toFixed(1)+",d));",
  "return mix(uW95Old,uW95Next,clamp(t,0.0,1.0));",
  "}"
 ].join("\n");
 let f=fragment.replace(GLSL_COMMON,GLSL_COMMON+"\n"+declare);
 if(kind==="substrate"){
  f=f.replace(BASIC,
   "vec3 d26Ice=mix(vec3(0.050,0.69,0.88),"+
   " w95Color(vRebirthTrack)*vec3(0.82,0.76,0.82),"+
   " uW95Power)*d26ColdPower;");
 }else{
  const m=f.match(PBR)[0];
  f=f.replace(m,
   m.replace("pbrFixture0260.color=","pbrFixture0260.color=mix(")+
   ",w95Color(vPbrTrack0260)*vec3(.94,.79,.97),uW95Power)");
  // The native 0.26.1 local-source samples otherwise remain fixed ice-cyan
  // during pink/gold: synchronize their ORIGINAL physically limited colors.
  f=f.replaceAll(COOL,
   "l261Cool.color=mix(vec3(0.07,0.64,0.97),"+
   "w95Color(vPbrTrack0260)*vec3(.91,.78,.95),uW95Power)");
 }
 return {vertexShader:vertex,fragmentShader:f};
}
function inactive(reason){return {active:false,reason,updateWave(){},
 setComparison(){},stats:()=>({active:false,reason}),dispose(){}}}
export function installWaveCoupledCove02895(THREE,section,module,{
 enabled=false,lowMemory=false,trackLength=3400
}={}){
 if(!enabled)return inactive("historic/preview disabled");
 const group=section?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 if(!group||!Number.isFinite(module?.start)||!(module?.scale>0))
  throw Error("0.28.9.5 original shared scene/module missing");
 const metalRoles=["panel",...(!lowMemory?["rib"]:[])];
 const basicRoles=["HARDSURFACE_PANELS","CURVED_RIBS",
  "CLOSED_SHELL",...(!lowMemory?["STRUCTURAL_CONDUITS"]:[])];
 const target=[
  ...metalRoles.map(role=>({kind:"physical",name:"SKYSHIFT 0.26.0 P2 / true physical "+role})),
  ...basicRoles.map(role=>({kind:"substrate",name:"Tunnel / "+role}))
 ].map(x=>({...x,mesh:group.children.find(y=>y.name===x.name)}));
 if(target.some(t=>!t.mesh?.material||
   typeof t.mesh.material.onBeforeCompile!=="function"))
  throw Error("0.28.9.5 original metallic source batches missing");
 const uniforms={
  uW95Old:{value:new THREE.Color(ZONE_PALETTES[0].light)},
  uW95Next:{value:new THREE.Color(ZONE_PALETTES[0].light)},
  uW95Front:{value:-10000},uW95Active:{value:0},
  uW95Start:{value:module.start},uW95Scale:{value:module.scale},
  uW95Lap:{value:trackLength},uW95Power:{value:1}
 };
 const undo=[];
 try{
  for(const {kind,mesh} of target){
   const mat=mesh.material,before=mat.onBeforeCompile,
    key=mat.customProgramCacheKey;
   mat.onBeforeCompile=function(shader,renderer){
    before.call(this,shader,renderer);
    const v=patchWallCoveWave02895(shader.vertexShader,
      shader.fragmentShader,{kind});
    shader.vertexShader=v.vertexShader;
    shader.fragmentShader=v.fragmentShader;
    Object.assign(shader.uniforms,uniforms);
   };
   mat.customProgramCacheKey=function(){
    return key.call(this)+"-wave-cove-02895-"+kind;
   };
   mat.needsUpdate=true;
   undo.push(()=>{mat.onBeforeCompile=before;mat.customProgramCacheKey=key;
    mat.needsUpdate=true;});
  }
 }catch(e){for(const fn of undo.reverse())fn();throw e;}
 let disposed=false;
 return {active:true,
  updateWave(wave){
   const w=sharedWaveColors02894(wave);
   uniforms.uW95Old.value.setHex(w.from);
   uniforms.uW95Next.value.setHex(w.to);
   uniforms.uW95Front.value=w.front;uniforms.uW95Active.value=w.active;
  },
  setComparison(v){uniforms.uW95Power.value=clamp(v);},
  stats:()=>({active:true,version:"0.28.9.5",
   materials:target.length,substrates:basicRoles.length,
   physicalGGX:metalRoles.length,
   waveOld:uniforms.uW95Old.value.getHex(),
   waveNext:uniforms.uW95Next.value.getHex(),
   waveFront:uniforms.uW95Front.value,enabled:uniforms.uW95Power.value,
   moduleStart:module.start,moduleScale:module.scale,
   unchangedSourceMeshes:true,addedDrawCalls:0,addedLights:0,
   shipAndPhysicsUntouched:true}),
  dispose(){if(disposed)return;disposed=true;
   for(const fn of undo.reverse())fn();}
 };
}
export function installRoadSpill02895(THREE,road,{
 enabled=false,lowMemory=false,trackLength=3400,
 moduleMeters=340,sourceMeters=368}={}){
 if(!enabled)return inactive("historic/roadSpill=classic");
 const mat=road?.material;
 if(!mat?.isMeshStandardMaterial)
  throw Error("0.28.9.5 native GGX road unavailable");
 const before=mat.onBeforeCompile,key=mat.customProgramCacheKey;
 const uniforms={
  uS95Old:{value:new THREE.Color(ZONE_PALETTES[0].light)},
  uS95Next:{value:new THREE.Color(ZONE_PALETTES[0].light)},
  uS95Front:{value:-10000},uS95Active:{value:0},
  uS95Lap:{value:trackLength},uS95Strength:{value:1}
 };
 mat.onBeforeCompile=function(shader,renderer){
  before.call(this,shader,renderer);
  const p=patchRoadSpill02895(shader.vertexShader,shader.fragmentShader,{
   moduleMeters,sourceMeters,lowMemory});
  shader.vertexShader=p.vertexShader;shader.fragmentShader=p.fragmentShader;
  Object.assign(shader.uniforms,uniforms);
 };
 mat.customProgramCacheKey=function(){
  return key.call(this)+"-local-edge-pools-02895-"+(lowMemory?"4GB":"High");
 };
 mat.needsUpdate=true;
 let disposed=false;
 return {active:true,
  updateWave(wave){
   const w=sharedWaveColors02894(wave);
   uniforms.uS95Old.value.setHex(w.from);
   uniforms.uS95Next.value.setHex(w.to);
   uniforms.uS95Front.value=w.front;uniforms.uS95Active.value=w.active;
  },
  setComparison(v){uniforms.uS95Strength.value=clamp(v);},
  stats:()=>({active:true,version:"0.28.9.5",
   reference:"Skyline 0.26.3.3 local strip response",
   moduleMeters,sourceMeters,litLength:6.5,pitch:24,
   waveColors:[uniforms.uS95Old.value.getHex(),uniforms.uS95Next.value.getHex()],
   strength:uniforms.uS95Strength.value,
   straightOnly:true,segmentFalloffSmooth:true,
   addedDrawCalls:0,addedMesh:0,extraRoadAttributes:0,
   physicsUntouched:true}),
  dispose(){if(disposed)return;disposed=true;
   mat.onBeforeCompile=before;mat.customProgramCacheKey=key;
   mat.needsUpdate=true;
  }
 };
}
