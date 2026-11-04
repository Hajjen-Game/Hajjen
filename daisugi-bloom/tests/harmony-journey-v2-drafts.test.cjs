"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const A=require("../harmony/level-architecture.js");
const D=require("../harmony/journey-levels-v2.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const starts=(i)=>D.get(i).mechanics.hanabi?.starts||[];
check("All 20 focused recipes are distinct and retain the early foundations",()=>{
 assert.equal(D.COUNT,20);assert.equal(D.FIRST,0);
 assert.deepEqual(Array.from({length:4},(_,i)=>D.get(i).goal.type),
  ["fusion","stage3","masterpiece","mist"]);
 assert.equal(D.get(9).id,"journey2-koi-masterpiece-finale");
 assert.deepEqual(D.get(9).goal,{type:"familyMasterpiece",family:"koi",count:2});
 assert.equal(new Set(D.summary().map(x=>x.name)).size,20);
 for(let i=0;i<20;i++){
  const x=D.get(i);assert.equal(x.index,i);assert(A.compatible(x).ok);
  assert(x.moves>x.starPar+1);assert.equal(x.mechanics.mirrors.length,0);
  assert(!x.goal.requires||x.goal.requires.length<=1,"No counter-stacked recipes");
  assert(!(x.mechanics.wind&&x.mechanics.mist.length));
  assert(!x.mechanics.bamboo?.blocked?.length);
 }
 assert.equal(D.get(-1),null);assert.equal(D.get(20),null);
});
check("Hanabi starts at the top after tutorial on the solo festival boards",()=>{
 assert.deepEqual(starts(4),[29]);
 assert.deepEqual(starts(5),[1]);assert.deepEqual(starts(6),[1,5]);
 assert.deepEqual(starts(7),[3]);assert.deepEqual(starts(8),[1,5]);
 for(const index of [5,6,7,8])assert(starts(index).every(i=>i<7));
 assert.deepEqual(D.get(8).mechanics.mist,[8,15,24]);
});
check("Wind, Daruma and Stone enter without Mirror and keep real fixtures",()=>{
 assert.equal(D.get(10).name,"First Wind Garden");
 assert.equal(D.get(13).name,"First Daruma");
 assert.equal(D.get(17).name,"First Sealed Stone");
 for(let i=0;i<13;i++)assert.equal(D.get(i).mechanics.daruma.length,0);
 for(let i=0;i<17;i++)assert.equal(D.get(i).mechanics.sealedStones.length,0);
 assert.deepEqual(D.get(19).mechanics.sealedStones,[15,19,22,26]);
 const copy=D.get(19);copy.mechanics.sealedStones.length=0;
 assert.deepEqual(D.get(19).mechanics.sealedStones,[15,19,22,26],
  "Stone fixture data must not leak through recipe copies");
});
check("30 seeded 1–10 real openings and restored runs are safe",()=>{
 for(let i=0;i<10;i++)for(const seed of [11,29,53]){
  const x=D.get(i),g=new R.Game(i,null,{seed,directorMode:"v62",
   journeyDiagnostic:true,levelRecipe:x});
  assert.equal(g.familyCount,4);assert.equal(g.config.levelRecipeId,x.id);
  assert.deepEqual(g.config.goal,x.goal);assert.equal(g.moves,x.moves);
  assert.equal(R.scan(g.board).length,0);assert(R.validSwaps(g.board).length>=3);
  assert.equal(g.moonMirrors.length,0);assert.equal(g.windGarden,null);
  assert.deepEqual(g.lotus.starts,x.mechanics.hanabi?.starts||[]);
  for(const at of x.mechanics.hanabi?.starts||[])assert.equal(g.board[at]?.family,"lotusSeed");
  for(const at of x.mechanics.hanabi?.crates||[])assert.equal(g.board[at]?.family,"hanabiCrate");
  const restored=new R.Game(i,g.save(),{fastRestore:true});
  assert.deepEqual(restored.board,g.board);assert.deepEqual(restored.config.goal,g.config.goal);
 }
});
check("Published 1–100 levels and ordinary saved games never silently adopt drafts",()=>{
 for(let i=0;i<100;i++)assert(!Object.hasOwn(R.levelConfig(i),"levelRecipeId"));
 for(const i of [0,4,9,10,13,17,19]){
  const game=new R.Game(i,null,{seed:20261104+i}),saved=game.save();
  assert(!game.levelRecipe);assert(!Object.hasOwn(saved,"levelRecipe"));
  assert.deepEqual(new R.Game(i,saved,{fastRestore:true}).board,game.board);
  assert.throws(()=>new R.Game(i,null,{seed:4,levelRecipe:D.get(i)}),/diagnostic/);
 }
});
console.log("PASS Focused Journey 2.0 chapter 1 and normal-save isolation");
