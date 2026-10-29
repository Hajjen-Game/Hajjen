const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const F=require("../harmony/fortune.js");
const E=require("../harmony/economy.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const day=s=>new Date(s+"T12:00:00");

check("Omikuji has five valid fortunes and small non-negative rewards",()=>{
 assert.equal(F.REWARDS.length,5);
 assert.equal(new Set(F.REWARDS.map(x=>x.id)).size,5);
 assert.equal(F.REWARDS.reduce((s,x)=>s+x.weight,0),100);
 for(const slip of F.REWARDS){
  assert(slip.kanji&&slip.label&&slip.text&&slip.title);
  assert(slip.coins>=5&&slip.coins<=16);
 }
 assert.equal(F.select(()=>0).id,"daikichi");
 assert.equal(F.select(()=>.1).id,"chukichi");
 assert.equal(F.select(()=>.35).id,"kichi");
 assert.equal(F.select(()=>.61).id,"shokichi");
 assert.equal(F.select(()=>.9).id,"suekichi");
});
check("One free draw per local day and wallet paid only once",()=>{
 const save={bestStars:{18:2},fourFamilyStars:{0:3},unlocked:20};
 E.initialize(save);
 const coins=save.economy.coins,stars=JSON.stringify(save.bestStars);
 assert.equal(F.initialize(save).created,true);
 assert.equal(F.status(save,day("2026-10-25")).available,true);
 const result=F.draw(save,day("2026-10-25"),()=>.03);
 assert.equal(result.ok,true);
 assert.equal(result.coins,16);
 assert.equal(save.economy.coins,coins+16);
 assert.equal(F.status(save,day("2026-10-25")).last.id,"daikichi");
 assert.equal(F.status(save,day("2026-10-25")).available,false);
 assert.equal(F.draw(save,day("2026-10-25"),()=>.85).reason,"already-drawn");
 assert.equal(save.economy.coins,coins+16);
 assert.equal(F.draw(save,day("2026-10-24")).reason,"already-drawn","Clock rollback must not mint a second reward");
 assert.equal(F.initialize(save).created,false);
 assert.equal(F.draw(save,day("2026-10-25")).ok,false,"Reload must not re-mint");
 assert.equal(F.draw(save,day("2026-10-26"),()=>.51).coins,9);
 assert.equal(save.economy.coins,coins+25);
 assert.equal(save.fortune.count,2);
 assert.equal(JSON.stringify(save.bestStars),stars,"Old star data is untouched");
 assert.equal(save.unlocked,20,"Level access is unchanged");
});
check("Buying Omamori continues to use the same wallet and same prices",()=>{
 const s={bestStars:{0:3},fourFamilyStars:{0:3}};
 E.initialize(s);F.initialize(s);
 s.economy.coins=79;
 F.draw(s,day("2026-10-25"),()=>.9); // +5
 assert.equal(s.economy.coins,84);
 const buy=E.purchase(s,"sakura");
 assert.equal(buy.ok,true);
 assert.equal(s.economy.coins,4);
 assert.deepEqual(s.economy.owned,["sakura"]);
 assert.equal(F.draw(s,day("2026-10-25")).ok,false);
 assert.equal(s.economy.coins,4);
});
check("Fortune initializes on old saves without granting historical extra currency",()=>{
 const save={unlocked:30,bestStars:{21:2},fourFamilyStars:{0:3},economy:{
  version:1,coins:436,paidStars:{0:3,21:2},owned:["koi"],equipped:"koi"
 }};
 const copy=JSON.stringify(save.economy);
 assert.equal(F.initialize(save).created,true);
 assert.equal(JSON.stringify(save.economy),copy,"Current Omamori ownership, wallet and equipped charm stay untouched");
 assert.equal(F.status(save,day("2026-10-25")).coins,436);
 assert.equal(F.status(save,day("2026-10-25")).count,0);
});
check("Empty/invalid states are safe; no negative payout or replay farming at wallet cap",()=>{
 const s={economy:{version:1,coins:10000000,paidStars:{},owned:[],equipped:null},
  fortune:{version:1,lastDate:"2026-10-25",lastDraw:{date:"wrong",id:"fake",coins:123},count:-2}};
 assert.equal(F.initialize(s).created,false);
 assert.equal(F.status(s,day("2026-10-25")).available,false);
 assert.equal(F.status(s,day("2026-10-25")).last,null);
 assert.equal(s.fortune.count,0);
 assert.equal(F.draw(s,day("2026-10-26"),()=>0).coins,0);
 assert.equal(s.economy.coins,10000000);
 assert.equal(F.draw(s,day("2026-10-26"),()=>0).ok,false);
 assert.equal(F.draw({fortune:{}},day("2026-10-26")).reason,"no-wallet");
 assert.equal(F.draw({economy:{version:1,coins:0}},new Date("bad")).reason,"invalid-date");
});
check("UI loads Omikuji module before app; rules and rewards are cosmetic-only",()=>{
 const index=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
 const app=fs.readFileSync(path.resolve(__dirname,"../harmony/app.js"),"utf8");
 const rules=fs.readFileSync(path.resolve(__dirname,"../harmony/rules.js"),"utf8");
 const fortunePosition=index.indexOf("harmony/fortune.js?v=");
 const appPosition=index.indexOf("harmony/app.js?v="); // assert relative loading order, not a stale version
 assert(fortunePosition>0&&appPosition>fortunePosition);
 assert(index.includes('id="omikujiButton"'));
 assert(index.includes('id="omikujiStatus"'));
 assert(app.includes('const result=F.draw(save,new Date())'));
 assert(app.includes('if(F.initialize(save).created)persist()'));
 assert(app.includes('persist();renderMenu();showOmikuji()'));
 assert(!rules.includes("HarmonyFortune"));
 assert(!rules.includes("omikuji"));
});
console.log("Omikuji Fortune 1.0 tests passed.");
