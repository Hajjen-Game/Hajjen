"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const R=require("../harmony/rules.js");
const D=require("../harmony/journey-levels-v2.js");
const A=require("../harmony/puzzle-architect.js");
const O=require("../harmony/journey-authored-openings.js");

assert.equal(D.COUNT,40);
assert.equal(O.COUNT,15,"Existing first-twenty reference boards must remain intact");
assert.equal(O.CHAPTER_COUNT,20);
// The book now opens these exact approved boards as normal, reward-earning
// progression. Legacy engine defaults remain unchanged for historic saves.
const app=fs.readFileSync(__dirname+"/../harmony/app.js","utf8");
const html=fs.readFileSync(__dirname+"/../index.html","utf8");
assert.match(app,/const OFFICIAL_JOURNEY_LEVELS=40;/);
assert.match(app,/const useJourney=officialJourney\|\|journeyDraftPreview;/);
assert.match(app,/window\.HarmonyJourneyAuthoredOpenings\?\.get\(i\)/);
assert.match(app,/const resumable=canResumeJourneyRun\(stamp\.level\)/);
assert.match(app,/const preview=levelPreview\(stamp\.level,resumable\)/);
assert.match(app,/const r=canResumeJourneyRun\(save\.run\?\.level\)/);
assert.match(html,/app\.js\?v=8\.2\.1-progression-integrity/);
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
 assert(!legacy.levelRecipe,"Default engine must preserve legacy level configs; Goshuincho explicitly selects approved boards");
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
// Level 25 comparison: retain the enjoyable dual-Hanabi + dual-Daruma
// objective, but do not repeat level 16's two perfectly aligned corridors.
{
 const old=D.get(15),recipe=D.get(24),bp=O.get(24);
 assert.deepEqual(old.mechanics.daruma,[15,19]);
 assert.deepEqual(old.mechanics.hanabi.starts,[29,33]);
 assert.deepEqual(recipe.mechanics.daruma,[8,19]);
 assert.deepEqual(recipe.mechanics.hanabi.starts,[15,26]);
 assert.deepEqual(recipe.mechanics.hanabi.crates,[43,47]);
 assert.deepEqual(recipe.goal,{type:"daruma",count:2,
  requires:[{type:"lotus",count:2}]});
 assert.equal(recipe.moves,49);
 const rows=O.chapterSummary().find(x=>x.index===24).rows;
 assert.deepEqual(rows,["DCBEACC","D-AAEBB","A-EBA-C","BBDBD-C",
  "EAECCEB","CEBDBCA","A-ABD-D"]);
 const game=A.build(R,bp,{seed:20261104+24*197,directorMode:"v62"});
 assert.equal(R.scan(game.board).length,0);
 assert(R.validSwaps(game.board).length>=6,"The two-lane puzzle needs route choices");
 for(const pair of [[29,36],[33,40]]){
  assert(R.validSwaps(game.board).some(x=>x[0]===pair[0]&&x[1]===pair[1]));
  const route=R.directedHint(game.board,pair);
  assert(route&&recipe.mechanics.hanabi.starts.some(start=>
   start%7===route.to%7&&route.to>start),
   "Both original satisfying launch-lane openings must remain possible");
  const trial=A.build(R,bp,{seed:20261104+24*197,directorMode:"v62"});
  assert.equal(trial.swap(...pair).ok,true);
 }
}
// Level 27: verify the requested center rocket and that no legitimate
// opening followed by a second legitimate move can launch any firework.
// Test the real gravity/refill/Director path, not a geometric approximation.
{
 const index=26,recipe=D.get(index),bp=O.get(index);
 assert.equal(recipe.name,"Hanabi Triad");
 assert.deepEqual(recipe.mechanics.hanabi.starts,[8,19,24]);
 assert.deepEqual(recipe.mechanics.hanabi.crates,[43,45,47]);
 assert.deepEqual(recipe.goal,{type:"lotus",count:3,
  requires:[{type:"masterpiece",count:1}]});
 const design=O.chapterSummary().find(x=>x.index===index);
 assert.deepEqual(design.rows,["ACACBAA","D-BBECE","AABEB-A",
  "DDC-CDC","ABABACE","EAEDCEA","E-E-B-A"]);
 assert.deepEqual(design.planned,[[10,17],[26,33],[29,36]]);
 for(const seed of [20261104+index*197,20261125+index*197]){
  const start=A.build(R,bp,{seed,directorMode:"v62"});
  assert.equal(start.lotusDelivered,0);
  assert.equal(start.board[8]?.family,"lotusSeed");
  assert.equal(start.board[19]?.family,"lotusSeed");
  assert.equal(start.board[24]?.family,"lotusSeed");
  assert.equal(start.board[45]?.family,"hanabiCrate");
  const firstMoves=R.validSwaps(start.board);
  assert(firstMoves.length>=3);
  const snapshot=start.save();
  let searched=0;
  for(const first of firstMoves){
   const afterFirst=new R.Game(index,snapshot,{fastRestore:true});
   assert.equal(afterFirst.swap(...first).ok,true);
   assert.equal(afterFirst.lotusDelivered,0,
    "Level 27 launched after one move: "+first+" seed "+seed);
   const secondSnapshot=afterFirst.save();
   for(const second of R.validSwaps(afterFirst.board)){
    const afterSecond=new R.Game(index,secondSnapshot,{fastRestore:true});
    assert.equal(afterSecond.swap(...second).ok,true);
    searched++;
    assert.equal(afterSecond.lotusDelivered,0,
     "Level 27 launched in only two moves: "+first+" then "+second+
     " seed "+seed);
   }
  }
  assert(searched>0,"Must exercise genuine two-turn branches");
  console.log("PASS level 27 seed "+seed+": "+firstMoves.length+
   " opening swaps and "+searched+" two-turn paths without early fireworks");
 }
}
// Level 28 user playtest change (November 4): two marked tiles on
// row 5, columns 4 and 5 become genuine four-hit Sealed Stones.
{
 const index=27,recipe=D.get(index),bp=O.get(index);
 assert.equal(recipe.name,"Awakening Circle");
 assert.deepEqual(recipe.mechanics.sealedStones,[16,17,24,31,32]);
 assert.deepEqual(recipe.goal,{type:"sealedStone",count:5});
 assert.equal(recipe.moves,52,"Keep the original move budget for the first playtest");
 const expected=["DEECDAA","AABEDBB","BD--BEA","BBD-DEE",
  "AAB--DD","ACBBADC","CCECECE"];
 const design=O.chapterSummary().find(x=>x.index===index);
 assert.deepEqual(design.rows,expected);
 assert.deepEqual(design.planned,[[22,23],[18,25]]);
 for(const seed of [20261104+index*197,20261125+index*197]){
  const game=A.build(R,bp,{seed,directorMode:"v62",recordRound:true});
  assert.equal(game.config.goal.count,5);
  assert.equal(game.board.filter(p=>p?.family==="sealedStone").length,5);
  assert.equal(R.scan(game.board).length,0);
  assert(R.validSwaps(game.board).length>=3);
  for(const at of [16,17,24,31,32]){
   assert.equal(game.board[at]?.family,"sealedStone");
   assert.equal(game.sealed[at],4,"Each new and existing Stone needs four hits");
  }
  assert.equal(game.board[30]?.family!=="sealedStone",true);
  assert.equal(game.board[33]?.family!=="sealedStone",true);
  const legal=R.validSwaps(game.board);
  for(const pair of [[22,23],[18,25]]){
   assert(legal.some(x=>x[0]===pair[0]&&x[1]===pair[1]),
    "Keep the original two strategic opening moves");
   const trial=A.build(R,bp,{seed,directorMode:"v62"});
   assert.equal(trial.swap(...pair).ok,true);
  }
  const restored=new R.Game(index,game.save(),{fastRestore:true});
  assert.deepEqual(restored.sealed,game.sealed);
 }
}
console.log("PASS 20 individually authored Journey 2.0 levels 21–40");
