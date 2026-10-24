#!/usr/bin/env node
"use strict";
// Journey Objective Rebalance 1.0: reproducible seeded BOT measurements,
// not estimates of human play. Kept separate from legacy score calibration.
const assert=require("node:assert/strict");
const fs=require("node:fs"),p=require("node:path");
const R=require("../harmony/rules.js");
const Lab=require("../harmony/diagnostics.js").create(R);
const trials=8,levels=Array.from({length:10},(_,i)=>i+10);
const modes=["director3"],strategies=["random","goal"],seed=20261024;
const runs=[];
for(const level of levels)for(const mode of modes)for(const strategy of strategies)
 for(let trial=0;trial<trials;trial++){
  const trialSeed=Lab.sampleSeed(seed,level,trial);
  const result=Lab.play(level,trialSeed,strategy,mode);
  assert(result.movesUsed<=R.levelConfig(level).moves);
  assert(result.progress<=result.target||result.won);
  assert.equal(result.movesBudget,R.levelConfig(level).moves);
  runs.push({...result,trial});
 }
const result=levels.map(level=>{
 const row={level:level+1,type:R.levelConfig(level).goal.type,
  target:R.levelConfig(level).goal.count,moves:R.levelConfig(level).moves};
 for(const strategy of strategies){
  const played=runs.filter(r=>r.level===level&&r.strategy===strategy);
  const won=played.filter(x=>x.won);
  row[strategy]={games:played.length,wins:won.length,
   avgMovesToWin:won.length?+(won.reduce((sum,x)=>sum+x.movesUsed,0)/won.length).toFixed(1):null,
   medianWinningMoves:won.length?won.map(x=>x.movesUsed).sort((a,b)=>a-b)[Math.floor(won.length/2)]:null,
   avgProgress:+(played.reduce((sum,x)=>sum+x.goalRatio,0)/played.length).toFixed(2)};
 }
 return row;
});
assert.equal(runs.length,levels.length*trials*strategies.length);
console.log("Journey Objectives Rebalance 1.0 — seeded bots / no human win-rate inference");
console.log("Level | Goal | Budget | Random wins | Goal-bot wins | Goal-bot avg moves");
for(const row of result)console.log([
 row.level,row.type+" "+row.target,row.moves,
 row.random.wins+"/"+trials,row.goal.wins+"/"+trials,
 row.goal.avgMovesToWin??"—"
].join(" | "));
const file=p.resolve("daisugi-bloom/reports/objectives-rebalance-1.0-benchmark.json");
fs.mkdirSync(p.dirname(file),{recursive:true});
fs.writeFileSync(file,JSON.stringify({version:"objectives-rebalance-1.0",seed,trials,levels,strategies,
 note:"Bots select swaps algorithmically. Rates are NOT a proxy for human difficulty.",result,runs},null,2)+"\n");
console.log("Saved "+file);
