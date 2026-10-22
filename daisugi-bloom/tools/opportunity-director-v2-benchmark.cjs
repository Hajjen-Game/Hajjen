#!/usr/bin/env node
"use strict";
// Reproducible three-way A/B/C analysis. This is a diagnostic experiment,
// NOT a claim that Director 2.0 makes human play more fun.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const Lab=require("../harmony/diagnostics.js").create(R);
const levels=[0,3,5,8,10,12,19,29,39,49];
const modes=["standard","director","director2"];
const strategies=["random","goal"];
const trials=8; // 10 x 3 x 2 x 8 = 480 complete games.
const baseSeed=20261022;
const start=Date.now();
const report=Lab.run({levels,modes,strategies,trials,seed:baseSeed});
const durationMs=Date.now()-start;
assert.equal(report.runs.length,480);
for(const level of levels)for(const strategy of strategies){
 const runs=report.runs.filter(x=>x.level===level&&x.strategy===strategy);
 const baseline=runs.filter(x=>x.mode==="standard").map(x=>x.seed);
 for(const mode of modes)assert.deepEqual(runs.filter(x=>x.mode===mode).map(x=>x.seed),baseline);
}
for(const run of report.runs){
 assert(run.movesUsed<=run.movesBudget&&run.movesUsed>0);
 assert(Number.isFinite(run.score)&&run.score>=0);
 assert(run.directorSelections<=run.directorRefills);
 assert(Number.isFinite(run.avgDeveloped)&&Number.isFinite(run.avgNearReady));
 assert.equal(run.zeroLegalTurns,0,"No level may lock up");
 if(run.mode==="standard")assert.equal(run.directorRefills,0);
}
function summary(mode,strategy){
 const runs=report.runs.filter(x=>x.mode===mode&&x.strategy===strategy);
 const mean=k=>runs.reduce((total,r)=>total+r[k],0)/runs.length;
 return {mode,strategy,games:runs.length,wins:runs.filter(r=>r.won).length,
  avgScore:mean("score"),avgLegalMoves:mean("avgLegalMoves"),
  avgMeaningful:mean("avgMeaningful"),avgNearReady:mean("avgNearReady"),
  avgDeveloped:mean("avgDeveloped"),avgProspects:mean("avgProspects"),
  avgMasterpieces:mean("masterpieces"),avgDrought:mean("maxGoalDrought"),
  avgDirectorSelections:mean("directorSelections")};
}
const summaryRows=modes.flatMap(mode=>strategies.map(strategy=>summary(mode,strategy)));
console.log("Japanese Harmony · Opportunity Director 2.0 · 480 seeded games · "+durationMs+"ms");
console.log("Mode | Bot | Wins | Avg score | Developed options | Stage-4-ready | Investment prospects | Max goal drought");
for(const r of summaryRows){
 console.log([r.mode,r.strategy,r.wins+"/"+r.games,r.avgScore.toFixed(0),
  r.avgDeveloped.toFixed(2),r.avgNearReady.toFixed(2),
  r.avgProspects.toFixed(2),r.avgDrought.toFixed(2)].join(" | "));
}
const target=path.resolve("daisugi-bloom/reports/opportunity-director-2-benchmark.json");
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify({benchmark:"opportunity-director-v2",
  timestamp:new Date().toISOString(),levels,strategies,modes,trials,baseSeed,durationMs,
  description:"Paired seeds, real deterministic gameplay, Directors remain opt-in; not human win probabilities.",
  summary:summaryRows,...report},null,2)+"\n");
console.log("Full reproducible report: "+target);
