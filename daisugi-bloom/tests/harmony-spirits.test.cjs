"use strict";
/* Legacy Omamori Spirits 2.0 data is kept for safe old-save compatibility,
 * but Omamori 6.0 eliminates equipment, mission progression and on-board
 * companions. Neither the game nor the UI may call this legacy subsystem. */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const S=require("../harmony/spirits.js"),E=require("../harmony/economy.js"),C=require("../harmony/cards.js");
const save={economy:{version:1,coins:80,owned:["sakura","daruma"],equipped:"sakura",paidStars:{}},
 spirits:{version:1,bonds:{sakura:{levels:[2,2,3,-1,Infinity,"4"]},daruma:{levels:"bad"},evil:{levels:[5]}}},
 omamoriCards:{version:1,cards:{sakura:{tier:3,levels:[1,2,3,4,5,6]},
  daruma:{tier:1,levels:[]}},discovered:["sakura","daruma"],replay:{day:"",claims:0}}};
S.initialize(save);
assert.deepEqual(save.spirits.bonds.sakura.levels,[2,3]);
assert.deepEqual(save.spirits.bonds.daruma.levels,[]);
assert.equal(save.spirits.bonds.evil,undefined);
assert.equal(C.initialize(save).counts.grandBloom,1);
assert.equal(C.count(save,"twinSealbreaker"),1);
assert.equal(save.economy.equipped,null);
assert.equal(E.equip(save,"sakura").ok,false);
assert.equal(C.observe(save,5,[{type:"collection"}]).ok,false);
const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
assert(html.includes('id="spiritBadge"'));
assert(app.includes('badge.hidden=true'));
assert(!app.includes("spiritMoment(evt)"));
assert(!app.includes("S.observe(save,"));
assert(!app.includes("C.observe(save,level,result.events)"));
console.log("PASS Legacy Spirits retired safely: old saves normalize, no permanent powers or mastery remain active");
