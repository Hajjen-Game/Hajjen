// SKYSHIFT 0.20.3 — World Art Pipeline
// An independently-authored, checked-in glTF asset is loaded ONCE.
// Authored glTF bay vertices are curved to the original road local frame;
// the 120 Hz game physics, steering, GRIP, rails and road mesh are untouched.
export const WORLD_ART_0203=Object.freeze({
 version:"dark-material-regrade-v0203",name:"CONTINUUM STATION · GRAPHITE RIBBON OBSERVATORY",
 mode:"graphite-regrade",classic:"?materialGrade=classic",
 assetPath:"../assets/worlds/continuum-graphite-bays-v5.gltf",
 track:"skyline",start:80,end:368,meters:288,bayLength:16,bayCount:18,
 materials:Object.freeze(["SHELL","INLAY","ENERGY","GLASS"]),
 variants:Object.freeze(["PANORAMA_START","PANORAMA_END","SERVICE","GATE"]),
 maxAssetBytes:305000,maxTrianglesPerAsset:2000,
 maxBatchesHigh:4,maxBatchesLow:3,
 addedColliders:0,addedPhysicsChanges:0,addedDynamicLights:0,
 addedRenderPasses:0,panoramicExterior:false,continuousRoof:true,
 structuralUnderdeck:true,enclosedCrossSection:true,
 observationGroupCount:3,windowBays:6,
 materialPass:"Dark Material Regrade",
 staticVertexPalette:true,noStationEmissiveFill:true,
 sceneLightsUnchanged:true,worldFogUnchanged:true,
 renderExposureUnchanged:true,shipMaterialsUnchanged:true,
 roadMaterialUnchanged:true,flightZoneColorsUnchanged:true,
 stationGeometryUnchanged:true,lowMemoryUsesSamePalette:true,
 continuousRibbonMeters:32,centerWindowMullions:0,
 sealedBayFakeGlassPanels:0,observationGlassOpacity:.048,
 windowGlassHeightMeters:7.26,windowGlassWidthMeters:15.9,
 unchangedHullClearance:true,unchangedGlobalLighting:true,unchangedRacing:true,
 windowsAreSelective:true
});
export function planStationWorld({track="skyline",lowMemory=false}={}){
 const c=WORLD_ART_0203;
 if(track!=="skyline")return {active:false,bays:[],stats:{
  active:false,track,mode:"none",bayCount:0,meters:0}};
 // Three paired observatories, separated by solid station bulkheads.
 const types=["GATE","SERVICE","SERVICE","PANORAMA_START","PANORAMA_END",
  "SERVICE","SERVICE","PANORAMA_START","PANORAMA_END",
  "SERVICE","SERVICE","SERVICE","PANORAMA_START",
  "PANORAMA_END","SERVICE","SERVICE","SERVICE","GATE"];
 if(types.length!==c.bayCount)throw Error("Skyshift: station segment plan mismatch");
 const bays=types.map((variant,i)=>({
  index:i,variant,start:c.start+i*c.bayLength,
  end:c.start+(i+1)*c.bayLength,
  center:c.start+(i+.5)*c.bayLength
 }));
 return {active:true,bays,stats:{track,mode:"graphite-regrade",lowMemory,
  version:c.version,bayCount:bays.length,meters:c.meters,
  start:c.start,end:c.end,variants:Object.fromEntries(
   c.variants.map(v=>[v,bays.filter(x=>x.variant===v).length])),
  panoramaWindowBays:bays.filter(x=>x.variant.startsWith("PANORAMA_")).length,
  openRoof:false,exteriorSpaceVisible:true,
  closedCeiling:true,continuousUnderdeck:true,
  newDynamicLights:0,roadMaterialRegraded:false,
  globalExposureUnchanged:true,shipMaterialRegraded:false,
  architecturalContrastTiers:3,
  enclosedInterior:true,sideWallInsideMeters:14.5,
  observationGroups:3,unbrokenSolidHallBays:bays.filter(x=>!x.variant.startsWith("PANORAMA_")).length,
  centerWindowMullions:0,glazingOnlyInRealObservations:true,
  observationLengthMeters:32,solidWallsWithoutFalseWindows:true,
  observationsArePaired:true,
  roofSoffitHeightMeters:28.6,
  windowFraction:Number((bays.filter(x=>x.variant.startsWith("PANORAMA_")).length/bays.length).toFixed(3)),
  windowsOnlyAtDesignedObservationBays:true,roadWidthChanged:false,
  physicsChanges:0,colliders:0,dynamicLights:0,extraRenderPasses:0}};
}
function disposeAll(root){
 const geometries=new Set(),materials=new Set();
 root?.traverse?.(obj=>{
  if(obj.geometry)geometries.add(obj.geometry);
  for(const mat of (Array.isArray(obj.material)?obj.material:[obj.material]))
   if(mat)materials.add(mat);
 });
 for(const geo of geometries)geo.dispose();
 for(const mat of materials)mat.dispose();
}
export function auditStationAsset(gltfScene){
 const nodes=new Map(),materials=new Set(),geometries=new Set(),
  images=new Set(),errors=[];
 let triangles=0,lights=0,skinned=0;
 gltfScene?.traverse?.(obj=>{
  if(obj.isLight)lights++;
  if(obj.isSkinnedMesh)skinned++;
  if(!obj.isMesh)return;
  if(nodes.has(obj.name))errors.push("Duplicate mesh "+obj.name);
  nodes.set(obj.name,obj);
  geometries.add(obj.geometry);
  const geometry=obj.geometry;
  triangles+=(geometry?.index?.count??geometry?.attributes?.position?.count??0)/3;
  for(const m of (Array.isArray(obj.material)?obj.material:[obj.material])){
   if(!m)continue;
   materials.add(m);
   for(const key of ["map","normalMap","roughnessMap","metalnessMap","emissiveMap"])
    if(m[key]?.image)images.add(m[key].image);
  }
 });
 for(const variant of WORLD_ART_0203.variants){
  for(const mat of WORLD_ART_0203.materials){
   const name=variant+"_"+mat;
   const mesh=nodes.get(name);
   // Solid service/gate bays deliberately have NO mock window material.
   if(mat==="GLASS"&&!variant.startsWith("PANORAMA_")){
    if(mesh)errors.push("Sealed bay contains fake glass: "+name);
    continue;
   }
   if(!mesh){errors.push("Missing glTF bay "+name);continue}
   if(!mesh.geometry?.attributes?.normal||!mesh.geometry?.attributes?.color)
    errors.push("Bay has no authored surface normals/vertex palette: "+name);
   if(mesh.geometry?.attributes?.position){
    const attr=mesh.geometry.attributes.position;
    for(let i=0;i<attr.count;i++){
     const x=attr.getX(i),y=attr.getY(i),z=attr.getZ(i);
     if(!Number.isFinite(x+y+z)||
      (Math.abs(x)<14.2&&y>-6.2&&y<25.5))
      {errors.push("Unsafe/invalid authored bay vertex "+name);break}
    }
   }
  }
 }
 if(nodes.size!==14)errors.push("Expected 14 correctly authored glTF ribbon meshes");
 if(triangles>WORLD_ART_0203.maxTrianglesPerAsset)
  errors.push("Station asset triangle budget exceeded");
 if(materials.size>4)errors.push("Station uses too many separate materials");
 if(images.size!==0)errors.push("First station asset must not need texture downloads");
 if(lights)errors.push("No imported dynamic light rigs");
 if(skinned)errors.push("Station art must be static");
 return {valid:errors.length===0,errors,nodes,
  meshes:nodes.size,triangles,materialCount:materials.size,
  textures:images.size,geometries:geometries.size,
  lights,skinned};
}
export function stationFrame(THREE,positionAt,s){
 const center=positionAt(s,0,0),r=positionAt(s,1,0),
  up=positionAt(s,0,1);
 const origin=new THREE.Vector3(center.x,center.y,center.z);
 const lateral=new THREE.Vector3(r.x-center.x,r.y-center.y,r.z-center.z).normalize();
 const normal=new THREE.Vector3(up.x-center.x,up.y-center.y,up.z-center.z).normalize();
 const back=new THREE.Vector3().crossVectors(lateral,normal).normalize();
 const orthogonalNormal=new THREE.Vector3().crossVectors(back,lateral).normalize();
 const basis=new THREE.Matrix4().makeBasis(lateral,orthogonalNormal,back);
 const transform=new THREE.Matrix4().setPosition(origin).multiply(basis);
 if(!Number.isFinite(transform.elements.reduce((s,v)=>s+v,0)))
  throw Error("Invalid Skyline road frame transform");
 return transform;
}
// Curve-conform the AUTHOR'S glTF vertices to the actual curved, banked road.
// A rigid 16m straight bay once left visible gaps in fast corners.
// By baking all 18 authored modules into one mesh per material, every shared
// seam maps to the exact same positionAt(s,lateral,height) road coordinate,
// and we need only 3/4 draw calls (not 9/12). The asset remains real glTF.
export function bakeTrackConformingBayGeometry(THREE,plan,nodes,kind,positionAt){
 const count=plan.bays.reduce((sum,bay)=>{
  const node=nodes.get(bay.variant+"_"+kind);
  if(kind==="GLASS"&&!bay.variant.startsWith("PANORAMA_"))return sum;
  if(!node?.geometry?.attributes?.position||
     !node?.geometry?.attributes?.color)
   throw Error("Station glTF missing authored positions/colors: "+bay.variant+"/"+kind);
  return sum+node.geometry.attributes.position.count;
 },0);
 if(!count)throw Error("Empty station material batch "+kind);
 const positions=new Float32Array(count*3),colors=new Float32Array(count*3);
 let n=0;
 for(const bay of plan.bays){
  const node=nodes.get(bay.variant+"_"+kind);
  if(kind==="GLASS"&&!node)continue;
  const attributes=node.geometry.attributes;
  const pos=attributes.position,col=attributes.color;
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
   // Local model +Z points BACKWARD along the course; -Z is forward.
   // This exactly coincides for adjacent bay boundaries at z=+/-8.
   const p=positionAt(bay.center-z,x,y);
   if(!Number.isFinite(p.x+p.y+p.z))
    throw Error("Invalid world-art curvature at s="+(bay.center-z));
   positions.set([p.x,p.y,p.z],n*3);
   colors.set([col.getX(i),col.getY(i),col.getZ(i)],n*3);
   n++;
  }
 }
 const mesh=new THREE.BufferGeometry();
 mesh.setAttribute("position",new THREE.BufferAttribute(positions,3));
 mesh.setAttribute("color",new THREE.BufferAttribute(colors,3));
 mesh.computeVertexNormals();mesh.computeBoundingSphere();
 mesh.userData.trackConforming=true;
 mesh.userData.bayCount=plan.bays.length;
 return mesh;
}
export function installWorldArt(THREE,world,{
 track="skyline",lowMemory=false,positionAt,
 request=typeof fetch==="function"?fetch:null,
 loaderFactory=null
}={}){
 if(!THREE||!world||typeof positionAt!=="function")
  throw Error("SKYSHIFT 0.20.3 requires original road positionAt and THREE");
 const plan=planStationWorld({track,lowMemory});
 const state={
  ...plan.stats,status:plan.active?"loading":"inactive",
  active:false,installedBays:0,drawBatches:0,trianglesRendered:0,
  assetBytes:0,geometryResources:0,materialResources:0,
  loadError:null,legacyHidden:plan.active,
  geometryFromGltf:false
 };
 if(!plan.active)return {
  ready:Promise.resolve(),stats:()=>({...state}),dispose(){}
 };
 let disposed=false,installedGroup=null;
 async function load(){
  let imported=null;
  try{
   if(!request)throw Error("No asset fetch function");
   const sourcePath=new URL(WORLD_ART_0203.assetPath,import.meta.url);
   const res=await request(sourcePath,{cache:"force-cache"});
   if(!res.ok)throw Error("Station glTF unavailable (HTTP "+res.status+")");
   const asset=await res.text();
   state.assetBytes=asset.length;
   if(asset.length>WORLD_ART_0203.maxAssetBytes)
    throw Error("Station GLTF exceeds conservative mobile budget");
   if(disposed)return;
   const {GLTFLoader}=loaderFactory?{GLTFLoader:await loaderFactory()}:
    await import("three/addons/loaders/GLTFLoader.js");
   const loader=typeof GLTFLoader==="function"?new GLTFLoader():GLTFLoader;
   imported=(await new Promise((resolve,reject)=>
    loader.parse(asset,sourcePath.href,resolve,reject))).scene;
   if(disposed){disposeAll(imported);return}
   const report=auditStationAsset(imported);
   if(!report.valid)throw Error(report.errors.join("; "));
   const group=new THREE.Group();
   group.name="CONTINUUM STATION · Graphite Regrade 0.20.3";
   const batches=[];
   for(const kind of WORLD_ART_0203.materials){
    if(lowMemory&&kind==="GLASS")continue;
    const source=report.nodes.get("PANORAMA_START_"+kind);
    if(!source||!source.geometry)
     throw Error("Missing original glTF material "+kind);
    const geometry=bakeTrackConformingBayGeometry(
     THREE,plan,report.nodes,kind,positionAt);
    let material=source.material.clone();
    if(kind==="ENERGY"){
     // Only authored recesses emit light; dark hull colors remain as in 0.19.
     material.dispose();
     material=new THREE.MeshBasicMaterial({
      color:0xffffff,vertexColors:true,toneMapped:false,
      side:THREE.DoubleSide
     });
    }
    if(kind==="GLASS"){
     material.transparent=true;material.depthWrite=false;
    }
    // No blanket emissive lift: light must still come from existing
    // environment & recessed ENERGY strips, not from shaded metal itself.
    if(kind==="SHELL"||kind==="INLAY"){
     if(material.emissive)material.emissive.setHex(0x000000);
     material.emissiveIntensity=0;
    }
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name="Station Surface · "+kind+" · road-conforming";
    mesh.frustumCulled=true;mesh.castShadow=false;mesh.receiveShadow=false;
    if(kind==="GLASS")mesh.renderOrder=2;
    group.add(mesh);
    batches.push(mesh);
   }
   if(disposed){disposeAll(group);disposeAll(imported);return}
   world.add(group);
   installedGroup=group;
   // Source glTF geometry/materials are no longer needed: each batch has
   // its own compact, road-curved vertex buffer. Release source RAM.
   disposeAll(imported);imported=null;
   state.status="active";state.active=true;state.installedBays=plan.bays.length;
   state.drawBatches=batches.length;
   state.trianglesRendered=batches.reduce((sum,m)=>
    sum+m.geometry.attributes.position.count/3,0);
   state.glTFSourceTriangles=report.triangles;
   state.geometryResources=batches.length;
   state.materialResources=batches.length;
   state.geometryFromGltf=true;
   state.grade="graphite";
   state.materialColorSpace="gltf-vertex-srgb";
   state.surfaceOnly=true;
   state.seamlessCurvedWorld=true;
   state.bakedWorldSpace=true;
  }catch(e){
   state.status="fallback";state.active=false;
   state.loadError=String(e?.message??e);
   console.warn("SKYSHIFT 0.20.3: station art unavailable; "+
    "the existing safe race environment remains playable.",state.loadError);
   if(imported&&!installedGroup)disposeAll(imported);
  }
 }
 const ready=load();
 return {
  ready,stats:()=>({...state}),
  dispose(){
   disposed=true;
   if(installedGroup){
    installedGroup.removeFromParent();
    disposeAll(installedGroup);
   }
  }
 };
}
