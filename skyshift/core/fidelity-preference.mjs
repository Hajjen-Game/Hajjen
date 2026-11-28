// Shared storage-only fidelity preference. No renderer imports.
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
