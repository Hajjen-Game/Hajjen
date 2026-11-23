// SKYSHIFT 0.28.3 — NEON VAULT boost clarity, no SAFE/RISK detours.
// The source of truth for new Vault pads. 0.28.2, Skyline and Aurora retain
// their exact prior data and graphics. This module never touches flight/GRIP.
import {CIRCUIT} from "../../circuit-layout-v082.mjs";

export const VAULT_BOOST_0283=Object.freeze({
 version:"0.28.3",id:"vault-main-boost-clarity",
 title:"Main Boost Plates & Risk Lane Cleanup",
 onlyTrack:"vault",minRelease:"0.28.3",
 mainPadsPerLap:5,riskPadsPerLap:0,riskGuideLines:0,
 physicalMultiplier:1.40,physicalDurationSeconds:.92,
 roadGeometryUnchanged:true,physicsIntegratorUnchanged:true,
 gripUnchanged:true,railCollidersUnchanged:true,skylineUnchanged:true,
 render:"existing PBR deck shader, embedded gold chevrons + emissive bloom",
 additionalMeshes:0,additionalDynamicLights:0,additionalColliders:0,
 comparison:"?track=vault&v=0.28.2"
});
const main=Object.freeze([
 ["vault-launch",58,90],
 ["vault-recovery",692,730],
 ["vault-sweeper",2198,2244],
 ["vault-final-corner",2818,2860],
 ["vault-finale",3150,3195]
]);
export const VAULT_MAIN_BOOST_PADS_0283=Object.freeze(main.map(([id,start,end])=>
 Object.freeze({id,group:id,kind:"boost",start,end,
  lateralMin:-4.55,lateralMax:4.55,
  multiplier:VAULT_BOOST_0283.physicalMultiplier,
  durationSeconds:VAULT_BOOST_0283.physicalDurationSeconds,
  direction:"CENTER"})
));
export const VAULT_RACE_BOOST_PADS_0283=Object.freeze(
 Array.from({length:CIRCUIT.laps},(_,lap)=>VAULT_MAIN_BOOST_PADS_0283.map(p=>
  Object.freeze({...p,id:p.id+"-lap"+(lap+1),
   group:p.group+"-lap"+(lap+1),
   start:p.start+lap*CIRCUIT.lapLength,
   end:p.end+lap*CIRCUIT.lapLength}))).flat()
);
export function vaultBoostEnabled0283(search=typeof location!=="undefined"?location.search:""){
 const params=new URLSearchParams(search||"");
 if(params.get("track")!=="vault")return false;
 const release=params.get("v")||"";
 const version=/^(\d+)\.(\d+)\.(\d+)$/.exec(release);
 if(!version)return false;
 const [major,minor,patch]=version.slice(1).map(Number);
 return major>0||minor>28||(minor===28&&patch>=3);
}
export function vaultMainBoostAt0283(s,lateral){
 if(!Number.isFinite(s)||!Number.isFinite(lateral))return null;
 return VAULT_RACE_BOOST_PADS_0283.find(p=>
  s>=p.start&&s<p.end&&lateral>=p.lateralMin&&lateral<=p.lateralMax)??null;
}
