// SKYSHIFT 0.27.0 — NEON VAULT / Full Tunnel Circuit Foundation.
// Full 3400m closed circuit tunnel, using the REAL 0.21.1 vault cross-section
// and original banked positionAt; no duplicated road, rails or colliders.
// Geometrically independent of the old hard-coded 0..368m Skyline tunnel.
// This is the FIRST environment/streaming pass. The complex 0.26.x native
// GGX metal/fixture library remains exclusive to Skyline until later port.
// Metal is source-colored, dark, and solar-independent; lamps use HDR bloom.
// 170m bounded segments: short camera-distance draw, mobile detail tier.
import {TUNNEL_PROFILE_0211} from "./tunnel-megastructure-v0211.mjs";
import {FULL_TUNNEL_LAYOUT_0270} from "./full-tunnel-layout-v0270.mjs";

export const FULL_TUNNEL_0270=Object.freeze({
 version:"0.27.0",name:"Neon Vault / continuous closed tunnel",
 track:"vault",start:0,end:3400,meters:3400,
 chunkMeters:170,chunkCount:20,
 highStepMeters:2.5,mobileStepMeters:4.25,
 ribPitchMeters:42.5,roofCyanPitchMeters:27,roofCyanLengthMeters:11,
 sideAmberPitchMeters:42.5,sideAmberLengthMeters:2.2,
 profile:TUNNEL_PROFILE_0211.length,
 geometryType:"banked swept dark titanium vault with real structural ribs",
 sourceStyle:"roof cyan + wall amber without outdoor key/hemisphere",
 priorSkylineTunnelUnchanged:true,priorAuroraUnchanged:true,
 noNewColliders:true,noNewPhysics:true,noGRIPChange:true,
 noCameraChange:true,noPostprocessingPass:true,
 importedNative0261GGX:false, // follow-on lighting port, not misrepresented here
 chunksFrustumCulled:true,
 comparison:"?fullTunnel=classic"
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/Math.max(1e-7,b-a),0,1);return t*t*(3-2*t);};
const fall=(d,reach)=>Math.exp(-((d/reach)**2));
const periodicDistance=(s,pitch,center)=>{
 const a=((s-center+pitch*.5)%pitch+pitch)%pitch-pitch*.5;
 return Math.abs(a);
};
const baseProfile=TUNNEL_PROFILE_0211;
const isFloor=(j)=>j<=3||j>=baseProfile.length-4;
export function vaultCrossSection0270(i,s){
 if(i<0||i>=baseProfile.length||!Number.isFinite(s)||s<0||s>FULL_TUNNEL_0270.end)
  throw Error("0.27.0 cross-section outside authored tunnel");
 const [xx,yy]=baseProfile[i];
 const fold=smooth(0,1,yy>9?1:0);
 const roof=yy>9?9+(yy-9)*.82:yy;
 // Same proportional 0.21.1 compression and gentle 0.55m vault motion.
 const wave=.55*(.5-.5*Math.cos(2*Math.PI*s/620))*clamp((yy-4)/20,0,1);
 return [xx*(1+.015*clamp((yy-4)/20,0,1)*(.5-.5*Math.cos(2*Math.PI*s/620))),roof+wave];
}
function baseMetalColor(i,s){
 const [xx,yy]=vaultCrossSection0270(i,s);
 const ax=Math.abs(xx),floor=yy<1.8;
 const roof=yy>22.2;
 const seam=(Math.floor(s/16)%3===0)?0.79:1.0;
 const plate=.97+.03*Math.sin(Math.floor(s/12)*2.7+i*.72);
 let c=floor?[.020,.040,.052]:roof?[.030,.075,.099]:
  yy<11?[.035,.065,.080]:[.038,.074,.094];
 const grain=(i%4===0?.90:1)*seam*plate;
 const cyan=fall(periodicDistance(s,27,12),9.0)*
  clamp((yy-10)/13,0,1)*clamp((24-ax)/17,0,1);
 const amber=fall(periodicDistance(s,42.5,1.2),6.5)*
  clamp((ax-17)/8,0,1)*(floor?0.62:clamp((18-yy)/13,0,1));
 // Physical SOURCE neighborhood, not scene-wide/tunnel-long grade.
 return [Math.min(.58,c[0]*grain+cyan*.025+amber*.225),
  Math.min(.63,c[1]*grain+cyan*.19+amber*.074),
  Math.min(.79,c[2]*grain+cyan*.285+amber*.012)];
}
const createBatch=()=>({pos:[],color:[],triangles:0});
function vertex(batch,p,rgb){
 batch.pos.push(p.x,p.y,p.z);
 batch.color.push(rgb[0],rgb[1],rgb[2]);
}
function quad(batch,p1,p2,p3,p4,color){
 for(const p of [p1,p2,p3,p1,p3,p4])vertex(batch,p,color);
 batch.triangles+=2;
}
function coloredQuad(batch,pts,colors){
 for(const i of [0,1,2,0,2,3])vertex(batch,pts[i],colors[i]);
 batch.triangles+=2;
}
function surfacePoint(positionAt,s,j,inset=0){
 const [x,y]=vaultCrossSection0270(j,s);
 return positionAt(s,x-Math.sign(x)*inset,y-(y>12?inset*.52:0));
}
function makeShell(positionAt,a,b,step){
 const positions=[],colors=[],indices=[],n=baseProfile.length;
 const rows=Math.max(1,Math.ceil((b-a)/step));
 for(let i=0;i<=rows;i++){
  const s=a+(b-a)*i/rows;
  for(let j=0;j<n;j++){
   const p=surfacePoint(positionAt,s,j);
   positions.push(p.x,p.y,p.z);
   colors.push(...baseMetalColor(j,s));
  }
 }
 for(let i=0;i<rows;i++)for(let j=0;j<n-1;j++){
  const q=i*n+j,w=q+n;
  indices.push(q,q+1,w+1,q,w+1,w);
 }
 return {positions,colors,indices,triangles:indices.length/3,rings:rows+1};
}
function makeDetails(positionAt,a,b,lowMemory){
 const ribs=createBatch(),emission=createBatch();
 // Original 0.21.1 curved portal profile, but at a globally deterministic
 // pitch through ALL 3400m. Fully integrated, no rectangular arch overlay.
 for(let k=Math.ceil(a/42.5);k*42.5<b-2.5;k++){
  const s=k*42.5,end=Math.min(b,s+1.9);
  for(let j=3;j<baseProfile.length-4;j++){
   const p0=surfacePoint(positionAt,s,j,.30),
    p1=surfacePoint(positionAt,s,j+1,.30),
    p2=surfacePoint(positionAt,end,j+1,.30),
    p3=surfacePoint(positionAt,end,j,.30);
   quad(ribs,p0,p1,p2,p3,j%6===0?[.12,.19,.22]:[.061,.116,.153]);
   if(j>=7&&j<=baseProfile.length-9){
    const l=Math.min(b,s+.92),h=Math.min(b,s+1.18);
    const p4=surfacePoint(positionAt,l,j,.47),
     p5=surfacePoint(positionAt,l,j+1,.47),
     p6=surfacePoint(positionAt,h,j+1,.47),
     p7=surfacePoint(positionAt,h,j,.47);
    quad(emission,p4,p5,p6,p7,[.075,.48,.67]);
   }
  }
  // Short, physically connected amber wall elements on both shoulders.
  for(const side of [-1,1]){
   const c=Math.min(b,s+2.1),base=s+.13;
   if(c<=base)continue;
   const p=(ss,yy)=>positionAt(ss,side*26.13,yy);
   quad(emission,p(base,8.0),p(base,8.8),
    p(c,8.8),p(c,8.0),[.95,.38,.071]);
  }
 }
 // Two precision strips follow the C2-banked ROOF profile, not camera
 // billboard rays. Lights remain near their own 11m finite bays.
 for(let k=Math.floor(a/27)-1;k*27<b;k++){
  const start=Math.max(a,k*27+6),end=Math.min(b,k*27+17);
  if(end-start<.06)continue;
  for(const side of [-1,1]){
   const j=side<0?13:baseProfile.length-14;
   const p=(s,off)=>{
    const v=surfacePoint(positionAt,s,j,.17);
    // Parallel ribbon across the existing contoured roof.
    const x=side*(8.8+off);
    const [,y]=vaultCrossSection0270(j,s);
    return positionAt(s,x,y-.17);
   };
   quad(emission,p(start,-.14),p(start,.14),
    p(end,.14),p(end,-.14),[.095,.69,.92]);
  }
 }
 // Short lower cyan strips follow actual road geometry; no endless lines.
 // The original racing deck and original guardrails are NEVER modified.
 for(let k=Math.floor(a/24)-1;k*24<b;k++){
  const start=Math.max(a,k*24+4.5),end=Math.min(b,k*24+11);
  if(end-start<.06)continue;
  for(const side of [-1,1]){
   const p=(ss,dx)=>positionAt(ss,side*(11.82+dx),.23);
   quad(emission,p(start,-.08),p(start,.08),p(end,.08),p(end,-.08),
    [.055,.56,.80]);
  }
 }
 return {ribs,emission};
}
function geo(THREE,batch,indexed=false){
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(
  indexed?batch.positions:batch.pos,3));
 g.setAttribute("color",new THREE.Float32BufferAttribute(
  indexed?batch.colors:batch.color,3));
 if(indexed)g.setIndex(batch.indices);
 g.computeVertexNormals();g.computeBoundingSphere();
 return g;
}
function destroy(g){
 g?.traverse?.(o=>{
  o.geometry?.dispose?.();
  const materials=Array.isArray(o.material)?o.material:[o.material];
  for(const m of materials)if(m?.userData?.vault0270Owned)m.dispose();
 });
}
export function installFullTunnelCircuit0270(THREE,world,{
 track="skyline",positionAt,lowMemory=false,enabled=true
}={}){
 const status={version:"0.27.0",track,active:false,requested:enabled,
  status:"inactive",start:0,end:3400,coverageMeters:0,
  chunks:0,materials:0,drawBatches:0,triangles:0,
  segmentMeters:170,roofClosed:false,sourceLit:false,
  originalRoadUntouched:true,collidersAdded:0,GRIPUnchanged:true,
  physicsUnchanged:true,skylineOriginalIntact:true,auroraOriginalIntact:true,
  quality:lowMemory?"4GB":"High",source:"tunnel-profile-v0211"};
 if(!enabled||track!=="vault")return {active:false,
  ready:Promise.resolve(),stats:()=>({...status}),dispose(){}};
 if(!THREE?.Group||!world?.add||typeof positionAt!=="function")
  throw Error("0.27.0 requires original Three/world/track positioning");
 const root=new THREE.Group();
 root.name="SKYSHIFT · Neon Vault Full Tunnel 0.27.0";
 const shellMat=new THREE.MeshBasicMaterial({vertexColors:true,
  side:THREE.DoubleSide,toneMapped:true});
 const ribsMat=new THREE.MeshBasicMaterial({vertexColors:true,
  side:THREE.DoubleSide,toneMapped:true});
 const glowMat=new THREE.MeshBasicMaterial({vertexColors:true,
  side:THREE.DoubleSide,toneMapped:false});
 for(const m of [shellMat,ribsMat,glowMat])m.userData.vault0270Owned=true;
 try{
  for(let start=0;start<FULL_TUNNEL_0270.end-.0001;start+=FULL_TUNNEL_0270.chunkMeters){
   const end=Math.min(start+FULL_TUNNEL_0270.chunkMeters,FULL_TUNNEL_0270.end);
   const chunk=new THREE.Group();chunk.name="Vault · "+start+"–"+end+"m";
   const surface=makeShell(positionAt,start,end,
    lowMemory?FULL_TUNNEL_0270.mobileStepMeters:FULL_TUNNEL_0270.highStepMeters);
   const details=makeDetails(positionAt,start,end,lowMemory);
   for(const [name,data,material,indexed] of [
    ["DARK METAL ENCLOSURE",surface,shellMat,true],
    ["FACETED STRUCTURAL ARCHES",details.ribs,ribsMat,false],
    ["CYAN ROOF + AMBER WALL + LOWER RAIL SOURCES",details.emission,glowMat,false]
   ]){
    if(!indexed&&!data.pos.length)continue;
    const mesh=new THREE.Mesh(geo(THREE,data,indexed),material);
    mesh.name=name;mesh.frustumCulled=true;
    mesh.castShadow=false;mesh.receiveShadow=false;
    chunk.add(mesh);
    status.drawBatches++;
    status.triangles+=data.triangles;
   }
   root.add(chunk);status.chunks++;
  }
  world.add(root);
  status.active=true;status.status="active";
  status.coverageMeters=FULL_TUNNEL_0270.meters;
  status.materials=3;status.roofClosed=true;status.sourceLit=true;
  status.structuralProfileVertices=baseProfile.length;
  status.solarIndependentMaterials=true;
 }catch(e){
  status.status="fallback";status.error=String(e?.message||e);
  destroy(root);
  console.warn("SKYSHIFT 0.27.0 kept original scene after tunnel failure",status.error);
 }
 return {active:status.active,ready:Promise.resolve(),
  stats:()=>({...status}),dispose(){root.removeFromParent();destroy(root);
   for(const m of [shellMat,ribsMat,glowMat])m.dispose();}
 };
}
