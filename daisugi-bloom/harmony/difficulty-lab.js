/* Japanese Harmony — Difficulty Lab 1.0.
 * Replays genuine HarmonyRules.Game moves on opt-in Puzzle Architect boards.
 * Bot completion is a DIAGNOSTIC, never a human win-rate estimate and never
 * a proof of solvability. Every strategy receives identical opening / RNG seed.
 */
(function(root){
"use strict";
const VERSION=1;
const STRATEGIES=Object.freeze(["random","greedy","objective","spatial"]);
function check(ok,message){if(!ok)throw Error(message);}
function rand(seed){let s=seed>>>0;return ()=>{s=(s+0x6d2b79f5)>>>0;
 let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);
 return ((t^(t>>>14))>>>0)/4294967296;};}
function cloneGame(rules,game){return new rules.Game(game.level,game.save(),{fastRestore:true});}
function progress(game){
 const parts=typeof game.goalParts==="function"?game.goalParts():
 [{type:game.config.goal.type,count:game.target(),progress:game.progress()}];
 return parts.map(p=>({type:p.type,count:p.count,progress:Math.max(0,p.progress)}));
}
function completion(game){
 const parts=progress(game);
 return parts.reduce((sum,p)=>sum+Math.min(1,p.progress/Math.max(1,p.count)),0)/parts.length;
}
function geometry(game,rules){
 const positions=game.board.map((p,i)=>p?.family==="lotusSeed"?i:-1).filter(x=>x>=0);
 const boxes=game.lotus?.exits||[];
 let cargo=0;
 for(const at of positions){
  const crate=boxes.find(x=>x%7===at%7);
  if(crate!==undefined)cargo+=Math.max(0,(crate-at)/7);
 }
 let potential=0;
 for(const mirror of game.moonMirrors||[]){
  for(const neighbor of rules.neighbors(mirror.at)){
   const p=game.board[neighbor];
   if(p&&p.stage>1&&p.stage<=5)potential+=p.stage-1;
  }
 }
 const windRows=new Set((game.windGarden?.steps||[]).map(x=>x.row));
 const windChoices=windRows.size?
  rules.validSwaps(game.board).filter(([a,b])=>windRows.has(Math.floor(a/7))||
   windRows.has(Math.floor(b/7))).length:0;
 return {cargo,potential,windChoices};
}
function sampleMoves(moves,limit){
 if(moves.length<=limit)return moves;
 // Evenly spaced candidates rather than always the first top-left options.
 return Array.from({length:limit},(_,i)=>moves[Math.floor(i*(moves.length-1)/(limit-1))]);
}
function scoreTrial(before,after,strategy,rules){
 if(after.complete)return 1e7;
 const raw=after.score-before.score;
 const fusions=(after.fusions-before.fusions);
 if(strategy==="greedy")return raw+fusions*500+(after.masterpieces-before.masterpieces)*1000;
 const p0=progress(before),p1=progress(after);
 let advancement=0;
 for(let i=0;i<p0.length;i++){
  const a=p0[i],b=p1[i];
  advancement+=Math.max(0,Math.min(1,b.progress/a.count)-Math.min(1,a.progress/a.count));
 }
 let outcome=advancement*7000+
  (after.masterpieces-before.masterpieces)*40+
  (after.stage4-before.stage4)*15+
  Math.min(20,rules.validSwaps(after.board).length)*3+
  Math.min(150,raw*.02);
 if(strategy==="spatial"){
  const x=geometry(before,rules),y=geometry(after,rules);
  outcome+=(x.cargo-y.cargo)*500+
   (y.potential-x.potential)*55+
   (y.windChoices-x.windChoices)*10;
  // Reward deliberate target-oriented moves even if a chain is not massive.
  outcome+=(after.mirrorResonances-before.mirrorResonances)*1100;
 }
 return outcome;
}
function chooseMove(rules,game,strategy,rng,settings){
 const legal=rules.validSwaps(game.board);
 if(!legal.length)return null;
 if(strategy==="random")return legal[Math.floor(rng()*legal.length)];
 const list=sampleMoves(legal,settings.maxCandidates);
 const ranked=[];
 const before=game.save();
 for(const pair of list){
  const test=new rules.Game(game.level,before,{fastRestore:true});
  const step=test.swap(...pair,{decisionMs:2400});
  if(!step.ok)continue;
  ranked.push({pair,score:scoreTrial(game,test,strategy,rules),state:test});
 }
 ranked.sort((a,b)=>b.score-a.score||a.pair[0]-b.pair[0]||a.pair[1]-b.pair[1]);
 if(!ranked.length)return legal[0];
 if(strategy!=="spatial"||ranked[0].state.complete)return ranked[0].pair;
 // Tiny depth-two beam: look ahead from two promising, actual resulting boards.
 // No fabricated refills or rewinds; it can be imperfect and relatively costly.
 let pick=ranked[0],bestValue=-Infinity;
 for(const entry of ranked.slice(0,Math.min(2,ranked.length))){
  let secondBest=0;
  const next=sampleMoves(rules.validSwaps(entry.state.board),Math.max(3,
   Math.min(5,settings.maxCandidates)));
  if(next.length)for(const pair of next){
   const future=cloneGame(rules,entry.state);
   const res=future.swap(...pair,{decisionMs:2400});
   if(!res.ok)continue;
   secondBest=Math.max(secondBest,scoreTrial(entry.state,future,"spatial",rules));
  }
  const combined=entry.score+secondBest*.58;
  if(combined>bestValue){bestValue=combined;pick=entry;}
 }
 return pick.pair;
}
function play(rules,architect,blueprint,options={}){
 check(rules&&typeof rules.Game==="function","HarmonyRules.Game required");
 check(architect&&typeof architect.build==="function","Puzzle Architect required");
 const strategy=options.strategy??"objective";
 check(STRATEGIES.includes(strategy),"Unknown diagnostic agent");
 const seed=options.seed??20261104;
 check(Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff,"Seed must be uint32");
 const settings={
  maxCandidates:options.maxCandidates??9,
  maxTurns:options.maxTurns??120,
  directorMode:options.directorMode??"v62"
 };
 check(Number.isInteger(settings.maxCandidates)&&settings.maxCandidates>=3&&
  settings.maxCandidates<=40,"Candidate limit must be 3–40");
 check(Number.isInteger(settings.maxTurns)&&settings.maxTurns>=1&&
  settings.maxTurns<=120,"Turn cap must be 1–120");
 // Lab 2.0 can inject the official seeded Journey start (levels 1–4, 10),
 // which has no hand-authored blueprint. All other agents and moves remain
 // identical to Lab 1.0; no live gameplay implementation is modified.
 const game=typeof options.gameFactory==="function"?
  options.gameFactory(seed,settings.directorMode):
  architect.build(rules,blueprint,{seed,directorMode:settings.directorMode});
 check(game&&game.config&&Array.isArray(game.board)&&game.board.length===49,
  "Diagnostic factory must return a genuine 7x7 HarmonyRules.Game");
 const start=game.config.moves,initialLegal=rules.validSwaps(game.board).length;
 if(typeof options.onStart==="function")options.onStart(game,{seed,initialLegal});
 const rng=rand((seed^((STRATEGIES.indexOf(strategy)+1)*0x9e3779b9))>>>0);
 const baseline=progress(game);
 let turns=0,shuffles=0,zeroLegal=0,firstProgressTurn=null,goalDrought=0,maxGoalDrought=0;
 const usage={mirror:0,hanabi:0,wind:0,masterpieces:0};
 const prior={mirror:game.mirrorResonances||0,delivered:game.lotusDelivered,masterpieces:game.masterpieces};
 while(game.moves>0&&!game.complete&&!game.failed&&turns<settings.maxTurns){
  const pair=chooseMove(rules,game,strategy,rng,settings);
  if(!pair){zeroLegal++;break;}
  const before=completion(game);
  const step=game.swap(...pair,{decisionMs:2400});
  check(step.ok,"Agent attempted an illegal move");
  turns++;
  // Read-only observer for health, objective momentum, legal mobility, and
  // refill activity. Observers must not mutate the game or choose its moves.
  if(typeof options.onTurn==="function")
   options.onTurn(game,{turn:turns,events:step.events,
    legal:rules.validSwaps(game.board).length,pair:pair.slice()});
  shuffles+=step.events.filter(x=>x.type==="shuffle").length;
  usage.wind+=step.events.filter(x=>x.type==="wind-shift").length;
  usage.mirror+=(game.mirrorResonances||0)-prior.mirror;
  usage.hanabi+=game.lotusDelivered-prior.delivered;
  usage.masterpieces+=game.masterpieces-prior.masterpieces;
  prior.mirror=game.mirrorResonances||0;prior.delivered=game.lotusDelivered;
  prior.masterpieces=game.masterpieces;
  if(completion(game)>before+1e-9){
   if(firstProgressTurn===null)firstProgressTurn=turns;
   goalDrought=0;
  }else{goalDrought++;maxGoalDrought=Math.max(maxGoalDrought,goalDrought);}
 }
 const parts=progress(game);
 if(typeof options.onFinish==="function")options.onFinish(game,{turns,seed,strategy});
 return {strategy,seed,won:game.complete,movesUsed:turns,
  moveBudget:start,movesRemaining:game.moves,
  goalCompletion:Math.round(completion(game)*1000)/1000,
  goalParts:parts.map(p=>({type:p.type,progress:p.progress,target:p.count})),
  score:game.score,initialLegal,shuffles,zeroLegal,
  firstProgressTurn,maxGoalDrought,usage,
  limitedByTurnCap:!game.complete&&!game.failed&&turns>=settings.maxTurns};
}
function percentile(values,p){
 if(!values.length)return null;
 const sorted=values.slice().sort((a,b)=>a-b);
 const index=(sorted.length-1)*p,left=Math.floor(index),fraction=index-left;
 return Math.round((sorted[left]*(1-fraction)+sorted[Math.ceil(index)]*fraction)*100)/100;
}
function summarize(rows){
 const wins=rows.filter(x=>x.won),moves=wins.map(x=>x.movesUsed);
 const average=selector=>Math.round(rows.reduce((sum,x)=>sum+selector(x),0)/rows.length*100)/100;
 return {attempts:rows.length,wins:wins.length,
  diagnosticWinRate:Math.round(wins.length/rows.length*1000)/1000,
  winningMoves:{p10:percentile(moves,.1),p50:percentile(moves,.5),p90:percentile(moves,.9)},
  winsWithinThreeMoves:wins.filter(x=>x.movesUsed<=3).length,
  avgGoalCompletion:average(x=>x.goalCompletion),
  avgShuffles:average(x=>x.shuffles),avgMaxGoalDrought:average(x=>x.maxGoalDrought),
  avgFirstProgressTurn:average(x=>x.firstProgressTurn??x.movesUsed+1),
  avgMirrorActivations:average(x=>x.usage.mirror),
  avgHanabiDeliveries:average(x=>x.usage.hanabi),
  avgWindShifts:average(x=>x.usage.wind),
  zeroLegalRuns:rows.filter(x=>x.zeroLegal).length,
  turnCapRuns:rows.filter(x=>x.limitedByTurnCap).length};
}
function analyze(rules,architect,blueprint,options={}){
 const normalized=architect.normalize(blueprint,rules);
 const trials=options.trials??3,baseSeed=options.baseSeed??20261104;
 check(Number.isInteger(trials)&&trials>=1&&trials<=200,
  "Trials must be between 1 and 200");
 check(Number.isInteger(baseSeed)&&baseSeed>=0&&baseSeed<=0xffffffff,
  "Base seed must be uint32");
 const agents=options.strategies??STRATEGIES;
 check(Array.isArray(agents)&&agents.length>=1&&
  new Set(agents).size===agents.length&&agents.every(x=>STRATEGIES.includes(x)),
  "Choose unique valid agent strategies");
 const seeds=Array.from({length:trials},(_,i)=>(baseSeed+Math.imul(i,7919))>>>0);
 const runs=[];
 for(const seed of seeds)for(const strategy of agents)
  runs.push(play(rules,architect,normalized,{seed,strategy,
   directorMode:options.directorMode??"v62",
   maxCandidates:options.maxCandidates??9,maxTurns:options.maxTurns??120}));
 const byStrategy=Object.fromEntries(agents.map(strategy=>
  [strategy,summarize(runs.filter(x=>x.strategy===strategy))]));
 const random=byStrategy.random,spatial=byStrategy.spatial||byStrategy.objective;
 const signals=[];
 for(const [strategy,row] of Object.entries(byStrategy)){
  if(row.winsWithinThreeMoves>0)signals.push(strategy+": VERY_EARLY_WIN");
  if(row.avgShuffles>0.25)signals.push(strategy+": FREQUENT_AUTO_SHUFFLE");
  if(row.avgMaxGoalDrought>=8)signals.push(strategy+": LONG_GOAL_DROUGHT");
  if(row.zeroLegalRuns)signals.push(strategy+": ZERO_LEGAL_MOVES");
  if(row.diagnosticWinRate<=.1)signals.push(strategy+": FEW_OR_NO_SOLUTIONS_FOUND");
 }
 if(random&&spatial&&random.diagnosticWinRate>=spatial.diagnosticWinRate&&
    random.winningMoves.p50!==null&&spatial.winningMoves.p50!==null&&
    random.winningMoves.p50<=spatial.winningMoves.p50)
  signals.push("LOW_STRATEGY_ADVANTAGE_IN_THIS_SAMPLE");
 return {
  version:VERSION,blueprintId:normalized.id,level:normalized.recipe.index+1,
  insight:normalized.insight,opening:normalized.opening?.provenance??"seeded",
  directorMode:options.directorMode??"v62",seeds,strategies:agents.slice(),
  byStrategy,runs,signals,
  caveat:"Heuristic, bounded agent simulation. Does NOT prove reachability, fairness, human win rate, or enjoyable difficulty."
 };
}
const api=Object.freeze({VERSION,STRATEGIES,play,analyze,summarize,percentile});
root.HarmonyDifficultyLab=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
