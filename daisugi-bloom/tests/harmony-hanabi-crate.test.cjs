"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const L=require("../harmony/lotus-stream.js");
const H=require("../harmony/hanabi-crate.js");
const Save=require("../harmony/save-health.js");
function test(name,fn){fn();console.log("PASS "+name);}
const create=(seed=20261101)=>new R.Game(60,null,{seed,directorMode:"v62"});
test("Hanabi is a real versioned level-61 recipe with two crates on the bottom row",()=>{
 const game=create();
 assert.equal(game.config.name,"First Hanabi Crate");
 assert.equal(game.hanabiVersion,2);
 assert.equal(game.board[43].family,"hanabiCrate");
 assert.equal(game.board[47].family,"hanabiCrate");
 assert.deepEqual(game.lotus.exits,[43,47]);
 assert.deepEqual(H.path(43),[36,29,22,15,8,1]);
 assert.deepEqual(H.path(47),[40,33,26,19,12,5]);
 assert.equal(game.config.goal.type,"lotus");
 assert(Save.validRun({level:60,data:game.save()}));
});
test("telegraph skips empty top cells and only tracks actual launch targets",()=>{
 const emptyTop=H.visiblePath({at:43,
  targets:[{to:36,stage:3},{to:22,stage:5}],
  mistTargets:[{to:15,empty:true}], // clearing Mist is a genuine hit
  visualOnlyTargets:[{to:29,empty:true},{to:8,empty:true},{to:1,empty:true}]
 });
 assert.deepEqual(emptyTop,[36,22,15]);
 const single=H.visiblePath({at:47,
  visualOnlyTargets:[{to:40,empty:false},{to:33,empty:true},
   {to:26,empty:true},{to:19,empty:true},{to:12,empty:true},{to:5,empty:true}]
 });
 assert.deepEqual(single,[40],"No imaginary hits on five empty cells above");
 assert.deepEqual(H.visiblePath({at:43,
  visualOnlyTargets:H.path(43).map(to=>({to,empty:true}))}),[]);
});
test("first legal collection launches exactly one full-column Pulse",()=>{
 const g=create(20261101);
 const before=g.board.map(p=>({...p}));
 const result=g.swap(37,44);
 assert.equal(result.ok,true);
 const delivery=result.events.find(e=>e.type==="hanabi-delivery");
 const launch=result.events.find(e=>e.type==="hanabi-launch");
 assert(delivery&&launch);
 assert.deepEqual(delivery.delivered[0],{at:43,from:36,id:-(2000+29)});
 assert.equal(g.board[43].family,"hanabiCrate");
 assert.equal(launch.at,43);
 assert.equal(launch.column,1);
 const affected=[...launch.targets,...launch.mistTargets,...launch.darumaTargets,
  ...launch.stoneTargets,...launch.visualOnlyTargets].map(t=>t.to).sort((a,b)=>a-b);
 assert.deepEqual(affected,[1,8,15,22,29,36]);
 assert(launch.targets.length>=1);
 assert.equal(g.lotusDelivered,1);
 assert.equal(g.progress(),1);
 assert(Save.validRun({level:60,data:g.save()}));
 assert.notDeepEqual(g.board,before);
 const report=g.roundTrace.moves[0].events.find(e=>e.type==="hanabi-launch");
 assert(report&&report.column===1&&report.at===43);
});
test("Hanabi-created Masterpiece holes settle by the same gravity as Fusion before refill",()=>{
 const g=create(20261101);
 // The first legitimate descent moves this stage-four object down within
 // its column; do not assume its original cell is its Hanabi impact cell.
 g.board[22].stage=4;
 const originalId=g.board[22].id;
 const result=g.swap(37,44);
 assert(result.ok);
 const events=result.events;
 const launchIndex=events.findIndex(e=>e.type==="hanabi-launch"&&
  e.targets.some(t=>t.stage===5));
 assert(launchIndex>=0,"Stage four must be promoted by the actual Hanabi ray");
 const launch=events[launchIndex];
 const upgraded=launch.targets.find(t=>t.stage===5);
 assert.equal(launch.board[upgraded.to]?.id,originalId);
 const harvestIndex=events.findIndex((e,i)=>i>launchIndex&&
  e.type==="harvest"&&e.positions.includes(upgraded.to));
 assert(harvestIndex>launchIndex,"Hanabi must harvest its newly formed Masterpiece");
 const harvested=events[harvestIndex];
 assert.equal(harvested.board[upgraded.to],null);
 // Two holes may open at once: the delivered cargo square AND the
 // harvested Masterpiece. All existing identities must preserve their order
 // while compressing down from the bottom of the non-fixed column.
 const positions=H.path(43),originals=positions
  .map(i=>harvested.board[i]?.id).filter(Number.isInteger);
 assert(originals.length>=2,"Test needs at least two original treasures above the holes");
 const fallIndex=events.findIndex((e,i)=>i>harvestIndex&&e.type==="fall");
 assert(fallIndex>harvestIndex,"A genuine fall event must follow Hanabi harvest");
 const fallen=events[fallIndex].board;
 assert.deepEqual(positions.slice(0,originals.length).map(i=>fallen[i]?.id),originals,
  "Every original object must move down in order through both Hanabi-created holes, not be replaced by a refill");
 assert(originals.some((id,j)=>harvested.board[positions[j]]?.id!==id),
  "The test must exercise a real downward shift of original IDs");
 assert(g.board.every(Boolean),"Refill still fills all non-blocked squares");
 assert(g.roundTrace.moves[0].events.some(e=>e.type==="fall"));
});
test("two authentic player swaps collect both fireworks and can finish",()=>{
 const g=create(27631);
 const a=g.swap(37,44);
 assert(a.ok&&a.events.some(e=>e.type==="hanabi-launch"));
 const saved=g.save(),restored=new R.Game(60,saved,{fastRestore:true});
 assert.equal(restored.hanabiVersion,2);
 assert.deepEqual(restored.board,g.board);
 const b=restored.swap(41,48);
 assert(b.ok&&b.events.some(e=>e.type==="hanabi-launch"));
 assert.equal(restored.lotusDelivered,2);
 assert.equal(restored.complete,true);
 assert(!restored.board.some(L.isSeed));
});
test("old Hanabi 1.0 saved run retains overlapping target squares and its pulse",()=>{
 const v1=new R.Game(60,null,{seed:18001,directorMode:"v62",hanabiVersion:1});
 assert.equal(v1.hanabiVersion,1);
 assert.equal(v1.board[43].family!=="hanabiCrate",true);
 const restored=new R.Game(60,v1.save(),{fastRestore:true});
 assert.equal(restored.hanabiVersion,1);
 assert.equal(restored.board[36].family,"lotusSeed");
 assert.equal(restored.config.intro.includes("Match treasures below each firework"),true);
 const result=restored.swap(37,44);
 assert.equal(result.ok,true);
 assert(result.events.some(e=>e.type==="hanabi-delivery"));
 assert(result.events.some(e=>e.type==="hanabi-launch"));
 assert.equal(restored.board[43]?.family==="hanabiCrate",false);
 assert(Save.validRun({level:60,data:restored.save()}));
});
test("old unfinished Lotus round does not acquire fireworks or new line pulses",()=>{
 const g=new R.Game(60,null,{seed:33991,directorMode:"v62",hanabiVersion:1});
 const old=g.save();delete old.hanabiVersion;
 const r=new R.Game(60,old,{fastRestore:true});
 assert.equal(r.hanabiVersion,0);
 assert.equal(r.config.name,"First Lotus Stream");
 const e=r.swap(37,44);
 assert(e.ok&&e.events.some(x=>x.type==="lotus-delivery"));
 assert(!e.events.some(x=>x.type==="hanabi-launch"));
 assert(Save.validRun({level:60,data:r.save()}));
});
test("Hanabi launch never invents free matches when no cargo was delivered",()=>{
 const g=create();
 const rejected=g.swap(29,30);
 assert.equal(rejected.ok,false);
 assert.equal(g.roundTrace.moves.length,0);
 assert.equal(g.progress(),0);
 assert(!g.save().roundTrace.moves.some(m=>m.events.some(e=>e.type==="hanabi-launch")));
});
console.log("Hanabi Crate 1.1 dedicated board and delivery contracts passed");
