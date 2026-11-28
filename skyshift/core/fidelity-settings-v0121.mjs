// SKYSHIFT 0.12.1 — Smart Fidelity is ON by default, including 4 GB devices.
// All ordinary adaptive resolution / bloom / SMAA policies stay unchanged.
// Explicit A/B presets retain precedence. Choice is persisted across visits.
import {selectFidelityProfile} from "./visual-fidelity-v0114.mjs";
import {FIDELITY_0121} from "./fidelity-preference.mjs";
export {FIDELITY_0121,readFidelityChoice,saveFidelityChoice} from "./fidelity-preference.mjs";
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
