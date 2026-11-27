// Opt-in visual LOD. Retain the actual closed shell, panels, arch bodies,
// emitters, wave, boost pads, rail collision and continuous cap channels.
// Only non-emissive small rail panel/latch triangles and decorative conduits
// may disappear at distance. No geometry simplification of the race surface.
export function railDetailBins(position,coord,cellSize=128){
 const channel=[],bins=new Map();
 if(position.count!==coord.count||position.count%3)throw Error("rail detail attributes");
 for(let i=0;i<position.count;i+=3){
  const a=coord.getX(i),b=coord.getX(i+1),c=coord.getX(i+2);
  // Source cap channel spans ~1.15m; panel seam/latch spans <=0.51m.
  // Very short terminal cap segments are retained by requiring the rail
  // detail vertex colors in the caller's separate authored seam range.
  if(Math.max(a,b,c)-Math.min(a,b,c)>.65){channel.push(i,i+1,i+2);continue;}
  const x=Math.floor((position.getX(i)+position.getX(i+1)+position.getX(i+2))/(3*cellSize));
  const z=Math.floor((position.getZ(i)+position.getZ(i+1)+position.getZ(i+2))/(3*cellSize));
  const key=x+","+z;let row=bins.get(key);if(!row){row=[];bins.set(key,row);}
  row.push(i,i+1,i+2);
 }
 return {channel,bins:[...bins.values()]};
}
export function createDistantDetailLod(THREE,world,tunnelRoot){
 const sources=[],conduits=[],eye=new THREE.Vector3(),tmp=new THREE.Vector3();
 let active=false,last={enabled:false,hiddenRailTriangles:0,hiddenConduits:0,railChunks:0,conduits:0};
 world.updateMatrixWorld(true);
 for(const mesh of [...world.children]){
  if(mesh.name!=="Recessed graphite cap channels and modular panel seams"||mesh.material?.transparent||mesh.geometry?.index)continue;
  const g=mesh.geometry,p=g.getAttribute("position"),coord=g.getAttribute("aRailCoord"),color=g.getAttribute("color");
  if(!p||!coord||!color||g.groups.length||g.drawRange.start!==0||g.drawRange.count<p.count)continue;
  // Cap channels have exactly .44 intensity. Preserve them even if a
  // future source emits very short terminal segments. Classify seams by
  // original authored graphite intensity AND small arc extent.
  const {channel,bins}=railDetailBins(p,coord);
  const details=[];
  for(const row of bins){
   const keep=[];
   for(let i=0;i<row.length;i+=3){
    const a=row[i],b=row[i+1],c=row[i+2];
    if([a,b,c].every(j=>Math.abs(color.getX(j)-.44)<.001))channel.push(a,b,c);
    else keep.push(a,b,c);
   }
   if(keep.length)details.push(keep);
  }
  const make=(indices,nearOnly)=>{
   const geometry=new THREE.BufferGeometry(),bounds=new THREE.Box3();
   for(const [name,attr] of Object.entries(g.attributes))geometry.setAttribute(name,attr);
   geometry.setIndex(new THREE.BufferAttribute(new (p.count>65535?Uint32Array:Uint16Array)(indices),1));
   for(const i of indices){tmp.fromBufferAttribute(p,i);bounds.expandByPoint(tmp);}
   geometry.boundingBox=bounds.clone().expandByScalar(.05);
   geometry.boundingSphere=geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
   const part=new THREE.Mesh(geometry,mesh.material);
   part.name=mesh.name+" / detail LOD";part.position.copy(mesh.position);part.quaternion.copy(mesh.quaternion);
   part.scale.copy(mesh.scale);part.layers.mask=mesh.layers.mask;part.renderOrder=mesh.renderOrder;
   part.frustumCulled=nearOnly;part.visible=false;mesh.parent.add(part);part.updateMatrixWorld(true);
   return {part,bounds:geometry.boundingBox.clone().applyMatrix4(part.matrixWorld),triangles:indices.length/3,nearOnly,show:true};
  };
  if(details.length&&channel.length)sources.push({mesh,wasVisible:true,parts:[make(channel,false),...details.map(row=>make(row,true))]});
 }
 tunnelRoot?.traverse(mesh=>{
  if(mesh.isMesh&&mesh.name==="Tunnel / STRUCTURAL_CONDUITS"&&!mesh.material?.transparent&&!mesh.castShadow){
   const bounds=new THREE.Box3().setFromObject(mesh);
   if(!bounds.isEmpty())conduits.push({mesh,bounds,show:true,wasVisible:true});
  }
 });
 function begin(camera,enabled){
  last={enabled:Boolean(enabled),hiddenRailTriangles:0,hiddenConduits:0,railChunks:sources.reduce((n,s)=>n+s.parts.length-1,0),conduits:conduits.length};
  if(!enabled)return;
  active=true;eye.setFromMatrixPosition(camera.matrixWorld);
  for(const s of sources){
   s.wasVisible=s.mesh.visible;s.mesh.visible=false;
   for(const p of s.parts){
    if(p.nearOnly){const distance=p.bounds.distanceToPoint(eye);p.show=distance<(p.show?220:180);}
    p.part.visible=s.wasVisible&&p.show;
    if(s.wasVisible&&!p.show)last.hiddenRailTriangles+=p.triangles;
   }
  }
  for(const c of conduits){
   c.wasVisible=c.mesh.visible;
   const distance=c.bounds.distanceToPoint(eye);c.show=distance<(c.show?340:300);
   c.mesh.visible=c.wasVisible&&c.show;
   if(c.wasVisible&&!c.show)last.hiddenConduits++;
  }
 }
 function end(){
  if(!active)return;
  for(const s of sources){s.mesh.visible=s.wasVisible;for(const p of s.parts)p.part.visible=false;}
  for(const c of conduits)c.mesh.visible=c.wasVisible;
  active=false;
 }
 return {begin,end,stats:()=>({...last})};
}
