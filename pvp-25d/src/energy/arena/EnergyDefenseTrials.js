// Planet Defense's in-combat field guide. Trials use the SAME Rank/Evolution/
// Singularity values as Character HUB. PvE Enchantments are intentionally
// separate: these help with waves and are never permanent or used in Arena.
import { ABILITY_BY_ID, ROLES, ABILITIES } from "../abilityCatalog.js?v=20261011-identity12";
import { RANK_PATHS } from "./EnergySpellBalance.js?v=20261010-balanced-ranks41";

const CURATED_EVOLUTIONS=Object.freeze({
  healer:[["pulse-mend","restoration"],["resonance-guard","guardian"],
    ["pulse-mend","preservation"]],
  melee:[["arc-strike","twin-arc"],["phase-rush","pursuit"]],
  caster:[["flux-bolt","rapid-flux"],["flux-bolt","overcharge"],
    ["phase-slip","phase-shield"]]
});
const REACTIONS=Object.freeze([
  {id:"annihilation",name:"Annihilation",description:"Release a damaging energy burst near your anchor's target."},
  {id:"distortion",name:"Distortion",description:"Slow nearby enemies around your anchor's target."},
  {id:"resonance",name:"Resonance",description:"Grant a shield and restore Flux when the combination succeeds."}
]);

export function trialLesson(level,completedWave){
  if(completedWave===1)return {
    title:"SPELL MASTERY · YOUR FUTURE RANKS",
    intro:"Mastery is the Rank 1–3 progression from your Character HUB. Try one real spell upgrade for the rest of this run — no Talent Points spent.",
    why:"Permanent unlock: level up to earn Talent Points, then spend them on this spell's Rank in the Evolution Tree."
  };
  if(completedWave===2)return {
    title:"DISCOVER YOUR BUILD",
    intro:"Choose another real Mastery improvement, or an optional PvE Enchantment that makes your existing spell better against groups of enemies.",
    why:"Mastery exists in every mode. PvE Enchantments are temporary and only appear in survival/expedition-style modes."
  };
  if(completedWave===3&&level>=4)return {
    title:"EVOLUTION TRIAL · PREVIEW RANK 3",
    intro:"An Evolution changes how a familiar spell works. For this trial, we temporarily lend you the required Rank 3 too, so you can feel the REAL Evolution in the next wave.",
    why:"Permanent unlock: earn 3 Talent Points for that spell, reach Rank 3, then choose its Evolution in the Character HUB."
  };
  if(completedWave===4&&level>=10)return {
    title:"SINGULARITY FORGE · FREE TRIAL",
    intro:"A Singularity links one Origin spell (anchor) with one equipped shared spell (partner). Cast the partner first, then the anchor within 6 seconds to trigger the reaction.",
    why:"Permanent unlock: Singularity Forge opens at Level 10. Forging/changing your saved combination costs Black Hole Matter; this run's trial is free."
  };
  if(completedWave===4&&level>=4)return {
    title:"EVOLVE OR ENCHANT",
    intro:"Choose between a real Evolution preview or a temporary PvE Enchantment to handle the final wave. Trials are not permanent purchases.",
    why:"Evolutions become permanent through Rank 3 in your Character HUB. PvE Enchantments exist only for survival/expedition runs."
  };
  return {
    title:"GET READY FOR THE NEXT WAVE",
    intro:"Keep learning your real spell Mastery, or experiment with a temporary PvE Enchantment to handle more enemies.",
    why:"You will discover Evolution Trials as your level grows, and the Singularity Forge trial from Level 10."
  };
}

export function defenseTrialChoices(match,enchantments){
  const wave=match.waveIntermission,level=match.progressLevel,actor=match.player;
  const equipped=actor.abilities;
  const mastery=equipped.map(spellId=>{
    const current=Math.max(0,Math.min(3,actor.talentRanks[spellId]||0));
    if(current>=3||!RANK_PATHS[spellId])return null;
    const rank=current+1,name=ABILITY_BY_ID[spellId].name;
    return {id:"mastery:"+spellId+":"+rank,kind:"mastery",spellId,rank,
      name:name+" · RANK "+rank,label:"REAL SPELL MASTERY",
      description:RANK_PATHS[spellId][rank-1],
      how:"Use "+name+" in Wave "+(wave+1)+" to feel its higher Rank.",
      unlock:"Earn Talent Points from levelling; spend one per Rank in Character HUB.",
      isTemporary:true};
  }).filter(Boolean);
  // Every real Evolution is discoverable in Planet Defense, regardless of
  // discipline/Origin. Never preview a spell not equipped at this level.
  // Put shared spells first in the additional pool to demonstrate the player's
  // own custom build rather than only the two Origin starter abilities.
  const previewPool=[...(CURATED_EVOLUTIONS[actor.role]||[]),
    ...ABILITIES.filter(a=>equipped.includes(a.id)&&!ROLES[actor.role].locked.includes(a.id))
      .flatMap(a=>a.evolutions.map(e=>[a.id,e.id])),
    ...ABILITIES.filter(a=>equipped.includes(a.id)&&ROLES[actor.role].locked.includes(a.id))
      .flatMap(a=>a.evolutions.map(e=>[a.id,e.id]))];
  const evolution=previewPool.filter(([id,evo],index,array)=>
    array.findIndex(([x,y])=>x===id&&y===evo)===index).map(([spellId,evolutionId])=>{
    if(!equipped.includes(spellId)||actor.evolutions[spellId]===evolutionId)return null;
    const ev=ABILITY_BY_ID[spellId]?.evolutions.find(x=>x.id===evolutionId);
    if(!ev)return null;
    return {id:"evolution:"+spellId+":"+evolutionId,kind:"evolution",spellId,evolutionId,
      rank:3,name:ev.name.toUpperCase(),label:"REAL EVOLUTION · RANK 3 TRIAL",
      description:ev.description,
      how:"Use "+ABILITY_BY_ID[spellId].name+" in Wave "+(wave+1)+
        ". This trial also loans Rank 3 for the rest of the match.",
      unlock:"Permanently unlock Rank 3 with three Talent Points, then select "+ev.name+
        " in your Evolution Tree.",isTemporary:true};
  }).filter(Boolean);
  const enchant=(enchantments||[]).filter(e=>equipped.includes(e.spellId)
    &&(match.resonances[e.id]||0)<3).map(e=>{
    const tier=(match.resonances[e.id]||0)+1;
    return {id:"enchant:"+e.id+":"+tier,kind:"enchantment",spellId:e.spellId,
      enchantmentId:e.id,tier,name:e.name,label:"PVE ENCHANTMENT · TIER "+tier,
      description:e.description,how:"Use "+ABILITY_BY_ID[e.spellId].name+
        " in the next wave. This can hit multiple foes or extend your survival.",
      unlock:"PvE-only upgrade. It does not exist in normal Arena and disappears after this match.",
      isTemporary:true};
  }).sort((a,b)=>a.tier-b.tier); // Offer unexplored effects before repeat tiers.
  const core=()=>{
    const anchors=ROLES[actor.role].locked.filter(id=>equipped.includes(id));
    const partners=equipped.filter(id=>!ROLES[actor.role].locked.includes(id));
    if(!anchors.length||!partners.length)return [];
    // Reveal both dimensions of the real Forge: players preview different
    // spell PAIRS as well as three different reaction types.
    return REACTIONS.map((reaction,i)=>{
      const anchor=anchors[i%anchors.length],partner=partners[i%partners.length];
      return {
        id:"singularity:"+anchor+":"+partner+":"+reaction.id,kind:"singularity",
        spellId:anchor,anchor,partner,reaction:reaction.id,
        name:reaction.name.toUpperCase(),label:"REAL SINGULARITY · FREE TRIAL",
        pair:ABILITY_BY_ID[partner].name+" → "+ABILITY_BY_ID[anchor].name,
        description:reaction.description,
        how:"Cast "+ABILITY_BY_ID[partner].name+" → "+ABILITY_BY_ID[anchor].name+
          " within 6 seconds to trigger "+reaction.name+".",
        unlock:"At Level 10, spend Black Hole Matter in Singularity Forge to save a combination permanently.",
        isTemporary:true
      };
    });
  };
  let ordered;
  if(wave===1)ordered=[...mastery];
  else if(wave===2)ordered=[...mastery.slice(1),...enchant.slice(0,1),...mastery.slice(0,1)];
  else if(wave===3&&level>=4)ordered=[
    ...evolution.slice(0,1),
    ...evolution.filter(e=>!ROLES[actor.role].locked.includes(e.spellId)).slice(0,1),
    ...enchant.slice(0,1)
  ];
  else if(wave===3)ordered=[...mastery.slice(2),...enchant.slice(0,2),...mastery.slice(0,2)];
  else if(wave===4&&level>=10)ordered=core();
  else if(wave===4&&level>=4)ordered=[
    ...evolution.filter(e=>!ROLES[actor.role].locked.includes(e.spellId)).slice(1,2),
    ...enchant.slice(0,2),...evolution.slice(1,2)
  ];
  else ordered=[...mastery.slice(1,2),...enchant.slice(1),...mastery.slice(0,1)];
  // If some spells are already maxed/fully evolved, fill empty cards with
  // useful eligible choices. Never show an unearned or unavailable ability.
  const output=[];
  for(const choice of [...ordered,...mastery,...evolution.filter(()=>level>=4),...enchant]){
    if(!choice||output.some(x=>x.id===choice.id))continue;
    if(choice.kind==="evolution"&&level<4)continue;
    if(choice.kind==="singularity"&&level<10)continue;
    output.push(choice);if(output.length>=3)break;
  }
  return output;
}
