"use strict";
/* Journey 2.0 · chapter 2 identity: Moon Mirror at 11, Wind Garden at 16.
 * Full real-engine seeded starts. No old Daruma chapter in live configs changes.
 */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const A=require("../harmony/level-architecture.js");
const D=require("../harmony/journey-levels-v2.js");
const Mirror=require("../harmony/moon-mirrors.js");
const Wind=require("../harmony/wind-garden.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const SEEDS=[11,29,53,79,103,127];
const all=Array.from({length:10},(_,i)=>D.get(i+10));
check("Chapter-two authored goals and mechanic introduction order",()=>{
 assert.equal(D.COUNT,20);
 assert.deepEqual(all.map(x=>x.index),[10,11,12,13,14,15,16,17,18,19]);
 assert.equal(new Set(all.map(x=>x.id)).size,10);
 assert.deepEqual(all.map(x=>x.goal.type),
  ["stage4","mist","lotus","stage4","masterpiece","fusion","lotus","stage4","masterpiece","lotus"]);
 assert.deepEqual(all.map(x=>x.mechanics.mirrors.length),
  [1,1,1,2,1,0,0,1,0,2]);
 assert.deepEqual(all.map(x=>!!x.mechanics.wind),
  [false,false,false,false,false,true,true,true,true,false]);
 assert.deepEqual(all.map(x=>!!x.mechanics.hanabi),
  [false,false,true,false,true,false,true,false,false,true]);
 assert.deepEqual(all.map(x=>x.mechanics.mist.length),
  [0,3,0,0,0,0,0,0,0,0]);
 assert.equal(all[0].name,"First Moon Mirror");
 assert.equal(all[5].name,"First Wind Garden");
 assert.equal(all[9].name,"Festival of Reflections");
 for(const recipe of all){
  assert.equal(A.compatible(recipe).ok,true);
  assert.equal(recipe.mechanics.daruma.length,0);
  assert(!recipe.mechanics.wind||!recipe.mechanics.mist.length);
  assert(recipe.moves>recipe.starPar);
 }
 const before=D.get(16),clone=D.get(16);
 clone.mechanics.wind.steps[0].row=6;
 clone.goal.count=100;
 assert.deepEqual(D.get(16),before);
});
check("60 real five-family games preserve mirrors, wind schedules and cargo",()=>{
 for(const example of all)for(const seed of SEEDS){
  const options={seed,directorMode:"v62",journeyDiagnostic:true,levelRecipe:example};
  const g=new R.Game(example.index,null,options);
  const m=example.mechanics;
  assert.equal(g.familyCount,5);
  assert.equal(new Set(g.families).size,5);
  assert.equal(g.config.levelArchitectureVersion,2);
  assert.equal(g.config.levelRecipeId,example.id);
  assert.deepEqual(g.config.goal,example.goal);
  assert.equal(g.config.moves,example.moves);
  assert.equal(g.config.starPar,example.starPar);
  assert.equal(g.moves,example.moves);
  assert.equal(g.mist.filter(Boolean).length,m.mist.length);
  assert.equal(g.daruma.filter(Boolean).length,0);
  assert.equal(g.sealed.filter(Boolean).length,0);
  assert.equal(g.board.filter(p=>p?.family==="moonMirror").length,m.mirrors.length);
  assert.deepEqual(g.moonMirrors,m.mirrors);
  assert.equal(R.scan(g.board).length,0);
  assert(R.validSwaps(g.board).length>=3,"Each opening needs at least three real legal swaps");
  assert.deepEqual(g.windGarden,m.wind||null);
  assert.equal(g.hanabiVersion,!!m.hanabi?2:0);
  if(m.hanabi){
   assert.deepEqual(g.lotus.starts,m.hanabi.starts);
   assert.deepEqual(g.lotus.exits,m.hanabi.crates);
   for(const at of m.hanabi.starts)assert.equal(g.board[at]?.family,"lotusSeed");
   for(const at of m.hanabi.crates)assert.equal(g.board[at]?.family,"hanabiCrate");
  }
  for(const mirror of m.mirrors)assert.equal(g.board[mirror.at]?.family,"moonMirror");
  assert.equal(g.target(),example.goal.count);
  assert.equal(g.progress(),0);
  const snapshot=g.save(),resumed=new R.Game(example.index,snapshot,{fastRestore:true});
  assert.deepEqual(resumed.board,g.board);
  assert.deepEqual(resumed.lotus,g.lotus);
  assert.deepEqual(resumed.windGarden,g.windGarden);
  assert.deepEqual(resumed.moonMirrors,g.moonMirrors);
  assert.deepEqual(resumed.mist,g.mist);
  assert.deepEqual(resumed.config.goal,g.config.goal);
  const again=new R.Game(example.index,null,options);
  assert.deepEqual(again.board,g.board,"Same seed must reproduce the actual board");
  const swap=R.validSwaps(g.board)[0];
  assert.equal(g.swap(...swap).ok,true,"A real player swap must work");
  assert.equal(g.moves,example.moves-1);
 }
});
check("A neighboring Fusion can trigger an exact Mirror echo",()=>{
 const m=D.get(10).mechanics.mirrors;
 const reflections=Mirror.planFusionResonance([{at:24}],m);
 assert.deepEqual(reflections,[{from:24,mirrorAt:25,to:26,direction:"right"}]);
 const normal=Mirror.planFusionResonance([{at:0}],m);
 assert.deepEqual(normal,[]);
 const g=new R.Game(10,null,{seed:303,journeyDiagnostic:true,
  levelRecipe:D.get(10),directorMode:"v62"});
 assert.equal(g.board[25]?.family,"moonMirror");
 assert(!R.validSwaps(g.board).some(([a,b])=>a===25||b===25));
});
check("Wind executes an actual schedule without mist or shifting a fixed mirror",()=>{
 const x=D.get(15);
 const schedule=Wind.normalize(x.mechanics.wind);
 assert.deepEqual(schedule,{every:3,steps:[{row:3,direction:"right"}]});
 const game=new R.Game(15,null,{seed:301,journeyDiagnostic:true,
  levelRecipe:x,directorMode:"v62"});
 assert.equal(game.windGarden.every,3);
 assert.equal(game.boardMechanics.mist.length,0);
 const mixed=D.get(17);
 assert.equal(mixed.mechanics.mirrors[0].at,25);
 assert.equal(mixed.mechanics.wind.steps[0].row,2);
 assert.equal(mixed.mechanics.wind.steps[0].direction,"left");
 assert(!mixed.mechanics.wind.steps.some(w=>mixed.mechanics.mirrors.some(m=>
  Math.floor(m.at/7)===w.row)));
});
check("Old 11–20 saved games, stars and published chapter remain untouched",()=>{
 for(let i=10;i<20;i++){
  const live=R.levelConfig(i);
  assert(!Object.hasOwn(live,"levelRecipeId"));
  const old=new R.Game(i,null,{seed:21211+i,directorMode:"v4"});
  assert(!old.levelRecipe);
  const snapshot=old.save();
  assert(!Object.hasOwn(snapshot,"levelRecipe"));
  const restored=new R.Game(i,snapshot,{fastRestore:true});
  assert.deepEqual(restored.board,old.board);
  assert.deepEqual(restored.config.goal,old.config.goal);
  assert.throws(()=>new R.Game(i,null,{seed:5,levelRecipe:D.get(i)}),/diagnostic/);
 }
 assert.equal(R.levelConfig(20).name,"Daruma Awakening");
 assert.equal(R.levelConfig(30).goal.type,"sealedStone");
});
console.log("PASS Journey 2.0 Moon Mirror / Wind Garden second-chapter identity tests");
