"use strict";
/* Journey 2.0 Step B: draft only — full real-engine fixtures, immutable catalogue,
 * save isolation, and no accidental changes to published levels 1–100.
 */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const J=require("../harmony/level-architecture.js");
const Draft=require("../harmony/journey-levels-v2.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
check("Ten explicitly authored first-chapter draft recipes",()=>{
 assert.equal(Draft.COUNT,20);
 assert.equal(Draft.FIRST,0);
 const all=Array.from({length:10},(_,i)=>Draft.get(i));
 assert.equal(new Set(all.map(x=>x.id)).size,10);
 assert.deepEqual(all.map(x=>x.goal.type),
  ["fusion","stage3","masterpiece","mist","fusion","fourTurns","pulseHits","mist","stage3","familyMasterpiece"]);
 assert.equal(all[0].goal.count,3);
 assert.equal(all[1].goal.count,1);
 assert.equal(all[2].goal.count,1);
 assert.equal(Draft.get(-1),null);
 assert.equal(Draft.get(20),null);
 assert.equal(Draft.get("1"),null);
 for(const [i,r] of all.entries()){
  assert.equal(r.index,i);
  assert.equal(J.compatible(r).ok,true);
  assert.equal(r.version,2);
  assert.equal(typeof r.starPar,"number");
  assert(r.starPar<r.moves-1);
  assert(r.mechanics.mist.length===0||r.goal.type==="mist");
 }
 const one=Draft.get(3);one.mechanics.mist.push(48);one.goal.count=99;
 assert.deepEqual(Draft.get(3).mechanics.mist,[17,24,31]);
 assert.equal(Draft.get(3).goal.count,3);
});
check("Mechanic sequence teaches only core Fusion, Pulse and Mist",()=>{
 const all=Array.from({length:10},(_,i)=>Draft.get(i));
 const mists=all.map((x,i)=>x.mechanics.mist.length?i+1:null).filter(Boolean);
 assert.deepEqual(mists,[4,8],"Mist should not dominate repeated levels");
 for(const r of all){
  assert.deepEqual(Object.keys(r.mechanics),["mist"]);
  assert(["gentle","standard","challenge"].includes(r.difficulty));
  assert(!r.intro.includes("Bamboo"));
 }
 assert.equal(all[2].goal.type,"masterpiece");
 assert.deepEqual(all[9].goal,{type:"familyMasterpiece",family:"koi",count:2});
 assert.equal(all[9].name,"Koi Masterpiece Finale");
 assert.equal(all[9].moves,40);
 assert.equal(all[9].starPar,17);
});
check("Six seeds per level create real 4-family playable openings and unchanged draft snapshots",()=>{
 for(let i=0;i<10;i++){
  const recipe=Draft.get(i);
  for(const seed of [11,29,53,79,103,127]){
   const game=new R.Game(i,null,{seed,directorMode:i>=9?"v4":"v3",
    journeyDiagnostic:true,levelRecipe:recipe});
   assert.equal(game.familyCount,4);
   assert.equal(game.config.levelArchitectureVersion,2);
   assert.equal(game.config.levelRecipeId,recipe.id);
   assert.deepEqual(game.config.goal,recipe.goal);
   assert.equal(game.config.moves,recipe.moves);
   if(i===9){
    assert.equal(game.goalText(),"Koi masterpieces");
    assert.deepEqual(game.families,["koi","bonsai","sushi","origami"]);
    assert.equal(game.progress(),0);
   }
   assert.equal(game.moves,recipe.moves);
   assert.deepEqual(game.boardMechanics.mist,recipe.mechanics.mist);
   assert.equal(R.scan(game.board).length,0);
   assert(R.validSwaps(game.board).length>=3);
   assert.equal(game.moonMirrors.length,0);
   assert.equal(game.windGarden,null);
   assert.equal(game.hanabiVersion,0);
   assert.equal(game.daruma.filter(Boolean).length,0);
   assert.equal(game.sealed.filter(Boolean).length,0);
   assert.equal(game.mist.filter(Boolean).length,recipe.mechanics.mist.length);
   const saved=game.save();
   const resume=new R.Game(i,saved,{fastRestore:true});
   assert.deepEqual(resume.board,game.board);
   assert.deepEqual(resume.config.goal,game.config.goal);
   assert.deepEqual(resume.boardMechanics,game.boardMechanics);
   assert.deepEqual(resume.mist,game.mist);
   assert.equal(resume.config.name,recipe.name);
   assert.equal(resume.config.starPar,recipe.starPar);
   const swap=R.validSwaps(game.board)[0];
   assert.equal(game.swap(...swap).ok,true);
  }
 }
});
check("Ordinary production 1–100 levels and historical runs remain unaffected",()=>{
 for(let i=0;i<100;i++){
  const config=R.levelConfig(i);
  assert(!Object.hasOwn(config,"levelRecipeId"));
  assert(!Object.hasOwn(config,"levelArchitectureVersion"));
  if(i<10){
   const original=new R.Game(i,null,{seed:20261101+i,directorMode:"v3"});
   assert(!original.levelRecipe);
   assert(!Object.hasOwn(original.save(),"levelRecipe"));
   const resume=new R.Game(i,original.save(),{fastRestore:true});
   assert.deepEqual(resume.board,original.board);
   assert.deepEqual(resume.config.goal,original.config.goal);
  }
 }
 assert.equal(R.levelConfig(0).name,"First Harmony");
 assert.equal(R.levelConfig(4).name,"Harmony Garden");
 assert.equal(R.levelConfig(9).name,"Garden of Harmony");
 assert.equal(R.levelConfig(20).name,"Daruma Awakening");
 assert.equal(R.levelConfig(30).goal.type,"sealedStone");
 assert.equal(R.levelConfig(60).name,"First Hanabi Crate");
});
check("Specific-family Masterpieces must count only the required family",()=>{
 const recipe=Draft.get(9);
 const game=new R.Game(9,null,{seed:20261102+9*197,
  journeyDiagnostic:true,levelRecipe:recipe,directorMode:"v3"});
 const original=game.goalText();
 assert.equal(original,"Koi masterpieces");
 game.masterpieces=2;game.familyMasterpieces={sushi:1,origami:1};
 assert.equal(game.progress(),0,"Wrong-family Masterpieces cannot finish the level");
 assert.equal(game.fulfilled(),false);
 game.familyMasterpieces.koi=1;
 assert.equal(game.progress(),1);
 assert.equal(game.fulfilled(),false);
 game.familyMasterpieces.koi=2;
 assert.equal(game.progress(),2);
 assert.equal(game.fulfilled(),true);
 assert.equal(game.goalText(),original);
});
check("Koi-specific labels remain accurate in the HUD and goal help",()=>{
 const draft=Draft.get(9);
 const game=new R.Game(9,null,{seed:34123,journeyDiagnostic:true,
  levelRecipe:draft,directorMode:"v3"});
 const O=require("../harmony/onboarding.js");
 const Q=require("../harmony/objective-feedback.js");
 assert.equal(O.objective(draft),"2 Koi masterpieces");
 assert.equal(Q.detail(game),"2 Koi masterpieces remaining");
 assert.equal(game.goalText(),"Koi masterpieces");
 game.familyMasterpieces={sushi:4,koi:1};
 assert.equal(Q.detail(game),"1 Koi masterpiece remaining");
 const lantern=R.levelConfig(49);
 assert.equal(O.objective(lantern),"2 Lantern masterpieces");
});
check("Preview cannot be silently enabled in normal gameplay",()=>{
 const recipe=Draft.get(4);
 assert.throws(()=>new R.Game(4,null,{seed:41,levelRecipe:recipe}),/diagnostic/);
 assert.throws(()=>new R.Game(4,null,{seed:41,journeyDiagnostic:true,
  levelRecipe:{...recipe,index:5}}),/index/);
 const game=new R.Game(4,null,{seed:41,journeyDiagnostic:true,levelRecipe:recipe});
 const saved=game.save();
 assert.equal(saved.levelArchitectureVersion,2);
 assert.deepEqual(saved.levelRecipe, J.normalize(recipe));
});
console.log("PASS Journey 2.0 Chapter 1 design draft contracts");
