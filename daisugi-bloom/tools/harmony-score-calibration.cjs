#!/usr/bin/env node
"use strict";
// 330 full-length games: run every available move, even after minimum goal.
// Normal Engine Lab deliberately stops early upon passing, which is unsuitable
// for calibrating the top two stars of the full-run scoring system.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js");
const Lab=require("../harmony/diagnostics.js").create(R);
const levels=[10,11,12,13,14,19,24,29,39,49,59];
const strategies=["random","score","goal"],trials=10,seed=26533;
const runs=[];
function botRandom(seed){
 let s=(seed^0xb7e15162)>>>0;
 return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};
}
for(const level of levels)for(const strategy of strategies)for(let trial=0;trial<trials;trial++){
 const trialSeed=Lab.sampleSeed(seed,level,trial),g=new R.Game(level,null,{seed:trialSeed});
 const rand=botRandom(trialSeed);
 let turns=0;
 while(g.moves>0&&turns<g.config.moves){
  const moves=R.validSwaps(g.board);
  assert(moves.length>0,"Never leave an unplayable board");
  const [a,b]=Lab.choose(g,strategy,rand);
  assert(g.swap(a,b).ok);
  turns++;
 }
 assert.equal(turns,g.config.moves,"Every run should use the complete move budget");
 runs.push({level:level+1,strategy,trial,seed:trialSeed,
  score:g.score,won:g.complete,stars:g.stars(),thresholds:g.config.stars,
  turns,masterpieces:g.masterpieces,echoes:g.echoes});
}
const results=[];
for(const level of levels)for(const strategy of strategies){
 const group=runs.filter(r=>r.level===level+1&&r.strategy===strategy);
 const scores=group.map(x=>x.score).sort((a,b)=>a-b),mean=scores.reduce((a,b)=>a+b,0)/scores.length;
 const threshold=R.levelConfig(level).stars;
 results.push({level:level+1,strategy,games:group.length,thresholds:threshold,
  meanScore:Math.round(mean),medianScore:scores[Math.floor(scores.length/2)],
  best:scores.at(-1),won:group.filter(x=>x.won).length,
  stars1plus:group.filter(x=>x.stars>=1).length,
  stars2plus:group.filter(x=>x.stars>=2).length,
  stars3:group.filter(x=>x.stars>=3).length});
}
assert.equal(runs.length,330);
assert.equal(R.levelConfig(10).goal.count,7500);
assert.deepEqual(R.levelConfig(10).stars,[7500,11250,16875]);
assert(results.every(x=>x.stars3<=x.stars2plus&&x.stars2plus<=x.stars1plus));
console.log("Japanese Harmony · Journey Stars 6.15 · "+runs.length+" complete-move games");
console.log("Level | Bot | 1 star | 2 stars | 3 stars | Mean score | Wins");
for(const row of results)console.log([row.level,row.strategy,row.thresholds.join("/"),row.stars2plus+"/"+row.games,row.stars3+"/"+row.games,row.meanScore,row.won+"/"+row.games].join(" | "));
const out=path.resolve("daisugi-bloom/reports/score-stars-6.15-benchmark.json");
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({version:"score-stars-6.15",trials,seed,description:"Full-length games using +50% Journey star thresholds after doubling moves; not human success probabilities",levels,strategies,results,runs},null,2)+"\n");
console.log("Exported "+out);
