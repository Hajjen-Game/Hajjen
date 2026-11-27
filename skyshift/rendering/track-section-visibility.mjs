// 0.29.3 — partition already-authored opaque static geometry without changing
// any vertex attributes, normals, shader coordinates, or triangle winding.
// No arbitrary distance cutoff; all geometry intersecting the camera frustum remains.
export function partitionTriangleIndices(position,index,cellSize=256){
 const cells=new Map(),count=index?.count??position.count;
 if(count%3!==0||!Number.isFinite(cellSize)||cellSize<=0)throw Error("invalid static triangle partition");
 for(let i=0;i<count;i+=3){
  const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
  const x=Math.floor((position.getX(a)+position.getX(b)+position.getX(c))/(3*cellSize));
  const z=Math.floor((position.getZ(a)+position.getZ(b)+position.getZ(c))/(3*cellSize));
  const key=x+","+z;
  let row=cells.get(key);if(!row){row=[];cells.set(key,row);}
  row.push(a,b,c);
 }
 return [...cells.values()];
}
const STATIC_NAMES=new Set([
 "Zone Ribbon · integrated PBR racing deck",
 "Deliberately hard-edged vertical road sides",
 "Angular integrated aero-barrier body"
]);
export function createTrackSectionVisibility(THREE,world,tunnelRoot,{occlusion=null}={}){
 const sources=[],modules=[],frustum=new THREE.Frustum(),matrix=new THREE.Matrix4();
 const tmp=new THREE.Vector3(),box=new THREE.Box3();
 let last={enabled:false,visibleSections:0,totalSections:0,visibleModules:0,totalModules:0,fullStaticTriangles:0,submittedStaticTriangles:0},active=false;
 world.updateMatrixWorld(true);
 // Transparent and depth-offset overlays are deliberately NOT repartitioned:
 // changing their draw order could change the appearance.
 for(const mesh of [...world.children]){
  const g=mesh.geometry,p=g?.getAttribute("position");
  if(!STATIC_NAMES.has(mesh.name)||!mesh.isMesh||!p||Array.isArray(mesh.material)||
   mesh.material.transparent||!mesh.material.depthWrite||g.groups.length||g.drawRange.start!==0||
   g.drawRange.count<(g.index?.count??p.count))continue;
  const chunks=[];
  for(const indices of partitionTriangleIndices(p,g.index)){
   const section=new THREE.BufferGeometry();
   for(const [name,attr] of Object.entries(g.attributes))section.setAttribute(name,attr);
   section.setIndex(new THREE.BufferAttribute(new (p.count>65535?Uint32Array:Uint16Array)(indices),1));
   // Bounds MUST use only the referenced vertices; full shared attribute buffers
   // would otherwise give every chunk the complete track's bounding sphere.
   box.makeEmpty();
   for(const i of indices){tmp.fromBufferAttribute(p,i);box.expandByPoint(tmp);}
   section.boundingBox=box.clone().expandByScalar(.05);
   section.boundingSphere=section.boundingBox.getBoundingSphere(new THREE.Sphere());
   const part=new THREE.Mesh(section,mesh.material);
   part.name=mesh.name+" / render section";part.position.copy(mesh.position);part.quaternion.copy(mesh.quaternion);
   part.scale.copy(mesh.scale);part.renderOrder=mesh.renderOrder;part.layers.mask=mesh.layers.mask;
   part.castShadow=mesh.castShadow;part.receiveShadow=mesh.receiveShadow;
   part.frustumCulled=true;part.visible=false;mesh.parent.add(part);part.updateMatrixWorld(true);
   chunks.push({part,bounds:section.boundingBox.clone().applyMatrix4(part.matrixWorld),triangles:indices.length/3});
  }
  sources.push({mesh,chunks,wasVisible:true,triangles:(g.index?.count??p.count)/3});
 }
 // Module groups already have per-mesh culling. Group bounds avoid traversing
 // irrelevant sections. Never hide a group with lights or unsupported moving objects.
 for(const section of tunnelRoot?.children??[]){
  let safe=true;section.traverse(o=>{if(o.isLight||o.isSkinnedMesh||o.isSprite)safe=false;});
  if(!safe)continue;
  const bounds=new THREE.Box3().setFromObject(section).expandByScalar(8);
  if(!bounds.isEmpty()&&Number.isFinite(bounds.min.x)&&Number.isFinite(bounds.max.x))
   modules.push({section,bounds,wasVisible:true});
 }
 function begin(camera,enabled,experimentalOcclusion=false){
  if(active)throw Error("unbalanced render visibility");
  if(!enabled){last={...last,enabled:false,occlusion:null};return;}
  camera.updateMatrixWorld(true);matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(matrix);active=true;
  if(experimentalOcclusion)occlusion?.begin(camera,frustum);
  let totalSections=0,visibleSections=0,visibleModules=0,fullStaticTriangles=0,submittedStaticTriangles=0;
  for(const source of sources){
   source.wasVisible=source.mesh.visible;
   if(source.wasVisible)fullStaticTriangles+=source.triangles;
   source.mesh.visible=false;
   for(const c of source.chunks){
    totalSections++;c.part.visible=source.wasVisible&&frustum.intersectsBox(c.bounds)&&!(experimentalOcclusion&&occlusion?.occluded(c.bounds));
    if(c.part.visible){visibleSections++;submittedStaticTriangles+=c.triangles;}
   }
  }
  for(const m of modules){m.wasVisible=m.section.visible;m.section.visible=m.wasVisible&&frustum.intersectsBox(m.bounds);if(m.section.visible)visibleModules++;}
  last={enabled:true,visibleSections,totalSections,visibleModules,totalModules:modules.length,fullStaticTriangles,submittedStaticTriangles,
   ...(occlusion?{occlusion:experimentalOcclusion?occlusion.stats():null}:{})};
 }
 function end(){
  if(!active)return;
  for(const s of sources){s.mesh.visible=s.wasVisible;for(const c of s.chunks)c.part.visible=false;}
  for(const m of modules)m.section.visible=m.wasVisible;
  active=false;
 }
 return {begin,end,stats:()=>({...last,sourceMeshes:sources.length,occlusionMode:last.occlusion?"conservative shell depth tiles (experimental)":"frustum only; no speculative behind-wall occlusion"})};
}
