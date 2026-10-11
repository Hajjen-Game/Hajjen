// Level-led Planet Defense encounters. A small selection of readable mechanics
// grows as character spell slots unlock (1, 4, 8, 12, 16, 20, 24, 28).
// No saved character stats, PvP rules or temporary spell trials are changed.
const clamp=(value,low,high)=>Math.min(high,Math.max(low,value));
const THRESHOLDS=[1,4,8,12,16,20,24,28];
const TIERS=["INITIATE","AWAKENING","DISRUPTION","FRACTURE",
  "RIFTSTORM","VOIDFRONT","ASCENSION","CATACLYSM"];
const NAMES=["FIRST CONTACT","THE SWARM","DISRUPTION","OVERLOAD","FINAL STAND"];
const BASE=[
  ["raider","spark"],
  ["raider","spark","raider"],
  ["spark","raider","spark","raider"],
  ["raider","spark","mender","spark","raider"],
  ["boss","raider","spark","raider","spark","raider"],
];
const ENEMIES={
  boss:{role:"caster",name:"RIFT WARDEN",weight:1},
  raider:{role:"melee",name:"PHASE RAIDER",weight:1},
  spark:{role:"caster",name:"RIFT SPARK",weight:1},
  mender:{role:"healer",name:"VOID MENDER",weight:1},
  skirmisher:{role:"melee",name:"PHASE SKIRMISHER",weight:1},
  channeler:{role:"caster",name:"RIFT CHANNELER",weight:2},
  weaver:{role:"healer",name:"VOID WEAVER",weight:2},
  bulwark:{role:"melee",name:"RIFT BULWARK",weight:2},
  harbinger:{role:"caster",name:"RIFT HARBINGER",weight:2},
};
export const PVE_ENEMY_ARCHETYPES=Object.freeze(ENEMIES);
export const ENCOUNTER_SPELLS=Object.freeze({
  nova:"encounter-rift-nova",
  mark:"encounter-rift-mark",
});
export const PVE_BOSS_TITLES=Object.freeze([
  {level:1,name:"RIFT WARDEN",title:"GATEKEEPER"},
  {level:8,name:"RIFT CONDUCTOR",title:"THE CHANNELER"},
  {level:16,name:"RIFT ARCHITECT",title:"THE FRACTURED"},
  {level:24,name:"RIFT SOVEREIGN",title:"THE UNBOUND"},
]);
const bossForLevel=level=>[...PVE_BOSS_TITLES].reverse().find(b=>level>=b.level);
const random=(seed)=>{
  let x=(seed>>>0)||0x9e3779b9;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
};
function waveArchetypes(wave,tier,variation){
  const enemies=[...BASE[wave-1]];
  // Even the opening encounter develops once the player has a full toolkit.
  // Do not force a level-28 hero through the same two-target tutorial again.
  if(tier>=3&&wave===1)enemies.push("skirmisher");
  if(tier>=5&&wave===1)enemies.push("channeler");
  if(tier>=1&&wave>=3)enemies.push(wave===3?"skirmisher":"raider");
  if(tier>=2&&wave>=2){
    const index=enemies.findIndex((e,i)=>i>0&&e==="spark");
    if(index>=0)enemies[index]="channeler";
  }
  if(tier>=3&&wave>=3){
    const index=enemies.findIndex((e,i)=>i>0&&e==="raider");
    if(index>=0)enemies[index]="bulwark";
  }
  if(tier>=4&&wave>=4){
    const index=enemies.findIndex(e=>e==="mender");
    if(index>=0)enemies[index]="weaver";
    enemies.push("channeler");
  }
  if(tier>=5&&wave>=2)enemies.push(wave%2?"harbinger":"skirmisher");
  if(tier>=6&&wave>=3){
    const index=enemies.findIndex((e,i)=>i>0&&e==="spark");
    if(index>=0)enemies[index]="harbinger";
  }
  if(tier>=7&&wave>=4)enemies.push("bulwark");
  // Vary the encounter MIX across runs, not just the arrival order.
  if(tier>=1&&wave>=2&&variation()<.5){
    const index=enemies.findIndex((e,i)=>i>0&&e==="raider");
    if(index>=0)enemies[index]=tier>=3?"skirmisher":"spark";
  }
  if(tier>=4&&wave>=3&&variation()<.4){
    const index=enemies.findIndex((e,i)=>i>0&&e==="spark");
    if(index>=0)enemies[index]="harbinger";
  }
  // Variation changes the attack order and opening threat without replacing
  // the guaranteed boss in slot zero of the finale.
  const start=wave===5?1:0;
  for(let i=enemies.length-1;i>start;i--){
    const j=start+Math.floor(variation()*(i-start+1));
    [enemies[i],enemies[j]]=[enemies[j],enemies[i]];
  }
  return enemies;
}
export function buildPlanetEncounters(level,seed=1){
  level=clamp(Math.floor(level)||1,1,30);
  const tier=THRESHOLDS.filter(required=>level>=required).length-1;
  const rand=random((seed>>>0)^Math.imul(level,2654435761));
  const boss=bossForLevel(level);
  const stage=TIERS[tier];
  const waves=Array.from({length:5},(_,i)=>{
    const wave=i+1;
    const enemies=waveArchetypes(wave,tier,rand);
    const maxAlive=clamp((wave<=1?2:3)+
      (tier>=3&&(wave>=3||wave===1)?1:0)+
      (tier>=5&&wave===1?1:0),2,4);
    return {
      wave,name:NAMES[i],enemies,maxAlive,
      spawnGap:Math.max(2.25,3.35-(wave-1)*.16-tier*.07),
      focus:wave<3?"POSITION & FOCUS":wave===3?"PRIORITY TARGETS":
        wave===4?"DISRUPTION & SURVIVAL":"BOSS TELEGRAPHS & PHASES",
    };
  });
  return {
    level,tier,stage,boss,seed,
    waves,
    casterChannels:tier>=2,
    shieldEnemies:tier>=3,
    corruption:tier>=2,
    bossGroundMarks:tier>=2,
    bossPhaseShields:tier>=4,
    bossReinforcements:tier>=5,
    bossDoubleThreat:tier>=7,
    telegraphSeconds:Math.max(1.35,2.15-tier*.09),
    novaRadius:115+Math.min(48,tier*7),
    signatureInterval:Math.max(7,12.7-tier*.48),
    eliteHealthBonus:Math.min(.19,tier*.022),
  };
}
