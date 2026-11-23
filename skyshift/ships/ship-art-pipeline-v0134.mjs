// SKYSHIFT 0.13.4 — Sculpted glTF hero-asset contract and safe loader.
// The real 120Hz physics, Manta Blade, and original animated Stingray rig
// remain authoritative. This is only a replacement for cosmetic meshes.
export const SHIP_ART_0134=Object.freeze({
 version:"stingray-silhouette-hard-surface-0134",
 assetPath:"../assets/ships/stingray-evo-hero-v3.gltf",
 blenderAssetPath:"../assets/ships/stingray-evo-hero-v3.glb",
 fallbackVersion:"0.13.3",
 browserFlag:"shipArt",
 defaultMode:"hero",
 optInMode:"hero",
 artist:"Offline 3D sculpt → glTF 2.0 → Three.js; Blender .blend conversion available",
 axes:"Three +Y up, nose -Z, tail +Z, wingtip ±X, metres",
 requiredMeshes:Object.freeze([
  "Hero_Hull_Spine","Hero_Wing_L","Hero_Wing_R","Hero_Canopy",
  "Hero_Engine_L","Hero_Engine_R","Hero_Edge_L","Hero_Edge_R",
  ...Array.from({length:9},(_,i)=>"Hero_Tail_Plate_"+String(i+1).padStart(2,"0"))
 ]),
 tailSegments:9,tailSegmentLength:.68,
 maxTriangles:8000,maxMaterials:9,maxDrawCalls:34,
 maxAssetBytes:700000,maxTextureImages:0,maxPointLights:0,
 maxSkinnedMeshes:0,hasCollision:false,
 noPhysicsChange:true,proceduralFallback:true,
 v0134HeroDefault:true
});
// New V3 sculpt is Stingray default. ?shipArt=classic restores old craft.
// Other modes and the Manta Blade are unaffected; no art fetch is performed.
export function requestedShipArt(search=""){
 try{
  const v=new URLSearchParams(search).get(SHIP_ART_0134.browserFlag);
  return v==="classic"||v==="procedural"||v==="off"?
   "procedural":"hero";
 }catch{return "hero";}
}

const hasMesh=(v)=>!!v&&v.isMesh===true;
function triangles(geo){
 if(!geo?.attributes?.position)return 0;
 if(geo.index?.count)return geo.index.count/3;
 return geo.attributes.position.count/3;
}
export function assessHeroAsset(root){
 const found=new Map(),names=new Set(),errors=[];
 let triangleCount=0,materials=new Set(),lights=0,skinned=0,images=new Set(),meshes=0;
 root?.traverse?.(obj=>{
  if(obj?.isLight)lights++;
  if(obj?.isSkinnedMesh)skinned++;
  if(!hasMesh(obj))return;
  meshes++;triangleCount+=triangles(obj.geometry);
  if(found.has(obj.name))errors.push("Duplicate node "+obj.name);
  found.set(obj.name,obj);names.add(obj.name);
  for(const m of (Array.isArray(obj.material)?obj.material:[obj.material])){
   if(!m)continue;
   materials.add(m);
   for(const k of ["map","normalMap","roughnessMap","metalnessMap",
    "emissiveMap","aoMap"]){if(m[k]?.image)images.add(m[k].image);}
  }
 });
 for(const name of SHIP_ART_0134.requiredMeshes)
  if(!found.has(name))errors.push("Missing "+name);
 for(const name of names)
  if(name.startsWith("Hero_")&&!SHIP_ART_0134.requiredMeshes.includes(name)&&
   !name.startsWith("Hero_Detail_")&&!name.startsWith("Hero_Tail_Glow_"))
   errors.push("Unexpected hero node "+name);
 if(meshes>SHIP_ART_0134.maxDrawCalls)errors.push("Too many mesh batches: "+meshes);
 if(triangleCount>SHIP_ART_0134.maxTriangles)
  errors.push("Triangle budget exceeded: "+triangleCount);
 if(materials.size>SHIP_ART_0134.maxMaterials)
  errors.push("Material budget exceeded: "+materials.size);
 if(images.size>SHIP_ART_0134.maxTextureImages)
  errors.push("Texture maps forbidden in v0.13.4: "+images.size);
 if(lights>SHIP_ART_0134.maxPointLights)errors.push("No embedded light sources");
 if(skinned>SHIP_ART_0134.maxSkinnedMeshes)errors.push("No skin/armatures: use existing nine-joint rig");
 return {valid:errors.length===0,errors,meshes,triangles:triangleCount,
  materials:materials.size,textureImages:images.size,lights,skinned,
  requiredNodes:SHIP_ART_0134.requiredMeshes.length,found};
}
export function createShipArtState(){
 return {requested:"hero",status:"not-requested",loaded:false,
  requestedShip:"",heroApplied:false,error:null,attempts:0,triangles:0,
  addedDrawCalls:0,addedTextures:0,activeMode:"procedural",
  assetFormat:null,token:0};
}
// Existing craft has these exact mesh names; hiding them preserves the
// original engine lights, plume nodes, reactive wing flaps and 9-link pivots.
export const PROCEDURAL_BODY_MESHES_0134=Object.freeze([
 "Compact central manta spine","Stingray EVO · wide manta wings",
 "Low integrated teardrop canopy","Inset swept dorsal wing channels",
 "Manta blade tip luminescence","Wing-integrated venturi thruster"
]);
// After GLTFLoader constructs meshes, body nodes stay together as a child of
// ship. Hero plates attach to the existing procedural JOINTS, not to a new
// animation controller. Physics, tail springs and engine sockets unchanged.
export function installHeroBodyAndTail(THREE,craft,gltfScene,report=assessHeroAsset(gltfScene)){
 if(!report.valid)throw Error("Stingray hero asset invalid: "+report.errors.join("; "));
 const ship=craft?.ship;
 if(!ship||typeof ship.getObjectByName!=="function")
  throw Error("Stingray craft root missing");
 const jointNames=Array.from({length:SHIP_ART_0134.tailSegments},(_,i)=>
  "Stingray kinetic joint "+String(i+1).padStart(2,"0"));
 const joints=jointNames.map(name=>ship.getObjectByName(name));
 if(joints.some(x=>!x))throw Error("Existing nine-joint Stingray animation rig missing");
 // Build and validate replacement parts BEFORE touching the visible model.
 gltfScene.updateMatrixWorld?.(true);
 const rootInverse=new THREE.Matrix4().copy(gltfScene.matrixWorld).invert();
 const plateParts=joints.map((joint,i)=>{
  const name="Hero_Tail_Plate_"+String(i+1).padStart(2,"0");
  const imported=report.found.get(name);
  const relative=new THREE.Matrix4().multiplyMatrices(rootInverse,imported.matrixWorld);
  const clone=imported.clone();
  clone.geometry=imported.geometry.clone();
  clone.geometry.applyMatrix4(relative);
  clone.position.set(0,0,0);clone.rotation.set(0,0,0);clone.scale.set(1,1,1);
  clone.name="Installed "+name;clone.castShadow=false;
  clone.receiveShadow=false;
  return {joint,clone};
 });
 // Imported tail geometry is kept out of the static body root. Original
 // neon dorsal guides remain visible and follow the original motion rig.
 for(const name of SHIP_ART_0134.requiredMeshes.filter(x=>x.startsWith("Hero_Tail_"))){
  const part=report.found.get(name);
  part.removeFromParent();
 }
 for(const name of PROCEDURAL_BODY_MESHES_0134){
  ship.traverse(obj=>{if(obj.name===name&&obj.isMesh)obj.visible=false;});
 }
 // Older polishing overlays were authored for the old wing contour.
 // Avoid a second floating set of shoulders, vents and static engine bezels.
 // Existing v0.10.8 reactive FLAPS and existing engine VFX remain intact.
 for(const part of craft.polishSurfaces??[])part.visible=false;
 for(const {joint,clone} of plateParts){
  for(const child of joint.children)
   if(child.name.startsWith("Stingray faceted armor plate"))
    child.visible=false;
  joint.add(clone);
 }
 gltfScene.name="Stingray HERO V3 · sculpted 3D flight body";
 gltfScene.traverse(obj=>{if(obj.isMesh){
  obj.castShadow=false;obj.receiveShadow=false;}});
 ship.add(gltfScene);
 return {ship,materials:report.materials,triangles:report.triangles,
  originalTailRigPreserved:true,originalEngineNodesPreserved:true,
  originalPhysicsPreserved:true,plates:plateParts.length,
  // Source mesh batches include 9 plates removed from the static root,
  // but the total visible batches are still at most the validated count.
  addedDrawCalls:report.meshes};
}
export function shipArtAudit(state){
 return {version:SHIP_ART_0134.version,requested:state.requested,
  status:state.status,loaded:state.loaded,heroApplied:state.heroApplied,
  activeMode:state.activeMode,attempts:state.attempts,
  triangles:state.triangles,addedDrawCalls:state.addedDrawCalls,
  addedTextures:state.addedTextures,assetFormat:state.assetFormat,
  error:state.error,
  proceduralFallback:true,physicalFlightUnchanged:true,
  originalTailRigPreserved:true,originalEngineSocketsPreserved:true};
}
