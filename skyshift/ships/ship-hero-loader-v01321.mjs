// SKYSHIFT 0.13.2 — optional Blender HERO GLB in production WebGL.
// The requested preview is deliberately opt-in until visual + FPS playtest.
// No file loads, new objects or imports in normal 0.13.2 play.
import {SHIP_ART_0132,requestedShipArt,createShipArtState,
 assessHeroAsset,installHeroBodyAndTail,shipArtAudit}
 from "./ship-art-pipeline-v0132.mjs?v=0.13.2.1";
export function createShipArtController(THREE,{
 search="",currentCraft=()=>null,currentShipId=()=>null,
 loaderFactory=null,fetchAsset=null
}={}){
 const state=createShipArtState();
 state.requested=requestedShipArt(search);
 let generation=0;
 function disposeImported(root){
  const geometries=new Set(),materials=new Set();
  root?.traverse?.(node=>{
   if(node.geometry)geometries.add(node.geometry);
   for(const mat of (Array.isArray(node.material)?node.material:[node.material]))
    if(mat)materials.add(mat);
  });
  for(const g of geometries)g.dispose();
  for(const m of materials)m.dispose();
 }
 async function onCraftBuilt(craft,id){
  const token=++generation;
  state.token=token;state.loaded=false;state.heroApplied=false;
  state.activeMode="procedural";state.error=null;
  state.triangles=0;state.addedDrawCalls=0;state.addedTextures=0;
  state.assetFormat=null;
  state.requestedShip=id;
  if(state.requested!=="hero"){
   state.status="procedural";return state;
  }
  if(id!=="stingray"){
   state.status="waiting-for-stingray";return state;
  }
  state.status="loading";state.attempts++;
  let imported=null;
  try{
   // Prefer an actual Blender-exported binary GLB. Until Blender CI
   // publishes it, the tracked first-playable text glTF is a real 3D mesh
   // with identical named parts, not a runtime-generated Three.js craft.
   const request=fetchAsset??fetch;
   let response=await request(new URL(SHIP_ART_0132.assetPath,import.meta.url),
    {cache:"force-cache"}),format="glb";
   if(!response.ok){
    response=await request(new URL(SHIP_ART_0132.previewAssetPath,import.meta.url),
     {cache:"force-cache"});
    format="gltf";
   }
   if(!response.ok)
    throw Error("Stingray hero mesh unavailable (HTTP "+response.status+")");
   const source=format==="glb"?await response.arrayBuffer():
    await response.text();
   const length=typeof source==="string"?source.length:source.byteLength;
   if(length>SHIP_ART_0132.maxAssetBytes)
    throw Error("Hero mesh exceeds mobile budget: "+length);
   let loader;
   if(loaderFactory)loader=await loaderFactory();
   else {
    const {GLTFLoader}=await import("three/addons/loaders/GLTFLoader.js");
    loader=new GLTFLoader();
   }
   const gltf=await new Promise((resolve,reject)=>
    loader.parse(source,new URL("../assets/ships/",import.meta.url).href,
     resolve,reject));
   imported=gltf.scene;
   if(token!==generation||currentCraft()!==craft||
      currentShipId()!=="stingray"){
    disposeImported(imported);return state;
   }
   const report=assessHeroAsset(imported);
   if(!report.valid)throw Error(report.errors.join("; "));
   const installed=installHeroBodyAndTail(THREE,craft,imported,report);
   state.heroApplied=true;state.loaded=true;state.status="active";
   state.activeMode="hero";state.triangles=installed.triangles;
   state.assetFormat=format;
   state.addedDrawCalls=installed.addedDrawCalls;
   return state;
  }catch(error){
   // Never expose an incomplete Blender asset or crash the game if the
   // file is absent, stale, over budget, or the user changes ships.
   if(imported&&!state.heroApplied)disposeImported(imported);
   if(token!==generation)return state;
   state.status="fallback";state.error=String(error?.message??error);
   console.warn("SKYSHIFT: Blender hero preview unavailable; retaining "+
    "the procedural Stingray and its original animated tail.",state.error);
   return state;
  }
 }
 return {onCraftBuilt,dispose(){generation++;state.token=generation;},
  state,audit:()=>shipArtAudit(state),
  previewReady:()=>state.loaded&&state.activeMode==="hero"};
}
