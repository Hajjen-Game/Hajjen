"use strict";
/* Level Architecture 2.0 — new cross-mechanic contracts, no live level changes.
 * A diagnostics-only recipe must actually run through the same real Game.
 */
const assert=require("node:assert/strict");
const J=require("../harmony/level-architecture.js");
const R=require("../harmony/rules.js");
const B=require("../harmony/board-mechanics.js");
const check=(name,run)=>{run();console.log("PASS "+name);};
const recipe=(index,mechanics,goal={type:"fusion",count:12})=>({
 version:2,id:"journey-diagnostic-"+index,index,name:"Architectural Trial "+index,
 subtitle:"Independent mechanic composition",intro:"Test a real board with combined mechanics.",
 moves:38,starPar:17,difficulty:"challenge",goal,mechanics
});
const blockers=recipe(80,{
 daruma:[10],sealedStones:[38],mirrors:[{at:24,direction:"right"}],
 wind:{every:3,steps:[{row:2,direction:"right"}]}
},{type:"sealedStone",count:1});
const hanabi=recipe(82,{
 daruma:[10],mirrors:[{at:25,direction:"right"}],
 hanabi:{starts:[29,33],crates:[43,47]}
},{type:"lotus",count:2});
const bamboo=recipe(86,{
 bamboo:{blocked:[22,26]},mirrors:[{at:24,direction:"right"}],
 wind:{every:3,steps:[{row:4,direction:"left"}]}
});
const openMist=recipe(88,{mist:[12,24,35]},{type:"mist",count:3});
const unsupported=recipe(91,{mist:[12,24],
 wind:{every:3,steps:[{row:3,direction:"right"}]}},{type:"mist",count:2});
function withChanges(base,change){return {...base,...change};}
function assertFixture(game,at,family){
 assert.equal(game.board[at]?.family,family,"Expected "+family+" at "+at);
}
check("Schema v2 compiles chapter-independent configurations without changing base",()=>{
 const base=R.levelConfig(80);
 const snap=JSON.stringify(base);
 const result=J.compile(80,base,blockers);
 assert.equal(JSON.stringify(base),snap);
 assert.equal(result.name,blockers.name);
 assert.equal(result.goal.type,"sealedStone");
 assert.equal(result.moves,38);
 assert.equal(result.starPar,17);
 assert.deepEqual(result.boardMechanics.daruma,[10]);
 assert.deepEqual(result.boardMechanics.sealedStone,[38]);
 assert.deepEqual(result.moonMirrors,[{at:24,direction:"right"}]);
 assert.deepEqual(result.windGarden,blockers.mechanics.wind);
 assert.equal(result.levelArchitectureVersion,2);
 assert.equal(result.levelRecipeId,blockers.id);
 assert.equal(J.compatible(blockers).ok,true);
 assert.equal(J.compile(80,base,blockers).boardMechanics.layout,null);
 const copy=J.normalize(blockers);
 copy.mechanics.daruma.push(2);
 assert.deepEqual(blockers.mechanics.daruma,[10],"Recipe input must not be mutated");
});
check("Missing/ambiguous fixture placement is rejected before play",()=>{
 const cases=[
  withChanges(blockers,{index:81}),
  withChanges(blockers,{version:1}),
  withChanges(blockers,{id:"../../unsafe"}),
  withChanges(blockers,{goal:{type:"fake",count:1}}),
  withChanges(blockers,{starPar:38}),
  recipe(80,{bamboo:{blocked:[24]},mirrors:[{at:24,direction:"right"}]}),
  recipe(80,{daruma:[24],mirrors:[{at:24,direction:"right"}]}),
  recipe(80,{sealedStones:[12],mirrors:[{at:6,direction:"right"}]}),
  recipe(80,{daruma:[10],sealedStones:[10]}),
  recipe(80,{daruma:[10],wind:{every:2,steps:[{row:1,direction:"left"}]}}),
  recipe(80,{hanabi:{starts:[29],crates:[43]},sealedStones:[36]}),
  recipe(80,{hanabi:{starts:[29],crates:[43]},mirrors:[{at:36,direction:"right"}]}),
  recipe(80,{hanabi:{starts:[29],crates:[43]},wind:{every:2,steps:[{row:4,direction:"right"}]}}),
  recipe(80,{hanabi:{starts:[29],crates:[43]},wind:{every:2,steps:[{row:6,direction:"right"}]}}),
  recipe(80,{hanabi:{starts:[29],crates:[43]},mist:[43]}),
  recipe(80,{mist:[24],mirrors:[{at:24,direction:"up"}]}),
  recipe(80,{sealedStones:[24],mist:[24]}),
  recipe(80,{mist:[24]},{type:"mist",count:2}),
  recipe(80,{daruma:[10]},{type:"daruma",count:2}),
  recipe(80,{}, {type:"lotus",count:1}),
  withChanges(blockers,{mechanics:{...blockers.mechanics,typo:[1]}})
 ];
 for(const invalid of cases)assert.throws(()=>J.normalize(invalid,80));
 assert.equal(J.compatible(withChanges(blockers,{version:1})).ok,false);
});
check("Wind and Mist are held apart until explicitly opted in",()=>{
 assert.throws(()=>J.normalize(unsupported),/Wind \+ Mist/);
 const allowed={...unsupported,compatibility:{allowWindMist:true}};
 assert(J.normalize(allowed).compatibility.allowWindMist);
 assert.deepEqual(J.compile(91,R.levelConfig(91),allowed).boardMechanics.mist,[12,24]);
});
check("Hanabi, Mirror and Daruma compile as one coherent recipe",()=>{
 const config=J.compile(82,R.levelConfig(82),hanabi);
 assert.equal(config.hanabiVersion,2);
 assert.deepEqual(config.lotus,{version:1,starts:[29,33],exits:[43,47]});
 assert.deepEqual(config.boardMechanics.daruma,[10]);
 assert.deepEqual(config.moonMirrors,[{at:25,direction:"right"}]);
 assert.deepEqual(config.goal,{type:"lotus",count:2});
});
check("15 real seeded openings preserve every fixture and legal moves",()=>{
 for(const [example,seeds] of [[blockers,[1,7,21,53,91]],[hanabi,[1,7,21,53,91]],[bamboo,[1,7,21,53,91]]]){
  for(const seed of seeds){
   const g=new R.Game(example.index,null,{seed,directorMode:"v63",
    journeyDiagnostic:true,levelRecipe:example});
   const m=example.mechanics;
   for(const at of m.daruma||[])assertFixture(g,at,"daruma");
   for(const at of m.sealedStones||[])assertFixture(g,at,"sealedStone");
   for(const mir of m.mirrors||[])assertFixture(g,mir.at,"moonMirror");
   for(const at of m.bamboo?.blocked||[])assertFixture(g,at,"terrain");
   for(const at of m.hanabi?.starts||[])assertFixture(g,at,"lotusSeed");
   for(const at of m.hanabi?.crates||[])assertFixture(g,at,"hanabiCrate");
   assert.equal(R.scan(g.board).length,0,"No free opening cascades");
   assert(R.validSwaps(g.board).length>=3,"At least three actual valid swaps");
   assert.equal(g.moves,example.moves);
   assert.equal(g.config.levelRecipeId,example.id);
   assert.equal(g.windGarden?.every??0,m.wind?.every??0);
   const snapshot=g.save(),restored=new R.Game(example.index,snapshot,{fastRestore:true});
   assert.deepEqual(restored.board,g.board,"Saved board must be identical");
   assert.deepEqual(restored.config.goal,g.config.goal,"Goal preserved after restore");
   assert.deepEqual(restored.boardMechanics,g.boardMechanics);
   assert.deepEqual(restored.moonMirrors,g.moonMirrors);
   assert.deepEqual(restored.windGarden,g.windGarden);
   assert.deepEqual(restored.lotus,g.lotus);
   assert.equal(restored.config.name,example.name);
   assert.equal(snapshot.levelArchitectureVersion,2);
   assert.equal(snapshot.levelRecipe.index,example.index);
   const action=R.validSwaps(g.board)[0];
   const result=g.swap(...action);
   assert.equal(result.ok,true,"Composite recipe must execute a genuine move");
  }
 }
});
check("No recipe is accepted on live starts or mixed with legacy previews",()=>{
 assert.throws(()=>new R.Game(80,null,{seed:1,levelRecipe:blockers}),/diagnostic/);
 assert.throws(()=>new R.Game(80,null,{seed:1,journeyDiagnostic:true,
  levelRecipe:blockers,moonMirrorPreview:"first"}),/legacy preview/);
 const baseline=new R.Game(80,null,{seed:6128});
 assert(!Object.hasOwn(baseline.save(),"levelRecipe"));
 assert(!Object.hasOwn(baseline.save(),"levelArchitectureVersion"));
 assert(!Object.hasOwn(R.levelConfig(80),"levelRecipeId"));
 assert(!Object.hasOwn(R.levelConfig(60),"levelRecipeId"));
 assert.equal(R.levelConfig(60).name,"First Hanabi Crate");
 const old=baseline.save();
 const restored=new R.Game(80,old,{fastRestore:true});
 assert.deepEqual(restored.board,baseline.board);
 assert.deepEqual(restored.config.goal,baseline.config.goal);
 assert(!restored.levelRecipe);
});
check("A future chapter can use Bamboo but only on explicitly authored boards",()=>{
 const built=J.compile(86,R.levelConfig(86),bamboo);
 assert.deepEqual(built.boardMechanics.blocked,[22,26]);
 assert.equal(built.bambooVersion,1);
 assert.equal(R.levelConfig(86).boardMechanics?.blocked?.length||0,0);
 assert(B.normalize(built.boardMechanics).blocked.length===2);
});
console.log("Level Architecture 2.0 opt-in composition and legacy isolation contracts passed.");
