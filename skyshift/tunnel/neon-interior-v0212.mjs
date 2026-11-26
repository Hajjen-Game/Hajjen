// SKYSHIFT 0.21.2 — Neon-Driven Interior Lighting
// The continuous 0.21.1.1 tunnel stays geometrically IDENTICAL. Replace its
// exterior-lit surfaces with a dark, authored interior lighting field.
// A small number of cyan/pink structural neon arcs + longitudinal strips
// are the ONLY simulated light sources on the tunnel's interior.
// No global light, bloom, fog, ship, GRIP, road material or camera mutation.
// This is baked local light response, not expensive shadow-casting point lights.

import {installTunnelMegastructure,TUNNEL_PROFILE_0211,
 TUNNEL_PORTALS_0211,TUNNEL_MEGA_0211} from "./tunnel-megastructure-v0211.mjs";
import {TUNNEL_SPECTRUM_02121,createTunnelSpectrumUniforms,
 updateTunnelSpectrumUniforms,bindTunnelSpectrumMaterial}
 from "./tunnel-spectrum-v02121.mjs";

export const NEON_INTERIOR_0212=Object.freeze({
 version:"0.21.2.1",id:"neon-driven-interior-0212",
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
 floor:swatch(0x040b15),bank:swatch(0x071321),
 wall:swatch(0x071323),vault:swatch(0x05111f),
 metal:swatch(0x0b1727)
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
 const points=TUNNEL_PROFILE_0211.length,colors=new Float32Array(vertices*3),
  glow=new Float32Array(vertices);
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
  const pt=sampleNeonInteriorLight(s,x,y);
  // Keep only dark metal base in the vertex color. The shared spectral
  // wave shader applies neon colors per station metre at render-time.
  for(let c=0;c<3;c++)colors[i*3+c]=pt.ambientFloor[c];
  glow[i]=Math.min(.16,pt.cyan*.22+pt.pink*.19);
 }
 return {colors,glow};
}
function buildRoadReflections(THREE,positionAt){
 const verts=[],color=[],indices=[],trackS=[],glow=[],columns=5;
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
    trackS.push(s);
    const transverse=[.01,.06,.13,.18,.045][col];
    const value=longitudinal*transverse;
    color.push(0,0,0);
    glow.push(value);
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
 geo.setAttribute("trackS",new THREE.Float32BufferAttribute(trackS,1));
 geo.setAttribute("glowWeight",new THREE.Float32BufferAttribute(glow,1));
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
  ...oldState,version:"0.21.2.1",variant:"neon-driven-interior",
  lightingEnabled:false,interiorNeonPrimary:false,exteriorLightInfluence:0,
  diffuseNeonWallResponse:false,localNeonRoadResponse:false,
  darkMaterial:true,sideFloorsRetained:true,ceilingHeightUnchanged:true,
  globalLightsChanged:0,dynamicLightsAdded:0,addedRenderPasses:0,
  waveSynchronized:false,spectrumPaletteCount:TUNNEL_SPECTRUM_02121.paletteCount,
  currentSpectrumStage:0,currentWaveFront:-10000,
  exteriorLightLeakRemoved:true,staticPinkCyanWashRemoved:true,
  originalGRIPUntouched:true,roadMeshUntouched:true,comparedTo:NEON_INTERIOR_0212.comparison
 };
 let roadLight=null,oldShell=null,oldRibs=null,oldColors=null;
 const spectrum=createTunnelSpectrumUniforms(THREE);
 try{
  if(!shell||!ribs||!shell.geometry?.attributes?.position)
   throw Error("0.21.2 missing tunnel shell or support ribs");
  oldShell=shell.material;oldRibs=ribs.material;
  oldColors=shell.geometry.getAttribute("color");
  const pos=shell.geometry.getAttribute("position");
  const baked=buildShellColors(pos.count,pos.array,!!options.vaultHeightClassic);
  shell.geometry.setAttribute("color",new THREE.Float32BufferAttribute(baked.colors,3));
  shell.geometry.setAttribute("glowWeight",new THREE.Float32BufferAttribute(baked.glow,1));
  for(const mesh of group.children){
   if(mesh.name==="Tunnel / CLOSED_SHELL")continue;
   const count=mesh.geometry?.getAttribute("trackS")?.count;
   if(!count)throw Error("Tunnel neon lacks track-space wave coordinate: "+mesh.name);
   const weight=mesh.name==="Tunnel / CURVED_RIBS"?.075:
    mesh.name==="Tunnel / HALO"?.62:1;
   mesh.geometry.setAttribute("glowWeight",
    new THREE.Float32BufferAttribute(new Float32Array(count).fill(weight),1));
  }
  shell.material=bindTunnelSpectrumMaterial(new THREE.MeshBasicMaterial({
   color:0xffffff,vertexColors:true,side:THREE.DoubleSide,toneMapped:true
  }),spectrum,"shell");
  ribs.material=bindTunnelSpectrumMaterial(new THREE.MeshBasicMaterial({
   color:0x0c1b2b,vertexColors:false,side:THREE.DoubleSide,toneMapped:true
  }),spectrum,"rib");
  for(const mesh of group.children){
   if(mesh.name==="Tunnel / INTEGRATED_LIGHT"){
    const old=mesh.material;
    mesh.material=bindTunnelSpectrumMaterial(new THREE.MeshBasicMaterial({
     color:0xffffff,vertexColors:false,side:THREE.DoubleSide,
     toneMapped:false
    }),spectrum,"emitter");
    old.dispose();
   }else if(mesh.name==="Tunnel / HALO"){
    const old=mesh.material;
    mesh.material=bindTunnelSpectrumMaterial(new THREE.MeshBasicMaterial({
     color:0xffffff,vertexColors:false,side:THREE.DoubleSide,
     toneMapped:false,transparent:true,opacity:.14,
     depthWrite:false,blending:THREE.AdditiveBlending
    }),spectrum,"halo");
    old.dispose();
   }
  }
  if(!options.lowMemory&&!options.omitLegacyRoadResponse){
   const geo=buildRoadReflections(THREE,options.positionAt);
   roadLight=new THREE.Mesh(geo,bindTunnelSpectrumMaterial(new THREE.MeshBasicMaterial({
    color:0xffffff,vertexColors:false,side:THREE.DoubleSide,
    toneMapped:false,transparent:true,opacity:.62,
    depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending
   }),spectrum,"reflection"));
   roadLight.name="Tunnel / NEON_ROAD_RESPONSE";
   roadLight.frustumCulled=true;
   roadLight.renderOrder=1;
   group.add(roadLight);
   state.drawBatches++;
   state.trianglesRendered+=geo.index.count/3;
  }
  oldShell.dispose();oldRibs.dispose();
  state.lightingEnabled=true;
  state.waveSynchronized=true;
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
  updateWave(wave){
   if(!state.waveSynchronized)return;
   const next=updateTunnelSpectrumUniforms(spectrum,wave);
   state.currentSpectrumStage=next.stage;
   state.currentWaveFront=next.front;
   state.currentSpectrumTo=next.transitionTo;
   state.waveActive=next.active;
  },
  dispose(){base.dispose()}};
}
