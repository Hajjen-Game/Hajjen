"use strict";
/* Board Mechanics Foundation 1.0: no chapter 1–5 difficulty changes. */
const assert=require("node:assert/strict");
const B=require("../harmony/board-mechanics.js");
const R=require("../harmony/rules.js");
const H=require("../harmony/save-health.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const coord=i=>[Math.floor(i/7),i%7];
check("All three hand-designed layout templates are valid 7x7 masks",()=>{
 assert.deepEqual(Object.keys(B.PRESETS),["templeGate","twinGardens","centralShrine"]);
 for(const [name,rows] of Object.entries(B.PRESETS)){
  assert.equal(rows.length,7,name);
  const a=B.normalize({layout:name});
  assert(a.blocked.length>=4&&a.blocked.length<=16);
  assert.equal(new Set(a.blocked).size,a.blocked.length);
  for(const i of a.blocked)assert.equal(rows[coord(i)[0]][coord(i)[1]],"#");
 }
});
check("Independent mechanisms are validated without modifying the level objective",()=>{
 const d=B.normalize({layout:"twinGardens",mist:[9,20],daruma:[8],sealedStone:[11]});
 assert.deepEqual(d.mist,[9,20]);
 assert.deepEqual(d.daruma,[8]);
 assert.deepEqual(d.sealedStone,[11]);
 assert.deepEqual(B.normalize(d),d);
 assert.throws(()=>B.normalize({layout:"unknown"}),/Unknown board layout/);
 assert.throws(()=>B.normalize({blocked:[-1]}),/Invalid blocked index/);
 assert.throws(()=>B.normalize({mist:[1,1]}),/Duplicate mist index/);
 assert.throws(()=>B.normalize({blocked:[9],daruma:[9]}),/closed tile/);
 assert.throws(()=>B.normalize({daruma:[8],sealedStone:[8]}),/overlap/);
 assert.throws(()=>B.normalize({version:99}),/version/);
});
check("Unchanged chapters 1–5 and generated level 61 retain opening boards",()=>{
 for(const level of [0,1,9,10,15,20,25,30,35,40,49,60]){
  const before=new R.Game(level,null,{seed:8744+level});
  const after=new R.Game(level,null,{seed:8744+level,boardMechanics:{}});
  assert.deepEqual(before.board,after.board,"Initial board differs at level "+(level+1));
  assert.deepEqual(before.config.goal,after.config.goal);
  assert.equal(before.boardMechanics.blocked.length,0);
  assert.equal(before.board.length,49);
  assert(before.board.every(x=>x.family!=="terrain"));
  assert(R.validSwaps(before.board).length>=3);
 }
});
check("Closed tiles remain fixed, survive refill/shuffle and never consume moves",()=>{
 for(const name of Object.keys(B.PRESETS)){
  for(const seed of [1050,2031,4032]){
   const g=new R.Game(50,null,{seed,boardMechanics:{layout:name}});
   const closed=g.boardMechanics.blocked;
   assert(closed.length>0&&g.board.length===49);
   for(const at of closed){
    assert.deepEqual(g.board[at],B.terrainPiece(at));
    assert.equal(g.board[at].stage,0);
   }
   assert(R.validSwaps(g.board).length>=3);
   assert.equal(R.scan(g.board).length,0);
   const marker=closed[0],adj=R.neighbors(marker)[0],turns=g.moves;
   const refused=g.swap(marker,adj);
   assert.equal(refused.ok,false);assert.equal(g.moves,turns);
   assert.match(refused.reason,/Closed garden/);
   for(let move=0;move<4;move++){
    const pair=R.validSwaps(g.board)[0];
    if(!pair)break;
    assert(g.swap(...pair).ok);
    assert.equal(g.board.length,49);
    for(const at of closed)assert.deepEqual(g.board[at],B.terrainPiece(at));
   }
   const original=g.board.filter(p=>p.family!=="terrain").map(p=>p.id).sort((a,b)=>a-b);
   let shuffleSeed=7654321;
   const shuffled=R.fairShuffle(g.board,()=>{shuffleSeed=(Math.imul(shuffleSeed,1664525)+1013904223)>>>0;return shuffleSeed/4294967296;});
   for(const at of closed)assert.deepEqual(shuffled[at],B.terrainPiece(at));
   assert.deepEqual(shuffled.filter(p=>p.family!=="terrain").map(p=>p.id).sort((a,b)=>a-b),original);
  }
 }
});
check("Overlays and obstacles can coexist with a DIFFERENT primary goal",()=>{
 const mix=B.normalize({layout:"twinGardens",mist:[9,20],
  daruma:[8],sealedStone:[11]});
 const g=new R.Game(0,null,{seed:41912,boardMechanics:mix});
 assert.equal(g.config.goal.type,"fusion");
 assert.equal(g.board[8].family,"daruma");assert.equal(g.daruma[8],2);
 assert.equal(g.board[11].family,"sealedStone");assert.equal(g.sealed[11],4);
 assert.equal(g.mist[9],1);assert.equal(g.mist[20],1);
 assert.deepEqual(g.boardMechanics,mix);
 const before=g.progress();
 assert.deepEqual(g.clearMist([9]),[9]);
 assert.equal(g.mist[9],0);assert.equal(g.mistCleared,1);
 assert.equal(g.progress(),before,"Clearing supplemental Mist must not replace the main objective");
 assert(R.validSwaps(g.board).length>=3);
});
check("Harmony Pulse and Omamori cannot upgrade terrain or grant fake hits",()=>{
 const P=require("../harmony/powers.js");
 const garden=new R.Game(0,null,{seed:1201,boardMechanics:{layout:"templeGate"}});
 // A single normal three-item fusion creates a Masterpiece beside terrain.
 for(const at of [7,14,21])
  garden.board[at]={family:"sakura",stage:at===7?4:1,id:at+1};
 const frames=garden.resolve(-1);
 assert(frames.some(e=>e.type==="hero"),"The new masterpiece must pulse");
 assert.equal(garden.pulseHits,0,"A permanently closed tile is not a Pulse hit");
 assert(!frames.some(e=>(e.targets||[]).some(t=>garden.boardMechanics.blocked.includes(t.to))));
 for(const at of garden.boardMechanics.blocked)
  assert.deepEqual(garden.board[at],B.terrainPiece(at));
 const boost=new R.Game(0,null,{seed:1201,boardMechanics:{layout:"templeGate"}});
 boost.board[7].stage=4;
 const result=P.apply(boost,"sakura",7);
 assert(result.ok);
 assert(!result.events.some(e=>(e.targets||[]).some(t=>boost.boardMechanics.blocked.includes(t.to))));
 for(const at of boost.boardMechanics.blocked)
  assert.deepEqual(boost.board[at],B.terrainPiece(at));
});
check("Saved and restored future layouts retain cells, overlays, RNG and legal hints",()=>{
 const initial=new R.Game(1,null,{seed:10227,
  boardMechanics:{layout:"templeGate",mist:[9,10],sealedStone:[19]}});
 const snapshot=initial.save();
 assert(H.validRun({level:1,data:snapshot}));
 const restored=new R.Game(1,snapshot,{fastRestore:true});
 assert.deepEqual(restored.board,initial.board);
 assert.deepEqual(restored.boardMechanics,initial.boardMechanics);
 assert.deepEqual(restored.mist,initial.mist);
 assert.deepEqual(restored.sealed,initial.sealed);
 assert.equal(restored.seed,initial.seed);
 assert.equal(restored.rolls,initial.rolls);
 const hint=R.bestHint(initial);
 assert(hint&&Number.isInteger(hint.from)&&Number.isInteger(hint.to));
 assert.deepEqual(initial.save(),snapshot,"Hint previews must never mutate the live board or snapshot");
 assert.equal(restored.swap(hint.from,hint.to).ok,true);
 for(const at of initial.boardMechanics.blocked)assert.equal(restored.board[at].family,"terrain");
 assert(H.validRun({level:1,data:restored.save()}));
 const broken=JSON.parse(JSON.stringify(snapshot));
 broken.board[initial.boardMechanics.blocked[0]]={family:"sakura",stage:1,id:999};
 assert.equal(H.validRun({level:1,data:broken}),false,"Corrupt terrain placement cannot be loaded");
});
console.log("Board Mechanics Foundation 1.0 checks passed.");
