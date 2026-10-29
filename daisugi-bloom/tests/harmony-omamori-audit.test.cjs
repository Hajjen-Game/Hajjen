"use strict";
/* Omamori System Audit 5.0: pricing, ownership, progression, migration,
   cosmetic permanence and UI contracts without changing the 7x7 rules. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const E=require("../harmony/economy.js"),C=require("../harmony/cards.js"),R=require("../harmony/rules.js");
const expected={
 sakura:{kind:"power",price:80},
 koi:{kind:"power",price:160},
 tsuki:{kind:"power",price:200},
 kiri:{kind:"keepsake",price:140},
 daruma:{kind:"keepsake",price:220},
 akari:{kind:"keepsake",price:320}
};
assert.equal(E.CATALOG.length,6);
for(const item of E.CATALOG){
 assert.equal(item.kind,expected[item.id].kind,item.id+" type");
 assert.equal(item.price,expected[item.id].price,item.id+" price");
 assert.equal(C.kind(item.id),item.kind);
 assert.equal(C.status({economy:{owned:[]}},item.id).permanent,item.kind==="keepsake");
}
const save={economy:{version:1,coins:2000,owned:[],equipped:null,paidStars:{}}};
for(const item of E.CATALOG){
 const buy=C.buy(save,item.id);
 assert.equal(buy.ok,true,item.id+" first purchase");
 assert.equal(C.status(save,item.id).owned,true);
 assert.equal(C.status(save,item.id).tier,1);
}
assert.equal(save.economy.coins,880,"Buy costs must equal 1120 coins total");
const before=JSON.stringify(save);
for(const id of C.keepsakeIds){
 assert.deepEqual(C.consume(save,id),{ok:false,reason:"permanent-keepsake"});
 assert.equal(C.has(save,id),true);
}
assert.equal(JSON.stringify(save),before,"Attempted keepsake consumption must not mutate save");
for(const id of C.activeIds){
 assert.equal(C.consume(save,id).ok,true);
 assert.equal(C.has(save,id),false);
 assert.equal(C.buy(save,id).ok,true,"Power replacement must be purchasable");
 assert.equal(C.status(save,id).tier,1,"Every new power card restarts at Tier I");
}
assert.equal(C.equip(save,"kiri").ok,true);
for(let i=0;i<6;i++){
 const result=C.observe(save,i,[{type:"fusion",clearedMist:[8]}]);
 assert.equal(result.ok,true);
 assert.equal(C.observe(save,i,[{type:"fusion",clearedMist:[8]}]).ok,false,
  "One mission per different level");
}
assert.equal(C.status(save,"kiri").tier,3);
assert.equal(C.has(save,"kiri"),true,"Tier III keepsake stays forever");
assert.equal(C.buy(save,"kiri").ok,false,"Keepsakes cannot be bought repeatedly");
const historical={economy:{version:1,coins:731,owned:["kiri","koi"],equipped:"kiri",paidStars:{}},
 spirits:{version:1,bonds:{kiri:{levels:[2,3,4]},koi:{levels:[2,3,4,5,6,7]}}}};
assert.equal(C.status(historical,"kiri").tier,2,"Legacy kept progression");
assert.equal(C.status(historical,"koi").tier,3,"Legacy power kept progression");
assert.equal(E.snapshot(historical).coins,731,"No automatic deductions or retroactive billing");
assert.equal(C.consume(historical,"kiri").ok,false);
assert.equal(C.consume(historical,"koi").ok,true);
assert.equal(R.levelConfig(37).goal.count,2,"Pre-Lantern Sealed Stone balance remains untouched");
assert.equal(R.levelConfig(47).goal.type,"familyFusion","Lantern Path has a bespoke family objective");
const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
assert(html.includes("omamori-audit.css?v=5.0.0"));
assert(html.includes("cards.js?v=6.53.0-omamori5"));
assert(html.includes("economy.js?v=6.53.0-omamori5"));
assert(app.includes("POWER CARDS · CONSUMABLE"));
assert(app.includes("KEEPSAKES · PERMANENT"));
assert(app.includes('item.kind==="power"'));
assert(app.includes('id==="kiri"&&Array.isArray(evt.clearedMist)'));
assert(app.includes('id==="akari"&&(evt.type==="pulse"'));
assert(app.includes('C.consume(save,id)'));
assert(app.includes('won&&!game.assisted?E.claim'));
console.log("PASS Omamori System Audit 5.0: permanent keepsakes, tiered consumables, pricing and migration");
