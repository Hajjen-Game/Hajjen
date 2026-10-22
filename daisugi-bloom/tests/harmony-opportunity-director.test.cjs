"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const Lab=require("../harmony/diagnostics.js").create(R);
function check(name,fn){fn();console.log("PASS "+name);}
const signatures=board=>JSON.stringify(board.map(p=>[p.id,p.family,p.stage]));
check("The Opportunity Director remains disabled by default",()=>{
 const normal=new R.Game(5,null,{seed:20261022});
 const opted=new R.Game(5,null,{seed:20261022,opportunity:true});
 assert.equal(normal.opportunity,false);
 assert.equal(opted.opportunity,true);
 assert.deepEqual(opted.board,normal.board,"identical seeded starting boards");
 assert.deepEqual(opted.bag,normal.bag);
 assert.equal(opted.rolls,normal.rolls);
});
check("Evaluating current-board opportunities never modifies a piece",()=>{
 const g=new R.Game(5,null,{seed:83151}),before=signatures(g.board);
 const report=R.opportunityMetrics(g.board,g.config.goal);
 assert.equal(signatures(g.board),before);
 assert(report.legal>=3&&Number.isFinite(report.score));
 for(const prop of ["meaningful","goalReady","nearMasterpiece"])
  assert(Number.isInteger(report[prop])&&report[prop]>=0);
});
check("Director always selects existing bag entries, with no stage boosts",()=>{
 for(let level=0;level<10;level++)for(let seed=1;seed<=12;seed++){
  const g=new R.Game(level,null,{seed:20261022+level*100+seed,opportunity:true});
  const before=JSON.stringify(g.board);
  const snapshot=g.save();
  // Create holes without changing the remaining objects.
  for(let i=0;i<14;i++)g.board[i]=null;
  const surviving=g.board.filter(Boolean).map(p=>[p.id,p.family,p.stage]);
  const initialBag=g.bag.slice();
  g.refillOpportunity();
  assert.equal(g.board.length,49);
  assert(g.board.every(p=>p&&p.stage>=1&&p.stage<=5));
  const still=g.board.filter(p=>p.id<50).map(p=>[p.id,p.family,p.stage]);
  assert.deepEqual(still,surviving,"No surviving identity or stage may change");
  const generated=g.board.filter(p=>p.id>=50);
  assert.equal(generated.length,14);
  assert.equal(new Set(generated.map(p=>p.id)).size,14);
  for(const piece of generated)assert.equal(piece.stage,1);
  assert(g.directorSelections<=g.directorRefills);
  // Across one 20-piece bag cycle each family appears exactly four times.
  const base=g.families.flatMap(f=>Array(4).fill(f));
  for(const family of g.families){
   const consumed=generated.filter(p=>p.family===family).length;
   const remaining=g.bag.filter(x=>x===family).length;
   assert.equal(consumed+remaining,base.filter(x=>x===family).length);
  }
  assert.equal(g.board.length,49);
  assert.equal(snapshot.opportunity,true);
  assert.equal(typeof before,"string");
 }
});
check("Director never introduces free matches when the Standard candidate is match-free",()=>{
 for(let level=0;level<10;level++)for(let sample=0;sample<30;sample++){
  const seed=(Math.imul(level+1,0x7f4a7c15)+sample*33)>>>0;
  const g=new R.Game(level,null,{seed,opportunity:true});
  const initial=g.save();
  // Use identical partial board and RNG state to compute the Standard refill.
  const baseline=new R.Game(level,initial,{fastRestore:true});
  for(let i=0;i<7;i++){g.board[i]=null;baseline.board[i]=null;}
  // Manually consume precisely the Standard sequence.
  for(let i=0;i<7;i++){
   const family=baseline.nextFamily(baseline.board,i);
   baseline.board[i]={family,stage:1,id:baseline.nextId++};
  }
  const baselineFree=R.scan(baseline.board).length;
  g.refillOpportunity();
  if(baselineFree===0)assert.equal(R.scan(g.board).length,0);
  assert.equal(g.rolls,baseline.rolls,"Candidate forks must not consume the real game RNG");
  assert.deepEqual(g.bag.length,baseline.bag.length);
  assert.equal(g.nextId,baseline.nextId);
 }
});
check("Opt-in mode survives diagnostic fast snapshot replays",()=>{
 const g=new R.Game(5,null,{seed:67,opportunity:true});
 const moves=R.validSwaps(g.board);
 g.swap(...moves[0]);
 const copy=new R.Game(5,g.save(),{fastRestore:true});
 assert.equal(copy.opportunity,true);
 assert.deepEqual(copy.save(),g.save());
});
const reports=Lab.run({levels:[5,9],trials:2,seed:20261022,
 strategies:["random","goal"],modes:["standard","director"]});
check("Paired A/B uses identical seeded opening boards and has versioned JSON metadata",()=>{
 assert.equal(reports.version,"engine-lab-2");
 assert.equal(reports.gameVersion,"5.4.0");
 assert.deepEqual(reports.options.modes,["standard","director"]);
 assert.equal(reports.results.length,8);
 assert.equal(reports.runs.length,16);
 for(const level of [5,9])for(const strategy of ["random","goal"]){
  const runs=reports.runs.filter(r=>r.level===level&&r.strategy===strategy);
  assert.deepEqual(runs.filter(r=>r.mode==="standard").map(r=>r.seed),
   runs.filter(r=>r.mode==="director").map(r=>r.seed));
 }
});
check("Director metrics are finite, its candidate selection is bounded",()=>{
 for(const run of reports.runs){
  assert(Number.isFinite(run.avgMeaningful));
  assert(Number.isFinite(run.avgNearMasterpiece));
  assert(Number.isFinite(run.avgGoalReady));
  assert(run.directorSelections<=run.directorRefills);
  if(run.mode==="standard")assert.equal(run.directorRefills,0);
 }
});
check("Standard mode results are identical in single-mode and paired-mode runs",()=>{
 const only=Lab.run({levels:[5,9],trials:2,seed:20261022,
  strategies:["random","goal"],modes:["standard"]});
 assert.deepEqual(only.runs,reports.runs.filter(x=>x.mode==="standard"));
});
check("Developer-facing mode selection validates unknown values",()=>{
 assert.throws(()=>Lab.run({levels:[5],modes:["magic"]}),RangeError);
 assert.deepEqual(Lab.MODES,["standard","director"]);
});
console.log("PASS Harmony Opportunity Director 1.0 contracts");
