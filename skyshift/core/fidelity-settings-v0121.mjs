// SKYSHIFT 0.12.1 — Smart Fidelity is ON by default, including 4 GB devices.
// All ordinary adaptive resolution / bloom / SMAA policies stay unchanged.
// Explicit A/B presets retain precedence. Choice is persisted across visits.
import {selectFidelityProfile} from "./visual-fidelity-v0114.mjs";
export const FIDELITY_0121=Object.freeze({
 version:"smart-fidelity-default-0121",storageKey:"skyshift-premium-fidelity",
 defaultEnabled:true,queryParameter:"fidelity",
 overridePresets:Object.freeze(["fidelity-on","fidelity-off","fidelity-legacy"]),
 noGpuReallocationOnToggle:true,requiresReloadToChangeShader:true,
 adaptiveDprUnchanged:true,bloomUnchanged:true,smaaUnchanged:true
});
function queryValue(search){
 try{const u=new URLSearchParams(search||"");return u.get(FIDELITY_0121.queryParameter)}
 catch{return null}
}
export function readFidelityChoice({search="",storage=null}={}){
 const explicit=queryValue(search);
 if(explicit==="on"||explicit==="off")
  return Object.freeze({enabled:explicit==="on",source:"url"});
 try{
  const stored=storage?.getItem(FIDELITY_0121.storageKey);
  if(stored==="on"||stored==="off")
   return Object.freeze({enabled:stored==="on",source:"saved"});
 }catch{}
 return Object.freeze({enabled:true,source:"default"});
}
export function saveFidelityChoice(enabled,storage=null){
 try{storage?.setItem(FIDELITY_0121.storageKey,enabled?"on":"off");return true}
 catch{return false}
}
export function chooseFidelity0121({lowMemory=false,preset="baseline",choice}={}){
 const original=FIDELITY_0121.overridePresets.includes(preset);
 const selected=original?selectFidelityProfile({lowMemory,preset}):
  selectFidelityProfile({lowMemory:choice?.enabled===false,preset:"baseline"});
 // profile.lowMemory reports PHYSICAL capability, not the policy override.
 // A benchmark ?perfPreset=... is authoritative and must not inherit
 // a saved OFF choice or cause a silent adaptive quality / bloom change.
 return Object.freeze({...selected,lowMemory:!!lowMemory,
  modeSelection:original?"benchmark":choice?.source??"default",
  defaultPremiumOnLowMemory:!original&&!!lowMemory&&selected.premium,
  userRequestedOff:!original&&choice?.enabled===false
 });
}
