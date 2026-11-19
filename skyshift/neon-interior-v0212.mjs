// SKYSHIFT 0.21.2 — Neon-Driven Interior Lighting
// The continuous 0.21.1.1 tunnel stays geometrically IDENTICAL. Replace its
// exterior-lit surfaces with a dark, authored interior lighting field.
// A small number of cyan/pink structural neon arcs + longitudinal strips
// are the ONLY simulated light sources on the tunnel's interior.
// No global light, bloom, fog, ship, GRIP, road material or camera mutation.
// This is baked local light response, not expensive shadow-casting point lights.

import {installTunnelMegastructure,TUNNEL_PROFILE_0211,
 TUNNEL_PORTALS_0211,TUNNEL_MEGA_0211} from "./tunnel-megastructure-v0211.mjs";

export const NEON_INTERIOR_0212=Object.freeze({
 version:"0.21.2",id:"neon-driven-interior-0212",
 start:0,end:368,profiles:TUNNEL_PROFILE_0211.length,
 lightingModel:"authored-per-vertex-local-neon-bounce",
 sourceOnly:["curved cyan portal ribs","magenta portal ribs","pink wall guides"],
 exteriorKeyInfluence:0,exteriorHemisphereInfluence:0,
 globalLightsChanged:0,globalFogChanged:0,globalExposureChanged:0,
 shaderPassesAdded:0,dynamicLightsAdded:0,
 roadMaterialChanged:false,physicsChanged:false,gripChanged:false,
 originalShellShapePreserved:true,
 qualityExtraDrawBatches:1,mobileExtraDrawBatches:0,
 comparison:"?interiorLight=classic"
});
const PI2=Math.PI*2;
const gauss=(x,sigma)=>Math.exp(-.5*(x/sigma)**2);
const lin=c=>{let v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};
const swatch=n=>[lin(n>>16&255),lin(n>>8&255),lin(n&255)];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const PORTAL_LIGHTS=TUNNEL_PORTALS_0211.map(s=>({
 s,hex:(s===0||s===80||s===240)?0xff48a5:0x48d5f6
}));
const CYAN=swatch(0x5fdaff);
const PINK=swatch(0xff60ba);
const BASE=Object.freeze({
 floor:swatch(0x08121f),bank:swatch(0x0a1929),
 wall:swatch(0x091a2d),vault:swatch(0x061426),
 metal:swatch(0x162a3d)
});
// These three independent components remain visible in QA and avoid fake
// "global brightening": the response falls off from actual neon geometry.
export function sampleNeonInteriorLight(s,x,y,{detail="shell"}={}){
 const h=clamp(y/29.62);
 let base;
 if(detail==="rib")base=BASE.metal;
 else if(y<.20)base=BASE.floor;
 else if(y<2)base=BASE.bank;
 else if(y>22)base=BASE.vault;
 else base=BASE.wall;
 const result=base.slice();
 let cyan=0,pink=0;
 // Existing magenta side strips sit about 20m up each tunnel wall. The falloff
 // reaches side benches softly but leaves the center of the vault in darkness.
 const wallGuide=gauss(y-20.4,6.6)*clamp((Math.abs(x)-5.0)/18.0);
 pink+=.11*wallGuide;
 cyan+=.025*gauss(y-17,7.0)*clamp((Math.abs(x)-12)/14);
 // Radial luminous arcs are made every ~38-42m, and their influence is
 // local to each arc. 2m road-conforming vertices record the response.
 for(const {s:p,hex} of PORTAL_LIGHTS){
  const dist=gauss(s-p,7.5);
  const reach=.62+.40*gauss(y-24,11.0);
  if(hex===0xff48a5)pink+=dist*.46*reach;
  else cyan+=dist*.43*reach;
 }
 // Gentle local lift at upper vault joints; not light from outside the scene.
 const localJoint=.006*gauss(y-26,4.5);
 cyan+=localJoint;
 // Linear-space authored bounce, with enough dark material retained between
 // emitters that neon reads as an actual source instead of decoration.
 const scene=[CYAN,PINK];
 for(let k=0;k<3;k++)result[k]=clamp(result[k]+
  cyan*scene[0][k]*.26+pink*scene[1][k]*.23,0,.65);
 return {
  rgb:result,cyan,pink,
  ambientFloor:base,
  dominant:cyan>pink?"cyan":pink>cyan?"pink":"dark"
 };
}
function buildShellColors(vertices,positions,classicVault){
 const points=TUNNEL_PROFILE_0211.length,colors=new Float32Array(vertices*3);
 for(let i=0;i<vertices;i++){
  const j=i%points;
  const s=TUNNEL_MEGA_0211.start+
   Math.floor(i/points)*TUNNEL_MEGA_0211.sweepStepMeters;
  // Local profile only for lighting authoring; actual mesh/track vertices
  // remain from the original installer and are NEVER regenerated.
  const [x,yRaw]=TUNNEL_PROFILE_0211[j];
  const u=(s-TUNNEL_MEGA_0211.start)/TUNNEL_MEGA_0211.meters;
  const bend=(1-Math.cos(PI2*u))*.5;
  const strength=clamp((yRaw-4)/20);
  const y=classicVault?yRaw+bend*strength:
   (yRaw<=TUNNEL_MEGA_0211.vaultCompressionStart?yRaw:
    TUNNEL_MEGA_0211.vaultCompressionStart+
    (yRaw-TUNNEL_MEGA_0211.vaultCompressionStart)*TUNNEL_MEGA_0211.vaultScale)
    +TUNNEL_MEGA_0211.vaultWaveAmplitude*bend*strength;
  const pt=sampleNeonInteriorLight(s,x,y).rgb;
  for(let c=0;c<3;c++)colors[i*3+c]=pt[c];
 }
 return colors;
}
function buildRoadReflections(THREE,positionAt){
 const verts=[],color=[],indices=[],columns=5;
 // Thin neon reflection pulses ON the playable road's outer margins.
 // No road material replacement, no obstacle and no transparent room-wide wash.
 const profile=[8.0,8.8,9.55,10.35,10.9];
 const sourceIds=TUNNEL_PORTALS_0211.filter(s=>s>=0&&s<=350);
 for(const source of sourceIds)for(const side of [-1,1]){
  const base=verts.length/3,steps=13;
  const tint=(source===0||source===80||source===240)?PINK:CYAN;
  for(let step=0;step<steps;step++){
   const s=clamp(source+(step-6)*2,TUNNEL_MEGA_0211.start,TUNNEL_MEGA_0211.end);
   const longitudinal=gauss(s-source,6.0);
   for(let col=0;col<columns;col++){
    const x=side*profile[col],p=positionAt(s,x,.105);
    if(!Number.isFinite(p.x+p.y+p.z))throw Error("Bad neon road reflection");
    verts.push(p.x,p.y,p.z);
    const transverse=[.01,.06,.13,.18,.045][col];
    const value=longitudinal*transverse;
    color.push(tint[0]*value,tint[1]*value,tint[2]*value);
   }
  }
  for(let step=0;step<steps-1;step++)for(let j=0;j<columns-1;j++){
   const a=base+step*columns+j,b=a+1,c=a+columns,d=c+1;
   indices.push(a,b,c,b,d,c);
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));
 geo.setAttribute("color",new THREE.Float32BufferAttribute(color,3));
 geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();
 return geo;
}
const dispose=mesh=>{mesh?.geometry?.dispose();mesh?.material?.dispose()};
export function installNeonDrivenInterior(THREE,world,options={}){
 const base=installTunnelMegastructure(THREE,world,options);
 const oldState=base.stats();
 if(!oldState.active)return base;
 const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
 if(!group)throw Error("0.21.2: missing original continuous tunnel group");
 const shell=group.children.find(x=>x.name==="Tunnel / CLOSED_SHELL");
 const ribs=group.children.find(x=>x.name==="Tunnel / CURVED_RIBS");
 const state={
  ...oldState,version:"0.21.2",variant:"neon-driven-interior",
  lightingEnabled:false,interiorNeonPrimary:false,exteriorLightInfluence:0,
  diffuseNeonWallResponse:false,localNeonRoadResponse:false,
  darkMaterial:true,sideFloorsRetained:true,ceilingHeightUnchanged:true,
  globalLightsChanged:0,dynamicLightsAdded:0,addedRenderPasses:0,
  originalGRIPUntouched:true,roadMeshUntouched:true,comparedTo:NEON_INTERIOR_0212.comparison
 };
 let roadLight=null,oldShell=null,oldRibs=null,oldColors=null;
 try{
  if(!shell||!ribs||!shell.geometry?.attributes?.position)
   throw Error("0.21.2 missing tunnel shell or support ribs");
  oldShell=shell.material;oldRibs=ribs.material;
  oldColors=shell.geometry.getAttribute("color");
  const pos=shell.geometry.getAttribute("position");
  const baked=buildShellColors(pos.count,pos.array,!!options.vaultHeightClassic);
  shell.geometry.setAttribute("color",new THREE.Float32BufferAttribute(baked,3));
  shell.material=new THREE.MeshBasicMaterial({
   color:0xffffff,vertexColors:true,side:THREE.DoubleSide,toneMapped:true
  });
  ribs.material=new THREE.MeshBasicMaterial({
   color:0x91afc4,vertexColors:true,side:THREE.DoubleSide,toneMapped:true
  });
  if(!options.lowMemory){
   const geo=buildRoadReflections(THREE,options.positionAt);
   roadLight=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({
    color:0xffffff,vertexColors:true,side:THREE.DoubleSide,
    toneMapped:false,transparent:true,opacity:.62,
    depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending
   }));
   roadLight.name="Tunnel / NEON_ROAD_RESPONSE";
   roadLight.frustumCulled=true;
   roadLight.renderOrder=1;
   group.add(roadLight);
   state.drawBatches++;
   state.trianglesRendered+=geo.index.count/3;
  }
  oldShell.dispose();oldRibs.dispose();
  state.lightingEnabled=true;
  state.interiorNeonPrimary=true;
  state.diffuseNeonWallResponse=true;
  state.localNeonRoadResponse=!!roadLight;
  state.geometryResources=state.drawBatches;
  state.materialResources=state.drawBatches;
 }catch(e){
  if(roadLight){roadLight.removeFromParent();dispose(roadLight)}
  if(shell?.material!==oldShell)shell?.material?.dispose();
  if(ribs?.material!==oldRibs)ribs?.material?.dispose();
  if(shell&&oldShell)shell.material=oldShell;
  if(ribs&&oldRibs)ribs.material=oldRibs;
  if(oldColors)shell.geometry.setAttribute("color",oldColors);
  state.lightingError=String(e?.message??e);
  state.status="fallback-materials";
 }
 return {ready:base.ready,stats:()=>({...state}),
  dispose(){base.dispose()}};
}
