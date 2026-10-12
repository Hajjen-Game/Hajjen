// Project Energy — first live slice of the rankless single-Origin Journey.
// This save state is distinct from legacy XP, total wins and arena profiles.
// Each Origin has two bound spells of ONE discipline (Genesis Vital,
// Impact Kinetic, Eclipse Cryo); only FIRST clears advance hexes.
import {ROLES,FREE_ABILITIES,ABILITY_BY_ID,MAX_FLUX,BASE_FLUX_REGEN} from "../abilityCatalog.js?v=20261012-eclipse-oc1";
import {normalizeCompanionStyles} from "./EnergyCompanionStyles.js?v=20261012-style1";
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const FREE_IDS=new Set(FREE_ABILITIES.map(a=>a.id));
const EARLY=["entropy-mark","sun-lance","fracture-spear","vector-rush","reactive-thread"];
const COUNTER=["rift-slash","photon-barrier","phase-slip","pulse-sever","cleanse-flux"];
const ADVANCED=["null-prison","zenith-crash","flux-bolt","gravity-hammer","resonance-cut","symbiosis-link"];
export const JOURNEY_MAX_PLANETS=20;
export const JOURNEY_SHARED_LIMIT=8;
// New Journey has no ranks. Evolution selections are permanent per Origin,
// and each milestone grants one additional active Evolution choice.
export const JOURNEY_EVOLUTION_STAGES=Object.freeze([10,12,14,16,20]);
export function journeyEvolutionCapacity(journey){
  // Dev-only replays keep unlocked Evolutions even on early Stage encounters.
  if(journey?.devTest===true)return JOURNEY_EVOLUTION_STAGES.length;
  const clears=clamp(Math.floor(Number(journey?.clears)||0),0,JOURNEY_MAX_PLANETS);
  return JOURNEY_EVOLUTION_STAGES.filter(stage=>clears>=stage).length;
}
export function normalizeJourneyEvolutions(value,clears){
  const result={};
  if(!value||typeof value!=="object"||Array.isArray(value))return result;
  const capacity=journeyEvolutionCapacity({clears});
  for(const [id,evolutionId] of Object.entries(value)){
    if(Object.keys(result).length>=capacity)break;
    if(ABILITY_BY_ID[id]?.evolutions?.some(item=>item.id===evolutionId))
      result[id]=evolutionId;
  }
  return result;
}
export function setJourneyEvolution(profile,role,abilityId,evolutionId){
  const journey=readJourney(profile);
  if(!journey||!ROLES[role])throw Error("Choose a valid Journey Origin.");
  if(journeyEvolutionCapacity(journey)<1)
    throw Error("Evolutions unlock after clearing Stage 10.");
  if(!ROLES[role].locked.includes(abilityId)&&!journey.owned.includes(abilityId))
    throw Error("Discover this spell before evolving it.");
  if(evolutionId!==null&&!ABILITY_BY_ID[abilityId]?.evolutions?.some(item=>item.id===evolutionId))
    throw Error("Unknown Evolution for this spell.");
  const evolutions={...journey.evolutions};
  if(evolutionId===null)delete evolutions[abilityId];
  else{
    if(!evolutions[abilityId]&&Object.keys(evolutions).length>=journeyEvolutionCapacity(journey))
      throw Error("All Evolution slots are used. Remove one from another spell first.");
    evolutions[abilityId]=evolutionId;
  }
  return {...profile,journey:{...journey,evolutions}};
}
export const JOURNEY_DISCOVERY=Object.freeze({early:Object.freeze(EARLY),counter:Object.freeze(COUNTER),advanced:Object.freeze(ADVANCED)});
export function newJourney(){
  return {version:2,clears:0,owned:[],pending:null,companionStyles:normalizeCompanionStyles(null),evolutions:{}};
}
export function readJourney(profile){
  const j=profile?.journey;
  if(j?.version!==2)return null; // Legacy saves remain untouched.
  const clears=clamp(Math.floor(Number(j.clears)||0),0,JOURNEY_MAX_PLANETS);
  // Pre-Cryo Eclipse Journey saves may have earned Crystal Bolt/Snare as
  // shared spells. They became Eclipse's two bound spells. Preserve the
  // NUMBER of permanent discoveries by exchanging those old earned IDs for
  // meaningful shared spells, without converting XP or granting bonus wins.
  const legacyExchange={"crystal-bolt":"fracture-spear","crystal-snare":"phase-slip"};
  const owned=[];
  for(const oldId of Array.isArray(j.owned)?j.owned:[]){
    const proposed=legacyExchange[oldId]||oldId;
    const eligible=FREE_IDS.has(proposed)&&!owned.includes(proposed);
    const fallback=[...EARLY,...(clears>=3?COUNTER:[]),
      ...(clears>=7?ADVANCED:[])].find(id=>FREE_IDS.has(id)&&!owned.includes(id));
    const next=eligible?proposed:legacyExchange[oldId]?fallback:null;
    if(next&&owned.length<FREE_ABILITIES.length)owned.push(next);
  }
  return {version:2,clears,owned,companionStyles:normalizeCompanionStyles(j.companionStyles),
    evolutions:normalizeJourneyEvolutions(j.evolutions,clears),pending:j.pending?.kind==="spell"&&Number.isInteger(j.pending.planet)&&
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
  // Transient Game Dev combat previews may replay early Stages with a full
  // ten-spell toolkit. The normal saved Journey never receives this flag.
  if(journey?.devTest===true)return 2+JOURNEY_SHARED_LIMIT;
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
    abilitySlots:Object.freeze(ids.map(id=>Object.freeze({id,talentRank:0,
      evolutionId:journeyEvolutionCapacity(journey)>0&&
        ABILITY_BY_ID[id]?.evolutions?.some(e=>e.id===journey.evolutions?.[id])
        ?journey.evolutions[id]:null}))),
    resource:Object.freeze({type:"flux",max:MAX_FLUX,regenerationPerSecond:BASE_FLUX_REGEN}),
    rolePassive:ROLES[build.role].passive,
    progressLevel:1,maxAbilitySlots:10
  });
}
