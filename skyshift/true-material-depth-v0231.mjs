// SKYSHIFT 0.23.1 — True Material Depth & Reflection Rebuild
// Real geometry replacement (high tier) + engineered distinct metal finishes.
// 0.23.0 remains opt-out comparison. No new mesh/draw, no new lighting source,
// no road/ship/camera/GRIP/physics edits. External solar seal stays Basic.
import {installPhysicalMaterialRebuild,buildPhysicalMaterialFrames}
 from "./physical-material-rebuild-v0230.mjs";
import {buildStructuralTunnelData}
 from "./structural-tunnel-v0213.mjs";
import {buildTunnelNeonLocalData}
 from "./cinematic-neon-lighting-v0220p2.mjs";

export const TRUE_MATERIAL_0231=Object.freeze({
 version:"0.23.1",pass:"True Material Depth & Reflection Rebuild",
 referenceStart:78,referenceEnd:304,
 physicallyRaisedInsertDepth:.58,previousInsertDepth:.34,
 finish:"deep graphite insert / stepped satin-titanium bevel / black inset / milled trim",
 newMeshes:0,addedDrawBatches:0,newLights:0,newTextures:0,
 newColliders:0,newRenderPasses:0,solarSealed:true,
 physicsUnchanged:true,cameraUnchanged:true,gripUnchanged:true,
 roadUnchanged:true,shipUnchanged:true,
 lowMemoryGeometry:"unchanged",comparison:"?trueDepth=classic"
});
const clamp=(v)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const roles=[["HARDSURFACE_PANELS","panel"],["STRUCTURAL_CONDUITS","conduit"],
 ["CLOSED_SHELL","shell"],["CURVED_RIBS","rib"]];
const RGB={
 panel:[.024,.034,.047],conduit:[.032,.044,.060],
 shell:[.015,.024,.036],rib:[.053,.066,.082]
};
// Pixel colors are authored in linear HDR before the existing OutputPass.
// Material class comes from real geometry's existing glowWeight attribute.
export function patchTrueMaterialDepthShader(vertex,fragment,{
 role="panel",mobile=false
}={}){
 if(!(role in RGB))throw Error("0.23.1 unknown metal category");
 const anchor="diffuseColor.rgb=mix(p23Original,p23Result,p23Mix);";
 if(!fragment.includes(anchor)||!fragment.includes("vec3 rbTint=rebirthPalette();")||
    !fragment.includes("varying float vRebirthClass;")||
    !fragment.includes("float p23WallLight=")||
    !fragment.includes("float p23RoofLight=")||
    !fragment.includes("#include <common>"))
  throw Error("0.23.1 requires sun-isolated 0.23.0 material chain");
 const roleColor=RGB[role].map(x=>x.toFixed(3)).join(",");
 const lines=[
  "float d31Strength=uTrueDepth0231*p23Gallery;",
  "if(d31Strength>0.0001){",
  " // Real facet classification: plate, stepped bevel, inset reveal and rib.",
  " float d31Face=1.0-step(0.001,abs(vRebirthClass-0.008));",
  " float d31Bevel=1.0-step(0.0015,abs(vRebirthClass-0.004));",
  " float d31Milled=1.0-step(0.0008,abs(vRebirthClass-0.003));",
  " float d31Support=step(0.009,vRebirthClass);",
  " float d31Recess=1.0-step(0.001,vRebirthClass);",
  " float d31View=clamp(abs(dot(normalize(vRebirthNormal),",
  " normalize(cameraPosition-vRebirthPosition))),0.0,1.0);",
  " float d31Glance=pow(1.0-d31View,2.15);",
  " float d31Near=max(p23WallLight,p23RoofLight);",
  " float d31Brush=sin(vRebirthTrack*"+(mobile?"3.2":"9.7")+
   "+vNeonLocalSection.y*"+(mobile?"1.4":"3.8")+");",
  " float d31Micro=(1.0-smoothstep(26.0,82.0,p23Distance));",
  " float d31Macro=.88+.15*sin(vRebirthTrack*.12+vNeonLocalSection.y*.24);",
  " vec3 d31Body=vec3("+roleColor+")*",
  "  (d31Macro+.024*d31Micro*d31Brush);",
  " vec3 d31Dark=vec3(.004,.007,.012);",
  " vec3 d31Satin=vec3(.095,.119,.147);",
  " vec3 d31Machined=vec3(.135,.162,.188);",
  " float d31EdgeBoost=pow(max(d31Near,0.0),0.72);",
  " float d31ShapeSpec=(.19+.58*d31Glance)*d31EdgeBoost;",
  " vec3 d31Chrome=rbTint*(d31ShapeSpec*",
  "  ("+(mobile?".22":".34")+")+",
  "  .035*d31Near);",
  // Most of the wall stays dark graphite: the source reflects strongly
  // on *actual* beveled facet normals, not as a bright wall-wide flat fill.
  " vec3 d31FaceColor=d31Body+rbTint*",
  "  ((.034+.066*d31Glance)*d31Near);",
  " vec3 d31EdgeColor=d31Satin*(.83+.27*d31View)+",
  "  d31Chrome*(.65+.35*d31Glance);",
  " vec3 d31CutColor=d31Machined+d31Chrome*1.17;",
  " vec3 d31SupportColor=mix(d31Body,d31Satin,.44)+",
  "  d31Chrome*.43;",
  " vec3 d31Out=d31Body;",
  " d31Out=mix(d31Out,d31FaceColor,d31Face);",
  " d31Out=mix(d31Out,d31EdgeColor,d31Bevel);",
  " d31Out=mix(d31Out,d31CutColor,d31Milled);",
  " d31Out=mix(d31Out,d31SupportColor,d31Support);",
  " d31Out=mix(d31Out,d31Dark,d31Recess);",
  // Do not emit the bright white crest. Native zone palette only,
  // with explicit HDR cap before original bloom and tone mapping.
  " d31Out=clamp(d31Out,vec3(.002),vec3(.44));",
  " diffuseColor.rgb=mix(diffuseColor.rgb,d31Out,d31Strength);",
  "}"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment
  .replace("#include <common>",
   "#include <common>\nuniform float uTrueDepth0231;")
  .replace(anchor,anchor+"\n"+lines)};
}

export function installTrueMaterialShader(material,uniforms,{role,mobile}={}){
 if(!material?.isMeshBasicMaterial||!RGB[role]||
  typeof material.onBeforeCompile!=="function")
  throw Error("0.23.1 expects original Basic-material solar isolation");
 const previous=material.onBeforeCompile;
 const originalCache=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  try{
   const patch=patchTrueMaterialDepthShader(shader.vertexShader,
    shader.fragmentShader,{role,mobile});
   Object.assign(shader.uniforms,uniforms);
   shader.fragmentShader=patch.fragmentShader;
  }catch(e){
   // Future shader-chain changes must not crash game boot.
   console.warn("SKYSHIFT 0.23.1 shader fallback",e);
  }
 };
 material.customProgramCacheKey=function(){
  return originalCache.call(this)+"-true-depth-0231-"+role+
   (mobile?"-mobile":"-high");
 };
 material.needsUpdate=true;
}

export function buildTrueDepthGeometry(THREE,positionAt,options={}){
 if(!THREE?.BufferGeometry||!THREE?.Float32BufferAttribute||
  typeof positionAt!=="function")throw Error("0.23.1 frame invalid");
 // Same 22 m cohesive bays and same underlying curve as 0.21.4.
 const data=buildStructuralTunnelData(positionAt,{
  ...options,flowCohesion:true,depthStudy:true,lowMemory:false
 });
 if(!data.depthStudy||data.primary.triangles<1)
  throw Error("0.23.1 raised panel geometry not created");
 const array=data.primary,geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(array.positions,3));
 geo.setAttribute("color",new THREE.Float32BufferAttribute(array.colors,3));
 geo.setAttribute("trackS",new THREE.Float32BufferAttribute(array.trackS,1));
 geo.setAttribute("glowWeight",new THREE.Float32BufferAttribute(array.glowWeight,1));
 geo.computeVertexNormals();
 geo.computeBoundingSphere();
 // This is essential: old 0.23.0 neon/GGX attributes are per-vertex.
 // A geometry swap without re-deriving them breaks WebGL or produces light
 // response tied to the wrong panel after a banked turn.
 const local=buildTunnelNeonLocalData(geo,positionAt);
 const frames=buildPhysicalMaterialFrames(geo,positionAt);
 geo.setAttribute("neonLocalSection",
  new THREE.Float32BufferAttribute(local.coordinates,2));
 geo.setAttribute("physicalRight023",
  new THREE.Float32BufferAttribute(frames.right,3));
 geo.setAttribute("physicalUp023",
  new THREE.Float32BufferAttribute(frames.up,3));
 return {geometry:geo,triangles:array.triangles,vertices:frames.vertices,
  bankedFrames:frames.frames,referenceStart:TRUE_MATERIAL_0231.referenceStart,
  referenceEnd:TRUE_MATERIAL_0231.referenceEnd};
}

export function installTrueMaterialDepthRebuild(THREE,world,options={}){
 const base=installPhysicalMaterialRebuild(THREE,world,options);
 const old=base.stats();
 if(!old.physicalMaterial023Enabled||
    old.physicalMaterial023Status!=="active")return {
   ...base,
   stats(){return {...base.stats(),trueDepth0231Enabled:false,
    trueDepth0231Status:"base-not-active"};},
   setTrueDepthComparison(){}
  };
 const lowMemory=!!options.lowMemory;
 const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const meshes=roles.filter(([name])=>!lowMemory||
  name!=="STRUCTURAL_CONDUITS").map(([name,role])=>({
   role,mesh:group?.children.find(m=>m.name==="Tunnel / "+name)
  }));
 // Preflight geometry/materials, fail safely to the unmodified 0.23.0.
 if(meshes.some(({mesh})=>!mesh?.material?.isMeshBasicMaterial||
     !mesh.geometry?.getAttribute?.("neonLocalSection")||
     !mesh.geometry?.getAttribute?.("glowWeight"))){
  return {...base,
   stats(){return {...base.stats(),trueDepth0231Enabled:false,
    trueDepth0231Status:"original-mesh-missing"};},
   setTrueDepthComparison(){}
  };
 }
 let prepared=null;
 try{
  if(!lowMemory)prepared=buildTrueDepthGeometry(THREE,options.positionAt,options);
 }catch(e){
  console.warn("SKYSHIFT 0.23.1 geometry fallback to 0.23.0",e);
  return {...base,
   stats(){return {...base.stats(),trueDepth0231Enabled:false,
    trueDepth0231Status:"geometry-fallback",trueDepth0231Error:String(e)};},
   setTrueDepthComparison(){}
  };
 }
 const panel=meshes.find(x=>x.role==="panel").mesh;
 const classicGeometry=panel.geometry;
 const grade={uTrueDepth0231:{value:1}};
 for(const {role,mesh} of meshes)
  installTrueMaterialShader(mesh.material,grade,{role,mobile:lowMemory});
 if(prepared)panel.geometry=prepared.geometry;
 const state={
  trueDepth0231Enabled:true,trueDepth0231Status:"active",
  trueDepth0231MaterialRoles:meshes.length,trueDepth0231GeometrySwap:!lowMemory,
  trueDepth0231PreviousTriangles:classicGeometry.getAttribute("position").count/3,
  trueDepth0231Triangles:prepared?.triangles??0,
  trueDepth0231NewVertices:prepared?.vertices??0,
  trueDepth0231BankedFrames:prepared?.bankedFrames??0,
  trueDepth0231AddedDrawBatches:0,
  trueDepth0231SolarSealed:true,trueDepth0231PhysicsUnchanged:true
 };
 return {...base,
  stats(){return {...base.stats(),...state,version:"0.23.1",
    trueDepth0231Strength:grade.uTrueDepth0231.value};},
  setTrueDepthComparison(value){
   const v=clamp(value);
   grade.uTrueDepth0231.value=v;
   if(prepared)panel.geometry=v>0.5?prepared.geometry:classicGeometry;
  },
  dispose(){
   // The old geometry is retained solely for exact A/B; dispose both once.
   base.dispose?.();
   if(prepared&&panel.geometry!==classicGeometry)
    classicGeometry.dispose?.();
   if(prepared&&panel.geometry!==prepared.geometry)
    prepared.geometry.dispose?.();
  }
 };
}
