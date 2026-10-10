// Independent Energy Arena onboarding / play-mode progression.
// This sits between Build Lab (full 10-slot authoring) and EnergyMatch.
// No legacy arena3v3 imports and no mutation of saved Energy builds.
import { ABILITY_BY_ID, FREE_ABILITIES, ROLES } from "../abilityCatalog.js?v=20261009-orbit-tree31";
import { buildCombatLoadout } from "../buildState.js?v=20261009-orbit-tree31";

export const PROGRESSION_KEY = "pvp25d-energy-progression-v1";
export const MAX_LEVEL = 30;
export const FORGE_UNLOCK_LEVEL = 10;
// New slots arrive gradually so the player has time to master each spell.
export const SPELL_SLOT_LEVELS = Object.freeze([1,1,1,4,8,12,16,20,24,28]);
export const FRAGMENTS_PER_KILL = 5;
export const MODES = Object.freeze({
  training: Object.freeze({
    id:"training",label:"Training Grounds",size:"1v1",subtitle:"Learn one mechanic at a time",
    description:"One opponent, gentle pressure, no coordinated burst. Practice targeting, casting and movement.",
    xpWin:35,xpLoss:14,
  }),
  duo: Object.freeze({
    id:"duo",label:"Duo Skirmish",size:"2v2",subtitle:"Your first team fights",
    description:"You and one AI partner. Early rivals have no healer; learn counters as you level.",
    xpWin:45,xpLoss:20,
  }),
  trio: Object.freeze({
    id:"trio",label:"Full Arena",size:"3v3",subtitle:"The complete arena experience",
    description:"Three versus three, full team tactics. Available whenever you want the challenge.",
    xpWin:60,xpLoss:24,
  }),
});
// A new ability now takes several victories. Existing XP is preserved.
// Cumulative XP thresholds for levels 1–30. Older saved XP is preserved.
// First levels introduce mechanics quickly; later levels reward mastery.
export const LEVEL_XP=Object.freeze(Array.from({length:MAX_LEVEL},(_,i)=>
  i===0?0:Math.round(i*100+15*i*(i-1))));
const LESSONS=Object.freeze([
  "Learn movement, targeting and your first three abilities.",
  "Practise timing and line of sight before your next spell unlock.",
  "Make good use of your class spells and your first shared ability.",
  "New spell unlocked. Try adding it to your action bar.",
  "Learn how to survive enemy burst without wasting your defensive spells.",
  "Practise combining your favorite abilities.",
  "Explore the different energy disciplines.",
  "New spell unlocked. Test an alternative approach.",
  "Prepare for your first Singularity.",
  "Singularity Forge unlocked! Discover linked spell reactions.",
]);
// Subsequent lessons adapt to progress rather than becoming undefined.
function lessonForLevel(level){
  if(level<=10)return LESSONS[level-1];
  if(SPELL_SLOT_LEVELS.includes(level))return "New spell slot unlocked. Learn the new ability before your next battle.";
  if(level<20)return "Develop your spell ranks and explore Singularity reactions.";
  if(level<28)return "Master timing, Evolution choices and team positioning.";
  return "Complete your ten-spell build and final Evolutions.";
}
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
export function slotsForLevel(level){return SPELL_SLOT_LEVELS.filter(required=>level>=required).length;}
export function progressDetails(profile){
  const level=levelForXp(profile.xp||0),base=LEVEL_XP[level-1],next=LEVEL_XP[level];
  return {
    level,slots:slotsForLevel(level),maxLevel:level===MAX_LEVEL,
    startXp:base,nextXp:next??null,xp:profile.xp||0,
    progress:next==null?1:clip(((profile.xp||0)-base)/(next-base),0,1),
    remaining:next==null?0:Math.max(0,next-(profile.xp||0)),
    lesson:lessonForLevel(level),
  };
}
function blankProgression(){
  return {version:1,xp:0,wins:0,losses:0,lastMode:"training",
    energyFragments:0,blackHoleMatter:0,firstMatterGranted:false,
    singularity:null};
}
function nonnegativeInt(value){return Math.max(0,Math.floor(Number(value)||0));}
export function readProgression(storage){
  const blank=blankProgression();
  try{
    const s=JSON.parse(storage.getItem(PROGRESSION_KEY)||"null");
    if(s?.version!==1)return blank;
    const allowedReactions=["annihilation","distortion","resonance"];
    const raw=s.singularity;
    const singularity=raw&&typeof raw==="object"
      &&typeof raw.anchor==="string"&&typeof raw.partner==="string"
      &&allowedReactions.includes(raw.reaction)
      ?{anchor:raw.anchor,partner:raw.partner,reaction:raw.reaction,
        tier:Math.min(4,nonnegativeInt(raw.tier))}:null;
    return {...blank,
      xp:nonnegativeInt(s.xp),wins:nonnegativeInt(s.wins),
      losses:nonnegativeInt(s.losses),
      lastMode:MODES[s.lastMode]?s.lastMode:"training",
      energyFragments:nonnegativeInt(s.energyFragments),
      blackHoleMatter:nonnegativeInt(s.blackHoleMatter),
      firstMatterGranted:Boolean(s.firstMatterGranted),singularity};
  }catch{return blank;}
}
// Claim the level-10 starter material even for existing profiles which
// crossed level 10 before this update; persistence happens in the caller.
export function ensureStarterMatter(profile){
  if(progressDetails(profile).level<FORGE_UNLOCK_LEVEL||profile.firstMatterGranted)return profile;
  return {...profile,firstMatterGranted:true,
    blackHoleMatter:(profile.blackHoleMatter||0)+1};
}
export function saveProgression(storage,profile){
  try{storage.setItem(PROGRESSION_KEY,JSON.stringify(profile));return true;}
  catch{return false;}
}
export function awardMatch(profile,modeId,won,enemyKills=0){
  const mode=MODES[modeId]||MODES.training;
  const before=progressDetails(profile),earned=won?mode.xpWin:mode.xpLoss;
  const fragments=FRAGMENTS_PER_KILL*nonnegativeInt(enemyKills);
  // Arena victory drops are intentionally occasional. No boss mode exists yet.
  const matterDrop=won&&Math.random()<0.25?1:0;
  const next={...profile,xp:(profile.xp||0)+earned,
    wins:(profile.wins||0)+(won?1:0),
    losses:(profile.losses||0)+(won?0:1),lastMode:mode.id,
    energyFragments:(profile.energyFragments||0)+fragments,
    blackHoleMatter:(profile.blackHoleMatter||0)+matterDrop};
  const after=progressDetails(next);
  const starterMatter=after.level>=FORGE_UNLOCK_LEVEL&&!profile.firstMatterGranted?1:0;
  if(starterMatter){next.blackHoleMatter+=1;next.firstMatterGranted=true;}
  return {next,before,after,earned,levelUp:after.level>before.level,
    unlocked:Math.max(0,after.slots-before.slots),
    fragments,matter:starterMatter+matterDrop};
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
  // Preserve three foundations while making the player's OWN picks determine
  // subsequent slots rather than always forcing the same default spell order.
  // Preserve the two role-locked spells; ALL eight shared slots are replaceable.
  // Saved player picks must come before recommended auto-fill spells.
  const playerChoices=(build.freeSlots||[]).filter(Boolean);
  const order=[...ROLES[full.role].locked,...playerChoices,
    ...PREFERENCES[full.role],...full.abilitySlots.map(s=>s.id)];
  const selected=[];
  for(const id of order){
    if(byId.has(id)&&!selected.includes(id))selected.push(id);
  }
  // Match the earned-point schedule in EnergyCharacter.js without a circular import.
  const limit=clip(Math.floor(level)||1,1,MAX_LEVEL);
  let spent=0,activeEvolutions=0;
  const slots=selected.slice(0,slotsForLevel(level)).map(id=>{
    const base=byId.get(id);
    const earnedRank=Math.max(0,Math.min(base.talentRank,limit-spent));
    spent+=earnedRank;
    const evolution=earnedRank===3&&base.evolutionId&&activeEvolutions<10?base.evolutionId:null;
    if(evolution)activeEvolutions++;
    return Object.freeze({...base,talentRank:earnedRank,evolutionId:evolution});
  });
  return Object.freeze({...full,abilitySlots:Object.freeze(slots),
    progressLevel:level,maxAbilitySlots:full.abilitySlots.length});
}
export function botAbilities(role,level,modeId){
  const cap=modeId==="training"?3:modeId==="duo"?Math.min(8,slotsForLevel(level)):slotsForLevel(level);
  return BOT_KITS[role].slice(0,cap);
}
export function rosterRoles(playerRole,modeId,level=1){
  if(modeId==="training")return {friendly:[playerRole],enemy:[playerRole==="melee"?"melee":"caster"]};
  if(modeId==="duo"){
    const partner=playerRole==="healer"?"melee":"healer";
    // Teach 2v2 mechanics against damage-only teams first. An enemy healer
    // requires CC / interrupts and would make 3-ability matches unwinnable.
    const opponents=level<3?["melee","caster"]:
      ["healer",playerRole==="caster"?"caster":"melee"];
    return {friendly:[playerRole,partner],enemy:opponents};
  }
  return {friendly:["healer","melee","caster"],enemy:["healer","melee","caster"]};
}
export function enemyTuning(modeId,level){
  // Beginner assistance fades before the middle of the 30-level journey.
  const step=clip(level-1,0,19);
  if(modeId==="training")return {damage:Math.min(1,.52+.024*step),healing:Math.min(1,.8+.01*step)};
  if(modeId==="duo")return {damage:Math.min(1,.65+.018*step),healing:Math.min(1,.80+.011*step)};
  return {damage:Math.min(1,.75+.014*step),healing:Math.min(1,.84+.009*step)};
}
