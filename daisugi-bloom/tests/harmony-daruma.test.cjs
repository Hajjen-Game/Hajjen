"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const cell=(f,stage=1,id=1)=>({family:f,stage,id});
const blank=()=>Array.from({length:49},(_,i)=>cell(
 ["sakura","lantern","koi","fan","bonsai"][(Math.floor(i/7)+2*(i%7))%5],1,i+1));
const expect=(msg,fn)=>{fn();console.log("PASS "+msg);};
expect("Only levels 21, 23 and 26 introduce fixed Daruma objectives",()=>{
 for(const [level,n] of [[20,1],[22,2],[25,2]]){
  const g=new R.Game(level,null,{seed:20261024});
  assert.deepEqual(g.config.goal,{type:"daruma",count:n});
  assert.equal(g.darumaVersion,1);
  assert.equal(g.board.filter(p=>p?.family==="daruma").length,n);
  assert.equal(g.daruma.filter(Boolean).length,n);
  assert(g.daruma.filter(Boolean).every(v=>v===2));
  assert.equal(g.progress(),0);
  assert.equal(R.scan(g.board).length,0);
  assert(R.validSwaps(g.board).length>=3);
  for(const at of g.daruma.map((v,i)=>v?i:-1).filter(x=>x>=0)){
   assert.equal(g.board[at].id,-(at+1));
   assert(R.validSwaps(g.board).every(([a,b])=>a!==at&&b!==at));
   const next=R.neighbors(at)[0],before=g.save();
   const result=g.swap(at,next);
   assert.equal(result.ok,false);
   assert.equal(g.moves,before.moves);
   assert.deepEqual(g.board,before.board);
  }
 }
 assert.equal(new R.Game(21,null,{seed:1}).config.goal.type,"mist");
 assert.equal(new R.Game(23,null,{seed:1}).config.goal.type,"mist");
});
expect("First adjacent fusion paints exactly one eye, without moving Daruma",()=>{
 const g=new R.Game(20,null,{seed:234});
 g.board=blank();
 for(const at of [17,18,19])g.board[at].family="sakura";
 g.board[24]=cell("daruma",0,-25);
 g.daruma=Array(49).fill(0);g.daruma[24]=2;
 const result=g.resolve(-1);
 assert(result.some(e=>e.type==="fusion"));
 const first=result.filter(e=>e.type==="daruma");
 assert.equal(first.length,1);
 assert.deepEqual(first[0].hits,[{at:24,via:"fusion",filled:1}]);
 assert.equal(first[0].daruma[24],1);
 assert.equal(g.daruma[24],1);
 assert.equal(g.board[24].family,"daruma");
 assert.equal(g.darumaCleared,0);
 assert.equal(result.filter(e=>e.type==="daruma-release").length,0);
 const loaded=new R.Game(20,g.save(),{fastRestore:true});
 assert.deepEqual(loaded.daruma,g.daruma);
 assert.equal(loaded.board[24].id,-25);
});
expect("Second move releases Daruma, frees the cell, and completes objective",()=>{
 const g=new R.Game(20,null,{seed:234});
 g.board=blank();g.daruma=Array(49).fill(0);g.daruma[24]=1;
 g.board[24]=cell("daruma",0,-25);
 for(const at of [17,18,19])g.board[at].family="sakura";
 g.moves--;
 const events=g.resolve(-1),hit=events.find(e=>e.type==="daruma"),
  release=events.find(e=>e.type==="daruma-release");
 assert(hit&&release);
 assert.deepEqual(hit.hits,[{at:24,via:"fusion",filled:2}]);
 assert.equal(hit.daruma[24],3,"A completed sprite is visible before clearing");
 assert.equal(hit.board[24].family,"daruma");
 assert.deepEqual(release.positions,[24]);
 assert.equal(release.board[24],null,"The cell empties before gravity");
 assert.equal(g.daruma[24],0);
 assert.notEqual(g.board[24]?.family,"daruma");
 assert.equal(g.darumaCleared,1);
 assert.equal(g.progress(),1);
 assert(g.complete);
 assert(events.some(e=>e.type==="goal"));
 const saved=g.save(),restored=new R.Game(20,saved,{fastRestore:true});
 assert.equal(restored.darumaCleared,1);
 assert(restored.complete);
 assert.equal(restored.progress(),1);
});
expect("Fusion plus Pulse during a single move never fills both eyes",()=>{
 const g=new R.Game(20,null,{seed:222});
 g.board=blank();g.daruma=Array(49).fill(0);g.daruma[24]=2;
 g.board[24]=cell("daruma",0,-25);
 for(const at of [15,16,17])g.board[at].family="sakura";
 g.board[17].stage=4;
 const events=g.resolve(-1);
 assert(events.some(e=>e.type==="hero"));
 assert(events.some(e=>e.type==="pulse"));
 assert.equal(events.filter(e=>e.type==="daruma").length,1);
 assert.equal(g.daruma[24],1,"Cannot complete from one player decision");
 assert.equal(g.darumaCleared,0);
 const pulse=events.find(e=>e.type==="pulse");
 assert(pulse.darumaTargets?.some(t=>t.to===24));
 assert(pulse.targets.every(t=>t.to!==24),"A fixed Daruma cannot evolve as a normal piece");
});
expect("Daruma columns do not collapse through intact blockers",()=>{
 const g=new R.Game(20,null,{seed:99,directorMode:"v3"});
 g.board=blank();g.daruma=Array(49).fill(0);g.daruma[24]=2;
 g.board[24]=cell("daruma",0,-25);
 g.board[10]=null; // above the fixed Daruma in column 3
 for(const at of [17,18,19])g.board[at].family="sakura";
 const events=g.resolve(-1),fall=events.find(e=>e.type==="fall");
 assert(fall);
 assert.equal(fall.board[24].family,"daruma","Gravity may not shift the fixed piece");
 assert.equal(g.board[24].id,-25);
 assert.equal(g.board.filter(p=>!p).length,0);
 assert(R.validSwaps(g.board).length>0);
});
expect("Legacy in-progress level 21 / 23 / 26 saves retain their original goals",()=>{
 for(const level of [20,22,25]){
  const old=new R.Game(level,null,{seed:888});
  const saved=old.save();
  delete saved.daruma;delete saved.darumaVersion;delete saved.darumaCleared;
  saved.board=blank();
  const loaded=new R.Game(level,saved,{fastRestore:true});
  assert.notEqual(loaded.config.goal.type,"daruma");
  assert.equal(loaded.darumaVersion,0);
  assert.equal(loaded.board.filter(p=>p?.family==="daruma").length,0);
  assert(loaded.daruma.every(v=>v===0));
  assert.deepEqual(new R.Game(level,loaded.save(),{fastRestore:true}).config.goal,loaded.config.goal);
 }
});
expect("Seeded Director 3.0 gameplay does not deadlock at first Daruma stage",()=>{
 for(let seed=1;seed<=8;seed++){
  const g=new R.Game(20,null,{seed:seed*654321,directorMode:"v3"});
  for(let t=0;t<25&&!g.complete&&g.moves>0;t++){
   const moves=R.validSwaps(g.board);
   assert(moves.length>0,"Deadlock with no swaps on seed "+seed);
   const [a,b]=moves[(seed+t*3)%moves.length];
   const result=g.swap(a,b);
   assert(result.ok);
   assert(g.board.every(Boolean));
   assert(g.darumaCleared<=1);
   if(g.daruma[24])assert.equal(g.board[24].family,"daruma");
  }
 }
});
console.log("Daruma Awakening 1.0 QA passed");
