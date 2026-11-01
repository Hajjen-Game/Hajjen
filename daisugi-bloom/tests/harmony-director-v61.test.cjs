"use strict";
/* Harmony Director 6.1 — player-agency, strategic reachability and compatibility.
   All tests execute original production Rules, not mocked fusion engines.
 */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const D6=require("../harmony/director-v6.js");
const D61=require("../harmony/director-v61.js");
const B=require("../harmony/board-mechanics.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const make=(level,mode="v61",seed=20266172,extra={})=>
 new R.Game(level,null,{seed,directorMode:mode,...extra});
const plain=g=>JSON.parse(JSON.stringify(g.save()));
const context=g=>({goal:g.config.goal,objectiveDrought:g.objectiveDrought,
 lotus:g.lotus,wind:g.windGarden,mirrors:g.moonMirrors,mist:g.mist});
const assess=g=>D61.assess(g.board,g.config.goal,context(g),R.validSwaps,R.scan);
const move=g=>{const p=R.validSwaps(g.board)[0];assert(p,"no legal moves");const result=g.swap(...p);
 assert.equal(result.ok,true);return result;};
check("v6 saved rounds preserve their old mode and D6 evaluation",()=>{
 const g=make(53,"v6",20266172,{bambooPreview:true});
 const board=JSON.stringify(g.board);
 const old=D6.evaluate(g.board,g.config.goal,context(g),R.validSwaps,R.scan);
 const future=D61.assess(g.board,g.config.goal,context(g),R.validSwaps,R.scan);
 assert.equal(JSON.stringify(g.board),board);
 assert.equal(old.legal,future.legal);
 const restored=new R.Game(53,plain(g),{fastRestore:true});
 assert.equal(restored.directorMode,"v6");
 assert.equal(D6.evaluate(restored.board,restored.config.goal,context(restored),R.validSwaps,R.scan).score,old.score);
});
check("6.1 starts on the identical authored Bamboo level 54, not a gifted board",()=>{
 const a=make(53,"v6",20266172,{bambooPreview:true});
 const b=make(53,"v61",20266172,{bambooPreview:true});
 assert.deepEqual(a.board,b.board);
 assert.deepEqual(a.config.goal,b.config.goal);
 assert.deepEqual(a.boardMechanics,b.boardMechanics);
 assert.equal(b.config.moves,46);
 assert.equal(b.progress(),0);
 assert.equal(b.directorMode,"v61");
});
check("6.1 geometry never counts more supported channels than exist",()=>{
 for(const [level,extra] of [[53,{bambooPreview:true}],[59,{bambooPreview:true}],
 [60,{lotusPreview:"garden-route"}],[2,{moonMirrorPreview:"mist"}]]){
  const g=make(level,"v61",20261031+level*97,extra);
  for(let k=0;k<5&&!g.complete&&!g.failed;k++){
   const h=assess(g);assert(h.channels>=h.supportedChannels);
   assert(h.channels>=h.viableChannels);
   assert(h.supportedChannels>=0);
   assert(Number.isFinite(h.objectiveReachability));
   assert(Number.isFinite(h.strategic));
   move(g);
  }
 }
});
check("6.1 assessment mutates neither piece identity nor RNG nor telemetry",()=>{
 const g=make(53,"v61",20266172,{bambooPreview:true});
 const save=plain(g);
 const a=assess(g),b=assess(g);
 assert.deepEqual(a,b);
 assert.deepEqual(plain(g),save);
});
check("stage-four plus related unobstructed family is an actual strategic asset",()=>{
 const g=make(53,"v61",20266172,{bambooPreview:true});
 // Establish the same-family companions in existing movable cells, without
 // faking a legal match or asking the Director to create a treasure.
 const board=g.board.map(x=>({...x}));
 board[0]={...board[0],family:"bonsai",stage:4};
 board[1]={...board[1],family:"bonsai",stage:1};
 board[7]={...board[7],family:"koi",stage:1};
 const near=D61.assess(board,{type:"pulseHits",count:7},context(g),R.validSwaps,R.scan);
 const isolated=board.map(x=>({...x}));isolated[1].family="ryu";
 const far=D61.assess(isolated,{type:"pulseHits",count:7},context(g),R.validSwaps,R.scan);
 assert(near.anchorScore>far.anchorScore,"Near stage-four partner should improve strategic reach");
 assert.equal(g.board[0].stage,1,"The real engine must remain unchanged");
});
check("Director chooses a real unmodified refill, and its trace explains strategic selection",()=>{
 const g=make(53,"v61",20266172,{bambooPreview:true});
 const e=g.swap(27,26);assert.equal(e.ok,true);
 const trace=g.roundTrace.moves.at(-1);
 assert(trace.refills?.length>0);
 for(const rf of trace.refills){
  assert.equal(rf.mode,"v61");
  if(rf.spatial){
   const h=rf.spatial.after;
   assert(Number.isFinite(h.strategic));
   assert(Number.isFinite(h.objectiveReachability));
   assert(h.supportedChannels<=h.channels);
   assert(rf.candidates.every(c=>c.excluded||
    Number.isFinite(c.reachability)&&Number.isInteger(c.strategicMoves)));
  }
 }
 assert.equal(R.scan(g.board).length,0);
 for(const at of g.boardMechanics.blocked)assert.deepEqual(g.board[at],B.terrainPiece(at));
});
check("candidate selection rejects free cascades and zero legal moves",()=>{
 const g=make(53,"v61",20266172,{bambooPreview:true}),base={board:g.board,autoMatches:0};
 const bad={board:g.board.map(p=>({...p})),autoMatches:1};
 const score=()=>0;
 const result=D61.choose(base,[bad],score,context(g),R.validSwaps,R.scan);
 assert.equal(result.selected,base);
});
check("saved 6.1 puzzle replays identically without altering already earned progress",()=>{
 for(const [level,extra] of [[53,{bambooPreview:true}],[60,{lotusPreview:"garden-route"}],
 [2,{windGardenPreview:"crossing"}],[2,{moonMirrorPreview:"spark"}]]){
  const g=make(level,"v61",20261031+level*97,extra);
  move(g);
  const restored=new R.Game(level,plain(g),{fastRestore:true});
  assert.equal(restored.directorMode,"v61");
  assert.deepEqual(restored.board,g.board);
  const p=R.validSwaps(g.board)[0];
  const x=g.swap(...p),y=restored.swap(...p);
  assert.equal(x.ok,true);assert.equal(y.ok,true);
  assert.deepEqual(x.events,y.events);
  const a=plain(g),b=plain(restored);
  delete a.roundTrace;delete b.roundTrace;
  assert.deepEqual(a,b);
 }
});
check("legacy old-mode saved rounds stay unchanged",()=>{
 for(const mode of ["v3","v4","v6"]){
  const g=make(53,mode,20266172,{bambooPreview:true});
  const save=plain(g),restored=new R.Game(53,save,{fastRestore:true});
  assert.equal(restored.directorMode,mode);
  const p=R.validSwaps(g.board)[0];
  assert.deepEqual(g.swap(...p).events,restored.swap(...p).events);
 }
});
console.log("Harmony Director 6.1 pure strategic reachability, identity, saved runs, and fixed-board tests passed");
