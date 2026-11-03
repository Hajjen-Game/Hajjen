"use strict";
/* Japanese Harmony Journey 2.0: deliberate early identity.
 * Keep the old teaching section (1–4) and the tested Koi finale (10),
 * introduce Hanabi on 5, Mirror on 11, Wind on 16.
 */
const assert=require("node:assert/strict");
const Rules=require("../harmony/rules.js");
const Architecture=require("../harmony/level-architecture.js");
const Draft=require("../harmony/journey-levels-v2.js");
const Hanabi=require("../harmony/hanabi-crate.js");
const check=(name,test)=>{test();console.log("PASS "+name);};
const seeds=[11,29,53,79,103,127];
check("Twenty independent recipes retain the first four and Koi finale",()=>{
 assert.equal(Draft.COUNT,20);
 assert.equal(Draft.FIRST,0);
 assert.deepEqual(Array.from({length:4},(_,i)=>Draft.get(i).goal.type),
  ["fusion","stage3","masterpiece","mist"]);
 const koi=Draft.get(9);
 assert.equal(koi.id,"journey2-koi-masterpiece-finale");
 assert.deepEqual(koi.goal,{type:"familyMasterpiece",family:"koi",count:2});
 assert.equal(koi.moves,40);assert.equal(koi.starPar,17);
 assert.equal(Draft.get(-1),null);assert.equal(Draft.get(20),null);
 assert.equal(Draft.get("5"),null);
 assert.equal(new Set(Draft.summary().map(x=>x.name)).size,20);
 for(let i=0;i<20;i++){
  const recipe=Draft.get(i);
  assert.equal(recipe.index,i);
  assert.equal(Architecture.compatible(recipe).ok,true);
  assert(recipe.starPar<recipe.moves-1);
 }
 const before=Draft.get(19),copy=Draft.get(19);
 copy.mechanics.mirrors[0].at=47;copy.mechanics.hanabi.starts[0]=3;
 copy.goal.count=45;
 assert.deepEqual(Draft.get(19),before);
 const wind=Draft.get(17),edited=Draft.get(17);
 edited.mechanics.wind.steps[0].row=6;
 assert.deepEqual(Draft.get(17),wind);
});
check("Hanabi appears before Mirror and Wind; Daruma/Stone remain later",()=>{
 const f=Array.from({length:20},(_,i)=>Draft.get(i));
 assert.deepEqual(f.map((r,i)=>r.mechanics.hanabi?i+1:null).filter(Boolean),
  [5,6,7,8,9,13,15,17,20]);
 assert.equal(f.findIndex(r=>r.mechanics.mirrors.length)+1,11);
 assert.equal(f.findIndex(r=>r.mechanics.wind)+1,16);
 assert.equal(f.findIndex(r=>r.mechanics.daruma.length),-1);
 assert.equal(f.findIndex(r=>r.mechanics.sealedStones?.length),-1);
 for(const r of f){
  assert(!(r.mechanics.wind&&r.mechanics.mist.length),
   "Wind + Mist is intentionally excluded from early identity");
  assert(!r.mechanics.bamboo?.blocked?.length);
 }
 assert.deepEqual(f[4].goal,{type:"lotus",count:1});
 assert.deepEqual({type:f[5].goal.type,count:f[5].goal.count},{type:"lotus",count:2});
 assert.deepEqual({type:f[6].goal.type,count:f[6].goal.count},{type:"mist",count:4});
 assert.deepEqual({type:f[7].goal.type,count:f[7].goal.count},{type:"masterpiece",count:2});
 assert.deepEqual({type:f[8].goal.type,count:f[8].goal.count},{type:"lotus",count:2});
 assert.equal(f[10].name,"First Moon Mirror");
 assert.equal(f[15].name,"First Wind Garden");
});
check("Hanabi accepts a four-family opening without invalid treasures",()=>{
 const families=["sakura","lantern","koi","fan"];
 const board=Array.from({length:49},(_,i)=>({family:families[i%4],stage:1,id:i+1}));
 Hanabi.opening(board,families);
 assert(board.every(p=>families.includes(p.family)), "Four-family board needs no fifth sprite");
 assert.throws(()=>Hanabi.opening(board,["sakura","lantern","koi"]),/four/);
});
check("60 seeded early-level games have genuine sprites, legal swaps, safe saves",()=>{
 for(let i=0;i<10;i++){
  const recipe=Draft.get(i);
  for(const seed of seeds){
   const options={seed,directorMode:i>=4&&i!==9?"v62":i===9?"v4":"v3",
    journeyDiagnostic:true,levelRecipe:recipe};
   const g=new Rules.Game(i,null,options);
   assert.equal(g.familyCount,4);
   assert.equal(new Set(g.families).size,4);
   assert.equal(g.config.levelRecipeId,recipe.id);
   assert.deepEqual(g.config.goal,recipe.goal);
   assert.equal(g.config.starPar,recipe.starPar);
   assert.equal(g.moves,recipe.moves);
   assert.equal(Rules.scan(g.board).length,0);
   assert(Rules.validSwaps(g.board).length>=3);
   assert.deepEqual(g.boardMechanics.mist,recipe.mechanics.mist);
   assert.equal(g.mist.filter(Boolean).length,recipe.mechanics.mist.length);
   assert.equal(g.daruma.filter(Boolean).length,0);
   assert.equal(g.sealed.filter(Boolean).length,0);
   assert.equal(g.moonMirrors.length,0);assert.equal(g.windGarden,null);
   if(recipe.mechanics.hanabi){
    assert.equal(g.hanabiVersion,2);
    assert.deepEqual(g.lotus.starts,recipe.mechanics.hanabi.starts);
    assert.deepEqual(g.lotus.exits,recipe.mechanics.hanabi.crates);
    for(const at of recipe.mechanics.hanabi.starts)
     assert.equal(g.board[at]?.family,"lotusSeed");
    for(const at of recipe.mechanics.hanabi.crates)
     assert.equal(g.board[at]?.family,"hanabiCrate");
    assert(g.board.every(p=>!p||!p.family||g.families.includes(p.family)||
     ["lotusSeed","hanabiCrate"].includes(p.family)),
     "Early Hanabi must never insert an undefined or fifth family");
   }else assert.equal(g.hanabiVersion,0);
   if(i===9){
    assert.equal(g.goalText(),"Koi masterpieces");
    assert.deepEqual(g.families,["koi","bonsai","sushi","origami"]);
   }
   const saved=g.save(),resumed=new Rules.Game(i,saved,{fastRestore:true});
   assert.deepEqual(resumed.board,g.board);
   assert.deepEqual(resumed.lotus,g.lotus);
   assert.deepEqual(resumed.mist,g.mist);
   assert.deepEqual(resumed.config.goal,g.config.goal);
   const move=Rules.validSwaps(g.board)[0];
   assert.equal(g.swap(...move).ok,true);
   assert.equal(g.moves,recipe.moves-1);
  }
 }
});
check("Specific-family Masterpieces count only the required Koi",()=>{
 const r=Draft.get(9),g=new Rules.Game(9,null,{seed:289,
  journeyDiagnostic:true,levelRecipe:r,directorMode:"v4"});
 assert.equal(g.goalText(),"Koi masterpieces");
 g.masterpieces=4;g.familyMasterpieces={sushi:2,koi:0};
 assert.equal(g.progress(),0);
 g.familyMasterpieces.koi=1;assert.equal(g.fulfilled(),false);
 g.familyMasterpieces.koi=2;assert.equal(g.fulfilled(),true);
 const O=require("../harmony/onboarding.js");
 assert.equal(O.objective(r),"2 Koi masterpieces");
});
check("Production 1–100 and previous normal saves do not silently adopt new drafts",()=>{
 for(let i=0;i<100;i++){
  const original=Rules.levelConfig(i);
  assert(!Object.hasOwn(original,"levelRecipeId"));
  assert(!Object.hasOwn(original,"levelArchitectureVersion"));
 }
 for(const i of [0,4,5,8,9,10,11,15,16,19,20]){
  const normal=new Rules.Game(i,null,{seed:20261103+i,directorMode:"v4"});
  assert(!normal.levelRecipe);
  const saved=normal.save();
  assert(!Object.hasOwn(saved,"levelRecipe"));
  const restored=new Rules.Game(i,saved,{fastRestore:true});
  assert.deepEqual(restored.board,normal.board);
  assert.deepEqual(restored.config.goal,normal.config.goal);
 }
 for(const i of [4,10,15]){
  assert.throws(()=>new Rules.Game(i,null,{seed:42,levelRecipe:Draft.get(i)}),/diagnostic/);
 }
 assert.equal(Rules.levelConfig(4).name,"Harmony Garden");
 assert.equal(Rules.levelConfig(9).name,"Garden of Harmony");
 assert.equal(Rules.levelConfig(20).name,"Daruma Awakening");
});
console.log("PASS Journey 2.0 early-identity four-family and legacy isolation tests");
