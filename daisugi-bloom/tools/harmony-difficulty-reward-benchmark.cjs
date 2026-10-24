#!/usr/bin/env node
"use strict";
// Difficulty & Reward Calibration 1.0: real deterministic games for levels 1–20.
// Diagnostic bots DO NOT predict human success probabilities.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js");
const Lab=require("../harmony/diagnostics.js").create(R);
const levels=Array.from({length:20},(_,i)=>i);
const strategies=["random","goal"],mode="director3",trials=10,seed=20261024;
const runs=[];
for(const level of levels)for(const strategy of strategies)
 for(let trial=0;trial<trials;trial++){
  const sample=Lab.sampleSeed(seed,level,trial);
  const res=Lab.play(level,sample,strategy,mode);
  assert(res.movesUsed<=R.levelConfig(level).moves);
  assert(res.progress<=res.target||res.won);
  if(res.won)assert(res.stars>=1&&res.stars<=3);
  runs.push({...res,trial});
 }
const summary=levels.map(level=>{
 const cfg=R.levelConfig(level),out={level:level+1,type:cfg.goal.type,target:cfg.goal.count,
  moves:cfg.moves,starTargets:R.moveStarTargets(cfg)};
 for(const strategy of strategies){
  const sampled=runs.filter(r=>r.level===level&&r.strategy===strategy);
  const won=sampled.filter(r=>r.won),sorted=won.map(r=>r.movesUsed).sort((a,b)=>a-b);
  out[strategy]={wins:won.length,total:sampled.length,
   medianWinMoves:sorted.length?sorted[Math.floor(sorted.length/2)]:null,
   veryFastWins:won.filter(r=>r.movesUsed<=3).length,
   threeStars:won.filter(r=>r.stars===3).length,twoStars:won.filter(r=>r.stars===2).length,
   oneStar:won.filter(r=>r.stars===1).length,
   avgGoalRatio:+(sampled.reduce((sum,r)=>sum+r.goalRatio,0)/sampled.length).toFixed(3)};
 }
 return out;
});
console.log("Difficulty & Reward Calibration 1.0 · "+runs.length+" real seeded bot runs (NOT human win rates)");
console.log("Level | Goal | Moves | Random wins | Goal wins | Median goal moves | <=3 move wins | 3★/2★/1★");
for(const r of summary)console.log([r.level,r.type+" "+r.target,r.moves,
 r.random.wins+"/"+trials,r.goal.wins+"/"+trials,r.goal.medianWinMoves??"—",r.goal.veryFastWins,
 [r.goal.threeStars,r.goal.twoStars,r.goal.oneStar].join("/")].join(" | "));
// Safety invariant: a stage that requires four different match-making moves
// cannot be completed in a 1-3 move cascade, even with multiple four-matches
// resulting from one swap.
for(const level of [5,13])for(const strategy of strategies){
 assert.equal(runs.filter(r=>r.level===level&&r.strategy===strategy&&r.won&&r.movesUsed<4).length,0,
  "Level "+(level+1)+" completed without four distinct matching moves");
}
const dest=path.resolve("daisugi-bloom/reports/difficulty-reward-1.0-benchmark.json");
fs.mkdirSync(path.dirname(dest),{recursive:true});
fs.writeFileSync(dest,JSON.stringify({version:"difficulty-reward-1.0",seed,trials,strategies,mode,
 note:"Bots are diagnostics. No human win-rate inference; use playtests for final calibration.",summary,runs},null,2)+"\n");
console.log("Saved "+dest);
