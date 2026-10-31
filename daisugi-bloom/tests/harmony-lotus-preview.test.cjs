"use strict";
/* Lotus Stream — Early Playable Preview 1.0. Five real engine scenarios:
 * one production pilot (L61) and four diagnostic routing experiments. */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const L=require("../harmony/lotus-stream.js");
const LR=require("../harmony/lotus-routing.js");
const B=require("../harmony/board-mechanics.js");
const I=require("../harmony/player-insight.js");
const check=(label,fn)=>{fn();console.log("PASS "+label);};
const scenarios=["pilot",...Object.keys(LR.prototypes)];
const make=(key,seed=20261101)=>new R.Game(60,null,{seed,directorMode:"v4",lotusPreview:key});
const first=g=>R.validSwaps(g.board)[0];
check("one authentic L61 pilot and four explicitly experimental route choices",()=>{
 assert.deepEqual(scenarios,["pilot","long-drop","three-lanes","shared-gate","garden-route"]);
 const live=new R.Game(60,null,{seed:20261101,directorMode:"v4"});
 const p=make("pilot");
 assert.equal(p.config.name,"First Lotus Stream");
 assert.deepEqual(p.config.goal,live.config.goal);
 assert.equal(p.config.moves,live.config.moves);
 assert.deepEqual(p.boardMechanics,live.boardMechanics);
 assert.deepEqual(p.board,live.board);
 assert.equal(p.lotusPreview,"pilot");
 assert.equal(live.lotusPreview,null);
 for(const key of scenarios.slice(1)){
  const g=make(key),recipe=LR.get(key);
  assert.equal(g.config.name,recipe.name);
  assert.deepEqual(g.config.goal,{type:"lotus",count:recipe.lotus.starts.length});
  assert.deepEqual(g.boardMechanics,recipe.boardMechanics);
  assert.deepEqual(g.lotus,recipe.lotus);
  assert.equal(g.lotusPrototype,key);
 }
});
check("preview cannot be put on random levels or combined with Wind, Bamboo, Mirrors",()=>{
 for(const level of [0,2,50,59,61,80])
  assert.throws(()=>new R.Game(level,null,{lotusPreview:"pilot",seed:1}),/Lotus Stream preview/);
 for(const key of ["unknown","stage6",0,{}])
  if(key!==0)assert.throws(()=>new R.Game(60,null,{lotusPreview:key,seed:1}),/Lotus Stream preview/);
 for(const bad of [{moonMirrorPreview:"echo"},{windGardenPreview:"breeze"},{bambooPreview:true}])
  assert.throws(()=>new R.Game(60,null,{lotusPreview:"pilot",seed:1,...bad}),/Lotus Stream preview/);
});
check("all seed objects occupy their route starts and every gate matches a lane",()=>{
 for(const key of scenarios){
  const g=make(key),starts=g.board.map((p,i)=>L.isSeed(p)?i:null).filter(x=>x!==null);
  assert.deepEqual(starts,g.lotus.starts.slice().sort((a,b)=>a-b));
  for(const start of starts){
   const seed=g.board[start];
   assert.equal(seed.stage,0);
   assert(seed.id<0);
   assert(g.lotus.exits.some(gate=>gate%7===start%7));
   assert(!R.validSwaps(g.board).some(([a,b])=>a===start||b===start));
  }
  assert.equal(R.scan(g.board).length,0);
  assert(R.validSwaps(g.board).length>=3);
 }
});
check("real swaps preserve seed identity or deliver at the correct river exit",()=>{
 for(const key of scenarios){
  const g=make(key),before=new Set(g.board.filter(L.isSeed).map(p=>p.id));
  const pair=first(g),move=g.swap(...pair);
  assert.equal(move.ok,true);
  assert.equal(g.moves,g.config.moves-1);
  assert.equal(R.scan(g.board).length,0);
  const surviving=g.board.filter(L.isSeed);
  assert.equal(surviving.length+g.lotusDelivered,before.size);
  for(const piece of surviving)assert(before.has(piece.id));
  for(const at of g.boardMechanics.blocked)assert.deepEqual(g.board[at],B.terrainPiece(at));
 }
});
check("experimental routes keep their collection contracts when restored",()=>{
 for(const key of scenarios){
  const g=make(key),result=g.swap(...first(g));
  assert.equal(result.ok,true);
  const restored=new R.Game(60,JSON.parse(JSON.stringify(g.save())),{fastRestore:true});
  assert.equal(restored.lotusPreview,key);
  assert.equal(restored.lotusPrototype,key==="pilot"?null:key);
  assert.deepEqual(restored.lotus,g.lotus);
  assert.deepEqual(restored.config.goal,g.config.goal);
  assert.deepEqual(restored.boardMechanics,g.boardMechanics);
  assert.deepEqual(restored.board,g.board);
  const pair=first(g);
  assert.equal(g.swap(...pair).ok,true);
  assert.equal(restored.swap(...pair).ok,true);
  const a=g.save(),b=restored.save();
  delete a.roundTrace;delete b.roundTrace;
  assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),
   "Saved game engine diverged for "+key);
 }
});
check("pilot preview and genuine level 61 behave identically, event by event",()=>{
 const pilot=make("pilot");
 const live=new R.Game(60,null,{seed:20261101,directorMode:"v4"});
 for(let turn=0;turn<4&&!pilot.complete&&!pilot.failed;turn++){
  const pair=first(pilot);
  const a=pilot.swap(...pair),b=live.swap(...pair);
  assert.equal(a.ok,true);assert.equal(b.ok,true);
  assert.deepEqual(a.events,b.events);
  assert.deepEqual(pilot.board,live.board);
  assert.equal(pilot.lotusDelivered,live.lotusDelivered);
 }
});
check("preview JSON clearly marks the experiment as unranked",()=>{
 for(const key of scenarios){
  const g=make(key);g.swap(...first(g));
  const report=I.last(g,g.roundTrace,null,null);
  assert.equal(report.preview,key);
  assert.equal(report.previewType,"lotus-stream");
  assert.equal(report.result.unranked,true);
  assert.equal(report.result.stars,0);
  assert.equal(report.goal.type,"lotus");
  assert.equal(report.level,61);
 }
});
check("fifteen reproducible seeds per scenario start and settle fairly",()=>{
 for(const key of scenarios)for(let n=1;n<=15;n++){
  const seed=n*1103+key.length*3;
  const g=make(key,seed);
  assert(R.validSwaps(g.board).length>=3,key+" seed "+seed);
  assert.equal(R.scan(g.board).length,0);
  const e=g.swap(...first(g));
  assert.equal(e.ok,true);
  assert.equal(g.board.length,49);
  assert.equal(R.scan(g.board).length,0);
  for(const at of g.boardMechanics.blocked)
   assert.deepEqual(g.board[at],B.terrainPiece(at));
 }
});
check("unrelated progression and other opt-in preview mechanisms are unaffected",()=>{
 for(const level of [0,2,10,20,30,40,50,59,61]){
  const g=new R.Game(level,null,{seed:20261101,directorMode:"v4"});
  assert.equal(g.lotusPreview,null);
  assert.deepEqual(g.config.goal,R.levelConfig(level).goal);
 }
 for(const opt of [{windGardenPreview:"breeze"},{moonMirrorPreview:"spark"}]){
  const g=new R.Game(2,null,{seed:13,directorMode:"v4",...opt});
  assert.equal(g.lotusPreview,null);
  assert.equal(g.swap(17,24).ok,true);
 }
 const b=new R.Game(50,null,{seed:20261101,bambooPreview:true,directorMode:"v4"});
 assert.equal(b.lotusPreview,null);
});
console.log("Lotus Stream Early Preview 1.0 real-engine checks all passed");
