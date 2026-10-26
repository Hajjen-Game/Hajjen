"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js"),E=require("../harmony/economy.js");
const P=require("../harmony/powers.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const own=(ids=[])=>({economy:{version:1,coins:0,paidStars:{},owned:ids.slice(),equipped:ids[0]||null}});

check("Existing owners get one starter charge, no migration farm; new purchase gives exactly one",()=>{
 const a=own(["sakura","koi"]);P.initialize(a);
 assert.equal(P.status(a,"sakura").charges,1);
 assert.equal(P.status(a,"koi").charges,1);
 assert.equal(P.status(a,"tsuki").charges,0);
 const past=JSON.stringify(a.powers);
 P.initialize(a);assert.equal(JSON.stringify(a.powers),past);
 a.economy.owned.push("tsuki");
 assert.equal(P.starterForNewPurchase(a,"tsuki"),true);
 assert.equal(P.starterForNewPurchase(a,"tsuki"),false);
 assert.equal(P.status(a,"tsuki").charges,1);
 assert.equal(P.consume(a,"tsuki"),true);
 assert.equal(P.consume(a,"tsuki"),false);
 assert.equal(P.starterForNewPurchase(a,"tsuki"),false);
});
check("A completed unassisted level grants one charge to the equipped charm, never farms replays",()=>{
 const a=own(["sakura"]);P.initialize(a);
 for(const level of [1,2,3,4]){
  assert.equal(P.grantForClear(a,level).ok,level<3);
 }
 assert.equal(P.status(a,"sakura").charges,3);
 assert.equal(P.grantForClear(a,2).reason,"already-earned");
 assert.equal(P.grantForClear(a,5,true).reason,"ineligible");
 assert.equal(P.consume(a,"sakura"),true);
 assert.equal(P.grantForClear(a,5).ok,true);
 assert.equal(P.status(a,"sakura").charges,3);
});
check("Sakura promotes exactly one ordinary piece; stage-five Pulse upgrades neighbours and leaves valid board",()=>{
 for(const seed of [7,234,1111]){
  const g=new R.Game(12,null,{seed,directorMode:"v4"});
  const oldMoves=g.moves,oldBag=g.bag.slice(),oldScore=g.score;
  g.board[24].stage=4;
  const before=g.board[24].stage;
  const r=P.apply(g,"sakura",24);
  assert(r.ok);assert.equal(before,4);
  assert.equal(g.moves,oldMoves);
  assert.equal(g.assisted,true);
  assert.equal(g.blessingUsed,true);
  assert(r.events.some(e=>e.type==="pulse"));
  assert(r.events.some(e=>e.type==="harvest"));
  assert(g.score>=oldScore);
  assert(R.validSwaps(g.board).length>0);
  assert(g.board.every(Boolean));
  assert.equal(P.apply(g,"koi",24).ok,false,"One blessing per run");
 }
});
check("Sakura rejects fixed targets, empty, stage five; stage 2 to 3 increments stage counter",()=>{
 const g=new R.Game(30,null,{seed:321});
 const stone=R.sealedPositions(30)[0];
 assert.equal(P.apply(g,"sakura",stone).reason,"invalid-target");
 const at=g.board.findIndex(p=>p&&p.family!=="sealedStone"&&p.stage<5);
 g.board[at].stage=2;
 const before=g.stage3,move=g.moves;
 const a=P.apply(g,"sakura",at);
 assert(a.ok);assert.equal(g.stage3,before+1);assert.equal(g.moves,move);
});
check("Koi reshuffles local 3x3 only, preserves objects, fixed obstacles and legal swaps",()=>{
 for(const seed of [222,223,224]){
  const g=new R.Game(30,null,{seed,directorMode:"v4"});
  const original=g.board.map(p=>p?.id);
  const fixedIds=g.board.map((p,i)=>p?.family==="sealedStone"?i:-1).filter(i=>i>=0);
  const moves=g.moves,rolls=g.rolls;
  const result=P.apply(g,"koi",24);
  assert(result.ok,JSON.stringify(result));
  assert.equal(g.moves,moves);assert.equal(g.rolls,rolls);
  assert(result.events.some(e=>e.type==="shuffle"));
  assert.deepEqual(g.board.map(p=>p?.id).slice().sort((a,b)=>a-b),original.slice().sort((a,b)=>a-b));
  for(const at of fixedIds)assert.equal(g.board[at].id,original[at]);
  for(let i=0;i<49;i++)if(Math.abs(Math.floor(i/7)-3)>1||Math.abs(i%7-3)>1)assert.equal(g.board[i].id,original[i]);
  assert.equal(R.scan(g.board).length,0);
  assert(R.validSwaps(g.board).length>0);
 }
});
check("Moon only revives after failure; grants three moves once, persists assisted flag",()=>{
 const g=new R.Game(12,null,{seed:88});
 assert.equal(P.apply(g,"tsuki").ok,false);
 g.failed=true;g.moves=0;
 assert.equal(P.apply(g,"sakura",4).ok,false);
 const r=P.apply(g,"tsuki");
 assert(r.ok);assert.equal(g.moves,3);assert.equal(g.failed,false);
 assert.equal(g.assisted,true);assert.equal(g.blessingUsed,true);
 assert.equal(P.apply(g,"tsuki").ok,false);
 const snap={...g.save(),assisted:g.assisted,blessingUsed:g.blessingUsed};
 const restored=new R.Game(12,snap,{fastRestore:true});
 assert.equal(restored.assisted,true);assert.equal(restored.blessingUsed,true);
 assert.equal(P.apply(restored,"koi",24).ok,false);
});
check("New power UI and distinct assisted archives exist without altering regular coin and star rules",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const rules=fs.readFileSync(path.join(__dirname,"../harmony/rules.js"),"utf8");
 assert(html.includes("harmony/powers.js?v=6.49.0-active-blessings"));
 assert(html.includes('id="omamoriPowerBar"'));
 assert(app.includes("function confirmPowerTarget(at)"));
 assert(app.includes("function confirmMoonRescue()"));
 assert(app.includes("P.consume(save,id)"));
 assert(app.includes("save.assistedStars"));
 assert(app.includes("!game.assisted?E.claim"));
 assert(!rules.includes("HarmonyPowers"));
});
console.log("Omamori Powers 3.0 regression tests passed.");
