// SKYSHIFT 0.21.1 — Tunnel Megastructure Rebuild.
// Replace (not overlay) the old block/station asset with one *closed* tunnel.
// Swept real 3D profile follows the unchanged Skyline road frame / bank.
// Solid side-floor shoulders bridge from outside the existing guardrails to
// the tunnel's lower curved wall: there is no exterior-space floor gap.
// No extra colliders, no steering/GRIP/camera/road or light-rig changes.

import {SHARED_TUNNEL_STYLE_0280} from "./shared-tunnel-architecture-v0280.mjs";

export const TUNNEL_MEGA_0211=Object.freeze({
 version:"0.21.1.1",id:"continuous-megatunnel-0211",track:"skyline",
 start:0,end:368,meters:368,sweepStepMeters:2,
 protectedRoadHalfWidth:11.6,shoulderStart:12.25,
 wallOutsideX:26.5,roofHeight:29.623,previousRoofHeight:34.15,
 vaultScale:.82,vaultCompressionStart:9,vaultWaveAmplitude:.55,closedRoof:true,
 solidSideShoulders:true,continuousCrossSection:true,
 roadGeometryChanged:false,colliderCount:0,physicsChanges:0,
 cameraChanges:0,gripChanges:0,newDynamicLights:0,newRenderPasses:0,
 comparison:"?vaultHeight=classic",oldCorridorComparison:"?tunnelMega=classic",
 qualityDrawBatches:4,mobileDrawBatches:3
});
// One profile travels from the left roadway shoulder up the left wall,
// around the vault, and down to the right roadway shoulder. Neither walls
// nor ceiling are separate primitives: all adjacent sections share vertices.
// The unfilled middle is deliberately occupied by the ORIGINAL racing deck.
const LEFT_HALF=Object.freeze([
 [-12.25,.075],[-14.15,.105],[-18.15,.26],[-21.8,.62],
 [-24.65,1.42],[-25.8,3.35],[-26.5,6.4],[-26.3,10.0],
 [-25.15,14.25],[-23.45,18.55],[-20.95,22.55],
 [-17.55,26.35],[-13.55,29.50],[-8.85,32.00],
 [-4.45,33.45],[0,34.15]
]);
export const TUNNEL_PROFILE_0211=Object.freeze([
 ...LEFT_HALF.map(([x,y])=>Object.freeze([x,y])),
 ...LEFT_HALF.slice(0,-1).reverse().map(([x,y])=>Object.freeze([-x,y]))
]);
export const TUNNEL_PORTALS_0211=Object.freeze([0,42,80,118,156,198,240,282,324,363]);
// The existing road remains 23.2m wide on this interval. Floor starts 0.65m
// beyond its edge, just OUTSIDE the original physically separate rail.
// Above 25.6m the vault can safely pass over the vehicle's space.
const COLORS=Object.freeze({
 shoulder:0x0e1d2c,deckEdge:0x1d3a50,
 outerFloor:0x13273b,lower:0x29435e,
 middle:0x203e58,upper:0x365775,roof:0x25435e,
 roofLit:0x416584,pier:0x1b3850,pierEdge:0x426e85,
 groove:0x2b5870,cyan:0x43cbea,cyanCore:0xc9f9ff,
 pink:0xff419b,pinkCore:0xffd9ed,
 faintBlue:0x206481,faintPink:0x7d2257
});
const linear=(value)=>{const x=value/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4};
const rgb=(hex)=>[linear((hex>>>16)&255),linear((hex>>>8)&255),linear(hex&255)];
const mix=(a,b,t)=>a+(b-a)*t;
// 0.28.0 shared canonical cross-section. A track supplies only its ARC
// start/period. Both original Skyline (368m phase) and the 3400m Vault
// (620m phase) use this SAME source equation and vertex profile.
export function sampleSharedTunnelProfile0280(i,s,{
 start=0,period=TUNNEL_MEGA_0211.meters,classic=false
}={}){
 if(!Number.isInteger(i)||i<0||i>=TUNNEL_PROFILE_0211.length||
    !Number.isFinite(s)||!Number.isFinite(start)||!Number.isFinite(period)||
    period<=0)throw Error("0.28.0 invalid shared cross-section");
 const [x0,y0]=TUNNEL_PROFILE_0211[i];
 const p=SHARED_TUNNEL_STYLE_0280.geometry;
 const u=(s-start)/period;
 const bend=.5-.5*Math.cos(2*Math.PI*u);
 const strength=Math.max(0,Math.min(1,(y0-4)/20));
 const y=classic
   ? y0+1.0*bend*strength
   : (y0<=p.compressionStartY?y0:
      p.compressionStartY+(y0-p.compressionStartY)*p.vaultScale)
      +p.vaultWaveMeters*bend*strength;
 return [x0*(1+p.vaultWidthWave*bend*strength),y];
}
function profilePoint(i,s,vaultHeightClassic=false){
 return sampleSharedTunnelProfile0280(i,s,{
  start:TUNNEL_MEGA_0211.start,period:TUNNEL_MEGA_0211.meters,
  classic:vaultHeightClassic
 });
}
// Public geometry sampler for additive art modules. Uses the ORIGINAL
// vaulted profile / bank without duplicating the curvature calculation.
export function tunnelProfilePoint0211(index,s,vaultHeightClassic=false){
 if(!Number.isInteger(index)||index<0||index>=TUNNEL_PROFILE_0211.length)
  throw Error("Tunnel profile index out of range");
 if(!Number.isFinite(s)||s<TUNNEL_MEGA_0211.start||s>TUNNEL_MEGA_0211.end)
  throw Error("Tunnel profile arc out of range");
 return profilePoint(index,s,vaultHeightClassic);
}
function safePosition(positionAt,s,x,y,isFloor){
 if(!Number.isFinite(s+x+y)||s<TUNNEL_MEGA_0211.start-1e-6||s>TUNNEL_MEGA_0211.end+1e-6)
  throw Error("Tunnel invalid local coordinate");
 if(isFloor){
  if(Math.abs(x)<12.2||y<-.015||y>1.6)
   throw Error("Tunnel side shoulder intrudes racing deck");
 }else if(Math.abs(x)<12.2&&y<26)
  throw Error("Tunnel vault enters flight envelope");
 const p=positionAt(s,x,y);
 if(!Number.isFinite(p.x+p.y+p.z))
  throw Error("Tunnel road curvature produced invalid point");
 return [p.x,p.y,p.z];
}
function makeSurface(positionAt,vaultHeightClassic){
 const p=[],colors=[],indices=[],trackS=[];
 const points=TUNNEL_PROFILE_0211.length;
 const rings=1+Math.round(TUNNEL_MEGA_0211.meters/TUNNEL_MEGA_0211.sweepStepMeters);
 for(let row=0;row<rings;row++){
  const s=TUNNEL_MEGA_0211.start+row*TUNNEL_MEGA_0211.sweepStepMeters;
  const sectionWave=.5+.5*Math.sin(s*.035);
  for(let j=0;j<points;j++){
   const [x,y]=profilePoint(j,s,vaultHeightClassic);
   const floor=(j<5||j>points-6);
   p.push(...safePosition(positionAt,s,x,y,floor));
   trackS.push(s);
   let swatch;
   if(y<.13)swatch=COLORS.deckEdge;
   else if(y<1.6)swatch=COLORS.outerFloor;
   else if(y<10)swatch=COLORS.lower;
   else if(y<23)swatch=COLORS.middle;
   else if(y<30)swatch=sectionWave>.63?COLORS.upper:COLORS.lower;
   else swatch=sectionWave>.58?COLORS.roofLit:COLORS.roof;
   colors.push(...rgb(swatch));
  }
 }
 for(let i=0;i<rings-1;i++)for(let j=0;j<points-1;j++){
  const a=i*points+j,b=a+1,c=a+points,d=c+1;
  indices.push(a,b,d,a,d,c);
 }
 return {p,c:colors,indices,trackS,sampledRings:rings};
}
// Only a handful of **curved** structural ribs. They trace the tunnel vault
// rather than resembling the old rectangular corridor pillars.
function makeDetails(positionAt,lowMemory,vaultHeightClassic){
 const mk=()=>({p:[],c:[],trackS:[]});
 const rib=mk(),energy=mk(),halo=mk();
 const tri=(target,verts,swatch)=>{
  for(const v of verts){
   const [s,x,y]=v;
   target.p.push(...safePosition(positionAt,s,x,y,false));
   target.trackS.push(s);
   target.c.push(...rgb(swatch));
  }
 };
 const quad=(target,a,b,c,d,col)=>{
  tri(target,[a,b,c],col);tri(target,[a,c,d],col);
 };
 const lerpP=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t)];
 const inset=([x,y],d)=>[
  x-Math.sign(x)*d*(Math.abs(x)>10?1:.45),
  y-(y>12?d*.7:0)
 ];
 const worldP=(s,p)=>[s,p[0],p[1]];
 for(const s of TUNNEL_PORTALS_0211){
  const end=Math.min(s+2.1,TUNNEL_MEGA_0211.end);
  // The curved 3D rib is rooted in the outside shoulder x>18m; it may
  // cross the road only as a HIGH ceiling (>=26m), never as a solid obstacle.
  for(let j=2;j<TUNNEL_PROFILE_0211.length-3;j++){
   const a=inset(profilePoint(j,s,vaultHeightClassic),.38);
   const b=inset(profilePoint(j+1,s,vaultHeightClassic),.38);
   const c=inset(profilePoint(j+1,end,vaultHeightClassic),.38);
   const d=inset(profilePoint(j,end,vaultHeightClassic),.38);
   quad(rib,worldP(s,a),worldP(s,b),worldP(end,c),worldP(end,d),
    j%6===0?COLORS.pierEdge:COLORS.pier);
   // An integrated luminous trace follows the CROSS SECTION of the arch.
   // One slim 0.3m longitudinal band, NOT a rectangular sidewall sticker.
   if(j>=6&&j<=TUNNEL_PROFILE_0211.length-7){
    const e=inset(profilePoint(j,s+.46,vaultHeightClassic),.57);
    const f=inset(profilePoint(j+1,s+.46,vaultHeightClassic),.57);
    const g=inset(profilePoint(j+1,s+.76,vaultHeightClassic),.57);
    const h=inset(profilePoint(j,s+.76,vaultHeightClassic),.57);
    quad(energy,worldP(s+.46,e),worldP(s+.46,f),
     worldP(s+.76,g),worldP(s+.76,h),
     (s===80||s===240)?COLORS.pink:COLORS.cyan);
    if(!lowMemory){
     const e2=inset(profilePoint(j,s+.31,vaultHeightClassic),.62);
     const f2=inset(profilePoint(j+1,s+.31,vaultHeightClassic),.62);
     const g2=inset(profilePoint(j+1,s+.91,vaultHeightClassic),.62);
     const h2=inset(profilePoint(j,s+.91,vaultHeightClassic),.62);
     quad(halo,worldP(s+.31,e2),worldP(s+.31,f2),
      worldP(s+.91,g2),worldP(s+.91,h2),
      (s===80||s===240)?COLORS.faintPink:COLORS.faintBlue);
    }
   }
  }
 }
 // Flow guides integrated into *curved* surfaces along the course,
 // i.e. not free-floating lines or square sections.
 for(let s=TUNNEL_MEGA_0211.start;s<TUNNEL_MEGA_0211.end;s+=2){
  for(const side of [-1,1]){
   const j=side<0?9:TUNNEL_PROFILE_0211.length-10;
   const next=side<0?10:TUNNEL_PROFILE_0211.length-11;
   const interp=(where,k,t)=>{
    const a=profilePoint(where,k,vaultHeightClassic),b=profilePoint(next,k,vaultHeightClassic);
    const v=lerpP(a,b,t);
    return inset(v,.24);
   };
   const a=interp(j,s,.36),b=interp(j,s,.44);
   const c=interp(j,s+2,.44),d=interp(j,s+2,.36);
   quad(energy,worldP(s,a),worldP(s,b),worldP(s+2,c),worldP(s+2,d),
    COLORS.pink);
  }
 }
 return {rib,energy,halo};
}
const disposeGroup=(g)=>{
 g?.traverse?.(obj=>{obj.geometry?.dispose();if(obj.material){
  const m=Array.isArray(obj.material)?obj.material:[obj.material];
  m.forEach(mat=>mat.dispose());
 }});
};
export function installTunnelMegastructure(THREE,world,{
 track="skyline",positionAt,lowMemory=false,vaultHeightClassic=false
}={}){
 if(!THREE||!world||typeof positionAt!=="function")
  throw Error("SKYSHIFT 0.21.1 requires original positionAt / world / Three");
 const active=track===TUNNEL_MEGA_0211.track;
 const state={
  version:"0.21.1.1",variant:"continuous-vault-tunnel",active:false,
  status:active?"loading":"inactive",track,lowMemory,vaultHeightClassic,
  roofHeight:vaultHeightClassic?TUNNEL_MEGA_0211.previousRoofHeight:TUNNEL_MEGA_0211.roofHeight,
  previousRoofHeight:TUNNEL_MEGA_0211.previousRoofHeight,
  vaultHeightReductionMeters:vaultHeightClassic?0:4.527,
  start:TUNNEL_MEGA_0211.start,end:TUNNEL_MEGA_0211.end,
  meters:TUNNEL_MEGA_0211.meters,
  solidSideShoulders:true,continuousCrossSection:true,roofEnclosed:true,
  draws:0,drawBatches:0,trianglesRendered:0,
  sideFloorReachesOuterRails:true,
  collisionsAdded:0,colliders:0,physicsChanges:0,
  addedDynamicLights:0,addedRenderPasses:0,
  roadMeshUntouched:true,originalGRIPUntouched:true,
  comparison:TUNNEL_MEGA_0211.comparison,
  sampledRings:0,profilePoints:TUNNEL_PROFILE_0211.length,
  portalCount:TUNNEL_PORTALS_0211.length,
  geometryResources:0,materialResources:0
 };
 if(!active)return {ready:Promise.resolve(),stats:()=>({...state}),dispose(){}};
 const group=new THREE.Group();group.name="SKYSHIFT · Tunnel Megastructure 0.21.1";
 try{
  const surface=makeSurface(positionAt,vaultHeightClassic),
        details=makeDetails(positionAt,lowMemory,vaultHeightClassic);
  function install(kind,data,material,indexed=false){
   const geo=new THREE.BufferGeometry();
   geo.setAttribute("position",new THREE.Float32BufferAttribute(data.p,3));
   geo.setAttribute("color",new THREE.Float32BufferAttribute(data.c,3));
   geo.setAttribute("trackS",new THREE.Float32BufferAttribute(data.trackS,1));
   if(indexed)geo.setIndex(data.indices);
   geo.computeVertexNormals();geo.computeBoundingSphere();
   const mesh=new THREE.Mesh(geo,material);
   mesh.name="Tunnel / "+kind;
   mesh.castShadow=false;mesh.receiveShadow=false;
   mesh.frustumCulled=true;
   if(kind==="HALO")mesh.renderOrder=3;
   group.add(mesh);state.drawBatches++;
   state.trianglesRendered+=indexed?data.indices.length/3:data.p.length/9;
  }
  install("CLOSED_SHELL",surface,new THREE.MeshStandardMaterial({
   color:0xffffff,vertexColors:true,side:THREE.DoubleSide,
   metalness:.28,roughness:.63,emissive:0x25435d,emissiveIntensity:.33
  }),true);
  install("CURVED_RIBS",details.rib,new THREE.MeshStandardMaterial({
   color:0xffffff,vertexColors:true,side:THREE.DoubleSide,
   metalness:.41,roughness:.50,flatShading:true,
   emissive:0x0e2136,emissiveIntensity:.20
  }));
  install("INTEGRATED_LIGHT",details.energy,new THREE.MeshBasicMaterial({
   color:0xffffff,vertexColors:true,side:THREE.DoubleSide,toneMapped:false
  }));
  if(!lowMemory)install("HALO",details.halo,new THREE.MeshBasicMaterial({
   color:0xffffff,vertexColors:true,side:THREE.DoubleSide,
   toneMapped:false,transparent:true,opacity:.15,
   depthWrite:false,blending:THREE.AdditiveBlending
  }));
  world.add(group);
  state.active=true;state.status="active";
  state.sampledRings=surface.sampledRings;
  state.geometryResources=state.drawBatches;
  state.materialResources=state.drawBatches;
 }catch(e){
  state.status="fallback";state.error=String(e?.message||e);
  disposeGroup(group);
  console.warn("SKYSHIFT 0.21.1 tunnel art fallback",state.error);
 }
 return {ready:Promise.resolve(),stats:()=>({...state}),
  dispose(){group.removeFromParent();disposeGroup(group)}};
}
