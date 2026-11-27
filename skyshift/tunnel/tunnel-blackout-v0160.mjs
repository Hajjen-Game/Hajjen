// SKYSHIFT 0.9.2.1 — True black-room tunnel lighting.
// The old tunnel darkened the background but global sun/ambient/fill continued
// to illuminate the hull, road and metallic guardrails. This pass fades ONLY
// the three global PBR lights while retaining emissive neon, zone wave,
// twin engine point lights, thrust plumes, and HUD unmodified.
import {tunnelIntensityAt,SHADOW_TUNNEL} from "./shadow-tunnel-v0160.mjs";

export const TUNNEL_BLACKOUT=Object.freeze({
 version:"shadow-tunnel-blackout-0921",start:SHADOW_TUNNEL.start,
 end:SHADOW_TUNNEL.end,fadeMeters:SHADOW_TUNNEL.fadeMeters,
 ambientLightAtCore:.004,keyLightAtCore:.008,fillLightAtCore:.004,
 roadBodyAtCore:.003,roadBaseEmissiveAtCore:.002,
 bladeTipAtCore:.018,backgroundAtCore:.008,
 keepsEnginePointLights:true,keepsEnergyWave:true,
 keepsGuideAndRailEmissions:true,physicalFlightUnchanged:true,
 addedLights:0,addedMeshes:0,addedPasses:0
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function blackoutLevelsAt(s,c=TUNNEL_BLACKOUT){
 const darkness=tunnelIntensityAt(s);
 const fade=core=>1-darkness*(1-core);
 return {darkness,ambient:fade(c.ambientLightAtCore),
  key:fade(c.keyLightAtCore),fill:fade(c.fillLightAtCore),
  roadBody:fade(c.roadBodyAtCore),
  roadBaseEmissive:fade(c.roadBaseEmissiveAtCore),
  bladeTip:fade(c.bladeTipAtCore),
  background:fade(c.backgroundAtCore)};
}
// Decorate the existing premium-road + 0.9.2 tunnel shader: near-black
// illuminated road body, without killing the separately authored emissive
// guides, pad arrows, spectral white core or colored zone wave.
// Crucially dim standard material baseline emissive BEFORE adding those
// authored emissive terms. Dimming them afterwards would kill the glow too.
export function patchBlackoutRoadFragment(fragment,c=TUNNEL_BLACKOUT){
 const old="diffuseColor.rgb = road * (1.0 - tunnelShade * (.88 - .82 * tunnelGuide));";
 const emission="totalEmissiveRadiance += zoneGuide *";
 if(!fragment.includes(old)||!fragment.includes(emission))
  throw new Error("SKYSHIFT blackout: missing 0.9.2 road shader anchors");
 const road=`diffuseColor.rgb = road *
   (1.0 - tunnelShade * ${(1-c.roadBodyAtCore).toFixed(3)});`;
 const baseline=`totalEmissiveRadiance *=
   (1.0 - tunnelShade * ${(1-c.roadBaseEmissiveAtCore).toFixed(3)});
  ${emission}`;
 return fragment.replace(old,road).replace(emission,baseline);
}
export function installBlackoutRoadShading(material,c=TUNNEL_BLACKOUT){
 const previous=material.onBeforeCompile;
 const previousKey=material.customProgramCacheKey;
 if(typeof previous!=="function"||typeof previousKey!=="function")
  throw new Error("SKYSHIFT blackout requires existing spectral tunnel road material");
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.fragmentShader=patchBlackoutRoadFragment(shader.fragmentShader,c);
 };
 material.customProgramCacheKey=()=>previousKey.call(material)+"-blackout-0921";
 material.needsUpdate=true;
}
// No per-frame shaders, extra passes or material replacement for the ship:
// genuine PBR materials now see almost no world light, while the *existing*
// two local engine lights still illuminate their immediately adjacent panels.
// Only decorative Manta blade-tip paint is cloned separately from the engine
// plume shared material, so engine luminescence can remain bright.
export function separateBladeTipMaterial(ship,sourceMaterial){
 if(!ship||!sourceMaterial)throw new Error("Manta Blade not initialized");
 const tips=[];
 const clone=sourceMaterial.clone();
 ship.traverse?.(obj=>{
  if(obj.name==="Manta blade tip luminescence"){
   obj.material=clone;
   tips.push(obj);
  }
 });
 if(tips.length!==2)throw new Error("Expected two original Manta blade tips");
 return {material:clone,count:tips.length,baseOpacity:sourceMaterial.opacity};
}
export function createTunnelBlackoutController({worldLights,camera,bladeTips,
 config=TUNNEL_BLACKOUT,levelsAt=blackoutLevelsAt}){
 for(const name of ["ambient","key","fill"])
  if(!worldLights?.[name]||!Number.isFinite(worldLights[name].intensity))
   throw new Error("Missing PBR world light: "+name);
 if(!camera?.children||!bladeTips?.material)
  throw new Error("Missing tunnel camera or blade tips");
 const baselines={
  ambient:worldLights.ambient.intensity,
  key:worldLights.key.intensity,fill:worldLights.fill.intensity
 };
 const starLayers=camera.children.filter(o=>o.isPoints||o.isSprite)
  .map(object=>({object,initialOpacity:object.material.opacity}));
 let peakDarkness=0,coreFrames=0,frames=0;
 const levels={darkness:0,ambient:1,key:1,fill:1,roadBody:1,
  roadBaseEmissive:1,bladeTip:1,background:1};
 return {
  apply(s){
   Object.assign(levels,levelsAt(s,config));
   worldLights.ambient.intensity=baselines.ambient*levels.ambient;
   worldLights.key.intensity=baselines.key*levels.key;
   worldLights.fill.intensity=baselines.fill*levels.fill;
   bladeTips.material.opacity=bladeTips.baseOpacity*levels.bladeTip;
   // Called immediately after backdrop velocity animation each frame.
   // Camera-local stars cannot appear to shine through a black vault.
   for(const star of starLayers){
    if(star.object.isPoints)star.object.material.opacity*=levels.background;
    else star.object.material.opacity=star.initialOpacity*levels.background;
   }
   peakDarkness=Math.max(peakDarkness,levels.darkness);
   coreFrames+=Number(levels.darkness>.98);frames++;
   return levels;
  },
  levels,
  reset(){
   worldLights.ambient.intensity=baselines.ambient;
   worldLights.key.intensity=baselines.key;
   worldLights.fill.intensity=baselines.fill;
   bladeTips.material.opacity=bladeTips.baseOpacity;
   peakDarkness=0;coreFrames=0;frames=0;
   for(const star of starLayers)
    star.object.material.opacity=star.initialOpacity;
   for(const key of Object.keys(levels))levels[key]=1;
   levels.darkness=0;
  },
  audit(){
   return {version:config.version,
    peakDarkness:+peakDarkness.toFixed(3),blackoutFrames:coreFrames,
    samples:frames,globalWorldLightsDiminished:3,
    engineLightsIntact:true,shipPbrStillReflectsEngineLight:true,
    retainedNeon:true,retainedWhiteCore:true,
    finalAmbientFactor:+levels.ambient.toFixed(3),
    finalRoadBodyFactor:+levels.roadBody.toFixed(3),
    finalBladeTipFactor:+levels.bladeTip.toFixed(3),
    hiddenCameraBackdrop:starLayers.length,addedDrawCalls:0};
  }
 };
}
