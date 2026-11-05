"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const A=require("../harmony/puzzle-architect.js");
const O=require("../harmony/journey-authored-openings.js");
const H=require("../harmony/hanabi-crate.js");
const Save=require("../harmony/save-health.js");

const check=(name,fn)=>{fn();console.log("PASS "+name);};
const firstFirework=(seed=123)=>A.build(R,O.get(4),
 {seed,recordRound:true,directorMode:"v63"});
const deliver=g=>{
 assert(g.swap(32,33).ok,"The true first tutorial setup must remain legal");
 const r=g.swap(32,39);
 assert(r.ok&&r.events.some(e=>e.type==="hanabi-launch"),
  "The true second swap must deliver the firework");
 return r;
};
const event=(result,type)=>result.events.find(e=>e.type===type);

check("Only true upper-canopy neighbors qualify for three seeded spreading hits",()=>{
 assert.equal(H.VERSION,3);
 const full=Array.from({length:49},(_,i)=>({family:"sakura",stage:1,id:i+1}));
 full[0].stage=5;
 full[1]={family:"daruma",stage:0,id:-1};
 full[2]={family:"sealedStone",stage:0,id:-2};
 full[5]=null;
 full[12]={family:"lotusSeed",stage:0,id:-2000};
 const hits=H.spreadPositions(full,45,123);
 assert.equal(hits.length,3);
 assert.equal(new Set(hits).size,hits.length);
 for(const to of hits){
  assert(to>=0&&to<21);
  assert(to%7!==3);
  assert(Math.abs(to%7-3)<=2);
  assert(full[to]&&full[to].stage<5&&
   !["daruma","sealedStone","lotusSeed"].includes(full[to].family));
 }
 assert.deepEqual(H.spreadPositions(full,45,123),hits,"Identical seed must select identical cells");
 const choices=new Set(Array.from({length:30},(_,seed)=>
  H.spreadPositions(full,45,seed+1).join(",")));
 assert(choices.size>=6,"The burst needs actual positional variety");
});

check("Level 5 fills EVERY empty cell after delivery and BEFORE the vertical/side effects",()=>{
 const g=firstFirework(123),result=deliver(g);
 const types=result.events.map(x=>x.type);
 const delivery=types.indexOf("hanabi-delivery"),
  fill=types.indexOf("hanabi-prelaunch-fill"),
  launch=types.indexOf("hanabi-launch");
 assert(delivery>=0&&fill>delivery&&launch>fill,"Sequence must be delivery → refill → launch");
 const before=event(result,"hanabi-delivery"),stable=event(result,"hanabi-prelaunch-fill"),
  fire=event(result,"hanabi-launch");
 assert(before.board.some(p=>p===null),"The collected rocket must leave a true hole");
 assert(stable.board.every(Boolean),"ALL spaces must be filled before launch, including top row");
 assert.equal(stable.board[45].family,"hanabiCrate");
 assert(stable.board.every(p=>p!==null),"Crates, blockers and cargo may not be replaced by blank tiles");
 assert.equal(fire.board.filter(p=>p===null).length,0,
  "Firework must impact the refilled rather than half-empty board");
 assert.deepEqual(H.visiblePath(fire),H.path(45),
  "After refill the entire vertical ray is visibly populated");
 assert.equal(fire.targets.length+fire.darumaTargets.length+
  fire.stoneTargets.length+fire.visualOnlyTargets.length+
  fire.mistTargets.length,6);
 assert.equal(fire.spreadTargets.length,3);
 const touched=new Set(fire.targets.map(t=>t.to));
 for(const hit of fire.spreadTargets){
  assert.equal(hit.from,10,"Side sparks fan out from the top of the central column");
  assert(hit.to>=0&&hit.to<21&&Math.abs(hit.to%7-3)<=2&&hit.to%7!==3);
  assert(!touched.has(hit.to),"Never double-upgrade a tile in the primary ray");
  assert.equal(fire.board[hit.to].id,stable.board[hit.to].id,
   "A side hit must upgrade the existing, genuinely refilled piece");
  assert.equal(fire.board[hit.to].stage,stable.board[hit.to].stage+1,
   "The side hit must be a REAL game upgrade, not only a particle");
  touched.add(hit.to);
 }
 assert.equal(fire.scoreDelta,(fire.targets.length+fire.spreadTargets.length)*75);
 assert.equal(g.pulseHits>=fire.targets.length+3,true);
 assert.equal(g.lotusDelivered,1);
 assert.equal(g.complete,true);
 assert(Save.validRun({level:4,data:g.save()}));
 const trace=g.roundTrace.moves[1].events.map(e=>e.type);
 assert(trace.indexOf("hanabi-prelaunch-fill")<trace.indexOf("hanabi-launch"));
});

check("The burst is reproducible after saving and restoring the first real move",()=>{
 for(const seed of [123,20261105,521,92043]){
  const direct=firstFirework(seed);
  assert(direct.swap(32,33).ok);
  const copy=new R.Game(4,direct.save(),{fastRestore:true});
  const one=direct.swap(32,39),two=copy.swap(32,39);
  const l1=event(one,"hanabi-launch"),l2=event(two,"hanabi-launch");
  assert.deepEqual(l2.spreadTargets,l1.spreadTargets,"Save/resume must preserve targets");
  assert.deepEqual(l2.board,l1.board,"Save/resume must preserve target stages");
  assert.deepEqual(copy.board,direct.board);
  assert.equal(copy.score,direct.score);
  assert.equal(copy.pulseHits,direct.pulseHits);
  assert(Save.validRun({level:4,data:copy.save()}));
 }
});

check("A side-hit upgrade can create a real Masterpiece and Harmony Pulse",()=>{
 const g=firstFirework(123);
 assert(g.swap(32,33).ok);
 // Make every nonfixed upper treasure stage four, so any genuine side
 // choice becomes a stage-five masterpiece without scripting an outcome.
 for(let i=0;i<21;i++){
  const p=g.board[i];
  if(p&&p.stage>=1&&p.stage<=4)p.stage=4;
 }
 const r=g.swap(32,39),launch=event(r,"hanabi-launch");
 assert(r.ok&&launch?.spreadTargets?.length===3);
 assert(launch.spreadTargets.some(t=>t.stage===5));
 assert(r.events.some(e=>e.type==="hero"),"Side-grown Masterpieces emit Harmony Pulse");
 assert(r.events.some(e=>e.type==="harvest"),"Real five-stage pieces are harvested");
 assert(g.masterpieces>0);
});

check("Hanabi 1.0 replays retain the old vertical-only behavior",()=>{
 const g=new R.Game(60,null,{seed:18001,directorMode:"v62",hanabiVersion:1});
 const r=g.swap(37,44);
 assert(r.ok);
 assert.equal(r.events.some(e=>e.type==="hanabi-prelaunch-fill"),false);
 const launch=event(r,"hanabi-launch");
 assert(launch);
 assert.deepEqual(launch.spreadTargets,[]);
});

console.log("PASS Hanabi Firework Spread 2.0 · seeded spread, pre-launch refill, actual upgrades and replay");
