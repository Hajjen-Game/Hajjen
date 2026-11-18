// SKYSHIFT 0.19.1 — Pass 1: Material & Surface Readability.
// Apply a restrained static fill to existing PBR geometry. No new meshes,
// dynamic lights, render passes, simulation or camera behavior. This is NOT
// a global brightness change: emissive neon and the racing road are untouched.
export const READABILITY_0191=Object.freeze({
 version:"material-surface-readability-0191",
 stage:"Pass 1 / 4",classicFlag:"?materials=classic",
 steelMetalness:.32,steelRoughness:.57,steelBakedFill:.33,
 panelMetalness:.36,panelRoughness:.49,panelBakedFill:.30,
 vaultMetalness:.33,vaultRoughness:.58,vaultBakedFill:.34,
 unchangedWorldGeometry:true,unchangedShipMaterials:true,
 unchangedRoadShader:true,unchangedGlobalLights:true,
 extraMeshes:0,extraDynamicLights:0,extraRenderPasses:0,
 addedDrawCalls:0,lowMemoryMaterialParity:true
});
// Exact authored instance colors in world-rebuild-v0190.mjs.
// New midtones remain deep-space colored, but survive dark HDR scenes.
export const READABLE_TINTS_0191=Object.freeze([
 Object.freeze({old:0x18283f,new:0x435d77,id:"orbital-slate"}),
 Object.freeze({old:0x28213d,new:0x564b69,id:"conduit-violet"}),
 Object.freeze({old:0x0b1326,new:0x3b4c62,id:"cathedral-graphite"}),
 Object.freeze({old:0x345775,new:0x6288a4,id:"cool-inlay"}),
 Object.freeze({old:0x483154,new:0x78617b,id:"warm-inlay"})
]);
const channel=(hex,shift)=>(hex>>>shift)&255;
export function perceivedLuma(hex){
 return .2126*channel(hex,16)+.7152*channel(hex,8)+.0722*channel(hex,0);
}
export function readableTint(hex){
 return READABLE_TINTS_0191.find(x=>x.old===hex)?.new??hex;
}
export function patchReadableSurfaceFragment(fragment,amount){
 const anchor="#include <emissivemap_fragment>";
 if(!fragment.includes(anchor)||!(amount>0&&amount<=.5))
  throw Error("SKYSHIFT 0.19.1: incompatible material shader");
 // diffuseColor includes Three's existing instancing color and texture
 // before this chunk runs. Emissive does not require real point lights or
 // environment maps, and therefore also survives Shadow Tunnel blackout.
 return fragment.replace(anchor,anchor+"\n"+
  "  // Static baked ambient response per material; not a real light source.\n"+
  "  totalEmissiveRadiance += diffuseColor.rgb * "+amount.toFixed(3)+";\n");
}
export function installReadableFinish(material,amount,identity){
 if(!material||typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw Error("SKYSHIFT 0.19.1: expected MeshStandardMaterial");
 const previousCompile=material.onBeforeCompile;
 const previousCache=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previousCompile.call(this,shader,renderer);
  shader.fragmentShader=patchReadableSurfaceFragment(shader.fragmentShader,amount);
 };
 material.customProgramCacheKey=()=>previousCache.call(material)+
  "-readable-0191-"+identity+"-"+amount.toFixed(3);
 material.needsUpdate=true;
 return material;
}
const deltaSquared=(a,b)=>{
 const dr=a.r-b.r,dg=a.g-b.g,db=a.b-b.b;
 return dr*dr+dg*dg+db*db;
};
export function repaintInstancedMidtones(THREE,mesh){
 if(!mesh?.isInstancedMesh||!mesh.instanceColor)return 0;
 const probes=READABLE_TINTS_0191.map(entry=>({
  from:new THREE.Color(entry.old),to:new THREE.Color(entry.new)
 }));
 const tint=new THREE.Color(),count=mesh.count;
 let changed=0;
 for(let i=0;i<count;i++){
  mesh.getColorAt(i,tint);
  const found=probes.find(p=>deltaSquared(tint,p.from)<.00001);
  if(!found)continue; // Existing cyan/pink/white energy is untouched.
  mesh.setColorAt(i,found.to);
  changed++;
 }
 if(changed&&mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
 return changed;
}
export function applyReadableWorldMaterials(THREE,{
 world,signature,lowMemory=false
}={}){
 if(!THREE)throw Error("SKYSHIFT 0.19.1: missing Three.js");
 const result={
  version:READABILITY_0191.version,
  enabled:true,lowMemory:!!lowMemory,
  recoloredInstances:0,worldUpdated:0,signatureUpdated:0,
  adjustedPbrMaterials:0,extraDrawCalls:0,
  dynamicLights:0,renderPasses:0,
  palette:READABLE_TINTS_0191.map(x=>({...x,
   brightnessRatio:+(perceivedLuma(x.new)/perceivedLuma(x.old)).toFixed(2)}))
 };
 // New world uses instanced colors on four fixed batches. Only change STEEL
 // and PANEL: the already-good neon outlines retain their authored colors.
 const worldRoot=world?.getObjectByName?.("Cinematic World Rebuild 0.19.0");
 if(worldRoot){
  for(const mesh of worldRoot.children){
   if(!mesh.isInstancedMesh)continue;
   const kind=mesh.name.split(" · ").at(-1);
   if(kind!=="steel"&&kind!=="panel")continue;
   result.recoloredInstances+=repaintInstancedMidtones(THREE,mesh);
   if(kind==="steel"){
    mesh.material.metalness=READABILITY_0191.steelMetalness;
    mesh.material.roughness=READABILITY_0191.steelRoughness;
    installReadableFinish(mesh.material,READABILITY_0191.steelBakedFill,"world-steel");
   }else{
    mesh.material.metalness=READABILITY_0191.panelMetalness;
    mesh.material.roughness=READABILITY_0191.panelRoughness;
    // The old uniform emissive was a blue overlay that bleached violet
    // inlays. New authored-color baked fill is per instance instead.
    mesh.material.emissive.setHex(0x000000);
    mesh.material.emissiveIntensity=0;
    installReadableFinish(mesh.material,READABILITY_0191.panelBakedFill,"world-panel");
   }
   result.worldUpdated+=mesh.count;
   result.adjustedPbrMaterials++;
  }
 }
 // The original 0.18 vaults are a second layer; leaving their alloy
 // untouched would put dark black ribs across the improved 0.19 panels.
 const signatureRoot=signature?.getObjectByName?.(
  "Signature Environment · Celestial Conduit 0.18.0");
 if(signatureRoot){
  const vault=signatureRoot.children.find(x=>x.name?.endsWith(" · alloy"));
  if(vault){
   vault.material.color.setHex(0x47617d);
   vault.material.metalness=READABILITY_0191.vaultMetalness;
   vault.material.roughness=READABILITY_0191.vaultRoughness;
   installReadableFinish(vault.material,READABILITY_0191.vaultBakedFill,
    "celestial-vault");
   result.signatureUpdated=vault.count;
   result.adjustedPbrMaterials++;
  }
 }
 return result;
}
