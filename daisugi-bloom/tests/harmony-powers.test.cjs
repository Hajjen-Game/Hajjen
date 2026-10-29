"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js"),E=require("../harmony/economy.js");
const P=require("../harmony/powers.js"),C=require("../harmony/cards.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
function save(coins=3000){return {economy:{version:1,coins,paidStars:{},owned:[],equipped:null}};}
check("6.0 migrates stronger tiers and formerly permanent keepsakes exactly once",()=>{
 const s=save(925);
 s.economy.owned=["sakura","kiri","daruma","akari","koi","tsuki"];
 s.omamoriCards={version:1,cards:{
  sakura:{tier:3,levels:[1,2,3,4,5,6]},kiri:{tier:2,levels:[1]},
  daruma:{tier:1,levels:[]},akari:{tier:1,levels:[]},
  koi:{tier:3,levels:[1,2,3,4,5,6]},tsuki:{tier:3,levels:[1,2,3,4,5,6]}
 },discovered:["kiri","daruma","akari"],replay:{day:"2026-10-29",claims:2}};
 assert.deepEqual(C.initialize(s).counts,{
  grandBloom:2,sealbreaker:1,twinSealbreaker:1,deepCurrent:1,moonGrace:1
 });
 assert.equal(s.economy.coins,925);
 assert.equal(s.economy.equipped,null);
 const snapshot=JSON.stringify(s.omamoriCards);
 C.initialize(s);assert.equal(JSON.stringify(s.omamoriCards),snapshot,"Migration is idempotent");
 assert.equal(C.status(s,"kiri"),null,"Retired keepsakes cannot remain owned");
});
check("6.0 never resurrects previously spent cards from historical discovery",()=>{
 const s=save();s.economy.owned=["sakura","kiri"];
 s.omamoriCards={version:1,cards:{},discovered:["sakura","kiri"],replay:{day:"",claims:0}};
 assert.equal(C.total(s),0);
});
check("6.0 supports repeat purchases, individual consumption and no mastery",()=>{
 const s=save(500);const cost=E.CATALOG.find(i=>i.id==="sakura").price;
 assert(C.buy(s,"sakura").ok);assert(C.buy(s,"sakura").ok);
 assert.equal(C.count(s,"sakura"),2);assert.equal(s.economy.coins,500-cost*2);
 assert.equal(C.consume(s,"sakura").quantity,1);assert.equal(C.count(s,"sakura"),1);
 assert.equal(C.consume(s,"sakura").quantity,0);assert.equal(C.count(s,"sakura"),0);
 assert.equal(C.consume(s,"sakura").ok,false);
 assert.equal(C.equip(s,"sakura").ok,false);
 assert.equal(C.observe(s,5,[{type:"pulse"}]).ok,false);
 assert.equal(C.buy(s,"sakura").ok,true);
});
check("Eight v6 strengths affect the board without consuming ordinary moves",()=>{
 for(const [id,at] of [["sakura",2],["grandBloom",[2,3]],["koi",24],["deepCurrent",24]]){
  const g=new R.Game(12,null,{seed:284,directorMode:"v4"}),moves=g.moves;
  const result=P.apply(g,id,at);
  assert(result.ok,id+": "+JSON.stringify(result));
  assert.equal(g.moves,moves,id);assert.equal(g.blessingUses,1);
  assert.equal(g.assisted,true);
  if(id==="deepCurrent"){
   assert.equal(result.events[0].cells.length,9);
   assert.equal(g.koiRerollAt,24);
   const reroll=P.reroll(g);assert(reroll.ok,JSON.stringify(reroll));
   assert.equal(g.koiRerollAt,-1);
  }
  if(id==="koi")assert.equal(result.events[0].cells.length,4);
 }
});
check("Sealbreaker and Twin Sealbreaker clear only chosen Mist cells",()=>{
 const g=new R.Game(3,null,{seed:336,directorMode:"v3"});
 const points=g.mist.map((x,i)=>x?i:-1).filter(x=>x>=0);
 assert(points.length>=3);
 const moves=g.moves;
 assert(P.apply(g,"sealbreaker",points[0]).ok);
 assert.equal(g.mist[points[0]],0);assert.equal(g.mistCleared,1);
 assert(P.apply(g,"twinSealbreaker",points.slice(1,3)).ok);
 assert.equal(g.mistCleared,3);
 assert.equal(g.moves,moves);assert.equal(g.blessingUses,2);
 assert.equal(P.apply(g,"sakura",2).ok,false,"Only two ordinary boosts per level");
});
check("Sealbreaker damages Daruma and Sealed Stones, including a final Awakening",()=>{
 const d=new R.Game(20,null,{seed:192});
 const at=d.daruma.findIndex(x=>x>0);assert(at>=0);
 assert(P.apply(d,"sealbreaker",at).ok);assert.equal(d.daruma[at],1);
 // A new attempt may finish the remaining Daruma hit.
 const d2=new R.Game(20,null,{seed:192});
 d2.daruma[at]=1;
 assert(P.apply(d2,"sealbreaker",at).ok);
 assert.equal(d2.daruma[at],0);assert(d2.darumaCleared>=1);
 const stone=new R.Game(30,null,{seed:558});
 const sp=stone.sealed.findIndex(x=>x>0);assert(sp>=0);
 stone.sealed[sp]=1;
 const res=P.apply(stone,"sealbreaker",sp);
 assert(res.ok);assert.equal(stone.sealed[sp],0);
 assert(res.events.some(x=>x.type==="awakening"),"Final hit should release a real 8-neighbor pulse");
});
check("Moon is offered only when failed and ignores two-board-boost limit",()=>{
 for(const [id,moves] of [["tsuki",3],["moonGrace",5]]){
  const g=new R.Game(12,null,{seed:333});g.failed=true;g.moves=0;g.blessingUses=2;
  assert(P.apply(g,id,-1).ok);assert.equal(g.moves,moves);
  assert.equal(g.blessingUses,3);assert.equal(g.failed,false);
  const snap={...g.save(),assisted:g.assisted,blessingUses:g.blessingUses};
  assert.equal(new R.Game(12,snap,{fastRestore:true}).blessingUses,3);
 }
});
check("Repeat-play coin income remains capped after assisted clears",()=>{
 const s=save(0);
 for(let i=0;i<9;i++)C.replayCoins(s,0,true,true,"2026-10-29");
 assert.equal(s.economy.coins,20);
});
const fs=require("node:fs"),path=require("node:path");
const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
assert(html.includes("cards.js?v=6.0.0-simple"));
assert(app.includes("showPowerPicker()"));
assert(app.includes("moonOfferShown"));
assert(app.includes("C.consume(save,id)"));
assert(app.includes("game.assisted?1:game.stars()"));
console.log("PASS Omamori 6.0 · inventory, migration, 8 powers, limits and Moon rescue");
