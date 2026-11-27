// SKYSHIFT 0.26.3.3 — Straight-Only Cyan Edge Lighting
// Surgical follow-up to 0.26.3.2. The rail's short cyan LED inlays used a
// periodic 24m schedule without knowing whether that bay was in a corner.
// Keep their existing *width, ground-level mount, colors and spacing*, but
// clip every lit bay to authored straight sections, well clear of turn arrows.
// Crucially, mask the GPU's reflected cyan too; hiding only the physical
// emitter would leave a ghost reflection on the bend.
// The amber joined arch-foot/floor bands remain 100% unchanged.
// ?straightEdges=classic retains exact 0.26.3.2 materials and geometry.
import {COURSE_SEGMENTS} from "../tracks/trials/trial-v0165.mjs";
import {
 railLipPosition02632,railBayWeight02632,
 createConnectedFootBands02632,createLowRailSourcesData02632,
 patchConnectedEdgeShader02632
} from "./edge-source-floor-bands-v02632.mjs";

export const STRAIGHT_EDGE_02633=Object.freeze({
 version:"0.26.3.3",base:"0.26.3.2",
 id:"straight-only-cyan-edge-lighting-02633",
 comparison:"?straightEdges=classic",
 straightOnly:true,turnArrowZonesExcluded:true,
 turnApproachClearanceMeters:12,turnExitClearanceMeters:12,
 cyanPitchMeters:24,cyanSegmentMaxMeters:6.5,
 cyanLowerWidthMeters:0.18,
 amberConnectedBandsUntouched:true,
 nativeRoadGGX:true,solarSealUntouched:true,
 extraDrawBatches:0,extraDynamicLights:0,extraColliders:0,
 railCollisionUnchanged:true,GRIPUnchanged:true,
 physicsUnchanged:true,shipUnchanged:true,
 roadGeometryUnchanged:true,curveGeometryUnchanged:true,
 whiteCoreUnchanged:true,nativeWaveUnchanged:true,
 roadReflectionsMaskedInTurns:true
});
const EDGE_LIMIT=367.65,PERIOD=24,START=4.5,END=11.0;
const CLEARANCE=12,FEATHER=.8;
const clamp=(x,min,max)=>Math.max(min,Math.min(max,Number.isFinite(x)?x:min));
const smooth=(a,b,x)=>{
 const t=clamp((x-a)/(b-a),0,1);
 return t*t*(3-2*t);
};
// Read the AUTHORITATIVE course. No hard-coded corner coordinates: this
// also works for Aurora and any later genuine circuit revision.
export function straightRanges02633(sections=COURSE_SEGMENTS){
 const result=[];
 for(let i=0;i<sections.length;i++){
  const x=sections[i];
  if(x.type!=="straight")continue;
  const prev=sections[i-1],next=sections[i+1];
  const from=Math.max(0,x.start+(prev?.type==="turn"?CLEARANCE:0));
  const to=Math.min(EDGE_LIMIT,x.end-(next?.type==="turn"?CLEARANCE:0));
  if(to-from>=2.8)result.push({from,to,id:x.id});
 }
 return result;
}
export function straightEdgeMask02633(s,ranges=straightRanges02633()){
 if(!Number.isFinite(s)||s<0||s>EDGE_LIMIT)return 0;
 for(const {from,to} of ranges){
  if(s>=from&&s<=to)
   return smooth(from,from+FEATHER,s)*(1-smooth(to-FEATHER,to,s));
 }
 return 0;
}
const makeGeometry=(THREE,p,c,channel=3)=>{
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(p,3));
 geo.setAttribute("color",new THREE.Float32BufferAttribute(c,channel));
 geo.computeBoundingSphere();
 return geo;
};
export function buildStraightCyanEmitters02633(THREE,positionAt,lowMemory=false){
 if(typeof positionAt!=="function")
  throw Error("0.26.3.3 requires original banked track positionAt");
 const p=[],c=[],ranges=straightRanges02633();
 let segments=0,quads=0,litMeters=0;
 const step=lowMemory?1.60:.82;
 for(let start=START;start<EDGE_LIMIT;start+=PERIOD){
  const end=Math.min(start+END-START,EDGE_LIMIT);
  // If the lane changes to a turn at any point, physically trim the
  // source polygon to the protected straight segment; never span a turn.
  for(const safe of ranges){
   const a=Math.max(start,safe.from),b=Math.min(end,safe.to);
   if(b-a<2.8)continue; // no isolated microscopic source fragments
   for(const side of [-1,1]){
    segments++;litMeters+=b-a;
    for(let s=a;s<b-0.00001;s+=step){
     const e=Math.min(s+step,b);
     const vertices=[
      railLipPosition02632(s,side,-1.018,positionAt),
      railLipPosition02632(s,side,-.810,positionAt),
      railLipPosition02632(e,side,-.810,positionAt),
      railLipPosition02632(e,side,-1.018,positionAt)
     ];
     const center=(s+e)/2;
     const intensity=.24+.76*railBayWeight02632(center);
     for(const i of [0,1,2,0,2,3]){
      const q=vertices[i];
      p.push(q.x,q.y,q.z);
      c.push(.06*intensity,.71*intensity,.90*intensity);
     }
     quads++;
    }
   }
  }
 }
 return {geometry:makeGeometry(THREE,p,c),segments,quads,
  litMeters,ranges};
}
export function buildStraightRoadMasks02633(geometry){
 const coord=geometry?.getAttribute?.("aTrackCoord"),
  position=geometry?.getAttribute?.("position");
 if(!coord||!position||coord.count!==position.count)
  throw Error("0.26.3.3 requires original indexed road");
 const values=new Float32Array(coord.count),ranges=straightRanges02633();
 let masked=0,active=0;
 for(let i=0;i<coord.count;i++){
  const value=straightEdgeMask02633(coord.getX(i),ranges);
  values[i]=value;
  if(value>0.05)active++;else masked++;
 }
 return {values,active,masked,vertices:coord.count};
}
export function patchStraightEdgeShader02633(vertex,fragment,{mobile=false}={}){
 // 0.26.3.2 physical lighting, white-wave isolation and amber masks are
 // preserved. Only the cyan source intensity and its specular response are
 // gated by the same straight classification as the visible cyan geometry.
 const patched=patchConnectedEdgeShader02632(vertex,fragment,{mobile});
 const v=patched.vertexShader,f=patched.fragmentShader;
 const common="#include <common>",project="#include <project_vertex>";
 const intensity="float e31Power=uEdgeFloor02631*e31In*e31Bay*e31Safe;";
 const newIntensity="float e31Power=uEdgeFloor02631*e31In*e31Bay*e31Safe*clamp(vEdgeStraight02633,0.0,1.0);";
 if(!v.includes(common)||!v.includes(project)||!f.includes(common)||
  !f.includes(intensity)||!f.includes("e31Warm"))
  throw Error("0.26.3.3 requires native 0.26.3.2 solar-isolated edge GGX");
 return {
  vertexShader:v.replace(common,common+
   "\nattribute float edgeStraightMask02633;\nvarying float vEdgeStraight02633;")
   .replace(project,project+"\nvEdgeStraight02633=edgeStraightMask02633;"),
  fragmentShader:f.replace(common,common+"\nvarying float vEdgeStraight02633;")
   .replace(intensity,newIntensity)
 };
}
export function installStraightOnlyShader02633(material,uniform,opts){
 if(!material?.isMeshStandardMaterial||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.26.3.3 requires physical solar-isolated road material");
 const old=material.onBeforeCompile,key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  old.call(this,shader,renderer);
  const patch=patchStraightEdgeShader02633(shader.vertexShader,
   shader.fragmentShader,opts);
  shader.vertexShader=patch.vertexShader;
  shader.fragmentShader=patch.fragmentShader;
  shader.uniforms.uEdgeFloor02631=uniform;
 };
 material.customProgramCacheKey=function(){return key.call(this)+
  "-straight-only-02633-"+(opts.mobile?"4gb":"high");};
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=old;
  material.customProgramCacheKey=key;material.needsUpdate=true;};
}
export function installStraightOnlyEdgeLighting02633(THREE,world,roadMesh,{
 positionAt,lowMemory=false,vaultHeightClassic=false,roadRebuild
}={}){
 const fallback=reason=>({stats:()=>({
  straightEdges02633Active:false,straightEdges02633Status:reason}),
  setComparison(){},dispose(){}});
 if(!THREE||!world?.add||!roadMesh?.material?.isMeshStandardMaterial||
  !roadMesh.geometry?.getAttribute?.("aTrackCoord")||
  !roadRebuild?.stats?.().roadRebuild0263Active||
  typeof positionAt!=="function")
  return fallback("original-bank-and-physical-road-unavailable");
 const geo=roadMesh.geometry,installed=[];
 let cyan=null,amber=null,restore=null;
 try{
  const sources=createLowRailSourcesData02632(geo,positionAt);
  const mask=buildStraightRoadMasks02633(geo);
  const e=buildStraightCyanEmitters02633(THREE,positionAt,lowMemory);
  const f=createConnectedFootBands02632(THREE,positionAt,
   lowMemory,vaultHeightClassic);
  for(const [key,array,size] of [
   ["edgeLeft02631",sources.arrays.edgeLeft02631,3],
   ["edgeRight02631",sources.arrays.edgeRight02631,3],
   ["edgeFootMask02631",sources.arrays.edgeFootMask02631,1],
   ["edgeStraightMask02633",mask.values,1]]){
   geo.setAttribute(key,new THREE.Float32BufferAttribute(array,size));
   installed.push(key);
  }
  const uniform={value:1};
  restore=installStraightOnlyShader02633(roadMesh.material,uniform,
   {mobile:lowMemory});
  cyan=new THREE.Mesh(e.geometry,new THREE.MeshBasicMaterial({
   vertexColors:true,side:THREE.DoubleSide,toneMapped:false,depthWrite:true
  }));
  cyan.name="SKYSHIFT 0.26.3.3 / cyan lower-edge inlays on straight track ONLY";
  cyan.frustumCulled=true;cyan.renderOrder=2;world.add(cyan);
  // Same exact warm connected foot/floor geometry and material as 0.26.3.2.
  amber=new THREE.Mesh(f.geometry,new THREE.MeshBasicMaterial({
   vertexColors:true,side:THREE.DoubleSide,toneMapped:false,
   transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
   opacity:.86,polygonOffset:true,polygonOffsetFactor:-1,
   polygonOffsetUnits:-1
  }));
  amber.name="SKYSHIFT 0.26.3.2 / one-piece amber arch-foot and floor bands";
  amber.frustumCulled=true;amber.renderOrder=3;world.add(amber);
  const stats={
   straightEdges02633Active:true,straightEdges02633Status:"active",
   straightEdges02633Version:"0.26.3.3",
   straightEdges02633Segments:e.segments,
   straightEdges02633LitMeters:e.litMeters,
   straightEdges02633SafeRanges:e.ranges.map(x=>({from:x.from,to:x.to})),
   straightEdges02633MaskedRoadVertices:mask.masked,
   straightEdges02633ActiveRoadVertices:mask.active,
   straightEdges02633AmberBands:f.bands,
   straightEdges02633AmberSources:f.footSources,
   straightEdges02633CyanWidth:.18,
   straightEdges02633GGXSamples:lowMemory?1:2,
   straightEdges02633LowMemory:!!lowMemory,
   straightEdges02633ExtraDrawCalls:0,
   straightEdges02633NewLights:0,straightEdges02633NewColliders:0,
   straightEdges02633CurveArrowsUnchanged:true,
   straightEdges02633GRIPUnchanged:true,straightEdges02633PhysicsUnchanged:true,
   straightEdges02633SolarSealed:true,straightEdges02633NativeWaveUnchanged:true,
   straightEdges02633AmberUnchanged:true
  };
  const setComparison=v=>{
   uniform.value=clamp(v,0,1);
   cyan.visible=uniform.value>.0001;
   amber.visible=uniform.value>.0001;
   amber.material.opacity=.86*uniform.value;
  };
  return {setComparison,stats:()=>({...stats,
   straightEdges02633Strength:uniform.value}),dispose(){
   cyan.removeFromParent();amber.removeFromParent();
   cyan.geometry.dispose();cyan.material.dispose();
   amber.geometry.dispose();amber.material.dispose();
   restore();for(const key of installed)geo.deleteAttribute(key);
  }};
 }catch(e){
  console.warn("SKYSHIFT 0.26.3.3 keeping previous rail lighting",e);
  cyan?.removeFromParent();amber?.removeFromParent();
  cyan?.geometry.dispose();cyan?.material.dispose();
  amber?.geometry.dispose();amber?.material.dispose();
  restore?.();for(const key of installed)geo.deleteAttribute(key);
  return fallback("straight-only-source-install-failed");
 }
}
