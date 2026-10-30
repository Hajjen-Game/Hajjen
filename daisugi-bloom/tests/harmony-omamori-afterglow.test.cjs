"use strict";
/* Omamori Afterglow 1.0: conservative two-turn refill opportunity boost.
 * No manufactured matches, no new tile families, no extra moves or coins.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js");
const A=require("../harmony/omamori-afterglow.js");
const P=require("../harmony/powers.js");
const H=require("../harmony/save-health.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
check("Policy is bounded, never stacks, and does nothing in other modes",()=>{
 assert.deepEqual(A.fresh(),{version:1,used:false,remaining:0});
 assert.deepEqual(A.normalize({version:1,used:true,remaining:27}),
  {version:1,used:true,remaining:2});
 assert.deepEqual(A.normalize({version:999,used:true,remaining:2}),A.fresh());
 assert.deepEqual(A.activate(A.fresh(),"standard",false,12),
  {state:A.fresh(),activated:false});
 assert.equal(A.activate(A.fresh(),"v4",false,0).activated,false);
 assert.equal(A.activate(A.fresh(),"v4",true,12).activated,false);
 const once=A.activate(A.fresh(),"v4",false,12);
 assert.equal(once.activated,true);
 assert.equal(once.state.remaining,2);
 assert.equal(A.activate(once.state,"v4",false,12).activated,false);
 for(const remaining of [0,1,2]){
  assert(A.bonus({goodMoves:99,strongMoves:99,prospects:99},remaining)<=1.6);
  assert(A.thresholdReduction(remaining)<=.4);
 }
 assert.equal(A.bonus({goodMoves:0,strongMoves:0,prospects:0},2),0);
 assert.equal(A.bonus({goodMoves:3,strongMoves:2,prospects:1},0),0);
});
check("Consumed card triggers only two subsequent valid swaps, including reload",()=>{
 const g=new R.Game(21,null,{seed:221017,directorMode:"v4"});
 const target=g.board.findIndex(p=>p.stage<5&&p.stage>0);
 assert(P.apply(g,"sakura",target).ok);
 assert.equal(g.omamoriAfterglow.used,false,"Power alone does not fake inventory consumption");
 assert.equal(g.activateOmamoriAfterglow(),true);
 assert.equal(g.activateOmamoriAfterglow(),false,"Second card cannot refresh window");
 assert.equal(g.omamoriAfterglow.remaining,2);
 assert(H.validRun({level:21,data:g.save()}));
 const snap=g.save(),restored=new R.Game(21,snap,{fastRestore:true});
 assert.deepEqual(restored.save(),snap);
 const moves=restored.moves;
 const illegal=restored.swap(-1,49);
 assert.equal(illegal.ok,false);
 assert.equal(restored.moves,moves);
 assert.equal(restored.omamoriAfterglow.remaining,2);
 let pair=R.validSwaps(restored.board)[0];
 assert(pair&&restored.swap(...pair).ok);
 assert.equal(restored.omamoriAfterglow.remaining,1);
 assert.equal(restored.afterglowTurnActive,false);
 assert.equal(restored.afterglowRefillTried,false);
 const snapOne=restored.save(),second=new R.Game(21,snapOne,{fastRestore:true});
 assert.equal(second.omamoriAfterglow.remaining,1);
 pair=R.validSwaps(second.board)[0];
 assert(pair&&second.swap(...pair).ok);
 assert.equal(second.omamoriAfterglow.remaining,0);
 assert.equal(second.omamoriAfterglow.used,true);
 assert.equal(second.activateOmamoriAfterglow(),false);
 assert(H.validRun({level:21,data:second.save()}));
});
check("Moon rescue gets the same gentle window but no guaranteed victory",()=>{
 const g=new R.Game(21,null,{seed:9821,directorMode:"v4"});
 g.moves=0;g.failed=true;
 assert(P.apply(g,"tsuki",-1).ok);
 assert.equal(g.moves,3);
 assert.equal(g.activateOmamoriAfterglow(),true);
 assert.equal(g.omamoriAfterglow.remaining,2);
 assert.equal(g.complete,false);
 assert.equal(g.progress()<g.target(),true);
});
check("Non-Director 4 modes and existing non-assisted starts remain unchanged",()=>{
 for(const level of [0,9,10,21,30,40,50,60,61]){
  for(const mode of ["v3","v4"]){
   const game=new R.Game(level,null,{seed:360+level,directorMode:mode});
   assert.deepEqual(game.omamoriAfterglow,A.fresh());
   assert.equal(game.afterglowTurnActive,false);
   assert.equal(game.afterglowRefillTried,false);
   assert.deepEqual(new R.Game(level,game.save(),{fastRestore:true}).omamoriAfterglow,A.fresh());
  }
 }
 const game=new R.Game(21,null,{seed:920,directorMode:"v3"});
 assert.equal(game.activateOmamoriAfterglow(),false);
 assert.deepEqual(game.omamoriAfterglow,A.fresh());
});
check("No free matches, bag / tile preservation, no bonus in refill outside a real move",()=>{
 for(let seed=1;seed<=20;seed++){
  const g=new R.Game(21,null,{seed:seed*1927,directorMode:"v4"});
  const h=new R.Game(21,g.save(),{fastRestore:true});
  assert(g.activateOmamoriAfterglow());
  for(let x=0;x<7;x++){g.board[x]=null;h.board[x]=null;}
  const ids=g.board.filter(Boolean).map(p=>p.id).sort((a,b)=>a-b);
  // Even after activation, idle/background refills cannot use Afterglow.
  g.refillOpportunity();h.refillOpportunity();
  assert.deepEqual(g.board,h.board);
  assert.deepEqual(g.bag,h.bag);
  assert.equal(g.omamoriAfterglow.remaining,2);
  assert.equal(g.board.every(p=>p&&p.stage>=1&&p.stage<=5),true);
  assert.deepEqual(g.board.filter(p=>ids.includes(p.id)).map(p=>p.id).sort((a,b)=>a-b),ids);
 }
});
check("Boost is conservative when genuinely comparing alternative ordinary refills",()=>{
 const baseline=A.bonus({goodMoves:0,strongMoves:0,prospects:0},2);
 const attractive=A.bonus({goodMoves:5,strongMoves:3,prospects:4},2);
 assert.equal(baseline,0);
 assert(attractive>0&&attractive<=1.6);
 assert(A.bonus({goodMoves:5,strongMoves:3,prospects:4},1)<attractive);
 assert(A.thresholdReduction(2)>A.thresholdReduction(1));
 assert(A.thresholdReduction(1)>A.thresholdReduction(0));
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const start=app.indexOf("function commitActivePower(");
 const end=app.indexOf("function confirmPowerTarget(",start);
 assert(start>=0&&end>start);
 const passage=app.slice(start,end);
 assert(passage.indexOf("C.consume(save,id)")>passage.indexOf("P.apply(game,id,at)"));
 assert(passage.indexOf("game.activateOmamoriAfterglow()")>
  passage.indexOf("if(!spent.ok)throw"));
});
console.log("PASS Omamori Afterglow 1.0 — bounded two-decision Director 4 tuning");
