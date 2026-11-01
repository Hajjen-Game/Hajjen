"use strict";
/* Void Board 1.0 — live levels 58–60 have nine missing squares.
 * All other Bamboo layouts are unchanged; old ring-shaped saves resume. */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const B=require("../harmony/board-mechanics.js");
const C=require("../harmony/bamboo-paths.js");
const Save=require("../harmony/save-health.js");
const expected=[16,17,18,23,24,25,30,31,32];
function test(name,fn){fn();console.log("PASS "+name)}
test("new levels 58–60 have an entire 3×3 missing center, not eight stones",()=>{
 for(const level of [57,58,59]){
  const cfg=C.get(level);
  assert.deepEqual(cfg.boardMechanics.blocked,[24]);
  const norm=B.normalize(cfg.boardMechanics);
  assert.deepEqual(norm.blocked,expected);
  const g=new R.Game(level,null,{seed:20061101+level,directorMode:"v62"});
  assert.deepEqual(g.boardMechanics.blocked,expected);
  assert.equal(g.board[24].family,"terrain");
  assert.equal(g.board[24].stage,0);
  assert.equal(g.board.filter(x=>x.family==="terrain").length,9);
  assert.equal(g.board.filter(x=>x.family!=="terrain").length,40);
  assert(R.validSwaps(g.board).length>=3);
  assert(Save.validRun({level,data:g.save()}));
  assert.equal(R.scan(g.board).length,0);
 }
 assert.deepEqual(B.normalize({layout:"centralShrine"}).blocked,
  [16,17,18,23,25,30,31,32],"Legacy eight-cell layout remains valid");
});
test("missing center never matches, falls, refills, hints or accepts swaps",()=>{
 for(const level of [57,58,59])for(let seed=0;seed<20;seed++){
  const g=new R.Game(level,null,{seed:500+seed*913+level,directorMode:"v62"});
  assert.equal(g.swap(24,17).ok,false);
  const hint=R.bestHint(g);assert(hint);
  assert(!expected.includes(hint.from)&&!expected.includes(hint.to));
  for(let move=0;move<4&&!g.complete&&!g.failed;move++){
   const legal=R.validSwaps(g.board);
   assert(legal.length);
   const result=g.swap(...legal[(seed+move)%legal.length]);
   assert(result.ok);
   assert.equal(R.scan(g.board).length,0);
   for(const at of expected)assert.deepEqual(g.board[at],B.terrainPiece(at));
   assert(Save.validRun({level,data:g.save()}));
  }
 }
});
test("an existing eight-square ring save keeps its center object and topology",()=>{
 const level=57;
 const old=new R.Game(level,null,{seed:12573,directorMode:"v4",
  boardMechanics:{layout:"centralShrine"}});
 assert(!old.boardMechanics.blocked.includes(24));
 const center=JSON.parse(JSON.stringify(old.board[24]));
 const saved=JSON.parse(JSON.stringify(old.save()));
 assert(Save.validRun({level,data:saved}));
 const restored=new R.Game(level,saved,{fastRestore:true});
 assert.deepEqual(restored.boardMechanics.blocked,
  [16,17,18,23,25,30,31,32]);
 assert.deepEqual(restored.board[24],center);
 assert.deepEqual(restored.board,old.board);
 assert.deepEqual(restored.boardMechanics,old.boardMechanics);
 assert.equal(restored.config.goal.type,"fusion");
 assert(Save.validRun({level,data:restored.save()}));
 const legal=R.validSwaps(restored.board)[0];
 assert(restored.swap(...legal).ok);
 assert.equal(restored.boardMechanics.blocked.includes(24),false);
});
test("Wind level 54 and the other six Bamboo board topologies are unmodified",()=>{
 for(const i of [50,51,52,53,54,55,56]){
  const orig=C.get(i).boardMechanics;
  assert.equal(!!orig.blocked?.includes(24),false);
  const g=new R.Game(i,null,{seed:20261101+i,directorMode:"v62"});
  assert.deepEqual(g.boardMechanics,B.normalize(orig));
 }
 assert.deepEqual(C.get(53).windGarden,{every:3,steps:[{row:6,direction:"right"}]});
});
console.log("PASS Bamboo Void Board 1.0");
