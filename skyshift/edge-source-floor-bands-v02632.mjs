// SKYSHIFT 0.26.3.2 — Edge Source Reposition & Connected Floor Light Bands
//
// The 0.26.3.1 rails looked like a nearly continuous thin neon wire halfway
// up the bevel; its warm foot spots looked disconnected from the floor pools.
// Replace both with a coherent, non-physical visual source design.
// Preserve the 0.26.3 native road GGX, solar seal and all gameplay geometry.
// Direct ?edgeSources=classic restores the EXACT published 0.26.3.1 installer.
import {widthAt} from "./trial-v0165.mjs";
import {TUNNEL_PORTALS_0211,tunnelProfilePoint0211}
 from "./tunnel-megastructure-v0211.mjs";
import {floorY02631,nearestFoot02631,patchEdgeRoadShader02631}
 from "./edge-lighting-floor-pools-v02631.mjs";

export const EDGE_SOURCE_02632=Object.freeze({
 version:"0.26.3.2",base:"0.26.3.1",
 id:"edge-source-reposition-connected-floor-bands-02632",
 comparison:"?edgeSources=classic",
 cyanMount:"lowest inside rail shoulder slope, ~0.1m above surface",
 cyanWidthMeters:0.18,cyanSegmentPitchMeters:24,
 cyanLitLengthMeters:6.5,cyanDarkGapMeters:17.5,
 amberFootBands:20,amberSourceHeightMeters:0.50,
 amberTrackBandLengthMeters:14.4,amberFloorBandWidthMeters:11.25,
 connectedFloorAndFootGeometry:true,
 addedDrawBatches:2,addedDynamicLights:0,addedTextures:0,
 addedPostprocessPasses:0,addedColliders:0,
 physicsUnchanged:true,GRIPUnchanged:true,cameraUnchanged:true,
 shipUnchanged:true,originalRoadUnchanged:true,originalRailUnchanged:true,
 tunnelUnchanged:true,whiteCoreUnchanged:true,nativeWaveUnchanged:true,
 externalSunDisabled:true,roofLightsUnchanged:true,
 cyanGGXSamplesHigh:2,cyanGGXSamples4GB:1
});
const PITCH=24,FROM=4.5,UNTIL=11.0,LIMIT=367.65;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const gauss=(x,s)=>Math.exp(-Math.pow(x/s,2));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const SLANT=[
 {offset:-1.03,height:.035},
 {offset:-.78,height:.245}
];
// The original AERO_PROFILE low sloped shoulder has exactly these two ends.
// Sampling ON its face avoids a floating/tube-like strip and does not touch it.
export function railLipPosition02632(s,side,offset,positionAt){
 if(!Number.isFinite(s)||s<0||s>368||
  ![-1,1].includes(side)||offset<SLANT[0].offset||offset>SLANT[1].offset)
  throw Error("0.26.3.2 lower rail bevel coordinates invalid");
 const t=(offset-SLANT[0].offset)/(SLANT[1].offset-SLANT[0].offset);
 const y=SLANT[0].height+(SLANT[1].height-SLANT[0].height)*t+.014;
 const x=side*(widthAt(s)/2+offset);
 const q=positionAt(s,x,y);
 if(!Number.isFinite(q?.x+q?.y+q?.z))
  throw Error("0.26.3.2 invalid banked lower rail world position");
 return q;
}
export function railBayWeight02632(s){
 if(!Number.isFinite(s)||s<0||s>LIMIT)return 0;
 const t=((s%PITCH)+PITCH)%PITCH;
 return smooth(FROM,FROM+.65,t)*(1-smooth(UNTIL-.65,UNTIL,t));
}
const pushRGB=(a,b,vertices,color)=>{
 for(const k of [0,1,2,0,2,3]){
  const v=vertices[k];a.push(v.x,v.y,v.z);b.push(...color);
 }
};
const pushRGBA=(a,b,vertices,rgba)=>{
 for(const k of [0,1,2,0,2,3]){
  const v=vertices[k];a.push(v.x,v.y,v.z);b.push(...rgba[k]);
 }
};
function buildGeometry(THREE,p,c,components=3){
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(p,3));
 geo.setAttribute("color",new THREE.Float32BufferAttribute(c,components));
 geo.computeBoundingSphere();
 return geo;
}
export function createLowerEdgeSources02632(THREE,positionAt,lowMemory=false){
 const p=[],c=[];let segments=0,quads=0,totalLit=0;
 const step=lowMemory?1.60:.82;
 for(let start=FROM;start<LIMIT;start+=PITCH){
  const a=start,b=Math.min(start+UNTIL-FROM,LIMIT);
  if(b-a<.20)continue;
  for(const side of [-1,1]){
   segments++;
   totalLit+=b-a;
   for(let s=a;s<b-.00001;s+=step){
    const end=Math.min(s+step,b);
    // 18cm broad lower bevel inset, not 5cm suspended midway up rail.
    const p0=railLipPosition02632(s,side,-1.018,positionAt),
     p1=railLipPosition02632(s,side,-.810,positionAt),
     p2=railLipPosition02632(end,side,-.810,positionAt),
     p3=railLipPosition02632(end,side,-1.018,positionAt);
    const center=(s+end)/2;
    const f=.24+.76*railBayWeight02632(center);
    pushRGB(p,c,[p0,p1,p2,p3],[.06*f,.71*f,.90*f]);
    quads++;
   }
  }
 }
 return {geometry:buildGeometry(THREE,p,c),segments,quads,litMeters:totalLit};
}
// Mount at the actually VISIBLE outer vault foot, near wall/floor junction.
// 0.26.3.1 incorrectly used index 2 (x≈17.8), which placed an isolated
// amber stick well inboard of the visible arch end (index 4, x≈24.65).
const ROOT=(s,vaultHeightClassic=false)=>Math.abs(
 tunnelProfilePoint0211(4,s,vaultHeightClassic)[0])-.20;
export function createConnectedFootBands02632(THREE,positionAt,
 lowMemory=false,vaultHeightClassic=false){
 const positions=[],colors=[];
 let bands=0,footSources=0;
 const NX=lowMemory?6:9,NS=lowMemory?10:16;
 // One geometry *and* one material contains the foot lamp + its falloff band.
 // Both geometries share the same source floor position; no isolated spots.
 for(const portal of TUNNEL_PORTALS_0211){
  const center=Math.min(portal+1.08,366.9);
  const rootX=ROOT(center,vaultHeightClassic);
  for(const side of [-1,1]){
   const at=(s,x,h)=>positionAt(s,side*x,h);
   const anchor=(s,x,raise=.03)=>at(s,x,
    floorY02631(x,s,vaultHeightClassic)+raise);
   // A warm, elongated arch-foot practical: 3.0m long along the vault,
   // attached to the SAME origin as the floor's luminous ridge.
   const s0=Math.max(.04,center-1.50),s1=Math.min(367.60,center+1.50);
   const footBottom0=anchor(s0,rootX),footBottom1=anchor(s1,rootX);
   const footTop0=at(s0,rootX,floorY02631(rootX,s0,vaultHeightClassic)+.32);
   const footTop1=at(s1,rootX,floorY02631(rootX,s1,vaultHeightClassic)+.32);
   pushRGBA(positions,colors,
    [footBottom0,footTop0,footTop1,footBottom1],
    [[1,.36,.09,.82],[1,.36,.09,.76],[1,.36,.09,.76],[1,.36,.09,.82]]);
   footSources++;
   // WIDE connected source-foot band, curved along original side floor.
   // Longitudinal extent ~14.4m, lateral 13.25..24.45m. Alpha peaks on
   // the root x (the foot's floor-contact position) and tapers smoothly.
   const meshP=(i,j)=>{
    const s=clamp(center-7.2+14.4*i/NS,.04,367.58);
    // End the floor ribbon AT the real wall-foot source, not before it.
    const x=13.25+(rootX-13.25)*j/NX;
    const along=gauss(s-center,4.35);
    const lateral=gauss(x-rootX,6.15);
    // Enough source width to look intentional, without brightening
    // the rail, ship, racing lane or full graphite shoulder.
    const sourceCore=Math.exp(-Math.pow((x-rootX)/2.25,2)-
     Math.pow((s-center)/3.25,2));
    const alpha=(.43*along*lateral+.20*sourceCore);
    return {q:anchor(s,x),color:[1,.34,.075,alpha]};
   };
   for(let i=0;i<NS;i++)for(let j=0;j<NX;j++){
    const v0=meshP(i,j),v1=meshP(i+1,j),
     v2=meshP(i+1,j+1),v3=meshP(i,j+1);
    pushRGBA(positions,colors,[v0.q,v1.q,v2.q,v3.q],
     [v0.color,v1.color,v2.color,v3.color]);
   }
   bands++;
  }
 }
 return {geometry:buildGeometry(THREE,positions,colors,4),
  bands,footSources,triangles:positions.length/9};
}
export function createLowRailSourcesData02632(geometry,positionAt){
 const coord=geometry?.getAttribute?.("aTrackCoord"),
  pos=geometry?.getAttribute?.("position");
 if(!coord||!pos||coord.count!==pos.count||typeof positionAt!=="function")
  throw Error("0.26.3.2 needs original indexed banked road");
 const n=coord.count;
 const arrays={edgeLeft02631:new Float32Array(n*3),
  edgeRight02631:new Float32Array(n*3),
  edgeFootMask02631:new Float32Array(n)};
 let inside=0,active=0;
 const cache=new Map();
 for(let i=0;i<n;i++){
  const s=coord.getX(i);
  if(s<0||s>LIMIT)continue;
  inside++;
  if(railBayWeight02632(s)>.02)active++;
  arrays.edgeFootMask02631[i]=nearestFoot02631(s).weight;
  for(const [name,side] of [["edgeLeft02631",-1],["edgeRight02631",1]]){
   const key=s.toFixed(4)+":"+side;
   let p=cache.get(key);
   if(!p){p=railLipPosition02632(s,side,-.91,positionAt);
    cache.set(key,p);}
   arrays[name].set([p.x,p.y,p.z],3*i);
  }
 }
 return {arrays,vertices:n,inside,active};
}
export function patchConnectedEdgeShader02632(vertex,fragment,{mobile=false}={}){
 // Keep the previous native GGX chain, physical fixture vectors, sun seal,
 // white wave and arrow masks, modifying ONLY local-source response.
 const r=patchEdgeRoadShader02631(vertex,fragment,{mobile});
 let s=r.fragmentShader;
 const pairs=[
  ["float e31Pitch=mod(vTrackCoord.x,24.0);",
   "float e31Pitch=mod(vTrackCoord.x,24.0);"],
  ["smoothstep(0.05,1.05,e31Pitch)",
   "smoothstep(4.50,5.15,e31Pitch)"],
  ["smoothstep(21.55,22.75,e31Pitch)",
   "smoothstep(10.35,11.0,e31Pitch)"],
  ["(e31L-7.60)/2.25","(e31L-8.0)/2.55"],
  ["(e31L-10.10)/1.85","(e31L-10.0)/1.9"],
  ["e31Edge*0.37","e31Edge*0.56"],
  ["e31R/6.8","e31R/5.4"],
  ["(e31L-10.75)/1.90","(e31L-10.60)/2.15"]
 ];
 for(const [a,b] of pairs){if(!s.includes(a))
  throw Error("0.26.3.2 missing solar-isolated local GGX anchor: "+a);
  s=s.replace(a,b);
 }
 return {...r,fragmentShader:s};
}
export function installLowEdgeShader02632(material,amount,opts={}){
 if(!material?.isMeshStandardMaterial||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.26.3.2 requires existing physical road material");
 const old=material.onBeforeCompile,oldKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  old.call(this,shader,renderer);
  const patched=patchConnectedEdgeShader02632(shader.vertexShader,
   shader.fragmentShader,opts);
  shader.vertexShader=patched.vertexShader;
  shader.fragmentShader=patched.fragmentShader;
  shader.uniforms.uEdgeFloor02631=amount;
 };
 material.customProgramCacheKey=function(){return oldKey.call(this)+
  "-connected-low-edge-02632-"+(opts.mobile?"4gb":"high");};
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=old;
  material.customProgramCacheKey=oldKey;material.needsUpdate=true;};
}
export function installRepositionedEdgeAndConnectedFoot02632(THREE,world,roadMesh,{
 positionAt,lowMemory=false,vaultHeightClassic=false,roadRebuild
}={}){
 const fallback=reason=>({stats:()=>({
  edgeSources02632Active:false,edgeSources02632Status:reason}),
  setComparison(){},dispose(){}});
 if(!THREE||!world?.add||!roadMesh?.material?.isMeshStandardMaterial||
  !roadMesh.geometry?.getAttribute?.("aTrackCoord")||
  !roadRebuild?.stats?.().roadRebuild0263Active||
  typeof positionAt!=="function")
  return fallback("original-solar-sealed-road-unavailable");
 let emitter=null,foot=null,restore=null;
 const geo=roadMesh.geometry,installed=[];
 try{
  const data=createLowRailSourcesData02632(geo,positionAt);
  const e=createLowerEdgeSources02632(THREE,positionAt,lowMemory);
  const f=createConnectedFootBands02632(THREE,positionAt,lowMemory,vaultHeightClassic);
  for(const [key,array,itemSize] of [
   ["edgeLeft02631",data.arrays.edgeLeft02631,3],
   ["edgeRight02631",data.arrays.edgeRight02631,3],
   ["edgeFootMask02631",data.arrays.edgeFootMask02631,1]]){
   geo.setAttribute(key,new THREE.Float32BufferAttribute(array,itemSize));
   installed.push(key);
  }
  const amount={value:1};
  restore=installLowEdgeShader02632(roadMesh.material,amount,{mobile:lowMemory});
  emitter=new THREE.Mesh(e.geometry,new THREE.MeshBasicMaterial({
   vertexColors:true,side:THREE.DoubleSide,toneMapped:false,depthWrite:true
  }));
  emitter.name="SKYSHIFT 0.26.3.2 / short broad ground-level cyan rail inlays";
  emitter.frustumCulled=true;emitter.renderOrder=2;world.add(emitter);
  foot=new THREE.Mesh(f.geometry,new THREE.MeshBasicMaterial({
   vertexColors:true,side:THREE.DoubleSide,toneMapped:false,
   transparent:true,blending:THREE.AdditiveBlending,
   depthWrite:false,opacity:.86,
   polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1
  }));
  foot.name="SKYSHIFT 0.26.3.2 / one-piece amber arch-foot and floor bands";
  foot.frustumCulled=true;foot.renderOrder=3;world.add(foot);
  const stats={
   edgeSources02632Active:true,edgeSources02632Status:"active",
   edgeSources02632Version:"0.26.3.2",
   edgeSources02632CyanSegments:e.segments,
   edgeSources02632CyanLitMeters:e.litMeters,
   edgeSources02632CyanWidth:.18,
   edgeSources02632ConnectedBands:f.bands,
   edgeSources02632FootSources:f.footSources,
   edgeSources02632OnOriginalRoad:true,
   edgeSources02632OnOriginalRail:true,
   edgeSources02632NativeGGX:true,
   edgeSources02632SolarSealed:true,
   edgeSources026324GB:!!lowMemory,
   edgeSources02632GGXSamples:lowMemory?1:2,
   edgeSources02632DrawBatches:2,
   edgeSources02632NewLights:0,
   edgeSources02632NewColliders:0,
   edgeSources02632RoadGeometryUnchanged:true,
   edgeSources02632GRIPUnchanged:true,
   edgeSources02632NativeWaveUnchanged:true,
   edgeSources02632NoArrowLighting:true,
   edgeSources02632Triangles:e.quads*2+f.triangles
  };
  const setComparison=v=>{
   amount.value=clamp(v,0,1);
   emitter.visible=amount.value>.0001;
   foot.visible=amount.value>.0001;
   foot.material.opacity=.86*amount.value;
  };
  return {setComparison,stats:()=>({...stats,
   edgeSources02632Strength:amount.value}),dispose(){
   emitter.removeFromParent();foot.removeFromParent();
   emitter.geometry.dispose();emitter.material.dispose();
   foot.geometry.dispose();foot.material.dispose();
   restore();for(const key of installed)geo.deleteAttribute(key);
  }};
 }catch(e){
  console.warn("SKYSHIFT 0.26.3.2 retaining previous road optics",e);
  emitter?.removeFromParent();foot?.removeFromParent();
  emitter?.geometry.dispose();emitter?.material.dispose();
  foot?.geometry.dispose();foot?.material.dispose();
  restore?.();for(const key of installed)geo.deleteAttribute(key);
  return fallback("new-lower-edge-or-connected-band-failed");
 }
}
