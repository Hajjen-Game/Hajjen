"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js"),E=require("../harmony/economy.js");
const P=require("../harmony/powers.js"),C=require("../harmony/cards.js");
const check=(name,fn)=>{fn();console.log("PASS "+name)};
function save(ids=[]){const s={economy:{version:1,coins:2000,paidStars:{},owned:ids,equipped:ids[0]||null}};C.initialize(s);return s;}
check("Legacy card migration takes existing Bonds and keeps the coin balance",()=>{
 const s={economy:{version:1,coins:900,owned:["sakura","koi"],equipped:"sakura",paidStars:{}},
  spirits:{version:1,bonds:{sakura:{levels:[0,1,2,3,4,5]}}}};
 assert.equal(C.status(s,"sakura").tier,3);assert.equal(C.status(s,"koi").tier,1);
 assert.equal(E.snapshot(s).coins,900);
 C.initialize(s);assert.equal(C.status(s,"sakura").tier,3);
});
check("Whole-card consumption removes power and Bond; repurchase starts at I",()=>{
 const s=save(["sakura"]);const before=s.economy.coins;
 assert(C.consume(s,"sakura").ok);assert.equal(C.has(s,"sakura"),false);
 assert.equal(s.economy.equipped,null);
 assert.equal(C.consume(s,"sakura").ok,false);
 assert(C.buy(s,"sakura").ok);assert.equal(s.economy.coins,before-80);
 assert.equal(C.status(s,"sakura").tier,1);assert.equal(C.status(s,"sakura").count,0);
 assert.equal(C.buy(s,"sakura").ok,false);
});
check("Three tiers use 3 and 6 distinct level missions; new card resets them",()=>{
 const s=save(["sakura"]),ev=[{type:"collection",awards:[{family:"sakura",at:11}]}];
 for(let level=0;level<6;level++){
  assert(C.observe(s,level,ev).ok);
  assert.equal(C.observe(s,level,ev).ok,false);
 }
 assert.equal(C.status(s,"sakura").tier,3);
 C.consume(s,"sakura");C.buy(s,"sakura");C.equip(s,"sakura");
 assert.equal(C.status(s,"sakura").tier,1);
 assert.equal(C.observe(s,0,ev).ok,true);
});
check("Sakura I, II and III target respectively 1, 2 and 3 distinct ordinary tiles",()=>{
 for(const tier of [1,2,3]){
  const g=new R.Game(12,null,{seed:311+tier,directorMode:"v4"});
  const at=[2,3,4].slice(0,tier);const moves=g.moves,sc=g.score;
  const bad=P.apply(g,"sakura",[],tier);assert.equal(bad.ok,false);
  const ev=P.apply(g,"sakura",at,tier);assert(ev.ok,JSON.stringify(ev));
  assert.equal(g.moves,moves);assert.equal(g.assisted,true);
  assert.equal(g.blessingUses,1);assert(g.score>=sc);
 }
});
check("Koi I 2x2, II 3x3, III 3x3 with one reroll",()=>{
 for(const tier of [1,2,3]){
  const g=new R.Game(12,null,{seed:157+tier,directorMode:"v4"});
  const old=g.board.map(p=>p.id);const oldRolls=g.rolls;
  const ev=P.apply(g,"koi",24,tier);assert(ev.ok,JSON.stringify(ev));
  assert.equal(ev.events[0].cells.length,tier===1?4:9);
  assert.equal(ev.events[0].tier,tier);assert.equal(g.rolls,oldRolls);
  assert(R.validSwaps(g.board).length>0);assert.equal(R.scan(g.board).length,0);
  for(let i=0;i<49;i++)if(!ev.events[0].cells.includes(i))assert.equal(g.board[i].id,old[i]);
  if(tier!==3)assert.equal(g.koiRerollAt,-1);
  else {
   const again=P.reroll(g);assert(again.ok,JSON.stringify(again));
   assert.equal(g.koiRerollAt,-1);
   assert.equal(P.reroll(g).ok,false);
   assert.deepEqual(again.events[0].cells,ev.events[0].cells);
  }
 }
});
check("Several powers can be used in same run, each physical card consumed in inventory separately",()=>{
 const s=save(["sakura","koi"]);const g=new R.Game(12,null,{seed:276,directorMode:"v4"});
 assert(P.apply(g,"sakura",2,1).ok);assert(C.consume(s,"sakura").ok);
 assert(P.apply(g,"koi",24,1).ok);assert(C.consume(s,"koi").ok);
 assert.equal(g.blessingUses,2);assert(!C.has(s,"sakura"));assert(!C.has(s,"koi"));
});
check("Moon gives 2/3/5 extra moves according to the consumed card tier",()=>{
 for(const tier of [1,2,3]){
  const g=new R.Game(12,null,{seed:129+tier});g.failed=true;g.moves=0;
  assert.equal(P.apply(g,"tsuki",-1,tier).ok,true);
  assert.equal(g.moves,[0,2,3,5][tier]);
  assert(g.assisted);
  const snap={...g.save(),assisted:g.assisted,blessingUses:g.blessingUses};
  const restored=new R.Game(12,snap,{fastRestore:true});
  assert.equal(restored.blessingUses,1);assert.equal(restored.assisted,true);
 }
});
check("Replay reward is limited to five clean wins per day and all purchases use Harmony Coins",()=>{
 const s=save(["koi"]);const old=s.economy.coins;
 let earned=0;for(let i=0;i<9;i++)earned+=C.replayCoins(s,1,true,false,"2026-10-27");
 assert.equal(earned,20);assert.equal(s.economy.coins,old+20);
 assert.equal(C.replayCoins(s,1,true,true,"2026-10-28"),0);
 assert.equal(C.replayCoins(s,2,true,false,"2026-10-28"),4);
});
check("v6.50 UI loads Cards before app; clean records remain separated",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert(html.includes("cards.js?v=6.53.0-omamori5"));
 assert(html.includes("powers.js?v=6.51.0-en"));
 assert(app.includes("C.consume(save,id)"));
 assert(app.includes("C.buy(save,item.id)"));
 assert(app.includes("C.observe(save,level,result.events)"));
 assert(app.includes("C.status(save,\"tsuki\")"));
 assert(app.includes("function showKoiReroll()"));
 assert(app.includes("save.assistedStars"));
 assert(app.includes("won&&!game.assisted?E.claim"));
});
console.log("Omamori Cards 4.0 and Tiered Powers tests passed.");
