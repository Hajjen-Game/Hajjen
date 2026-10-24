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
check("Early Journey 3.0 tries up to six fair refills without changing the bag",()=>{
 for(const level of [10,12,14,15,19,20]){
  const draft=new R.Game(level,null,{seed:20261023,directorMode:"v3"});
  draft.directorDrought=4;draft.pacePhase="recovery";
  for(let i=0;i<9;i++)draft.board[i]=null;
  const snapshot=draft.save();
  const a=new R.Game(level,snapshot,{fastRestore:true});
  const b=new R.Game(level,snapshot,{fastRestore:true});
  const before=a.board.filter(Boolean).map(x=>({id:x.id,family:x.family,stage:x.stage}));
  a.refillOpportunity();b.refillOpportunity();
  assert.deepEqual(a.save(),b.save(),"Director must be fully seeded and reproducible");
  assert.deepEqual(a.board.filter(p=>p.id<50),before);
  assert.equal(a.board.filter(p=>p.id>=50).length,9);
  assert(a.board.every(p=>p.stage>=1));
  assert.equal(R.pacingProposalCount(level,4,"v3"),level<15?6:level<20?5:4);
 }
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
 assert.equal(report.gameVersion,"6.22.0");
 assert.equal(report.runs.length,24);
 for(const bot of ["random","goal"]){
  const first=report.runs.filter(r=>r.strategy===bot&&r.mode==="standard").map(r=>r.seed);
  const pacing=report.runs.filter(r=>r.strategy===bot&&r.mode==="director3");
  assert.deepEqual(first,pacing.map(r=>r.seed));
  for(const run of pacing)assert(run.directorRefills>=run.directorSelections);
 }
});
check("Director 3.1 evaluates actual Mist fusion landing and first Pulse ring in both directions",()=>{
 const families=R.activeFamilies(10);
 const board=Array.from({length:49},(_,i)=>({
  id:i+1,stage:1,family:families[(Math.floor(i/7)+i%7)%families.length]
 }));
 for(const i of [17,23,25])board[i].family="sakura";
 board[23].stage=4;board[24].family="origami";
 assert.equal(R.scan(board).length,0);
 assert(R.validSwaps(board).some(([a,b])=>a===17&&b===24));
 const mist=Array(49).fill(0);
 for(const i of [17,24,31])mist[i]=1;
 const copy=JSON.stringify(board);
 const base=R.objectiveAwarenessMetrics(board,{type:"mist",count:3},Array(49).fill(0));
 const aware=R.objectiveAwarenessMetrics(board,{type:"mist",count:3},mist);
 assert.equal(JSON.stringify(board),copy,"Pure metric may never mutate the board");
 assert(aware.bestImmediate>=3,"Destination plus both occupied Pulse hits are reachable");
 assert(aware.directChoices>=1&&aware.score>base.score);
 assert(aware.score<=6.5,"Objective signal is bounded and cannot override every pacing comparison");
});
check("Director 3.1 understands objective families and stage-driven missions",()=>{
 const g=new R.Game(10,null,{seed:20261024,directorMode:"v31"});
 const original=JSON.stringify(g.board);
 for(const type of ["fusion","stage3","stage4","masterpiece","pulseHits","four","shape","chain","familyMasterpiece","score","mist"]){
  const m=R.objectiveAwarenessMetrics(g.board,
   type==="familyMasterpiece"?{type,family:"sakura"}:{type,count:3},g.mist);
  for(const v of ["legal","bestImmediate","directChoices","nearChoices","score"])
   assert(Number.isFinite(m[v])&&m[v]>=0,"Unbounded "+type+" "+v);
  assert(m.score<=6.5);
 }
 assert.equal(JSON.stringify(g.board),original,"All goal analyses must be read-only");
});
check("Director 3.1 retains ordinary bag fairness, seeded reproducibility and safe resume",()=>{
 for(const level of [0,10,11,13])for(const seed of [121,122]){
  const first=new R.Game(level,null,{seed,directorMode:"v31"});
  const v3=new R.Game(level,null,{seed,directorMode:"v3"});
  assert.deepEqual(first.board,v3.board,"New mode never changes initial board");
  first.objectiveDrought=3;
  const saved=first.save(),same=new R.Game(level,saved,{fastRestore:true});
  assert.equal(same.directorMode,"v31");
  assert.equal(same.objectiveDrought,3);
  for(let i=0;i<8;i++){first.board[i]=null;same.board[i]=null;}
  const preserved=first.board.filter(Boolean).map(p=>[p.id,p.family,p.stage]);
  first.refillOpportunity();same.refillOpportunity();
  assert.deepEqual(first.save(),same.save(),"3.1 refills must be reproducible");
  assert.deepEqual(first.board.filter(p=>p.id<50).map(p=>[p.id,p.family,p.stage]),preserved);
  assert(first.board.filter(p=>p.id>=50).every(p=>p.stage===1),
   "Objective Awareness cannot spawn pre-evolved objects");
  assert(first.directorSelections<=first.directorRefills);
  assert.deepEqual(first.bag,same.bag);
 }
});
check("Director 3.1 and 3.0 share seeds in the separate Engine Lab A/B",()=>{
 const report=D.run({levels:[10,12],strategies:["random","goal"],trials:2,seed:20261024,
  modes:["director3","director31"]});
 assert.equal(report.runs.length,16);
 assert.deepEqual(report.options.modes,["director3","director31"]);
 assert.equal(report.gameVersion,"6.22.0");
 for(const strategy of ["random","goal"])for(const level of [10,12]){
  const select=mode=>report.runs.filter(x=>x.mode===mode&&x.level===level&&x.strategy===strategy);
  assert.deepEqual(select("director3").map(x=>x.seed),select("director31").map(x=>x.seed));
  assert(select("director31").every(x=>x.directorSelections<=x.directorRefills));
 }
 assert(report.results.some(x=>x.mode==="director31"&&x.samples===2));
});
console.log("PASS Harmony Pacing Director 3.0");
