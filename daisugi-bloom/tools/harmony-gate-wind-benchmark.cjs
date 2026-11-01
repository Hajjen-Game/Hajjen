"use strict";
/* Identical seeds, actual legal moves; no invented probabilities or wins. */
const fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js");
const arg=(key,def,max)=>{const v=Number(process.argv.find(x=>x.startsWith(key+"="))?.split("=")[1]||def);return Number.isInteger(v)?Math.max(1,Math.min(max,v)):def;};
const seeds=arg("--seeds",8,30),maxMoves=arg("--moves",25,46);
const reports=[];
function play(seed,wind){
 const g=new R.Game(53,null,{seed,directorMode:"v62",bambooPreview:true,
  ...(wind?{}:{windGarden:null})});
 const stats={seed,wind,played:0,shuffles:0,windShifts:0,
  bottomRowChangedTurns:0,bottomFusionGroups:0,allFusionGroups:0,
  lowMobilityTurns:0,maxGoalStall:0,goalStall:0,progress:0,
  complete:false,invalid:0,remainingMoves:0};
 for(let turn=0;turn<maxMoves&&!g.complete&&!g.failed;turn++){
  const choices=R.validSwaps(g.board);if(!choices.length){stats.invalid++;break;}
  const beforeIds=g.board.slice(42,49).map(x=>x?.id);
  const progress=g.progress(),pair=choices[(turn*3+seed)%choices.length];
  const outcome=g.swap(...pair);if(!outcome.ok){stats.invalid++;break;}
  stats.played++;
  const shuffled=outcome.events.some(e=>e.type==="shuffle");
  stats.shuffles+=outcome.events.filter(e=>e.type==="shuffle").length;
  stats.windShifts+=outcome.events.filter(e=>e.type==="wind-shift").length;
  if(!shuffled&&g.board.slice(42,49).some((x,i)=>x?.id!==beforeIds[i]))
   stats.bottomRowChangedTurns++;
  for(const evt of outcome.events.filter(e=>e.type==="fusion"))
   for(const group of evt.groups){
    stats.allFusionGroups++;
    if(group.at>=42)stats.bottomFusionGroups++;
   }
  stats.lowMobilityTurns+=Number(R.validSwaps(g.board).length<=2);
  stats.goalStall=g.progress()>progress?0:stats.goalStall+1;
  stats.maxGoalStall=Math.max(stats.maxGoalStall,stats.goalStall);
 }
 stats.progress=g.progress();stats.complete=g.complete;
 stats.remainingMoves=g.moves;
 return stats;
}
for(let i=0;i<seeds;i++){
 const seed=20266172+i*1307;
 reports.push({seed,withoutWind:play(seed,false),withWind:play(seed,true)});
}
const total=(key,mode)=>reports.reduce((n,r)=>n+r[mode][key],0);
const metrics=["played","shuffles","windShifts","bottomRowChangedTurns",
 "bottomFusionGroups","allFusionGroups","lowMobilityTurns","progress","complete"];
const summary=Object.fromEntries(["withoutWind","withWind"].map(mode=>[mode,
 Object.fromEntries(metrics.map(k=>[k,total(k,mode)]))]));
const result={scenario:"Level 54 / Gate of Echoes",director:"v62",seeds,maxMoves,
 note:"Fixed legal-move policy, not a skilled-player or forced-win estimate. Different gameplay paths naturally diverge after wind.",
 summary,reports};
if(process.argv.includes("--write")){
 const dest=path.resolve(__dirname,"../reports/gate54-wind-study.json");
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,JSON.stringify(result,null,2)+"\n");
}
console.log(JSON.stringify({seeds,maxMoves,summary},null,2));
