"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const H=require("../harmony/save-health.js");
const JP=require("../harmony/journey-progression.js");
const E=require("../harmony/economy.js");
const C=require("../harmony/cards.js");
const F=require("../harmony/fortune.js");
const D=require("../harmony/journey-levels-v2.js");
const R=require("../harmony/rules.js");
const A=require("../harmony/puzzle-architect.js");
const O=require("../harmony/journey-authored-openings.js");

const KEY="japanese-harmony-puzzle-v2";
const OLD_MARKER="japanese-harmony-first20-reset-20261024-v1";
const MARKER="japanese-harmony-architect40-director63-reset-20261105-v1";
const defaults={unlocked:0,bestStars:{},bestScores:{},bestChain:{},run:null,
 sound:true,reduceMotion:false,playMode:"auto",fourFamilyScores:{},
 fourFamilyStars:{},fourFamilyChain:{}};
const modes={auto:"Automatic",v63:"Director 6.3"};
const clone=x=>JSON.parse(JSON.stringify(x));
function storage(initial={}){
 const map=new Map(Object.entries(initial));
 return {map,getItem:k=>map.has(k)?map.get(k):null,
  setItem(k,v){map.set(k,String(v));},removeItem(k){map.delete(k);}};
}
function check(title,fn){fn();console.log("PASS "+title);}
function boot(box){return H.freshJourney(()=>box,KEY,MARKER,defaults,modes);}

check("Director 6.3 starts EVERY existing browser profile from level 1",()=>{
 const old={unlocked:67,sound:false,reduceMotion:true,playMode:"v62",
  bestStars:{0:3,21:2,60:3},bestScores:{0:9999},bestChain:{1:22},
  fourFamilyStars:{0:3},fourFamilyScores:{0:4200},assistedStars:{11:3},
  journeyProgression:{version:2,unlocked:40,stamps:{0:{stars:3}}},
  economy:{version:1,coins:7500,paidStars:{11:3},journeyPaidStars:{"old":3},owned:["koi"]},
  omamoriCards:{version:2,counts:{grandBloom:4},discovered:["grandBloom"]},
  fortune:{version:1,lastDate:"2026-11-04",count:7},
  run:{level:60,data:{moves:2,seed:22,board:[]}},
  archivedField:{mustNotSurvive:true}};
 const box=storage({[KEY]:JSON.stringify(old),[OLD_MARKER]:"done",
  [KEY+"-corrupt-backup"]:"archived",[KEY+"-invalid-run-backup"]:"archived",
  "unrelated-save":"must remain"});
 const result=boot(box),fresh=result.save;
 assert.equal(result.writable,true);
 assert.equal(result.resetApplied,true);
 assert.equal(result.warning,null);
 assert.equal(fresh.unlocked,0);
 for(const name of ["bestStars","bestScores","bestChain","fourFamilyStars","fourFamilyScores"])
  assert.deepEqual(fresh[name],{});
 for(const name of ["journeyProgression","economy","omamoriCards","fortune",
  "archivedField","assistedStars"])assert.equal(fresh[name],undefined,name+" survived reset");
 assert.equal(fresh.run,null);
 assert.equal(fresh.playMode,"auto");
 assert.equal(fresh.sound,false);
 assert.equal(fresh.reduceMotion,true);
 assert.equal(box.getItem(MARKER),"done");
 assert.equal(box.getItem(OLD_MARKER),null);
 assert.equal(box.getItem(KEY+"-corrupt-backup"),null);
 assert.equal(box.getItem(KEY+"-invalid-run-backup"),null);
 assert.equal(box.getItem("unrelated-save"),"must remain");
 assert.deepEqual(JSON.parse(box.getItem(KEY)),fresh);

 JP.initialize(fresh);E.initialize(fresh);C.initialize(fresh);F.initialize(fresh);
 assert.equal(JP.unlocked(fresh),0);
 assert.equal(JP.totalStars(fresh),0);
 assert.equal(E.snapshot(fresh).coins,0);
 assert.equal(C.total(fresh),0);
 assert.equal(fresh.fortune.count,0);
 assert.equal(fresh.fortune.lastDraw,null);
 assert(H.persist(()=>box,KEY,fresh));
 const second=boot(box);
 assert.equal(second.resetApplied,false);
 assert.deepEqual(second.save,clone(fresh),"Second launch must retain NEW progression");
});

check("An earlier damaged save cannot block the authorized fresh start",()=>{
 const box=storage({[KEY]:"{invalid json",
  [KEY+"-corrupt-backup"]:"another old save",
  [OLD_MARKER]:"done"});
 const result=boot(box);
 assert.equal(result.writable,true);
 assert.equal(result.resetApplied,true);
 assert.equal(result.save.unlocked,0);
 assert.equal(box.getItem(KEY+"-corrupt-backup"),null);
 assert.deepEqual(JSON.parse(box.getItem(KEY)),result.save);
});

check("New accounts remain clean, and localStorage denial is reported",()=>{
 const box=storage();
 const result=boot(box);
 assert.equal(result.writable,true);
 assert.equal(result.resetApplied,false);
 assert.equal(result.save.unlocked,0);
 assert.equal(box.getItem(MARKER),"done");
 const denied=H.freshJourney(()=>{throw Error("No storage");},KEY,MARKER,defaults,modes);
 assert.equal(denied.writable,false);
 assert.equal(denied.warning,"storage-unavailable");
});

check("Current release has exactly 40 approved recipes, all launch through Director 6.3",()=>{
 assert.equal(D.COUNT,40);
 assert.equal(JP.COUNT,40);
 assert.equal(D.get(40),null);
 for(let i=0;i<40;i++)assert(D.get(i),"Missing approved level "+(i+1));
 const game=A.build(R,O.get(4),{seed:20261105,recordRound:true,directorMode:"v63"});
 assert.equal(game.directorMode,"v63");
 assert.equal(game.levelRecipe.id,D.get(4).id);
 assert.equal(game.board.length,49);
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 assert(app.includes('const saveBootstrap=H.freshJourney('),"Release must use forced fresh start");
 assert(app.includes('const RESET_MARKER="'+MARKER+'"'));
 assert(app.includes("OFFICIAL_JOURNEY_LEVELS=40"));
});
console.log("PASS all 4 Director 6.3 fresh-Journey release invariants");
