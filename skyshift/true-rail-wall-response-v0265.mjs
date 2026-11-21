// SKYSHIFT 0.26.5 — True Rail & Wall Local Light Response
// Native GGX on the EXISTING physical rail body and 0.26.1 wall coats.
// Unlike the old rail road-glint multiplier, this responds on real METAL.
// Only source-positioned, straight-safe local light; never scene-wide fill.
import {straightRanges02633,straightEdgeMask02633}
 from "./straight-only-edge-lighting-v02633.mjs";
import {railLipPosition02632} from "./edge-source-floor-bands-v02632.mjs";

export const TRUE_RAIL_WALL_0265=Object.freeze({
 version:"0.26.5",base:"0.26.4.3",comparison:"?railWallResponse=classic",
 railBody:"Angular integrated aero-barrier body",
 nativeRailMaterial:"original indexed MeshStandardMaterial; no overlay meshes",
 wallMaterial:"original local-lit MeshPhysicalMaterial + dark substrate",
 source:"0.26.3.3 visible 6.5m cyan lower inlays on authored straights",
 railSamplesHigh:2,railSamples4GB:1,
 wallExtraSamples:0,roofLightUnchanged:true,
 straightOnly:true,originalCyanInlaysUnchanged:true,
 noNewLights:true,noNewGeometry:true,noNewDrawCalls:true,
 noNewTextures:true,noNewRenderPasses:true,noSSR:true,noPMREM:true,
 solarSealUnchanged:true,roadUnchanged:true,shipUnchanged:true,
 gameplayUnchanged:true,gripUnchanged:true,collisionUnchanged:true
});
const COMMON="#include <common>";
const PROJECT="#include <project_vertex>";
const END="#include <lights_fragment_end>";
const ROUGH="roughnessFactor=mix(roughnessFactor,0.98,railBodyTunnelMask());";
const SPEC="reflectedLight.indirectSpecular*=mix(1.0,0.10,railBodyTunnelMask());";
const WALL="float f42Near=clamp(max(vLocalMask0261.x*0.85,vLocalMask0261.y),0.0,1.0);";
const BOUNCE="vec3 t43Bounce=vec3(0.028,0.138,0.187)*t43Cove+";
const WARM="vec3(0.205,0.077,0.018)*t43Warm;";
const GROUP="SKYSHIFT · Tunnel Megastructure 0.21.1";
const COAT="SKYSHIFT 0.26.0 P2 / true physical ";
const SUBSTRATES={panel:"HARDSURFACE_PANELS",rib:"CURVED_RIBS",
 shell:"CLOSED_SHELL",conduit:"STRUCTURAL_CONDUITS"};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const sq=x=>x*x;

// Use the SAME exact interval and 2.8m minimum as the 0.26.3.3 visible
// light polygons. A bay clipped out by a corner cannot reflect in that corner.
export function railFixtureIntervals0265(ranges=straightRanges02633()){
 const out=[];
 for(let s=4.5;s<367.65;s+=24){
  for(const {from,to} of ranges){
   const a=Math.max(s,from),b=Math.min(s+6.5,to);
   if(b-a>=2.8)out.push({from:a,to:b});
  }
 }
 return out;
}
const FACE=Object.freeze([.27,.90,1.0,.58,.16,.08,0,0]);
export function buildRailLocalSourceData0265(geometry,positionAt,{
 mobile=false,ranges=straightRanges02633()
}={}){
 const arc=geometry?.getAttribute?.("aBarrierArc");
 const pos=geometry?.getAttribute?.("position");
 if(!arc||!pos||arc.count!==pos.count||arc.count%16!==0||
  typeof positionAt!=="function")
  throw Error("0.26.5 requires original indexed eight-column aero rail");
 const intervals=railFixtureIntervals0265(ranges),n=arc.count,half=n/2;
 const A=new Float32Array(n*3),B=mobile?null:new Float32Array(n*3);
 const mask=new Float32Array(n),cache=new Map();let lit=0;
 function point(s,side){
  const key=s.toFixed(4)+":"+side;
  let p=cache.get(key);
  if(!p){
   p=railLipPosition02632(s,side,-.91,positionAt);
   cache.set(key,p);
  }
  return p;
 }
 for(let i=0;i<n;i++){
  const s=arc.getX(i),profile=i%8,side=i<half?-1:1;
  if(s<0||s>367.65||FACE[profile]===0)continue;
  const safe=straightEdgeMask02633(s,ranges);
  if(safe<=0)continue;
  let best=null,d=Infinity;
  for(const bay of intervals){
   const gap=s<bay.from?bay.from-s:s>bay.to?s-bay.to:0;
   if(gap<d){d=gap;best=bay;}
  }
  if(!best||d>9.0)continue;
  const center=clamp(s,best.from,best.to);
  const strength=safe*FACE[profile]*Math.exp(-sq(d/(mobile?5.0:6.25)));
  if(strength<.0005)continue;
  const s0=mobile?center:clamp(center-1.25,best.from,best.to);
  const s1=mobile?center:clamp(center+1.25,best.from,best.to);
  const p0=point(s0,side),p1=mobile?null:point(s1,side);
  A.set([p0.x,p0.y,p0.z],i*3);
  if(B)B.set([p1.x,p1.y,p1.z],i*3);
  mask[i]=strength;lit++;
 }
 return {a:A,b:B,mask,vertices:n,litVertices:lit,
  intervals:intervals.length,uniqueSources:cache.size};
}
function railSample0265(source,weight,mobile){
 const id="r65"+source;
 return [
  "{",
  " IncidentLight "+id+";",
  " "+id+".visible=true;",
  " "+id+".direction=normalize(v"+id+"+vec3(0.00001));",
  " float "+id+"Dist=length(v"+id+");",
  " "+id+".color=vec3(0.035,0.51,0.83)*",
  " (r65MetalResponse*"+weight.toFixed(3)+"*"+
   (mobile?"3.9":"5.0")+
   "/(1.0+pow("+id+"Dist/"+(mobile?"2.9":"3.4")+",2.0)));",
  " vec3 "+id+"Diffuse=reflectedLight.directDiffuse;",
  " RE_Direct("+id+",geometryPosition,geometryNormal,geometryViewDir,",
  "  geometryClearcoatNormal,material,reflectedLight);",
  " reflectedLight.directDiffuse="+id+"Diffuse;",
  "}"
 ].join("\n");
}
export function patchRailBody0265(vertex,fragment,{mobile=false}={}){
 for(const k of [COMMON,PROJECT])if(!vertex.includes(k))
  throw Error("0.26.5 rail vertex missing "+k);
 for(const k of [COMMON,ROUGH,SPEC,"railBodyTunnelMask()",
  "uniform float uRailBodyContainment;",END])if(!fragment.includes(k))
  throw Error("0.26.5 requires sealed original metal rail: "+k);
 const attrs=[
  "attribute vec3 aRailSourceA0265;",
  ...(mobile?[]:["attribute vec3 aRailSourceB0265;"]),
  "attribute float aRailSourceMask0265;",
  "varying vec3 vr65A;",
  ...(mobile?[]:["varying vec3 vr65B;"]),
  "varying float vr65Mask;"
 ].join("\n");
 const assign=[
  "vr65A=(viewMatrix*vec4(aRailSourceA0265,1.0)).xyz-mvPosition.xyz;",
  ...(mobile?[]:["vr65B=(viewMatrix*vec4(aRailSourceB0265,1.0)).xyz-mvPosition.xyz;"]),
  "vr65Mask=aRailSourceMask0265;"
 ].join("\n");
 const fdecl=[
  "uniform float uTrueRailWall0265;",
  "varying vec3 vr65A;",
  ...(mobile?[]:["varying vec3 vr65B;"]),
  "varying float vr65Mask;"
 ].join("\n");
 // Only the small visible metal bevel next to a REAL strip regains
 // gloss and metalness. The old anti-sunlight seal remains on every
 // other rail pixel, including corners and the track outside the tunnel.
 const gloss=[
  ROUGH,
  "float r65Local=clamp(vr65Mask,0.0,1.0)*uTrueRailWall0265*railBodyTunnelMask();",
  "roughnessFactor=mix(roughnessFactor,"+(mobile?"0.45":"0.38")+",r65Local*0.94);",
  "metalnessFactor=mix(metalnessFactor,0.52,r65Local*0.92);"
 ].join("\n");
 const taps=[
  SPEC,
  "// Native GGX is evaluated AFTER the legacy white-sun specular suppression.",
  "// Never reopen the global environment-light path.",
  "float r65MetalResponse=clamp(vr65Mask,0.0,1.0)*uTrueRailWall0265*railBodyTunnelMask();",
  "if(r65MetalResponse>0.001){",
  railSample0265("A",mobile?1:.5,mobile),
  ...(mobile?[]:[railSample0265("B",.5,mobile)]),
  "}"
 ].join("\n");
 return {
  vertexShader:vertex.replace(COMMON,COMMON+"\n"+attrs)
   .replace(PROJECT,PROJECT+"\n"+assign.replaceAll("vr65A","vr65A").replaceAll("vr65B","vr65B")),
  fragmentShader:fragment.replace(COMMON,COMMON+"\n"+fdecl)
   .replace(ROUGH,gloss).replace(SPEC,taps
     .replaceAll("vr65A","vr65A").replaceAll("vr65B","vr65B"))
 };
}
// Wall response uses the already validated 0.26.1 multiple-source physical
// GGX on 0.26.4.3 materials: NO additional shader light samples.
// It is controlled by the wall-facing LOCAL section, the original finite
// strip mask and an explicit roof cutout (y above 24m).
export function patchPhysicalWall0265(vertex,fragment,{role="panel",mobile=false}={}){
 if(!["panel","rib"].includes(role))throw Error("unsupported 0.26.5 wall coat");
 for(const k of [COMMON,WALL,"RE_Direct(l261Cool,geometryPosition",
  "RE_Direct(l261Warm,geometryPosition","varying vec2 vPbrSection0260;",
  "varying vec2 vLocalMask0261;","uniform float uFixtureTransport02643;"])
  if(!fragment.includes(k))throw Error("0.26.5 missing 0.26.1/0.26.4.3 wall GGX "+k);
 const mask=[
  "#include <metalnessmap_fragment>",
  "float r65Face=1.0-smoothstep(20.5,24.0,vPbrSection0260.y);",
  "float r65Side=smoothstep(12.5,19.6,abs(vPbrSection0260.x));",
  "float r65WallC=clamp(vLocalMask0261.x,0.0,1.0)*r65Face*r65Side;",
  "float r65WallW=clamp(vLocalMask0261.y,0.0,1.0)*r65Face*r65Side;",
  "roughnessFactor=max(0.20,roughnessFactor-"+
   (mobile?"0.038":"0.085")+"*max(r65WallC,r65WallW)*uTrueRailWall0265);"
 ].join("\n");
 // Outside the 0.26.2 roughness-atlas if-block, so GGX samples can
 // read the wall masks later in lights_fragment_maps at every quality tier.
 let next=fragment.replace(COMMON,COMMON+"\nuniform float uTrueRailWall0265;")
  .replace("#include <metalnessmap_fragment>",mask);
 next=next.replaceAll("RE_Direct(l261Cool,geometryPosition",
  "l261Cool.color*=mix(vec3(1.0),vec3("+
   (mobile?"1.09,1.10,1.11":"1.23,1.32,1.36")+
   "),uTrueRailWall0265*r65WallC);\nRE_Direct(l261Cool,geometryPosition");
 next=next.replaceAll("RE_Direct(l261Warm,geometryPosition",
  "l261Warm.color*=mix(vec3(1.0),vec3("+
   (mobile?"1.10,1.11,1.10":"1.31,1.30,1.24")+
   "),uTrueRailWall0265*r65WallW);\nRE_Direct(l261Warm,geometryPosition");
 return {vertexShader:vertex,fragmentShader:next};
}
export function patchSubstrateWall0265(vertex,fragment,{role="panel",mobile=false}={}){
 if(!(role in SUBSTRATES)||!fragment.includes(COMMON)||
  !fragment.includes(BOUNCE)||!fragment.includes(WARM)||
  !fragment.includes("float t43Cove=")||
  !fragment.includes("float t43Warm=")||
  !fragment.includes("float t43Face="))
  throw Error("0.26.5 requires pre-masked 0.26.4.3 wall substrate");
 const cool=mobile?1.13:1.38,warm=mobile?1.12:1.35;
 return {vertexShader:vertex,fragmentShader:fragment
  .replace(COMMON,COMMON+"\nuniform float uTrueRailWall0265;")
  .replace(BOUNCE,"vec3 t43Bounce=vec3(0.028,0.138,0.187)*"+
   "mix(1.0,"+cool.toFixed(2)+",uTrueRailWall0265)*t43Cove+")
  .replace(WARM,"vec3(0.205,0.077,0.018)*"+
   "mix(1.0,"+warm.toFixed(2)+",uTrueRailWall0265)*t43Warm;")};
}
export function wrapShader0265(material,uniform,kind,opts={}){
 const prop=kind==="rail"?"isMeshStandardMaterial":
  kind==="wall"?"isMeshPhysicalMaterial":"isMeshBasicMaterial";
 if(!material?.[prop]||typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.26.5 expected original "+kind+" material");
 const prior=material.onBeforeCompile,key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  prior.call(this,shader,renderer);
  const fn=kind==="rail"?patchRailBody0265:
   kind==="wall"?patchPhysicalWall0265:patchSubstrateWall0265;
  const p=fn(shader.vertexShader,shader.fragmentShader,opts);
  shader.vertexShader=p.vertexShader;shader.fragmentShader=p.fragmentShader;
  shader.uniforms.uTrueRailWall0265=uniform;
 };
 material.customProgramCacheKey=function(){
  return key.call(this)+"-local-rail-wall-0265-"+kind+"-"+
   (opts.role||"body")+(opts.mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=prior;
  material.customProgramCacheKey=key;material.needsUpdate=true;};
}
export function installTrueRailWallResponse0265(THREE,world,{
 enabled=true,lowMemory=false,positionAt,identitySurface=null,
 stationWorld=null,fixtureTransport=null,straightEdges=null
}={}){
 const fallback=reason=>({active:false,setComparison(){},dispose(){},
  stats:()=>({railWall0265Active:false,railWall0265Status:reason})});
 if(!enabled)return fallback("classic");
 if(!fixtureTransport?.stats?.().fixtureTransport02643Active||
  !straightEdges?.stats?.().straightEdges02633Active||
  !stationWorld?.stats?.().localReflections0261Enabled||
  !identitySurface?.getRailBodyContainment)
  return fallback("original 0.26.1 finite GGX / 0.26.4.3 / straight rail missing");
 const rail=world?.getObjectByName?.(TRUE_RAIL_WALL_0265.railBody);
 const group=world?.getObjectByName?.(GROUP);
 const coats=["panel","rib"].filter(role=>!lowMemory||role==="panel")
  .map(role=>({kind:"wall",role,mesh:group?.children?.find(x=>x.name===COAT+role)}));
 const basics=Object.entries(SUBSTRATES).filter(([role])=>!lowMemory||role!=="conduit")
  .map(([role,name])=>({kind:"substrate",role,
   mesh:group?.children?.find(x=>x.name==="Tunnel / "+name)}));
 if(!rail?.material?.isMeshStandardMaterial||
  !rail.geometry?.getAttribute?.("aBarrierArc")||
  [...coats,...basics].some(x=>!x.mesh?.material))
  return fallback("original rail or physical wall materials missing");
 let data;
 try{data=buildRailLocalSourceData0265(rail.geometry,positionAt,
  {mobile:lowMemory});}
 catch(e){console.warn("SKYSHIFT 0.26.5 no rail fixture source geometry",e);
  return fallback("rail-source-geometry-failed");}
 if(data.litVertices<1)return fallback("no authored straight inlays");
 const flags=[
  ["aRailSourceA0265",data.a,3],
  ...(!lowMemory?[["aRailSourceB0265",data.b,3]]:[]),
  ["aRailSourceMask0265",data.mask,1]
 ];
 const installed=[],undos=[],strength={value:1};
 try{
  for(const [name,arr,size] of flags){
   rail.geometry.setAttribute(name,new THREE.Float32BufferAttribute(arr,size));
   installed.push(name);
  }
  undos.push(wrapShader0265(rail.material,strength,"rail",{mobile:lowMemory}));
  for(const item of [...coats,...basics])
   undos.push(wrapShader0265(item.mesh.material,strength,item.kind,
    {role:item.role,mobile:lowMemory}));
 }catch(e){
  for(const u of undos.reverse())u();
  for(const n of installed)rail.geometry.deleteAttribute(n);
  console.warn("SKYSHIFT 0.26.5 preserving previous sealed metal",e);
  return fallback("original-material-patch-failed");
 }
 const state={
  railWall0265Active:true,railWall0265Status:"active",
  railWall0265Version:"0.26.5",
  railWall0265RailMaterial:"MeshStandardMaterial",
  railWall0265WallPhysicalCount:coats.length,
  railWall0265WallSubstrateCount:basics.length,
  railWall0265RailVertices:data.vertices,
  railWall0265LitVertices:data.litVertices,
  railWall0265SourceIntervals:data.intervals,
  railWall0265NativeGGXSamples:lowMemory?1:2,
  railWall0265RoofProtected:true,railWall0265CurveProtected:true,
  railWall0265OriginalContainment:identitySurface.getRailBodyContainment(),
  railWall0265AddedDrawCalls:0,railWall0265NewDynamicLights:0,
  railWall0265SolarSealUnchanged:true,railWall0265GRIPUnchanged:true,
  railWall0265PhysicsUnchanged:true,railWall0265LowMemory:!!lowMemory
 };
 return {active:true,setComparison(x){strength.value=clamp(x);},
  stats:()=>({...state,railWall0265Strength:strength.value}),
  dispose(){strength.value=0;for(const u of undos.reverse())u();
   for(const n of installed)rail.geometry.deleteAttribute(n);}
 };
}
