"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const Lab=require("../harmony/diagnostics.js").create(R);
const check=(name,fn)=>{fn();console.log("PASS "+name);};
check("2.0 remains opt-in, with identical seeded starting boards",()=>{
 for(const level of [0,5,9,10,29,49]){
  const seed=70123+level;
  const standard=new R.Game(level,null,{seed});
  const v1=new R.Game(level,null,{seed,opportunity:true});
  const v2=new R.Game(level,null,{seed,directorMode:"v2"});
  assert.deepEqual(standard.board,v2.board);
  assert.deepEqual(standard.bag,v2.bag);
  assert.equal(standard.rolls,v2.rolls);
  assert.equal(standard.opportunity,false);
  assert.equal(v1.directorMode,"v1");
  assert.equal(v2.opportunity,true);assert.equal(v2.directorMode,"v2");
 }
});
check("2.0 opportunity evaluation is pure and understands higher stages",()=>{
 const g=new R.Game(12,null,{seed:401});
 for(const j of [0,4,7,22])g.board[j].stage=3;
 const original=JSON.stringify(g.save());
 const report=R.opportunityMetricsV2(g.board,g.config.goal,3);
 assert.equal(JSON.stringify(g.save()),original);
 for(const key of ["score","legal","goodMoves","strongMoves","developed","nearReady","prospects"])
  assert(Number.isFinite(report[key]),"Bad metric "+key);
 assert(report.score>=0);
});
check("2.0 preserves all existing objects, creates only bag-drawn stage-one pieces",()=>{
 for(const level of [0,5,9,10,29,49])for(let trial=0;trial<8;trial++){
  const seed=20261022+level*100+trial;
  const a=new R.Game(level,null,{seed,directorMode:"v2"});
  const b=new R.Game(level,null,{seed,directorMode:"v2"});
  for(let j=0;j<10;j++){a.board[j]=null;b.board[j]=null;}
  const survivors=a.board.filter(Boolean).map(p=>[p.id,p.family,p.stage]);
  a.refillOpportunity();b.refillOpportunity();
  assert.deepEqual(a.save(),b.save(),"Refill must be reproducible");
  assert.deepEqual(a.board.filter(p=>p.id<50).map(p=>[p.id,p.family,p.stage]),survivors);
  const created=a.board.filter(p=>p.id>=50);
  assert.equal(created.length,10);assert(created.every(p=>p.stage===1));
  assert.equal(new Set(a.board.map(p=>p.id)).size,49);
  assert(a.directorSelections<=a.directorRefills);
  const bagSupply=a.families.flatMap(f=>Array(4).fill(f));
  for(const family of a.families){
   const remaining=a.bag.filter(x=>x===family).length;
   const used=created.filter(x=>x.family===family).length;
   assert.equal(used+remaining,bagSupply.filter(f=>f===family).length);
  }
 }
});
check("2.0 does not insert free cascades or disturb standard RNG/bag sequence",()=>{
 for(const level of [2,8,12,25])for(let trial=0;trial<12;trial++){
  const seed=82828+level*150+trial;
  const g=new R.Game(level,null,{seed,directorMode:"v2"});
  const baseline=new R.Game(level,g.save(),{fastRestore:true});
  // With equal snapshots, use a null-filled region to test a real refill.
  for(let i=0;i<7;i++){g.board[i]=null;baseline.board[i]=null;}
  for(let i=0;i<7;i++){
   const family=baseline.nextFamily(baseline.board,i);
   baseline.board[i]={family,stage:1,id:baseline.nextId++};
  }
  const preexisting=R.scan(baseline.board).length;
  g.refillOpportunity();
  if(!preexisting)assert.equal(R.scan(g.board).length,0);
  assert.equal(g.rolls,baseline.rolls);
  assert.equal(g.bag.length,baseline.bag.length);
  assert.equal(g.nextId,baseline.nextId);
 }
});
check("2.0 records no-progress drought and restores it without score cheating",()=>{
 const g=new R.Game(12,null,{seed:20261022,directorMode:"v2"});
 let checked=0;
 while(g.moves>0&&!g.complete&&checked<10){
  const pair=R.validSwaps(g.board)[0],before=[g.stage3,g.stage4,g.masterpieces,g.echoes,g.pulseHits];
  assert(g.swap(...pair).ok);
  const progressed=[g.stage3,g.stage4,g.masterpieces,g.echoes,g.pulseHits]
   .some((n,i)=>n>before[i]);
  if(progressed)assert.equal(g.directorDrought,0);
  else assert(g.directorDrought>0);
  const clone=new R.Game(g.level,g.save(),{fastRestore:true});
  assert.deepEqual(clone.save(),g.save());
  checked++;
 }
 assert(checked>=2);
});
check("3-way lab comparison shares seeds and exposes investment metrics",()=>{
 const report=Lab.run({levels:[3,12],trials:2,seed:20261022,
  strategies:["random","goal"],modes:["standard","director","director2"]});
 assert.equal(report.version,"engine-lab-4");
 assert.equal(report.gameVersion,"6.23.0");
 assert.equal(report.runs.length,24);assert.equal(report.results.length,12);
 for(const level of [3,12])for(const strategy of ["random","goal"]){
  const runs=report.runs.filter(x=>x.level===level&&x.strategy===strategy);
  const seeds=mode=>runs.filter(x=>x.mode===mode).map(x=>x.seed);
  assert.deepEqual(seeds("standard"),seeds("director"));
  assert.deepEqual(seeds("standard"),seeds("director2"));
 }
 for(const game of report.runs){
  assert(Number.isFinite(game.avgDeveloped)&&Number.isFinite(game.avgNearReady));
  assert(game.directorSelections<=game.directorRefills);
  if(game.mode==="standard")assert.equal(game.directorSelections,0);
 }
});
console.log("Opportunity Director 2.0: all safety and comparison checks passed");
