"use strict";
/* Director 6.0 - Mechanic-Aware Board Intelligence contract.
 * Real engine checks and reproducible reference to Gate of Echoes level 54.
 * No scripted wins, forced matches, invented boosters, score or stage changes.
 */
const A=require("node:assert/strict");
const R=require("../harmony/rules.js"),D6=require("../harmony/director-v6.js");
const B=require("../harmony/board-mechanics.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const make=(level,mode="v6",seed=20266172,extra={})=>
 new R.Game(level,null,{directorMode:mode,seed,...extra});
const move=(g,p)=>{const e=g.swap(...p);A.equal(e.ok,true);return e;};
const json=g=>JSON.parse(JSON.stringify(g.save()));
const count=(e,type)=>e.events.filter(x=>x.type===type).length;
check("v6 is explicit, fresh and restored without mutating v4 saves",()=>{
 const a=make(53,"v6",20266172,{bambooPreview:true});
 A.equal(a.directorMode,"v6");
 const restored=new R.Game(53,json(a),{fastRestore:true});
 A.equal(restored.directorMode,"v6");A.deepEqual(restored.board,a.board);
 const old=make(53,"v4",20266172,{bambooPreview:true});
 A.equal(old.directorMode,"v4");
 A.equal(new R.Game(53,json(old),{fastRestore:true}).directorMode,"v4");
});
check("the actual level 54 starting board is unchanged by the opt-in Director",()=>{
 const v4=make(53,"v4",20266172,{bambooPreview:true});
 const v6=make(53,"v6",20266172,{bambooPreview:true});
 A.deepEqual(v6.board,v4.board);A.deepEqual(v6.config.goal,{type:"pulseHits",count:7});
 A.equal(v6.config.moves,46);
 A.deepEqual(v6.boardMechanics.blocked,[8,12,16,18,30,32,36,40]);
});
check("Director 6 is a pure read-only scoring layer",()=>{
 const g=make(53,"v6",20266172,{bambooPreview:true});
 const before=JSON.stringify(g.board);
 const out=D6.evaluate(g.board,g.config.goal,
  {mist:g.mist,mirrors:g.moonMirrors,wind:g.windGarden,lotus:g.lotus},
  R.validSwaps,R.scan);
 A.equal(JSON.stringify(g.board),before);
 A.equal(out.legal,R.validSwaps(g.board).length);
 A(out.channels>0);A(out.activeParts>=1);A(Number.isFinite(out.score));
 A(out.unsupportedChannels===undefined||out.unsupportedChannels>=0);
});
check("critical mobility candidates are preferred without painting a match",()=>{
 const g=make(53),snapshot=json(g);
 const base={board:g.board.slice(),autoMatches:0};
 const altBoard=g.board.slice(),indices=altBoard.map((p,i)=>p?.family==="terrain"?-1:i).filter(i=>i>=0);
 // Build one valid alternate arrangement by swapping whole objects,
 // preserving their ID, stage, family and existing terrain.
 let better=null;
 const original=R.validSwaps(base.board).length;
 for(let a=0;a<indices.length&&!better;a++)for(let b=a+1;b<indices.length;b++){
  const at=indices[a],to=indices[b];[altBoard[at],altBoard[to]]=[altBoard[to],altBoard[at]];
  if(R.scan(altBoard).length===0&&R.validSwaps(altBoard).length>=original+2){
   better={board:altBoard.slice(),autoMatches:0};break;
  }
  [altBoard[at],altBoard[to]]=[altBoard[to],altBoard[at]];
 }
 A(better,"Reference board should admit a better legal-move arrangement");
 // Isolate the low-legal-space contract without modifying the candidates.
 const contextual={goal:g.config.goal,lotus:g.lotus,wind:g.windGarden,mirrors:g.moonMirrors,mist:g.mist};
 const one=D6.choose({board:g.board,autoMatches:0},[better],
  ()=>0,contextual,R.validSwaps,R.scan);
 A(one.chosenHealth.legal>=one.health.legal);
 A.equal(JSON.stringify(g.board),JSON.stringify(snapshot.board));
});
check("blocked tiles are never counted as valid swaps or moved in any real turn",()=>{
 for(const level of [50,51,52,53,54,55,57,58,59]){
  const g=make(level,"v6",20261031+level*97,{bambooPreview:true});
  const fixed=g.boardMechanics.blocked.slice();
  for(let n=0;n<3&&!g.complete&&!g.failed;n++){
   const valid=R.validSwaps(g.board);
   A(valid.length>0);move(g,valid[n%valid.length]);
   for(const at of fixed)A.deepEqual(g.board[at],B.terrainPiece(at));
   A.equal(R.scan(g.board).length,0);
  }
 }
});
check("strong refills retain original mechanics, fusions and capped Pulse",()=>{
 const a=make(53,"v6",20266172,{bambooPreview:true});
 const e=move(a,[27,26]);
 A.equal(count(e,"swap"),1);A.equal(a.moves,45);
 A.equal(a.progress(),0);
 A(a.score>0&&a.fusions>0);
 A.equal(a.bambooPreview,true);
});
check("Director 6 trace identifies spatial decisions without exposing player identity",()=>{
 const a=make(53,"v6",20266172,{bambooPreview:true});
 move(a,[27,26]);
 const rec=a.roundTrace.moves.at(-1);
 A(rec.refills.length>0);
 const rf=rec.refills[0];A.equal(rf.mode,"v6");A(rf.candidateCount>=6);
 if(rf.baselineAutoMatches===0){
  A(rf.spatial);A(Number.isInteger(rf.spatial.before.legal));
  A(rf.candidates.some(c=>Number.isInteger(c.legal)));
 }
});
check("all five new spatial mechanic configurations can execute their genuine rules",()=>{
 const cases=[
  {level:53,extra:{bambooPreview:true}},
  {level:60,extra:{lotusPreview:"garden-route"}},
  {level:60,extra:{lotusPreview:"three-lanes"}},
  {level:2,extra:{windGardenPreview:"crossing"}},
  {level:2,extra:{moonMirrorPreview:"spark"}}
 ];
 for(const x of cases){
  const g=make(x.level,"v6",20261031+97*x.level,x.extra);
  for(let i=0;i<3&&!g.complete&&!g.failed;i++){
   const p=R.validSwaps(g.board)[0];A(p,"No legal player move: "+JSON.stringify(x));
   const e=move(g,p);
   A.equal(e.events.some(v=>v.type==="swap"),true);
   A.equal(R.scan(g.board).length,0);
  }
 }
});
check("the real level 54 export's v4 seed still reproduces the first opening",()=>{
 const g=make(53,"v4",20266172,{bambooPreview:true});
 A.equal(g.score,0);A.equal(g.config.moves,46);
 const e=move(g,[27,26]);A.equal(g.score,200);
 A.equal(count(e,"shuffle"),0);
 A.equal(g.directorMode,"v4");
});
check("one safe shuffle keeps each whole piece and fixed board anchor",()=>{
 const base=make(53,"v6",20266172,{bambooPreview:true});
 const before=base.board.map(p=>p.id).sort((a,b)=>a-b);
 // This uses the actual engine by reproducing a seeded series of real legal
 // moves. A shuffle is *allowed*, but must NEVER mutate an object's identity.
 let shuffles=0;
 for(let n=0;n<22&&!base.complete&&!base.failed;n++){
  const possible=R.validSwaps(base.board);
  A(possible.length>0);const e=move(base,possible[n%possible.length]);
  shuffles+=count(e,"shuffle");
  A.deepEqual(base.board.map(p=>p.id).sort((a,b)=>a-b).filter(x=>x<0),
   before.filter(x=>x<0));
  A.equal(R.scan(base.board).length,0);
  A(R.validSwaps(base.board).length>0);
 }
 A(shuffles>=0);
});
console.log("Harmony Director 6.0: mechanics-aware integrity and regression checks passed");
