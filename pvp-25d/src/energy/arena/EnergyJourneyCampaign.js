// Project Energy — first live slice of the rankless single-Origin Journey.
// This save state is distinct from legacy XP, total wins and arena profiles.
// Each Origin has two bound spells of ONE discipline (Genesis Vital,
// Impact Kinetic, Eclipse Cryo); only FIRST clears advance hexes.
import {ROLES,FREE_ABILITIES,ABILITY_BY_ID,MAX_FLUX,BASE_FLUX_REGEN,GENESIS_CLASS_SPELL_IDS,GENESIS_CORE_SPELL_IDS,IMPACT_CLASS_SPELL_IDS,IMPACT_CORE_SPELL_IDS,ECLIPSE_CLASS_SPELL_IDS,ECLIPSE_CORE_SPELL_IDS,SOLAR_CLASS_SPELL_IDS,SOLAR_CORE_SPELL_IDS} from "../abilityCatalog.js?v=20261015-eclipse1";
import {normalizeCompanionStyles} from "./EnergyCompanionStyles.js?v=20261012-style1";
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const FREE_IDS=new Set(FREE_ABILITIES.map(a=>a.id));
const GENESIS_UNLOCKS=Object.freeze(GENESIS_CLASS_SPELL_IDS.slice(2));
const IMPACT_UNLOCKS=Object.freeze(IMPACT_CLASS_SPELL_IDS.slice(2));
const ECLIPSE_UNLOCKS=Object.freeze(ECLIPSE_CLASS_SPELL_IDS.slice(2));
const SOLAR_UNLOCKS=Object.freeze(SOLAR_CLASS_SPELL_IDS.slice(2));
const classUnlocks=role=>role==="healer"?GENESIS_UNLOCKS:role==="melee"?IMPACT_UNLOCKS:role==="caster"?ECLIPSE_UNLOCKS:role==="solar"?SOLAR_UNLOCKS:null;
const classCores=role=>role==="healer"?GENESIS_CORE_SPELL_IDS:role==="melee"?IMPACT_CORE_SPELL_IDS:role==="caster"?ECLIPSE_CORE_SPELL_IDS:role==="solar"?SOLAR_CORE_SPELL_IDS:null;
// Preliminary Journey pacing: each implemented Origin earns four class spells, not 16 mixed-school discoveries.
const GENESIS_DISCOVERY_STAGES=Object.freeze([3,6,9,12]);
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
  if(journey?.devTest===true)return classUnlocks(journey.originRole)?4:JOURNEY_EVOLUTION_STAGES.length;
  const clears=clamp(Math.floor(Number(journey?.clears)||0),0,JOURNEY_MAX_PLANETS);
  return JOURNEY_EVOLUTION_STAGES.slice(0,classUnlocks(journey?.originRole)?4:5).filter(stage=>clears>=stage).length;
}
export function normalizeJourneyEvolutions(value,clears,originRole=null){
  const result={};
  if(!value||typeof value!=="object"||Array.isArray(value))return result;
  const capacity=journeyEvolutionCapacity({clears,originRole});
  for(const [id,evolutionId] of Object.entries(value)){
    if(Object.keys(result).length>=capacity)break;
    if((!classCores(originRole)||classCores(originRole).includes(id))&&
      ABILITY_BY_ID[id]?.evolutions?.some(item=>item.id===evolutionId))
      result[id]=evolutionId;
  }
  return result;
}
export function setJourneyEvolution(profile,role,abilityId,evolutionId){
  const journey=readJourney(profile);
  if(!journey||!ROLES[role])throw Error("Choose a valid Journey Origin.");
  if(journeyEvolutionCapacity(journey)<1)
    throw Error("Evolutions unlock after clearing Stage 10.");
  if(classCores(journey.originRole)&&!classCores(journey.originRole).includes(abilityId))
    throw Error("Only the four core class spells have Evolutions.");
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
export function newJourney(originRole=null){
  return {version:2,originRole,clears:0,owned:[],pending:null,companionStyles:normalizeCompanionStyles(null),evolutions:{}};
}
export function readJourney(profile){
  const j=profile?.journey;
  if(j?.version!==2)return null; // Legacy saves remain untouched.
  const clears=clamp(Math.floor(Number(j.clears)||0),0,JOURNEY_MAX_PLANETS);
  const originRole=j.originRole||null;
  if(classUnlocks(originRole)){
    // Preserve earned Stage milestones when migrating older mixed-discipline
    // Impact/Eclipse saves. Once converted, six class spells replace the shared pool.
    const unlocks=classUnlocks(originRole);
    const stageCount=GENESIS_DISCOVERY_STAGES.filter(stage=>clears>=stage).length;
    const pendingIsClass=GENESIS_DISCOVERY_STAGES.includes(j.pending?.planet)&&
      j.pending?.kind==="spell";
    const previouslyOwned=Array.isArray(j.owned)?j.owned:[];
    const selected=previouslyOwned.filter((id,index,all)=>
      unlocks.includes(id)&&all.indexOf(id)===index);
    const count=Math.min(unlocks.length,Math.max(
      Math.min(unlocks.length,previouslyOwned.length),
      stageCount-(pendingIsClass?1:0)));
    const owned=[...selected,...unlocks.filter(id=>!selected.includes(id))].slice(0,count);
    const pending=pendingIsClass&&count<unlocks.length&&
      j.pending.planet<=clears?{kind:"spell",planet:j.pending.planet}:null;
    return {version:2,originRole,clears,owned,pending,
      companionStyles:normalizeCompanionStyles(j.companionStyles),
      evolutions:normalizeJourneyEvolutions(j.evolutions,clears,originRole)};
  }
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
  return {version:2,originRole,clears,owned,companionStyles:normalizeCompanionStyles(j.companionStyles),
    evolutions:normalizeJourneyEvolutions(j.evolutions,clears,originRole),pending:j.pending?.kind==="spell"&&Number.isInteger(j.pending.planet)&&
    j.pending.planet>=1&&j.pending.planet<=Math.min(16,clears)&&
    !owned.some(id=>id===j.pending.spellId)
    ?{kind:"spell",planet:j.pending.planet}:null};
}
export function eligibleJourneySpells(journey){
  if(!journey)return [];
  if(classUnlocks(journey.originRole))return classUnlocks(journey.originRole).filter(id=>!journey.owned.includes(id));
  return [...EARLY,...(journey.clears>=3?COUNTER:[]),
    ...(journey.clears>=7?ADVANCED:[])].filter(id=>!journey.owned.includes(id));
}
export function awardedJourneyClear(profile){
  const previous=readJourney(profile);
  if(!previous||previous.clears>=JOURNEY_MAX_PLANETS||
     previous.pending)return {next:profile,changed:false};
  const clears=previous.clears+1;
  const pending=classUnlocks(previous.originRole)?
    (GENESIS_DISCOVERY_STAGES.includes(clears)&&previous.owned.length<classUnlocks(previous.originRole).length?
      {kind:"spell",planet:clears}:null):
    (clears<=16?{kind:"spell",planet:clears}:null);
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
  if(classUnlocks(journey?.originRole))return journey?.devTest===true?6:
    2+Math.min(4,journey.owned?.length||0);
  // Transient Game Dev combat previews may replay early Stages with a full
  // ten-spell toolkit. The normal saved Journey never receives this flag.
  if(journey?.devTest===true)return 2+JOURNEY_SHARED_LIMIT;
  return 2+Math.min(JOURNEY_SHARED_LIMIT,journey?.clears||0);
}
export function journeyCombatLoadout(build,journey){
  if(!build||!ROLES[build.role]||!journey)throw Error("Missing Origin or Journey.");
  const owned=new Set(journey.owned);
  const exclusive=classUnlocks(build.role);
  const chosen=exclusive?exclusive.filter(id=>owned.has(id)):
    [...(build.freeSlots||[]),...journey.owned].filter((id,i,ids)=>
      FREE_IDS.has(id)&&owned.has(id)&&ids.indexOf(id)===i);
  const equipped=chosen.slice(0,journeyActiveSlots(journey)-2);
  const ids=[...ROLES[build.role].locked,...equipped];
  return Object.freeze({
    schema:"energy-journey-v2",name:build.name,role:build.role,
    abilitySlots:Object.freeze(ids.map(id=>Object.freeze({id,talentRank:0,
      evolutionId:journeyEvolutionCapacity(journey)>0&&
        ABILITY_BY_ID[id]?.evolutions?.some(e=>e.id===journey.evolutions?.[id])
        ?journey.evolutions[id]:null}))),
    resource:Object.freeze({type:"flux",max:MAX_FLUX,regenerationPerSecond:BASE_FLUX_REGEN}),
    rolePassive:ROLES[build.role].passive,
    progressLevel:1,maxAbilitySlots:exclusive?6:10
  });
}
