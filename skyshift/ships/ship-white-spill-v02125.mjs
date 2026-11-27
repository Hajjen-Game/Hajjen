// SKYSHIFT 0.21.2.5 — Ship White-Spill Containment.
// The 0.21.2.3 patch reduced ordinary direct specular, but the neutral
// key-light diffuse and a separate MeshPhysical clearcoat response still
// give broad near-white highlights when the ship banks in the closed tunnel.
// Source-isolation WebGL confirms the WORLD key is responsible (turning off
// clearcoat alone does not remove the wash; simply raising roughness makes
// the entire wing even brighter). We isolate just the bright flight hull.
// This is shader-only: no extra lights, geometry, draw calls or camera work.
import {whiteCoreTunnelMask} from "../rendering/white-core-containment-v02123.mjs";

export const SHIP_WHITE_SPILL_02125=Object.freeze({
 version:"0.21.2.5",id:"ship-white-spill-containment",
 tunnelStart:0,fullUntil:340,fadeEnd:368,
 directDiffuseFactor:.16,directSpecularFactor:.10,
 indirectSpecularFactor:.38,clearcoatFactor:.14,
 clearcoatRoughness:.78,zoneEmission:.022,
 expectedHullMaterials:["titanium","wing armour","hero body"],
 exteriorWorldLightsChanged:0,engineLightsChanged:0,
 globalBloomChanged:false,geometryChanged:false,
 handlingChanged:false,gripChanged:false,cameraChanged:false,
 extraDrawCalls:0,extraLightSources:0,
 comparison:"?shipWhite=classic"
});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const OMIT=/glass|canopy|cockpit|turbine|nacelle|thruster|engine|seam|light|neon|glow|plume|wake|nozzle|shadow|trail/i;
function shouldTreatHull(node,material){
 if(!node?.isMesh||!material?.color)return false;
 if(!material.isMeshStandardMaterial&&!material.isMeshPhysicalMaterial)return false;
 if(OMIT.test(node.name||""))return false;
 const c=material.color;
 if(![c.r,c.g,c.b].every(Number.isFinite))return false;
 // Dark interior panel details are useful for silhouette; do not wash them
 // with artificially colored light or create more draw/lighting work.
 return .2126*c.r+.7152*c.g+.0722*c.b>.13;
}
export function patchShipWhiteSpillShader(fragment){
 const common="#include <common>",lights="#include <lights_fragment_end>";
 if(!fragment.includes(common)||!fragment.includes(lights)||
    !fragment.includes("#include <lights_physical_fragment>"))
  throw Error("0.21.2.5 ship hull requires a physical PBR shader");
 return fragment
  .replace(common,common+"\n"+
   "uniform float uShipInteriorWhiteMask;\n"+
   "uniform vec3 uShipInteriorZoneColor;")
  .replace("#include <lights_physical_fragment>",
   "#include <lights_physical_fragment>\n"+
   "#ifdef USE_CLEARCOAT\n"+
   " material.clearcoat *= mix(1.0,0.14,uShipInteriorWhiteMask);\n"+
   " material.clearcoatRoughness=mix(material.clearcoatRoughness,0.78,uShipInteriorWhiteMask);\n"+
   "#endif")
  .replace(lights,lights+"\n"+[
   "reflectedLight.directDiffuse*=mix(1.0,0.16,uShipInteriorWhiteMask);",
   "reflectedLight.directSpecular*=mix(1.0,0.10,uShipInteriorWhiteMask);",
   "reflectedLight.indirectSpecular*=mix(1.0,0.38,uShipInteriorWhiteMask);",
   // Very slight color echo from the active zone replaces the old neutral
   // wash. Retain the authored hull albedo, wing bevels and existing engines.
   "totalEmissiveRadiance+=uShipInteriorZoneColor*(0.022*uShipInteriorWhiteMask);"
  ].join("\n"));
}
export function createShipWhiteSpillController(THREE,ship){
 if(!THREE?.Color||!ship?.traverse)throw Error("0.21.2.5 needs THREE and a ship");
 const uniforms={
  uShipInteriorWhiteMask:{value:0},
  uShipInteriorZoneColor:{value:new THREE.Color(0x52dff4)}
 };
 const treated=new WeakSet(),baseMaterials=[];
 let attached=0,frames=0,lastDistance=0;
 function attachShip(root){
  if(!root?.traverse)return 0;
  let n=0;
  root.traverse(node=>{
   if(!node?.isMesh)return;
   const mats=Array.isArray(node.material)?node.material:[node.material];
   for(const m of mats){
    if(!shouldTreatHull(node,m)||treated.has(m))continue;
    treated.add(m);
    const previous=m.onBeforeCompile,previousKey=m.customProgramCacheKey;
    m.onBeforeCompile=function(shader,renderer){
     previous?.call(this,shader,renderer);
     Object.assign(shader.uniforms,uniforms);
     shader.fragmentShader=patchShipWhiteSpillShader(shader.fragmentShader);
    };
    m.customProgramCacheKey=function(){
     return (previousKey?.call(this)||"")+"-ship-white-containment-02125";
    };
    m.needsUpdate=true;
    attached++;n++;
    baseMaterials.push({mesh:node.name||"unnamed",type:m.type,
     originalClearcoat:m.clearcoat??null,
     originalRoughness:m.roughness??null});
   }
  });
  return n;
 }
 function update(s,accent,playing=true){
  const amount=whiteCoreTunnelMask(s,playing);
  uniforms.uShipInteriorWhiteMask.value=amount;
  if(accent&&accent.isColor)uniforms.uShipInteriorZoneColor.value.copy(accent);
  lastDistance=s;frames++;
  return amount;
 }
 function setComparison(value){uniforms.uShipInteriorWhiteMask.value=clamp(value)}
 attachShip(ship);
 return {
  attachShip,update,setComparison,
  stats:()=>({
   version:SHIP_WHITE_SPILL_02125.version,active:true,
   treatedHullMaterials:attached,surfaces:baseMaterials,
   whiteMask:uniforms.uShipInteriorWhiteMask.value,
   zoneTint:uniforms.uShipInteriorZoneColor.value.getHex(),
   lastDistance,frames,
   engineLightsChanged:false,worldLightsChanged:false,
   bloomUnchanged:true,geometryUnchanged:true
  })
 };
}
