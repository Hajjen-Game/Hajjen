// SKYSHIFT 0.23.0 — Physical Material & Lighting Rebuild / Pass 1.
// A/b-testable 220 m reference gallery for properly separated titanium,
// graphite, bevels and recesses, with analytic GGX illumination coming ONLY
// from existing neon rails. Retains the 0.21.2 MeshBasicMaterial solar seal.
// No environment/sun/hemisphere light, new scene lights, textures, collider,
// mesh, changed road/ship shader, camera, GRIP or physics.
import {installCinematicNeonLighting}
 from "./cinematic-neon-lighting-v0220p2.mjs";

export const PHYSICAL_MATERIAL_0230=Object.freeze({
 version:"0.23.0",pass:"1 — Physical Material Reference Gallery",
 referenceStart:78,referenceEnd:304,transitionMeters:20,
 shaderModel:"bank-correct local GGX metal / controlled spectral neon",
 preserveSolarIsolation:true,oldShellMaterial:"MeshBasicMaterial",
 targeted:["HARDSURFACE_PANELS","STRUCTURAL_CONDUITS",
  "CLOSED_SHELL","CURVED_RIBS"],
 newMeshes:0,newDrawCalls:0,newLights:0,newRenderPasses:0,
 newTextures:0,newColliders:0,roadShaderUnchanged:true,
 shipShaderUnchanged:true,cameraUnchanged:true,
 gripUnchanged:true,physicsUnchanged:true,
 mobile:"reduced analytic response, no additional vertex attributes",
 comparison:"?physicalMaterial=classic"
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const roles={panel:"HARDSURFACE_PANELS",conduit:"STRUCTURAL_CONDUITS",
 shell:"CLOSED_SHELL",rib:"CURVED_RIBS"};
const roleRough={panel:.51,conduit:.34,shell:.64,rib:.40};
const roleBody={
 panel:[.022,.029,.039],conduit:[.027,.036,.047],
 shell:[.018,.025,.035],rib:[.030,.040,.051]
};

/** Local right and up vectors are derived from the actual banked track frame.
 * No new vertices or positions, just optional attributes for specular lighting.
 * The tiny orthogonalization step avoids camera-dependent fixed world lights.
 */
export function buildPhysicalMaterialFrames(geometry,positionAt){
 const arc=geometry?.getAttribute?.("trackS");
 const xyz=geometry?.getAttribute?.("position");
 if(!arc||!xyz||arc.count!==xyz.count||typeof positionAt!=="function")
  throw Error("0.23.0 missing original tunnel arc/position/frame");
 const right=new Float32Array(arc.count*3);
 const up=new Float32Array(arc.count*3);
 const frames=new Map();
 const delta=(a,b)=>[a.x-b.x,a.y-b.y,a.z-b.z];
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const unit=a=>{
  const length=Math.hypot(...a);
  if(!Number.isFinite(length)||length<.00001)
   throw Error("0.23.0 invalid track lighting frame");
  return a.map(v=>v/length);
 };
 for(let i=0;i<arc.count;i++){
  const s=arc.getX(i);
  if(!Number.isFinite(s))throw Error("0.23.0 non-finite arc");
  let frame=frames.get(s);
  if(!frame){
   const origin=positionAt(s,0,0);
   const rawRight=delta(positionAt(s,1,0),origin);
   const rawUp=delta(positionAt(s,0,1),origin);
   const r=unit(rawRight),p=dot(rawUp,r);
   const u=unit(rawUp.map((x,j)=>x-r[j]*p));
   frame={r,u};
   frames.set(s,frame);
  }
  for(let j=0;j<3;j++){
   right[i*3+j]=frame.r[j];
   up[i*3+j]=frame.u[j];
  }
 }
 return {right,up,vertices:arc.count,frames:frames.size};
}

export function patchPhysicalMaterialShader(vertex,fragment,{
 role="panel",mobile=false
}={}){
 if(!roles[role])throw Error("0.23.0 invalid metal role");
 const common="#include <common>",begin="#include <begin_vertex>";
 const anchor="diffuseColor.rgb+=uCinematicNeonMix*uRebirthMaterial*cinemaBounce;";
 if(!vertex.includes(common)||!vertex.includes(begin)||
    !fragment.includes(common)||!fragment.includes(anchor)||
    !fragment.includes("vec3 rbTint=rebirthPalette();")||
    !fragment.includes("varying vec2 vNeonLocalSection;")||
    !fragment.includes("varying vec3 vRebirthNormal;"))
  throw Error("0.23.0 requires active Pass 1+2 sun-sealed metal shader");
 const attr=mobile?"":[
  "attribute vec3 physicalRight023;",
  "attribute vec3 physicalUp023;",
  "varying vec3 vPhysicalRight023;",
  "varying vec3 vPhysicalUp023;"
 ].join("\n");
 const assign=mobile?"":[
  "vPhysicalRight023=physicalRight023;",
  "vPhysicalUp023=physicalUp023;"
 ].join("\n");
 const fDeclare=[
  "uniform float uPhysical023;",
  ...(mobile?[]:["varying vec3 vPhysicalRight023;",
   "varying vec3 vPhysicalUp023;"]),
  // GGX NDF + Smith masking: zero neutral sun light, only local emitter vectors.
  "float physicalGGX023(vec3 n,vec3 v,vec3 l,float rough){",
  " vec3 h=normalize(v+l+vec3(0.00001));",
  " float nv=max(abs(dot(n,v)),0.08);",
  " float nl=max(dot(n,l),0.0);",
  " float nh=max(dot(n,h),0.0);",
  " float alpha=max(rough*rough,0.06);",
  " float aa=alpha*alpha;",
  " float denom=nh*nh*(aa-1.0)+1.0;",
  " float distribution=aa/(3.14159*denom*denom+0.0001);",
  " float k=(rough+1.0)*(rough+1.0)*0.125;",
  " float geometry=(nv/(nv*(1.0-k)+k))*",
  "  (nl/(nl*(1.0-k)+k));",
  " return min(1.3,distribution*geometry/(4.0*nv*max(nl,0.05)))*nl;",
  "}"
 ].join("\n");
 const c=roleBody[role].map(x=>x.toFixed(3)).join(",");
 const rough=roleRough[role].toFixed(2);
 const body=[
  "// A framed study bay: 20 m ramps to keep the rest of the world as A/B.",
  "float p23Gallery=smoothstep(78.0,98.0,vRebirthTrack)*",
  " (1.0-smoothstep(284.0,304.0,vRebirthTrack));",
  "float p23Mix=uPhysical023*p23Gallery;",
  "if(p23Mix>0.0001){",
  " vec3 p23Original=diffuseColor.rgb;",
  " float p23Distance=length(cameraPosition-vRebirthPosition);",
  " float p23Detail=1.0-smoothstep(24.0,94.0,p23Distance);",
  // Near-field brushed milling (attenuated by distance to prevent moire).
  " float p23Brush=sin(vRebirthTrack*"+(mobile?"3.0":"12.0")+
   "+vNeonLocalSection.y*"+(mobile?"1.1":"2.8")+");",
  " float p23Large=0.5+0.5*sin(vRebirthTrack*0.23+",
  "  vNeonLocalSection.y*0.31);",
  " float p23Facing=clamp(abs(dot(normalize(vRebirthNormal),",
  "  normalize(cameraPosition-vRebirthPosition))),0.0,1.0);",
  " float p23Rough=clamp("+rough+"+0.060*p23Large+",
  "  0.020*p23Brush*p23Detail,0.24,0.78);",
  " float p23Cavity=rbCavity;",
  " float p23Edge=rbBevel;",
  " vec3 p23Body=vec3("+c+");",
  " p23Body*=mix(0.79,1.19,p23Facing);",
  " p23Body*=0.91+0.16*p23Large+0.042*p23Brush*p23Detail;",
  " p23Body*=1.0-0.68*p23Cavity;",
  " p23Body+=vec3(0.010,0.013,0.018)*p23Edge;",
  // Distances refer to real pre-existing side and crown neon strips.
  " float p23X=vNeonLocalSection.x;",
  " float p23Y=vNeonLocalSection.y;",
  " float p23WallX=sign(p23X)*23.2;",
  " float p23RoofX=sign(p23X)*8.7;",
  " vec2 p23WallOffset=vec2(p23WallX-p23X,16.4-p23Y);",
  " vec2 p23RoofOffset=vec2(p23RoofX-p23X,27.9-p23Y);",
  " float p23WallD=length(p23WallOffset);",
  " float p23RoofD=length(p23RoofOffset);",
  " float p23WallLight=exp(-0.5*pow(p23WallD/7.0,2.0));",
  " float p23RoofLight=exp(-0.5*pow(p23RoofD/6.2,2.0));",
  " float p23ArchLight=cinemaArch*0.52;",
  " vec3 p23Tint=clamp(rbTint,vec3(0.0),vec3(0.82));",
  " float p23Diffuse=.17*p23WallLight+.18*p23RoofLight+",
  "  .035*p23ArchLight;",
  " float p23Spec=0.0;",
  ...(mobile?[
   // No additional vertex attributes or expensive dynamic world basis.
   "p23Spec=(0.08*p23WallLight+0.05*p23RoofLight)*",
   " pow(1.0-p23Facing,1.7)*(1.0-p23Rough*.45);"
  ]:[
   "vec3 p23R=normalize(vPhysicalRight023);",
   "vec3 p23U=normalize(vPhysicalUp023);",
   "vec3 p23N=normalize(vRebirthNormal);",
   "if(!gl_FrontFacing)p23N=-p23N;",
   "vec3 p23V=normalize(cameraPosition-vRebirthPosition);",
   "vec3 p23Lw=normalize(p23R*p23WallOffset.x+",
   " p23U*p23WallOffset.y+vec3(0.00001));",
   "vec3 p23Lr=normalize(p23R*p23RoofOffset.x+",
   " p23U*p23RoofOffset.y+vec3(0.00001));",
   "float p23GgxWall=physicalGGX023(p23N,p23V,p23Lw,p23Rough);",
   "float p23GgxRoof=physicalGGX023(p23N,p23V,p23Lr,p23Rough);",
   "float p23Fresnel=0.36+0.55*pow(1.0-p23Facing,5.0);",
   "p23Spec=p23Fresnel*(.50*p23WallLight*p23GgxWall+",
   " .42*p23RoofLight*p23GgxRoof);",
   "p23Spec+=p23Edge*(.045*p23WallLight+.04*p23RoofLight);"
  ]),
  "vec3 p23Result=p23Body+",
  " p23Tint*(p23Diffuse+p23Spec)*",
  " (1.0-0.70*p23Cavity);",
  "p23Result=clamp(p23Result,vec3(0.001),vec3(0.73));",
  "diffuseColor.rgb=mix(p23Original,p23Result,p23Mix);",
  "}"
 ].join("\n");
 return {
  vertexShader:vertex.replace(common,common+"\n"+attr)
   .replace(begin,begin+"\n"+assign),
  fragmentShader:fragment.replace(common,common+"\n"+fDeclare)
   .replace(anchor,anchor+"\n"+body)
 };
}

export function installPhysicalMaterialShader(material,uniforms,{
 role="panel",mobile=false
}={}){
 if(!roles[role]||typeof material?.onBeforeCompile!=="function"||
    typeof material?.customProgramCacheKey!=="function")
  throw Error("0.23.0 invalid existing tunnel material");
 const previous=material.onBeforeCompile;
 const cache=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  Object.assign(shader.uniforms,uniforms);
  const patched=patchPhysicalMaterialShader(shader.vertexShader,
   shader.fragmentShader,{role,mobile});
  shader.vertexShader=patched.vertexShader;
  shader.fragmentShader=patched.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return cache.call(this)+"-skyshift-physical0230-"+role+
   (mobile?"-lite":"-full");
 };
 material.needsUpdate=true;
}

export function installPhysicalMaterialRebuild(THREE,world,options={}){
 const base=installCinematicNeonLighting(THREE,world,options);
 const status=base.stats();
 if(!status.active||!status.cinematicNeonEnabled)return {
  ...base,stats(){return {...base.stats(),physicalMaterial023Enabled:false,
   physicalMaterial023Status:"base-not-active"};},
  setPhysicalComparison(){}
 };
 const expected=options.lowMemory?3:4;
 try{
  const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
  const meshes=Object.entries(roles).filter(([role])=>!options.lowMemory||
   role!=="conduit").map(([role,name])=>{
   const mesh=group?.children.find(x=>x.name==="Tunnel / "+name);
   if(!mesh?.material?.isMeshBasicMaterial||
      !mesh?.geometry?.getAttribute?.("neonLocalSection"))
    throw Error("0.23.0: missing original sun-sealed geometry: "+name);
   return {role,mesh};
  });
  if(meshes.length!==expected)throw Error("0.23.0: missing physical batches");
  // Prepare every buffer before changing any shader. On a 4GB device,
  // GPU and memory costs stay comparable to the existing 0.22.0 finish.
  const prepared=options.lowMemory?[]:meshes.map(({mesh})=>
   buildPhysicalMaterialFrames(mesh.geometry,options.positionAt));
  const uniform={uPhysical023:{value:1}};
  meshes.forEach(({role,mesh},i)=>{
   if(!options.lowMemory){
    mesh.geometry.setAttribute("physicalRight023",
     new THREE.Float32BufferAttribute(prepared[i].right,3));
    mesh.geometry.setAttribute("physicalUp023",
     new THREE.Float32BufferAttribute(prepared[i].up,3));
   }
   installPhysicalMaterialShader(mesh.material,uniform,{role,
    mobile:!!options.lowMemory});
  });
  const state={
   physicalMaterial023Enabled:true,physicalMaterial023Status:"active",
   physicalMaterial023Version:"0.23.0",
   physicalMaterial023Batches:meshes.length,
   physicalMaterial023ReferenceStart:PHYSICAL_MATERIAL_0230.referenceStart,
   physicalMaterial023ReferenceEnd:PHYSICAL_MATERIAL_0230.referenceEnd,
   physicalMaterial023FrameVertices:prepared.reduce((n,p)=>n+p.vertices,0),
   physicalMaterial023LowMemory:!!options.lowMemory,
   physicalMaterial023AddedDrawCalls:0,physicalMaterial023SolarSealed:true,
   physicalMaterial023NoPhysicsChanges:true
  };
  return {...base,
   stats(){return {...base.stats(),...state,
    physicalMaterial023Strength:uniform.uPhysical023.value,
    version:"0.23.0"};},
   setPhysicalComparison(value){uniform.uPhysical023.value=clamp(value);}
  };
 }catch(e){
  const message=String(e?.message||e);
  console.warn("SKYSHIFT 0.23.0 physical material reverted to Pass 4",message);
  return {...base,
   stats(){return {...base.stats(),physicalMaterial023Enabled:false,
    physicalMaterial023Status:"fallback",physicalMaterial023Error:message};},
   setPhysicalComparison(){}
  };
 }
}
