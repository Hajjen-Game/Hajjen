// SKYSHIFT 0.28.7 — Arch Foot Light Assembly & Corner Signature.
//
// The original 0.26.3.2 source mesh had only a 0.32m orange vertical
// practical and a broad 14.4m cloudy floor smear. This Vault-only component
// replaces that mesh's geometry (not a duplicate overlay) with a contiguous,
// physically seated L-shaped recessed source + softer floor bounce. One
// lightweight structural mounting batch replaces the exposed dark wedge.
// Each of the ten shared Skyline source modules uses the SAME authored art.
//
// All parts follow the ORIGINAL tunnel 0.21.1 floor/profile and banked
// positionAt adaptor; no floor/collision/rail/gameplay geometry is mutated.
import {TUNNEL_PORTALS_0211,tunnelProfilePoint0211}
 from "./tunnel-megastructure-v0211.mjs";
import {floorY02631}
 from "./edge-lighting-floor-pools-v02631.mjs";

export const ARCH_FOOT_0287=Object.freeze({
 version:"0.28.7",name:"Arch Foot Light Assembly & Corner Signature",
 source:"original Skyline physical vault profile and 0.28.1 joined foot",
 design:"recessed continuous L, vertical amber + inward floor blade",
 oldGeometryReplaced:true,duplicateFootMeshes:0,
 mounting:"single original-source graphite mounting batch per 340m module",
 verticalMeters:1.80,horizontalMeters:3.30,
 longitudinalEmitterWidth:.38,floorCoreWidth:.36,
 warmCore:[1,.59,.22],warmHalo:[1,.31,.055],
 noArtificialWorldLights:true,addedDynamicLights:0,
 addedTextures:0,addedColliders:0,addedPostprocessPasses:0,
 roadUntouched:true,gripUntouched:true,boostUntouched:true,
 waveUntouched:true,shipUntouched:true,pmremUntouched:true,
 historicSkylineUntouched:true,historicVaultUntouched:true,
 comparison:"?track=vault&v=0.28.7&archFoot=classic"
});
const EPS=.00001,MAX=367.59;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const gauss=(d,r)=>Math.exp(-Math.pow(d/r,2));
const sq=(v)=>v*v;
const SRC="SKYSHIFT 0.28.1 / original joined amber arch feet";
const MODEL="SKYSHIFT · Tunnel Megastructure 0.21.1";
function appendQuad(p,c,a,b,d,e,color,alpha){
 // Winding is irrelevant: both source/banding materials are DoubleSide.
 for(const point of [a,b,d,a,d,e]){
  if(![point.x,point.y,point.z].every(Number.isFinite))
   throw Error("0.28.7 nonfinite banked profile point");
  p.push(point.x,point.y,point.z);
  if(c)c.push(color[0],color[1],color[2],alpha);
 }
}
function geometry(THREE,positions,colors){
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
 if(colors)g.setAttribute("color",new THREE.Float32BufferAttribute(colors,4));
 g.computeBoundingSphere();
 if(!colors)g.computeVertexNormals();
 return g;
}
export function archFootRelease0287(search=
 typeof location!=="undefined"?location.search:""){
 const params=new URLSearchParams(search||"");
 if(params.get("track")!=="vault"||
  ["classic","off"].includes(params.get("archFoot")))return false;
 const version=/^(\d+)\.(\d+)\.(\d+)$/.exec(params.get("v")||"");
 if(!version)return false;
 const [a,b,c]=version.slice(1).map(Number);
 return a>0||b>28||(b===28&&c>=7);
}
export function buildArchFootAssembly0287(THREE,positionAt,{
 lowMemory=false,vaultHeightClassic=false
}={}){
 if(!THREE?.BufferGeometry||!THREE?.Float32BufferAttribute||
  typeof positionAt!=="function")throw Error("0.28.7 needs live source geometry and sampler");
 const lumP=[],lumC=[],mountP=[];
 let fixtures=0,verticals=0,horizontals=0,glowCells=0;
 const p=(s,side,x,h)=>positionAt(clamp(s,.035,MAX),side*x,h);
 const floor=(s,side,x,up=.05)=>p(s,side,x,
  floorY02631(x,clamp(s,.035,MAX),vaultHeightClassic)+up);
 const appendLight=(a,b,d,e,col,alpha)=>{
  appendQuad(lumP,lumC,a,b,d,e,col,alpha);
 };
 const appendMount=(a,b,d,e)=>
  appendQuad(mountP,null,a,b,d,e,[0,0,0],1);
 const nLong=lowMemory?5:9,nAcross=lowMemory?4:7;
 for(const portal of TUNNEL_PORTALS_0211){
  // Exactly the original portal phase: the source geometry and real
  // arch rib coincide, including modules near start/end boundaries.
  const s=clamp(portal+1.08,.65,366.9);
  const wallX=Math.abs(tunnelProfilePoint0211(4,s,vaultHeightClassic)[0]);
  const rootX=wallX-.20;
  const tip=tunnelProfilePoint0211(5,s,vaultHeightClassic);
  const topX=clamp(Math.abs(tip[0])-.36,rootX+.55,26.0);
  const rise=clamp(tip[1]-
   floorY02631(rootX,s,vaultHeightClassic)-.18,1.45,2.00);
  const plateOuter=rootX+.05,plateInner=rootX-3.40;
  for(const side of [-1,1]){
   fixtures++;
   // Recessed graphite foot / kickplate, not an unlit 3D wedge.
   // One dark metal batch contains both its floor and bent upright.
   const l0=s-1.52,l1=s+1.52;
   const a=floor(l0,side,plateInner,.024),
    b=floor(l0,side,plateOuter,.034),
    d=floor(l1,side,plateOuter,.034),
    e=floor(l1,side,plateInner,.024);
   appendMount(a,b,d,e);
   const corner=(ss,t,raise=0)=>
    p(ss,side,rootX+(topX-rootX)*t,
     floorY02631(rootX,clamp(ss,.035,MAX),vaultHeightClassic)+
     .065+rise*t+raise);
   appendMount(
    corner(l0,0,-.05),corner(l0,1,-.055),
    corner(l1,1,-.055),corner(l1,0,-.05));
   // Build the bright vertical as a narrow, flush inset on the same
   // physical arch-foot plane, and extend exactly to the floor blade.
   const span=.20;
   const verticalSteps=lowMemory?5:9;
   for(let k=0;k<verticalSteps;k++){
    const t0=k/verticalSteps,t1=(k+1)/verticalSteps;
    const alpha=.99-(t0+t1)*.035;
    appendLight(
     corner(s-span, t0,.024),corner(s-span,t1,.024),
     corner(s+span,t1,.024),corner(s+span,t0,.024),
     ARCH_FOOT_0287.warmCore,alpha);
    verticals++;
   }
   // The illuminated horizontal blade points INWARD into the original
   // floor, 3.30m long. Its outer end touches the vertical at rootX.
   for(let k=0;k<8;k++){
    const t0=k/8,t1=(k+1)/8,
     x0=rootX-(rootX-plateInner)*t0,
     x1=rootX-(rootX-plateInner)*t1;
    appendLight(
     floor(s-.18,side,x0,.075),
     floor(s-.18,side,x1,.075),
     floor(s+.18,side,x1,.075),
     floor(s+.18,side,x0,.075),
     ARCH_FOOT_0287.warmCore,.98);
    horizontals++;
   }
   // Narrow longitudinal glow along the L: a slightly wider soft
   // band is contiguous with both bright cores, not a separate blob.
   for(const spread of [0,1]){
    const k=spread===0?.46:.78;
    appendLight(
     corner(s-k,0,.009),corner(s-k,1,.009),
     corner(s+k,1,.009),corner(s+k,0,.009),
     ARCH_FOOT_0287.warmHalo,spread===0?.11:.045);
    appendLight(
     floor(s-k,side,rootX,.026),
     floor(s-k,side,plateInner,.026),
     floor(s+k,side,plateInner,.026),
     floor(s+k,side,rootX,.026),
     ARCH_FOOT_0287.warmHalo,spread===0?.14:.048);
   }
   // Soft amber response on the existing shoulder only, in the same
   // emitter mesh. Attenuated separably in source-S and distance from
   // the actual bar. No fake road wash or sharp triangular spotlight.
   for(let i=0;i<nLong;i++)for(let j=0;j<nAcross;j++){
    const at=(ii,jj)=>{
     const u=ii/nLong,v=jj/nAcross;
     const along=s+(u-.5)*9.0,
      x=plateInner-1.35+v*(rootX-plateInner+1.35);
     const longitudinal=gauss(along-s,2.15);
     const transverse=gauss(x-(rootX-1.45),1.45);
     return {q:floor(along,side,x,.014),
      color:[1,.34,.075,.15*longitudinal*transverse]};
    };
    const c0=at(i,j),c1=at(i+1,j),
     c2=at(i+1,j+1),c3=at(i,j+1);
    for(const [p0,p1,p2,p3] of [[c0,c1,c2,c3]]){
     for(const [index] of [[0]])appendQuad(lumP,lumC,
      p0.q,p1.q,p2.q,p3.q,[1,.34,.075],1);
     // Per-vertex alpha, unlike a uniform bright triangular pool.
     const base=lumC.length-24;
     for(let n=0;n<6;n++)
      lumC[base+n*4+3]=[p0,p1,p2,p0,p2,p3][n].color[3];
    }
    glowCells++;
   }
  }
 }
 return {emitterGeometry:geometry(THREE,lumP,lumC),
  mountGeometry:geometry(THREE,mountP,null),
  fixtures,verticals,horizontals,glowCells,
  emitterTriangles:lumP.length/9,mountTriangles:mountP.length/9,
  originalPortals:TUNNEL_PORTALS_0211.length,
  lowMemory:!!lowMemory};
}
const disabled=(reason)=>({
 active:false,reason,setComparison(){},
 stats(){return {active:false,version:"0.28.7",reason}},
 dispose(){}
});
export function installArchFootAssembly0287(THREE,section,sourcePositionAt,{
 enabled=false,lowMemory=false
}={}){
 if(!enabled)return disabled("classic/older release");
 const foot=section?.children?.find(x=>x.name===SRC);
 if(!foot?.material?.isMeshBasicMaterial||!foot.geometry||
  !section?.getObjectByName?.(MODEL))
  throw Error("0.28.7 original 0.28.1 joined foot and shell missing");
 const generated=buildArchFootAssembly0287(THREE,sourcePositionAt,{lowMemory});
 if(generated.fixtures!==TUNNEL_PORTALS_0211.length*2)
  throw Error("0.28.7 original arch portals not preserved");
 const originalGeometry=foot.geometry;
 let mount;
 try{
  mount=new THREE.Mesh(generated.mountGeometry,new THREE.MeshStandardMaterial({
   color:0x23333b,metalness:.62,roughness:.49,
   emissive:0x100902,emissiveIntensity:.12,
   side:THREE.DoubleSide,
   polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2
  }));
  mount.name="SKYSHIFT 0.28.7 / original arch foot graphite L mount";
  mount.frustumCulled=true;
  mount.renderOrder=2;
  section.add(mount);
  foot.geometry=generated.emitterGeometry;
  foot.renderOrder=3;
 }catch(error){
  mount?.removeFromParent();mount?.material?.dispose();
  generated.mountGeometry.dispose();generated.emitterGeometry.dispose();
  throw error;
 }
 let strength=1,disposed=false;
 return {active:true,
  setComparison(value){
   // QA-only same-frame A/B: replace the existing source geometry in
   // place while the renderer is idle. Unlike hiding it, this compares
   // the EXACT old 0.28.6 floor band against the new 0.28.7 joined L.
   strength=clamp(value,0,1);
   foot.geometry=strength>=.5?generated.emitterGeometry:originalGeometry;
   foot.visible=true;
   mount.visible=strength>=.5;
  },
  stats(){return {active:true,version:"0.28.7",strength,
   fixtures:generated.fixtures,
   verticalLightQuads:generated.verticals,
   horizontalLightQuads:generated.horizontals,
   floorGlowCells:generated.glowCells,
   mountTriangles:generated.mountTriangles,
   emitterTriangles:generated.emitterTriangles,
   joinedSourceMeshReplaced:true,duplicateFootMeshes:0,
   darkBaseStructuralBatches:1,addedLightSources:0,
   addedPhysicsColliders:0,sourceProfileReused:true,
   sourceModulesShareDesign:true,lowMemory:!!lowMemory,
   oldGeometryPreservedForDispose:true}},
  dispose(){
   if(disposed)return;disposed=true;
   foot.visible=true;
   foot.geometry=originalGeometry;
   mount.removeFromParent();mount.geometry.dispose();
   mount.material.dispose();
   generated.emitterGeometry.dispose();
  }};
}
