const assert=require("node:assert/strict");
const E=require("../harmony/economy.js");
const G=require("../harmony/goshuincho.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};

check("Currency only follows actual completed stage evidence, not unlocked stage number",()=>{
 const account={unlocked:30,bestStars:{20:1,21:2,22:3},bestScores:{},
   fourFamilyStars:{0:1,1:3},fourFamilyScores:{}};
 const result=E.initialize(account);
 assert.equal(result.newlyCreated,true);
 assert.equal(account.economy.coins,5*12+8*(1+2+3+1+3));
 assert.equal(account.economy.paidStars[20],1);
 assert.equal(account.economy.paidStars[21],2);
 assert.equal(account.economy.paidStars[22],3);
 assert.equal(E.snapshot(account).coins,account.economy.coins);
 assert.equal(E.initialize(account).newlyCreated,false);
 assert.equal(account.economy.coins,140);
});
check("Older score-only wins award one star one time; uncompleted runs do not",()=>{
 const save={unlocked:30,fourFamilyScores:{9:2100},bestScores:{11:4500},
  run:{level:26,data:{moves:2,complete:false,starsAtGoal:3}}};
 E.initialize(save);
 assert.equal(save.economy.coins,40);
 assert.equal(save.economy.paidStars[26],undefined);
 assert.equal(G.archivedStars(save,9),1);
 assert.equal(G.archivedStars(save,11),1);
});
check("On first new clear pay once; replay earns zero; upgrades award only difference",()=>{
 const save={unlocked:0,bestStars:{},fourFamilyStars:{}};
 E.initialize(save);
 assert.equal(save.economy.coins,0);
 const first=E.claim(save,0,1);
 assert.deepEqual({delta:first.delta,reason:first.reason},{delta:20,reason:"first-clear"});
 assert.equal(E.claim(save,0,1).delta,0);
 assert.equal(E.claim(save,0,0).delta,0);
 assert.deepEqual({delta:E.claim(save,0,3).delta,coins:save.economy.coins},{delta:16,coins:36});
 assert.equal(E.claim(save,0,2).delta,0,"No downgrade removes or earns currency");
 assert.equal(E.claim(save,1,2).delta,28);
 assert.equal(save.economy.coins,64);
 assert.equal(E.initialize(save).newlyCreated,false);
 assert.equal(save.economy.coins,64);
});
check("Shop purchases are atomic, one-time, persistent and cosmetic-only",()=>{
 const save={bestStars:{},fourFamilyStars:{}};E.initialize(save);
 const ids=E.CATALOG.map(x=>x.id);
 assert.equal(new Set(ids).size,E.CATALOG.length);
 assert.equal(E.CATALOG.length,6);
 assert.equal(E.purchase(save,"unknown").reason,"unknown-item");
 assert.equal(E.purchase(save,ids[0]).reason,"not-enough-coins");
 for(let i=0;i<5;i++)E.claim(save,i,3);
 assert.equal(save.economy.coins,180);
 const first=E.CATALOG[0];
 assert.equal(E.purchase(save,first.id).ok,true);
 assert.equal(save.economy.coins,180-first.price);
 assert.equal(E.purchase(save,first.id).reason,"already-owned");
 assert.equal(E.equip(save,"daruma").reason,"not-owned");
 assert.equal(E.equip(save,first.id).ok,true);
 assert.equal(E.snapshot(save).equipped,first.id);
 assert.equal(E.equip(save,null).ok,true);
 assert.equal(E.snapshot(save).equipped,null);
 assert.deepEqual(E.snapshot(save).owned,[first.id]);
 assert.equal(E.purchase(save,ids[1]).reason,"not-enough-coins");
 assert.equal(save.economy.coins,100);
});
check("Malicious or malformed economy data is normalized without changing star records",()=>{
 const save={unlocked:9,fourFamilyStars:{3:2},bestStars:{20:3},
  economy:{version:1,coins:-200,paidStars:null,owned:["sakura","sakura","fake"],equipped:"fake"}};
 const before=JSON.stringify({a:save.fourFamilyStars,b:save.bestStars});
 E.initialize(save);
 assert.equal(save.economy.coins,0);
 assert.deepEqual(save.economy.owned,["sakura"]);
 assert.equal(save.economy.equipped,null);
 assert.deepEqual(save.economy.paidStars,{});
 assert.equal(JSON.stringify({a:save.fourFamilyStars,b:save.bestStars}),before);
 assert.equal(E.claim(save,Infinity,3).delta,0);
});
check("UI and gameplay contracts: no Omamori effect applied to HarmonyRules",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../harmony/mobile-game.css"),"utf8");
 const rules=fs.readFileSync(path.join(__dirname,"../harmony/rules.js"),"utf8");
 assert(html.includes("harmony/economy.js?v=6.37.0"));
 assert(html.includes('id="omamoriButton"'));
 assert(html.includes('id="harmonyCoins"'));
 assert(app.includes('const coinReward=won?E.claim(save,level,'));
 assert(app.includes('if(E.purchase(save,item.id).ok){persist()'));
 assert(app.includes('showOmamori(tab)'));
 assert(css.includes("Harmony Economy & Omamori 1.0"));
 assert(!rules.includes("HarmonyEconomy"));
 assert(!rules.includes("Omamori"));
 assert(!rules.includes("harmonyCoins"));
});
check("Reward Polish keeps six existing cosmetic charms",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const state={bestStars:{},fourFamilyStars:{}};E.initialize(state);
 const baseline=JSON.stringify(state);
 assert.equal(E.CATALOG.length,6);
 assert.equal(E.snapshot(state).ownedCount,0);
 assert.equal(JSON.stringify(state),baseline);
 assert(html.includes('id="omamoriProgress"'));
 assert(app.includes('for(const item of E.CATALOG)'));
 assert(app.includes('showOmamoriNotice("purchase",item)'));
});
console.log("Harmony Economy & Omamori 1.0 tests passed.");
