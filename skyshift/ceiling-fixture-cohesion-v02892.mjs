// SKYSHIFT 0.28.9.2 — Ceiling Fixture Placement & Glow Cohesion.
// Replace (do not overlay) the 0.26.0 cyan cove / amber wall markers that
// protruded across the raised panels. The little cyan T caps are removed.
// Every emitter now follows an ORIGINAL 0.24.1 panel-facet joint on the
// original banked Skyline source sampler; Vault's ten modules reuse it.
// Only Vault >=0.28.9.2 is altered. No new meshes, lights, reflection passes,
// road/ship/physics edits or global bloom/exposure changes.
import {TUNNEL_PORTALS_0211,tunnelProfilePoint0211}
 from "./tunnel-megastructure-v0211.mjs";
import {sharedPanelSeamPoint02894,sharedWaveColors02894}
 from "./unified-tunnel-light-sources-v02894.mjs";
import {ZONE_PALETTES,ZONE_WAVE}
 from "./zone-wave-v060.mjs";

const MODEL="SKYSHIFT · Tunnel Megastructure 0.21.1";
const COVE="SKYSHIFT 0.26.0 / stable cyan cove emitters";
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const CEILING_FIXTURE_02892=Object.freeze({
 version:"0.28.9.2",name:"Ceiling Fixture Placement & Glow Cohesion",
 source:"original 0.26.0 cove and warm practical, replaced in place",
 placement:"j11 upper-wall/roof panel joint, j9 side-wall panel joint",
 originalCovePerSource:20,originalWarmPerSource:20,
 removedFloatingTAccentsPerHighSource:20,
 palette:"ZONE_PALETTES.light from the original zone-wave-v060",
 sourceModules:10,trackLength:3400,
 extraDrawCalls:0,extraMeshes:0,extraLights:0,extraPasses:0,
 untouched:"metal GGX, 0.28.7 arch feet, 0.28.9.1 edge lights, driving",
 comparison:"?track=vault&v=0.28.9.2&ceilingFixtures=classic"
});
export function ceilingFixtureEnabled02892(search=
 typeof location!=="undefined"?location.search:""){
 const p=new URLSearchParams(search||"");
 if(p.get("track")!=="vault"||
  ["off","classic"].includes(p.get("ceilingFixtures")))return false;
 const v=/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(p.get("v")||"");
 if(!v)return false;
 const [a,b,c,d]=v.slice(1).map(x=>Number(x||0));
 return a>0||b>28||(b===28&&(c>9||(c===9&&d>=2)));
}
// The panel sculptor sweeps the SOURCE profile between the original facets:
// j10/11 is the upper wall-to-roof reveal; j8/9 a real wall-panel reveal.
// Offset inward by the original 0.26.0 cove clearance to expose the source
// IN the groove, without drawing a white rectangle over the metal face.
export function panelSeamPoint02892(positionAt,s,side,kind,offset=0){
 return sharedPanelSeamPoint02894(positionAt,s,side,kind,offset);
}
// Alpha is vertex-local and falls to zero around the original source
// endpoints. Separate low-alpha shoulders stay IN the same physical batch;
// the fixture is an inset source with a halo, never a floating white T cap.
export function buildCeilingFixtureGeometry02892(THREE,positionAt,{
 lowMemory=false}={}){
 if(!THREE?.BufferGeometry||!THREE?.Float32BufferAttribute)
  throw Error("0.28.9.2 real Three buffer geometry required");
 const positions=[],colors=[],arc=[],alpha=[],warm=[];
 let cyanStrips=0,warmStrips=0,cores=0,haloQuads=0;
 function vertex(p,s,isWarm,a){
  positions.push(p.x,p.y,p.z);
  const tint=isWarm?[1,.55,.20]:[.18,.81,1];
  colors.push(...tint);arc.push(s);alpha.push(clamp(a));
  warm.push(isWarm?1:0);
 }
 function quad(s0,s1,side,kind,isWarm,offset0,offset1,a0,a1,b0,b1){
  const v=[
   panelSeamPoint02892(positionAt,s0,side,kind,offset0),
   panelSeamPoint02892(positionAt,s0,side,kind,offset1),
   panelSeamPoint02892(positionAt,s1,side,kind,offset1),
   panelSeamPoint02892(positionAt,s1,side,kind,offset0)
  ];
  for(const i of [0,1,2,0,2,3]){
   const ss=i<2?s0:s1;
   vertex(v[i],ss,isWarm,[a0,a1,b1,b0][i]);
  }
 }
 function source(portal,side,isWarm){
  const start=portal+(isWarm?2.4:2.0);
  const end=Math.min(portal+(isWarm?5.1:16.0),
   isWarm?367.1:367.2);
  if(end-start<.8)return;
  const kind=isWarm?"wall":"upper";
  const steps=Math.max(isWarm?3:4,Math.ceil((end-start)/(lowMemory?4.8:3.0)));
  const fade=(s)=>clamp(Math.min((s-start)/.7,(end-s)/.7),.035,1);
  for(let i=0;i<steps;i++){
   const s0=start+(end-start)*i/steps,
    s1=start+(end-start)*(i+1)/steps,
    f0=fade(s0),f1=fade(s1);
   quad(s0,s1,side,kind,isWarm,-.075,.075,
    .98*f0,.98*f0,.98*f1,.98*f1);
   cores++;
   // Recessed semi-transparent roll-off, no freestanding diffuse box.
   for(const [a,b,x,y] of [
    [-.43,-.075,.015,.23],[.075,.43,.23,.015]]){
    quad(s0,s1,side,kind,isWarm,a,b,
     x*f0,y*f0,x*f1,y*f1);
    haloQuads++;
   }
  }
 }
 for(const portal of TUNNEL_PORTALS_0211){
  if(portal+2.8>367.2)continue;
  for(const side of [-1,1]){
   source(portal,side,false);cyanStrips++;
   source(portal,side,true);warmStrips++;
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
 geometry.setAttribute("fixtureTrackS02892",
  new THREE.Float32BufferAttribute(arc,1));
 geometry.setAttribute("fixtureAlpha02892",
  new THREE.Float32BufferAttribute(alpha,1));
 geometry.setAttribute("fixtureWarm02892",
  new THREE.Float32BufferAttribute(warm,1));
 geometry.computeBoundingSphere();
 return {geometry,cyanStrips,warmStrips,
  detachedTAccents:0,coreQuads:cores,haloQuads,
  triangles:positions.length/9,lowMemory:!!lowMemory};
}
const COMMON="#include <common>",BEGIN="#include <begin_vertex>",
 COLOR="#include <color_fragment>";
export function patchCeilingFixtureShader02892(vertex,fragment){
 if(typeof vertex!=="string"||typeof fragment!=="string"||
  !vertex.includes(COMMON)||!vertex.includes(BEGIN)||
  !fragment.includes(COMMON)||!fragment.includes(COLOR))
  throw Error("0.28.9.2 original cove shader anchors missing");
 const v=vertex.replace(COMMON,COMMON+"\n"+[
  "attribute float fixtureTrackS02892;",
  "attribute float fixtureAlpha02892;",
  "attribute float fixtureWarm02892;",
  "varying float vF92Arc;",
  "varying float vF92Alpha;",
  "varying float vF92Warm;"
 ].join("\n")).replace(BEGIN,BEGIN+"\n"+
  "vF92Arc=fixtureTrackS02892;"+
  "vF92Alpha=fixtureAlpha02892;vF92Warm=fixtureWarm02892;");
 const f=fragment.replace(COMMON,COMMON+"\n"+[
  "uniform vec3 uF92Old;",
  "uniform vec3 uF92Next;",
  "uniform float uF92Front;",
  "uniform float uF92Active;",
  "uniform float uF92Start;",
  "uniform float uF92Scale;",
  "uniform float uF92Lap;",
  "varying float vF92Arc;",
  "varying float vF92Alpha;",
  "varying float vF92Warm;"
 ].join("\n")).replace(COLOR,COLOR+"\n"+[
  "// Real shared 3400m spatial front; identical palette and 66m feather.",
  "float f92S=uF92Start+vF92Arc*uF92Scale;",
  "float f92Signed=mod(f92S-uF92Front+.5*uF92Lap,uF92Lap)-.5*uF92Lap;",
  "float f92Mix=uF92Active*(1.0-smoothstep(-"+
   ZONE_WAVE.atmosphereTransitionMeters.toFixed(1)+","+
   ZONE_WAVE.atmosphereTransitionMeters.toFixed(1)+",f92Signed));",
  "vec3 f92Tint=mix(uF92Old,uF92Next,clamp(f92Mix,0.0,1.0));",
  "// A minor amber component retains the original warm fixture identity.",
  "f92Tint=mix(f92Tint,vec3(1.0,.57,.25),vF92Warm*.16);",
  "float f92Core=smoothstep(.36,.90,vF92Alpha);",
  "diffuseColor.rgb=f92Tint*(1.10+.34*f92Core);",
  "diffuseColor.a*=clamp(vF92Alpha,0.0,1.0);"
 ].join("\n"));
 return {vertexShader:v,fragmentShader:f};
}
const inactive=reason=>({active:false,reason,updateWave(){},
 stats:()=>({active:false,version:"0.28.9.2",reason}),dispose(){}});
export function installCeilingFixtureCohesion02892(THREE,section,positionAt,module,{
 enabled=false,lowMemory=false,trackLength=3400
}={}){
 if(!enabled)return inactive("classic or older release");
 const model=section?.getObjectByName?.(MODEL);
 const mesh=model?.children?.find(m=>m.name===COVE);
 if(!mesh?.material?.isMeshBasicMaterial||!mesh?.geometry||
  typeof positionAt!=="function"||
  !Number.isFinite(module?.start)||!Number.isFinite(module?.scale)||
  !Number.isFinite(trackLength)||trackLength<=0)
  throw Error("0.28.9.2 original cove, real sampler or module missing");
 const generated=buildCeilingFixtureGeometry02892(THREE,positionAt,{lowMemory});
 if(generated.cyanStrips!==20||generated.warmStrips!==20)
  throw Error("0.28.9.2 original two-sided source cadence lost");
 const oldGeometry=mesh.geometry,material=mesh.material;
 const before=material.onBeforeCompile,
  oldKey=material.customProgramCacheKey;
 const oldProps={transparent:material.transparent,depthWrite:material.depthWrite,
  blending:material.blending};
 const uniform={
  uF92Old:{value:new THREE.Color(ZONE_PALETTES[0].light)},
  uF92Next:{value:new THREE.Color(ZONE_PALETTES[0].light)},
  uF92Front:{value:-10000},uF92Active:{value:0},
  uF92Start:{value:module.start},uF92Scale:{value:module.scale},
  uF92Lap:{value:trackLength}
 };
 try{
  material.onBeforeCompile=function(shader,renderer){
   before.call(this,shader,renderer);
   const patched=patchCeilingFixtureShader02892(
    shader.vertexShader,shader.fragmentShader);
   shader.vertexShader=patched.vertexShader;
   shader.fragmentShader=patched.fragmentShader;
   Object.assign(shader.uniforms,uniform);
  };
  material.customProgramCacheKey=function(){
   return oldKey.call(this)+"-ceiling-seam-wave-02892-"+(lowMemory?"4GB":"High");
  };
  material.transparent=true;
  material.depthWrite=false;
  material.blending=THREE.NormalBlending;
  mesh.geometry=generated.geometry;
  material.needsUpdate=true;
 }catch(e){
  mesh.geometry=oldGeometry;
  material.onBeforeCompile=before;material.customProgramCacheKey=oldKey;
  Object.assign(material,oldProps);
  generated.geometry.dispose();
  throw e;
 }
 let disposed=false;
 return {
  active:true,
  updateWave(wave){
   const stage=sharedWaveColors02894(wave);
   uniform.uF92Old.value.setHex(stage.from);
   uniform.uF92Next.value.setHex(stage.to);
   uniform.uF92Front.value=stage.front;
   uniform.uF92Active.value=stage.active;
  },
  stats:()=>({active:true,version:"0.28.9.2",
   cyanStrips:generated.cyanStrips,warmStrips:generated.warmStrips,
   removedTAccents:lowMemory?0:20,
   panelJointUpper:11,panelJointWall:9,coreQuads:generated.coreQuads,
   haloQuads:generated.haloQuads,
   triangles:generated.triangles,sourceGeometryReplaced:true,
   sameMeshAndDrawCall:mesh.geometry===generated.geometry,
   waveStageColors:[uniform.uF92Old.value.getHex(),
    uniform.uF92Next.value.getHex()],
   waveFront:uniform.uF92Front.value,
   worldStart:module.start,worldScale:module.scale,
   lowMemory:!!lowMemory,addedLights:0,addedMeshes:0,
   addedDrawCalls:0,addedRenderPasses:0,
   originalPanelAndGGXIntact:true,physicsUntouched:true}),
  dispose(){
   if(disposed)return;disposed=true;
   mesh.geometry=oldGeometry;
   material.onBeforeCompile=before;
   material.customProgramCacheKey=oldKey;
   Object.assign(material,oldProps);
   material.needsUpdate=true;
   generated.geometry.dispose();
  }
 };
}
