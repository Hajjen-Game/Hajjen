// SKYSHIFT 0.13.4.2 — Stingray V4 geometry is the production default.
// Only Stingray fetches external art; Manta and all flight physics are intact.
// Missing/invalid model files retain the original procedural Stingray.
import {SHIP_ART_01342,requestedShipArt,createShipArtState,
 assessHeroAsset,installHeroBodyAndTail,shipArtAudit}
 from "./ships/ship-art-pipeline-v01342.mjs";
import {createShipSourceCache} from "./core/ship-source-cache.mjs";
import {collectObjectResources,releaseResourceDifference} from "./core/resource-ownership.mjs";
export function createShipArtController(THREE,{
 search="",currentCraft=()=>null,currentShipId=()=>null,
 loaderFactory=null,fetchAsset=null
}={}){
 const state=createShipArtState();
 state.requested=requestedShipArt(search);
 // Explicit visual A/B only: a reviewed Blender-exported binary may be
 // tested separately. The normal mobile game uses the verified glTF sculpt.
 const blenderPreview=new URLSearchParams(search).get("shipArt")==="blender";
 let generation=0,disposed=false;
 const sourceCache=createShipSourceCache({
  maxBytes:SHIP_ART_01342.maxAssetBytes,
  async fetchSource(signal){
   const request=fetchAsset??fetch;
   const srcPath=blenderPreview?SHIP_ART_01342.blenderAssetPath:
    SHIP_ART_01342.assetPath;
   const response=await request(new URL(srcPath,import.meta.url),
    {cache:"force-cache",signal});
   if(!response.ok)
    throw Error("Stingray HERO V4 unavailable (HTTP "+response.status+")");
   return blenderPreview?response.arrayBuffer():response.text();
  }
 });
 const isCurrent=(token,craft)=>!disposed&&token===generation&&
  currentCraft()===craft&&currentShipId()==="stingray";
 async function onCraftBuilt(craft,id){
  if(disposed)return state;
  const token=++generation;
  state.token=token;state.loaded=false;state.heroApplied=false;
  state.activeMode="procedural";state.error=null;
  state.triangles=0;state.addedDrawCalls=0;state.addedTextures=0;
  state.assetFormat=null;
  state.requestedShip=id;
  if(state.requested!=="hero"){
   sourceCache.cancelPending();state.status="procedural";return state;
  }
  if(id!=="stingray"){
   sourceCache.cancelPending();state.status="waiting-for-stingray";return state;
  }
  state.status="loading";state.attempts++;
  let imported=null,owned=null;
  try{
   const source=await sourceCache.acquire();
   // Check before importing/constructing the parser, not only after parse.
   if(!isCurrent(token,craft))return state;
   const format=blenderPreview?"glb":"gltf";
   let loader;
   if(loaderFactory)loader=await loaderFactory();
   else {
    const {GLTFLoader}=await import("three/addons/loaders/GLTFLoader.js");
    loader=new GLTFLoader();
   }
   if(!isCurrent(token,craft))return state;
   const gltf=await new Promise((resolve,reject)=>
    loader.parse(typeof source==="string"?source:source.slice(0),new URL("./assets/ships/",import.meta.url).href,
     resolve,reject));
   imported=gltf.scene;owned=collectObjectResources(imported,{textures:true});
   if(!isCurrent(token,craft)){
    releaseResourceDifference(owned);return state;
   }
   const report=assessHeroAsset(imported);
   if(!report.valid)throw Error(report.errors.join("; "));
   const installed=installHeroBodyAndTail(THREE,craft,imported,report);
   // The original tail plates were detached and replaced by transformed
   // geometry clones. Keep only resources reachable from the installed craft.
   releaseResourceDifference(owned,collectObjectResources(craft.ship,{textures:true}));
   state.heroApplied=true;state.loaded=true;state.status="active";
   state.activeMode="hero";state.triangles=installed.triangles;
   state.assetFormat=format;
   state.addedDrawCalls=installed.addedDrawCalls;
   return state;
  }catch(error){
   // Never expose an incomplete Blender asset or crash the game if the
   // file is absent, stale, over budget, or the user changes ships.
   if(owned&&!state.heroApplied)releaseResourceDifference(owned,
    isCurrent(token,craft)?collectObjectResources(craft.ship,{textures:true}):{});
   if(token!==generation||disposed)return state;
   sourceCache.invalidate();
   state.status="fallback";state.error=String(error?.message??error);
   console.warn("SKYSHIFT: Blender hero preview unavailable; retaining "+
    "the procedural Stingray and its original animated tail.",state.error);
   return state;
  }
 }
 return {onCraftBuilt,dispose(){if(disposed)return;disposed=true;generation++;state.token=generation;sourceCache.dispose();},
  state,audit:()=>({...shipArtAudit(state),sourceCache:sourceCache.audit()}),
  previewReady:()=>state.loaded&&state.activeMode==="hero"};
}
