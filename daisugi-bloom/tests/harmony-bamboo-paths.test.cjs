"use strict";
/* Bamboo Paths 1.0: authored chapter, terrain, star pacing and migration. */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js");
const B=require("../harmony/board-mechanics.js");
const C=require("../harmony/bamboo-paths.js");
const G=require("../harmony/goshuincho.js");
const O=require("../harmony/onboarding.js");
const T=require("../harmony/tutorial-help.js");
const H=require("../harmony/save-health.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
check("Exactly ten authored Bamboo Paths goals replace generated levels 51–60",()=>{
 assert.equal(C.CHAPTER.length,10);
 assert.equal(new Set(C.CHAPTER.map(x=>x.name)).size,10);
 for(let level=50;level<60;level++){
  const cfg=R.levelConfig(level),def=C.get(level),g=new R.Game(level,null,{seed:6001+level});
  assert.equal(cfg.name,def.name);
  assert.deepEqual(cfg.goal,def.goal);
  assert.deepEqual(g.config.goal,def.goal);
  assert.equal(cfg.chapter,6);
  assert.equal(g.bambooVersion,1);
  assert.deepEqual(g.boardMechanics,B.normalize(def.boardMechanics));
  assert(cfg.moves>cfg.starPar+2);
  const {three,two}=R.moveStarTargets(cfg);
  assert(three<two&&two<cfg.moves);
  assert(g.board.length===49);
  assert.equal(R.scan(g.board).length,0);
  assert(R.validSwaps(g.board).length>=3);
  assert(H.validRun({level,data:g.save()}));
 }
 assert.equal(C.get(49),null);
 assert.equal(C.get(60),null);
 assert.equal(R.levelConfig(60).name.startsWith("Endless · "),true);
});
check("The 51–60 learning curve introduces each board shape in the promised order",()=>{
 const b=i=>R.levelConfig(i).boardMechanics;
 assert.deepEqual(b(50).blocked,[23,25]);
 assert.deepEqual(b(51).blocked,[16,18,30,32]);
 assert.equal(b(52).layout,"templeGate");
 assert.equal(b(53).layout,"templeGate");
 assert.equal(b(54).layout,"twinGardens");
 assert.equal(b(55).layout,"twinGardens");
 assert.equal(B.normalize(b(56)).blocked.length,0,"Level 57 offers an open relief board");
 assert.equal(b(57).layout,"centralShrine");
 assert.equal(b(58).layout,"centralShrine");
 assert.equal(b(59).layout,"centralShrine");
 assert.deepEqual(b(59).mist,[9,13,35]);
 assert.deepEqual(R.levelConfig(59).goal,{type:"mist",count:3});
 assert.equal(G.chapter(5).title,"Bamboo Paths");
 assert.equal(G.chapter(6).title,"Endless Garden · 1");
});
check("One-time illustrated lessons explain each change of geometry",()=>{
 for(const [index,key] of [[50,"bamboo-intro"],[52,"temple-gate"],
  [54,"twin-gardens"],[57,"central-shrine"],[59,"bamboo-finale"]]){
  const lesson=O.lesson(index);
  assert.equal(lesson.key,key);
  assert(T.EXAMPLES[key]&&T.EXAMPLES[key].length>0);
  assert(lesson.short.length>10&&lesson.detail.length>60);
 }
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 assert(html.includes("bamboo-paths.js?v="));
 assert(html.indexOf("bamboo-paths.js?v=")<html.indexOf("rules.js?v="));
 assert(app.includes("Enter Bamboo Paths →"));
 assert(app.includes("Bamboo Paths complete"));
});
check("Seeded mobile Director 4 starts and fair shuffles preserve every closed cell",()=>{
 for(let level=50;level<60;level++){
  for(let seed=1;seed<=25;seed++){
   const g=new R.Game(level,null,{seed:level*1193+seed*831,directorMode:"v4"});
   assert(R.validSwaps(g.board).length>=3,
    "level "+(level+1)+" seed "+seed+" must start with three legal swaps");
   const blocked=g.boardMechanics.blocked;
   for(const at of blocked)assert.deepEqual(g.board[at],B.terrainPiece(at));
   const pair=R.validSwaps(g.board)[seed%R.validSwaps(g.board).length];
   assert(g.swap(...pair).ok);
   for(const at of blocked)assert.deepEqual(g.board[at],B.terrainPiece(at));
   assert(H.validRun({level,data:g.save()}));
  }
 }
});
check("Full-game hint trials and a resumed Bamboo round are deterministic",()=>{
 for(const level of [50,52,54,56,57,59]){
  const g=new R.Game(level,null,{seed:12031+level,directorMode:"v4"});
  for(let i=0;i<3&&!g.complete&&!g.failed;i++){
   const before=g.save(),hint=R.bestHint(g);
   assert.deepEqual(g.save(),before,"Hint may not spend moves or rewrite a save");
   assert(hint&&R.neighbors(hint.from).includes(hint.to));
   assert(g.swap(hint.from,hint.to).ok);
  }
  const save=g.save(),restored=new R.Game(level,save,{fastRestore:true});
  assert.equal(restored.config.name,g.config.name);
  assert.deepEqual(restored.config.goal,g.config.goal);
  assert.deepEqual(restored.board,g.board);
  assert.deepEqual(restored.boardMechanics,g.boardMechanics);
  assert.deepEqual(restored.mist,g.mist);
  assert.equal(restored.moves,g.moves);
  assert.equal(restored.bambooVersion,1);
  assert(H.validRun({level,data:restored.save()}));
 }
});
check("Old unfinished Endless Garden runs from levels 51–60 retain original targets",()=>{
 for(const level of [50,52,55,59]){
  const g=new R.Game(level,null,{seed:3171+level,boardMechanics:{}});
  const previous=g.save();
  delete previous.bambooVersion;
  const original=R.endlessConfig(level,true,true,true,false);
  previous.boardMechanics=B.normalize(null);
  previous.mist=original.goal.type==="mist"?
   Array.from({length:49},(_,i)=>Number(R.mistLayout(level,original.goal.count).includes(i))):
   Array(49).fill(0);
  previous.mistCleared=0;
  const restored=new R.Game(level,previous,{fastRestore:true});
  assert.equal(restored.bambooVersion,0);
  assert.deepEqual(restored.config.goal,original.goal);
  assert.equal(restored.config.moves,original.moves);
  assert.deepEqual(restored.board,g.board);
  assert.equal(restored.boardMechanics.blocked.length,0);
  assert.equal(restored.moves,previous.moves);
  assert.equal(restored.seed,previous.seed);
  assert.equal(restored.rolls,previous.rolls);
 }
});
check("Chapter 6 does not retune existing levels 1–50",()=>{
 for(const index of [0,3,9,10,19,20,24,29,30,39,40,47,49]){
  const current=R.levelConfig(index);
  const a=new R.Game(index,null,{seed:729+index});
  const b=new R.Game(index,null,{seed:729+index,boardMechanics:{}});
  assert.deepEqual(a.board,b.board);
  assert.deepEqual(a.config.goal,b.config.goal);
  assert.equal(a.config.moves,current.moves);
  assert.equal(a.bambooVersion,0);
  assert.equal(a.boardMechanics.blocked.length,0);
 }
});
console.log("Bamboo Paths 1.0 authored level contracts passed.");
