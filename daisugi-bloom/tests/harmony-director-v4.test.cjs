"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const D=require("../harmony/diagnostics.js").create(R);
const check=(name,fn)=>{fn();console.log("PASS "+name);};
function blockerFixture(game,position,family){
 const pool=game.families,a=pool[0],b=pool[1];
 const board=Array.from({length:49},(_,i)=>({
  id:i+1,stage:1,family:pool[(Math.floor(i/7)*2+(i%7)*3)%pool.length]
 }));
 // Vertical pair + adjacent source at index 22. The swap 22 -> 23
 // creates a fusion at 23, one cell away from the stationary blocker at 24.
 for(const i of [9,16,22])board[i].family=a;
 board[23].family=b;
 board[position]={id:-(position+100),family,stage:0};
 return board;
}
check("Director 4.0 has bounded, legal recovery proposal counts",()=>{
 assert.equal(R.pacingProposalCount(8,4,"v4",4),4);
 assert.equal(R.pacingProposalCount(9,0,"v4",0),5);
 assert.equal(R.pacingProposalCount(9,0,"v4",3),6);
 assert.equal(R.pacingProposalCount(15,0,"v4",4),5);
 assert.equal(R.pacingProposalCount(29,1,"v4",0),4);
 assert.equal(R.pacingProposalCount(29,3,"v4",3),5);
 assert.equal(R.pacingProposalCount(10,0,"v3"),5);
});
check("Director 4.0 recognizes first-wave fusion hits on stationary obstacles",()=>{
 for(const [level,family] of [[20,"daruma"],[30,"sealedStone"]]){
  const g=new R.Game(level,null,{seed:20261025,directorMode:"v4"});
  const board=blockerFixture(g,24,family);
  assert.equal(R.scan(board).length,0,"Fixture must not begin with free matches");
  assert(R.validSwaps(board).some(([a,b])=>a===22&&b===23));
  const mask=Array(49).fill(0);mask[24]=family==="daruma"?2:4;
  const json=JSON.stringify(board);
  const metric=R.blockerObjectiveMetrics(board,{type:family==="daruma"?"daruma":"sealedStone",count:1},mask);
  assert.equal(JSON.stringify(board),json,"Director evaluation must never mutate pieces");
  assert(metric.direct>=1&&metric.directChoices>=1&&metric.bestHits>=1);
  assert(metric.score>0&&metric.score<=7.2);
  assert.equal(R.blockerObjectiveMetrics(board,{type:"mist"},mask).score,0);
  assert.equal(R.blockerObjectiveMetrics(board,{type:g.config.goal.type,count:1},Array(49).fill(0)).score,0);
 }
});
check("A Daruma eye or Stone chip resets 4.0 objective drought before completion",()=>{
 for(const [level,family] of [[20,"daruma"],[30,"sealedStone"]]){
  const g=new R.Game(level,null,{seed:20261025,directorMode:"v4"});
  g.board=blockerFixture(g,24,family);g.objectiveDrought=4;
  const oldGoal=g.progress();
  const oldHits=family==="daruma"?g.daruma[24]:g.sealed[24];
  assert(g.swap(22,23,{decisionMs:5000}).ok);
  assert.equal(g.progress(),oldGoal,"One hit must not immediately destroy the blocker");
  assert.equal(family==="daruma"?g.daruma[24]:g.sealed[24],oldHits-1);
  assert.equal(g.objectiveDrought,0,"Partial progress should end artificial recovery pressure");
 }
});
check("4.0 refills conserve bag, stages, obstacles and deterministic snapshots",()=>{
 for(const level of [9,10,20,30,39]){
  const seed=10500+level;
  const a=new R.Game(level,null,{seed,directorMode:"v4"});
  const old=new R.Game(level,null,{seed,directorMode:"v311"});
  assert.deepEqual(a.board,old.board,"Initial board must remain independent of Director");
  a.directorDrought=4;a.objectiveDrought=4;a.pacePhase="recovery";
  for(const i of [0,1,2,3,4,5,6])a.board[i]=null;
  const snapshot=a.save(),b=new R.Game(level,snapshot,{fastRestore:true});
  const standard=new R.Game(level,snapshot,{fastRestore:true});
  for(let i=0;i<7;i++){
   standard.board[i]={family:standard.nextFamily(standard.board,i),stage:1,id:standard.nextId++};
  }
  const naturalMatches=R.scan(standard.board).length;
  assert.equal(b.directorMode,"v4");
  const untouched=a.board.filter(Boolean).map(p=>[p.id,p.family,p.stage]);
  a.refillOpportunity();b.refillOpportunity();
  assert.deepEqual(a.save(),b.save(),"Same snapshot and seed must produce the same refill");
  assert.deepEqual(a.board.filter(p=>p.id<50).map(p=>[p.id,p.family,p.stage]),untouched);
  assert(a.board.filter(p=>p.id>=50).every(p=>p.stage===1),"Refill only produces stage 1");
  assert(a.directorSelections<=a.directorRefills);
  assert.equal(a.bag.length,b.bag.length);
  if(!naturalMatches)assert.equal(R.scan(a.board).length,0,
   "Director cannot introduce a free cascade if the Standard refill had none");
 }
});
check("Engine Lab compares 4.0 to the prior engine on shared seeds",()=>{
 const report=D.run({levels:[30],strategies:["random"],trials:1,seed:44,
  modes:["director311","director4"]});
 assert.deepEqual(report.options.modes,["director311","director4"]);
 assert.equal(report.runs.length,2);
 assert.equal(report.runs[0].seed,report.runs[1].seed);
 assert(report.runs[1].directorSelections<=report.runs[1].directorRefills);
});
console.log("PASS Harmony Director 4.0");
