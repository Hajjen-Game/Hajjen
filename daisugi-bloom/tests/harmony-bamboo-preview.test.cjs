"use strict";
/* Bamboo Paths Early Preview 1.0 — the actual levels 51–60, without unlocks.
 * Compare preview and ordinary Chapter 6 engines with the SAME seed. */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const B=require("../harmony/board-mechanics.js");
const C=require("../harmony/bamboo-paths.js");
const I=require("../harmony/player-insight.js");
const check=(label,fn)=>{fn();console.log("PASS "+label);};
const preview=(level,seed=20261031+level*97)=>
 new R.Game(level,null,{directorMode:"v4",seed,bambooPreview:true});
const regular=(level,seed=20261031+level*97)=>
 new R.Game(level,null,{directorMode:"v4",seed});
check("exactly the ten authentic Chapter 6 levels are available without changing objectives",()=>{
 for(let level=50;level<=59;level++){
  const g=preview(level),live=regular(level),source=C.get(level);
  assert.equal(g.bambooPreview,true);
  assert.equal(live.bambooPreview,false);
  assert.equal(g.config.name,source.name);
  assert.deepEqual(g.config.goal,live.config.goal);
  assert.equal(g.config.moves,live.config.moves);
  assert.equal(g.config.starPar,live.config.starPar);
  assert.deepEqual(g.boardMechanics,live.boardMechanics);
  assert.deepEqual(g.board,live.board);
  assert.equal(g.bambooVersion,1);
  assert.equal(R.scan(g.board).length,0);
  assert(R.validSwaps(g.board).length>=3);
 }
});
check("preview marker cannot be used on levels outside 51–60 or combined with other previews",()=>{
 for(const level of [0,2,49,60,80])
  assert.throws(()=>new R.Game(level,null,{seed:100,bambooPreview:true}),/Bamboo Paths preview/);
 assert.throws(()=>new R.Game(50,null,
  {seed:100,bambooPreview:true,windGardenPreview:"breeze"}),/Bamboo Paths preview/);
 assert.throws(()=>new R.Game(50,null,
  {seed:100,bambooPreview:true,moonMirrorPreview:"echo"}),/Bamboo Paths preview/);
});
check("blocked terrain positions are fixed independent objects, never normal match pieces",()=>{
 for(let level=50;level<=59;level++){
  const g=preview(level),blocked=g.boardMechanics.blocked;
  for(const at of blocked){
   assert.deepEqual(g.board[at],B.terrainPiece(at));
   assert(!R.validSwaps(g.board).some(([a,b])=>a===at||b===at));
   const n=R.neighbors(at)[0],before=g.save(),invalid=g.swap(at,n);
   assert.equal(invalid.ok,false);
   assert.equal(g.moves,before.moves);
   assert.deepEqual(g.board,before.board);
  }
 }
});
check("normal and Bamboo-preview engines give byte-identical gameplay after a real swap",()=>{
 for(let level=50;level<=59;level++){
  const g=preview(level),live=regular(level);
  const moves=R.validSwaps(g.board);
  const pair=moves[Math.floor(moves.length/2)];
  const a=g.swap(...pair),b=live.swap(...pair);
  assert.equal(a.ok,true);assert.equal(b.ok,true);
  assert.deepEqual(a.events,b.events,"Events must match for actual level "+(level+1));
  assert.deepEqual(g.board,live.board);
  assert.deepEqual(g.mist,live.mist);
  assert.equal(g.progress(),live.progress());
  assert.equal(g.fusions,live.fusions);
  assert.equal(g.score,live.score);
  assert.equal(R.scan(g.board).length,0);
  for(const at of g.boardMechanics.blocked)assert.deepEqual(g.board[at],B.terrainPiece(at));
 }
});
check("fixed closed columns continue to shape falling pieces over multiple turns",()=>{
 for(const level of [50,51,52,54,57,59]){
  const g=preview(level);
  for(let turn=0;turn<4&&!g.complete&&!g.failed;turn++){
   const swaps=R.validSwaps(g.board);assert(swaps.length>0);
   const result=g.swap(...swaps[(level+turn)%swaps.length]);assert.equal(result.ok,true);
   for(const at of g.boardMechanics.blocked)assert.deepEqual(g.board[at],B.terrainPiece(at));
   assert.equal(R.scan(g.board).length,0);
  }
 }
});
check("chapter finale uses its actual Mist and closed-shrine layout",()=>{
 const g=preview(59),source=C.get(59);
 assert.equal(source.boardMechanics.layout,"centralShrine");
 assert.deepEqual(g.boardMechanics.mist,[9,13,35]);
 assert.deepEqual(g.config.goal,{type:"mist",count:3});
 assert.deepEqual(g.mist.map((value,i)=>value?i:-1).filter(i=>i>=0),[9,13,35]);
 assert(g.boardMechanics.blocked.length>=6);
});
check("saved preview replays exactly with unchanged original level recipe",()=>{
 for(const level of [50,52,54,57,59]){
  const g=preview(level);g.swap(...R.validSwaps(g.board)[0]);
  const data=JSON.parse(JSON.stringify(g.save()));
  assert.equal(data.bambooPreview,true);
  const restored=new R.Game(level,data,{fastRestore:true});
  assert.equal(restored.bambooPreview,true);
  assert.deepEqual(restored.boardMechanics,g.boardMechanics);
  assert.deepEqual(restored.board,g.board);
  assert.deepEqual(restored.config.goal,C.get(level).goal);
  const pair=R.validSwaps(g.board)[0];
  assert.equal(g.swap(...pair).ok,true);
  assert.equal(restored.swap(...pair).ok,true);
  // Insight's round history intentionally begins a new local segment
  // after a restore. The actual game state, RNG and future moves must match.
  const one=g.save(),two=restored.save();
  delete one.roundTrace;delete two.roundTrace;
  assert.deepEqual(JSON.parse(JSON.stringify(two)),
   JSON.parse(JSON.stringify(one)));
 }
});
check("round export explicitly identifies Bamboo as unranked without earning stars",()=>{
 const g=preview(52);g.swap(...R.validSwaps(g.board)[0]);
 const report=I.last(g,g.roundTrace,null,null);
 assert.equal(report.preview,"bamboo-paths");
 assert.equal(report.previewType,"bamboo-paths");
 assert.equal(report.result.unranked,true);
 assert.equal(report.result.stars,0);
 assert.equal(report.level,53);
 assert.equal(report.levelName,"Temple Gate");
 assert.deepEqual(report.goal,C.get(52).goal);
});
check("unrelated chapters and the Wind/Mirror previews are completely unaffected",()=>{
 for(const level of [0,2,10,20,30,40,49,60]){
  const a=regular(level),b=new R.Game(level,null,{seed:20261031+level*97,directorMode:"v4"});
  assert.equal(a.bambooPreview,false);
  assert.deepEqual(a.board,b.board);
  assert.deepEqual(a.config.goal,b.config.goal);
 }
 for(const option of [{windGardenPreview:"breeze"},{moonMirrorPreview:"spark"}]){
  const game=new R.Game(2,null,{seed:13,directorMode:"v4",...option});
  assert.equal(game.bambooPreview,false);
  assert.equal(game.swap(17,24).ok,true);
 }
});
console.log("Bamboo Paths Early Preview: genuine chapter puzzles, fair starts, fixed masks, save and sandbox checks passed");
