// SKYSHIFT 0.21.4 — Integrated Neon Flow
// 4 intentional uninterrupted longitudinal light paths (two midwall, two
// overhead). Each follows the original 0.21.1 banked 3D tunnel profile.
// Spatial palette + white crest come ONLY from the 0.21.2.1 wave uniforms;
// no standalone clock, scene light, bloom pass or gameplay mutation.
// The paired 0.21.3 structural layer uses a calmer graphite finish and
// longer bay rhythm only when this new art pass is enabled.
import {TUNNEL_MEGA_0211} from "../tunnel-megastructure-v0211.mjs";
import {sampleStructuralFacet,installStructuralTunnelRebuild}
 from "../structural-tunnel-v0213.mjs";
import {createTunnelSpectrumUniforms,updateTunnelSpectrumUniforms,
 bindTunnelSpectrumMaterial} from "../tunnel-spectrum-v02121.mjs";

export const INTEGRATED_NEON_FLOW_0214=Object.freeze({
 version:"0.21.4",id:"integrated-neon-flow",
 start:0,end:TUNNEL_MEGA_0211.end,
 paths:4,wallPaths:2,ceilingPaths:2,
 design:"continuous-curved-recessed-flows-not-per-panel-neons",
 samplesStepDesktop:2,samplesStepMobile:3.5,
 graphitePanelBayMeters:22,
 newDrawBatchesDesktop:2,newDrawBatchesMobile:1,
 root:"original-tunnel-0211-profile",
 singleWaveSource:"zone-wave-v060",
 newLights:0,newRenderPasses:0,newColliders:0,
 shipUnchanged:true,roadUnchanged:true,railUnchanged:true,
 physicsUnchanged:true,gripUnchanged:true,cameraUnchanged:true,
 globalSunUnchanged:true,globalBloomUnchanged:true,
 comparison:"?tunnelFlow=classic"
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const linear=x=>{const v=x/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};
const rgb=hex=>[linear((hex>>16)&255),linear((hex>>8)&255),linear(hex&255)];
const GRAPHITE=rgb(0x081723),BEVEL=rgb(0x1c3546);
const FIBERS=Object.freeze([
 {name:"LEFT_WALL",facet:8,t:.53,weight:.80},
 {name:"RIGHT_WALL",facet:21,t:.47,weight:.80},
 {name:"LEFT_CROWN",facet:13,t:.54,weight:.56},
 {name:"RIGHT_CROWN",facet:16,t:.46,weight:.56}
]);
const meshData=()=>({positions:[],colors:[],trackS:[],glowWeight:[],triangles:0});
function vertex(target,where,weight,color,positionAt,options){
 const [s,j,t,depth]=where;
 const [arc,x,y]=sampleStructuralFacet(s,j,t,depth,options);
 const p=positionAt(arc,x,y);
 if(!p||![p.x,p.y,p.z].every(Number.isFinite))
  throw Error("0.21.4 invalid banked neon flow position");
 target.positions.push(p.x,p.y,p.z);
 target.colors.push(...color);
 target.trackS.push(arc);
 // Do not create another pulse oscillator. This is the base emission
 // intensity multiplied by the 0.21.2.1 native spatial palette.
 const fade=clamp(s/5)*clamp((TUNNEL_MEGA_0211.end-s)/7);
 target.glowWeight.push(weight*fade);
}
function quad(dest,corners,weight,color,positionAt,options){
 for(const i of [0,1,2,0,2,3])
  vertex(dest,corners[i],weight,color,positionAt,options);
 dest.triangles+=2;
}
function band(dest,s0,s1,j,t,half,depth,weight,color,positionAt,options){
 quad(dest,[
  [s0,j,t-half,depth],[s0,j,t+half,depth],
  [s1,j,t+half,depth],[s1,j,t-half,depth]
 ],weight,color,positionAt,options);
}
export function buildIntegratedNeonFlowData(positionAt,{
 lowMemory=false,vaultHeightClassic=false
}={}){
 if(typeof positionAt!=="function")
  throw Error("0.21.4 needs the unchanged positionAt curve sampler");
 const options={vaultHeightClassic},cores=meshData(),recesses=meshData();
 const segments=Math.ceil(TUNNEL_MEGA_0211.end/
  (lowMemory?INTEGRATED_NEON_FLOW_0214.samplesStepMobile:
   INTEGRATED_NEON_FLOW_0214.samplesStepDesktop));
 const step=TUNNEL_MEGA_0211.end/segments;
 for(const path of FIBERS){
  for(let i=0;i<segments;i++){
   const s0=i*step,s1=(i+1)*step;
   // Real shadow channel underneath the light: the glowing surface is
   // inlaid rather than painted onto the panels. No PBR sun on the channel.
   if(!lowMemory){
    band(recesses,s0,s1,path.facet,path.t,.075,.395,0,
     GRAPHITE,positionAt,options);
    band(recesses,s0,s1,path.facet,path.t,.054,.424,.012,
     BEVEL,positionAt,options);
   }
   // Wide low-energy edge + narrow bright emitter share ONE draw batch.
   // Depth separation avoids same-surface z fighting near 0.21.3 panels.
   band(cores,s0,s1,path.facet,path.t,.073,.475,path.weight*.12,
    GRAPHITE,positionAt,options);
   band(cores,s0,s1,path.facet,path.t,.025,.535,path.weight,
    BEVEL,positionAt,options);
  }
 }
 return {cores,recesses,paths:FIBERS.map(({name,facet,weight})=>({
  name,facet,baseWeight:weight})),
  segmentsPerPath:segments,
  triangles:cores.triangles+(lowMemory?0:recesses.triangles),
  batchCount:lowMemory?1:2};
}
function removeMesh(mesh){
 mesh?.removeFromParent?.();
 mesh?.geometry?.dispose?.();
 mesh?.material?.dispose?.();
}
export function installIntegratedNeonFlow(THREE,world,options={}){
 const base=installStructuralTunnelRebuild(THREE,world,{
  ...options,flowCohesion:true
 });
 const before=base.stats();
 if(!before.active||!before.structuralEnabled||
    before.structuralStatus!=="active")return base;
 const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
 if(!group)throw Error("0.21.4 requires the original vaulted tunnel group");
 const spectrum=createTunnelSpectrumUniforms(THREE),added=[];
 const state={
  integratedNeonVersion:INTEGRATED_NEON_FLOW_0214.version,
  flowEnabled:false,flowStatus:"loading",flowPaths:0,
  flowSegmentsPerPath:0,flowDrawBatches:0,flowTriangles:0,
  panelRhythmMeters:INTEGRATED_NEON_FLOW_0214.graphitePanelBayMeters,
  structuralGraphiteMuted:true,flowUnchangedPhysics:true,
  flowComparison:INTEGRATED_NEON_FLOW_0214.comparison
 };
 try{
  const data=buildIntegratedNeonFlowData(options.positionAt,options);
  const materials=[
   // Main wave-synchronized luminous strip. No neutral white sun response.
   ["FLOW_CORES",data.cores,()=>bindTunnelSpectrumMaterial(
    new THREE.MeshBasicMaterial({
     color:0xffffff,vertexColors:false,side:THREE.DoubleSide,
     transparent:true,opacity:.89,depthTest:true,depthWrite:false,
     blending:THREE.AdditiveBlending,fog:false,toneMapped:false
    }),spectrum,"emitter")],
   // Dark, tone-mapped channel backing. Never glowing over every panel.
   ["FLOW_RECESSES",data.recesses,()=>bindTunnelSpectrumMaterial(
    new THREE.MeshBasicMaterial({
     color:0xffffff,vertexColors:true,side:THREE.DoubleSide,
     depthTest:true,depthWrite:true,fog:false,toneMapped:true
    }),spectrum,"shell")]
  ];
  for(const [name,source,makeMat] of materials){
   if(options.lowMemory&&name==="FLOW_RECESSES")continue;
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute("position",new THREE.Float32BufferAttribute(
    source.positions,3));
   geometry.setAttribute("color",new THREE.Float32BufferAttribute(
    source.colors,3));
   geometry.setAttribute("trackS",new THREE.Float32BufferAttribute(
    source.trackS,1));
   geometry.setAttribute("glowWeight",new THREE.Float32BufferAttribute(
    source.glowWeight,1));
   geometry.computeVertexNormals();geometry.computeBoundingSphere();
   const mesh=new THREE.Mesh(geometry,makeMat());
   mesh.name="Tunnel / "+name;
   mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=true;
   // Recesses must draw with the shell; additive glow stays on top.
   if(name==="FLOW_CORES")mesh.renderOrder=4;
   group.add(mesh);added.push(mesh);
  }
  Object.assign(state,{
   flowEnabled:true,flowStatus:"active",flowPaths:data.paths.length,
   flowSegmentsPerPath:data.segmentsPerPath,
   flowDrawBatches:added.length,flowTriangles:data.triangles
  });
 }catch(error){
  added.forEach(removeMesh);
  Object.assign(state,{flowStatus:"fallback",flowError:String(error?.message||error)});
  console.warn("SKYSHIFT 0.21.4 flow fallback",state.flowError);
 }
 return {
  ready:base.ready,
  stats(){
   const previous=base.stats(),extra=state.flowDrawBatches;
   return {...previous,...state,version:state.flowEnabled?"0.21.4":previous.version,
    drawBatches:previous.drawBatches+extra,
    trianglesRendered:previous.trianglesRendered+state.flowTriangles,
    geometryResources:(previous.geometryResources??previous.drawBatches)+extra,
    materialResources:(previous.materialResources??previous.drawBatches)+extra};
  },
  updateWave(wave){
   base.updateWave?.(wave);
   if(state.flowEnabled)updateTunnelSpectrumUniforms(spectrum,wave);
  },
  dispose(){base.dispose()}
 };
}
