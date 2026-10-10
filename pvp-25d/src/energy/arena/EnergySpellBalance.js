// One authoritative source for level scaling AND spell-specific Rank 0–3.
// Used by real combat and the HUB's rank-preview labels. Values are deliberately
// conservative for CC/mobility; all crowd-control durations stay DR-governed.
export const MAX_COMBAT_LEVEL=30;
export const BASE_HEALTH=160;
export const BASE_CRIT_CHANCE=0.10;
export const CRIT_MULTIPLIER=1.5;

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function combatLevel(level){return clamp(Math.floor(Number(level)||1),1,MAX_COMBAT_LEVEL);}
export function maxHealthForLevel(level){
  return Math.round(BASE_HEALTH*(1+1.25*(combatLevel(level)-1)/29));
}
export function powerForLevel(level){
  return 1+(combatLevel(level)-1)/29;
}
export function normalizedRank(rank){return clamp(Math.floor(Number(rank)||0),0,3);}

// Only the spells in these groups have a direct power multiplier.
// Utility Rank instead changes cost, cooldown, cast time, range or distance.
const DAMAGE_IDS=new Set([
  "flux-bolt","entropy-mark","rift-slash","sun-lance","zenith-crash",
  "crystal-bolt","fracture-spear","arc-strike","gravity-hammer"
]);
const HEAL_IDS=new Set(["pulse-mend","reactive-thread","symbiosis-link"]);

const powerSteps=(unit)=>[
  "+6% "+unit,
  "+12% "+unit+" total",
  "+18% "+unit+" total; choose 1 Evolution"
];
// Every one of the 22 abilities has a meaningful, independently visible path.
// Text matches live modifiers in rankedRule(), damageMultiplier(), healMultiplier()
// and successfulInterruptFlux(). No new CC duration or DR bypass is granted.
export const RANK_PATHS=Object.freeze({
  "pulse-mend":powerSteps("healing"),
  "resonance-guard":[
    "34.5% damage reduction (from 33%)",
    "36% damage reduction total",
    "37.5% damage reduction total; choose 1 Evolution"
  ],
  "phase-rush":[
    "Flux cost 14 → 12",
    "Cooldown 17s → 15.5s",
    "Rush range 450 → 475; choose 1 Evolution"
  ],
  "pulse-sever":[
    "Flux cost 10 → 8",
    "Gain 5 Flux on a successful interrupt",
    "Cooldown 15s → 13.5s; choose 1 Evolution"
  ],
  "flux-bolt":powerSteps("damage"),
  "phase-slip":[
    "Flux cost 16 → 14",
    "Cooldown 23s → 21.5s",
    "Teleport distance 170 → 187; choose 1 Evolution"
  ],
  "entropy-mark":powerSteps("damage over time"),
  "rift-slash":powerSteps("damage"),
  "null-prison":[
    "Flux cost 20 → 18",
    "Cast time 1.4s → 1.28s",
    "Cooldown 24s → 22s; choose 1 Evolution (CC stays 4s, DR applies)"
  ],
  "sun-lance":powerSteps("damage"),
  "zenith-crash":powerSteps("damage"),
  "photon-barrier":[
    "+8% shield absorption",
    "+16% shield absorption total",
    "+24% shield absorption total; choose 1 Evolution"
  ],
  "crystal-bolt":powerSteps("damage"),
  "crystal-snare":[
    "Flux cost 15 → 13",
    "Cooldown 18s → 16.5s",
    "Range 490 → 512; choose 1 Evolution (root stays 3s, DR applies)"
  ],
  "fracture-spear":powerSteps("damage"),
  "arc-strike":powerSteps("damage"),
  "gravity-hammer":powerSteps("damage"),
  "vector-rush":[
    "Flux cost 14 → 12",
    "Cooldown 18s → 16.5s",
    "Dash distance 180 → 200; choose 1 Evolution"
  ],
  "resonance-cut":[
    "Flux cost 15 → 13",
    "Cooldown 20s → 18.5s",
    "Gain 5 Flux on a successful interrupt; choose 1 Evolution"
  ],
  "reactive-thread":powerSteps("healing"),
  "symbiosis-link":powerSteps("healing transferred by the link"),
  "cleanse-flux":[
    "Flux cost 11 → 9",
    "Cooldown 10s → 8.75s",
    "Range 490 → 520; choose 1 Evolution"
  ]
});

export function rankDescription(spellId,rank){
  const level=normalizedRank(rank),steps=RANK_PATHS[spellId];
  if(!steps)return "Rank details unavailable.";
  if(level===0)return "RANK 0 · Base spell. Next: "+steps[0]+".";
  return "RANK "+level+" · "+steps[level-1]+
    (level<3?". Next: "+steps[level]+".":".");
}
export function damageMultiplier(spellId,rank){
  return DAMAGE_IDS.has(spellId)?1+0.06*normalizedRank(rank):1;
}
export function healMultiplier(spellId,rank){
  return HEAL_IDS.has(spellId)?1+0.06*normalizedRank(rank):1;
}
export function shieldMultiplier(spellId,rank){
  return spellId==="photon-barrier"?1+0.08*normalizedRank(rank):1;
}
export function successfulInterruptFlux(spellId,rank){
  const r=normalizedRank(rank);
  if(spellId==="pulse-sever"&&r>=2)return 5;
  if(spellId==="resonance-cut"&&r>=3)return 5;
  return 0;
}
export function rankedRule(spellId,base,rank){
  const r=normalizedRank(rank);
  if(!base||!r)return base;
  const adjusted={...base};
  // Three small improvements, only when the corresponding Rank was earned.
  switch(spellId){
    case "resonance-guard":adjusted.amount=base.amount+.015*r;break;
    case "phase-rush":
      adjusted.cost=base.cost-2;
      if(r>=2)adjusted.cd=base.cd-1.5;
      if(r>=3)adjusted.range=base.range+25;
      break;
    case "pulse-sever":
      adjusted.cost=base.cost-2;
      if(r>=3)adjusted.cd=base.cd-1.5;
      break;
    case "phase-slip":
      adjusted.cost=base.cost-2;
      if(r>=2)adjusted.cd=base.cd-1.5;
      if(r>=3)adjusted.distance=base.distance+17;
      break;
    case "null-prison":
      adjusted.cost=base.cost-2;
      if(r>=2)adjusted.cast=base.cast-.12;
      if(r>=3)adjusted.cd=base.cd-2;
      break;
    case "crystal-snare":
      adjusted.cost=base.cost-2;
      if(r>=2)adjusted.cd=base.cd-1.5;
      if(r>=3)adjusted.range=base.range+22;
      break;
    case "vector-rush":
      adjusted.cost=base.cost-2;
      if(r>=2)adjusted.cd=base.cd-1.5;
      if(r>=3)adjusted.distance=base.distance+20;
      break;
    case "resonance-cut":
      adjusted.cost=base.cost-2;
      if(r>=2)adjusted.cd=base.cd-1.5;
      break;
    case "cleanse-flux":
      adjusted.cost=base.cost-2;
      if(r>=2)adjusted.cd=base.cd-1.25;
      if(r>=3)adjusted.range=base.range+30;
      break;
  }
  return adjusted;
}
