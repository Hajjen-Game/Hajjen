"use strict";
/* Director 6.3 genuinely evaluates unfinished secondary objectives.
 * Existing 6.2 saved rounds must remain deterministic and playable.
 */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const A=require("../harmony/puzzle-architect.js");
const O=require("../harmony/journey-authored-openings.js");
const D=require("../harmony/journey-levels-v2.js");
const D62=require("../harmony/director-v62.js");
const D63=require("../harmony/director-v63.js");
const Afterglow=require("../harmony/omamori-afterglow.js");
const check=(title,fn)=>{fn();console.log("PASS "+title);};
const round=(index,mode="v63",seed=20261105)=>
 A.build(R,O.get(index),{directorMode:mode,seed,recordRound:true});
const ctx=game=>({goal:game.config.goal,goalParts:game.goalParts(),
 mist:game.mist,darumaHealth:game.daruma,sealedHealth:game.sealed,
 blockers:game.config.goal.type==="daruma"?game.daruma:game.sealed,
 lotus:game.lotus,mirrors:game.moonMirrors,wind:game.windGarden,
 objectiveDrought:game.objectiveDrought});

check("All production 21–40 boards can start with 6.3 and preserve their approved recipes",()=>{
 for(let i=20;i<40;i++){
  const g=round(i);
  assert.equal(g.directorMode,"v63");
  assert.equal(g.levelRecipe.id,D.get(i).id);
  assert(R.validSwaps(g.board).length>=3);
  assert.equal(R.scan(g.board).length,0);
  const m=R.validSwaps(g.board)[0];
  assert(g.swap(...m,{decisionMs:2500}).ok);
  const restored=new R.Game(i,g.save(),{fastRestore:true});
  assert.equal(restored.directorMode,"v63");
  assert.deepEqual(restored.board,g.board);
  assert.equal(restored.levelRecipe.id,D.get(i).id);
 }
});

check("Partial obstacle progress and unfinished Hanabi/Masterpiece are individually visible",()=>{
 const g=round(39,"v63",20261105);
 const p=ctx(g),before=JSON.stringify(g.save()),boardBefore=JSON.stringify(g.board);
 const assessment=D63.assess(g.board,p.goal,p,R.validSwaps,R.scan);
 assert.equal(assessment.active,3);
 assert.deepEqual(assessment.components.map(x=>x.type),["sealedStone","lotus","masterpiece"]);
 assert(assessment.components.every(x=>x.remaining>=1));
 assert(Number.isFinite(assessment.multiObjectiveScore));
 assert(assessment.covered>=0&&assessment.covered<=3);
 assert.equal(JSON.stringify(g.board),boardBefore,"Pure assessment may not change board");
 assert.equal(JSON.stringify(g.save()),before,"Pure assessment may not change save or RNG");
 const allComplete={...p,goalParts:p.goalParts.map((x,i)=>({...x,progress:i?x.progress:x.count}))};
 const remaining=D63.opportunities(g.board,allComplete,R.validSwaps,R.scan);
 assert.equal(remaining.active,2,"Completed Stone objective stops receiving Director priority");
 assert.deepEqual(remaining.components.map(x=>x.type),["lotus","masterpiece"]);
});

check("Single-target levels retain Director 6.2's safe selection decision",()=>{
 const g=round(20);
 const c=ctx(g);
 assert.equal(D63.activeGoals(c).length,1);
 const baseline={board:g.board,autoMatches:0},alternatives=[];
 const score=board=>R.validSwaps(board).length;
 const old=D62.choose(baseline,alternatives,score,c,R.validSwaps,R.scan);
 const newer=D63.choose(baseline,alternatives,score,c,R.validSwaps,R.scan);
 assert.strictEqual(newer.selected,old.selected);
 assert.equal(newer.reason,old.reason);
 assert.equal(newer.chosenHealth.legal,old.chosenHealth.legal);
});

check("6.3 cannot accept manufactured automatic matches or throw away real legal moves",()=>{
 const g=round(24);
 const c=ctx(g),baseline={board:g.board,autoMatches:0},saved=JSON.stringify(g.board);
 const candidate={board:g.board.slice(),autoMatches:1};
 const decision=D63.choose(baseline,[candidate],board=>R.validSwaps(board).length,
  c,R.validSwaps,R.scan);
 assert.strictEqual(decision.selected,baseline);
 assert.equal(JSON.stringify(g.board),saved);
 assert(decision.health.active>=2);
 assert(["baseline","retain-multi-goal-routes"].includes(decision.reason));
});

check("Afterglow works on new 6.3 rounds without silently activating old 6.2 rounds",()=>{
 const fresh=Afterglow.fresh();
 assert.equal(Afterglow.activate(fresh,"v63",false,5).activated,true);
 assert.equal(Afterglow.activate(fresh,"v62",false,5).activated,false);
 const g=round(24);
 assert.equal(g.activateOmamoriAfterglow(),true);
 assert.equal(g.omamoriAfterglow.remaining,2);
 assert.equal(g.activateOmamoriAfterglow(),false,"Cannot stack or refresh Afterglow");
 const old=round(24,"v62");
 assert.equal(old.activateOmamoriAfterglow(),false);
});

check("Legacy 6.2 save replays exactly after 6.3 installation",()=>{
 const original=round(24,"v62",20261105),snapshot=original.save();
 const a=new R.Game(24,snapshot,{fastRestore:true});
 const b=new R.Game(24,snapshot,{fastRestore:true});
 assert.equal(a.directorMode,"v62");assert.equal(b.directorMode,"v62");
 const move=R.validSwaps(a.board)[0];
 assert(a.swap(...move,{decisionMs:2100}).ok);
 assert(b.swap(...move,{decisionMs:2100}).ok);
 assert.deepEqual(a.save(),b.save());
});
console.log("PASS Harmony Director 6.3 Multi-Objective Awareness and legacy compatibility");
