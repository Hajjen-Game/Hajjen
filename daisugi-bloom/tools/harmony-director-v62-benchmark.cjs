"use strict";
/* Director 6.1 vs 6.2 on genuine legal player decisions.
   Reports measured evidence; no gameplay writes, scripted wins or guaranteed
   goal development. A/B trajectories diverge after their chosen refills. */
const fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js");
const countArg=(key,fallback,max)=>{
 const value=Number(process.argv.find(a=>a.startsWith(key+"="))?.split("=")[1]||fallback);
 return Number.isInteger(value)?Math.max(1,Math.min(max,value)):fallback;
};
const trials=countArg("--trials",3,50),maxMoves=countArg("--moves",14,46);
const cases=[
 {name:"Gate of Echoes",level:53,extra:{bambooPreview:true}},
 {name:"Central Shrine",level:57,extra:{bambooPreview:true}},
 {name:"Garden Lotus Crossing",level:60,extra:{lotusPreview:"garden-route"}},
 {name:"Moonlit Mist",level:2,extra:{moonMirrorPreview:"mist"}},
 {name:"Crossing Winds",level:2,extra:{windGardenPreview:"crossing"}}
];
function play(spec,mode,seed){
 const game=new R.Game(spec.level,null,{seed,directorMode:mode,...spec.extra});
 const metrics={seed,played:0,shuffles:0,lowChoices:0,progress:0,
  objectiveStall:0,longestObjectiveStall:0,invalid:0,completed:false,
  settledAll:true,refillSelections:0};
 for(let i=0;i<Math.min(maxMoves,game.config.moves)&&!game.failed&&!game.complete;i++){
  const legal=R.validSwaps(game.board);
  if(!legal.length){metrics.invalid++;break;}
  const before=game.progress(),selected=legal[(i*3+seed)%legal.length];
  const e=game.swap(...selected);
  if(!e.ok){metrics.invalid++;break;}
  metrics.played++;
  metrics.shuffles+=e.events.filter(x=>x.type==="shuffle").length;
  metrics.lowChoices+=Number(R.validSwaps(game.board).length<=2);
  metrics.refillSelections+=game.roundTrace.moves.at(-1)?.refills
   ?.filter(r=>r.chosen>0).length||0;
  metrics.settledAll&&=R.scan(game.board).length===0;
  metrics.objectiveStall=game.progress()>before?0:metrics.objectiveStall+1;
  metrics.longestObjectiveStall=Math.max(metrics.longestObjectiveStall,metrics.objectiveStall);
 }
 metrics.progress=game.progress();
 metrics.completed=game.complete;
 return metrics;
}
const report={version:"6.2",trials,maxMoves,
 note:"Same seeds and legal-choice policy; paths diverge naturally after refill. This is not a skill benchmark and does not guarantee fewer shuffles in every board.",
 comparisons:[]};
for(const x of cases){
 const item={scenario:x.name,level:x.level+1,modes:{}};
 for(const mode of ["v61","v62"]){
  const runs=[];
  for(let k=1;k<=trials;k++)runs.push(play(x,mode,73351+k*1703));
  item.modes[mode]={
   played:runs.reduce((n,r)=>n+r.played,0),
   shuffles:runs.reduce((n,r)=>n+r.shuffles,0),
   lowChoices:runs.reduce((n,r)=>n+r.lowChoices,0),
   progress:runs.reduce((n,r)=>n+r.progress,0),
   invalid:runs.reduce((n,r)=>n+r.invalid,0),
   avgLongestGoalStall:Number((runs.reduce((n,r)=>n+r.longestObjectiveStall,0)/trials).toFixed(2)),
   completed:runs.filter(r=>r.completed).length,
   runs
  };
 }
 report.comparisons.push(item);
}
const dest=path.resolve(__dirname,"../reports/harmony-director-v62-sample.json");
if(process.argv.includes("--write")){
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,JSON.stringify(report,null,2)+"\n");
}
console.log(JSON.stringify({
 trials,maxMoves,comparisons:report.comparisons.map(x=>({
  scenario:x.scenario,
  v61:{shuffles:x.modes.v61.shuffles,lowChoices:x.modes.v61.lowChoices,
   progress:x.modes.v61.progress,avgLongestGoalStall:x.modes.v61.avgLongestGoalStall},
  v62:{shuffles:x.modes.v62.shuffles,lowChoices:x.modes.v62.lowChoices,
   progress:x.modes.v62.progress,avgLongestGoalStall:x.modes.v62.avgLongestGoalStall}
 }))},null,2));
