// SKYSHIFT 0.28.9.1 – Shared Straight-Only Edge Lighting Parity.
// Port of successful Skyline 0.26.3.3: same short low-bevel inlays,
// same 12m bend clearance and matching cyan GGX mask. Vault's *own*
// 3400m course is authoritative; no recycled 368m corner decisions.
// Amber arch feet, corner arrows, roof lights, ship and physics untouched.
import {COURSE_SEGMENTS,CIRCUIT} from "./trial-v0165.mjs";
import {railLipPosition02632,railBayWeight02632}
 from "./edge-source-floor-bands-v02632.mjs";
export const STRAIGHT_EDGE_PARITY_02891=Object.freeze({
 version:"0.28.9.1",source:"Skyline 0.26.3.3 / straight-only cyan",
 originalGeometry:"0.26.3.2 18cm low rail shoulder inlays",
 pitchSourceMeters:24,litSourceMeters:6.5,
 beforeTurnMeters:12,afterTurnMeters:12,minimumFragmentMeters:2.8,
 fadeMeters:0.8,straightSourceOnly:true,roadCyanGGXMaskedInTurns:true,
 amberUnchanged:true,cornerChevronsUnchanged:true,
 roadGeometryUnchanged:true,shipUnchanged:true,physicsUnchanged:true,
 boostUnchanged:true,gripUnchanged:true,addedLights:0,
 addedRenderPasses:0,additionalBRDFSamples:0,
 compare:"?track=vault&v=0.28.9.1&straightEdgeParity=classic"
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const smooth=(a,b,x)=>{const t=clamp((x-a)/Math.max(1e-6,b-a),0,1);
 return t*t*(3-2*t);};
export function straightParityEnabled02891(search=
 typeof location!=="undefined"?location.search:""){
 const p=new URLSearchParams(search||"");
 if(p.get("track")!=="vault"||
  ["classic","off"].includes(p.get("straightEdgeParity")))return false;
 const v=/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(p.get("v")||"");
 if(!v)return false;
 const [a,b,c,d]=v.slice(1).map(x=>Number(x??0));
 return a>0||b>28||(b===28&&(c>9||(c===9&&d>=1)));
}
export function vaultStraightRanges02891(segments=COURSE_SEGMENTS,
 clearance=12){
 if(!Array.isArray(segments)||!segments.length)
  throw Error("0.28.9.1 requires authored Vault course sections");
 const ranges=[];
 for(let i=0;i<segments.length;i++){
  const segment=segments[i],prev=segments[(i-1+segments.length)%segments.length],
   next=segments[(i+1)%segments.length];
  if(segment.type!=="straight")continue;
  const from=segment.start+(prev.type==="turn"?clearance:0);
  const to=segment.end-(next.type==="turn"?clearance:0);
  if(to-from>=2.8)ranges.push({from,to,id:segment.id});
 }
 return ranges;
}
export function vaultStraightMask02891(s,ranges=vaultStraightRanges02891(),
 length=CIRCUIT.lapLength){
 if(!Number.isFinite(s)||s<0||s>length)return 0;
 // Original 0.26.3.3 uses a soft 0.8m edge inside the 12m safety zone.
 const d=s===length?0:s;
 for(const r of ranges){
  if(d>=r.from&&d<=r.to)
   return smooth(r.from,r.from+.8,d)*
    (1-smooth(r.to-.8,r.to,d));
 }
 return 0;
}
function geometry(THREE,pos,col){
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
 g.setAttribute("color",new THREE.Float32BufferAttribute(col,3));
 g.computeBoundingSphere();
 return g;
}
export function buildVaultStraightEmitters02891(THREE,localPositionAt,
 module,{lowMemory=false,ranges=vaultStraightRanges02891()}={}){
 if(!THREE?.BufferGeometry||typeof localPositionAt!=="function"||
  !Number.isFinite(module?.start)||!(module?.scale>0)||
  !(module?.sourceMeters>0))
  throw Error("0.28.9.1 requires true shared banked section");
 const positions=[],colors=[];
 let segments=0,quads=0,litMeters=0;const step=lowMemory?1.6:.82;
 for(let start=4.5;start<Math.min(367.65,module.sourceMeters);start+=24){
  const stop=Math.min(start+6.5,367.65,module.sourceMeters);
  const globalA=module.start+start*module.scale;
  const globalB=module.start+stop*module.scale;
  for(const safe of ranges){
   const aGlobal=Math.max(globalA,safe.from),bGlobal=Math.min(globalB,safe.to);
   if(bGlobal-aGlobal<2.8)continue;
   const a=(aGlobal-module.start)/module.scale;
   const b=(bGlobal-module.start)/module.scale;
   if(b<=a)continue;
   for(const side of [-1,1]){
    segments++;litMeters+=bGlobal-aGlobal;
    for(let local=a;local<b-1e-6;local+=step){
     const end=Math.min(local+step,b);
     const points=[
      railLipPosition02632(local,side,-1.018,localPositionAt),
      railLipPosition02632(local,side,-.810,localPositionAt),
      railLipPosition02632(end,side,-.810,localPositionAt),
      railLipPosition02632(end,side,-1.018,localPositionAt)
     ];
     const intensity=.24+.76*railBayWeight02632((local+end)*.5);
     for(const index of [0,1,2,0,2,3]){
      const p=points[index];positions.push(p.x,p.y,p.z);
      colors.push(.06*intensity,.71*intensity,.90*intensity);
     }
     quads++;
    }
   }
  }
 }
 return {geometry:geometry(THREE,positions,colors),
  segments,quads,litMeters,sourceModule:module.index};
}
export function buildVaultRoadStraightMask02891(geo,ranges=vaultStraightRanges02891()){
 const track=geo?.getAttribute?.("aTrackCoord"),
  pos=geo?.getAttribute?.("position");
 if(!track||!pos||track.count!==pos.count)
  throw Error("0.28.9.1 needs original indexed PBR road track coordinates");
 const values=new Float32Array(track.count);
 let active=0,masked=0;
 for(let i=0;i<track.count;i++){
  const m=vaultStraightMask02891(track.getX(i),ranges);
  values[i]=m;
  if(m>0.001)active++;else masked++;
 }
 return {values,active,masked,vertices:track.count,ranges};
}
const COMMON="#include <common>",PROJECT="#include <project_vertex>";
export function patchVaultRoadCyanMask02891(vertex,fragment){
 // Wrap AFTER 0.28.2 native GGX and 0.28.9 polished road:
 // changing r263Source.x blocks BOTH the original source and added
 // road glints in turns. r263Source.y is the untouched amber channel.
 const source="vec2 r263Source=";
 if(!vertex.includes(COMMON)||!vertex.includes(PROJECT)||
  !fragment.includes(COMMON)||!fragment.includes(source)||
  !fragment.includes("r263Convolved")||
  !fragment.includes("uCinematicRoad0289"))
  throw Error("0.28.9.1 expected real 0.28.2+0.28.9 road shader chain");
 const matcher=/vec2 r263Source=[^;\n]+;/g;
 const matches=fragment.match(matcher);
 if(matches?.length!==1)throw Error("0.28.9.1 expected one native cyan GGX source");
 const v=vertex.replace(COMMON,COMMON+
  "\nattribute float edgeStraightMask02891;\nvarying float vEdgeStraight02891;")
  .replace(PROJECT,PROJECT+
   "\nvEdgeStraight02891=edgeStraightMask02891;");
 const f=fragment.replace(COMMON,COMMON+
  "\nvarying float vEdgeStraight02891;")
  .replace(matches[0],matches[0]+
   "\nr263Source.x*=clamp(vEdgeStraight02891,0.0,1.0);");
 return {vertexShader:v,fragmentShader:f};
}
export function installVaultStraightRoadParity02891(THREE,road,{
 enabled=false,ranges=vaultStraightRanges02891()
}={}){
 const inactive=reason=>({active:false,stats:()=>({active:false,reason}),
  dispose(){}});
 if(!enabled)return inactive("0.28.9 comparison/older release");
 if(!THREE?.Float32BufferAttribute||!road?.material?.isMeshStandardMaterial||
  !road?.geometry?.getAttribute?.("aTrackCoord"))
  return inactive("original road geometry/material unavailable");
 const g=road.geometry,mat=road.material,
  key="edgeStraightMask02891";
 if(g.getAttribute(key))return inactive("duplicate edge mask");
 const mask=buildVaultRoadStraightMask02891(g,ranges);
 const before=mat.onBeforeCompile,cache=mat.customProgramCacheKey;
 g.setAttribute(key,new THREE.Float32BufferAttribute(mask.values,1));
 mat.onBeforeCompile=function(shader,renderer){
  before.call(this,shader,renderer);
  const p=patchVaultRoadCyanMask02891(shader.vertexShader,shader.fragmentShader);
  shader.vertexShader=p.vertexShader;shader.fragmentShader=p.fragmentShader;
 };
 mat.customProgramCacheKey=function(){
  return cache.call(this)+"-vault-straight-only-cyan-02891";};
 mat.needsUpdate=true;
 let disposed=false;
 return {active:true,stats:()=>({active:true,version:"0.28.9.1",
  masks:mask.vertices,activeVertices:mask.active,maskedVertices:mask.masked,
  straightRanges:ranges,additionalBRDFSamples:0,addedLights:0,
  amberUnchanged:true,roadGeometryUntouched:true,
  curveCyanReflectionsDisabled:true}),
  dispose(){if(disposed)return;disposed=true;
   mat.onBeforeCompile=before;mat.customProgramCacheKey=cache;mat.needsUpdate=true;
   g.deleteAttribute(key);}
 };
}
