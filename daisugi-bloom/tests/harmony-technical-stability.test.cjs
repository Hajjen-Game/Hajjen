"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const H=require("../harmony/save-health.js");
const E=require("../harmony/economy.js");
const C=require("../harmony/cards.js");
const R=require("../harmony/rules.js");
const KEY="japanese-harmony-puzzle-v2";
const MARKER="japanese-harmony-first20-reset-20261024-v1";
const defaults={unlocked:0,bestStars:{},bestScores:{},bestChain:{},run:null,
 sound:true,reduceMotion:false,playMode:"auto",fourFamilyScores:{},
 fourFamilyStars:{},fourFamilyChain:{}};
const modes={auto:"auto",v3:"v3",standard:"standard"};
function storage(initial={}){
 const map=new Map(Object.entries(initial));
 return {map,getItem:k=>map.has(k)?map.get(k):null,
  setItem(k,v){map.set(k,String(v));},removeItem(k){map.delete(k);}};
}
function check(label,fn){fn();console.log("✓ "+label);}
check("A valid existing save keeps stars, wallet, cards and unknown legacy fields",()=>{
 const old={...defaults,unlocked:45,bestStars:{25:3},fourFamilyStars:{0:2},
  economy:{version:1,coins:432,owned:["sakura"],paidStars:{25:3},equipped:null},
  omamoriCards:{version:1,cards:{sakura:{tier:3,levels:[0,1,2,3,4,5]}},
   discovered:["sakura"],replay:{day:"2026-10-29",claims:2}},
  archivedField:{legacy:true}};
 const box=storage({[KEY]:JSON.stringify(old),[MARKER]:"done"});
 const result=H.bootstrap(()=>box,KEY,MARKER,defaults,modes);
 assert.equal(result.warning,null);
 assert.equal(result.writable,true);
 assert.equal(result.save.unlocked,45);
 assert.deepEqual(result.save.bestStars,{25:3});
 assert.deepEqual(result.save.omamoriCards,old.omamoriCards);
 assert.deepEqual(result.save.archivedField,{legacy:true});
 assert.equal(box.map.get(KEY),JSON.stringify(old),"Reading must not rewrite a good save");
});
check("A legitimate in-progress round remains resumable without changing its RNG",()=>{
 const board=Array.from({length:49},(_,i)=>({family:"sakura",stage:1,id:i+1}));
 const run={level:12,data:{level:12,board,moves:13,rolls:78,seed:123456,score:900}};
 assert.equal(H.validRun(run),true);
 assert.deepEqual(H.normalize({run},defaults).run,run);
 assert.equal(H.validRun({...run,data:{...run.data,rolls:1e9}}),false);
 assert.equal(H.validRun({...run,data:{...run.data,board:[{}]}}),false);
 assert.equal(H.validRun({...run,data:{...run.data,level:14}}),false);
 assert.equal(H.validRun({...run,data:{...run.data,board:board.map(p=>({...p,stage:99}))}}),false);
});
check("Malformed sections are isolated, not allowed to crash startup or erase good records",()=>{
 const old={unlocked:7,bestStars:{4:3},bestScores:[],
  fourFamilyStars:null,assistedStars:"invalid",run:{level:7,data:{moves:4,board:[]}},
  economy:{version:1,coins:120,owned:[],paidStars:{},equipped:null}};
 const normalized=H.normalize(old,defaults);
 assert.deepEqual(normalized.bestStars,{4:3});
 assert.deepEqual(normalized.bestScores,{});
 assert.deepEqual(normalized.fourFamilyStars,{});
 assert.deepEqual(normalized.assistedStars,{});
 assert.equal(normalized.run,null);
 assert.equal(normalized.unlocked,7);
 assert.equal(E.snapshot(normalized).coins,120);
});
check("Unreadable JSON is backed up before a new save can replace it",()=>{
 const broken='{broken json';
 const box=storage({[KEY]:broken,[MARKER]:"done"});
 const result=H.bootstrap(()=>box,KEY,MARKER,defaults,modes);
 assert.equal(result.warning,"corrupt-save");
 assert.equal(result.writable,true);
 assert.equal(box.getItem(KEY+"-corrupt-backup"),broken);
 assert.equal(box.getItem(KEY),broken,"Backup must precede any overwrite");
 assert(H.persist(()=>box,KEY,result.save));
 assert.notEqual(box.getItem(KEY),broken);
});
check("Existing different backup protects corrupt original from being overwritten",()=>{
 const broken="{another broken save";
 const box=storage({[KEY]:broken,[KEY+"-corrupt-backup"]:"{older backup", [MARKER]:"done"});
 const result=H.bootstrap(()=>box,KEY,MARKER,defaults,modes);
 assert.equal(result.warning,"corrupt-unbacked");
 assert.equal(result.writable,false);
 assert.equal(box.getItem(KEY),broken);
});
check("Storage denial is nonfatal and never claims durable progress",()=>{
 const deny=()=>{throw Error("SecurityError");};
 const result=H.bootstrap(deny,KEY,MARKER,defaults,modes);
 assert.equal(result.writable,false);
 assert.equal(result.warning,"storage-unavailable");
 assert.equal(result.save.unlocked,0);
 assert.equal(H.persist(deny,KEY,result.save),false);
});
check("Old first-20 reset still happens once, retaining only player preferences",()=>{
 const old={unlocked:27,bestStars:{14:3},sound:false,reduceMotion:true,playMode:"v3"};
 const box=storage({[KEY]:JSON.stringify(old)});
 const first=H.bootstrap(()=>box,KEY,MARKER,defaults,modes);
 assert.equal(first.save.unlocked,0);
 assert.deepEqual(first.save.bestStars,{});
 assert.equal(first.save.sound,false);
 assert.equal(first.save.reduceMotion,true);
 assert.equal(first.save.playMode,"v3");
 assert.equal(box.getItem(MARKER),"done");
 first.save.bestStars[0]=2;first.save.unlocked=1;
 assert(H.persist(()=>box,KEY,first.save));
 const second=H.bootstrap(()=>box,KEY,MARKER,defaults,modes);
 assert.equal(second.save.unlocked,1);
 assert.equal(second.save.bestStars[0],2);
});
check("Explicit full reset starts a clean level-one profile without touching unrelated storage",()=>{
 const old={...defaults,unlocked:64,playMode:"standard",sound:false,
  bestStars:{0:3,49:2},bestScores:{49:12000},
  fourFamilyStars:{0:3},assistedStars:{3:1},
  economy:{version:1,coins:700,paidStars:{0:3},owned:["koi"]},
  omamoriCards:{version:2,counts:{koi:3},discovered:["koi"],
   replay:{day:"2026-10-30",claims:5}},
  fortune:{version:1,lastDate:"2026-10-30",lastDraw:{id:"daikichi"},count:9},
  run:{level:64,data:{board:[],moves:1}}};
 const oldCopy=JSON.stringify(old);
 const box=storage({[KEY]:oldCopy,[KEY+"-corrupt-backup"]:oldCopy,
  [MARKER]:"done","other-app-save":"untouched"});
 const reset=H.resetProgress(()=>box,KEY,defaults);
 assert.equal(reset.ok,true);
 assert.equal(box.getItem("other-app-save"),"untouched");
 assert.equal(box.getItem(MARKER),"done");
 assert.equal(box.getItem(KEY+"-corrupt-backup"),null);
 const boot=H.bootstrap(()=>box,KEY,MARKER,defaults,modes);
 assert.equal(boot.save.unlocked,0);
 assert.equal(boot.save.run,null);
 assert.deepEqual(boot.save.bestStars,{});
 assert.deepEqual(boot.save.bestScores,{});
 assert.deepEqual(boot.save.fourFamilyStars,{});
 assert.equal(boot.save.playMode,"auto");
 assert.equal(boot.save.sound,true);
 assert.equal(E.snapshot(boot.save).coins,0);
 assert.equal(C.total(boot.save),0);
 assert.equal(boot.save.fortune,undefined);
 assert.equal(boot.save.spirits,undefined);
 assert.equal(boot.save.assistedStars,undefined);
 assert.equal(H.resetProgress(()=>{throw Error("blocked");},KEY,defaults).ok,false);
});
check("Reset control must be explicit, confirmed and use the guarded local save adapter",()=>{
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 assert(app.includes("Reset my progress…"));
 assert(app.includes("function confirmResetProgress()"));
 assert(app.includes("Erase my save & restart"));
 assert(app.includes("H.resetProgress(()=>window.localStorage,KEY,defaults)"));
 assert(app.includes("window.location.reload()"));
});
check("Real game snapshots from all active chapters survive validation",()=>{
 for(const level of [0,9,10,20,30,40,49,50]){
  const game=new R.Game(level,null,{seed:7300+level});
  const run={level,data:game.save()};
  assert.equal(H.validRun(run),true,"Level "+(level+1)+" was incorrectly rejected");
  assert.deepEqual(H.normalize({run},defaults).run,run);
 }
});
check("Malformed card arrays cannot masquerade as persisted owned Omamori",()=>{
 const save={omamoriCards:{version:1,cards:{sakura:[]},discovered:[],
  replay:[]}};
 C.initialize(save);
 assert.deepEqual(save.omamoriCards.counts,{});
 assert.equal(save.omamoriCards.version,2);
 assert.deepEqual(save.omamoriCards.replay,{day:"",claims:0});
});
check("Malformed Omamori daily replay counter cannot mint unlimited coins",()=>{
 const save={economy:{version:1,coins:10,owned:[],paidStars:{},equipped:null},
  omamoriCards:{version:1,cards:{},discovered:[],replay:{day:"2026-10-29",claims:"NaN"}}};
 C.initialize(save);
 assert.equal(save.omamoriCards.replay.claims,5);
 assert.equal(C.replayCoins(save,0,true,false,"2026-10-29"),0);
 assert.equal(save.economy.coins,10);
 assert.equal(C.replayCoins(save,0,true,false,"2026-10-30"),4);
 assert.equal(save.omamoriCards.replay.claims,1);
 for(let i=0;i<8;i++)C.replayCoins(save,0,true,false,"2026-10-30");
 assert.equal(save.omamoriCards.replay.claims,5);
 assert.equal(save.economy.coins,30);
});
check("Static page loads the save guard before the game entry point",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 assert(html.indexOf("harmony/save-health.js")>0);
 assert(html.indexOf("harmony/save-health.js")<html.indexOf("harmony/app.js"));
 assert(app.includes("H.bootstrap(()=>window.localStorage"));
 assert(app.includes("H.persist(()=>window.localStorage"));
 assert(!app.includes('JSON.parse(localStorage.getItem(KEY)'));
});
console.log("Technical Cleanup & Stability 1.0 regression tests passed.");
