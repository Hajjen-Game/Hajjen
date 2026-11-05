"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const P=require("../harmony/journey-progression.js");
const G=require("../harmony/goshuincho.js");
const D=require("../harmony/journey-levels-v2.js");
const ARCH=require("../harmony/level-architecture.js");
const E=require("../harmony/economy.js");
const C=require("../harmony/cards.js");
const R=require("../harmony/rules.js");
const A=require("../harmony/puzzle-architect.js");
const O=require("../harmony/journey-authored-openings.js");
const check=(title,fn)=>{fn();console.log("PASS "+title);};
const copy=v=>JSON.parse(JSON.stringify(v));
const legacy=()=>({
 unlocked:39,bestStars:{20:3,24:2,30:1},
 bestScores:{20:4200,24:3600,30:600},bestChain:{20:6},
 fourFamilyStars:{0:3,1:2},fourFamilyScores:{0:8000},fourFamilyChain:{0:5},
 assistedStars:{24:2},assistedScores:{24:2500},
 economy:{version:1,coins:476,paidStars:{20:3,24:2},owned:["sakura"],equipped:null},
 omamoriCards:{version:2,counts:{sakura:2,grandBloom:1},discovered:["sakura","grandBloom"],
  replay:{day:"2026-11-05",claims:0}},
 run:{level:24,data:{moves:10,levelRecipe:{id:"obsolete-level"},seed:125,rolls:1,board:[]}},
 lastBackground:2,fortune:{version:1,lastDate:"2026-11-04"}
});
const clear=(index,stars=2,assisted=false,score=1120)=>{
 const recipe=D.get(index);
 return {level:index,levelRecipe:ARCH.normalize(recipe,index),complete:true,assisted,
  stars:()=>stars,score,bestChain:4};
};

check("Migration preserves old records, owned cards, wallet and level access but grants zero new stamps",()=>{
 const save=legacy(),before=copy(save);
 const migrated=P.initialize(save);
 assert.equal(migrated.created,true);
 assert.equal(migrated.state.version,2);
 assert.equal(migrated.state.legacyUnlocked,39);
 assert.equal(P.unlocked(save),39);
 assert.equal(G.levelStatus(save,24).playable,true);
 assert.equal(G.archivedStars(save,20),0);
 assert.equal(G.archivedStars(save,24),0);
 assert.equal(G.archivedStars(save,0),0);
 assert.equal(G.summary(save).earned,0);
 assert.equal(G.chapterSnapshot(save,2).completed,false);
 for(const field of ["bestStars","bestScores","bestChain","fourFamilyStars",
  "fourFamilyScores","fourFamilyChain","assistedStars","assistedScores",
  "economy","omamoriCards","run","fortune"])
  assert.deepEqual(save[field],before[field],"Legacy content rewritten: "+field);
 assert.equal(E.snapshot(save).coins,476);
 assert.equal(C.total(save),3);
 assert.equal(P.initialize(save).created,false,"Migration must be idempotent");
 assert.deepEqual(P.initialize(save).state,save.journeyProgression);
});

check("Only exact Puzzle Architect versions can create or display Goshuincho stamps",()=>{
 const save=legacy();P.initialize(save);
 const win=clear(24);
 const first=P.complete(save,win);
 assert(first.ok&&first.newStamp);
 assert.equal(first.receipt,P.signature(24));
 assert.equal(P.stars(save,24),2);
 assert.equal(P.score(save,24),1120);
 assert.equal(G.archivedStars(save,24),2);
 assert.equal(G.archivedStars(save,20),0);
 assert.equal(G.chapterSnapshot(save,2).earned,1);
 assert.equal(G.summary(save).earned,1);
 assert.equal(save.bestStars[24],2,"Old archived star remains untouched");
 assert.equal(save.bestScores[24],3600,"Old archived score remains untouched");
 assert.equal(P.totalStars(save),2);
 const replay=copy(save);
 assert.equal(P.initialize(replay).created,false);
 assert.equal(G.archivedStars(replay,24),2);
 assert.equal(P.unlocked(replay),39);
 const different=copy(replay);
 different.journeyProgression.stamps[24].signature=P.signature(23);
 assert.equal(G.archivedStars(different,24),0,"Different recipe cannot award a stamp");
 assert.equal(different.bestStars[24],2,"Historical archive survives invalid proof");
 const wrong=clear(24);
 wrong.levelRecipe.name="Forged but same recipe ID";
 assert.equal(P.complete(save,wrong).ok,false);
 const other=clear(24);other.levelRecipe=D.get(23);
 assert.equal(P.complete(save,other).ok,false);
 assert.equal(P.complete(save,{...win,complete:false}).ok,false);
});

check("Repeat clears improve signed stars and records but never duplicate a stamp",()=>{
 const save={unlocked:24};P.initialize(save);
 assert(P.complete(save,clear(24,1,false,500)).ok);
 assert.equal(G.summary(save).earned,1);
 const assisted=P.complete(save,clear(24,3,true,9000));
 assert(assisted.ok&&!assisted.newStamp);
 assert.equal(P.stars(save,24),1,"Assisted play may not raise clean star rating");
 assert.equal(P.score(save,24),500,"Assisted win may not replace clean record");
 assert.equal(P.get(save,24).assistedStars,1);
 assert(P.complete(save,clear(24,3,false,1800)).ok);
 assert.equal(P.stars(save,24),3);
 assert.equal(P.score(save,24),1800);
 assert.equal(G.summary(save).earned,1);
 assert.equal(G.summary(save).stars,3);
 assert.equal(P.unlocked(save),25);
});

check("A legitimate delivered Hanabi game earns an actual proof while a preview cannot",()=>{
 const game=A.build(R,O.get(4),{seed:123,recordRound:true,directorMode:"v63"});
 assert(game.swap(30,31).ok);
 assert(game.swap(30,37).ok);
 assert.equal(game.complete,true);
 assert.equal(game.lotusDelivered,1);
 const save={unlocked:4};P.initialize(save);
 const stamped=P.complete(save,game);
 assert(stamped.ok&&stamped.newStamp);
 assert.equal(G.archivedStars(save,4),game.stars());
 assert.equal(P.unlocked(save),5);
 const bad=copy(game.levelRecipe);
 bad.goal.count+=1;
 assert.equal(P.complete(save,{...game,levelRecipe:bad}).ok,false);
 assert.equal(P.complete(save, {...game,complete:false}).ok,false);
});

check("Historic rewards are preserved; only earned current Journey clears create new one-time receipts",()=>{
 const save=legacy();P.initialize(save);
 const oldCoins=save.economy.coins,oldPaid=copy(save.economy.paidStars);
 // Simply migrating a profile does not mint any currency.
 E.initialize(save);
 assert.equal(save.economy.coins,oldCoins);
 assert.equal(save.economy.journeyPaidStars&&Object.keys(save.economy.journeyPaidStars).length,0);
 const stamp=P.complete(save,clear(24,2,false,2000));
 assert(stamp.ok);
 const reward=E.claim(save,24,stamp.stars,stamp.receipt);
 assert.equal(reward.delta,28);
 assert.equal(save.economy.coins,oldCoins+28);
 assert.deepEqual(save.economy.paidStars,oldPaid);
 assert.equal(E.claim(save,24,2,stamp.receipt).delta,0,"Same receipt cannot pay twice");
 const improved=P.complete(save,clear(24,3,false,2400));
 assert(improved.ok);
 assert.equal(E.claim(save,24,3,improved.receipt).delta,8);
 assert.equal(E.claim(save,24,3,improved.receipt).delta,0);
 assert.equal(save.economy.coins,oldCoins+36);
 assert.deepEqual(save.economy.paidStars,oldPaid);
 assert.equal(C.total(save),3);
 const reloaded=copy(save);
 assert.equal(E.claim(reloaded,24,3,improved.receipt).delta,0,"Reload must retain receipt history");
 assert.equal(reloaded.economy.coins,oldCoins+36);
});

check("A current signed active round can resume, while an obsolete run with the same level cannot",()=>{
 const save=legacy();P.initialize(save);
 const real=A.build(R,O.get(24),{seed:20261105,recordRound:true,directorMode:"v63"});
 save.run={level:24,data:real.save()};
 assert(P.matchesRun(save.run));
 assert.equal(G.levelStatus(save,24).resumable,true);
 const wrong=copy(save.run);wrong.data.levelRecipe.name="Different puzzle with same index";
 save.run=wrong;
 assert.equal(P.matchesRun(save.run),false);
 assert.equal(G.levelStatus(save,24).resumable,false);
 assert.equal(P.unlocked(save),39);
});

check("Old unversioned standalone Goshuincho summaries remain read-only compatible",()=>{
 const raw=legacy();
 assert.equal(G.archivedStars(raw,24),2);
 assert(G.summary(raw).earned>0);
 assert.equal(raw.journeyProgression,undefined);
});

check("Production wiring uses versioned achievements without rewriting historical stars",()=>{
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert(app.includes("JP.initialize(save).created"));
 assert(app.includes("JP.complete(save,game)"));
 assert(app.includes("JP.matchesRun(run)"));
 assert(app.includes("JP.get(save,level)?.signature"));
 assert(app.includes("const stars=JP.totalStars(save)"));
 assert(!app.includes("save.fourFamilyStars[level]=Math.max"));
 assert(!app.includes("save.bestStars[level]=Math.max"));
 assert(html.indexOf("journey-levels-v2.js")<html.indexOf("journey-progression.js"));
 assert(html.indexOf("journey-progression.js")<html.indexOf("goshuincho.js"));
 assert(html.indexOf("journey-progression.js")<html.indexOf("app.js"));
});
console.log("Journey Progression Integrity 2.0 all checks passed.");
