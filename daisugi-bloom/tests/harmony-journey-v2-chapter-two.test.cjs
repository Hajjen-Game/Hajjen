"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const D=require("../harmony/journey-levels-v2.js");
const A=require("../harmony/level-architecture.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
check("Chapter 2 has deliberate Wind, Daruma, Stone and Hanabi identities",()=>{
 assert.deepEqual(Array.from({length:10},(_,i)=>D.get(i+10).goal.type),
  ["fusion","masterpiece","lotus","daruma","daruma","daruma","daruma","sealedStone","sealedStone","sealedStone"]);
 assert.deepEqual(Array.from({length:10},(_,i)=>D.get(i+10).mechanics.mirrors.length),
  Array(10).fill(0));
 assert.deepEqual([10,11,12,16].map(i=>!!D.get(i).mechanics.wind),[true,true,true,true]);
 assert.deepEqual(D.get(13).mechanics.daruma,[24]);
 assert.deepEqual(D.get(14).mechanics.daruma,[23,25]);
 assert.deepEqual(D.get(15).mechanics.daruma,[15,22]);
 assert.deepEqual(D.get(17).mechanics.sealedStones,[24]);
 assert.deepEqual(D.get(18).mechanics.sealedStones,[24,31]);
 assert.deepEqual(D.get(19).mechanics.sealedStones,[15,19,22,26]);
 assert.deepEqual(D.get(19).mechanics.hanabi.starts,[29,33]);
 for(let i=10;i<20;i++)assert(A.compatible(D.get(i)).ok);
});
check("30 genuine five-family games have all intended special objects and fair openings",()=>{
 for(let i=10;i<20;i++)for(const seed of [11,29,53]){
  const x=D.get(i),m=x.mechanics;
  const g=new R.Game(i,null,{seed,directorMode:"v62",journeyDiagnostic:true,levelRecipe:x});
  assert.equal(g.familyCount,5);assert.equal(g.moves,x.moves);
  assert.deepEqual(g.config.goal,x.goal);assert.equal(g.config.levelRecipeId,x.id);
  assert.equal(R.scan(g.board).length,0);assert(R.validSwaps(g.board).length>=3);
  assert.deepEqual(g.moonMirrors,[]);assert.deepEqual(g.windGarden,m.wind??null);
  assert.deepEqual(g.boardMechanics.daruma,m.daruma);
  assert.deepEqual(g.boardMechanics.sealedStone,m.sealedStones);
  assert.equal(g.board.filter(p=>p?.family==="daruma").length,m.daruma.length);
  assert.equal(g.board.filter(p=>p?.family==="sealedStone").length,m.sealedStones.length);
  assert.equal(g.board.filter(p=>p?.family==="lotusSeed").length,m.hanabi?.starts.length||0);
  for(const at of m.daruma)assert.equal(g.daruma[at],2);
  for(const at of m.sealedStones)assert.equal(g.sealed[at],4);
  const snapshot=g.save(),resumed=new R.Game(i,snapshot,{fastRestore:true});
  assert.deepEqual(resumed.board,g.board);
  assert.deepEqual(resumed.lotus,g.lotus);
  assert.deepEqual(resumed.sealed,g.sealed);
  assert.deepEqual(resumed.config.goal,g.config.goal);
  assert.equal(g.swap(...R.validSwaps(g.board)[0]).ok,true);
 }
});
check("Wind row is above the active Hanabi route and chapter 2 has no Wind plus Mist",()=>{
 const g=D.get(12);
 assert.equal(g.mechanics.wind.steps[0].row,2);
 assert.equal(g.mechanics.hanabi.starts[0],29);
 for(let i=10;i<20;i++)assert(!(D.get(i).mechanics.wind&&D.get(i).mechanics.mist.length));
});
check("Published chapter 2 and old saves remain distinct from preview",()=>{
 for(let i=10;i<20;i++){
  const old=new R.Game(i,null,{seed:101+i});
  assert(!old.levelRecipe);
  assert(!Object.hasOwn(old.save(),"levelRecipe"));
  assert.deepEqual(new R.Game(i,old.save(),{fastRestore:true}).board,old.board);
 }
 assert.equal(R.levelConfig(20).name,"Daruma Awakening");
 assert.equal(R.levelConfig(30).goal.type,"sealedStone");
});
console.log("PASS focused Journey 2.0 chapter 2 authentic mechanics");
