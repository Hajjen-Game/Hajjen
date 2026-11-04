"use strict";
/* Early Game Difficulty Calibration 3.0 · actual prerequisite objectives.
 * Regression: chapter finale used to win in two moves by collecting two
 * pre-positioned Hanabi rockets, without ever interacting with Moon Mirrors.
 */
const assert=require("node:assert/strict");
const A=require("../harmony/level-architecture.js");
const R=require("../harmony/rules.js");
const Draft=require("../harmony/journey-levels-v2.js");
const O=require("../harmony/onboarding.js");
const Q=require("../harmony/objective-feedback.js");
const check=(title,fn)=>{fn();console.log("PASS "+title);};
const specs={
 6:[["fourTurns",3]],
 7:[["lotus",1],["familyFusion",5,"fan"]],
 8:[["lotus",1],["familyMasterpiece",1,"koi"]],
 9:[["mist",2],["familyFusion",6,"lantern"]],
 11:[["mirrorResonances",3]],12:[["mirrorResonances",4]],
 13:[["mirrorResonances",4]],14:[["mirrorResonances",5]],
 15:[["mirrorResonances",4],["lotus",1]],
 16:[["fourTurns",4]],
 17:[["fourTurns",4],["stage4",5]],
 18:[["mirrorResonances",3]],19:[["fourTurns",5]],
 20:[["mirrorResonances",6],["masterpiece",2]]
};
check("14 revised missions have real independent goals with no changed core tutorial",()=>{
 const matched=[];
 for(let i=0;i<20;i++){
  const x=Draft.get(i),s=specs[i+1];
  assert.equal(A.compatible(x).ok,true, "Recipe valid level "+(i+1));
  if(!s){assert.equal(x.goal.requires,undefined);continue;}
  matched.push(i+1);
  assert.deepEqual(x.goal.requires.map(x=>[x.type,x.count,...(x.family?[x.family]:[])]),s);
  assert(x.intro.length>=80,"Each mixed objective needs a meaningful play hint");
  assert(O.objective(x).includes(" + "),
   "The player must be shown every mandatory subgoal at level "+(i+1));
 }
 assert.equal(matched.length,14);
 assert.deepEqual(Draft.get(9).goal,{type:"familyMasterpiece",family:"koi",count:2});
 assert.equal(Draft.get(4).goal.requires,undefined);
 const original=Draft.get(19),copy=Draft.get(19);
 copy.goal.requires[0].count=99;copy.goal.requires.push({type:"lotus",count:99});
 assert.deepEqual(Draft.get(19),original);
});
check("Every mandatory objective uses an actual game counter and saved descriptor",()=>{
 for(const n of Object.keys(specs).map(Number)){
  const i=n-1,r=Draft.get(i),g=new R.Game(i,null,{
   seed:20261102+i*197,directorMode:"v62",journeyDiagnostic:true,levelRecipe:r});
  assert.deepEqual(g.config.goal,r.goal);
  assert.deepEqual(g.goalParts().map(p=>p.progress),Array(specs[n].length+1).fill(0));
  assert.equal(g.fulfilled(),false);
  assert(g.goalText().includes("+"));
  const snapshot=g.save(),restored=new R.Game(i,snapshot,{fastRestore:true});
  assert.deepEqual(restored.config.goal,g.config.goal);
  assert.deepEqual(restored.goalParts(),g.goalParts());
  assert.equal(restored.fulfilled(),false);
  const swaps=R.validSwaps(g.board);
  assert(swaps.length>=3);
  const before=g.mirrorResonances||0;
  assert.equal(g.swap(...swaps[0]).ok,true);
  assert((g.mirrorResonances||0)-before<=1,
   "Mirror Resonance is limited to one accepted player move");
 }
});
check("Chapter 20 cannot finish after the two rockets, no matter how many points",()=>{
 const r=Draft.get(19);
 const g=new R.Game(19,null,{seed:20261102+19*197,
  directorMode:"v62",journeyDiagnostic:true,levelRecipe:r});
 assert.equal(g.goalText(),"Hanabi + Moon Mirror + Masterpieces");
 assert.equal(O.objective(r),"2 fireworks + 6 Moon Mirror activations + 2 masterpieces");
 assert.equal(Q.detail(g),"Hanabi 0/2 · Mirror activations 0/6 · Masterpieces 0/2");
 g.lotusDelivered=2;g.masterpieces=20;
 assert.equal(g.progress(),2,"Primary Hanabi goal can be complete while other tasks are not");
 assert.equal(g.fulfilled(),false);
 assert.deepEqual(g.goalParts().map(p=>[p.progress,p.count]),
  [[2,2],[0,6],[20,2]]);
 g.mirrorResonances=5;
 assert.equal(g.fulfilled(),false);
 const partial=g.save();
 const restored=new R.Game(19,partial,{fastRestore:true});
 assert.equal(restored.mirrorResonances,5);
 assert.equal(restored.fulfilled(),false);
 assert(Q.detail(restored).includes("Mirror activations 5/6"));
 g.mirrorResonances=6;
 assert.equal(g.fulfilled(),true);
 const old=g.save();
 delete old.mirrorResonances;
 const older=new R.Game(19,old,{fastRestore:true});
 assert.equal(older.goalParts()[1].progress,0,
  "Restoring an old snapshot with no optional resonance count is safe");
 assert.equal(older.fulfilled(),false);
});
check("Mirror credit requires a genuine adjacent player Fusion, never a blast or cascade",()=>{
 const g=new R.Game(10,null,{seed:311,journeyDiagnostic:true,
  levelRecipe:Draft.get(10),directorMode:"v62"});
 const before=g.mirrorResonances;
 const legal=R.validSwaps(g.board)[0];
 assert.equal(g.swap(...legal).ok,true);
 assert(g.mirrorResonances===before||g.mirrorResonances===before+1);
 assert(g.mirrorResonances<=1);
 assert.equal(g.fulfilled(),false);
});
check("Legacy published goals and 1–100 levels have no surprise requirements",()=>{
 for(let i=0;i<100;i++){
  const live=R.levelConfig(i);
  assert.equal(live.goal.requires,undefined);
  const g=new R.Game(i,null,{seed:4242+i});
  assert.equal(g.goalParts().length,1);
  assert.equal(g.progress(),g.goalParts()[0].progress);
  assert.equal(g.fulfilled(),g.progress()>=g.target());
 }
 assert.equal(R.levelConfig(20).name,"Daruma Awakening");
});
console.log("PASS Early Game Difficulty Calibration 3.0 — meaningful skills, no 2-move chapter finale");
