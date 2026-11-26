// SKYSHIFT — Unified Tunnel Lighting Foundation 1.0
// Reuses the proven 0.9.2.1 black-room WORLD LIGHT controller for both
// tunnels. Only the external hemisphere/key/fill levels are shared;
// the shadow tunnel retains its exact legacy darkness and road shader.
// The 0–368m neon gallery keeps its own milder PBR profile and all authored
// local cyan/amber neon, native wave and Manta engine lamps.
// This is a reversible FIRST step. Do not remove existing surface-level
// protections until WebGL A/B of ship, road, arches and zone wave is accepted.
import {CIRCUIT} from "../tracks/trials/trial-v0165.mjs";
import {isAurora} from "../tracks/shared/track-selection-v0160.mjs";
import {tunnelIntensityAt,SHADOW_TUNNEL} from "../shadow-tunnel-v0160.mjs";
import {blackoutLevelsAt,createTunnelBlackoutController,TUNNEL_BLACKOUT}
 from "../tunnel-blackout-v0160.mjs";
import {TUNNEL_MEGA_0211} from "./tunnel-megastructure-v0211.mjs";

export const UNIFIED_TUNNEL_LIGHTING_1=Object.freeze({
 id:"unified-tunnel-lighting-foundation-1",version:"1.0",
 policy:"shared existing black-room global ambient/key/fill attenuation",
 neonStart:TUNNEL_MEGA_0211.start,neonEnd:TUNNEL_MEGA_0211.end,
 neonEntranceFadeMeters:14,neonExitFadeMeters:28,
 // The gallery's graphite is already dark. Retain a SMALL, controlled
 // neutral PBR contribution for ship readability but not solar wash.
 neonAmbientAtCore:.72,neonKeyAtCore:.38,neonFillAtCore:.56,
 shadowStart:SHADOW_TUNNEL.start,shadowEnd:SHADOW_TUNNEL.end,
 shadowProfile:"unchanged 0.9.2.1 near-black room",
 preservesOldBlackout:true,preservesLocalEngineLights:true,
 preservesNativeNeon:true,preservesWhiteCore:true,preservesFogSeal:true,
 preservesRoadSolarSeal:true,preservesShipSpillSeal:true,
 changesPhysics:false,changesTrack:false,changesCamera:false,
 newDynamicLights:0,newDrawCalls:0,newRenderPasses:0,newMaterials:0,
 comparison:"?unifiedLighting=classic"
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t)};
const lapS=s=>((s%CIRCUIT.lapLength)+CIRCUIT.lapLength)%CIRCUIT.lapLength;
export function neonGalleryMaskAt(s,c=UNIFIED_TUNNEL_LIGHTING_1){
 if(!Number.isFinite(s)||isAurora())return 0;
 const d=lapS(s);
 if(d<c.neonStart||d>=c.neonEnd)return 0;
 return smooth((d-c.neonStart)/c.neonEntranceFadeMeters)*
  smooth((c.neonEnd-d)/c.neonExitFadeMeters);
}
// Keep the original, independently authored shadow room exactly intact
// (including its dimmed blade tips and external starfield). The new
// gallery ONLY restricts the three world-space PBR lights. Road emissive,
// engine point lights and fog aren't modified by this controller.
export function unifiedTunnelLevelsAt(s,legacy=TUNNEL_BLACKOUT,
 config=UNIFIED_TUNNEL_LIGHTING_1,comparison=1){
 if(!Number.isFinite(s))
  return {...blackoutLevelsAt(0,legacy),darkness:0,
   ambient:1,key:1,fill:1,roadBody:1,roadBaseEmissive:1,
   bladeTip:1,background:1};
 const old=blackoutLevelsAt(s,legacy);
 const gallery=neonGalleryMaskAt(s,config)*clamp(comparison);
 if(gallery<0.0000001)return old;
 const fade=core=>1-gallery*(1-core);
 return {
  ...old,
  darkness:Math.max(old.darkness,gallery),
  ambient:Math.min(old.ambient,fade(config.neonAmbientAtCore)),
  key:Math.min(old.key,fade(config.neonKeyAtCore)),
  fill:Math.min(old.fill,fade(config.neonFillAtCore))
 };
}
export function createUnifiedTunnelLightingController(args){
 const setting={value:1};
 let lastS=0;
 const controller=createTunnelBlackoutController({
  ...args,
  levelsAt:(s,legacy)=>unifiedTunnelLevelsAt(s,legacy,
   UNIFIED_TUNNEL_LIGHTING_1,setting.value)
 });
 return {
  ...controller,
  apply(s){lastS=s;return controller.apply(s);},
  setComparison(value){
   setting.value=clamp(Number.isFinite(value)?value:1);
   return controller.apply(lastS);
  },
  getComparison(){return setting.value;},
  audit(){return {
    ...controller.audit(),
    unifiedTunnelLightingEnabled:true,
    unifiedTunnelLightingVersion:"1.0",
    unifiedTunnelLightingMode:"existing-blackout-world-light-controller",
    galleryCoverage:neonGalleryMaskAt(lastS),
    galleryComparison:setting.value,
    legacyShadowUnchanged:true,externalLightControllerCount:1,
    galleryPreservesLocalNeon:true,galleryPreservesEnginePointLights:true,
    galleryPreservesRoadEmissive:true,
    galleryAddedLights:0,galleryAddedDrawCalls:0,
    galleryAddedShaders:0
   };}
 };
}
