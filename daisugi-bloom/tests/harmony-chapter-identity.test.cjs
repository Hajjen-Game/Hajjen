"use strict";
// Chapter Gameplay Identity 1.0: two tactical chapters, no new match rules.
// All assertions run on the production HarmonyRules.Game (not a mock).
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const check=(title,fn)=>{fn();console.log("PASS "+title);};
const make=(i,seed=20261025)=>new R.Game(i,null,{seed,directorMode:"v3"});
const CH3=[
 {type:"daruma",cells:[24],moves:36},
 {type:"mist",cells:[],moves:42},
 {type:"daruma",cells:[17,31],moves:40},
 {type:"daruma",cells:[9,39],moves:42},
 {type:"fusion",cells:[],moves:36},
 {type:"daruma",cells:[16,32],moves:42},
 {type:"daruma",cells:[23,25],moves:42},
 {type:"mist",cells:[],moves:40},
 {type:"daruma",cells:[10,24,38],moves:46},
 {type:"mist",cells:[],moves:40}
];
const CH4=[
 [24],[17],[31],[17,31],[16],
 [9,39],[16,32],[23,24],[10,24,38],[16,24,32]
];
check("Chapter 3 has six curated two-hit Daruma puzzles, four different breathers",()=>{
 assert.equal(CH3.filter(d=>d.type==="daruma").length,6);
 assert.equal(CH3.filter(d=>d.type!=="daruma").length,4);
 for(let offset=0;offset<10;offset++){
  const level=20+offset,cfg=R.levelConfig(level),expected=CH3[offset];
  assert.equal(cfg.goal.type,expected.type,"Goal on "+(level+1));
  assert.equal(cfg.moves,expected.moves,"Move budget on "+(level+1));
  assert(cfg.name&&cfg.name!=="Harmony Mist"&&cfg.name!=="Harmony Fusion","Unique name on "+(level+1));
  assert(cfg.subtitle.length>=8&&cfg.intro.length>=35,"An intelligible challenge "+(level+1));
  const g=make(level);
  const targets=g.daruma.flatMap((v,i)=>v?[i]:[]);
  assert.deepEqual(targets,expected.cells,"Fixed positions on "+(level+1));
  assert.equal(g.darumaVersion,expected.cells.length?1:0);
  if(expected.cells.length){
   assert.equal(cfg.goal.count,expected.cells.length);
   assert(targets.every(i=>g.daruma[i]===2&&g.board[i].family==="daruma"));
  }
  assert.equal(R.scan(g.board).length,0);
  assert(R.validSwaps(g.board).length>=3,"At least three choices on "+(level+1));
 }
 const distinctNames=new Set(Array.from({length:10},(_,i)=>R.levelConfig(i+20).name));
 assert.equal(distinctNames.size,10);
});
check("Chapter 4 has ten intentional Sealed Stone formations, including an adjacent Awakening link",()=>{
 const names=new Set(),patterns=new Set();
 for(let offset=0;offset<10;offset++){
  const level=30+offset,expected=CH4[offset],cfg=R.levelConfig(level);
  assert.equal(cfg.goal.type,"sealedStone");
  assert.equal(cfg.goal.count,expected.length);
  assert.deepEqual(R.sealedPositions(level),expected,"Layout on "+(level+1));
  const fresh=make(level);
  assert.deepEqual(fresh.sealed.flatMap((hp,i)=>hp?[i]:[]),expected);
  assert(expected.every(at=>fresh.sealed[at]===4));
  assert.equal(fresh.board.filter(p=>p?.family==="sealedStone").length,expected.length);
  assert.equal(R.validSwaps(fresh.board).length>=3);
  assert(cfg.intro.includes("fyra träffar")&&cfg.intro.includes("Awakening Pulse"));
  assert(cfg.subtitle.length>=8&&cfg.name.length>=5);
  names.add(cfg.name);patterns.add(expected.join(","));
 }
 assert.equal(names.size,10,"Every stage has its own challenge title");
 assert.equal(patterns.size,10,"Every stage uses a distinct blockade");
 assert(R.neighbors8(23).includes(24),"Level 38 links two adjacent stones");
 assert.deepEqual(R.sealedPositions(39),[16,24,32],"Finale forms diagonal chain");
});
check("New level 28 and 30 fairness contracts are unchanged",()=>{
 assert.deepEqual(R.levelConfig(27).goal,{type:"mist",count:14});
 assert.deepEqual(R.levelConfig(29).goal,{type:"mist",count:15});
 assert.equal(R.levelConfig(27).moves,40);
 assert.equal(R.levelConfig(29).moves,40);
 assert.deepEqual(R.moveStarTargets(R.levelConfig(27)),{three:19,two:30});
 assert.deepEqual(R.moveStarTargets(R.levelConfig(29)),{three:23,two:32});
});
check("Pre-chapter-identity Daruma saves keep their original non-Daruma goals",()=>{
 for(const [level,goal] of [[23,"mist"],[26,"stage3"],[28,"pulseHits"]]){
  const fresh=make(level,3000+level),save=fresh.save();
  const originals=save.board.map(p=>({...p}));
  for(const at of R.darumaPositions?.(level)||fresh.daruma.flatMap((v,i)=>v?[i]:[])){
   originals[at]={family:fresh.families[0],stage:1,id:1000+at};
  }
  save.board=originals;
  delete save.daruma;delete save.darumaVersion;delete save.darumaCleared;
  save.moves=7;save.score=1234;
  const restored=new R.Game(level,save,{fastRestore:true});
  assert.equal(restored.config.goal.type,goal,"Historical goal on "+(level+1));
  assert.equal(restored.darumaVersion,0);
  assert.equal(restored.moves,7);
  assert.equal(restored.score,1234);
  assert.deepEqual(restored.board,originals);
  assert.equal(restored.board.some(p=>p.family==="daruma"),false);
  assert.deepEqual(new R.Game(level,restored.save(),{fastRestore:true}).save(),restored.save());
 }
});
check("Old completed and in-progress Stone saves keep their exact original cells",()=>{
 for(const [level,oldCells] of [[31,[24]],[32,[24]],[34,[24]],[35,[17,31]],[37,[17,31]]]){
  const game=make(level,1000+level),save=game.save();
  // Simulate a v6.40.0 board: old blocker locations, not the new prescription.
  for(const pos of CH4[level-30]){
   if(!oldCells.includes(pos)){
    save.board[pos]={family:game.families[0],stage:1,id:500+pos};
    save.sealed[pos]=0;
   }
  }
  for(const pos of oldCells){
   save.board[pos]={family:"sealedStone",stage:0,id:-(pos+100)};
   save.sealed[pos]=3;
  }
  save.moves=12;save.score=2200;
  const restored=new R.Game(level,save,{fastRestore:true});
  assert.equal(restored.moves,12);
  assert.equal(restored.score,2200);
  assert.deepEqual(restored.sealed.flatMap((v,i)=>v?[i]:[]),oldCells);
  assert.deepEqual(restored.board,save.board);
  assert.deepEqual(restored.save().sealed,save.sealed);
  assert.deepEqual(new R.Game(level,restored.save(),{fastRestore:true}).save(),restored.save());
 }
});
check("New and existing blockers stay fixed, cannot be swapped, and carry through saves",()=>{
 for(let level=20;level<40;level++){
  const g=make(level,level*234569);
  const blocker=g.board.flatMap((p,i)=>p?.family==="daruma"||p?.family==="sealedStone"?[i]:[]);
  for(const at of blocker){
   assert(R.validSwaps(g.board).every(([a,b])=>a!==at&&b!==at));
   const before=g.save(),out=g.swap(at,R.neighbors(at)[0]);
   assert.equal(out.ok,false);
   assert.deepEqual(g.save(),before,"Illegal swap must not cost a move");
  }
  const snap=g.save(),restored=new R.Game(level,snap,{fastRestore:true});
  assert.deepEqual(restored.save(),snap);
 }
});
console.log("Chapter Gameplay Identity 1.0 contracts passed.");
