"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const A=require("../harmony/puzzle-architect.js");
const H=require("../harmony/journey-authored-openings.js");
const D=require("../harmony/journey-levels-v2.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const indices=[4,5,6,7,8,10,11,12,13,14,15,16,17,18,19];
const physical=(i,seed=123)=>A.build(R,H.get(i),{seed,directorMode:"v62"});
check("Fifteen complete fixed openings occupy the correct 7×7 fixtures",()=>{
 assert.equal(H.VERSION,2);assert.equal(H.COUNT,15);
 assert.deepEqual(H.summary().map(x=>x.index),indices);
 for(const i of [0,1,2,3,9])assert.equal(H.get(i),null);
 for(const i of indices){
  const bp=H.get(i),m=bp.recipe.mechanics;
  assert.equal(bp.opening.provenance,"hand-authored");
  assert.equal(bp.opening.grid.length,49);
  assert.deepEqual(bp.recipe,D.get(i));
  const anchors=[...m.daruma,...m.sealedStones,
   ...m.hanabi?[...m.hanabi.starts,...m.hanabi.crates]:[]];
  for(const at of anchors)assert.equal(bp.opening.grid[at],null);
  for(const seed of [123,20261104]){
   const g=A.build(R,bp,{seed,directorMode:"v62"});
   assert.deepEqual(A.cellsOf(g),bp.opening.grid);
   assert.equal(R.scan(g.board).length,0);
   assert(R.validSwaps(g.board).length>=3);
   assert.equal(g.board.filter(x=>x?.family==="moonMirror").length,0);
   for(const at of m.daruma)assert.equal(g.board[at]?.family,"daruma");
   for(const at of m.sealedStones)assert.equal(g.board[at]?.family,"sealedStone");
   for(const at of m.hanabi?.starts||[])assert.equal(g.board[at]?.family,"lotusSeed");
   for(const at of m.hanabi?.crates||[])assert.equal(g.board[at]?.family,"hanabiCrate");
   assert.deepEqual(new R.Game(i,g.save(),{fastRestore:true}).board,g.board);
  }
 }
});
check("Level 5 retains its proven two-swap real Hanabi setup",()=>{
 const g=physical(4);
 assert.equal(g.board[29]?.family,"lotusSeed");
 assert.equal(g.board[43]?.family,"hanabiCrate");
 const first=g.swap(30,31);assert.equal(first.ok,true);
 assert.equal(g.lotusDelivered,0);
 const second=g.swap(30,37);assert.equal(second.ok,true);
 assert(g.lotusDelivered>=1);
});
check("Level 11 retains a deliberate Wind-aligned three-in-a-row",()=>{
 const g=physical(10);
 assert.deepEqual(g.windGarden,{every:3,steps:[{row:3,direction:"right"}]});
 assert.equal(g.board[16]?.family,g.board[30]?.family);
 assert.equal(g.board[22]?.family,g.board[16]?.family);
 const moved=g.board.map(x=>x?{...x}:x),row=moved.slice(21,28);
 moved.splice(21,7,row[6],...row.slice(0,6));
 assert(R.scan(moved).some(line=>line.includes(16)&&line.includes(23)&&line.includes(30)));
});
check("Top-row solo Hanabi fixtures and festival stone routing are spatial",()=>{
 for(const i of [5,6,7,8])for(const at of D.get(i).mechanics.hanabi.starts)
  assert(at<7,"Rocket must begin on top row after intro");
 const game=physical(19);
 assert.equal(game.board.filter(x=>x?.family==="sealedStone").length,4);
 assert.equal(game.board.filter(x=>x?.family==="lotusSeed").length,2);
 assert.equal(game.board.filter(x=>x?.family==="hanabiCrate").length,2);
});
check("Old production boards never inherit these hand-authored layouts",()=>{
 for(const i of indices){
  const g=new R.Game(i,null,{seed:123});
  assert(!g.levelRecipe);assert(!Object.hasOwn(g.save(),"levelRecipe"));
 }
});
console.log("PASS focused Journey 2.0 fifteen reference boards");
