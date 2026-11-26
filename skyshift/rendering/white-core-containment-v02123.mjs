// SKYSHIFT 0.21.2.3 — White-Core Spill Containment.
//
// Scope: the near-white PBR highlights on the road AND the ship in the
// continuous 0-368m tunnel. Prior 0.21.2.2 shaded only the outside 2m
// of the road and a subset of thin rail inlays, leaving white specular
// reflections over the middle of the deck and the ship's top.
//
// Restrict the *exterior* PBR specular response before bloom, not global
// lighting, wave palette, HDR bloom, geometry, or the camera. All nine
// zone colors, short spectral white crest and ship engine emissives remain.
// This is art-only with zero new meshes/dynamic lights/render passes.
export const WHITE_CORE_02123=Object.freeze({
 version:"0.21.2.3",
 id:"white-core-spill-containment",
 tunnelStart:0,tunnelFadeStart:340,tunnelEnd:368,
 roadDirectSpecular:.14,
 roadIndirectSpecular:.38,
 roadDirectDiffuse:.78,
 shipDirectSpecular:.18,
 shipIndirectSpecular:.42,
 shipDirectDiffuse:.76,
 railGlareScale:.34,
 worldLightChanges:0,
 newLights:0,extraDrawCalls:0,addedPostprocessPasses:0,
 globalBloomUnchanged:true,globalExposureUnchanged:true,
 geometryChanged:false,physicsChanged:false,
 steeringChanged:false,gripChanged:false,
 cameraChanged:false,
 comparison:"?whiteCore=classic"
});
const interpolate=(a,b,v)=>Math.max(0,Math.min(1,(v-a)/(b-a)));
const smoothstep=(v)=>v*v*(3-2*v);
export function whiteCoreTunnelMask(s,playing=true){
 if(!playing||!Number.isFinite(s)||s<WHITE_CORE_02123.tunnelStart)
  return 0;
 return 1-smoothstep(interpolate(WHITE_CORE_02123.tunnelFadeStart,
  WHITE_CORE_02123.tunnelEnd,s));
}
export function patchRoadWhiteCore(material){
 if(!material||typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw Error("0.21.2.3 requires the original PBR road shader");
 const oldCompile=material.onBeforeCompile;
 const oldKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  oldCompile.call(this,shader,renderer);
  const anchor="#include <lights_fragment_end>";
  if(!shader.fragmentShader.includes(anchor)||
     !shader.fragmentShader.includes("varying vec2 vTrackCoord"))
   throw Error("0.21.2.3 missing premium road PBR lighting chunks");
  // Direct sun specular is the neutral white streak. Attenuate it across
  // the full 23.2m race deck (not just the outer shoulder). Keep colored
  // emissive and moving white-core wave in their ORIGINAL shader chunks.
  shader.fragmentShader=shader.fragmentShader.replace(anchor,anchor+"\n"+[
   "float coreContainRoad=1.0-smoothstep(340.0,368.0,vTrackCoord.x);",
   "reflectedLight.directSpecular*=mix(1.0,0.14,coreContainRoad);",
   "reflectedLight.indirectSpecular*=mix(1.0,0.38,coreContainRoad);",
   "reflectedLight.directDiffuse*=mix(1.0,0.78,coreContainRoad);"
  ].join("\n"));
  // The largest remaining white region is an HDR-neutral road/guide
  // highlight which blooms after lighting. A chroma-aware compression
  // acts AFTER prior road decorators and BEFORE postprocessing.
  // Importantly, the spectral moving WHITE crest bypasses it.
  const opaque="#include <opaque_fragment>";
  if(!shader.fragmentShader.includes(opaque)||
     !shader.fragmentShader.includes("float whiteCore=0.0"))
   throw Error("0.21.2.3 needs premium spectral white-core and output chunks");
  shader.fragmentShader=shader.fragmentShader.replace(opaque,opaque+"\n"+[
   "float wcMax=max(max(gl_FragColor.r,gl_FragColor.g),gl_FragColor.b);",
   "float wcMin=min(min(gl_FragColor.r,gl_FragColor.g),gl_FragColor.b);",
   "float wcLuma=dot(gl_FragColor.rgb,vec3(0.2126,0.7152,0.0722));",
   "float wcNeutral=1.0-smoothstep(0.22,0.68,(wcMax-wcMin)/max(0.06,wcLuma));",
   "float wcOverbright=smoothstep(0.55,1.40,wcMax);",
   "float wcKeepCrest=1.0-smoothstep(0.10,0.60,whiteCore);",
   "gl_FragColor.rgb*=1.0-0.52*coreContainRoad*wcNeutral*wcOverbright*wcKeepCrest;"
  ].join("\n"));
 };
 material.customProgramCacheKey=function(){
  return oldKey.call(this)+"-white-core-containment-02123";
 };
 material.needsUpdate=true;
 return material;
}
function patchShipPbr(material,uniform){
 const previous=material.onBeforeCompile;
 const previousKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  if(!shader.fragmentShader.includes("#include <lights_fragment_end>"))
   throw Error("0.21.2.3 ship shader has no PBR lighting chunk");
  shader.uniforms.uWhiteCoreShipContainment=uniform;
  shader.fragmentShader=shader.fragmentShader.replace(
   "#include <common>",
   "#include <common>\nuniform float uWhiteCoreShipContainment;")
   .replace("#include <lights_fragment_end>",
    "#include <lights_fragment_end>\n"+[
     "reflectedLight.directSpecular*=mix(1.0,0.18,uWhiteCoreShipContainment);",
     "reflectedLight.indirectSpecular*=mix(1.0,0.42,uWhiteCoreShipContainment);",
     "reflectedLight.directDiffuse*=mix(1.0,0.76,uWhiteCoreShipContainment);"
    ].join("\n"));
 };
 material.customProgramCacheKey=function(){
  return (previousKey?.call(this)||"")+"-white-core-ship-02123";
 };
 material.needsUpdate=true;
}
export function createWhiteCoreContainment({roadMaterial,railSurface,ship}={}){
 if(!roadMaterial)throw Error("0.21.2.3 needs active premium road");
 patchRoadWhiteCore(roadMaterial);
 const tint={value:0};
 const attached=new WeakSet();
 let materialCount=0,updates=0,trackedShip=null;
 function attachShip(root){
  if(!root?.traverse)return 0;
  trackedShip=root;
  let added=0;
  root.traverse(node=>{
   const mats=Array.isArray(node.material)?node.material:[node.material];
   for(const m of mats){
    if(!m||attached.has(m))continue;
    // Preserve emissive fins, engines, glass and non-PBR particles:
    // only metal/plastic parts receiving directional sunlight need trimming.
    if(!m.isMeshStandardMaterial&&!m.isMeshPhysicalMaterial)continue;
    attached.add(m);
    patchShipPbr(m,tint);
    materialCount++;added++;
   }
  });
  return added;
 }
 railSurface?.setTunnelGlareScale?.(WHITE_CORE_02123.railGlareScale);
 railSurface?.setRailNeutralContainment?.(1);
 if(ship)attachShip(ship);
 return {
  attachShip,
  update(s,playing=true){
   tint.value=whiteCoreTunnelMask(s,playing);
   updates++;
   return tint.value;
  },
  stats:()=>({
   version:WHITE_CORE_02123.version,
   active:true,
   roadSpecularTrimmed:true,
   shipPbrMaterials:materialCount,
   shipAttached:Boolean(trackedShip),
   shipWhiteContainment:tint.value,
   railGlareScale:railSurface?.getTunnelGlareScale?.()??null,
   railWhiteContainment:railSurface?.getRailNeutralContainment?.()??null,
   controlUpdates:updates,
   waveUnchanged:true,bloomUnchanged:true,
   geometryUnchanged:true,physicsUnchanged:true
  })
 };
}
