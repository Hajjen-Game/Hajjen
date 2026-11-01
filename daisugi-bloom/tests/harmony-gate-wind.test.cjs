"use strict";
/* Gate of Echoes 1.1: real Bamboo geometry, real Wind, safe migration. */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const W=require("../harmony/wind-garden.js");
const B=require("../harmony/board-mechanics.js");
const Bamboo=require("../harmony/bamboo-paths.js");
const Insight=require("../harmony/player-insight.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const make=(overrides={})=>new R.Game(53,null,
 {seed:20266172,directorMode:"v62",bambooPreview:true,...overrides});
const snapshot=g=>JSON.parse(JSON.stringify(g.save()));
const play=g=>g.swap(...R.validSwaps(g.board)[0]);
check("level 54 has a scheduled bottom-row Wind but the same original puzzle",()=>{
 const g=make(),control=make({windGarden:null});
 assert.deepEqual(g.windGarden,{every:3,steps:[{row:6,direction:"right"}]});
 assert.equal(g.config.moves,46);
 assert.deepEqual(g.config.goal,{type:"pulseHits",count:7});
 assert.deepEqual(g.board,control.board);
 assert.deepEqual(g.boardMechanics,control.boardMechanics);
 assert.deepEqual(g.boardMechanics.blocked,[8,12,16,18,30,32,36,40]);
 assert.equal(control.windGarden,null);
 for(const level of [0,50,52,54,57,59,60])
  assert.equal(new R.Game(level,null,{seed:20266172,directorMode:"v62"}).windGarden,null);
});
check("real Wind appears every third valid move and only rotates bottom row",()=>{
 const g=make();
 for(let turn=1;turn<=6;turn++){
  const e=play(g);assert.equal(e.ok,true);
  const shifts=e.events.filter(x=>x.type==="wind-shift");
  assert.equal(shifts.length,turn%3===0?1:0,"turn "+turn);
  if(shifts.length){
   const shift=shifts[0];
   assert.equal(shift.row,6);assert.equal(shift.direction,"right");
   assert.equal(shift.afterMove,turn);
   assert.deepEqual(shift.moved.map(x=>x.to),[43,44,45,46,47,48,42]);
   assert(shift.moved.every(x=>Number.isInteger(x.id)));
  }
  assert.equal(R.scan(g.board).length,0);
  for(const at of g.boardMechanics.blocked)
   assert.deepEqual(g.board[at],B.terrainPiece(at));
 }
});
check("invalid actions never advance the Wind timer",()=>{
 const g=make(),before=snapshot(g);
 assert.equal(g.swap(0,48).ok,false);
 assert.equal(g.moves,before.moves);
 assert.deepEqual(g.board,before.board);
 assert.equal(g.roundTrace.moves.length,0);
 assert.deepEqual(W.next(0,g.windGarden),{inMoves:3,afterMove:3,row:6,direction:"right"});
});
check("old wind-free save resumes with its original rules and description",()=>{
 const original=make({windGarden:null});assert(play(original).ok);
 const restored=new R.Game(53,snapshot(original),{fastRestore:true});
 assert.equal(restored.windGarden,null);
 assert.equal(restored.config.subtitle,"Create Harmony in the passage");
 assert.equal(restored.config.intro,Bamboo.GATE_LEGACY_INTRO);
 assert.deepEqual(restored.board,original.board);
 const pair=R.validSwaps(original.board)[0];
 assert.deepEqual(original.swap(...pair).events,restored.swap(...pair).events);
});
check("new round replays and exports its Wind after save/restore",()=>{
 const g=make();for(let i=0;i<4;i++)assert(play(g).ok);
 const restored=new R.Game(53,snapshot(g),{fastRestore:true});
 assert.deepEqual(restored.windGarden,g.windGarden);
 assert.deepEqual(W.next(g.config.moves-g.moves,g.windGarden),
  W.next(restored.config.moves-restored.moves,restored.windGarden));
 const pair=R.validSwaps(g.board)[0];
 assert.deepEqual(g.swap(...pair).events,restored.swap(...pair).events);
 const report=Insight.last(g,g.roundTrace,null,null);
 assert.equal(report.previewType,"bamboo-paths");
 assert.deepEqual(report.windGarden,g.windGarden);
 assert(report.round.moves.some(m=>m.events.some(e=>e.type==="wind-shift"&&e.row===6)));
});
console.log("Gate of Echoes Wind × Bamboo 1.1 tests passed");
