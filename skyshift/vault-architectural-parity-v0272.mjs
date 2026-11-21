// SKYSHIFT 0.27.2 — Architectural Geometry & Panel Parity
// Reuses the EXACT 0.21.3/0.23.1/0.24.1 Skyline raised-panel sculptor.
// The original code accepts a track-relative 170m interval and Vault's
// existing C2 / banked cross-section: not a second imitation panel system.
// The 0.27.1 0.26.2 atlas is shared, NOT duplicated. No new world lights,
// camera/ship/road/rail/colliders, steering or GRIP changes.
import {buildSharedTunnelSection0280}
 from "./structural-tunnel-v0213.mjs";
import {vaultCrossSection0270}
 from "./full-tunnel-circuit-v0270.mjs";
import {patchVaultMaterialShader0271}
 from "./vault-material-parity-v0271.mjs";
import {makeTunnelPlan0280,SHARED_TUNNEL_STYLE_0280}
 from "./shared-tunnel-architecture-v0280.mjs";

const ROOT="SKYSHIFT · Neon Vault Full Tunnel 0.27.0";
const SHARED_PLAN=makeTunnelPlan0280({track:"vault"});
const ARC=SHARED_PLAN.intervals[0].end;
const CHUNK=SHARED_TUNNEL_STYLE_0280.geometry.defaultChunkMeters;
const PITCH=SHARED_PLAN.intervals[0].portalPitch;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const q=clamp((x-a)/(b-a));return q*q*(3-2*q);};
const periodic=(s,p)=>Math.abs(((s+p*.5)%p+p)%p-p*.5);
const fade=(s,p,w)=>Math.exp(-((periodic(s,p)/w)**2));
const safe=(x)=>Number.isFinite(x)?x:0;
export const VAULT_ARCHITECTURE_0272=Object.freeze({
 version:"0.27.2",source:"original Skyline 0.24.1 machined physical raised panels",
 originalBuilder:"buildStructuralTunnelData",
 originalPanelDepthMeters:0.58,
 originalStructuralPortalPitchMeters:PITCH,
 panelBayPitchMeters:22,
 trackLengthMeters:ARC,
 chunks:20,
 highLayerBatches:40,mobileLayerBatches:20,
 highTarget:"original 0.24.1 real faceted shoulders, scores, graphite lips",
 mobileTarget:"original 0.23.3 recessed true-depth profile",
 highPanelStepMeters:3.8,mobilePanelStepMeters:5.5,
 comparison:"?vaultArchitecture=classic",
 sharesMetalAtlas:true,atlasAdded:0,
 originalFixtureBaysUnchanged:true,
 originalExistingFixtureColorsUnchanged:true,
 inlaysPulledInFrontOfSculptedRelief:true,
 originalTrackGeometryUnchanged:true,
 originalRoadUnchanged:true,originalRailUnchanged:true,
 originalShipUnchanged:true,originalPhysicsUnchanged:true,
 originalGripUnchanged:true,originalCameraUnchanged:true,
 originalSkylineUnchanged:true,originalAuroraUnchanged:true,
 noNewColliders:true,noDynamicLights:true,noNewRenderPasses:true,
 nativeGGXNotYetPorted:true
});
// Same per-track portal positions already used by the common architecture
// plan; the original Skyline geometric sculptor performs both builds.
const portals=SHARED_PLAN.intervals[0].portals;
function colorize([s,x,y],color,glow,lowMemory){
 // The original sculptor's graphite/metal palette stays authoritative.
 // Reuse positions of the actual 0.27.0 short cyan/amber practicals,
 // rather than a global white/environment wash.
 const wall=smooth(10,20,Math.abs(x)),roof=smooth(19,27,y);
 const cool=fade(s,27,8.2)*smooth(10,22,y)*(1-wall*.45);
 const braceCool=fade(s,PITCH,4.0)*(.42+.58*roof);
 const warm=fade(s,PITCH,6.0)*wall*(1-smooth(17,25,y));
 const nearCool=Math.min(1,cool*.7+braceCool*.45);
 const strength=lowMemory?.68:1;
 return [
  clamp(color[0]*1.26+strength*(warm*.080+nearCool*.007),0,.85),
  clamp(color[1]*1.32+strength*(warm*.030+nearCool*.092),0,.85),
  clamp(color[2]*1.37+strength*(warm*.006+nearCool*.148),0,.90)
 ];
}
export function buildVaultArchitectureData0272(positionAt,chunkIndex,{
 lowMemory=false
}={}){
 if(typeof positionAt!=="function"||
  !Number.isInteger(chunkIndex)||chunkIndex<0||chunkIndex>=20)
  throw Error("0.27.2 requires real C2 track sampler and 0–19 chunk");
 const {start:from,end:to}=SHARED_PLAN.intervals[0].chunks[chunkIndex];
 const result=buildSharedTunnelSection0280(positionAt,SHARED_PLAN,{
  chunkIndex,lowMemory,profilePoint:vaultCrossSection0270,
  flowCohesion:true,depthStudy:true,
  unifiedDepth:true,surfaceCraftsmanship:true,
  panelStepMeters:lowMemory?
   SHARED_TUNNEL_STYLE_0280.geometry.panelStep4GBMeters:
   SHARED_TUNNEL_STYLE_0280.geometry.panelStepHighMeters,
  colorize:(point,rgb,g)=>colorize(point,rgb,g,lowMemory)
 });
 for(const part of [result.primary,...(!lowMemory?[result.detail]:[])]){
  const n=part.positions.length/3;
  if(n<=0||part.colors.length!==part.positions.length||
   part.trackS.length!==n||part.glowWeight.length!==n||
   part.materialProfile.length!==n||
   part.trackS.some(s=>s<from-.00001||s>to+.00001)||
   part.colors.some(c=>!Number.isFinite(c)||c<0||c>1)||
   part.positions.some(x=>!Number.isFinite(x)))
   throw Error("0.27.2 source builder failed bounded all-lap geometry");
 }
 if(result.primary.triangles>51000||
  result.detail.triangles>(lowMemory?0:12000))
  throw Error("0.27.2 chunk triangle budget exceeded");
 return {...result,chunkIndex,from,to,
  copiedFromOriginalSkylineSource:true,
  physicallyRaisedPanels:true};
}
function geometry(THREE,part){
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(part.positions,3));
 g.setAttribute("color",new THREE.Float32BufferAttribute(part.colors,3));
 g.setAttribute("trackS",new THREE.Float32BufferAttribute(part.trackS,1));
 g.setAttribute("glowWeight",new THREE.Float32BufferAttribute(part.glowWeight,1));
 // Reuse the original 0.26.x physical metal shader\u2019s true tunnel-space inputs.
 g.setAttribute("neonLocalSection",new THREE.Float32BufferAttribute(part.localSection,2));
 const uv=new Float32Array(part.trackS.length*2);
 for(let j=0;j<part.trackS.length;j++){
  uv[j*2]=part.trackS[j];
  uv[j*2+1]=part.materialProfile[j];
 }
 g.setAttribute("aVaultMaterialCoord0271",new THREE.Float32BufferAttribute(uv,2));
 g.computeVertexNormals();
 g.computeBoundingSphere();
 return g;
}
function metalMaterial(THREE,atlas,mobile,role){
 const m=new THREE.MeshBasicMaterial({vertexColors:true,
  side:THREE.DoubleSide,toneMapped:true});
 const key=m.customProgramCacheKey;
 m.onBeforeCompile=function(shader){
  const patched=patchVaultMaterialShader0271(shader.vertexShader,
   shader.fragmentShader,{role:"shell",mobile});
  shader.vertexShader=patched.vertexShader;
  shader.fragmentShader=patched.fragmentShader;
  shader.uniforms.uVaultMetalAtlas0271={value:atlas};
  shader.uniforms.uVaultMaterialStrength0271={value:1};
 };
 m.customProgramCacheKey=function(){
  return key.call(this)+"-vault-skyline-sculpt-0272-"+role+
   (mobile?"-4gb":"-high");
 };
 return m;
}
export function installVaultArchitectureParity0272(THREE,world,{
 enabled=true,track="vault",lowMemory=false,positionAt,
 foundation=null,materialParity=null
}={}){
 const fallback=(why)=>({active:false,stats:()=>({active:false,
  version:"0.27.2",status:why}),setComparison(){},dispose(){}});
 if(!enabled)return fallback("classic");
 if(track!=="vault")return fallback("other-track");
 if(!foundation?.active||foundation.stats?.().coverageMeters!==ARC)
  return fallback("0.27.0 foundation unavailable");
 const atlas=materialParity?.getMetalAtlas?.();
 if(!materialParity?.active||!atlas)
  return fallback("original 0.26.2 packed metal atlas unavailable");
 const root=world?.getObjectByName?.(ROOT);
 if(root?.children?.length!==20)
  return fallback("original 170m enclosed chunk groups unavailable");
 const generated=[];
 const metal=metalMaterial(THREE,atlas,lowMemory,"panel");
 const conduit=lowMemory?null:metalMaterial(THREE,atlas,lowMemory,"conduit");
 const status={active:false,version:"0.27.2",status:"preparing",
  sourceBuilder:"Skyline 0.24.1 shared",
  lengthMeters:0,renderChunks:0,panels:0,
  trueDepthMeters:.58,newMeshes:0,newDrawCalls:0,
  triangles:0,highTier:!lowMemory,metalAtlasShared:true,
  sourceLightReused:true,originalMeshBatches:foundation.stats().drawBatches,
  newColliders:0,worldLightsAdded:0,postprocessPassesAdded:0,
  physicsUnchanged:true,GRIPUnchanged:true,roadUnchanged:true,
  railUnchanged:true,shipUnchanged:true,
  skylineUnchanged:true,auroraUnchanged:true};
 try{
  for(let k=0;k<20;k++){
   const chunk=root.children[k];
   if(!chunk?.children?.some(c=>c.name==="DARK METAL ENCLOSURE"))
    throw Error("missing original chunk "+k);
   const data=buildVaultArchitectureData0272(positionAt,k,{lowMemory});
   for(const [name,part,mat] of [
    ["SKYLINE REAL-DEPTH HARDSURFACE_PANELS",data.primary,metal],
    ...(!lowMemory?[["SKYLINE SERVICE CONDUITS",data.detail,conduit]]:[])
   ]){
    if(!part?.positions?.length)continue;
    const mesh=new THREE.Mesh(geometry(THREE,part),mat);
    mesh.name=name;mesh.frustumCulled=true;
    mesh.castShadow=false;mesh.receiveShadow=false;
    chunk.add(mesh);generated.push(mesh);
    status.newMeshes++;status.newDrawCalls++;
   }
   status.triangles+=data.totalTriangles;
   status.panels+=data.plateCount;
   status.renderChunks++;
  }
  status.active=true;status.status="active";
  status.lengthMeters=ARC;
 }catch(e){
  for(const mesh of generated){
   mesh.removeFromParent();mesh.geometry?.dispose?.();
  }
  metal.dispose();conduit?.dispose();
  console.warn("SKYSHIFT 0.27.2 full-lap panel geometry fallback",e);
  return fallback("original 0.27.1 preserved: "+String(e?.message||e));
 }
 let strength=1,disposed=false;
 return {active:true,stats:()=>({...status,strength}),
  setComparison(x){
   strength=clamp(x);
   for(const mesh of generated)mesh.visible=strength>.5;
  },
  dispose(){
   if(disposed)return;disposed=true;
   for(const mesh of generated){mesh.removeFromParent();mesh.geometry?.dispose?.();}
   metal.dispose();conduit?.dispose();
  }
 };
}
