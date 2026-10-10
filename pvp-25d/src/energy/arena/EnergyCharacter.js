// Character identity is independent from build presets, and saved separately.
// Never touches the legacy arena or erases Energy Build Lab saved slots.
import { ABILITY_BY_ID, DISCIPLINES, ROLES } from "../abilityCatalog.js?v=20261009-orbit-tree31";
import { stagedLoadout } from "./EnergyProgression.js?v=20261010-singularity34";

export const CHARACTER_KEY="pvp25d-energy-character-v1";
export function loadCharacter(storage){
  try{
    const x=JSON.parse(storage.getItem(CHARACTER_KEY)||"null");
    if(x?.version!==1||!ROLES[x.role]||typeof x.name!=="string"||!x.name.trim())return null;
    return {version:1,role:x.role,name:x.name.trim().slice(0,20)};
  }catch{return null;}
}
export function saveCharacter(storage,character){
  if(!ROLES[character?.role])throw Error("Choose a role.");
  const name=String(character?.name||"").trim().replace(/\s+/g," ").slice(0,20);
  if(name.length<2)throw Error("Name your orb (at least 2 characters).");
  const next={version:1,name,role:character.role};
  try{storage.setItem(CHARACTER_KEY,JSON.stringify(next));}catch{}
  return next;
}
export function talentPointsForLevel(level){
  // Exactly one Talent Point per level, including level 1.
  // Ten equipped abilities × three ranks = thirty earned points at level 30.
  return Math.min(30,Math.max(1,Math.floor(Number(level)||1)));
}
export function energyIdentity(build,level=1){
  const loadout=stagedLoadout(build,level);
  const weights=Object.fromEntries(Object.keys(DISCIPLINES).map(k=>[k,0]));
  const counts=Object.fromEntries(Object.keys(DISCIPLINES).map(k=>[k,0]));
  for(const slot of loadout.abilitySlots){
    const spell=ABILITY_BY_ID[slot.id];if(!spell)continue;
    const weight=1+(slot.talentRank||0)*1.5+(slot.evolutionId?2.5:0);
    weights[spell.discipline]+=weight;
    counts[spell.discipline]+=1;
  }
  const sorted=Object.keys(DISCIPLINES).sort((a,b)=>
    weights[b]-weights[a]||a.localeCompare(b));
  const primary=sorted[0]||"vital";
  const secondary=sorted.find(k=>k!==primary&&weights[k]>.01)||primary;
  const total=Object.values(weights).reduce((a,b)=>a+b,0)||1;
  return Object.freeze({
    primary,secondary,weights,counts,
    primaryShare:weights[primary]/total,
    style:Object.freeze({core:DISCIPLINES[primary].color,energy:DISCIPLINES[secondary].color}),
    label:DISCIPLINES[primary].name+
      (secondary!==primary?" / "+DISCIPLINES[secondary].name:""),
  });
}
