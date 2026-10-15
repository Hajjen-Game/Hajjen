// Multi-character roster for Energy Arena. All records remain local to this
// browser. Old single-character keys mirror the active record for compatibility.
import { ROLES, FREE_ABILITIES, GENESIS_CLASS_SPELL_IDS } from "../abilityCatalog.js?v=20261012-eclipse-oc1";
import { completeArenaBuild } from "./EnergyProgression.js?v=20261012-rift1";
import { createBuild, normalizeBuild } from "../buildState.js?v=20261012-eclipse-oc1";
import { newJourney,readJourney } from "./EnergyJourneyCampaign.js?v=20261012-evolution1";

export const ORIGIN_ROSTER_KEY="pvp25d-energy-origin-roster-v1";
const MAX_ORIGINS=12;
export const DEV_ORIGIN_ID="dev-test-origin-v1";
const clone=value=>JSON.parse(JSON.stringify(value));
const validCharacter=character=>character&&ROLES[character.role]
  &&typeof character.name==="string"&&character.name.trim().length>=2;
const id=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
export function freshOriginProgression(role=null){
  return {version:1,xp:0,wins:0,losses:0,lastMode:"training",energyFragments:0,
    blackHoleMatter:0,firstMatterGranted:false,singularity:null,
    journey:newJourney(role)};
}
function safeBuildStore(value,role){
  const saved=Array.from({length:3},(_,i)=>{
    const stored=value?.saved?.[i];
    return stored&&ROLES[stored.role]?normalizeBuild(stored):null;
  });
  return {version:1,draft:value?.draft?.role===role?
    normalizeBuild(value.draft):createBuild(role),saved};
}
function safeProfile(value,role){
  const defaults=freshOriginProgression(role);
  if(!value||typeof value!=="object")return defaults;
  const safe={...defaults,...value,version:1};
  // No forced conversion from historical XP/wins to Planet Defense clears:
  // only profiles that explicitly contain Journey v2 participate.
  if(!Object.prototype.hasOwnProperty.call(value,"journey"))delete safe.journey;
  else if(readJourney(safe))safe.journey=readJourney({...safe,journey:{...safe.journey,originRole:role}});
  else delete safe.journey;
  return safe;
}
function record(character,buildStore,profile,forcedId,devTest=false){
  if(!validCharacter(character))throw Error("Name your Origin (at least 2 characters).");
  const normalized={version:1,name:character.name.trim().slice(0,20),role:character.role};
  return {id:forcedId||id(),devTest:Boolean(devTest),character:normalized,
    builds:safeBuildStore(buildStore,normalized.role),
    progression:safeProfile(profile,normalized.role)};
}
export function readOriginRoster(storage,legacyCharacter,buildStore,profile){
  try{
    const raw=JSON.parse(storage.getItem(ORIGIN_ROSTER_KEY)||"null");
    if(raw?.version===1&&Array.isArray(raw.characters)){
      // The user approved discarding ALL pre-Journey XP/Rank characters.
      // Keep every Journey Origin exactly as it is (including Stage clears
      // and newly chosen companion styles).
      const valid=raw.characters.filter(entry=>
        validCharacter(entry?.character)&&entry?.progression?.journey?.version===2);
      // One clearly marked dev-only save does not consume a normal Origin slot.
      const normal=valid.filter(entry=>entry.id!==DEV_ORIGIN_ID).slice(0,MAX_ORIGINS);
      const dev=valid.find(entry=>entry.id===DEV_ORIGIN_ID&&entry.devTest===true
        &&entry.progression?.devTest===true);
      const characters=[...normal,...(dev?[dev]:[])].map(entry=>
        record(entry.character,entry.builds,entry.progression,
          typeof entry.id==="string"&&entry.id?entry.id:undefined,
          entry===dev));
      const activeId=characters.some(entry=>entry.id===raw.activeId)?raw.activeId:
        characters[0]?.id||null;
      return {version:1,activeId,characters};
    }
  }catch{}
  // Do not resurrect pre-Journey single-character saves from old browser
  // storage. Those obsolete profiles are intentionally excluded.
  return {version:1,activeId:null,characters:[]};
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
    ?record(character,buildStore,profile,entry.id,entry.devTest):entry)};
}
export function appendOrigin(roster,character){
  if(roster.characters.filter(entry=>!entry.devTest).length>=MAX_ORIGINS)
    throw Error("Your Origin list is full (12 characters).");
  const entry=record(character,{draft:createBuild(character.role),
    saved:[null,null,null]},freshOriginProgression(character.role));
  return {...roster,activeId:entry.id,characters:[...roster.characters,entry]};
}
// Internal Game Dev tool. The marker and save are explicitly isolated; never
// merge a completed Journey into a normal Origin or replace its build presets.
export function upsertDevOrigin(roster,role){
  if(!ROLES[role])throw Error("Choose Genesis, Impact or Eclipse.");
  const origin=ROLES[role];
  const character={name:"DEV "+origin.name.toUpperCase(),role};
  const draft=completeArenaBuild(createBuild(role));
  const progression={...freshOriginProgression(role),
    lastMode:"defense",devTest:true,devStage:20,
    journey:{...newJourney(role),clears:20,
      owned:role==="healer"?GENESIS_CLASS_SPELL_IDS.slice(2):FREE_ABILITIES.map(spell=>spell.id),pending:null}};
  const entry=record(character,{draft,saved:[null,null,null]},
    progression,DEV_ORIGIN_ID,true);
  return {...roster,activeId:DEV_ORIGIN_ID,
    characters:[...roster.characters.filter(item=>item.id!==DEV_ORIGIN_ID),entry]};
}
export function devOrigin(roster){
  return roster.characters.find(entry=>entry.id===DEV_ORIGIN_ID&&entry.devTest)||null;
}
export function chooseOrigin(roster,originId){
  if(!roster.characters.some(entry=>entry.id===originId))
    throw Error("Could not find that saved Origin.");
  return {...roster,activeId:originId};
}
