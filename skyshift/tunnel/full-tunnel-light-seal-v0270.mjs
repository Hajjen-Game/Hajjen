// SKYSHIFT 0.27.0: global sun/hemisphere containment for NEON VAULT only.
// Existing original black-room controller accepts a levelsAt function;
// use its native engine/ship/camera star safeguards across all 3400m.
// No fixture tuning, new lights, new render pass, reflection edits or physics.
export const VAULT_LIGHT_SEAL_0270=Object.freeze({
 version:"0.27.0",start:0,end:3400,
 ambientFactor:.18,keyFactor:.026,fillFactor:.022,
 backgroundFactor:.025,railWaveUnaffected:true,
 localEngineLightsUnaffected:true,originalSkylineUnchanged:true,
 roadShaderUnchanged:true,shipMaterialsUnchanged:true,
 noAdditionalDynamicLights:true,noAddedPostprocess:true
});
export function vaultLightLevels0270(s=0){
 if(!Number.isFinite(s))throw Error("0.27.0 tunnel seal requires finite track s");
 return {darkness:.92,ambient:VAULT_LIGHT_SEAL_0270.ambientFactor,
  key:VAULT_LIGHT_SEAL_0270.keyFactor,
  fill:VAULT_LIGHT_SEAL_0270.fillFactor,
  // Do not shadow-black the unmodified racing deck and neon zone shader;
  // only global PBR illumination/ambient light is attenuated.
  roadBody:1,roadBaseEmissive:1,bladeTip:1,
  background:VAULT_LIGHT_SEAL_0270.backgroundFactor};
}
