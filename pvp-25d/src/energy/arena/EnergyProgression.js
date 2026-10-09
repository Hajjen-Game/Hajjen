// Independent Energy Arena onboarding / play-mode progression.
// This sits between Build Lab (full 10-slot authoring) and EnergyMatch.
// No legacy arena3v3 imports and no mutation of saved Energy builds.
import { ABILITY_BY_ID, FREE_ABILITIES, ROLES } from "../abilityCatalog.js";
import { buildCombatLoadout } from "../buildState.js";

export const PROGRESSION_KEY = "pvp25d-energy-progression-v1";
export const MAX_LEVEL = 8;
export const MODES = Object.freeze({
  training: Object.freeze({
    id:"training",label:"Training Grounds",size:"1v1",subtitle:"Learn one mechanic at a time",
    description:"One opponent, gentle pressure, no coordinated burst. Practice targeting, casting and movement.",
    xpWin:50,xpLoss:22,
  }),
  duo: Object.freeze({
    id:"duo",label:"Duo Skirmish",size:"2v2",subtitle:"Your first team fights",
    description:"You and one AI partner against a matched duo. Less chaos and fewer simultaneous threats.",
    xpWin:65,xpLoss:26,
  }),
  trio: Object.freeze({
    id:"trio",label:"Full Arena",size:"3v3",subtitle:"The complete arena experience",
    description:"Three versus three, full team tactics. Available whenever you want the challenge.",
    xpWin:85,xpLoss:30,
  }),
});
const LEVEL_XP=[0,50,130,240,380,555,765,1010];
const LESSONS=[
  "Learn targeting, movement and your three core abilities.",
  "A new ability joins your kit. Practice using it before taking on bigger fights.",
  "Read enemy casts and react with your defensive or interrupt.",
  "Use line of sight and positioning to avoid free damage.",
  "Learn when to use crowd control rather than dealing damage.",
  "Coordinate your abilities with your AI partner.",
  "Practice chaining pressure while keeping a defensive ready.",
  "Full ten-ability kit. Fine-tune builds, timing and team strategies.",
];
const PREFERENCES={
  healer:["pulse-mend","crystal-bolt","resonance-guard","sun-lance",
    "photon-barrier","reactive-thread","null-prison","symbiosis-link",
    "zenith-crash","resonance-cut","cleanse-flux","rift-slash"],
  melee:["phase-rush","arc-strike","rift-slash","pulse-sever",
    "photon-barrier","gravity-hammer","entropy-mark","crystal-snare",
    "vector-rush","resonance-cut","sun-lance"],
  caster:["flux-bolt","crystal-bolt","phase-slip","sun-lance",
    "photon-barrier","crystal-snare","fracture-spear","null-prison",
    "reactive-thread","resonance-cut","zenith-crash"],
};
const BOT_KITS={
  healer:["pulse-mend","crystal-bolt","resonance-guard","photon-barrier",
    "reactive-thread","cleanse-flux","sun-lance","null-prison",
    "symbiosis-link","resonance-cut"],
  melee:["phase-rush","arc-strike","pulse-sever","rift-slash",
    "photon-barrier","gravity-hammer","entropy-mark","crystal-snare",
    "vector-rush","resonance-cut"],
  caster:["flux-bolt","crystal-bolt","phase-slip","sun-lance",
    "photon-barrier","crystal-snare","fracture-spear","null-prison",
    "resonance-cut","reactive-thread"],
};
const clip=(v,a,b)=>Math.min(b,Math.max(a,v));
export function levelForXp(xp){
  let level=1;
  while(level<MAX_LEVEL&&xp>=LEVEL_XP[level])level++;
  return level;
}
export function slotsForLevel(level){return clip(Math.floor(level)+2,3,10);}
export function progressDetails(profile){
  const level=levelForXp(profile.xp||0),base=LEVEL_XP[level-1],next=LEVEL_XP[level];
  return {
    level,slots:slotsForLevel(level),maxLevel:level===MAX_LEVEL,
    startXp:base,nextXp:next??null,xp:profile.xp||0,
    progress:next==null?1:clip(((profile.xp||0)-base)/(next-base),0,1),
    remaining:next==null?0:Math.max(0,next-(profile.xp||0)),
    lesson:LESSONS[level-1],
  };
}
export function readProgression(storage){
  try {
    const s=JSON.parse(storage.getItem(PROGRESSION_KEY)||"null");
    if(s?.version!==1)return {version:1,xp:0,wins:0,losses:0,lastMode:"training"};
    return {
      version:1,xp:Math.max(0,Math.floor(Number(s.xp)||0)),
      wins:Math.max(0,Math.floor(Number(s.wins)||0)),
      losses:Math.max(0,Math.floor(Number(s.losses)||0)),
      lastMode:MODES[s.lastMode]?s.lastMode:"training",
    };
  }catch{return {version:1,xp:0,wins:0,losses:0,lastMode:"training"};}
}
export function saveProgression(storage,profile){
  try{storage.setItem(PROGRESSION_KEY,JSON.stringify(profile));return true;}
  catch{return false;} // Private/blocked storage must not prevent a battle.
}
export function awardMatch(profile,modeId,won){
  const mode=MODES[modeId]||MODES.training;
  const before=progressDetails(profile),earned=won?mode.xpWin:mode.xpLoss;
  const next={...profile,xp:(profile.xp||0)+earned,
    wins:(profile.wins||0)+(won?1:0),
    losses:(profile.losses||0)+(won?0:1),lastMode:mode.id};
  const after=progressDetails(next);
  return {next,before,after,earned,levelUp:after.level>before.level,
    unlocked:Math.max(0,after.slots-before.slots)};
}
// Finish an unfinished Build Lab draft with temporary starter options for combat.
// The player's stored draft stays untouched; only the staged arena build is filled.
export function completeArenaBuild(build){
  if(!build||!ROLES[build.role])throw Error("Choose a valid role first.");
  const free=FREE_ABILITIES.map(a=>a.id);
  const locked=new Set(ROLES[build.role].locked);
  const chosen=[];
  for(const id of build.freeSlots||[]){
    if(free.includes(id)&&!locked.has(id)&&!chosen.includes(id))chosen.push(id);
  }
  for(const id of [...PREFERENCES[build.role],...free]){
    if(chosen.length>=8)break;
    if(free.includes(id)&&!locked.has(id)&&!chosen.includes(id))chosen.push(id);
  }
  const equipped=new Set([...ROLES[build.role].locked,...chosen]);
  const talents=Object.fromEntries(Object.entries(build.talents||{})
    .filter(([id,rank])=>equipped.has(id)&&Number.isInteger(rank)&&rank>=1&&rank<=3));
  const evolutions=Object.fromEntries(Object.entries(build.evolutions||{})
    .filter(([id])=>equipped.has(id)&&talents[id]===3));
  const staged={...build,freeSlots:chosen.slice(0,8),talents,evolutions};
  buildCombatLoadout(staged); // Validate without mutating the saved build.
  return staged;
}
export function stagedLoadout(build,level){
  const full=buildCombatLoadout(completeArenaBuild(build));
  const byId=new Map(full.abilitySlots.map(slot=>[slot.id,slot]));
  const order=[...PREFERENCES[full.role],...full.abilitySlots.map(s=>s.id)];
  const selected=[];
  for(const id of order){
    if(byId.has(id)&&!selected.includes(id))selected.push(id);
  }
  const slots=selected.slice(0,slotsForLevel(level)).map(id=>byId.get(id));
  return Object.freeze({...full,abilitySlots:Object.freeze(slots),
    progressLevel:level,maxAbilitySlots:full.abilitySlots.length});
}
export function botAbilities(role,level,modeId){
  const cap=modeId==="training"?3:modeId==="duo"?Math.min(8,slotsForLevel(level)):slotsForLevel(level);
  return BOT_KITS[role].slice(0,cap);
}
export function rosterRoles(playerRole,modeId){
  if(modeId==="training")return {friendly:[playerRole],enemy:["caster"]};
  if(modeId==="duo"){
    const partner=playerRole==="healer"?"melee":"healer";
    return {friendly:[playerRole,partner],enemy:["healer",playerRole==="caster"?"caster":"melee"]};
  }
  return {friendly:["healer","melee","caster"],enemy:["healer","melee","caster"]};
}
export function enemyTuning(modeId,level){
  // Early-game protection is explicit, per mode. Scaling fades by level 8.
  const step=clip(level-1,0,7);
  if(modeId==="training")return {damage:.42,healing:.8};
  if(modeId==="duo")return {damage:Math.min(.95,.65+.043*step),healing:Math.min(1,.80+.03*step)};
  return {damage:Math.min(1,.75+.04*step),healing:Math.min(1,.84+.025*step)};
}
