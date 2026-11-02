"use strict";
/* Journey 2.0 · Chapter 2: real five-family, Daruma and mixed Mist starts.
 * A draft must never replace published 11–20 or mutate old saves.
 */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const A=require("../harmony/level-architecture.js");
const D=require("../harmony/journey-levels-v2.js");
const check=(label,fn)=>{fn();console.log("PASS "+label);};
const SEEDS=[11,29,53,79,103,127];
const all=Array.from({length:10},(_,i)=>D.get(i+10));
check("Ten authored five-family levels and independent goals",()=>{
 assert.equal(D.COUNT,20);
 assert.deepEqual(all.map(x=>x.index),[10,11,12,13,14,15,16,17,18,19]);
 assert.equal(new Set(all.map(x=>x.id)).size,10);
 assert.deepEqual(all.map(x=>x.goal.type),
  ["fusion","mist","stage4","mist","daruma","daruma","fusion","mist","masterpiece","daruma"]);
 assert.deepEqual(all.map(x=>x.mechanics.daruma.length),
  [0,0,0,0,1,2,0,1,1,3]);
 assert.deepEqual(all.map(x=>x.mechanics.mist.length),
  [0,4,0,5,0,0,0,5,0,2]);
 assert.equal(D.get(14).name,"First Daruma");
 assert.equal(D.get(19).name,"Daruma Festival");
 for(const x of all){
  assert.equal(A.compatible(x).ok,true);
  assert(x.starPar<x.moves-1);
  assert(x.mechanics.daruma.length>=x.goal.count||x.goal.type!=="daruma");
  assert(x.mechanics.mist.length>=x.goal.count||x.goal.type!=="mist");
  assert(!x.mechanics.wind&&!x.mechanics.mirrors&&!x.mechanics.hanabi);
 }
 const before=D.get(17);
 const mutable=D.get(17);mutable.mechanics.daruma[0]=4;mutable.mechanics.mist.push(48);
 mutable.goal.count=99;
 assert.deepEqual(D.get(17),before,"Catalogue entries must be immutable from consumers");
 assert.equal(D.get(20),null);
});
check("New Daruma arrives at 15 and all levels 11–20 start with five families",()=>{
 for(const x of all){
  for(const seed of SEEDS){
   const opts={seed,directorMode:"v4",journeyDiagnostic:true,levelRecipe:x};
   const game=new R.Game(x.index,null,opts);
   assert.equal(game.familyCount,5,"Five families at level "+(x.index+1));
   assert.equal(new Set(game.families).size,5);
   assert.equal(game.config.levelRecipeId,x.id);
   assert.deepEqual(game.config.goal,x.goal);
   assert.equal(game.config.moves,x.moves);
   assert.equal(game.config.starPar,x.starPar);
   assert.equal(game.levelRecipe.index,x.index);
   assert.equal(R.scan(game.board).length,0,"No free matches");
   assert(R.validSwaps(game.board).length>=3,"At least three legal swaps");
   assert.equal(game.board.filter(p=>p?.family==="daruma").length,x.mechanics.daruma.length);
   assert.equal(game.board.filter(p=>p?.family==="sealedStone").length,0);
   assert.equal(game.board.filter(p=>p?.family==="moonMirror").length,0);
   assert.deepEqual(game.boardMechanics.daruma,x.mechanics.daruma);
   assert.deepEqual(game.boardMechanics.mist,x.mechanics.mist);
   assert.equal(game.mist.filter(Boolean).length,x.mechanics.mist.length);
   assert.equal(game.daruma.filter(Boolean).length,x.mechanics.daruma.length);
   assert.equal(game.sealed.filter(Boolean).length,0);
   assert.equal(game.hanabiVersion,0);
   assert.equal(game.moonMirrors.length,0);
   assert.equal(game.windGarden,null);
   for(const at of x.mechanics.daruma){
    assert.equal(game.board[at]?.family,"daruma");
    assert.equal(game.daruma[at],2,"Each Daruma starts with two hits");
    assert.equal(game.mist[at],0,"Mist must not cover Daruma");
   }
   assert.equal(game.progress(),0);
   assert.equal(game.target(),x.goal.count);
   if(x.goal.type==="daruma")assert.equal(game.goalText(),"Completed Daruma");
   const snapshot=game.save();
   assert.equal(snapshot.levelArchitectureVersion,2);
   assert.deepEqual(snapshot.levelRecipe,A.normalize(x));
   const again=new R.Game(x.index,null,opts);
   assert.deepEqual(again.board,game.board,"Same authored seed must reproduce opening");
   const restored=new R.Game(x.index,snapshot,{fastRestore:true});
   assert.deepEqual(restored.board,game.board);
   assert.deepEqual(restored.daruma,game.daruma);
   assert.deepEqual(restored.mist,game.mist);
   assert.deepEqual(restored.config.goal,game.config.goal);
   assert.equal(restored.moves,game.moves);
   assert.equal(restored.config.name,game.config.name);
   const next=R.validSwaps(game.board)[0];
   assert.equal(game.swap(...next).ok,true,"Real swap must work in every draft");
   assert.equal(game.moves,x.moves-1);
  }
 }
});
check("Daruma target counts reflect real two-hit state; Mist remains independent",()=>{
 const r=D.get(19);
 const g=new R.Game(19,null,{seed:53,directorMode:"v4",journeyDiagnostic:true,levelRecipe:r});
 assert.equal(g.progress(),0);
 g.daruma[17]=0;g.darumaCleared=1;
 assert.equal(g.progress(),1);
 assert.equal(g.fulfilled(),false);
 g.darumaCleared=3;
 assert.equal(g.fulfilled(),true);
 assert.equal(g.goalText(),"Completed Daruma");
 const mixed=D.get(17);
 const m=new R.Game(17,null,{seed:79,directorMode:"v4",journeyDiagnostic:true,levelRecipe:mixed});
 assert.equal(m.config.goal.type,"mist");
 assert.equal(m.daruma[24],2);
 assert.equal(m.target(),5);
 m.daruma[24]=0;m.darumaCleared=1;
 assert.equal(m.progress(),0,"Optional Daruma must not count as clearing Mist");
});
check("Published levels and ordinary saves remain unchanged",()=>{
 for(let i=0;i<100;i++){
  const live=R.levelConfig(i);
  assert(!Object.hasOwn(live,"levelRecipeId"));
  assert(!Object.hasOwn(live,"levelArchitectureVersion"));
 }
 for(let i=10;i<20;i++){
  const g=new R.Game(i,null,{seed:8811+i,directorMode:"v4"});
  assert(!g.levelRecipe);
  assert(!Object.hasOwn(g.save(),"levelArchitectureVersion"));
  assert(!Object.hasOwn(g.save(),"levelRecipe"));
  const restored=new R.Game(i,g.save(),{fastRestore:true});
  assert.deepEqual(restored.board,g.board);
  assert.deepEqual(restored.config.goal,g.config.goal);
  assert.throws(()=>new R.Game(i,null,{seed:5,levelRecipe:D.get(i)}),/diagnostic/);
 }
 assert.equal(R.levelConfig(20).name,"Daruma Awakening");
});
console.log("PASS Journey 2.0 Chapter 2 60 seeded full-game starts and legacy isolation");
