"use strict";
/* Reproducible paired Director 4.0/6.0 sampling.
 * Reports only. No scripted winning agent or guaranteed-improvement claims.
 * Every candidate swap is a real legal move in its respective evolving board.
 */
const fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js");
const trials=Math.max(1,Math.min(60,Number(process.argv.find(x=>x.startsWith("--trials="))?.split("=")[1]||6)));
const steps=Math.max(1,Math.min(40,Number(process.argv.find(x=>x.startsWith("--moves="))?.split("=")[1]||17)));
const cases=[
 {name:"Gate of Echoes",level:53,options:{bambooPreview:true}},
 {name:"Central Shrine",level:57,options:{bambooPreview:true}},
 {name:"Garden Lotus Crossing",level:60,options:{lotusPreview:"garden-route"}},
 {name:"Moonlit Mist",level:2,options:{moonMirrorPreview:"mist"}},
 {name:"Crossing Winds",level:2,options:{windGardenPreview:"crossing"}}
];
function run(item,mode,seed){
 const g=new R.Game(item.level,null,{seed,directorMode:mode,...item.options});
 let shuffles=0,low=0,choices=0,invalid=0;
 for(let i=0;i<Math.min(steps,g.config.moves)&&!g.complete&&!g.failed;i++){
  const legal=R.validSwaps(g.board);
  if(!legal.length){invalid++;break;}
  // Same *policy* and per-turn seed, not the same obsolete swap coordinates.
  const pair=legal[(i*3+seed)%legal.length],out=g.swap(...pair);
  if(!out.ok){invalid++;break;}
  shuffles+=out.events.filter(x=>x.type==="shuffle").length;
  if(R.validSwaps(g.board).length<=2)low++;
  choices++;
 }
 return {shuffles,low,choices,invalid,progress:g.progress(),completed:g.complete};
}
const report={version:1,date:"2026-10-31",trials,movesPerRound:steps,
 note:"Seed-paired legal-move policies diverge after refills; success on random-play trajectories is NOT a measure of intended puzzle difficulty.",
 comparisons:[]};
for(const item of cases){
 const comparison={scenario:item.name,level:item.level+1,modes:{}};
 for(const mode of ["v4","v6"]){
  const values={runs:0,shuffles:0,lowChoices:0,playedMoves:0,invalidMoves:0,
   progress:0,completed:0,perSeed:[]};
  for(let k=1;k<=trials;k++){
   const seed=73351+k*1703;
   const current=run(item,mode,seed);
   values.runs++;values.shuffles+=current.shuffles;values.lowChoices+=current.low;
   values.playedMoves+=current.choices;values.invalidMoves+=current.invalid;
   values.progress+=current.progress;values.completed+=Number(current.completed);
   values.perSeed.push({seed,...current});
  }
  values.lowChoiceRate=Number((values.lowChoices/Math.max(1,values.playedMoves)).toFixed(3));
  comparison.modes[mode]=values;
 }
 report.comparisons.push(comparison);
}
const out=path.join(__dirname,"../reports/harmony-director-v6-sample.json");
if(process.argv.includes("--write")){
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");
}
console.log(JSON.stringify({trials,steps,
 comparisons:report.comparisons.map(c=>({scenario:c.scenario,
  v4:{shuffles:c.modes.v4.shuffles,lowChoices:c.modes.v4.lowChoices,moves:c.modes.v4.playedMoves,progress:c.modes.v4.progress},
  v6:{shuffles:c.modes.v6.shuffles,lowChoices:c.modes.v6.lowChoices,moves:c.modes.v6.playedMoves,progress:c.modes.v6.progress}}))},null,2));
