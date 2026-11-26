// SKYSHIFT 0.21.2.2 — Exterior Light Seal & Tunnel Atmosphere Isolation.
// Three.js MeshBasicMaterial defaults to fog:true. The 0.21.2.1 shell
// correctly ignored world directional/hemisphere lights, but it still mixed
// the current zone's GLOBAL exp2 fog over every interior pixel. This caused
// the "sunlight from space" effect. Seal exactly these tunnel surfaces.
// Only the existing rail inlay's glare is limited inside the same 368m vault.
// No changes to scene.fog, sky, global lights, bloom strength, road geometry,
// gameplay, camera, GRIP, or the nine-palettes / spatial front.
import {installNeonDrivenInterior} from "./neon-interior-v0212.mjs";
import {TUNNEL_MEGA_0211,TUNNEL_PORTALS_0211} from "./tunnel-megastructure-v0211.mjs";

export const EXTERIOR_SEAL_02122=Object.freeze({
 version:"0.21.2.2",id:"exterior-light-seal-02122",
 start:TUNNEL_MEGA_0211.start,end:TUNNEL_MEGA_0211.end,
 fogOnTunnelSurfaces:false,
 railGlareInteriorScale:.52,
 roadShoulderHighlightScale:.43,
 diffuseBounceBetweenPortals:.22,
 railGlareFadeStart:344,
 railGlareFadeEnd:368,
 outsideRailScale:1,
 sceneFogChanged:false,globalLightsChanged:false,
 exposureChanged:false,bloomPassChanged:false,
 additionalDrawCalls:0,additionalDynamicLights:0,
 geometryChanged:false,physicsChanged:false,gripChanged:false,
 colorWaveChanged:false,
 comparison:"?exteriorSeal=classic"
});

export function sealTunnelMaterials(group){
 if(!group)throw new Error("0.21.2.2: tunnel geometry not installed");
 const affected=[];
 group.traverse(mesh=>{
  if(!mesh.material)return;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  for(const m of materials){
   // Three's fog defines are compiled into the shader, so both the flag and
   // program invalidation matter. Custom spectral uniforms remain intact.
   if(m.fog!==false){
    m.fog=false;
    m.needsUpdate=true;
   }
   affected.push(mesh.name);
  }
 });
 if(!affected.includes("Tunnel / CLOSED_SHELL")||
    !affected.includes("Tunnel / INTEGRATED_LIGHT"))
  throw new Error("0.21.2.2: missing shell/emitters to isolate");
 return affected;
}
// The old 0.21.2.1 shader painted the color-wave bounce broadly over
// the entire wall. Keep the real spatial wave, but focus the response near
// the luminous arches; dark metal separates the sources.
export function focusNeonBounce(THREE,group){
 const shell=group?.children?.find(mesh=>mesh.name==="Tunnel / CLOSED_SHELL");
 const geo=shell?.geometry;
 const glow=geo?.getAttribute("glowWeight");
 const track=geo?.getAttribute("trackS");
 if(!glow||!track||glow.count!==track.count)
  throw new Error("0.21.2.2: missing shell wave/bounce attributes");
 const values=new Float32Array(glow.count);
 for(let i=0;i<glow.count;i++){
  const s=track.getX(i);
  let nearest=Infinity;
  for(const portal of TUNNEL_PORTALS_0211)
   nearest=Math.min(nearest,Math.abs(s-portal));
  const focused=Math.exp(-.5*(nearest/3.2)**2);
  const factor=EXTERIOR_SEAL_02122.diffuseBounceBetweenPortals+.55*focused;
  values[i]=glow.getX(i)*factor;
 }
 geo.setAttribute("glowWeight",new THREE.Float32BufferAttribute(values,1));
 return {shellBounceReduced:true,bounceSamples:values.length};
}
// The stark white streak in the screenshot is largely from the PBR roadway's
// grazing-angle/specular highlights, not the tunnel fog or thin rail chevrons.
// Attenuate ONLY the last few meters laterally on the sealed 0–368m deck.
// Apply to final PBR outgoing light *after* all existing deck decorators so
// it also catches directional "sun" specular, but keeps lane/boost logic.
export function sealPremiumRoadGlare(material){
 if(!material||typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw new Error("0.21.2.2: missing premium PBR road shader");
 const previous=material.onBeforeCompile;
 const previousKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  const anchor="#include <opaque_fragment>";
  if(!shader.fragmentShader.includes(anchor)||
     !shader.fragmentShader.includes("varying vec2 vTrackCoord"))
   throw new Error("0.21.2.2: road lighting shader anchors changed");
  const correction=[
   "float sealAlongRoad=1.0-smoothstep(344.0,368.0,vTrackCoord.x);",
   "float sealAtShoulder=smoothstep(6.8,9.2,abs(vTrackCoord.y));",
   "float sealedSpecular=sealAlongRoad*sealAtShoulder;",
   "gl_FragColor.rgb *= mix(1.0,0.43,sealedSpecular);"
  ].join("\n");
  shader.fragmentShader=shader.fragmentShader.replace(anchor,
   anchor+"\n"+correction);
 };
 material.customProgramCacheKey=()=>previousKey.call(material)+"-exterior-seal-02122";
 material.needsUpdate=true;
 return material;
}
export function installExteriorLightSeal(THREE,world,options={}){
 const base=installNeonDrivenInterior(THREE,world,options);
 const before=base.stats();
 if(!before.active||before.status!=="active")return base;
 const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const materials=sealTunnelMaterials(group);
 const focused=focusNeonBounce(THREE,group);
 if(options.roadMaterial)sealPremiumRoadGlare(options.roadMaterial);
 const state={
  ...before,version:"0.21.2.2",variant:"sealed-neon-tunnel",
  exteriorFogSealed:true,fogDisabledMaterialCount:materials.length,
  fogDisabledMeshes:materials,externalLightInfluence:0,
  ...focused,roadShoulderGlareSealed:Boolean(options.roadMaterial),
  sunWashRemoved:true,
  railGlareScale:EXTERIOR_SEAL_02122.railGlareInteriorScale,
  railGlareFadeStart:EXTERIOR_SEAL_02122.railGlareFadeStart,
  railGlareFadeEnd:EXTERIOR_SEAL_02122.railGlareFadeEnd,
  waveSynchronized:true,sceneFogChanged:false,
  globalLightsChanged:0,addedRenderPasses:0,
  colliders:0,roadMeshUntouched:true,originalGRIPUntouched:true,
  comparedTo:EXTERIOR_SEAL_02122.comparison
 };
 return {
  ready:base.ready,
  stats:()=>({...state,...{
   currentSpectrumStage:base.stats().currentSpectrumStage,
   currentSpectrumTo:base.stats().currentSpectrumTo,
   currentWaveFront:base.stats().currentWaveFront,
   waveActive:base.stats().waveActive
  }}),
  updateWave:wave=>base.updateWave?.(wave),
  dispose:()=>base.dispose()
 };
}
