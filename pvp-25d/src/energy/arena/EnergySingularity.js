// Singularity Forge: one class-anchor + one unlocked shared spell.
// Matter pays for creating/replacing the pairing or reaction. Fragments
// develop its separate branch: no spell Talent Points are consumed.
import { ROLES, ABILITY_BY_ID } from "../abilityCatalog.js?v=20261009-orbit-tree31";

export const REACTIONS=Object.freeze({
  annihilation:Object.freeze({
    id:"annihilation",name:"Annihilation",short:"Burst",
    description:"Partner spell charges the core. The next anchor spell within 6s releases an offensive singularity pulse.",
    note:"Enemy targets take extra damage; support anchors pulse damage to nearby enemies.",
  }),
  distortion:Object.freeze({
    id:"distortion",name:"Distortion",short:"Control",
    description:"Partner spell charges the core. The next anchor spell within 6s releases a gravitational slowing pulse.",
    note:"Slows opponents near the anchor's target, or near the caster for mobility spells. No stun or DR bypass.",
  }),
  resonance:Object.freeze({
    id:"resonance",name:"Resonance",short:"Sustain",
    description:"Partner spell charges the core. The next anchor spell within 6s restores some Flux and raises a brief energy shield.",
    note:"A support anchor can protect its ally; damage anchors protect the caster.",
  }),
});
export const FORGE_LEVEL=10;
export const FORGE_TIER_LEVELS=Object.freeze([15,20,25,30]);
export const FORGE_TIER_COSTS=Object.freeze([25,40,60,80]);
export const FORGE_CHANGE_MATTER=1;
export const SYNERGY_WINDOW_SECONDS=6;

export function validateForgeSelection(profile,build,unlockedIds,selection){
  const level=Math.max(1,Math.floor(Number(profile?.level)||1));
  if(level<FORGE_LEVEL)return "Singularity Forge requires level 10.";
  if(!selection||!REACTIONS[selection.reaction])return "Choose a reaction.";
  if(!ROLES[build?.role]?.locked.includes(selection.anchor))return "Choose one of your two class-bound spells.";
  if(!ABILITY_BY_ID[selection.partner]||ABILITY_BY_ID[selection.partner].role)return "Choose a shared partner spell.";
  if(selection.anchor===selection.partner)return "Choose two different spells.";
  if(!unlockedIds.includes(selection.anchor)||!unlockedIds.includes(selection.partner)){
    return "Both spells must be unlocked in your current action bar.";
  }
  return null;
}

export function forgeSingularity(profile,build,unlockedIds,selection){
  const error=validateForgeSelection(profile,build,unlockedIds,selection);
  if(error)throw Error(error);
  const previous=profile.singularity;
  if(previous&&previous.anchor===selection.anchor&&previous.partner===selection.partner
    &&previous.reaction===selection.reaction)return profile; // no cost
  if((profile.blackHoleMatter||0)<FORGE_CHANGE_MATTER)throw Error("You need 1 Black Hole Matter.");
  return {...profile,blackHoleMatter:profile.blackHoleMatter-FORGE_CHANGE_MATTER,
    singularity:{anchor:selection.anchor,partner:selection.partner,reaction:selection.reaction,tier:0}};
}
export function upgradeSingularity(profile){
  const core=profile?.singularity;
  if(!core||!REACTIONS[core.reaction])throw Error("Create a Singularity first.");
  const tier=Math.max(0,Math.floor(core.tier||0));
  if(tier>=FORGE_TIER_LEVELS.length)throw Error("Singularity is fully mastered.");
  if(profile.level<FORGE_TIER_LEVELS[tier])
    throw Error("Next Singularity mastery requires level "+FORGE_TIER_LEVELS[tier]+".");
  if((profile.energyFragments||0)<FORGE_TIER_COSTS[tier])
    throw Error("Not enough Energy Fragments. You need "+FORGE_TIER_COSTS[tier]+".");
  return {...profile,energyFragments:profile.energyFragments-FORGE_TIER_COSTS[tier],
    singularity:{...core,tier:tier+1}};
}
export function singularityAvailable(core,level,unlockedIds){
  return Boolean(core&&level>=FORGE_LEVEL&&REACTIONS[core.reaction]
    &&unlockedIds.includes(core.anchor)&&unlockedIds.includes(core.partner));
}
