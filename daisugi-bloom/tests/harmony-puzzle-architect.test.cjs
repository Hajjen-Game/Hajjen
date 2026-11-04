"use strict";
/* Puzzle Architect 1.0: exact authored openings with real HarmonyRules.Game. */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const A=require("../harmony/puzzle-architect.js");
const D=require("../harmony/journey-levels-v2.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const make=(index,seed=20261104)=>A.create(R,D.get(index),{seed,
 insight:"A spatial mechanic must change how a player plans the next fusion.",
 primarySkill:"Fusion destination control",
 sequence:["Prepare a safe route","Use the mechanic","Create the payoff"]});
check("Blueprints preserve genuine 49-cell authored openings and fixtures",()=>{
 for(const index of [4,9,10,15,17,19]){
  const recipe=D.get(index),bp=make(index,20261104+index);
  assert.equal(bp.version,1);
  assert.equal(bp.opening.grid.length,49);
  assert.equal(bp.opening.provenance,"captured-seed");
  const baseline=A.captured(R,recipe,20261104+index);
  assert.deepEqual(bp.opening.grid,baseline.opening.grid);
  const game=A.build(R,bp,{seed:20261104+index});
  assert.deepEqual(A.cellsOf(game),bp.opening.grid);
  assert.equal(game.config.levelRecipeId,recipe.id);
  assert.equal(R.scan(game.board).length,0);
  assert(R.validSwaps(game.board).length>=3);
  const info=A.inspect(R,bp,{seed:20261104+index});
  assert.equal(info.legalSwaps,R.validSwaps(game.board).length);
  assert.equal(info.opening.length,49);
  assert(info.warnings.some(x=>x.includes("not yet")));
  for(const m of recipe.mechanics.mirrors||[]){
   assert.equal(game.board[m.at]?.family,"moonMirror");
   assert(info.mirrors.some(x=>x.at===m.at));
  }
  for(const at of recipe.mechanics.hanabi?.starts||[]){
   assert.equal(game.board[at]?.family,"lotusSeed");
   assert(info.hanabi.some(x=>x.start===at));
  }
  for(const at of recipe.mechanics.hanabi?.crates||[])
   assert.equal(game.board[at]?.family,"hanabiCrate");
  const snapshot=game.save(),again=new R.Game(index,snapshot,{fastRestore:true});
  assert.deepEqual(again.board,game.board);
  assert.deepEqual(again.config.goal,game.config.goal);
  assert.equal(again.board.length,49);
  const move=R.validSwaps(game.board)[0];
  assert.equal(game.swap(...move).ok,true);
 }
});
check("Different seeds refill an exactly identical authored opening without mutation",()=>{
 const bp=make(19);
 bp.opening.provenance="hand-authored";
 const baseline=JSON.stringify(bp);
 const g1=A.build(R,bp,{seed:21}),g2=A.build(R,bp,{seed:987});
 assert.deepEqual(g1.board,g2.board,"Authored geometry should not change with refill RNG");
 assert.equal(JSON.stringify(bp),baseline);
 assert.equal(g1.seed,21);
 assert.equal(g2.seed,987);
 const bad=A.compatible({...bp,version:17},R);
 assert.equal(bad.ok,false);
});
check("Authoring rejects broken layouts and reserved fixtures without cheating",()=>{
 const bp=make(19);
 assert.throws(()=>A.normalize({...bp,id:"../hack"},R),/id/);
 assert.throws(()=>A.normalize({...bp,insight:"short"},R),/insight/i);
 assert.throws(()=>A.normalize({...bp,sequence:["one"]},R),/sequence/i);
 assert.throws(()=>A.normalize({...bp,opening:{grid:[]}},R),/49/);
 const index=bp.opening.grid.findIndex(x=>x===null);
 assert(index>=0);
 const blocked=JSON.parse(JSON.stringify(bp));
 blocked.opening.grid[index]="koi";
 assert.throws(()=>A.normalize(blocked,R),/fixture/);
 const gap=JSON.parse(JSON.stringify(bp));
 gap.opening.grid[0]=null;
 assert.throws(()=>A.normalize(gap,R),/needs an authored family/);
 const illegal=JSON.parse(JSON.stringify(bp));
 illegal.opening.grid[0]="unknown";
 assert.throws(()=>A.normalize(illegal,R),/Unknown treasure family/);
 const four=make(4);
 const extra=JSON.parse(JSON.stringify(four));
 const foreign=R.families.find(x=>!R.activeFamilies(4,4).includes(x));
 extra.opening.grid[0]=foreign;
 assert.throws(()=>A.normalize(extra,R),/not active/);
 const match=JSON.parse(JSON.stringify(bp));
 // Top-row first three are ordinary cells in this reference layout.
 const family=match.opening.grid[0];
 assert(family);
 match.opening.grid[1]=family;match.opening.grid[2]=family;
 assert.throws(()=>A.build(R,match),/automatic matches/);
});
check("Live level configs and ordinary run saves never acquire a Blueprint field",()=>{
 for(const index of [0,4,10,15,19,60]){
  const original=R.levelConfig(index);
  assert(!Object.hasOwn(original,"opening"));
  const normal=new R.Game(index,null,{seed:20261104+index});
  const s=normal.save();
  assert(!Object.hasOwn(s,"opening"));
  assert(!Object.hasOwn(s,"blueprint"));
  assert(!Object.hasOwn(s,"levelRecipe"));
 }
 const bp=make(10);
 assert.throws(()=>new R.Game(10,null,{levelRecipe:bp.recipe}),/diagnostic/);
});
console.log("PASS Puzzle Architect 1.0 hand-layout safety and playability");
