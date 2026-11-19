// SKYSHIFT 0.21.3 — Structural Tunnel Rebuild.
// Add real raised panels, bevelled reveals, side-wall shoulders and secondary
// arch supports INSIDE the existing closed 368 m shell. Every vertex samples
// the original curved/banked track-space profile; no new colliders, lights,
// road overlay or moving world geometry. Existing neon arch emission survives.
import {TUNNEL_MEGA_0211,TUNNEL_PROFILE_0211,TUNNEL_PORTALS_0211,
 tunnelProfilePoint0211} from "./tunnel-megastructure-v0211.mjs";
import {installExteriorLightSeal} from "./tunnel-exterior-seal-v02122.mjs";
import {createTunnelSpectrumUniforms,updateTunnelSpectrumUniforms,
 bindTunnelSpectrumMaterial} from "./tunnel-spectrum-v02121.mjs";

export const STRUCTURAL_TUNNEL_0213=Object.freeze({
 version:"0.21.3",id:"structural-tunnel-rebuild",
 start:TUNNEL_MEGA_0211.start,end:TUNNEL_MEGA_0211.end,
 bayPitch:14,bayInset:1.15,
 secondaryBracePitch:21,
 raisedPanelMeters:.32,roofMinimumClearance:25.95,
 material:"matte-graphite-authored-neon-echo",
 newDrawBatchesDesktop:2,newDrawBatchesMobile:1,
 newColliders:0,roadGeometryChanged:false,
 shipGeometryChanged:false,steeringChanged:false,gripChanged:false,
 cameraChanged:false,globalLightsChanged:0,newDynamicLights:0,
 bloomPassesChanged:0,additionalPostprocessPasses:0,
 waveSource:"native-zone-wave-v060",
 comparison:"?tunnelStructure=classic"
});
const clamp=(x,lo=0,hi=1)=>Math.max(lo,Math.min(hi,x));
const linear=c=>{const x=c/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4};
const makeRGB=(v)=>[linear((v>>16)&255),linear((v>>8)&255),linear(v&255)];
const COLORS=Object.freeze({
 panel:makeRGB(0x233d50),panelAlt:makeRGB(0x192e42),
 roof:makeRGB(0x273d50),roofAlt:makeRGB(0x19293c),
 lip:makeRGB(0x3b5a70),shadow:makeRGB(0x071321),
 brace:makeRGB(0x344c62),braceShadow:makeRGB(0x0b1929),
 conduit:makeRGB(0x3c6073),groove:makeRGB(0x0e2336)
});
// 0.21.4 opt-in art direction. Recessive graphite and longer panel bays
// let a handful of continuous neon flows define the tunnel at speed.
// The classic 0.21.3 mesh is untouched unless explicitly requested.
const FLOW_COLORS=Object.freeze({
 panel:makeRGB(0x142638),panelAlt:makeRGB(0x102031),
 roof:makeRGB(0x192b3d),roofAlt:makeRGB(0x112132),
 lip:makeRGB(0x253d50),shadow:makeRGB(0x06111c),
 brace:makeRGB(0x213749),braceShadow:makeRGB(0x091521),
 conduit:makeRGB(0x264153),groove:makeRGB(0x091828)
});
const empty=()=>({positions:[],colors:[],trackS:[],glowWeight:[],triangles:0});
const mix=(a,b,t)=>a+(b-a)*t;

// This is the TRUE inner normal of a cross-section facet, including curved
// crown and near-vertical side walls. No flattened world-axis rectangles.
export function sampleStructuralFacet(s,j,t,depth=0,{vaultHeightClassic=false}={}){
 if(!Number.isFinite(s)||s<0||s>TUNNEL_MEGA_0211.end||
    !Number.isInteger(j)||j<0||j>=TUNNEL_PROFILE_0211.length-1||
    t<0||t>1||depth<0||depth>.9)
  throw Error("0.21.3 bad original-vault facet coordinate");
 const a=tunnelProfilePoint0211(j,s,vaultHeightClassic);
 const b=tunnelProfilePoint0211(j+1,s,vaultHeightClassic);
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
 if(len<1e-5)throw Error("0.21.3 degenerate tunnel cross section");
 const x=mix(a[0],b[0],t)+dy/len*depth;
 const y=mix(a[1],b[1],t)-dx/len*depth;
 // Clearance is measured against the REAL original 23.2 m driving deck,
 // not a newly invented mesh or collider. The roof remains high above it.
 if(Math.abs(x)<12.2&&y<STRUCTURAL_TUNNEL_0213.roofMinimumClearance)
  throw Error("0.21.3 raised structure intrudes pilot / road envelope");
 return [s,x,y];
}
function vertex(dest,local,col,positionAt,options,glow){
 const [s,x,y]=local;
 const p=positionAt(s,x,y);
 if(!Number.isFinite(p?.x+p?.y+p?.z))
  throw Error("0.21.3 track sampling yielded nonfinite world vertex");
 dest.positions.push(p.x,p.y,p.z);
 dest.colors.push(...col);
 dest.trackS.push(s);
 dest.glowWeight.push(glow);
}
function quad(dest,corners,col,positionAt,options,glow=0){
 const points=corners.map(([s,j,t,d])=>sampleStructuralFacet(s,j,t,d,options));
 for(const index of [0,1,2,0,2,3])
  vertex(dest,points[index],col,positionAt,options,glow);
 dest.triangles+=2;
}
function keptSpans(from,to){
 // Do not cover the 0.21.1 illuminated portals with flat panel faces.
 let intervals=[[Math.max(from,0),Math.min(to,TUNNEL_MEGA_0211.end)]];
 for(const p of TUNNEL_PORTALS_0211){
  const lo=p-1.1,hi=p+2.85,fragments=[];
  for(const [a,b] of intervals){
   if(b<=lo||a>=hi){fragments.push([a,b]);continue}
   if(lo-a>2.25)fragments.push([a,lo]);
   if(b-hi>2.25)fragments.push([hi,b]);
  }
  intervals=fragments;
 }
 return intervals.filter(([a,b])=>b-a>2.25);
}
const WALL=[5,6,7,8,9,10,19,20,21,22,23,24];
const ROOF=[12,13,14,15,16,17,18];
// 0.23.1 true-relief insert: genuine layered cross-section facets, not a
// painted border. Original vaulted profile and roof/road clearance enforced.
function makeDepthStudyPlate(target,positionAt,options,s0,s1,j,swatch,colors){
 const a=s0+.26,b=s1-.26;
 if(b-a<1.1)return;
 const steps=Math.ceil((b-a)/2);
 const strip=(x,y,t0,d0,t1,d1,t2,d2,t3,d3,col,glow)=>{
  quad(target,[[x,j,t0,d0],[x,j,t1,d1],
   [y,j,t2,d2],[y,j,t3,d3]],col,positionAt,options,glow);
 };
 for(let i=0;i<steps;i++){
  const x=mix(a,b,i/steps),y=mix(a,b,(i+1)/steps);
  strip(x,y,.028,.035,.067,.075,.067,.075,.028,.035,colors.groove,0);
  strip(x,y,.067,.075,.178,.58,.178,.58,.067,.075,colors.lip,.004);
  strip(x,y,.178,.58,.822,.58,.822,.58,.178,.58,swatch,.008);
  strip(x,y,.822,.58,.933,.075,.933,.075,.822,.58,colors.brace,.004);
  strip(x,y,.933,.075,.972,.035,.972,.035,.933,.075,colors.shadow,0);
  // True thin raised machined edges, no emission / bloom added.
  strip(x,y,.178,.592,.204,.592,.204,.592,.178,.592,colors.lip,.003);
  strip(x,y,.796,.592,.822,.592,.822,.592,.796,.592,colors.lip,.003);
 }
 for(const [end,reverse] of [[a,false],[b,true]]){
  const verts=[[end,j,.067,.075],[end,j,.933,.075],
   [end,j,.822,.58],[end,j,.178,.58]];
  quad(target,reverse?verts.slice().reverse():verts,
   colors.shadow,positionAt,options,0);
 }
}
// Break each architectural plate at the original 2 m mesh sampling
// cadence so it hugs real track curvature rather than bridging a turn.
function makePlate(target,positionAt,options,s0,s1,j,swatch,lowMemory,
 colors=COLORS,depthStudy=false){
 if(depthStudy&&!lowMemory&&s0>=98&&s1<=284){
  makeDepthStudyPlate(target,positionAt,options,s0,s1,j,swatch,colors);
  return;
 }
 const steps=Math.ceil((s1-s0)/(lowMemory?3.5:2));
 const pad=.26;
 const a=s0+pad,b=s1-pad;
 if(b-a<1.1)return;
 const col=swatch,lip=colors.lip,shadow=colors.shadow;
 for(let step=0;step<steps;step++){
  const x=mix(a,b,step/steps),y=mix(a,b,(step+1)/steps);
  quad(target,[[x,j,.10,.34],[x,j,.90,.34],
   [y,j,.90,.34],[y,j,.10,.34]],col,positionAt,options,.008);
  // Actual raised bevel faces around the plate, not drawn fake line art.
  quad(target,[[x,j,.045,.11],[x,j,.10,.34],
   [y,j,.10,.34],[y,j,.045,.11]],lip,positionAt,options,.004);
  quad(target,[[x,j,.90,.34],[x,j,.955,.11],
   [y,j,.955,.11],[y,j,.90,.34]],shadow,positionAt,options,0);
 }
 // Physical end caps produce a panel edge silhouette at near camera.
 for(const [s,reverse] of [[a,false],[b,true]]){
  const v=[[s,j,.045,.11],[s,j,.955,.11],
   [s,j,.90,.34],[s,j,.10,.34]];
  quad(target,reverse?v.slice().reverse():v,
   reverse?colors.shadow:colors.lip,positionAt,options,.003);
 }
}
function makeSecondarySupport(dest,positionAt,options,s,j,colors=COLORS){
 const a=Math.max(0,s-.44),b=Math.min(368,s+.44);
 if(b-a<.2)return;
 quad(dest,[[a,j,.08,.38],[a,j,.92,.38],
  [b,j,.92,.38],[b,j,.08,.38]],
  j%3===0?colors.brace:colors.braceShadow,
  positionAt,options,.011);
 // A bevelled structural return adds edge thickness to the upright.
 quad(dest,[[a,j,.045,.12],[a,j,.08,.38],
  [b,j,.08,.38],[b,j,.045,.12]],
  colors.brace,positionAt,options,.007);
}
export function buildStructuralTunnelData(positionAt,{lowMemory=false,
 vaultHeightClassic=false,flowCohesion=false,depthStudy=false}={}){
 if(typeof positionAt!=="function")
  throw Error("0.21.3 requires the original positionAt curve sampler");
 const options={vaultHeightClassic};
 const colors=flowCohesion?FLOW_COLORS:COLORS;
 const primary=empty(),detail=empty();
 const walls=lowMemory?[5,7,9,20,22,24]:WALL;
 const roof=lowMemory?[12,14,16,18]:ROOF;
 let plates=0,arches=0;
 const bayPitch=flowCohesion?22:STRUCTURAL_TUNNEL_0213.bayPitch;
 const baySpan=flowCohesion?20.8:12.8;
 for(let bay=0,s=.8;s<368;s+=bayPitch,bay++){
  for(const j of [...walls,...roof]){
   // Avoid the "identical square corridor" rhythm. Structural joins stay
   // staggered per facet, while all openings around neon portals stay free.
   const offset=j%3===0?-.65:j%3===1?.80:.12;
   const isRoof=roof.includes(j);
   const alternate=(bay+j)%4===0;
   const color=isRoof?(alternate?colors.roofAlt:colors.roof):
    (alternate?colors.panelAlt:colors.panel);
   for(const [a,b] of keptSpans(s+offset,s+baySpan+offset)){
    makePlate(primary,positionAt,options,a,b,j,color,lowMemory,colors,depthStudy);plates++;
   }
  }
 }
 // Secondary cross-members between the existing ~42m neon portal arches.
 // On 4GB devices this sculptural rhythm stays, but no extra detail layer.
 for(let s=21;s<=357;s+=(lowMemory||flowCohesion)?42:STRUCTURAL_TUNNEL_0213.secondaryBracePitch){
  if(TUNNEL_PORTALS_0211.some(p=>Math.abs(s-p)<3.5))continue;
  for(const j of (lowMemory?[5,9,12,14,16,18,21,25]:
   [5,7,9,11,12,13,14,15,16,17,18,19,21,23,25])){
   makeSecondarySupport(primary,positionAt,options,s,j,colors);
  }
  arches++;
 }
 if(!lowMemory){
  // Continuous recessed conduits and graphite overhead service spine.
  // Deliberately NOT luminous yet: integrated neon flow belongs to 0.21.4.
  for(let s=0;s<368;s+=2){
   const end=Math.min(368,s+2);
   for(const j of [6,9,20,23]){
    quad(detail,[[s,j,.35,.42],[s,j,.48,.42],
     [end,j,.48,.42],[end,j,.35,.42]],
     colors.conduit,positionAt,options,.012);
    quad(detail,[[s,j,.49,.09],[s,j,.58,.09],
     [end,j,.58,.09],[end,j,.49,.09]],
     colors.groove,positionAt,options,0);
   }
   for(const j of [14,15]){
    quad(detail,[[s,j,.16,.44],[s,j,.84,.44],
     [end,j,.84,.44],[end,j,.16,.44]],
     colors.braceShadow,positionAt,options,.006);
   }
  }
 }
 return {primary,detail,plateCount:plates,secondaryArchCount:arches,
  geometryBatches:lowMemory?1:2,
  totalTriangles:primary.triangles+(lowMemory?0:detail.triangles),
  flowCohesion,depthStudy:Boolean(depthStudy&&!lowMemory),architecturalBayPitch:bayPitch};
}
function disposeMesh(mesh){
 mesh?.removeFromParent?.();
 mesh?.geometry?.dispose?.();
 mesh?.material?.dispose?.();
}
export function installStructuralTunnelRebuild(THREE,world,options={}){
 const base=installExteriorLightSeal(THREE,world,options);
 const oldState=base.stats();
 if(!oldState.active||oldState.status!=="active")return base;
 const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
 if(!group)throw Error("0.21.3 needs the existing sealed shell");
 const created=[],spectral=createTunnelSpectrumUniforms(THREE);
 let plates=0,arches=0,triangles=0;
 const state={
  structuralVersion:STRUCTURAL_TUNNEL_0213.version,
  structuralEnabled:false,structuralStatus:"loading",
  structureComparison:STRUCTURAL_TUNNEL_0213.comparison,
  structureDrawBatches:0,structureTriangles:0,
  structuralPlates:0,structuralSecondaryArches:0,
  cohesivePanelRhythm:Boolean(options.flowCohesion),
  roofSafetyPreserved:true,originalTrackUntouched:true,
  tunnelFogSealed:true,noNewColliders:true,
  waveSourceUnchanged:true
 };
 try{
  const data=buildStructuralTunnelData(options.positionAt,options);
  plates=data.plateCount;arches=data.secondaryArchCount;
  const batches=[["HARDSURFACE_PANELS",data.primary]];
  if(!options.lowMemory)batches.push(["STRUCTURAL_CONDUITS",data.detail]);
  for(const [name,item] of batches){
   const g=new THREE.BufferGeometry();
   g.setAttribute("position",new THREE.Float32BufferAttribute(item.positions,3));
   g.setAttribute("color",new THREE.Float32BufferAttribute(item.colors,3));
   g.setAttribute("trackS",new THREE.Float32BufferAttribute(item.trackS,1));
   g.setAttribute("glowWeight",new THREE.Float32BufferAttribute(item.glowWeight,1));
   g.computeVertexNormals();g.computeBoundingSphere();
   const material=bindTunnelSpectrumMaterial(new THREE.MeshBasicMaterial({
    color:0xffffff,vertexColors:true,side:THREE.DoubleSide,
    fog:false,toneMapped:true,depthWrite:true
   }),spectral,"shell");
   const mesh=new THREE.Mesh(g,material);
   mesh.name="Tunnel / "+name;mesh.castShadow=false;mesh.receiveShadow=false;
   mesh.frustumCulled=true;
   group.add(mesh);created.push(mesh);
   triangles+=item.triangles;
  }
  Object.assign(state,{
   structuralEnabled:true,structuralStatus:"active",
   structureDrawBatches:created.length,structureTriangles:triangles,
   structuralPlates:plates,structuralSecondaryArches:arches
  });
 }catch(e){
  for(const mesh of created)disposeMesh(mesh);
  state.structuralStatus="fallback";
  state.structuralError=String(e?.message||e);
  console.warn("SKYSHIFT 0.21.3 structure fallback",state.structuralError);
 }
 return {
  ready:base.ready,
  stats(){
   const prev=base.stats();
   const delta=state.structureDrawBatches;
   return {...prev,...state,version:state.structuralEnabled?"0.21.3":prev.version,
    drawBatches:prev.drawBatches+delta,
    trianglesRendered:prev.trianglesRendered+state.structureTriangles,
    geometryResources:(prev.geometryResources??prev.drawBatches)+delta,
    materialResources:(prev.materialResources??prev.drawBatches)+delta};
  },
  updateWave(wave){
   base.updateWave?.(wave);
   if(state.structuralEnabled)updateTunnelSpectrumUniforms(spectral,wave);
  },
  dispose(){base.dispose()}
 };
}
