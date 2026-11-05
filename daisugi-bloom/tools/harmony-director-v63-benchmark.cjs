"use strict";
/* Director 6.3 observational A/B check: same approved opening and seed.
 * 6.2 remains a control, never the production default.
 * A bounded heuristic bot does not measure human difficulty or prove fairness.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js");
const A=require("../harmony/puzzle-architect.js");
const O=require("../harmony/journey-authored-openings.js");
const D=require("../harmony/journey-levels-v2.js");
const Lab=require("../harmony/difficulty-lab.js");
const numbers={trials:2,turns:10,candidates:4,seed:20261105};
let write=false;
for(const arg of process.argv.slice(2)){
 if(arg==="--write"){write=true;continue;}
 const match=/^--(trials|turns|candidates|seed)=(\d+)$/.exec(arg);
 if(!match)throw Error("Unknown argument: "+arg);
 numbers[match[1]]=Number(match[2]);
}
assert(Number.isInteger(numbers.trials)&&numbers.trials>=1&&numbers.trials<=25);
assert(Number.isInteger(numbers.turns)&&numbers.turns>=1&&numbers.turns<=120);
assert(Number.isInteger(numbers.candidates)&&numbers.candidates>=3&&numbers.candidates<=15);
const levels=[24,29,39],strategies=["random","objective"],modes=["v62","v63"];
const rows=[];
for(const index of levels)for(let n=0;n<numbers.trials;n++){
 const seed=(numbers.seed+index*197+n*7919)>>>0,bp=O.get(index);
 assert(bp&&D.get(index).goal.requires?.length>0,"Benchmark requires multi-goal authored puzzle");
 for(const strategy of strategies)for(const mode of modes){
  const start=process.hrtime.bigint();
  const run=Lab.play(R,A,bp,{strategy,seed,directorMode:mode,
   maxCandidates:numbers.candidates,maxTurns:Math.min(numbers.turns,D.get(index).moves)});
  const elapsedMs=Number(process.hrtime.bigint()-start)/1e6;
  rows.push({level:index+1,name:D.get(index).name,seed,mode,strategy,
   ...run,elapsedMs:Math.round(elapsedMs)});
 }
}
const report={version:"director63-paired-1",date:"2026-11-05",settings:numbers,
 caveat:"These are bounded heuristic-bot diagnostics. Same starting seed is not the same realized turn sequence once refills diverge. Not a human win rate or proof of balanced difficulty.",
 samples:rows.length,byMode:Object.fromEntries(modes.map(mode=>{
  const selected=rows.filter(x=>x.mode===mode);
  return [mode,{trials:selected.length,wins:selected.filter(x=>x.won).length,
   shuffles:selected.reduce((n,x)=>n+x.shuffles,0),
   zeroLegal:selected.reduce((n,x)=>n+x.zeroLegal,0),
   meanGoalCompletion:Math.round(selected.reduce((n,x)=>n+x.goalCompletion,0)/selected.length*1000)/1000,
   elapsedMs:selected.reduce((n,x)=>n+x.elapsedMs,0)}];
 })),runs:rows};
assert.equal(report.samples,levels.length*numbers.trials*strategies.length*modes.length);
assert.equal(report.byMode.v62.trials,report.byMode.v63.trials);
if(write){
 const file=path.join(__dirname,"..","reports","harmony-director-v63-paired.json");
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify(report,null,2)+"\n");
 console.log("Wrote "+file);
}
console.log(JSON.stringify({settings:report.settings,byMode:report.byMode,samples:report.samples,caveat:report.caveat}));
console.log("PASS Director 6.3 paired multi-objective sampling (no player data modified)");
