// SKYSHIFT 0.27.4 — Premium Tunnel Cohesion & Finish
//
// LAST-MILE FINISH on the original 0.27.0–0.27.3 pipeline, not another
// tunnel/renderer/fixture rewrite. The source-of-truth remains:
// * Skyline 0.24.1 3D sculpted panel relief and banked 3400m geometry;
// * Skyline 0.26.0/0.26.1/0.26.5 local native finite-source GGX;
// * Skyline 0.26.2 shared packed metal atlas.
// This module adjusts the EXISTING material shader code in place, keeping
// real 0.27.3 lights and fixtures. No extra passes, meshes, or textures.
// Full old appearance: ?track=vault&v=0.27.4&vaultFinish=classic
export const VAULT_PREMIUM_FINISH_0274=Object.freeze({
 version:"0.27.4",
 source:"SKYSHIFT 0.27.3 native physical GGX + 0.26.2 metal atlas",
 tracks:["vault"],
 finish:"source-proximal satin titanium, darker panel recesses and warm/cyan distinction",
 lengthMeters:3400,
 highPanelBayMeters:22,
 reducedMobileMicroFrequency:true,
 highProfile:true,mobileProfile:true,
 priorPanelMeshesRetained:true,largeMobilePanelSilhouetteRetained:true,
 priorSkylineShadersRetained:true,priorLocalSourcesRetained:true,
 priorEmissiveFixturesRetained:true,
 noOutdoorLights:true,noAddedDrawCalls:true,noNewTextures:true,
 noNewGeometry:true,noNewShaderLights:true,noPostprocess:true,
 noNewColliders:true,physicsUnchanged:true,
 gripUnchanged:true,shipUnchanged:true,roadUnchanged:true,
 otherTracksUnchanged:true,
 comparison:"?vaultFinish=classic"
});
function requireHooks(fragment,names){
 if(typeof fragment!=="string")throw Error("0.27.4 requires source shader");
 for(const name of names)if(!fragment.includes(name))
  throw Error("0.27.4 missing actual native shader hook: "+name);
}
const COMMON="#include <common>";
const COLOR="#include <color_fragment>";
const ROUGH="#include <roughnessmap_fragment>";
const METAL="#include <metalnessmap_fragment>";
export function patchVaultPremiumPhysical0274(fragment,{role="panel",mobile=false}={}){
 if(role!=="panel"&&role!=="rib")throw Error("0.27.4 original panel/rib only");
 requireHooks(fragment,[COMMON,COLOR,ROUGH,METAL,
  "vVaultMaterialCoord0271","vLocalMask0261"]);
 const head="uniform float uVaultPremiumFinish0274;";
 // Same real global UV coordinate as 0.27.1: shade source-aligned 22m
 // panel bays instead of 170m mesh chunks. Material does not swim when
 // the camera moves and doesn't suddenly reset at the chunk seam.
 const albedo=[
  "{",
  "vec2 vf4Coord=vVaultMaterialCoord0271;",
  "float vf4Bay=fract((vf4Coord.x+1.6)/22.0);",
  "float vf4Edge=1.0-smoothstep(0.012,0.055,min(vf4Bay,1.0-vf4Bay));",
  "float vf4Near=clamp(max(vLocalMask0261.x,vLocalMask0261.y),0.0,1.0);",
  "float vf4Warm=clamp(vLocalMask0261.y,0.0,1.0);",
  // Dark, rich gunmetal in the unlit recesses, not another wide cyan wash.
  "float vf4Room=1.0-0.15*(1.0-vf4Near)-0.095*vf4Edge;",
  ...(mobile?[]:[
   // High gets deterministic bay-specific milling; 4GB keeps the large
   // panels identical but avoids subpixel specular breakup.
   "float vf4Cell=fract(sin(dot(floor(vf4Coord/vec2(22.,3.4)),",
   " vec2(43.73,78.19)))*43758.5453);",
   "vf4Room*=mix(0.963,1.025,vf4Cell);"
  ]),
  "vec3 vf4Tint=mix(vec3(.88,.955,1.01),",
  " vec3(1.035,.965,.895),vf4Warm*.50);",
  ...(role==="rib"?["vf4Tint=mix(vf4Tint,vec3(.94,.97,1.01),.35);"]:[]),
  "diffuseColor.rgb*=mix(vec3(1.),vf4Tint*vf4Room,",
  " clamp(uVaultPremiumFinish0274,0.0,1.0));",
  "}"
 ].join("\n");
 const rough=[
  "{",
  "float vf4NearR=clamp(max(vLocalMask0261.x,vLocalMask0261.y),0.,1.);",
  "float vf4BayR=fract((vVaultMaterialCoord0271.x+1.6)/22.0);",
  "float vf4Groove=1.0-smoothstep(.015,.060,min(vf4BayR,1.0-vf4BayR));",
  // Unlit panels are more satin; closer to authentic source light
  // polished edges become smoother. No blanket glossy white panels.
  "float vf4TargetR=clamp(roughnessFactor+",
  " .086*(1.0-vf4NearR)+.105*vf4Groove-.047*vf4NearR,",
  " .24,.73);",
  "roughnessFactor=mix(roughnessFactor,vf4TargetR,",
  " clamp(uVaultPremiumFinish0274,0.0,1.0));",
  "}"
 ].join("\n");
 const met=[
  "{",
  "float vf4NearM=clamp(max(vLocalMask0261.x,vLocalMask0261.y),0.,1.);",
  "metalnessFactor=mix(metalnessFactor,",
  " clamp(metalnessFactor*(.96+.04*vf4NearM),.0,1.),",
  " clamp(uVaultPremiumFinish0274,0.0,1.0));",
  "}"
 ].join("\n");
 return fragment.replace(COMMON,COMMON+"\n"+head)
  .replace(COLOR,COLOR+"\n"+albedo)
  .replace(ROUGH,ROUGH+"\n"+rough)
  .replace(METAL,METAL+"\n"+met);
}
export function patchVaultPremiumSource0274(fragment,{mobile=false}={}){
 requireHooks(fragment,[COMMON,
  "diffuseColor.rgb*=mix(1.0,v27Source,uVaultFixtureResponse0273);"]);
 // The authored RGB decides cyan/amber source identity. Shape ONLY the
 // existing emissive strips, not the tunnel's world light or exposure.
 const anchor="diffuseColor.rgb*=mix(1.0,v27Source,uVaultFixtureResponse0273);";
 const shaping= [
  "float vf4SourceBalance=mix("+(mobile?".985":".970")+","+
   (mobile?"1.055":"1.090")+",v27Warm);",
  "diffuseColor.rgb*=mix(1.0,vf4SourceBalance,",
  " clamp(uVaultPremiumFinish0274,0.0,1.0));"
 ].join("\n");
 return fragment.replace(COMMON,COMMON+"\nuniform float uVaultPremiumFinish0274;")
  .replace(anchor,anchor+"\n"+shaping);
}
export function patchVaultPremiumRail0274(fragment,{mobile=false}={}){
 requireHooks(fragment,[COMMON,METAL,"vVaultRailMask0273"]);
 // Original 0.27.3 local cyan GGX remains; the rest of the rail becomes
 // matte rather than reflecting the same amount throughout the lap.
 const body=[
  "{",
  "float vf4RailNear=clamp(vVaultRailMask0273,0.,1.);",
  "float vf4Satin=clamp("+(mobile?".565":".535")+
   "-.105*vf4RailNear,.36,.69);",
  "roughnessFactor=mix(roughnessFactor,",
  " max(roughnessFactor,vf4Satin),",
  " clamp(uVaultPremiumFinish0274,0.0,1.0)*.90);",
  "}"
 ].join("\n");
 return fragment.replace(COMMON,COMMON+"\nuniform float uVaultPremiumFinish0274;")
  .replace(METAL,METAL+"\n"+body);
}
export function vaultPremiumFinishAudit0274(active,strength,lowMemory){
 return {active:!!active,version:"0.27.4",
  enabledAmount:active?Math.max(0,Math.min(1,strength)):0,
  mobile:!!lowMemory,
  sculptedPanelsRetained:true,
  originalFixtureBaysRetained:true,
  atlasCountAdded:0,worldLightsAdded:0,
  drawCallsAdded:0,geometryAdded:0,collidersAdded:0,
  shaderLightSamplesAdded:0,postprocessAdded:0,
  onlyVault:true,priorGGXRetained:true};
}
