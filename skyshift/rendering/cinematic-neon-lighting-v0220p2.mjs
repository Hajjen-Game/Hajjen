// SKYSHIFT 0.22.0 — Cinematic Visual Rebirth / Pass 2: Cinematic Neon Lighting
// Local neon bounce on ORIGINAL panel, inset, shell and rib materials.
// Uses actual road-relative cross-section coordinates from the SAME banked
// positionAt(s,lateral,height) used to build the mesh, NOT world-space y
// (which fails in banked curves). No added mesh, sun, shadow caster, clock,
// screen-space light pass, road/ship material swap, GRIP or flight changes.
import {installPremiumMaterialRebirth}
 from "./premium-material-rebirth-v0220.mjs";
import {TUNNEL_PORTALS_0211} from "../tunnel-megastructure-v0211.mjs";

export const CINEMATIC_NEON_0220_P2=Object.freeze({
 version:"0.22.0.2",pass:"2 — Cinematic Neon Lighting",
 id:"local-neon-reflection-p2",
 source:"existing-four-flow-lines-and-ten-neon-portals",
 bakedCrossSectionCoordinates:true,
 responsiveToNativeZoneWave:true,
 targetMeshes:["HARDSURFACE_PANELS","STRUCTURAL_CONDUITS",
  "CLOSED_SHELL","CURVED_RIBS"],
 peakColoredWallBounce:0.31,
 peakColoredPortalBounce:0.23,
 noWhiteSolarSpill:true,
 additionalMeshes:0,additionalDrawCalls:0,dynamicLights:0,
 postprocessPasses:0,addedTextures:0,newColliders:0,
 changesRoad:false,changesRail:false,changesShip:false,
 changesCamera:false,changesPhysics:false,changesGrip:false,
 comparison:"?cinematicNeon=classic"
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const PORTAL_GLSL=TUNNEL_PORTALS_0211.map(s=>
 "cinemaPortalD=min(cinemaPortalD,abs(vRebirthTrack-"+Number(s).toFixed(1)+"));" ).join("\n");

/**
 * Invert the track's original lateral/up basis in world space. In a banked
 * bend x(world) and y(world) do NOT mean lateral or ceiling height.
 * Each unique longitudinal track s computes only three basis points.
 * Geometry positions, normals, indices, collision and draw batching untouched.
 */
export function buildTunnelNeonLocalData(geometry,positionAt){
 const position=geometry?.getAttribute?.("position");
 const track=geometry?.getAttribute?.("trackS");
 if(!position||!track||track.count!==position.count||
    typeof positionAt!=="function")
  throw Error("0.22.0 P2: missing same-track geometry sampler");
 const coordinates=new Float32Array(position.count*2);
 const frameCache=new Map();
 for(let i=0;i<position.count;i++){
  const s=track.getX(i);
  let basis=frameCache.get(s);
  if(!basis){
   const a=positionAt(s,0,0),x=positionAt(s,1,0),y=positionAt(s,0,1);
   if(!a||!x||!y)throw Error("0.22.0 P2: missing banked reference");
   const lateral=[x.x-a.x,x.y-a.y,x.z-a.z];
   const vertical=[y.x-a.x,y.y-a.y,y.z-a.z];
   const dot=(p,q)=>p[0]*q[0]+p[1]*q[1]+p[2]*q[2];
   const aa=dot(lateral,lateral),bb=dot(lateral,vertical);
   const cc=dot(vertical,vertical),det=aa*cc-bb*bb;
   if(det<1e-9||!Number.isFinite(det))
    throw Error("0.22.0 P2: invalid track cross section");
   basis={center:a,lateral,vertical,aa,bb,cc,det};
   frameCache.set(s,basis);
  }
  const delta=[
   position.getX(i)-basis.center.x,
   position.getY(i)-basis.center.y,
   position.getZ(i)-basis.center.z];
  const dot=(p,q)=>p[0]*q[0]+p[1]*q[1]+p[2]*q[2];
  const ax=dot(delta,basis.lateral),ay=dot(delta,basis.vertical);
  const x=(ax*basis.cc-ay*basis.bb)/basis.det;
  const y=(ay*basis.aa-ax*basis.bb)/basis.det;
  if(!Number.isFinite(x)||!Number.isFinite(y))
   throw Error("0.22.0 P2: non-finite banked neon coordinate");
  coordinates[2*i]=x;coordinates[2*i+1]=y;
 }
 return {coordinates,frames:frameCache.size,vertices:position.count};
}

export function patchCinematicNeonShader(vertex,fragment,{mobile=false}={}){
 const common="#include <common>",begin="#include <begin_vertex>";
 const materialFinish="diffuseColor.rgb=mix(rbOriginal,rbFinish,uRebirthMaterial);";
 if(!vertex.includes(common)||!vertex.includes(begin)||
    !fragment.includes(common)||!fragment.includes(materialFinish)||
    !fragment.includes("vec3 rbTint=rebirthPalette();")||
    !fragment.includes("varying float vRebirthTrack;"))
  throw Error("0.22.0 P2: requires the corrected Pass 1 metal shader");
 const declaration=[
  "attribute vec2 neonLocalSection;",
  "varying vec2 vNeonLocalSection;"
 ].join("\n");
 const fragDecl=[
  "varying vec2 vNeonLocalSection;",
  "uniform float uCinematicNeonMix;"
 ].join("\n");
 const color=[
  "// Real tunnel local-space falloff around two wall flows and two crown flows.",
  "float cinemaSide=abs(vNeonLocalSection.x);",
  "float cinemaHeight=vNeonLocalSection.y;",
  "float cinemaWall=smoothstep(16.0,22.0,cinemaSide)*",
  " exp(-pow((cinemaHeight-15.35)/5.1,2.0));",
  "float cinemaRoof=(1.0-smoothstep(10.0,20.5,cinemaSide))*",
  " exp(-pow((cinemaHeight-27.6)/4.6,2.0));",
  // A single Gaussian per pixel samples nearest real existing arch.
  "float cinemaPortalD=1000.0;",
  PORTAL_GLSL,
  "float cinemaArch=exp(-0.5*pow(cinemaPortalD/7.5,2.0));",
  "float cinemaVault=smoothstep(5.0,14.0,cinemaHeight);",
  "float cinemaCavity=1.0-0.74*rbCavity;",
  "float cinemaGrazing=0.65+0.35*rbRim;",
  // Keep panels legible: nearby neon influences the face, not an entire
  // global fill or neutral white atmosphere.
  "float cinemaStrip=max(cinemaWall,cinemaRoof);",
  "float cinemaShape=(0.74+0.26*rbMacro)*cinemaCavity;",
  "float cinemaStripPower=cinemaStrip*"+
    (mobile?"0.205":"0.285")+"*cinemaShape;",
  "float cinemaArchPower=cinemaArch*cinemaVault*"+
    (mobile?"0.125":"0.185")+"*(0.67+0.33*cinemaGrazing);",
  "float cinemaEdgePower=cinemaStrip*rbBevel*"+
    (mobile?"0.055":"0.09")+";",
  // Use Pass 1's NON-white-core original zone palette. This does not
  // import the exterior/solar lighting and cannot make a white road patch.
  "vec3 cinemaSpectral=min(max(rbTint,vec3(0.0)),vec3(0.78));",
  "vec3 cinemaBounce=cinemaSpectral*",
  " (cinemaStripPower+cinemaArchPower+cinemaEdgePower);",
  "diffuseColor.rgb+=uCinematicNeonMix*uRebirthMaterial*cinemaBounce;"
 ].join("\n");
 return {
  vertexShader:vertex.replace(common,common+"\n"+declaration)
   .replace(begin,begin+"\n vNeonLocalSection=neonLocalSection;"),
  fragmentShader:fragment.replace(common,common+"\n"+fragDecl)
   .replace(materialFinish,materialFinish+"\n"+color)
 };
}

function appendCinematicShader(material,uniforms,{mobile=false}={}){
 if(!material||typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw Error("0.22.0 P2: shader-capable existing material required");
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  Object.assign(shader.uniforms,uniforms);
  const updated=patchCinematicNeonShader(shader.vertexShader,
   shader.fragmentShader,{mobile});
  shader.vertexShader=updated.vertexShader;
  shader.fragmentShader=updated.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return key.call(this)+"-cinematic-neon-lighting-0220p2"+
   (mobile?"-mobile":"-high");
 };
 material.needsUpdate=true;
}

export function installCinematicNeonLighting(THREE,world,options={}){
 const base=installPremiumMaterialRebirth(THREE,world,options);
 const old=base.stats();
 if(!old.active||!old.rebirthMaterialEnabled||
    old.rebirthMaterialStatus!=="active")return base;
 // Fail safely to the existing Pass 1 materials if geometry changes.
 // Never turn missing P2 art into another complete game-start failure.
 try {
  const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
  if(!group)throw Error("0.22.0 P2: missing original closed vault");
  const names=CINEMATIC_NEON_0220_P2.targetMeshes;
  const target=names.map(name=>group.children.find(m=>m.name==="Tunnel / "+name))
   .filter(m=>m&&!!m.material);
  const expected=options.lowMemory?3:4;
  if(target.length!==expected)
   throw Error("0.22.0 P2: material groups missing "+target.length+"/"+expected);
  const planned=target.map(mesh=>({
   mesh,prepared:buildTunnelNeonLocalData(mesh.geometry,options.positionAt)
  }));
  const control={value:1},uniforms={uCinematicNeonMix:control};
  let vertexCount=0,frameCount=0;
  for(const {mesh,prepared} of planned){
   mesh.geometry.setAttribute("neonLocalSection",
    new THREE.Float32BufferAttribute(prepared.coordinates,2));
   appendCinematicShader(mesh.material,uniforms,{
    mobile:!!options.lowMemory
   });
   vertexCount+=prepared.vertices;frameCount+=prepared.frames;
  }
  const state={
   cinematicNeonEnabled:true,cinematicNeonStatus:"active",
   cinematicNeonPass:"2",cinematicNeonVersion:"0.22.0.2",
   cinematicNeonMaterialBatches:planned.length,
   cinematicNeonVertices:vertexCount,
   cinematicNeonSampledFrames:frameCount,
   cinematicNeonNoNewDrawCalls:true,
   cinematicNeonNoNewLights:true,
   cinematicNeonNoWhiteSpill:true,
   cinematicNeonMobile:!!options.lowMemory,
   cinematicNeonCompare:CINEMATIC_NEON_0220_P2.comparison
  };
  return {
   ready:base.ready,
   stats(){return {...base.stats(),...state,
    version:"0.22.0.2",cinematicNeonStrength:control.value};},
   updateWave(wave){base.updateWave?.(wave)},
   updateMotion(frame){base.updateMotion?.(frame)},
   setMotionComparison(v){base.setMotionComparison?.(v)},
   setMotionSample(v){base.setMotionSample?.(v)},
   setMaterialComparison(v){base.setMaterialComparison?.(v)},
   setNeonComparison(v){control.value=clamp(v)},
   dispose(){base.dispose?.()}
  };
 } catch(error){
  const message=String(error?.message??error);
  console.warn("SKYSHIFT P2 neon fallback to Pass 1",message);
  return {
   ready:base.ready,
   stats(){return {...base.stats(),version:"0.22.0.2",
    cinematicNeonEnabled:false,cinematicNeonStatus:"fallback",
    cinematicNeonError:message};},
   updateWave(wave){base.updateWave?.(wave)},
   updateMotion(frame){base.updateMotion?.(frame)},
   setMotionComparison(v){base.setMotionComparison?.(v)},
   setMotionSample(v){base.setMotionSample?.(v)},
   setMaterialComparison(v){base.setMaterialComparison?.(v)},
   setNeonComparison(){},
   dispose(){base.dispose?.()}
  };
 }
}
