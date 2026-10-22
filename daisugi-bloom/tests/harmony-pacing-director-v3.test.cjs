"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const D=require("../harmony/diagnostics.js").create(R);
const check=(name,fn)=>{fn();console.log("PASS "+name);};
check("Pacing 3.0 inherits Opportunity 2.0's seeded board and remains switchable",()=>{
 for(const level of [0,10,29,49]){
  const seed=20261022+level;
  const standard=new R.Game(level,null,{seed});
  const v2=new R.Game(level,null,{seed,directorMode:"v2"});
  const v3=new R.Game(level,null,{seed,directorMode:"v3"});
  assert.deepEqual(v3.board,standard.board);
  assert.deepEqual(v3.board,v2.board);
  assert.equal(v3.directorMode,"v3");
  assert.equal(v3.opportunity,true);
 }
});
check("Timing and progress generate build, flow, recovery and relax without punishing a slow player",()=>{
 assert.equal(R.pacingPhase([],[],0),"build");
 assert.equal(R.pacingPhase([3900,4800,6500],[false,true,true],0),"flow");
 assert.equal(R.pacingPhase([3900,4800,6500],[false,true,true],0,true),"relax");
 assert.equal(R.pacingPhase([32000,40000,50000],[true,true,true],0),"build");
 assert.equal(R.pacingPhase([32000,40000,50000],[true,true,true],3),"recovery");
 assert.equal(R.pacingPhase([5000,5000,5000],[false,false,false],2),"build");
});
check("Phase modulation is mild, and never modifies a board",()=>{
 const g=new R.Game(12,null,{seed:91919,directorMode:"v3"});
 const saved=JSON.stringify(g.save()),m=R.opportunityMetricsV2(g.board,g.config.goal,3);
 const base=R.pacingOpportunityScore(m,"build");
 assert.equal(base,m.score);
 assert(R.pacingOpportunityScore(m,"flow")>=base);
 assert(R.pacingOpportunityScore(m,"recovery")>=base);
 assert(R.pacingOpportunityScore(m,"relax")>=base);
 assert.equal(JSON.stringify(g.save()),saved);
});
check("Valid moves record real intervals, invalid moves never create timing pressure",()=>{
 const g=new R.Game(12,null,{seed:651,directorMode:"v3"});
 const invalid=[0,1];
 if(!R.validSwaps(g.board).some(pair=>pair[0]===0&&pair[1]===1)){
  const before=JSON.stringify(g.save());
  assert.equal(g.swap(...invalid,{decisionMs:8000}).ok,false);
  assert.equal(JSON.stringify(g.save()),before);
 }
 const p=R.validSwaps(g.board)[0];
 assert(g.swap(...p,{decisionMs:4400}).ok);
 assert.deepEqual(g.paceTimes,[4400]);
 assert.equal(g.paceOutcomes.length,1);
 const saved=g.save(),restored=new R.Game(12,saved,{fastRestore:true});
 assert.deepEqual(restored.save(),saved);
 // One long inactive gap is ignored: it is not proof of stress.
 const next=R.validSwaps(g.board)[0];
 if(g.moves>0&&next)g.swap(...next,{decisionMs:120000});
 assert.deepEqual(g.paceTimes,[4400]);
});
check("Pacing 3.0 never creates stage boosts or changes the available bag",()=>{
 for(const level of [0,8,12,29])for(let trial=0;trial<8;trial++){
  const seed=1337+level*41+trial;
  const g=new R.Game(level,null,{seed,directorMode:"v3"});
  const baseline=new R.Game(level,g.save(),{fastRestore:true});
  g.pacePhase=["build","flow","recovery","relax"][trial%4];
  for(let i=0;i<9;i++){g.board[i]=null;baseline.board[i]=null;}
  const originals=g.board.filter(Boolean).map(p=>[p.id,p.family,p.stage]);
  for(let i=0;i<9;i++){
   const family=baseline.nextFamily(baseline.board,i);
   baseline.board[i]={family,stage:1,id:baseline.nextId++};
  }
  const baselineAuto=R.scan(baseline.board).length;
  g.refillOpportunity();
  assert.deepEqual(g.board.filter(p=>p.id<50).map(p=>[p.id,p.family,p.stage]),originals);
  assert(g.board.filter(p=>p.id>=50).every(p=>p.stage===1));
  assert.equal(g.rolls,baseline.rolls);
  assert.equal(g.nextId,baseline.nextId);
  assert.equal(g.bag.length,baseline.bag.length);
  if(!baselineAuto)assert.equal(R.scan(g.board).length,0);
 }
});
check("Four-way lab compares shared seeds and explicit synthetic tempos",()=>{
 const report=D.run({levels:[12],strategies:["random","goal"],trials:3,seed:4545,
  modes:["standard","director","director2","director3"]});
 assert.equal(report.version,"engine-lab-4");
 assert.equal(report.gameVersion,"6.3.0");
 assert.equal(report.runs.length,24);
 for(const bot of ["random","goal"]){
  const first=report.runs.filter(r=>r.strategy===bot&&r.mode==="standard").map(r=>r.seed);
  const pacing=report.runs.filter(r=>r.strategy===bot&&r.mode==="director3");
  assert.deepEqual(first,pacing.map(r=>r.seed));
  for(const run of pacing)assert(run.directorRefills>=run.directorSelections);
 }
});
console.log("PASS Harmony Pacing Director 3.0");
