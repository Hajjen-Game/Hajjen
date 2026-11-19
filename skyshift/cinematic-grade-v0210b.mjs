// SKYSHIFT 0.21.0 / Phase B — material and light response, not another corridor.
// Operates on the *unchanged* 0.21.0-A megastructure: physically shaded hulls,
// tightly-baked wall light return and selective road-near static sheen.
// This pass touches no road meshes, collisions, camera, input or GRIP physics.
import {HERO_0210,planCinematicHero,installCinematicHero}
 from "./cinematic-hero-v0210.mjs";

export const CINEMATIC_GRADE_0210B=Object.freeze({
 id:"cinematic-environment-0210-b",version:"0.21.0-B",
 base:HERO_0210.id,comparison:"?cinematicGrade=classic",
 staticLightResponse:true,lightmapApproach:"road-conforming vertex geometry",
 hullMetalness:.50,hullRoughness:.68,
 facetMetalness:.54,facetRoughness:.60,
 noEnvironmentProbe:true,addedDynamicLights:0,addedRenderPasses:0,
 newRoadMaterial:false,newRoadColliders:0,globalExposureChange:0,
 globalFogChange:0,shipOrGRIPChange:0,
 qualityBatchCeiling:7,mobileBatchCeiling:5
});

const linear=c=>{const x=c/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4};
const rgb=hex=>[linear(hex>>16&255),linear(hex>>8&255),linear(hex&255)];
// More metal surface hierarchy, less opaque cobalt wall; no fake glass boxes.
// All swatches are authored as sRGB, converted to linear vertex colors.
const C=Object.freeze({
 bezel:0x2b4f68,bezelLow:0x10283e,bezelHigh:0x6089a3,
 darkCyan:0x09304c,darkPink:0x2d0d2a,
 warmSpec:0xc8dcf0,coolSpec:0x61b9df,
 wallCyan:0x1b5879,wallPink:0x6e2249,
 roofCyan:0x104267,reflectionCyan:0x1885a9,
 reflectionPink:0x9a225c,nearlyBlack:0x020712
});
function gradedSurfaces(positionAt){
 const groups=Object.fromEntries(["BEVEL","BOUNCE","SHEEN"].map(n=>[n,{positions:[],colors:[]}]));
 const bays=planCinematicHero().bays;
 function triangle(material,pts,cols){
  const target=groups[material];
  if(!target)throw Error("Unexpected cinematic grade material");
  for(let j=0;j<3;j++){
   const [x,y,s]=pts[j];
   if(!Number.isFinite(x+y+s)||s<HERO_0210.start||s>HERO_0210.end||
     (material!=="SHEEN"&&Math.abs(x)<14.35&&y<25.6&&y>-6.25)||
     (material==="SHEEN"&&(y<.09||y>.19||Math.abs(x)<6.9||Math.abs(x)>11.55)))
    throw Error("0.21.0-B overlay clearance/position: "+[material,x,y,s].join(","));
   const p=positionAt(s,x,y);
   if(!Number.isFinite(p.x+p.y+p.z))
    throw Error("Invalid curved architectural light sample");
   target.positions.push(p.x,p.y,p.z);
   target.colors.push(...rgb(cols[j]));
  }
 }
 const quad=(mat,points,colors)=>{
  triangle(mat,[points[0],points[1],points[2]],[colors[0],colors[1],colors[2]]);
  triangle(mat,[points[0],points[2],points[3]],[colors[0],colors[2],colors[3]]);
 };
 for(const {kind,index:i,start:a,end:b} of bays){
  for(const side of [-1,1]){
   const p=(x,y,s)=>[side*x,y,s];
   // A slim *material bevel* on the existing sloping 0.21.0-A ceiling
   // instead of another flat luminous line or suspended square.
   quad("BEVEL",[
    p(15.77,30.62,a+.22),p(10.02,33.48,a+.22),
    p(10.02,33.48,b-.22),p(15.77,30.62,b-.22)
   ],[C.bezelLow,C.bezelHigh,C.bezel,C.bezelLow]);
   // A thin satin ridge makes the actual diagonal wall panel legible;
   // importantly this is a metal edge, NOT an added glowing rectangle.
   if(kind!=="PANORAMA"){
    const ridge=a+((i%3)+1)*3.05;
    quad("BEVEL",[
     p(14.53,22.72,a+.25),p(17.57,23.52,ridge),
     p(17.57,24.06,ridge),p(14.53,23.02,a+.25)
    ],[C.bezelLow,C.bezelHigh,C.bezel,C.bezelLow]);
   }
   // Cross-light that glances along the pressure hull's real diagonal
   // faces: two triangles with a smooth authored per-vertex fade.
   if(kind!=="PANORAMA"){
    const split=a+((i%3)+1)*3.05;
    const epsilon=.048;
    quad("BOUNCE",[
     p(14.55-epsilon,8.10,a+.12),
     p(17.6-epsilon,10.2,split),
     p(17.6-epsilon,23.5,split),
     p(14.55-epsilon,22.7,a+.12)
    ],[C.wallPink,C.darkPink,C.darkCyan,C.roofCyan]);
    quad("BOUNCE",[
     p(17.65-epsilon,10.3,split),
     p(14.6-epsilon,8.1,b-.12),
     p(14.6-epsilon,22.75,b-.12),
     p(17.65-epsilon,23.5,split)
    ],[C.darkPink,C.wallPink,C.roofCyan,C.darkCyan]);
   }else{
    // Observatory stays genuinely open; illuminate the upper sill only.
    quad("BOUNCE",[
     p(15.74,24.14,a+.2),p(18.60,26.22,a+.2),
     p(18.60,26.22,b-.2),p(15.74,24.14,b-.2)
    ],[C.darkCyan,C.wallCyan,C.wallCyan,C.darkCyan]);
   }
   // Large, legible roof bounce in cathdrals; restrained elsewhere.
   if(["CATHEDRAL","ENGINE","BREACH","GATE"].includes(kind)){
    quad("BOUNCE",[
     p(15.72,30.72,a+.5),p(10.14,33.59,a+.5),
     p(10.14,33.59,b-.5),p(15.72,30.72,b-.5)
    ],[C.darkCyan,C.wallCyan,C.wallCyan,C.darkCyan]);
   }
   // Narrow selective *fake* light return, directly on original road.
   // No render-to-texture, no road shader mutation, and no infinite stripes.
   if([1,4,7,10,13,16].includes(i)){
    const s0=a+1.8,s1=b-1.4;
    quad("SHEEN",[
     p(10.65,.145,s0),p(8.70,.146,s0+1.8),
     p(8.12,.146,s1),p(10.35,.145,s1-2.1)
    ],[C.nearlyBlack,C.reflectionPink,C.nearlyBlack,C.reflectionPink]);
    quad("SHEEN",[
     p(11.05,.141,s0+.6),p(10.28,.141,s0+2),
     p(9.98,.141,s1-2.0),p(10.85,.141,s1-.5)
    ],[C.nearlyBlack,C.reflectionCyan,C.reflectionCyan,C.nearlyBlack]);
   }
  }
 }
 return groups;
}
const disposeGroup=group=>group?.traverse(o=>{
 o.geometry?.dispose();
 if(Array.isArray(o.material))o.material.forEach(m=>m?.dispose());
 else o.material?.dispose();
});
export function installCinematicGradeHero(THREE,world,options={}){
 const base=installCinematicHero(THREE,world,options);
 const original=base.stats();
 if(!original.active)return base;
 const parent=world.getObjectByName("SKYSHIFT · Cinematic Megastructure 0.21.0-A");
 if(!parent)throw Error("Phase B: missing original world-art parent");
 const state={
  ...original,version:CINEMATIC_GRADE_0210B.version,
  variant:"cinematic-material-light",gradeActive:false,metallicHull:false,
  bakedLightBounce:false,staticRoadSheen:false,
  addedDynamicLights:0,addedRenderPasses:0,
  roadMeshUntouched:true,originalGRIPUntouched:true,
  comparativeGrade:CINEMATIC_GRADE_0210B.comparison,
  materialProfile:"angled titanium / selective satin alloy",
  sceneExposureUnchanged:true,sceneFogUnchanged:true
 };
 const old=[];
 const overlays=new THREE.Group();
 overlays.name="SKYSHIFT · Material & Light Response 0.21.0-B";
 try{
  const hull=parent.children.find(m=>m.name.endsWith("/ HULL"));
  const facet=parent.children.find(m=>m.name.endsWith("/ FACET"));
  if(!hull||!facet)throw Error("Missing Phase A architecture meshes");
  const modify=(mesh,metalness,roughness)=>{
   const previous=mesh.material;
   const next=new THREE.MeshStandardMaterial({
    color:0xffffff,vertexColors:true,side:THREE.DoubleSide,
    metalness,roughness,
    emissive:0x081929,emissiveIntensity:.18,
    flatShading:true
   });
   old.push([mesh,previous]);
   mesh.material=next;
  };
  modify(hull,CINEMATIC_GRADE_0210B.hullMetalness,
   CINEMATIC_GRADE_0210B.hullRoughness);
  modify(facet,CINEMATIC_GRADE_0210B.facetMetalness,
   CINEMATIC_GRADE_0210B.facetRoughness);
  const surfaces=gradedSurfaces(options.positionAt);
  for(const kind of ["BEVEL","BOUNCE","SHEEN"]){
   if(kind==="SHEEN"&&options.lowMemory)continue;
   const surface=surfaces[kind];
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute("position",new THREE.Float32BufferAttribute(surface.positions,3));
   geometry.setAttribute("color",new THREE.Float32BufferAttribute(surface.colors,3));
   geometry.computeVertexNormals();
   geometry.computeBoundingSphere();
   let material;
   if(kind==="BEVEL")material=new THREE.MeshStandardMaterial({
    color:0xffffff,vertexColors:true,metalness:.44,roughness:.56,
    emissive:0x14283b,emissiveIntensity:.10,side:THREE.DoubleSide
   });
   else material=new THREE.MeshBasicMaterial({
    color:0xffffff,vertexColors:true,side:THREE.DoubleSide,
    toneMapped:false,transparent:true,depthWrite:false,
    depthTest:true,
    opacity:kind==="BOUNCE"?(options.lowMemory?.16:.23):.13,
    blending:THREE.AdditiveBlending,
    polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-1
   });
   const mesh=new THREE.Mesh(geometry,material);
   mesh.name="Architectural light / "+kind;
   mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=true;
   if(kind==="SHEEN")mesh.renderOrder=1;
   else if(kind==="BOUNCE")mesh.renderOrder=2;
   overlays.add(mesh);
   state.trianglesRendered+=surface.positions.length/9;
   state.drawBatches++;
  }
  parent.add(overlays);
  for(const [,material] of old)material.dispose();
  state.gradeActive=true;
  state.metallicHull=true;
  state.bakedLightBounce=true;
  state.staticRoadSheen=!options.lowMemory;
  state.gradeDrawBatches=overlays.children.length;
  state.geometryResources=state.drawBatches;
  state.materialResources=state.drawBatches;
 }catch(error){
  disposeGroup(overlays);
  for(const [mesh,previous] of old){
   if(mesh.material!==previous)mesh.material.dispose();
   mesh.material=previous;
  }
  state.status="fallback-materials";
  state.gradeError=String(error?.message??error);
 }
 return {
  ready:base.ready,
  stats:()=>({...state}),
  dispose(){base.dispose();}
 };
}
