#!/usr/bin/env node
"use strict";
// Repeatable complete-length A/B with 4 versus 5 families. Same seeded
// randomness, objective and Pacing Director 3.0 in every paired experiment.
// Bot turn timing is synthetic; it is not a substitute for user feedback.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js");
const Lab=require("../harmony/diagnostics.js").create(R);
const levels=[10,12,29,49],strategies=["random","score","goal"],trials=20,baseSeed=20261023;
const rows=[];
for(const level of levels)for(const strategy of strategies)for(let trial=0;trial<trials;trial++){
 const seed=Lab.sampleSeed(baseSeed,level,trial);
 for(const familyCount of [5,4]){
  const g=new R.Game(level,null,{seed,directorMode:"v3",familyCount});
  let s=(seed^0xb7e15162)>>>0;
  const random=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};
  const turns=g.config.moves;
  let minLegal=Infinity,choicesTotal=0,masterpiece=0,echo=0;
  for(let step=0;step<turns;step++){
   const legal=R.validSwaps(g.board).length;minLegal=Math.min(minLegal,legal);
   choicesTotal+=legal;assert(legal>=1,"No deadlocked board may be left");
   const move=Lab.choose(g,strategy,random);
   const decisionMs=strategy==="random"?4200+step%4*1100:strategy==="score"?7500+step%4*1200:11000+step%5*850;
   assert(g.swap(...move,{decisionMs}).ok);
  }
  assert.equal(g.moves,0);
  rows.push({level:level+1,strategy,trial,seed,familyCount,score:g.score,won:g.complete,
   stars:g.stars(),masterpieces:g.masterpieces,echoes:g.echoes,pulses:g.pulseHits,
   meanLegal:choicesTotal/turns,minLegal,directorSelections:g.directorSelections,
   directorRefills:g.directorRefills});
 }
}
assert.equal(rows.length,480);
for(const a of rows.filter(x=>x.familyCount===4)){
 const b=rows.find(x=>x.familyCount===5&&x.level===a.level&&x.strategy===a.strategy&&x.trial===a.trial);
 assert(b&&a.seed===b.seed);
}
const summaries=[];
for(const familyCount of [5,4])for(const strategy of strategies){
 const r=rows.filter(x=>x.familyCount===familyCount&&x.strategy===strategy);
 const avg=key=>Number((r.reduce((sum,x)=>sum+x[key],0)/r.length).toFixed(2));
 summaries.push({familyCount,strategy,games:r.length,wins:r.filter(x=>x.won).length,
  meanScore:avg("score"),meanLegal:avg("meanLegal"),meanMasterpieces:avg("masterpieces"),
  meanEchoes:avg("echoes"),meanDirectorSelections:avg("directorSelections"),
  threeStars:r.filter(x=>x.stars===3).length});
}
console.log("Japanese Harmony — Four Families Experiment 1.0 · 480 complete games");
console.log("Families | Bot | Wins | Score | Legal options per turn | Masterpieces | Echo | 3 stars");
for(const x of summaries)console.log([x.familyCount,x.strategy,x.wins+"/"+x.games,
 x.meanScore,x.meanLegal,x.meanMasterpieces,x.meanEchoes,x.threeStars+"/"+x.games].join(" | "));
const filename=path.resolve("daisugi-bloom/reports/four-families-1-0-benchmark.json");
fs.mkdirSync(path.dirname(filename),{recursive:true});
fs.writeFileSync(filename,JSON.stringify({version:"four-families-experiment-1.0",baseSeed,
 description:"Same seed, level and Pacing 3.0; all moves consumed; bots synthetic; player records stay separate.",levels,strategies,trials,summaries,rows},null,2)+"\n");
console.log("Saved full reproducible data: "+filename);
