"use strict";
const assert=require("node:assert/strict"),R=require("../harmony/rules.js");
const D62=require("../harmony/director-v62.js"),B=require("../harmony/board-mechanics.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const make=(level,mode="v62",extra={})=>new R.Game(level,null,
 {seed:20266172,directorMode:mode,...extra});
const save=g=>JSON.parse(JSON.stringify(g.save()));
const context=g=>({goal:g.config.goal,objectiveDrought:g.objectiveDrought,
 lotus:g.lotus,wind:g.windGarden,mirrors:g.moonMirrors,mist:g.mist});
check("6.2 preserves authored level 54 opening and goal",()=>{
 const a=make(53,"v61",{bambooPreview:true}),b=make(53,"v62",{bambooPreview:true});
 assert.deepEqual(a.board,b.board);assert.deepEqual(a.config.goal,b.config.goal);
 assert.equal(b.progress(),0);
});
check("structural first-action outlook is pure, finite and bounded",()=>{
 const g=make(53,"v62",{bambooPreview:true}),before=save(g);
 const a=D62.assess(g.board,g.config.goal,context(g),R.validSwaps,R.scan);
 const b=D62.assess(g.board,g.config.goal,context(g),R.validSwaps,R.scan);
 assert.deepEqual(a,b);assert.deepEqual(save(g),before);
 assert(Number.isFinite(a.objectiveMomentum));assert(Number.isFinite(a.mobilityRisk));
 assert(a.forecastedMoves<=24&&a.independentRoutes<=a.forecastedMoves);
});
check("no artificial free matches can be selected",()=>{
 const g=make(53,"v62",{bambooPreview:true}),base={board:g.board,autoMatches:0};
 const bad={board:g.board.map(p=>p&&({...p})),autoMatches:1};
 assert.equal(D62.choose(base,[bad],()=>0,context(g),R.validSwaps,R.scan).selected,base);
});
check("real v62 refill keeps terrain, trace fields and settled board",()=>{
 for(const [level,extra] of [[53,{bambooPreview:true}],
 [60,{lotusPreview:"garden-route"}],[2,{windGardenPreview:"crossing"}],
 [2,{moonMirrorPreview:"spark"}]]){
  const g=make(level,"v62",extra);
  for(let step=0;step<4&&!g.complete&&!g.failed;step++){
   const pair=R.validSwaps(g.board)[0];assert(pair);
   assert.equal(g.swap(...pair).ok,true);
   assert.equal(R.scan(g.board).length,0);
   for(const at of g.boardMechanics.blocked)assert.deepEqual(g.board[at],B.terrainPiece(at));
   for(const rf of g.roundTrace.moves.at(-1).refills){
    assert.equal(rf.mode,"v62");
    if(rf.spatial){
     assert(Number.isFinite(rf.spatial.after.mobilityRisk));
     assert(Number.isFinite(rf.spatial.after.objectiveMomentum));
     assert(rf.candidates.every(c=>c.excluded||
      Number.isFinite(c.risk)&&Number.isInteger(c.independentRoutes)));
     if(rf.chosen>0)assert.equal(rf.candidates[rf.chosen].autoMatches,0);
    }
   }
  }
 }
});
check("v62 saves replay exactly, older saved modes remain stable",()=>{
 for(const mode of ["v4","v6","v61","v62"]){
  const g=make(53,mode,{bambooPreview:true}),pair=R.validSwaps(g.board)[0];
  assert.equal(g.swap(...pair).ok,true);
  const restored=new R.Game(53,save(g),{fastRestore:true});
  assert.equal(restored.directorMode,mode);assert.deepEqual(restored.board,g.board);
  const next=R.validSwaps(g.board)[0],x=g.swap(...next),y=restored.swap(...next);
  assert.deepEqual(x.events,y.events);
  const a=save(g),b=save(restored);delete a.roundTrace;delete b.roundTrace;
  assert.deepEqual(a,b);
 }
});
console.log("Harmony Director 6.2 tests passed");
