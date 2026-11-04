#!/usr/bin/env node
"use strict";
/* Puzzle Architect 1.0 / Difficulty Lab 1.0 — read-only CLI.
 *
 * node daisugi-bloom/tools/puzzle-difficulty-lab.cjs --level 20 --trials 3
 * node daisugi-bloom/tools/puzzle-difficulty-lab.cjs --blueprint /path/file.json
 *
 * Printed stats belong to heuristic bots, not human difficulty measurements.
 */
const fs=require("node:fs");
const path=require("node:path");
const R=require("../harmony/rules.js");
const A=require("../harmony/puzzle-architect.js");
const D=require("../harmony/difficulty-lab.js");
const Journey=require("../harmony/journey-levels-v2.js");
const Authored=require("../harmony/journey-authored-openings.js");
function parse(args){
 const options={level:20,trials:3,seed:20261104,directorMode:"v62",
  maxCandidates:8,maxTurns:120,strategies:D.STRATEGIES.slice(),
  blueprint:null,out:null};
 for(let i=0;i<args.length;i+=2){
  const key=args[i],value=args[i+1];
  if(!value)throw Error("Missing argument for "+key);
  switch(key){
   case "--level":options.level=Number(value);break;
   case "--trials":options.trials=Number(value);break;
   case "--seed":options.seed=Number(value);break;
   case "--director":options.directorMode=value;break;
   case "--max-candidates":options.maxCandidates=Number(value);break;
   case "--max-turns":options.maxTurns=Number(value);break;
   case "--strategies":options.strategies=value.split(",").map(x=>x.trim());break;
   case "--blueprint":options.blueprint=value;break;
   case "--out":options.out=value;break;
   default:throw Error("Unknown option "+key);
  }
 }
 if(!Number.isInteger(options.level)||options.level<1||options.level>Journey.COUNT)
  throw Error("--level must be 1-"+Journey.COUNT);
 if(!Number.isInteger(options.trials)||options.trials<1||options.trials>200)
  throw Error("--trials must be 1-200");
 if(!Number.isInteger(options.seed)||options.seed<0||options.seed>0xffffffff)
  throw Error("--seed must be uint32");
 return options;
}
function main(){
 const opts=parse(process.argv.slice(2));
 let blueprint;
 if(opts.blueprint){
  const full=path.resolve(opts.blueprint);
  blueprint=A.normalize(JSON.parse(fs.readFileSync(full,"utf8")),R);
 }else{
  const recipe=Journey.get(opts.level-1);
  blueprint=Authored.get(opts.level-1)||A.create(R,recipe,{seed:opts.seed,directorMode:opts.directorMode,
   insight:recipe.intro,primarySkill:"Explore the intended objective's spatial route",
   sequence:["Find an advantageous opening","Prepare a deliberate mechanic interaction",
    "Convert the setup into goal progress"]});
 }
 const result=D.analyze(R,A,blueprint,{trials:opts.trials,baseSeed:opts.seed,
  directorMode:opts.directorMode,maxCandidates:opts.maxCandidates,
  maxTurns:opts.maxTurns,strategies:opts.strategies});
 const info=A.inspect(R,blueprint,{seed:opts.seed,directorMode:opts.directorMode});
 const print={
  level:result.level,blueprintId:result.blueprintId,opening:result.opening,
  insight:result.insight,
  openingLegalSwaps:info.legalSwaps,
  samples:result.runs.length,
  byStrategy:result.byStrategy,signals:result.signals,caveat:result.caveat
 };
 process.stdout.write(JSON.stringify(print,null,2)+"\n");
 if(opts.out){
  const file=path.resolve(opts.out);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify({...result,geometry:info},null,2)+"\n");
  process.stderr.write("Report: "+file+"\n");
 }
}
if(require.main===module)try{main();}catch(error){
 process.stderr.write("Puzzle Difficulty Lab: "+error.message+"\n");
 process.exitCode=1;
}
module.exports={parse};
