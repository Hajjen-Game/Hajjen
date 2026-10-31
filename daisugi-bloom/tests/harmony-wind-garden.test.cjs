"use strict";
/* Wind Garden 1.0: actual game integration and isolated deterministic rules. */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const W=require("../harmony/wind-garden.js");
const I=require("../harmony/player-insight.js");
const P=require("../harmony/identity-prototypes.js");
const check=(label,run)=>{run();console.log("PASS "+label);};
const preview=(key,seed=13)=>new R.Game(2,null,{
 seed,directorMode:"v4",windGardenPreview:key
});
const first=g=>g.swap(17,24);
check("three previews begin with at least three legal options and no free matches",()=>{
 for(const key of ["breeze","crossing","tide"]){
  const g=preview(key);assert.equal(R.scan(g.board).length,0);
  const swaps=R.validSwaps(g.board);
  assert(swaps.length>=3);assert(swaps.some(([a,b])=>a===17&&b===24));
  assert.equal(g.config.moves,W.descriptor(key).moves);
  assert.deepEqual(g.windGarden,W.descriptor(key).schedule);
 }
});
check("the wind forecast is visible before a move and not based on wall-clock time",()=>{
 const a=W.descriptor("crossing").schedule;
 assert.deepEqual(W.next(0,a),{inMoves:3,afterMove:3,row:2,direction:"left"});
 assert.deepEqual(W.next(1,a),{inMoves:2,afterMove:3,row:2,direction:"left"});
 assert.deepEqual(W.next(2,a),{inMoves:1,afterMove:3,row:2,direction:"left"});
 assert.deepEqual(W.next(3,a),{inMoves:3,afterMove:6,row:4,direction:"right"});
 assert.deepEqual(W.next(6,a),{inMoves:3,afterMove:9,row:2,direction:"left"});
 assert.deepEqual(W.next(1,W.descriptor("tide").schedule),
  {inMoves:1,afterMove:2,row:3,direction:"left"});
});
check("invalid swap never consumes a move or shifts wind",()=>{
 const g=preview("breeze"),before=g.save();
 const rejected=g.swap(0,48);
 assert.equal(rejected.ok,false);assert.equal(g.moves,before.moves);
 assert.deepEqual(g.board,before.board);
 assert.equal(g.roundTrace.moves.length,0);
 assert.equal(g.roundTrace.rejected.length,1);
});
check("one-cell right rotation changes positions but not object identity or stage",()=>{
 const b=Array.from({length:49},(_,id)=>({id,family:"sakura",stage:id%5+1}));
 const original=JSON.stringify(b),p=W.shift(b,3,"right");
 assert.equal(p.ok,true);assert.equal(p.moved.length,7);
 assert.equal(p.board[21].id,27);assert.equal(p.board[22].id,21);
 assert.equal(p.board[22].stage,b[21].stage);
 assert.equal(JSON.stringify(b),original);
 assert.equal(new Set(p.board.map(x=>x.id)).size,49);
});
check("left rotation wraps the first item to the rightmost cell",()=>{
 const b=Array.from({length:49},(_,id)=>({id,family:"sakura",stage:1}));
 const p=W.shift(b,4,"left");assert.equal(p.ok,true);
 assert.equal(p.board[28].id,29);assert.equal(p.board[34].id,28);
});
check("First Breeze moves row four every second accepted player move",()=>{
 const g=preview("breeze"),oldMoves=g.moves;
 const e=first(g);assert.equal(e.ok,true);
 assert.equal(g.moves,oldMoves-1);assert.equal(g.complete,false);
 assert.equal(e.events.filter(x=>x.type==="wind-shift").length,0);
 assert.deepEqual(W.next(1,g.windGarden),{inMoves:1,afterMove:2,row:3,direction:"right"});
 const next=g.swap(...R.validSwaps(g.board)[0]);
 assert.equal(next.ok,true);
 const winds=next.events.filter(x=>x.type==="wind-shift");
 assert.equal(winds.length,1);
 assert.equal(winds[0].row,3);assert.equal(winds[0].direction,"right");
 assert.equal(winds[0].moved.length,7);
 assert.equal(winds[0].afterMove,2);
 assert.equal(R.scan(g.board).length,0,"Never leave unmelted three-matches behind");
});
check("Crossing Winds alternates two rows every three valid moves",()=>{
 const g=preview("crossing");assert.equal(first(g).ok,true);
 for(let turn=2;turn<=6;turn++){
  const result=g.swap(...R.validSwaps(g.board)[0]);
  assert.equal(result.ok,true);
  const shift=result.events.find(e=>e.type==="wind-shift");
  if(turn===3)assert(shift&&shift.row===2&&shift.direction==="left");
  else if(turn===6)assert(shift&&shift.row===4&&shift.direction==="right");
  else assert.equal(shift,undefined);
  assert.equal(R.scan(g.board).length,0,"Wind must leave a settled puzzle");
 }
});
check("Garden Tide alternates wind direction every two valid decisions",()=>{
 const g=preview("tide"),initial=g.mist.slice(),firstMove=first(g);
 assert.equal(firstMove.events.some(e=>e.type==="wind-shift"),false);
 for(let turn=2;turn<=4;turn++){
  const e=g.swap(...R.validSwaps(g.board)[0]);
  assert.equal(e.ok,true);
  const shift=e.events.find(e=>e.type==="wind-shift");
  if(turn===2)assert(shift&&shift.direction==="left"&&shift.row===3);
  else if(turn===4)assert(shift&&shift.direction==="right"&&shift.row===3);
  else assert.equal(shift,undefined);
  assert.equal(R.scan(g.board).length,0);
 }
 assert.equal(g.mist[32],initial[32],"Wind never moves a Mist overlay");
});
check("wind causes only a controlled extra fusion wave and never freezes aligned matches",()=>{
 const g=preview("breeze");first(g);
 const e=g.swap(...R.validSwaps(g.board)[0]);
 const wind=e.events.findIndex(x=>x.type==="wind-shift");
 assert(wind>=0);
 assert(e.events.slice(wind+1).some(x=>x.type==="fusion"));
 assert.equal(e.events.slice(wind+1).filter(x=>x.type==="fusion").length,1,
  "The authored demo's wind should not restart uncontrolled cascades");
 assert.equal(R.scan(g.board).length,0,"No latent auto matches can be left unresolved");
 assert.equal(g.fusions,
  e.events.filter(x=>x.type==="fusion").reduce((n,x)=>n+x.groups.length,0)+
  g.roundTrace.moves[0].events.filter(x=>x.type==="fusion").reduce((n,x)=>n+x.groups.length,0));
});
check("Wind never moves fixed obstructions, Moon Mirrors or Lotus cargo",()=>{
 const board=Array.from({length:49},(_,id)=>({id,family:"koi",stage:1}));
 for(const family of ["terrain","daruma","sealedStone","lotusSeed","moonMirror"]){
  board[23]={family,stage:0,id:-23};
  const r=W.shift(board,3,"left");
  assert.equal(r.ok,false);assert.equal(r.reason,"fixed-object-in-row");
 }
 board[23]=null;
 assert.equal(W.shift(board,3,"right").reason,"unsettled-row");
});
check("blocked or unsettled wind shift reports no move or hidden refills",()=>{
 const g=new R.Game(2,null,{seed:3337,directorMode:"v4",
  windGarden:{every:1,steps:[{row:3,direction:"right"}]}});
 g.board[21]={id:-21,family:"terrain",stage:0};
 const pair=R.validSwaps(g.board).find(([a,b])=>!([21,22,23,24,25,26,27].includes(a)||[21,22,23,24,25,26,27].includes(b)));
 assert(pair);
 const e=g.swap(...pair);assert.equal(e.ok,true);
 assert(e.events.some(x=>x.type==="wind-blocked"&&x.row===3));
 assert.equal(g.board[21].family,"terrain");
});
check("object and Mist positions remain valid through later moves and Directors",()=>{
 const g=preview("tide"),initial=g.mist.slice();
 first(g);
 for(let i=0;i<5&&!g.complete&&!g.failed;i++){
  const pair=R.validSwaps(g.board)[0];assert(pair);
  assert.equal(g.swap(...pair).ok,true);
  assert.equal(g.board.length,49);
  assert.deepEqual(g.mist,initial.map((v,index)=>index===24?0:v));
  assert(R.validSwaps(g.board).length>0||g.complete);
 }
});
check("Wind schedule and round events survive real save/restore deterministically",()=>{
 const g=preview("crossing");first(g);
 const saved=JSON.parse(JSON.stringify(g.save()));
 const resumed=new R.Game(2,saved);
 assert.deepEqual(resumed.windGarden,g.windGarden);
 assert.equal(resumed.windGardenPreview,"crossing");
 assert.deepEqual(resumed.board,g.board);
 assert.deepEqual(resumed.roundTrace,g.roundTrace);
 assert.equal(resumed.rolls,g.rolls);
 const pair=R.validSwaps(g.board)[0];
 assert.equal(g.swap(...pair).ok,true);assert.equal(resumed.swap(...pair).ok,true);
 assert.deepEqual(JSON.parse(JSON.stringify(resumed.save())),
  JSON.parse(JSON.stringify(g.save())));
});
check("voluntary export reports schedule, direction and real shifted identities",()=>{
 const g=preview("breeze");first(g);
 g.swap(...R.validSwaps(g.board)[0]);
 const report=I.last(g,g.roundTrace,null,null);
 assert.equal(report.preview,"breeze");assert.equal(report.previewType,"wind-garden");
 assert.deepEqual(report.windGarden,g.windGarden);
 assert.equal(report.result.unranked,true);assert.equal(report.result.stars,0);
 const shift=report.round.moves[1].events.find(x=>x.type==="wind-shift");
 assert.equal(shift.row,3);assert.equal(shift.direction,"right");
 assert.equal(shift.moved.length,7);assert(shift.moved.every(x=>Number.isInteger(x.id)));
});
check("normal levels and Moon Mirrors remain untouched by Wind Garden",()=>{
 for(const i of [0,2,20,30,50,60]){
  const g=new R.Game(i,null,{seed:20261031,directorMode:"v4"});
  assert.equal(g.windGarden,null);assert.equal(g.windGardenPreview,null);
  assert.equal(g.config.moves,R.levelConfig(i).moves);
  const move=g.swap(...R.validSwaps(g.board)[0]);
  assert.equal(move.ok,true);
  assert.equal(move.events.filter(x=>x.type.startsWith("wind-")).length,0);
 }
 const mirror=new R.Game(2,null,{seed:20261031,moonMirrorPreview:"spark",directorMode:"v4"});
 assert.equal(mirror.windGarden,null);
 assert.equal(mirror.swap(17,24).ok,true);
});
check("every authored opening is seeded, playable and reproducible",()=>{
 for(const key of ["breeze","crossing","tide"])for(let seed=1;seed<=18;seed++){
  const g=preview(key,seed),copy=preview(key,seed);
  assert.deepEqual(g.board,copy.board);
  assert(R.validSwaps(g.board).some(([a,b])=>a===17&&b===24));
  const played=first(g);assert.equal(played.ok,true);
  assert(g.moves>=0&&g.board.length===49);
  assert.equal(R.scan(g.board).length,0,"Balanced Wind board must be settled");
 }
});
console.log("Wind Garden 1.0 real engine and preview tests passed");
