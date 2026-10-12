// Project Energy — first live slice of the rankless single-Origin Journey.
// This save state is distinct from legacy XP, total wins and arena profiles.
// Player Origins start with two bound spells; only FIRST clears advance hexes.
import {ROLES,FREE_ABILITIES,MAX_FLUX,BASE_FLUX_REGEN} from "../abilityCatalog.js?v=20261011-identity13";
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const FREE_IDS=new Set(FREE_ABILITIES.map(a=>a.id));
const EARLY=["entropy-mark","sun-lance","crystal-bolt","vector-rush","reactive-thread"];
const COUNTER=["rift-slash","photon-barrier","crystal-snare","pulse-sever","cleanse-flux"];
const ADVANCED=["null-prison","zenith-crash","fracture-spear","gravity-hammer","resonance-cut","symbiosis-link"];
export const JOURNEY_MAX_PLANETS=20;
export const JOURNEY_SHARED_LIMIT=8;
export const JOURNEY_DISCOVERY=Object.freeze({early:Object.freeze(EARLY),counter:Object.freeze(COUNTER),advanced:Object.freeze(ADVANCED)});
export function newJourney(){
  return {version:2,clears:0,owned:[],pending:null};
}
export function readJourney(profile){
  const j=profile?.journey;
  if(j?.version!==2)return null; // Legacy saves remain untouched.
  const clears=clamp(Math.floor(Number(j.clears)||0),0,JOURNEY_MAX_PLANETS);
  const owned=[...new Set(Array.isArray(j.owned)?j.owned.filter(id=>FREE_IDS.has(id)):[])].slice(0,FREE_ABILITIES.length);
  return {version:2,clears,owned,pending:j.pending?.kind==="spell"&&Number.isInteger(j.pending.planet)&&
    j.pending.planet>=1&&j.pending.planet<=Math.min(16,clears)&&
    !owned.some(id=>id===j.pending.spellId)
    ?{kind:"spell",planet:j.pending.planet}:null};
}
export function eligibleJourneySpells(journey){
  if(!journey)return [];
  return [...EARLY,...(journey.clears>=3?COUNTER:[]),
    ...(journey.clears>=7?ADVANCED:[])].filter(id=>!journey.owned.includes(id));
}
export function awardedJourneyClear(profile){
  const previous=readJourney(profile);
  if(!previous||previous.clears>=JOURNEY_MAX_PLANETS||
     previous.pending)return {next:profile,changed:false};
  const clears=previous.clears+1;
  const pending=clears<=16?{kind:"spell",planet:clears}:null;
  return {next:{...profile,journey:{...previous,clears,pending}},
    changed:true,planet:clears,pendingSpell:Boolean(pending)};
}
export function claimJourneySpell(profile,id){
  const journey=readJourney(profile);
  if(!journey?.pending||!eligibleJourneySpells(journey).includes(id))
    throw Error("This spell is not available for your next Journey reward.");
  return {...profile,journey:{...journey,owned:[...journey.owned,id],pending:null}};
}
export function journeyActiveSlots(journey){
  return 2+Math.min(JOURNEY_SHARED_LIMIT,journey?.clears||0);
}
export function journeyCombatLoadout(build,journey){
  if(!build||!ROLES[build.role]||!journey)throw Error("Missing Origin or Journey.");
  const owned=new Set(journey.owned);
  const chosen=[...(build.freeSlots||[]),...journey.owned].filter((id,i,ids)=>
    FREE_IDS.has(id)&&owned.has(id)&&ids.indexOf(id)===i)
    .slice(0,journeyActiveSlots(journey)-2);
  const ids=[...ROLES[build.role].locked,...chosen];
  return Object.freeze({
    schema:"energy-journey-v2",name:build.name,role:build.role,
    abilitySlots:Object.freeze(ids.map(id=>Object.freeze({id,talentRank:0,evolutionId:null}))),
    resource:Object.freeze({type:"flux",max:MAX_FLUX,regenerationPerSecond:BASE_FLUX_REGEN}),
    rolePassive:ROLES[build.role].passive,
    progressLevel:1,maxAbilitySlots:10
  });
}
