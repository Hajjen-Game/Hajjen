/* Harmony Engine Intelligence & Diagnostics 1.0
 * Reproducible, offline-only experiments against the actual HarmonyRules.Game.
 * No DOM, storage, network, audio, game save, or live-turn side effects.
 */
(function(root){
"use strict";
function create(R){
 if(!R||!R.Game||!R.validSwaps)throw new Error("HarmonyRules is required");
 const STRATEGIES=["random","score","goal","lookahead"];
 const MODES=["standard","director"];
 const MODE_LABELS={standard:"Standard",director:"Director"};
 const LABELS={random:"Slumpmässig",score:"Poängjägare",goal:"Målfokuserad",lookahead:"Framåtblickande"};
 function assertInt(value,min,max,name){
  if(!Number.isInteger(value)||value<min||value>max)throw new RangeError(name+" must be an integer from "+min+" to "+max);
 }
 function sampleSeed(base,level,trial){
  // Stable, cross-platform integer mixing; same (level,trial) for every AI.
  let x=(base^(Math.imul(level+1,0x9e3779b1))^(Math.imul(trial+1,0x85ebca6b)))>>>0;
  x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;
  return x>>>0;
 }
 function botRandom(seed){
  let state=(seed^0xb7e15162)>>>0;
  return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
 }
 function boardPotential(g){
  const goal=g.config.goal;
  let sum=0;
  const matchingFamily=goal.type==="familyMasterpiece"?goal.family:null;
  for(const piece of g.board){
   if(!piece)continue;
   if(matchingFamily&&piece.family!==matchingFamily)continue;
   const v=piece.stage;
   // Strong pre-masterpiece objectives require developing high-stage objects.
   sum+=v===1?0:v===2?1:v===3?4:v===4?11:0;
  }
  return sum;
 }
 function snapshotClone(g,snapshot){
  return new R.Game(g.level,snapshot,{fastRestore:true});
 }
 function evaluate(g,a,b,profile){
  const beforeProgress=g.progress(),beforeScore=g.score;
  const beforePotential=boardPotential(g);
  const simulated=snapshotClone(g,g.save());
  const result=simulated.swap(a,b);
  if(!result.ok)throw new Error("validSwaps returned invalid move");
  const goalDelta=simulated.progress()-beforeProgress;
  const scoreDelta=simulated.score-beforeScore;
  const potentialDelta=boardPotential(simulated)-beforePotential;
  const chain=result.events.filter(e=>e.type==="fusion").length;
  const newHeroes=result.events.filter(e=>e.type==="hero").reduce((n,e)=>n+(e.positions?.length||0),0);
  const legalMoves=R.validSwaps(simulated.board).length;
  const score=profile==="score"?
   scoreDelta+chain*8:
   goalDelta*850+potentialDelta*15+newHeroes*140+scoreDelta*.10+Math.min(legalMoves,16)*4;
  return {a,b,simulated,score,scoreDelta,goalDelta,chain};
 }
 function choose(g,strategy,rng){
  const moves=R.validSwaps(g.board);
  if(!moves.length)return null;
  if(strategy==="random")return moves[Math.floor(rng()*moves.length)];
  const evaluations=moves.map(([a,b])=>evaluate(g,a,b,strategy==="score"?"score":"goal"));
  evaluations.sort((a,b)=>b.score-a.score||a.a-b.a||a.b-b.b);
  if(strategy!=="lookahead")return [evaluations[0].a,evaluations[0].b];
  // Bounded two-ply: examine the best four first moves and at most eight
  // deterministic second moves each. It is an upper-bound bot (it sees
  // simulated future refills), not a prediction of a human player's skill.
  const firstChoices=evaluations.slice(0,Math.min(4,evaluations.length));
  let best=firstChoices[0],bestValue=-Infinity;
  for(const item of firstChoices){
   const after=item.simulated;
   const next=R.validSwaps(after.board).slice(0,8);
   let follow=0;
   for(const [a,b] of next){
    const x=evaluate(after,a,b,"goal");
    if(x.score>follow)follow=x.score;
   }
   const combined=item.score+follow*.56;
   if(combined>bestValue){bestValue=combined;best=item;}
  }
  return [best.a,best.b];
 }
 function play(level,seed,strategy,mode="standard"){
  assertInt(level,0,R.levels.length-1,"level");
  if(!STRATEGIES.includes(strategy))throw new RangeError("Unknown strategy: "+strategy);
  if(!MODES.includes(mode))throw new RangeError("Unknown mode: "+mode);
  const g=new R.Game(level,null,{seed:seed>>>0,opportunity:mode==="director"});
  const rng=botRandom(seed);
  let turns=0,legalTotal=0,minLegal=Infinity,drought=0,maxDrought=0,noGoalTurns=0;
  let cascadeTurns=0,highestCascade=0,extraWaves=0,shuffles=0,pulses=0, bonuses=0;
  let zeroLegalTurns=0;
  let meaningfulTotal=0,nearMasterpieceTotal=0,goalReadyTotal=0;
  const initialLegalMoves=R.validSwaps(g.board).length;
  while(g.moves>0&&!g.complete){
   const options=R.validSwaps(g.board),legal=options.length;
   legalTotal+=legal;minLegal=Math.min(minLegal,legal);
   if(R.opportunityMetrics){
    const opportunities=R.opportunityMetrics(g.board,g.config.goal);
    meaningfulTotal+=opportunities.meaningful;
    nearMasterpieceTotal+=opportunities.nearMasterpiece;
    goalReadyTotal+=opportunities.goalReady;
   }
   if(legal===0){zeroLegalTurns++;break;}
   const choice=choose(g,strategy,rng);
   const previousGoal=g.progress();
   const result=g.swap(...choice);
   if(!result.ok)throw new Error("Diagnostics encountered an invalid move");
   turns++;
   const waves=result.events.filter(e=>e.type==="fusion").length;
   if(waves>=2)cascadeTurns++;
   extraWaves+=Math.max(0,waves-1);
   highestCascade=Math.max(highestCascade,waves);
   shuffles+=result.events.filter(e=>e.type==="shuffle").length;
   pulses+=result.events.filter(e=>e.type==="pulse").length;
   bonuses+=result.events.filter(e=>e.type==="bonus").length;
   if(g.progress()<=previousGoal){
    drought++;noGoalTurns++;
    maxDrought=Math.max(maxDrought,drought);
   }else drought=0;
   if(turns>g.config.moves)throw new Error("A move was counted twice");
  }
  return {level,seed:seed>>>0,strategy,mode,goalType:g.config.goal.type,won:g.complete,
   movesUsed:turns,movesBudget:g.config.moves,progress:g.progress(),target:g.target(),
   goalRatio:Math.min(1,g.progress()/g.target()),score:g.score,stars:g.stars(),
   masterpieces:g.masterpieces,fusions:g.fusions,stage3:g.stage3,stage4:g.stage4,
   initialLegalMoves,avgLegalMoves:turns?legalTotal/turns:initialLegalMoves,
   minLegalMoves:minLegal===Infinity?initialLegalMoves:minLegal,zeroLegalTurns,
   cascadeTurns,highestCascade,extraWaves,shuffles,pulses,bonuses,
   maxGoalDrought:maxDrought,noGoalTurns,
   avgMeaningful:turns?meaningfulTotal/turns:0,
   avgNearMasterpiece:turns?nearMasterpieceTotal/turns:0,
   avgGoalReady:turns?goalReadyTotal/turns:0,
   directorRefills:g.directorRefills||0,directorSelections:g.directorSelections||0};
 }
 function aggregate(runs){
  if(!runs.length)return null;
  const n=runs.length,avg=key=>runs.reduce((sum,r)=>sum+r[key],0)/n;
  const wins=runs.filter(x=>x.won).length;
  return {level:runs[0].level,strategy:runs[0].strategy,mode:runs[0].mode,samples:n,wins,
   winRate:wins/n,avgGoalRatio:avg("goalRatio"),avgMoves:avg("movesUsed"),
   avgScore:avg("score"),avgStars:avg("stars"),avgLegalMoves:avg("avgLegalMoves"),
   avgInitialMoves:avg("initialLegalMoves"),avgMinLegalMoves:avg("minLegalMoves"),
   avgCascades:avg("cascadeTurns"),avgExtraWaves:avg("extraWaves"),
   avgMasterpieces:avg("masterpieces"),avgShuffles:avg("shuffles"),
   avgGoalDrought:avg("maxGoalDrought"),avgNoGoalTurns:avg("noGoalTurns"),
   avgMeaningful:avg("avgMeaningful"),avgNearMasterpiece:avg("avgNearMasterpiece"),
   avgGoalReady:avg("avgGoalReady"),
   avgDirectorRefills:avg("directorRefills"),avgDirectorSelections:avg("directorSelections"),
   lockedRuns:runs.filter(x=>x.zeroLegalTurns>0).length};
 }
 function jobs(options={}){
  const levels=options.levels??R.levels.map((_,i)=>i);
  const strategies=options.strategies??STRATEGIES;
  const modes=options.modes??["standard"];
  const trials=options.trials??5;
  const seed=options.seed??0x21a10bee;
  assertInt(trials,1,10000,"trials");assertInt(seed,0,0xffffffff,"seed");
  if(!Array.isArray(levels)||!levels.length)throw new TypeError("No levels selected");
  if(!Array.isArray(strategies)||!strategies.length)throw new TypeError("No strategies selected");
  if(!Array.isArray(modes)||!modes.length)throw new TypeError("No modes selected");
  for(const mode of modes)if(!MODES.includes(mode))throw new RangeError("Unknown mode "+mode);
  for(const level of levels)assertInt(level,0,R.levels.length-1,"level");
  for(const strategy of strategies)if(!STRATEGIES.includes(strategy))throw new RangeError("Unknown strategy "+strategy);
  const result=[];
  for(const level of levels)for(const strategy of strategies)for(const mode of modes)for(let trial=0;trial<trials;trial++)
   result.push({level,strategy,mode,trial,seed:sampleSeed(seed,level,trial)});
  return result;
 }
 function summarize(runs){
  const map=new Map();
  for(const run of runs){
   const key=run.level+":"+run.strategy+":"+run.mode;
   if(!map.has(key))map.set(key,[]);
   map.get(key).push(run);
  }
  return [...map.values()].map(aggregate).sort((a,b)=>a.level-b.level||STRATEGIES.indexOf(a.strategy)-STRATEGIES.indexOf(b.strategy)||MODES.indexOf(a.mode)-MODES.indexOf(b.mode));
 }
 function run(options={}){
  const all=jobs(options),runs=all.map(j=>play(j.level,j.seed,j.strategy,j.mode));
  return {version:"engine-lab-2",gameVersion:"5.4.0",options:{trials:options.trials??5,seed:options.seed??0x21a10bee,
   levels:options.levels??R.levels.map((_,i)=>i),strategies:options.strategies??STRATEGIES,modes:options.modes??["standard"]},
   results:summarize(runs),runs};
 }
 async function runAsync(options={},progress){
  const all=jobs(options),runs=[];
  for(let i=0;i<all.length;i++){
   if(options.cancel?.())return {cancelled:true,completed:i,total:all.length};
   const j=all[i];runs.push(play(j.level,j.seed,j.strategy,j.mode));
   if((i+1)%Math.max(1,options.yieldEvery??1)===0||i===all.length-1){
    if(progress)progress({completed:i+1,total:all.length,last:runs[runs.length-1]});
    // Yield to the event loop so users can cancel or scroll the report.
    await new Promise(resolve=>setTimeout(resolve,0));
   }
  }
  return {version:"engine-lab-2",gameVersion:"5.4.0",options:{trials:options.trials??5,seed:options.seed??0x21a10bee,
   levels:options.levels??R.levels.map((_,i)=>i),strategies:options.strategies??STRATEGIES,modes:options.modes??["standard"]},
   results:summarize(runs),runs};
 }
 return {STRATEGIES,LABELS,MODES,MODE_LABELS,sampleSeed,play,choose,aggregate,summarize,run,runAsync};
}
root.HarmonyDiagnostics={create};
if(typeof module!=="undefined"&&module.exports)module.exports={create};
})(typeof window!=="undefined"?window:globalThis);
