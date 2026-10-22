#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js");
const Lab=require("../harmony/diagnostics.js").create(R);
const modes=["standard","director","director2","director3"];
const levels=[10,12,29,49],strategies=["random","goal","lookahead"],trials=10,seed=20261022;
const start=Date.now();
const report=Lab.run({modes,levels,strategies,trials,seed});
assert.equal(report.runs.length,480);
for(const level of levels)for(const strategy of strategies){
 const matched=report.runs.filter(r=>r.level===level&&r.strategy===strategy);
 const seeds=matched.filter(r=>r.mode==="standard").map(r=>r.seed);
 for(const mode of modes)assert.deepEqual(seeds,matched.filter(r=>r.mode===mode).map(r=>r.seed));
}
for(const run of report.runs){
 assert(run.directorSelections<=run.directorRefills);
 assert(run.movesUsed>=1&&run.movesUsed<=run.movesBudget);
 assert(Number.isFinite(run.avgDeveloped)&&Number.isFinite(run.avgProspects));
}
const summary=[];
for(const mode of modes)for(const strategy of strategies){
 const runs=report.runs.filter(r=>r.mode===mode&&r.strategy===strategy);
 const avg=key=>+(runs.reduce((sum,r)=>sum+r[key],0)/runs.length).toFixed(2);
 summary.push({mode,strategy,games:runs.length,wins:runs.filter(r=>r.won).length,
  score:avg("score"),developed:avg("avgDeveloped"),nearReady:avg("avgNearReady"),
  drought:avg("maxGoalDrought"),flowTurns:avg("flowTurns"),recoveryTurns:avg("recoveryTurns")});
}
const elapsedMs=Date.now()-start;
console.log("Harmony Pacing Director 3.0 — "+report.runs.length+" paired simulated games ("+elapsedMs+" ms)");
for(const row of summary)console.log(JSON.stringify(row));
const dest=path.resolve("daisugi-bloom/reports/harmony-pacing-director-3-benchmark.json");
fs.mkdirSync(path.dirname(dest),{recursive:true});
fs.writeFileSync(dest,JSON.stringify({description:"Synthetic bot timing only, not human behavior or human success probability",seed,levels,strategies,modes,trials,elapsedMs,summary,...report},null,2)+"\n");
console.log("Reproducible report: "+dest);
