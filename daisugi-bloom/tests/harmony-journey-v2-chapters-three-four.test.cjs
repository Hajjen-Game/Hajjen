"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const D=require("../harmony/journey-levels-v2.js");
const A=require("../harmony/puzzle-architect.js");
const O=require("../harmony/journey-authored-openings.js");

assert.equal(D.COUNT,40);
assert.equal(O.COUNT,15,"Existing first-twenty reference boards must remain intact");
assert.equal(O.CHAPTER_COUNT,20);
const summaries=O.chapterSummary();
assert.deepEqual(summaries.map(x=>x.index),Array.from({length:20},(_,k)=>k+20));
const signatures=new Set();
for(let i=20;i<40;i++){
 const recipe=D.get(i),bp=O.get(i),design=summaries[i-20];
 assert(recipe&&bp&&design,"Missing authored chapter board "+(i+1));
 assert.equal(recipe.index,i);
 assert.equal(recipe.mechanics.mirrors.length,0,"Moon Mirror is parked");
 assert.equal(recipe.mechanics.mist.length,0,"No Wind+Mist visual overlap");
 assert.equal(bp.recipe.id,recipe.id);
 assert.equal(bp.opening.provenance,"hand-authored","No captured-seed fallbacks");
 assert.equal(design.rows.length,7);
 assert(design.rows.every(r=>r.length===7&&/^[A-E-]+$/.test(r)));
 assert.equal(bp.opening.grid.length,49);
 assert.equal(bp.opening.grid.filter(Boolean).length,49-
  recipe.mechanics.daruma.length-recipe.mechanics.sealedStones.length-
  (recipe.mechanics.hanabi?.starts.length||0)-(recipe.mechanics.hanabi?.crates.length||0));
 assert(design.planned.length>=2,"Opening needs two purposeful entry moves");
 const signature=design.rows.join("");
 assert(!signatures.has(signature),"Every opening must be distinct");
 signatures.add(signature);
 for(const seed of [20261104+i*197,24680+i]){
  const game=A.build(R,bp,{seed,recordRound:true,directorMode:"v62"});
  assert.equal(game.config.levelRecipeId,recipe.id);
  assert.equal(game.moves,recipe.moves);
  assert.deepEqual(game.config.goal,recipe.goal);
  assert.deepEqual(A.cellsOf(game),bp.opening.grid,"No procedurally generated opening");
  assert.equal(R.scan(game.board).length,0,"No free Fusion at start");
  const legal=R.validSwaps(game.board);
  assert(legal.length>=3,"No deadlocked opening on "+(i+1));
  assert.equal(game.board.filter(p=>p?.family==="daruma").length,recipe.mechanics.daruma.length);
  assert.equal(game.board.filter(p=>p?.family==="sealedStone").length,recipe.mechanics.sealedStones.length);
  assert.equal(game.board.filter(p=>p?.family==="lotusSeed").length,recipe.mechanics.hanabi?.starts.length||0);
  assert.equal(game.board.filter(p=>p?.family==="hanabiCrate").length,recipe.mechanics.hanabi?.crates.length||0);
  assert.equal(game.traceEnabled,true,"Playtest must record exported turns");
  const saved=game.save(),restored=new R.Game(i,saved);
  assert.deepEqual(restored.board,game.board,"Save/resume board stability");
  assert.equal(restored.config.levelRecipeId,recipe.id);
  let goalDirectedOpenings=0;
  for(const pair of design.planned){
   const hint=R.directedHint(game.board,pair);
   assert(hint,"Every authored opening needs a real Fusion destination");
   const to=hint.to,fixtures=[...recipe.mechanics.daruma,...recipe.mechanics.sealedStones];
   const attacks=fixtures.some(at=>R.neighbors(to).includes(at));
   const cargo=recipe.mechanics.hanabi?.starts.some(at=>at%7===to%7&&to>at);
   const wind=recipe.mechanics.wind?.steps.some(step=>step.row===Math.floor(to/7));
   if(attacks||cargo||wind)goalDirectedOpenings++;
   assert(legal.some(p=>p[0]===pair[0]&&p[1]===pair[1]),
    "Designed opening "+pair+" must be a legal authentic Fusion at level "+(i+1));
   const probe=A.build(R,bp,{seed,directorMode:"v62"});
   assert.equal(probe.swap(...pair).ok,true,"Designed move must run in actual Rules.Game");
  }
  assert(goalDirectedOpenings>=1,"Level "+(i+1)+" must have a real goal-facing opening move");
 }
 const legacy=new R.Game(i,null,{seed:1234});
 assert(!legacy.levelRecipe,"Unpublished chapters must not affect Goshuincho");
 assert(!Object.hasOwn(legacy.save(),"levelRecipe"));
 console.log("PASS level "+(i+1)+" "+recipe.name+" · fixed 7×7 · "+design.planned.length+" verified opening moves");
}
// Level 24 review: the stones move to the actual central column, but
// the board must preserve meaningful choice and not become a free cascade.
{
 const index=23,recipe=D.get(index),bp=O.get(index);
 assert.equal(recipe.name,"Sealed Heart");
 assert.deepEqual(recipe.mechanics.sealedStones,[17,24]);
 const rows=O.chapterSummary().find(x=>x.index===index).rows;
 assert.deepEqual(rows,["DEDECAE","DEDECBD","ABC-ABB","DCD-DDE",
  "BACEAAC","BABCADA","CCBABDE"]);
 const game=A.build(R,bp,{seed:20261104+index*197,directorMode:"v62"});
 assert.equal(R.scan(game.board).length,0);
 assert.equal(R.validSwaps(game.board).length,8,
  "Keep the opening choice count at the original eight legal swaps");
 for(const [from,to,landing,stone] of [[16,23,16,17],[18,25,25,24]]){
  const directed=R.directedHint(game.board,[from,to]);
  assert.equal(directed?.to,landing,"A purposeful Fusion must land beside a stone");
  assert(R.neighbors(landing).includes(stone));
  const trial=A.build(R,bp,{seed:20261104+index*197,directorMode:"v62"});
  assert.equal(trial.swap(from,to).ok,true);
  assert.equal(trial.sealed[stone],3,
   "The authored route must damage its intended Sealed Stone exactly once");
 }
}
console.log("PASS 20 individually authored Journey 2.0 levels 21–40");
