// SKYSHIFT 0.28.9.6 — Curve Surface Artifact & Transition Seam Cleanup.
// Correct two discontinuities IN the original indexed racing road:
//  * 0.28.9.1 short 0.8m road-light falloff near actual curve clearance
//  * 3400m periodic color-wave signed coordinate's antipodal +/-1700m jump.
// The continuous physical deck and its indexed normals are already correct.
// No overlay strips, new meshes/lights/attributes, handling or camera changes.
import {vaultStraightRanges02891,vaultStraightMask02891}
 from "./shared-straight-edge-parity-v02891.mjs";
import {ZONE_WAVE} from "../core/zone-wave-v060.mjs";

export const CURVE_CONTINUITY_02896=Object.freeze({
 version:"0.28.9.6",title:"Curve Surface Artifact & Transition Seam Cleanup",
 source:"same 0.28.9.1 safe straight intervals and shared original 3400m wave",
 curveMask:"8m road-reflection rolloff inside existing 12m no-lamp bend clearance",
 oppositeSeam:"C1-smooth 180m chromatic blend around wave's antipodal lap boundary",
 preserves:"real short inlay geometry, original arches, 0.28.9.5 road pools/cove wave",
 touchedRoadMeshes:0,touchedRoadVertices:0,addedRoadAttributes:0,
 addedLights:0,addedDrawCalls:0,changedColliders:0,
 originalIndexedNormals:true,curveLampsStillAbsent:true,
 rollbacks:["?curveBlend=classic","?waveSeam=classic","?surfaceContinuity=classic"]
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
export function surfaceContinuityEnabled02896(search=
 typeof location!=="undefined"?location.search:""){
 const p=new URLSearchParams(search||"");
 if(p.get("track")!=="vault"||p.get("surfaceContinuity")==="classic")return false;
 const m=/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(p.get("v")||"");
 if(!m)return false;
 const [major,minor,patch,sub]=m.slice(1).map(v=>Number(v||0));
 return major>0||minor>28||(minor===28&&(patch>9||(patch===9&&sub>=6)));
}
// Keep every physical lower-edge source and its authored 12m clearance
// unchanged. Only the ROAD optical mask eases out during the last 8m of
// the still-safe straight, BEFORE the clearance begins. The old 0.8m
// shader/attribute profile remains available with strength=0.
export function curveRoadMask02896(s,{
 ranges=vaultStraightRanges02891(),fadeMeters=8
}={}){
 if(!Number.isFinite(s)||!Array.isArray(ranges)||!(fadeMeters>0))
  throw Error("0.28.9.6 invalid original straight-light curve transition");
 const previous=vaultStraightMask02891(s,ranges);
 if(previous<=0)return 0;
 let eased=0;
 for(const {from,to} of ranges){
  if(s<from||s>to)continue;
  const fade=Math.min(fadeMeters,Math.max(.01,(to-from)*.45));
  eased=smooth((s-from)/fade)*(1-smooth((s-(to-fade))/fade));
  break;
 }
 return clamp(Math.min(previous,eased));
}
// A stage color on a closed loop requires a trailing transition as well
// as its visible moving leading front. Historically the periodic signed
// coordinate jumped from -L/2 to +L/2, producing the user's hard
// shoulder-wide color slab in the opposite part of the course.
// Match both sides at exactly 0.5 at the antipodal seam, with zero
// derivative at the join. Leave the actual front and narrow WHITE core
// exactly as previously authored. No extra waves, clocks or lights.
export function periodicColorBlend02896(signed,lap,fade=180,feather=
 ZONE_WAVE.atmosphereTransitionMeters){
 if(!Number.isFinite(signed)||!Number.isFinite(lap)||lap<=0||
  !(fade>0)||!(feather>0))throw Error("0.28.9.6 invalid wave distance");
 const half=lap*.5;
 const wrapped=((signed+half)%lap+lap)%lap-half;
 const original=1-smooth((wrapped+feather)/(2*feather));
 const join=smooth((Math.abs(wrapped)-(half-fade))/fade);
 return original*(1-join)+.5*join;
}
const COMMON="#include <common>";
// Use the original road wave functions as-is. Replace only the resulting
// chromatic transition weight, NEVER whiteCore, geometry, wave timing,
// guide markings or the source-selected GGX positions.
export function patchCurveColorSeam02896(vertex,fragment){
 if(!vertex.includes(COMMON)||!fragment.includes(COMMON)||
  !fragment.includes("float wave1Color =")||
  !fragment.includes("a93Signed")||!fragment.includes("u94Signed"))
  throw Error("0.28.9.6 requires the original 0.28.9.4+ moving color shaders");
 const helper=[
  "uniform float uCurveWaveSeam02896;",
  "float curve96Color(float signedDistance,float lapMeters){",
  "float halfLap=0.5*lapMeters;",
  "float chroma=1.0-smoothstep(-66.0,66.0,signedDistance);",
  "float opposite=smoothstep(halfLap-180.0,halfLap,abs(signedDistance));",
  "return mix(chroma,mix(chroma,0.5,opposite),uCurveWaveSeam02896);",
  "}"
 ].join("\n");
 let f=fragment,n=0;
 for(const [d,lap] of [
  ["wave1D","uCircuitLength"],["wave2D","uCircuitLength"],
  ["wave3D","uCircuitLength"],["a93Signed","uA93Lap"],
  ["u94Signed","uU94Lap"],["s95Signed","uS95Lap"]
 ]){
  const old="1.0-smoothstep(-66.0,66.0,"+d+")";
  if(!f.includes(old)){
   if(d==="s95Signed")continue; // isolated ?roadSpill=classic A/B
   throw Error("0.28.9.6 missing real chromatic source "+d);
  }
  f=f.replace(old,"curve96Color("+d+","+lap+")");n++;
 }
 if(n<5)throw Error("0.28.9.6 insufficient physical wave/color sources");
 f=f.replace(COMMON,COMMON+"\n"+helper);
 return {vertexShader:vertex,fragmentShader:f,correctedSources:n};
}
function inactive(reason){return {active:false,updateWave(){},setComparison(){},
 stats:()=>({active:false,reason}),dispose(){}}}
export function installCurveSurfaceContinuity02896(THREE,road,{
 enabled=false,curveEnabled=true,waveEnabled=true
}={}){
 if(!enabled)return inactive("historic/surfaceContinuity=classic");
 const geo=road?.geometry,mat=road?.material,
  track=geo?.getAttribute?.("aTrackCoord"),
  original=geo?.getAttribute?.("edgeStraightMask02891");
 if(!mat?.isMeshStandardMaterial||!track||!original||track.count!==original.count)
  throw Error("0.28.9.6 needs original indexed Vault road and 0.28.9.1 mask");
 const previous=Float32Array.from(original.array),adjusted=new Float32Array(track.count);
 let changed=0,curvesDark=0;
 for(let i=0;i<track.count;i++){
  const s=track.getX(i),old=previous[i];
  adjusted[i]=curveRoadMask02896(s);
  if(adjusted[i]>old+0.0001)throw Error("0.28.9.6 cannot illuminate a curve");
  if(old>0&&adjusted[i]===0)curvesDark++;
  if(Math.abs(adjusted[i]-old)>.0001)changed++;
 }
 const state={curve:curveEnabled?1:0,wave:waveEnabled?1:0};
 const before=mat.onBeforeCompile,cache=mat.customProgramCacheKey;
 const wavePower={value:state.wave};
 function applyMask(){
  for(let i=0;i<track.count;i++)
   original.array[i]=previous[i]+(adjusted[i]-previous[i])*state.curve;
  original.needsUpdate=true;
 }
 applyMask();
 mat.onBeforeCompile=function(shader,renderer){
   before.call(this,shader,renderer);
   const p=patchCurveColorSeam02896(shader.vertexShader,shader.fragmentShader);
   shader.vertexShader=p.vertexShader;shader.fragmentShader=p.fragmentShader;
   shader.uniforms.uCurveWaveSeam02896=wavePower;
  };
  mat.customProgramCacheKey=function(){
   return cache.call(this)+"-curve-surface-seam-02896";
  };
  mat.needsUpdate=true;
 let disposed=false;
 return {active:true,updateWave(){},
  setComparison({curve,wave}={}){
   if(curve!==undefined){state.curve=clamp(curve);applyMask();}
   if(wave!==undefined){state.wave=clamp(wave);wavePower.value=state.wave;}
  },
  stats:()=>({active:true,version:"0.28.9.6",
   changedOpticalMaskVertices:changed,keptDarkAtBoundary:curvesDark,
   sourceVertices:track.count,originalMaskRetained:true,
   sourceEmitterGeometryUntouched:true,allTurnMasksZero:true,
   curveStrength:state.curve,waveStrength:state.wave,
   seamlessOppositePalette:true,transitionMeters:180,
   masksAlreadyIndexed:true,extraRoadAttributes:0,
   newMeshCount:0,newLights:0,physicsUntouched:true}),
  dispose(){
   if(disposed)return;disposed=true;
   original.array.set(previous);original.needsUpdate=true;
   mat.onBeforeCompile=before;mat.customProgramCacheKey=cache;
   mat.needsUpdate=true;
  }};
}
