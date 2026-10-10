// Multi-character roster for Energy Arena. All records remain local to this
// browser. Old single-character keys mirror the active record for compatibility.
import { ROLES } from "../abilityCatalog.js?v=20261010-origins35";
import { createBuild, normalizeBuild } from "../buildState.js?v=20261010-origins35";

export const ORIGIN_ROSTER_KEY="pvp25d-energy-origin-roster-v1";
const MAX_ORIGINS=12;
const clone=value=>JSON.parse(JSON.stringify(value));
const validCharacter=character=>character&&ROLES[character.role]
  &&typeof character.name==="string"&&character.name.trim().length>=2;
const id=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
export function freshOriginProgression(){
  return {version:1,xp:0,wins:0,losses:0,lastMode:"training",energyFragments:0,
    blackHoleMatter:0,firstMatterGranted:false,singularity:null};
}
function safeBuildStore(value,role){
  const saved=Array.from({length:3},(_,i)=>{
    const stored=value?.saved?.[i];
    return stored&&ROLES[stored.role]&&stored.role===role?normalizeBuild(stored):null;
  });
  return {version:1,draft:value?.draft?.role===role?
    normalizeBuild(value.draft):createBuild(role),saved};
}
function safeProfile(value){
  const defaults=freshOriginProgression();
  if(!value||typeof value!=="object")return defaults;
  return {...defaults,...value,version:1};
}
function record(character,buildStore,profile,forcedId){
  if(!validCharacter(character))throw Error("Name your Origin (at least 2 characters).");
  const normalized={version:1,name:character.name.trim().slice(0,20),role:character.role};
  return {id:forcedId||id(),character:normalized,
    builds:safeBuildStore(buildStore,normalized.role),
    progression:safeProfile(profile)};
}
export function readOriginRoster(storage,legacyCharacter,buildStore,profile){
  try{
    const raw=JSON.parse(storage.getItem(ORIGIN_ROSTER_KEY)||"null");
    if(raw?.version===1&&Array.isArray(raw.characters)){
      const characters=raw.characters.filter(entry=>validCharacter(entry?.character))
        .slice(0,MAX_ORIGINS).map(entry=>record(entry.character,entry.builds,entry.progression,
          typeof entry.id==="string"&&entry.id?entry.id:undefined));
      const activeId=characters.some(entry=>entry.id===raw.activeId)?raw.activeId:
        characters[0]?.id||null;
      return {version:1,activeId,characters};
    }
  }catch{}
  const characters=validCharacter(legacyCharacter)?
    [record(legacyCharacter,buildStore,profile)]:[];
  return {version:1,activeId:characters[0]?.id||null,characters};
}
export function persistOriginRoster(storage,roster){
  storage.setItem(ORIGIN_ROSTER_KEY,JSON.stringify(roster));
}
export function activeOrigin(roster){
  return roster.characters.find(entry=>entry.id===roster.activeId)||null;
}
export function snapshotActiveOrigin(roster,character,buildStore,profile){
  if(!roster.activeId||!validCharacter(character))return roster;
  return {...roster,characters:roster.characters.map(entry=>entry.id===roster.activeId
    ?record(character,buildStore,profile,entry.id):entry)};
}
export function appendOrigin(roster,character){
  if(roster.characters.length>=MAX_ORIGINS)
    throw Error("Your Origin list is full (12 characters).");
  const entry=record(character,{draft:createBuild(character.role),
    saved:[null,null,null]},freshOriginProgression());
  return {...roster,activeId:entry.id,characters:[...roster.characters,entry]};
}
export function chooseOrigin(roster,originId){
  if(!roster.characters.some(entry=>entry.id===originId))
    throw Error("Could not find that saved Origin.");
  return {...roster,activeId:originId};
}
