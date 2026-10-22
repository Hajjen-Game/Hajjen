#!/usr/bin/env node
"use strict";
/* Offline Game Dev command-line runner. No gameplay, files or services touched
 * unless --out is explicitly provided. Example:
 * node daisugi-bloom/tools/harmony-engine-benchmark.cjs --trials 100 --level all --seed 20261022 --out /tmp/harmony-diagnostics.json
 */
const fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js");
const Engine=require("../harmony/diagnostics.js").create(R);
const opts={trials:10,seed:20261022,levels:R.levels.map((_,i)=>i),strategies:Engine.STRATEGIES};
let output=null;
const args=process.argv.slice(2);
for(let i=0;i<args.length;i++){
 const flag=args[i];
 const value=args[++i];
 if(!value)throw Error("Missing value for "+flag);
 switch(flag){
  case "--trials":opts.trials=Number(value);break;
  case "--seed":opts.seed=Number(value);break;
  case "--level":
   opts.levels=value==="all"?R.levels.map((_,i)=>i):[Number(value)-1];
   break;
  case "--out":output=value;break;
  default:throw Error("Unknown option "+flag);
 }
}
const started=Date.now();
const report=Engine.run(opts);
const elapsedMs=Date.now()-started;
console.log("Japanese Harmony · Engine Lab 1.0 · "+report.runs.length+" seeded games · "+elapsedMs+" ms");
console.log("Level | Bot | Wins | Goal reached | Avg choices | Cascades | No-progress turns");
for(const row of report.results){
 const pct=x=>Math.round(x*100)+"%";
 console.log([String(row.level+1).padStart(5),row.strategy.padEnd(9),
  (row.wins+"/"+row.samples).padStart(5),pct(row.avgGoalRatio).padStart(12),
  row.avgLegalMoves.toFixed(1).padStart(11),
  row.avgCascades.toFixed(2).padStart(8),
  row.avgNoGoalTurns.toFixed(1).padStart(8)].join(" | "));
}
if(output){
 const target=path.resolve(output);
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,JSON.stringify({...report,elapsedMs},null,2)+"\n");
 console.log("Wrote reproducible JSON: "+target);
}
