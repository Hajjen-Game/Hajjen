"use strict";
/* Omamori 6.0: every item is repeatable one-use gameplay inventory. */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const E=require("../harmony/economy.js"),C=require("../harmony/cards.js");
const expected=["sakura","grandBloom","koi","deepCurrent","sealbreaker","twinSealbreaker","tsuki","moonGrace"];
assert.deepEqual(E.CATALOG.map(x=>x.id),expected);
assert(E.CATALOG.every(x=>x.kind==="power"&&Number.isInteger(x.price)&&x.price>0));
assert.equal(C.keepsakeIds.length,0);
const save={economy:{version:1,coins:6000,owned:[],paidStars:{},equipped:null}};
for(const item of E.CATALOG){
 assert(C.buy(save,item.id).ok,item.id+" can be bought");
 assert(C.buy(save,item.id).ok,item.id+" can be stacked");
 assert.equal(C.count(save,item.id),2);
 assert.equal(C.status(save,item.id).permanent,false);
 assert.equal(C.status(save,item.id).consumable,true);
 assert(C.consume(save,item.id).ok);
 assert.equal(C.count(save,item.id),1,"Only one copy is consumed");
 assert(C.consume(save,item.id).ok);
 assert.equal(C.count(save,item.id),0);
}
assert.equal(C.total(save),0);
assert.deepEqual(C.initialize(save).counts,{});
assert.equal(save.economy.equipped,null);
const old={economy:{version:1,coins:731,owned:["kiri","koi","daruma","akari"],equipped:"kiri",paidStars:{}},
 omamoriCards:{version:1,cards:{kiri:{tier:3,levels:[1]},koi:{tier:3,levels:[1,2,3,4,5,6]},
 daruma:{tier:2,levels:[1]},akari:{tier:2,levels:[2]}},discovered:["kiri","koi","daruma","akari"],replay:{day:"",claims:0}}};
C.initialize(old);
assert.equal(old.economy.coins,731,"No retroactive billing");
assert.deepEqual(old.omamoriCards.counts,{sealbreaker:1,deepCurrent:1,twinSealbreaker:1,grandBloom:1});
assert.equal(old.economy.equipped,null);
const keep=JSON.stringify(old.omamoriCards);
C.initialize(old);assert.equal(JSON.stringify(old.omamoriCards),keep);
const source=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
assert(html.includes("omamori-simple.css?v=6.0.0"));
assert(html.includes("cards.js?v=6.0.0-simple"));
assert(source.includes('C.buy(save,item.id)'));
assert(source.includes('C.consume(save,id)'));
assert(source.includes('normalUses()>=2'));
assert(source.includes('confirmMoonRescue()'));
assert(!source.includes("KEEPSAKES · PERMANENT"));
assert(!source.includes('C.observe(save,level,result.events)'));
console.log("PASS Omamori 6.0 audit: 8 consumable effects, stacks, no permanent keepsakes, safe migration");
