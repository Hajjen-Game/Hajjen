// SKYSHIFT 0.4.9.8 — Anti-aliasing and adaptive image clarity.
// Device DPR and postprocess DPR are deliberately separate; DOM HUD is native.
export const CLARITY=Object.freeze({
 version:"premium-image-clarity-0498",
 antiAliasing:"SMAA",
 passes:Object.freeze(["RenderPass","UnrealBloomPass","SMAAPass","OutputPass"]),
 maximumDpr:2,
 lowMemoryThresholdGB:4,
 lowMemoryDprTiers:Object.freeze([1.35,1.18,1.0]),
 premiumDprTiers:Object.freeze([2.0,1.75,1.5]),
 temporalAA:false,
 newLights:0
});
const finite=(x,f)=>Number.isFinite(x)?x:f;
export function clarityProfile(deviceMemoryGB,deviceDpr,settings=CLARITY){
 const memory=finite(Number(deviceMemoryGB),0);
 const lowMemory=memory>0&&memory<=settings.lowMemoryThresholdGB;
 const native=Math.max(1,Math.min(settings.maximumDpr,finite(deviceDpr,1)));
 const caps=lowMemory?settings.lowMemoryDprTiers:settings.premiumDprTiers;
 const tiers=caps.map(cap=>Math.min(native,cap));
 return {lowMemory,deviceDpr:native,renderDpr:tiers[0],
  internalTiers:tiers,aa:settings.antiAliasing,
  aaPassCount:1,postProcessPasses:settings.passes};
}
// The existing quality director decides *when* to change; these caps decide
// *how much*. Previously low-RAM phones rendered at 1.35x but could never
// downshift because all general 2.0/1.75/1.50 tiers exceeded 1.35x.
export function dprForAdaptiveLevel(profile,level){
 const index=Math.max(0,Math.min(profile.internalTiers.length-1,
  Math.floor(finite(level,0))));
 return profile.internalTiers[index];
}
export function clarityAudit(profile,pipeline){
 return {antiAliasing:profile.aa,
  passOrder:[...profile.postProcessPasses],
  actualPassOrder:pipeline?.composer?.passes?.map(pass=>pass.constructor.name)??[],
  lowMemory:profile.lowMemory,
  canvasDpr:profile.renderDpr,
  internalDpr:pipeline?.internalPixelRatio??profile.renderDpr,
  adaptiveDprTiers:[...profile.internalTiers],
  smaaEnabled:pipeline?.smaa?.enabled??false,
  hudNativeCssResolution:true,
  temporalAA:CLARITY.temporalAA};
}
