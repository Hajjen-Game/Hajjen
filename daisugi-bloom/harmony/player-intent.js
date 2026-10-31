/* Japanese Harmony · Harmony Director 5.1 – Player Intent & Friction Awareness
 *
 * Read-only and local. "Friction" means an observable pattern of obstacles,
 * NOT a statement that a person is frustrated. Never affect RNG, Director
 * choices, level requirements, Omamori offers, difficulty or purchasing.
 *
 * No wall-clock delay or inactivity is evidence of frustration: players
 * may be thinking, taking a break, or using accessibility controls.
 */
(function(root){
"use strict";
const VERSION=1,RECENT=30,MAX=10000;
const bounded=x=>Number.isFinite(x)?Math.max(0,Math.min(MAX,Math.trunc(x))):0;
const roundKey=g=>(g.level+1)+"-"+g.seed;
const defaultState=()=>({version:VERSION,observed:0,wins:0,losses:0,
 replays:0,starImprovements:0,comboRounds:0,possibleFriction:0,
 invalidAttempts:0,stalledRounds:0,recent:[]});
function normalize(raw){
 if(!raw||raw.version!==VERSION||!Array.isArray(raw.recent))return defaultState();
 const s=defaultState();
 for(const key of ["observed","wins","losses","replays","starImprovements",
  "comboRounds","possibleFriction","invalidAttempts","stalledRounds"])
  s[key]=bounded(raw[key]);
 s.recent=raw.recent.filter(r=>r&&typeof r.key==="string"&&r.key.length<=65&&
  Number.isInteger(r.level)&&r.level>=1&&r.level<=100000&&
  ["none","watch"].includes(r.friction)).slice(-RECENT).map(r=>({
   key:r.key,level:r.level,won:!!r.won,friction:r.friction,
   previousStars:Math.min(3,bounded(r.previousStars)),
   signals:Array.isArray(r.signals)?r.signals.filter(x=>typeof x==="string").slice(0,5):[],
   goal:r.goal||null}));
 return s;
}
function analyzeRound(game,trace,previousStars=0){
 const moves=Array.isArray(trace?.moves)?trace.moves:[];
 const rejected=Array.isArray(trace?.rejected)?trace.rejected:[];
 const valid=moves.length,invalid=rejected.length;
 const goalCount=Number(trace?.goal?.count??game.config?.goal?.count);
 let stagnation=0,longestStall=0,drought=0,observedDrought=0;
 for(const move of moves){
  const before=Number(move?.before?.progress),after=Number(move?.after?.progress);
  if(Number.isFinite(before)&&Number.isFinite(after)&&before<goalCount){
   if(after>before)stagnation=0;
   else{stagnation++;longestStall=Math.max(longestStall,stagnation);}
  }
  const droughtValue=Number(move?.director?.objectiveDrought);
  if(Number.isFinite(droughtValue)){
   observedDrought++;
   if(droughtValue>=4)drought++;
  }
 }
 // One piece of evidence is NOT enough to label a player. The combination
 // indicates that the *round* may have contained obstacles.
 const signals=[];
 if(valid>=4&&invalid>=3)signals.push("repeated-invalid-swaps");
 if(valid>=5&&longestStall>=5)signals.push("extended-goal-stall");
 if(valid>=5&&drought>=3)signals.push("director-observed-drought");
 if(game.failed&&valid>=4&&Number(game.progress?.())<Number(game.target?.()))
  signals.push("goal-not-reached");
 const independent=signals.filter(x=>x!=="goal-not-reached").length;
 const possibleFriction=valid>=4&&(
  independent>=2||(independent>=1&&game.failed));
 const seenBefore=bounded(previousStars)>0;
 const earned=game.assisted?1:typeof game.stars==="function"?game.stars():0;
 const intentSignals=[];
 if(seenBefore)intentSignals.push("replayed-completed-level");
 if(seenBefore&&earned>previousStars&&game.complete)
  intentSignals.push("improved-existing-star-record");
 if(game.complete&&!seenBefore)intentSignals.push("completed-new-level");
 if(game.bestChain>=5&&valid>=2)intentSignals.push("built-long-chain");
 // Low-level observational evidence. Never assert mental states, spending
 // preference, intent certainty or pressure to buy a rescue.
 return {version:VERSION,status:"observational-only",
  confidence:trace?.partial?"partial":valid>=4?"early":"insufficient",
  coverage:{validMoves:valid,rejectedSwaps:invalid,
   partial:!!trace?.partial,truncated:!!trace?.truncated},
  friction:{classification:possibleFriction?"watch":"none",
   signals,invalidSwaps:invalid,longestGoalStall:longestStall,
   movesWithDirectorDrought:drought,observedDroughtMoves:observedDrought,
   note:"Observed difficulty in this round; not a judgment about the player's feelings."},
  intent:{signals:intentSignals,preference:"undetermined",
   note:"One round cannot establish a stable player preference."}};
}
function observeRound(save,game,trace,previousStars){
 if(!game||!(game.complete||game.failed))return false;
 const state=normalize(save.playerIntentAwareness),key=roundKey(game);
 if(state.recent.some(r=>r.key===key))return false;
 const analysis=analyzeRound(game,trace,previousStars);
 const row={key,level:game.level+1,won:!!game.complete,
  previousStars:Math.min(3,bounded(previousStars)),
  friction:analysis.friction.classification,
  signals:analysis.intent.signals,
  goal:game.config?.goal?.type||null};
 state.observed=Math.min(MAX,state.observed+1);
 if(game.complete)state.wins=Math.min(MAX,state.wins+1);
 else state.losses=Math.min(MAX,state.losses+1);
 if(analysis.intent.signals.includes("replayed-completed-level"))
  state.replays=Math.min(MAX,state.replays+1);
 if(analysis.intent.signals.includes("improved-existing-star-record"))
  state.starImprovements=Math.min(MAX,state.starImprovements+1);
 if(analysis.intent.signals.includes("built-long-chain"))
  state.comboRounds=Math.min(MAX,state.comboRounds+1);
 if(analysis.friction.classification==="watch")
  state.possibleFriction=Math.min(MAX,state.possibleFriction+1);
 if(analysis.friction.longestGoalStall>=5)
  state.stalledRounds=Math.min(MAX,state.stalledRounds+1);
 state.invalidAttempts=Math.min(MAX,state.invalidAttempts+analysis.friction.invalidSwaps);
 state.recent.push(row);
 state.recent=state.recent.slice(-RECENT);
 save.playerIntentAwareness=state;
 return true;
}
function aggregate(save){
 const state=normalize(save?.playerIntentAwareness),n=state.observed;
 // A working hypothesis may be shown after repeated support, but never
 // silently used to change game rewards or assess propensity to purchase.
 const thresholds=n>=8&&state.replays>=3&&state.starImprovements>=2?"possible-star-improvement-interest":
  n>=8&&state.comboRounds>=4?"possible-combination-interest":"undetermined";
 const repeated=n>=5&&state.possibleFriction>=3?"recurring-round-obstacles":"not-established";
 return {version:VERSION,observedRounds:n,
  confidence:n<5?"insufficient":n<12?"early":"moderate",
  completion:{won:state.wins,failed:state.losses},
  intent:{hypothesis:thresholds,confidence:thresholds==="undetermined"?"insufficient":"tentative",
   replayedLevels:state.replays,improvedStarRecords:state.starImprovements,
   longChainRounds:state.comboRounds},
  friction:{trend:repeated,watchRounds:state.possibleFriction,
   roundsWithLongStalls:state.stalledRounds,invalidSwapAttempts:state.invalidAttempts,
   note:"Difficulty indicators are not evidence of frustration or willingness to spend."},
  personalizationActive:false,affectsDifficulty:false,affectsOmamori:false,
  recent:state.recent.slice(-10)};
}
function report(save,game,trace){
 const state=normalize(save?.playerIntentAwareness),key=roundKey(game);
 const stored=state.recent.find(r=>r.key===key);
 return {version:VERSION,round:analyzeRound(game,trace,
  // Preserve the level-start star record so exported replay intent reflects
  // the real archived result, not the updated score after this win.
  stored?.previousStars??0),
  observedInHistory:!!stored,
  profile:aggregate(save)};
}
const api=Object.freeze({VERSION,RECENT,defaultState,normalize,analyzeRound,
 observeRound,aggregate,report});
root.HarmonyPlayerIntent=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
