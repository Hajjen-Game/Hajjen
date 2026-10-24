/* Harmony Engine Intelligence & Diagnostics 1.0
 * Reproducible, offline-only experiments against the actual HarmonyRules.Game.
 * No DOM, storage, network, audio, game save, or live-turn side effects.
 */
(function(root){
"use strict";
function create(R){
 if(!R||!R.Game||!R.validSwaps)throw new Error("HarmonyRules is required");
 const STRATEGIES=["random","score","goal","lookahead"];
 const MODES=["standard","director","director2","director3","director31","director311"];
 const MODE_LABELS={standard:"Standard",director:"Director 1.0",director2:"Director 2.0",director3:"Pacing 3.0",director31:"Objective 3.1",director311:"Endgame 3.1.1"};
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
 // Under Fusion Destination Control, swap(a,b) and swap(b,a) can
 // land on different cells. Both are real, legal tactical decisions.
 function directedChoices(pairs){return pairs.flatMap(([a,b])=>[[a,b],[b,a]]);}
 function choose(g,strategy,rng){
  const moves=R.validSwaps(g.board);
  if(!moves.length)return null;
  if(strategy==="random"){
   const [a,b]=moves[Math.floor(rng()*moves.length)];
   return rng()<.5?[a,b]:[b,a];
  }
  const profile=strategy==="score"?"score":"goal";
  const evaluations=directedChoices(moves).map(([a,b])=>evaluate(g,a,b,profile));
  evaluations.sort((a,b)=>b.score-a.score||a.a-b.a||a.b-b.b);
  if(strategy!=="lookahead")return [evaluations[0].a,evaluations[0].b];
  // Bound the second ply: four best oriented first moves, and eight legal
  // pairs per follow-on position, testing BOTH directions of each pair.
  const firstChoices=evaluations.slice(0,Math.min(4,evaluations.length));
  let best=firstChoices[0],bestValue=-Infinity;
  for(const item of firstChoices){
   const after=item.simulated;
   const next=after.moves>0&&!after.complete&&!after.failed?
    directedChoices(R.validSwaps(after.board).slice(0,8)):[];
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
 function play(level,seed,strategy,mode="standard",mistLayoutVersion=2){
  assertInt(level,0,999999,"level");
  if(!STRATEGIES.includes(strategy))throw new RangeError("Unknown strategy: "+strategy);
  if(!MODES.includes(mode))throw new RangeError("Unknown mode: "+mode);
  const g=new R.Game(level,null,{seed:seed>>>0,mistLayoutVersion,opportunity:mode==="director",directorMode:mode==="director311"?"v311":mode==="director31"?"v31":mode==="director3"?"v3":mode==="director2"?"v2":undefined});
  const rng=botRandom(seed);
  let turns=0,legalTotal=0,minLegal=Infinity,drought=0,maxDrought=0,noGoalTurns=0;
  let cascadeTurns=0,highestCascade=0,extraWaves=0,shuffles=0,pulses=0, bonuses=0;
  let zeroLegalTurns=0,flowTurns=0,recoveryTurns=0;
  let meaningfulTotal=0,nearMasterpieceTotal=0,goalReadyTotal=0,developedTotal=0,nearReadyTotal=0,prospectsTotal=0;
  const initialLegalMoves=R.validSwaps(g.board).length;
  while(g.moves>0&&!g.complete){
   const options=R.validSwaps(g.board),legal=options.length;
   legalTotal+=legal;minLegal=Math.min(minLegal,legal);
   if(R.opportunityMetrics){
    const opportunities=R.opportunityMetrics(g.board,g.config.goal);
    meaningfulTotal+=opportunities.meaningful;
    nearMasterpieceTotal+=opportunities.nearMasterpiece;
    goalReadyTotal+=opportunities.goalReady;
    if(R.opportunityMetricsV2){
     const investment=R.opportunityMetricsV2(g.board,g.config.goal,g.directorDrought||0);
     developedTotal+=investment.developed;nearReadyTotal+=investment.nearReady;
     prospectsTotal+=investment.prospects;
    }
   }
   if(legal===0){zeroLegalTurns++;break;}
   const choice=choose(g,strategy,rng);
   const previousGoal=g.progress();
   // Synthetic pause profile in tests: timing is explicit, deterministic and
   // independent of the bot's random decisions. Browser gameplay uses real time.
   const decisionMs=(["director3","director31","director311"].includes(mode))?
    (strategy==="random"?4000:strategy==="goal"?10500:strategy==="score"?7000:24000)+
    (turns%4)*2200:null;
   const result=g.swap(...choice,{decisionMs});
   if(!result.ok)throw new Error("Diagnostics encountered an invalid move");
   turns++;
   if(g.pacePhase==="flow")flowTurns++;
   if(g.pacePhase==="recovery")recoveryTurns++;
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
  return {level,seed:seed>>>0,strategy,mode,mistLayoutVersion:g.mistLayoutVersion,goalType:g.config.goal.type,won:g.complete,
   movesUsed:turns,movesBudget:g.config.moves,progress:g.progress(),target:g.target(),
   goalRatio:Math.min(1,g.progress()/g.target()),score:g.score,stars:g.stars(),
   masterpieces:g.masterpieces,fusions:g.fusions,echoes:g.echoes||0,stage3:g.stage3,stage4:g.stage4,
   initialLegalMoves,avgLegalMoves:turns?legalTotal/turns:initialLegalMoves,
   minLegalMoves:minLegal===Infinity?initialLegalMoves:minLegal,zeroLegalTurns,
   cascadeTurns,highestCascade,extraWaves,shuffles,pulses,bonuses,
   maxGoalDrought:maxDrought,noGoalTurns,objectiveDrought:g.objectiveDrought||0,
   avgMeaningful:turns?meaningfulTotal/turns:0,
   avgNearMasterpiece:turns?nearMasterpieceTotal/turns:0,
   avgGoalReady:turns?goalReadyTotal/turns:0,
   avgDeveloped:turns?developedTotal/turns:0,
   avgNearReady:turns?nearReadyTotal/turns:0,
   avgProspects:turns?prospectsTotal/turns:0,
   directorRefills:g.directorRefills||0,directorSelections:g.directorSelections||0,flowTurns,recoveryTurns};
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
   avgMasterpieces:avg("masterpieces"),avgEchoes:avg("echoes"),avgShuffles:avg("shuffles"),
   avgGoalDrought:avg("maxGoalDrought"),avgNoGoalTurns:avg("noGoalTurns"),
   avgObjectiveDrought:avg("objectiveDrought"),
   avgMeaningful:avg("avgMeaningful"),avgNearMasterpiece:avg("avgNearMasterpiece"),
   avgGoalReady:avg("avgGoalReady"),
   avgDirectorRefills:avg("directorRefills"),avgDirectorSelections:avg("directorSelections"),
   avgFlowTurns:avg("flowTurns"),avgRecoveryTurns:avg("recoveryTurns"),
   avgDeveloped:avg("avgDeveloped"),avgNearReady:avg("avgNearReady"),avgProspects:avg("avgProspects"),
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
  for(const level of levels)assertInt(level,0,999999,"level");
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
  const all=jobs(options),runs=all.map(j=>play(j.level,j.seed,j.strategy,j.mode,options.mistLayoutVersion??2));
  return {version:"engine-lab-4",gameVersion:"6.24.0",options:{trials:options.trials??5,seed:options.seed??0x21a10bee,
   levels:options.levels??R.levels.map((_,i)=>i),strategies:options.strategies??STRATEGIES,modes:options.modes??["standard"]},
   results:summarize(runs),runs};
 }
 async function runAsync(options={},progress){
  const all=jobs(options),runs=[];
  for(let i=0;i<all.length;i++){
   if(options.cancel?.())return {cancelled:true,completed:i,total:all.length};
   const j=all[i];runs.push(play(j.level,j.seed,j.strategy,j.mode,options.mistLayoutVersion??2));
   if((i+1)%Math.max(1,options.yieldEvery??1)===0||i===all.length-1){
    if(progress)progress({completed:i+1,total:all.length,last:runs[runs.length-1]});
    // Yield to the event loop so users can cancel or scroll the report.
    await new Promise(resolve=>setTimeout(resolve,0));
   }
  }
  return {version:"engine-lab-4",gameVersion:"6.24.0",options:{trials:options.trials??5,seed:options.seed??0x21a10bee,
   levels:options.levels??R.levels.map((_,i)=>i),strategies:options.strategies??STRATEGIES,modes:options.modes??["standard"]},
   results:summarize(runs),runs};
 }
 return {STRATEGIES,LABELS,MODES,MODE_LABELS,sampleSeed,play,choose,aggregate,summarize,run,runAsync};
}
root.HarmonyDiagnostics={create};
if(typeof module!=="undefined"&&module.exports)module.exports={create};
})(typeof window!=="undefined"?window:globalThis);
