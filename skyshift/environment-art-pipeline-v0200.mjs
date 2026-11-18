// SKYSHIFT 0.20.0 — World Art Pipeline
// An independently-authored, checked-in glTF asset is loaded ONCE.
// Instanced authored architecture follows the existing road local frame;
// the 120 Hz game physics, steering, GRIP, rails and road mesh are untouched.
export const WORLD_ART_0200=Object.freeze({
 version:"world-art-pipeline-0200",name:"CONTINUUM STATION",
 mode:"rebirth",classic:"?worldArt=classic",
 assetPath:"./assets/worlds/continuum-bays-v1.gltf",
 track:"skyline",start:80,end:368,meters:288,bayLength:16,bayCount:18,
 materials:Object.freeze(["SHELL","INLAY","ENERGY","GLASS"]),
 variants:Object.freeze(["PANORAMA","SERVICE","GATE"]),
 maxAssetBytes:260000,maxTrianglesPerAsset:2000,
 maxBatchesHigh:12,maxBatchesLow:9,
 addedColliders:0,addedPhysicsChanges:0,addedDynamicLights:0,
 addedRenderPasses:0,panoramicExterior:true,continuousRoof:true
});
export function planStationWorld({track="skyline",lowMemory=false}={}){
 const c=WORLD_ART_0200;
 if(track!=="skyline")return {active:false,bays:[],stats:{
  active:false,track,mode:"none",bayCount:0,meters:0}};
 const types=["GATE","PANORAMA","PANORAMA","SERVICE","SERVICE",
  "PANORAMA","PANORAMA","PANORAMA","PANORAMA",
  "PANORAMA","PANORAMA","PANORAMA","PANORAMA",
  "SERVICE","SERVICE","PANORAMA","PANORAMA","GATE"];
 if(types.length!==c.bayCount)throw Error("Skyshift: station segment plan mismatch");
 const bays=types.map((variant,i)=>({
  index:i,variant,start:c.start+i*c.bayLength,
  end:c.start+(i+1)*c.bayLength,
  center:c.start+(i+.5)*c.bayLength
 }));
 return {active:true,bays,stats:{track,mode:"rebirth",lowMemory,
  version:c.version,bayCount:bays.length,meters:c.meters,
  start:c.start,end:c.end,variants:Object.fromEntries(
   c.variants.map(v=>[v,bays.filter(x=>x.variant===v).length])),
  panoramaWindowBays:bays.filter(x=>x.variant!=="SERVICE").length,
  openRoof:true,exteriorSpaceVisible:true,
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
 for(const variant of WORLD_ART_0200.variants){
  for(const mat of WORLD_ART_0200.materials){
   const name=variant+"_"+mat;
   const mesh=nodes.get(name);
   if(!mesh){errors.push("Missing glTF bay "+name);continue}
   if(!mesh.geometry?.attributes?.normal||!mesh.geometry?.attributes?.color)
    errors.push("Bay has no authored surface normals/vertex palette: "+name);
   if(mesh.geometry?.attributes?.position){
    const attr=mesh.geometry.attributes.position;
    for(let i=0;i<attr.count;i++){
     const x=attr.getX(i),y=attr.getY(i),z=attr.getZ(i);
     if(!Number.isFinite(x+y+z)||
      (Math.abs(x)<17.5&&y<30))
      {errors.push("Unsafe/invalid authored bay vertex "+name);break}
    }
   }
  }
 }
 if(nodes.size!==12)errors.push("Expected 12 original authored glTF meshes");
 if(triangles>WORLD_ART_0200.maxTrianglesPerAsset)
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
export function installWorldArt(THREE,world,{
 track="skyline",lowMemory=false,positionAt,
 request=typeof fetch==="function"?fetch:null,
 loaderFactory=null
}={}){
 if(!THREE||!world||typeof positionAt!=="function")
  throw Error("SKYSHIFT 0.20.0 requires original road positionAt and THREE");
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
   const sourcePath=new URL(WORLD_ART_0200.assetPath,import.meta.url);
   const res=await request(sourcePath,{cache:"force-cache"});
   if(!res.ok)throw Error("Station glTF unavailable (HTTP "+res.status+")");
   const asset=await res.text();
   state.assetBytes=asset.length;
   if(asset.length>WORLD_ART_0200.maxAssetBytes)
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
   group.name="CONTINUUM STATION · World Art 0.20.0";
   const instances=[];
   const shared=new Set();
   const matCache=new Map();
   for(const variant of WORLD_ART_0200.variants){
    const bays=plan.bays.filter(x=>x.variant===variant);
    for(const kind of WORLD_ART_0200.materials){
     if(lowMemory&&kind==="GLASS")continue;
     const src=report.nodes.get(variant+"_"+kind);
     if(!src||!src.geometry)throw Error("Absent glTF module "+variant+"/"+kind);
     // Reuse a single imported vertex buffer and 1 draw for all identical bays.
     const mesh=new THREE.InstancedMesh(src.geometry,
      src.material.clone(),bays.length);
     mesh.name="Station Bay · "+variant+" · "+kind;
     mesh.frustumCulled=true;mesh.castShadow=false;mesh.receiveShadow=false;
     if(kind==="ENERGY"){
      // Glowing coves follow authored vertex colors, not 19.1's global
      // material brightening, and never introduce new scene lights.
      mesh.material.dispose();
      mesh.material=new THREE.MeshBasicMaterial({
       color:0xffffff,vertexColors:true,toneMapped:false,
       side:THREE.DoubleSide
      });
     }
     if(kind==="GLASS"){
      mesh.material.transparent=true;mesh.material.depthWrite=false;
      mesh.renderOrder=2;
     }
     for(let i=0;i<bays.length;i++)
      mesh.setMatrixAt(i,stationFrame(THREE,positionAt,bays[i].center));
     mesh.instanceMatrix.needsUpdate=true;
     mesh.computeBoundingSphere();
     instances.push(mesh);
     group.add(mesh);
     shared.add(src.geometry);matCache.set(mesh,mesh.material);
   }
   }
   if(disposed){for(const mesh of instances)mesh.material.dispose();
    disposeAll(imported);return}
   world.add(group);
   installedGroup=group;
   state.status="active";state.active=true;state.installedBays=plan.bays.length;
   state.drawBatches=instances.length;
   state.trianglesRendered=report.triangles;
   state.geometryResources=shared.size;
   state.materialResources=instances.length;
   state.geometryFromGltf=true;
   // No more longer need the imported wrapper; child geometries remain in use
   // by the instanced batches. Clean up only after controller.dispose().
  }catch(e){
   state.status="fallback";state.active=false;
   state.loadError=String(e?.message??e);
   console.warn("SKYSHIFT 0.20.0: station art unavailable; "+
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
