// EF06: snapshot explicit Object3D ownership, not a global texture cache.
// The caller defines the retained/shared resources. Identity is authoritative.
export function collectObjectResources(root,{textures=false}={}){
 const result={geometries:new Set(),materials:new Set(),textures:new Set()};
 root?.traverse?.(obj=>{
  if(obj.geometry)result.geometries.add(obj.geometry);
  for(const mat of (Array.isArray(obj.material)?obj.material:[obj.material])){
   if(!mat||result.materials.has(mat))continue;
   result.materials.add(mat);
   if(textures)for(const value of Object.values(mat))
    if(value?.isTexture)result.textures.add(value);
  }
 });
 return result;
}
export function releaseResourceDifference(owned,retained={}){
 const counts={geometries:0,materials:0,textures:0};
 for(const type of Object.keys(counts)){
  for(const resource of owned[type]){
   if(retained[type]?.has(resource))continue;
   resource.dispose?.();counts[type]++;
  }
  owned[type].clear();
 }
 return counts;
}
