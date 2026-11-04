"use strict";
/* Difficulty Lab 1.0: real-engine strategies, paired seeds, truthful summaries. */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const Architect=require("../harmony/puzzle-architect.js");
const Lab=require("../harmony/difficulty-lab.js");
const Journey=require("../harmony/journey-levels-v2.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const example=Architect.create(R,Journey.get(19),{
 seed:12345,insight:"The two launches must weaken the Sealed Stones.",
 primarySkill:"Hanabi-to-Stone geometry",
 sequence:["Prepare a rocket lane","Develop a stone-hit route","Complete the final chapter goal"]
});
check("Seeded real-game strategies count legal moves and preserve authored state",()=>{
 const before=JSON.stringify(example);
 const reports=[];
 for(const strategy of Lab.STRATEGIES){
  const run=Lab.play(R,Architect,example,{strategy,seed:12345,maxCandidates:4,maxTurns:5});
  assert.equal(run.seed,12345);
  assert.equal(run.strategy,strategy);
  assert(run.initialLegal>=3);
  assert(run.movesUsed>=1&&run.movesUsed<=5);
  assert(run.goalParts.length===2);
  assert(run.goalCompletion>=0&&run.goalCompletion<=1);
  assert(run.shuffles>=0&&Number.isInteger(run.shuffles));
  assert.equal(run.moveBudget,Journey.get(19).moves);
  assert.equal(run.zeroLegal,0);
  assert.equal(typeof run.won,"boolean");
  assert(run.firstProgressTurn===null||run.firstProgressTurn<=run.movesUsed);
  reports.push(run);
 }
 assert.equal(JSON.stringify(example),before);
 const replay=Lab.play(R,Architect,example,{strategy:"spatial",seed:12345,maxCandidates:4,maxTurns:5});
 assert.deepEqual(replay,reports.find(x=>x.strategy==="spatial"),"Full agent replay must be deterministic");
});
check("Paired seeds, percentile estimates and diagnostics are explicit",()=>{
 const r=Lab.analyze(R,Architect,example,{trials:2,baseSeed:777,
  strategies:["random","objective"],maxCandidates:4,maxTurns:4,directorMode:"v62"});
 assert.deepEqual(r.seeds,[777,8696]);
 assert.equal(r.runs.length,4);
 assert.deepEqual(r.strategies,["random","objective"]);
 assert.equal(r.byStrategy.random.attempts,2);
 assert.equal(r.byStrategy.objective.attempts,2);
 assert(r.runs.every(x=>x.seed===777||x.seed===8696));
 assert(r.caveat.includes("Does NOT prove reachability"));
 assert.equal(r.blueprintId,example.id);
 assert.equal(r.level,20);
 assert.equal(Lab.percentile([1,3,7,9],.5),5);
 assert.equal(Lab.percentile([],.5),null);
 const repeat=Lab.analyze(R,Architect,example,{trials:2,baseSeed:777,
  strategies:["random","objective"],maxCandidates:4,maxTurns:4,directorMode:"v62"});
 assert.deepEqual(r,repeat,"Report must be reproducible by blueprint and base seed");
});
check("No result is silently described as human win rate or reachability proof",()=>{
 const line=Lab.play(R,Architect,example,{seed:4,strategy:"random",maxTurns:2});
 assert(line.won===false||line.movesUsed<=2);
 assert.equal(line.limitedByTurnCap,!line.won&&line.movesUsed===2);
 const summary=Lab.summarize([line]);
 assert.equal(summary.attempts,1);
 assert(summary.diagnosticWinRate>=0&&summary.diagnosticWinRate<=1);
 assert.throws(()=>Lab.play(R,Architect,example,{strategy:"cheater"}),/agent/);
 assert.throws(()=>Lab.play(R,Architect,example,{maxCandidates:1}),/Candidate/);
 assert.throws(()=>Lab.analyze(R,Architect,example,{trials:0}),/Trials/);
 assert.throws(()=>Lab.analyze(R,Architect,example,{strategies:["random","random"]}),/unique/);
});
console.log("PASS Difficulty Lab 1.0 paired genuine moves and conservative reporting");
