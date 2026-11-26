// SKYSHIFT 0.26.3.1 — Edge Lighting & Floor Pools.
// Additional *real visible* edge/foot emitters from the original racing rail
// and tunnel arch geometry. No colliders, changes to GRIP/flight, global sun,
// environmental white fill, HDRI, SSR, new point lights or new render passes.
// The existing 0.26.3 solar-isolated road MeshStandardMaterial uses its native
// GGX BRDF for two new nearby rail LED samples (one on 4GB). Warm floor pools
// are placed on the original curved tunnel shoulder, NOT painted onto the road.
import {TUNNEL_PORTALS_0211,TUNNEL_PROFILE_0211,
 tunnelProfilePoint0211} from "./tunnel-megastructure-v0211.mjs";
import {widthAt} from "../tracks/trials/trial-v0165.mjs";

export const EDGE_FLOOR_02631=Object.freeze({
 version:"0.26.3.1",id:"edge-lighting-floor-pools-02631",
 base:"0.26.3",comparison:"?edgeFloor=classic",
 emitterPositions:"original banked rail lower bevel and tunnel arch feet",
 edge:"restrained broken cyan inset line; no chevron illumination",
 foot:"short amber lower-wall fittings + diffuse shoulder pools",
 nativeRoadGGX:true,externalSun:false,roadGeometryChanged:false,
 railGeometryChanged:false,railCollidersChanged:false,
 roadCollidersChanged:false,changesPhysics:false,changesGRIP:false,
 changesShip:false,changesCamera:false,changesNativeWave:false,
 changesWhiteCore:false,changesWorldLights:false,
 additionalDrawBatches:2,additionalDynamicLights:0,
 additionalPostprocessPasses:0,additionalTextures:0,
 railSamplesHigh:2,railSamples4GB:1,
 addedPhysicsColliders:0,
 roofNeonUnchanged:true
});
const COMMON="#include <common>";
const PROJECT="#include <project_vertex>";
const SPOT_ANCHOR="  (r263Keep*r263Fresnel*r263Surface);";
const clamp=(x,min,max)=>Math.max(min,Math.min(max,Number.isFinite(x)?x:min));
const gauss=(x,sigma)=>Math.exp(-Math.pow(x/sigma,2));
const INSIDE=367.7,STEP=24.0,LIT=22.7;
// Each 24m metal rail bay has a 22.7m recessed LED and a 1.3m dark seam.
export function railSegment02631(s){
 if(!Number.isFinite(s)||s<0||s>INSIDE)return 0;
 const t=((s%STEP)+STEP)%STEP;
 return clamp(Math.min(t/1.0,(LIT-t)/1.2),0,1);
}
export function nearestFoot02631(s,portals=TUNNEL_PORTALS_0211){
 if(!Number.isFinite(s))throw Error("0.26.3.1 nonfinite foot coordinate");
 let best=Infinity,portal=null;
 for(const p of portals){const target=p+1.15,dist=Math.abs(s-target);
  if(dist<best){best=dist;portal=target;}}
 return {portal,distance:best,weight:s>=0&&s<=368?gauss(best,6.5):0};
}
export function railSourceData02631(geometry,positionAt){
 const coord=geometry?.getAttribute?.("aTrackCoord"),pos=geometry?.getAttribute?.("position");
 if(!coord||!pos||coord.count!==pos.count||typeof positionAt!=="function")
  throw Error("0.26.3.1 requires intact original indexed deck");
 const n=coord.count,arrays={
  edgeLeft02631:new Float32Array(3*n),
  edgeRight02631:new Float32Array(3*n),
  edgeFootMask02631:new Float32Array(n)
 };
 let inside=0,lit=0;
 const cache=new Map();
 for(let i=0;i<n;i++){
  const s=coord.getX(i);
  if(s>INSIDE||s<0)continue;
  inside++;
  const a=railSegment02631(s),foot=nearestFoot02631(s).weight;
  arrays.edgeFootMask02631[i]=foot;
  if(a>.01)lit++;
  for(const [key,sign] of [["edgeLeft02631",-1],["edgeRight02631",1]]){
   // Exact original raised AERO_PROFILE inner bevel: offset -0.78..-0.56,
   // height .245.. .84, rather than the existing upper cap/chevrons.
   const cacheKey=s.toFixed(4)+":"+sign;
   let p=cache.get(cacheKey);
   if(!p){p=positionAt(s,sign*(widthAt(s)/2-.745),.335);
    if(!Number.isFinite(p?.x+p?.y+p?.z))
     throw Error("0.26.3.1 nonfinite banked rail source");
    cache.set(cacheKey,p);
   }
   arrays[key].set([p.x,p.y,p.z],i*3);
  }
 }
 return {arrays,vertices:n,inside,lit,sourceCount:cache.size};
}
export function patchEdgeRoadShader02631(vertex,fragment,{mobile=false}={}){
 for(const a of [COMMON,PROJECT])if(!vertex.includes(a))
  throw Error("0.26.3.1 missing native indexed road vertex: "+a);
 for(const a of [COMMON,SPOT_ANCHOR,"r263Keep","r263Fresnel",
  "roadSolarMask","whiteCore","vTrackCoord","RE_Direct(r263Lamp"])
  if(!fragment.includes(a))
   throw Error("0.26.3.1 requires genuine 0.26.3 solar-isolated GGX: "+a);
 const attr=[
  "attribute vec3 edgeLeft02631,edgeRight02631;",
  "attribute float edgeFootMask02631;",
  "varying vec3 vEdgeLeft02631,vEdgeRight02631;",
  "varying float vEdgeFoot02631;"
 ].join("\n");
 const vert=[
  "vEdgeLeft02631=(viewMatrix*vec4(edgeLeft02631,1.0)).xyz-mvPosition.xyz;",
  "vEdgeRight02631=(viewMatrix*vec4(edgeRight02631,1.0)).xyz-mvPosition.xyz;",
  "vEdgeFoot02631=edgeFootMask02631;"
 ].join("\n");
 const frag=[
  "uniform float uEdgeFloor02631;",
  "varying vec3 vEdgeLeft02631,vEdgeRight02631;",
  "varying float vEdgeFoot02631;"
 ].join("\n");
 const direct=[
  "// 0.26.3.1: fixture-bound specular only, never global cyan wash.",
  "if(uEdgeFloor02631>0.0001){",
  " float e31In=1.0-smoothstep(349.0,367.7,vTrackCoord.x);",
  " float e31Pitch=mod(vTrackCoord.x,24.0);",
  " float e31Bay=smoothstep(0.05,1.05,e31Pitch)*",
  "  (1.0-smoothstep(21.55,22.75,e31Pitch));",
  " float e31L=abs(vTrackCoord.y);",
  " float e31Edge=0.63*exp(-pow((e31L-7.60)/2.25,2.0))+","  exp(-pow((e31L-10.10)/1.85,2.0));",
  " float e31Safe=(1.0-0.88*clamp(guided,0.0,1.0))*",
  "  (1.0-0.88*clamp(padCoverage,0.0,1.0))*",
  "  (1.0-0.97*clamp(whiteCore,0.0,1.0));",
  " float e31Power=uEdgeFloor02631*e31In*e31Bay*e31Safe;",
  " float e31NDV=clamp(dot(normalize(vViewPosition),normal),0.0,1.0);",
  " float e31F=0.29+0.71*pow(1.0-e31NDV,2.0);"
 ];
 const sample=(name,weight)=>[
  "{",
  " vec3 e31D="+name+";",
  " float e31R=length(e31D);",
  " IncidentLight e31Light;",
  " e31Light.visible=true;",
  " e31Light.direction=normalize(e31D+vec3(0.00001));",
  " e31Light.color=vec3(0.030,0.47,0.73)*",
  "  ("+weight.toFixed(2)+"*e31Power/(1.0+pow(e31R/6.8,2.0)));",
  " vec3 e31DiffuseBackup=reflectedLight.directDiffuse;",
  " RE_Direct(e31Light,geometryPosition,geometryNormal,geometryViewDir,",
  "  geometryClearcoatNormal,material,reflectedLight);",
  " reflectedLight.directDiffuse=e31DiffuseBackup;",
  "}"
 ].join("\n");
 if(mobile)direct.push(
  " vec3 e31Near=mix(vEdgeLeft02631,vEdgeRight02631,step(0.0,vTrackCoord.y));",
  sample("e31Near",3.3));
 else for(const dir of ["vEdgeLeft02631","vEdgeRight02631"])
  direct.push(sample(dir,1.85));
 // Modest extended-source lobe. Not a self-illuminated roadway: its extent,
 // segment phase, viewing angle and source positions are constrained.
 direct.push(
  " vec3 e31Cool=vec3(0.018,0.48,0.76)*",
  "  (e31Power*e31F*e31Edge*0.37);",
  " float e31FootBand=exp(-pow((e31L-10.75)/1.90,2.0));",
  " vec3 e31Warm=vec3(0.85,0.27,0.055)*",
  "  (uEdgeFloor02631*e31In*e31Safe*clamp(vEdgeFoot02631,0.0,1.0)*",
  "   e31FootBand*e31F*0.16);",
  " reflectedLight.directSpecular+=e31Cool+e31Warm;",
  "}"
 );
 return {
  vertexShader:vertex.replace(COMMON,COMMON+"\n"+attr)
   .replace(PROJECT,PROJECT+"\n"+vert),
  fragmentShader:fragment.replace(COMMON,COMMON+"\n"+frag)
   .replace(SPOT_ANCHOR,SPOT_ANCHOR+"\n"+direct.join("\n"))
 };
}
export function installEdgeRoadShader02631(mat,uniform,{mobile=false}={}){
 if(!mat?.isMeshStandardMaterial||typeof mat.onBeforeCompile!=="function"||
  typeof mat.customProgramCacheKey!=="function")
  throw Error("0.26.3.1 requires original physically lit MeshStandard road");
 const old=mat.onBeforeCompile,oldKey=mat.customProgramCacheKey;
 mat.onBeforeCompile=function(shader,renderer){
  old.call(this,shader,renderer);
  const s=patchEdgeRoadShader02631(shader.vertexShader,shader.fragmentShader,{mobile});
  shader.vertexShader=s.vertexShader;shader.fragmentShader=s.fragmentShader;
  shader.uniforms.uEdgeFloor02631=uniform;
 };
 mat.customProgramCacheKey=function(){
  return oldKey.call(this)+"-edge-floor-02631-"+(mobile?"4gb":"high");
 };
 mat.needsUpdate=true;
 return ()=>{mat.onBeforeCompile=old;mat.customProgramCacheKey=oldKey;mat.needsUpdate=true;};
}
// Unmodified original tunnel floor profile; interpolate the same geometry
// vertices to avoid floating light pools or disconnected quads in banked turns.
export function floorY02631(x,s,vaultHeightClassic=false){
 const abs=Math.abs(x);
 if(abs<12.25||abs>24.65)throw Error("0.26.3.1 pool outside shoulder");
 const list=TUNNEL_PROFILE_0211;
 for(let j=0;j<5;j++){
  const lo=Math.abs(list[j][0]),hi=Math.abs(list[j+1][0]);
  if(abs>=lo&&abs<=hi){
   const a=tunnelProfilePoint0211(j,s,vaultHeightClassic),
    b=tunnelProfilePoint0211(j+1,s,vaultHeightClassic);
   return a[1]+(b[1]-a[1])*(abs-lo)/(hi-lo);
  }
 }
 throw Error("0.26.3.1 missing banked floor segment");
}
export function createEmitterGeometry02631(THREE,positionAt,lowMemory=false,
 vaultHeightClassic=false){
 const p=[],c=[];let strips=0,feet=0;
 const cyan=[0.065,0.72,0.93],amber=[1.0,0.34,0.085];
 const push=(points,color)=>{
  for(const n of [0,1,2,0,2,3]){
   const q=points[n];p.push(q.x,q.y,q.z);c.push(...color);
  }
 };
 const sample=(s,side,height,offset)=>positionAt(s,
  side*(widthAt(s)/2+offset),height);
 // Subtle lower inset on the *original* rail's inner bevel, not its
 // raised chevrons, road lanes, upper cap or physics/collision mesh.
 const max=INSIDE,spacing=lowMemory?2.1:1.05;
 for(let start=.1;start<max;start+=STEP){
  const end=Math.min(start+LIT,max);
  for(const side of [-1,1])
   for(let a=start;a<end-.0001;a+=spacing){
    const b=Math.min(a+spacing,end);
    const q=(s,h)=>sample(s,side,h,-.745);
    push([q(a,.312),q(a,.364),q(b,.364),q(b,.312)],cyan);
    strips++;
   }
 }
 // Low amber foot practicals anchored to the actual (index 2) arch root.
 // Keep them distinctly spaced: do NOT duplicate the yellow corner arrows.
 for(const portal of TUNNEL_PORTALS_0211){
  const s=Math.min(portal+1.16,367.1);
  for(const side of [-1,1]){
   const a=Math.max(.05,s-.37),b=Math.min(367.65,s+.37);
   const x=side*(Math.abs(tunnelProfilePoint0211(2,s,vaultHeightClassic)[0])-.35);
   const y=floorY02631(x,s,vaultHeightClassic);
   const f=(arc,h)=>positionAt(arc,x,h);
   push([f(a,y+.18),f(a,y+.52),f(b,y+.52),f(b,y+.18)],amber);
   feet++;
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(p,3));
 geo.setAttribute("color",new THREE.Float32BufferAttribute(c,3));
 geo.computeBoundingSphere();
 return {geometry:geo,strips,feet,triangles:p.length/9};
}
export function createFloorPoolGeometry02631(THREE,positionAt,vaultHeightClassic=false,
 lowMemory=false){
 const p=[],rgba=[];let pools=0;
 const put=(s,x,alpha,side)=>{
  const yy=floorY02631(x,s,vaultHeightClassic);
  const q=positionAt(s,side*x,yy+.055);
  if(!Number.isFinite(q?.x+q?.y+q?.z))throw Error("0.26.3.1 floor pool nonfinite");
  p.push(q.x,q.y,q.z);
  rgba.push(1.0,.33,.075,alpha);
 };
 const divisions=lowMemory?4:6;
 for(const portal of TUNNEL_PORTALS_0211){
  const center=portal+1.12;
  for(const side of [-1,1]){
   // Stay OUTSIDE original racing rail (lower bound 13.0m).
   const point=(i,j)=>{
    const s=clamp(center-5.5+11*i/divisions,.04,367.55),
     x=13.25+9.1*j/divisions,
     a=gauss((s-center),3.3)*gauss((x-18.1),3.3);
    return {s,x,alpha:.31*a};
   };
   for(let i=0;i<divisions;i++)for(let j=0;j<divisions;j++){
    const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);
    for(const k of [a,b,c,a,c,d])put(k.s,k.x,k.alpha,side);
   }
   pools++;
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(p,3));
 geo.setAttribute("color",new THREE.Float32BufferAttribute(rgba,4));
 geo.computeBoundingSphere();
 return {geometry:geo,pools,triangles:p.length/9};
}
export function installEdgeLightingFloorPools02631(THREE,world,roadMesh,{
 positionAt,lowMemory=false,vaultHeightClassic=false,roadRebuild
}={}){
 const fallback=reason=>({
  stats:()=>({edgeFloor02631Active:false,edgeFloor02631Status:reason}),
  setComparison(){},dispose(){}
 });
 if(!THREE||!world?.add||!roadMesh?.material?.isMeshStandardMaterial||
  !roadMesh.geometry?.getAttribute?.("aTrackCoord")||
  !roadRebuild?.stats?.().roadRebuild0263Active||
  typeof positionAt!=="function")
  return fallback("0.26.3-bank-rail-or-road-unavailable");
 const geo=roadMesh.geometry,installed=[];let strip,pool;
 let restore=null;
 try{
  const data=railSourceData02631(geo,positionAt);
  const e=createEmitterGeometry02631(THREE,positionAt,lowMemory,vaultHeightClassic);
  const f=createFloorPoolGeometry02631(THREE,positionAt,vaultHeightClassic,lowMemory);
  const amount={value:1};
  // No direct fixture lights added; existing GGX remains sun-isolated.
  for(const [key,value,size] of [
   ["edgeLeft02631",data.arrays.edgeLeft02631,3],
   ["edgeRight02631",data.arrays.edgeRight02631,3],
   ["edgeFootMask02631",data.arrays.edgeFootMask02631,1]]){
   geo.setAttribute(key,new THREE.Float32BufferAttribute(value,size));
   installed.push(key);
  }
  restore=installEdgeRoadShader02631(roadMesh.material,amount,{mobile:lowMemory});
  const sourceMat=new THREE.MeshBasicMaterial({
   vertexColors:true,side:THREE.DoubleSide,toneMapped:false,
   depthWrite:true
  });
  strip=new THREE.Mesh(e.geometry,sourceMat);
  strip.name="SKYSHIFT 0.26.3.1 / rail edge cyan and amber arch-foot emitters";
  strip.frustumCulled=true;strip.renderOrder=2;world.add(strip);
  const floorMat=new THREE.MeshBasicMaterial({
   vertexColors:true,side:THREE.DoubleSide,toneMapped:false,
   transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
   opacity:.78,polygonOffset:true,polygonOffsetFactor:-1,
   polygonOffsetUnits:-1
  });
  pool=new THREE.Mesh(f.geometry,floorMat);
  pool.name="SKYSHIFT 0.26.3.1 / amber lower-wall floor pools";
  pool.frustumCulled=true;pool.renderOrder=3;world.add(pool);
  const state={
   edgeFloor02631Active:true,edgeFloor02631Status:"active",
   edgeFloor02631Version:"0.26.3.1",
   edgeFloor02631Segments:e.strips,
   edgeFloor02631FootLights:e.feet,
   edgeFloor02631FloorPools:f.pools,
   edgeFloor02631SourceVertices:data.vertices,
   edgeFloor02631LitVertices:data.lit,
   edgeFloor02631RailSamples:lowMemory?1:2,
   edgeFloor02631LowMemory:!!lowMemory,
   edgeFloor02631DrawBatches:2,
   edgeFloor02631NewLights:0,edgeFloor02631NewPostprocess:0,
   edgeFloor02631NewColliders:0,
   edgeFloor02631SolarSealed:true,
   edgeFloor02631PreservesShip:true,edgeFloor02631PreservesGRIP:true,
   edgeFloor02631PreservesRoadGeometry:true,
   edgeFloor02631PreservesNativeWave:true,
   edgeFloor02631NoArrowLighting:true
  };
  const setComparison=v=>{
   amount.value=clamp(v,0,1);
   strip.visible=amount.value>.0001;
   pool.visible=amount.value>.0001;
   pool.material.opacity=.78*amount.value;
  };
  return {setComparison,stats:()=>({...state,
   edgeFloor02631Strength:amount.value}),dispose(){
    strip.removeFromParent();pool.removeFromParent();
    strip.geometry.dispose();strip.material.dispose();
    pool.geometry.dispose();pool.material.dispose();
    restore();for(const key of installed)geo.deleteAttribute(key);
   }};
 }catch(error){
  console.warn("SKYSHIFT 0.26.3.1 preserving previous lighting",error);
  strip?.removeFromParent();pool?.removeFromParent();
  strip?.geometry?.dispose();strip?.material?.dispose();
  pool?.geometry?.dispose();pool?.material?.dispose();
  restore?.();for(const key of installed)geo.deleteAttribute(key);
  return fallback("edge-or-floor-install-failed");
 }
}
