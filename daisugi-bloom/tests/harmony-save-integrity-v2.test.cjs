"use strict";
const assert=require("node:assert/strict");
const H=require("../harmony/save-health.js");
const R=require("../harmony/rules.js");
const A=require("../harmony/puzzle-architect.js");
const D=require("../harmony/journey-levels-v2.js");
const O=require("../harmony/journey-authored-openings.js");

const KEY="japanese-harmony-puzzle-v2";
const MARKER="japanese-harmony-first20-reset-20261024-v1";
const defaults={unlocked:0,bestStars:{},bestScores:{},bestChain:{},run:null,
 sound:true,reduceMotion:false,playMode:"auto",fourFamilyScores:{},
 fourFamilyStars:{},fourFamilyChain:{}};
const clone=value=>JSON.parse(JSON.stringify(value));
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const storage=(initial={})=>{
 const map=new Map(Object.entries(initial));
 return {getItem:k=>map.has(k)?map.get(k):null,
  setItem(k,v){map.set(k,String(v));},
  removeItem(k){map.delete(k);},map};
};
const gameFor=(index,seed=20261105)=>{
 const blueprint=O.get(index);
 return blueprint?A.build(R,blueprint,{seed,recordRound:true,directorMode:"v63"}):
  new R.Game(index,null,{seed,directorMode:"v63",
   journeyDiagnostic:true,levelRecipe:D.get(index)});
};
const runFor=game=>({level:game.level,data:game.save(),backgroundId:1});

check("All 40 production Journey games, including 15 Hanabi levels, save and restore",()=>{
 let hanabi=0;
 assert.equal(D.COUNT,40);
 for(let i=0;i<40;i++){
  const game=gameFor(i,20261105+i);
  if(game.hanabiVersion===2)hanabi++;
  const start=runFor(game);
  assert(H.validRun(start),"Rejected authentic start snapshot for level "+(i+1));
  const choices=R.validSwaps(game.board);
  assert(choices.length>=1,"No real opening move on level "+(i+1));
  assert(game.swap(...choices[0]).ok,"Opening swap failed on level "+(i+1));
  const next=runFor(game);
  assert(H.validRun(next),"Rejected authentic mid-round snapshot for level "+(i+1));
  const snapshot={...defaults,unlocked:i,run:next,bestStars:{3:2},
   economy:{version:1,coins:217,owned:[],paidStars:{}},
   omamoriCards:{version:2,counts:{sakura:2},discovered:["sakura"],
    replay:{day:"2026-11-05",claims:0}}};
  const raw=JSON.stringify(snapshot);
  const box=storage({[KEY]:raw,[MARKER]:"done"});
  const boot=H.bootstrap(()=>box,KEY,MARKER,defaults,{auto:"auto",v62:"v63"});
  assert.equal(boot.warning,null,"Unexpected recovery warning at level "+(i+1));
  assert.equal(boot.writable,true);
  assert.deepEqual(boot.save.run,next,"Snapshot changed on reload");
  assert.equal(boot.save.economy.coins,217,"Coins changed on reload");
  assert.equal(boot.save.omamoriCards.counts.sakura,2,"Cards changed on reload");
  assert.equal(box.getItem(KEY),raw,"Loading a good save rewrote storage");
  const restored=new R.Game(i,boot.save.run.data,{fastRestore:true});
  assert.deepEqual(restored.board,game.board,"Restored board differs on level "+(i+1));
  assert.equal(restored.moves,game.moves,"Moves changed on reload");
  assert.equal(restored.config.levelRecipeId,D.get(i).id);
  assert.equal(restored.directorMode,"v63");
 }
 assert.equal(hanabi,15,"Keep coverage for every currently published Hanabi level");
});

check("An actual Hanabi delivery stays resumable after cargo lands in its crate",()=>{
 const game=gameFor(4,123);
 assert(game.swap(30,31).ok);
 assert(game.swap(30,37).ok);
 assert.equal(game.lotusDelivered,1);
 const run=runFor(game);
 assert(H.validRun(run),"Delivered Hanabi round was rejected");
 const box=storage({[KEY]:JSON.stringify({...defaults,unlocked:4,run}),
  [MARKER]:"done"});
 const boot=H.bootstrap(()=>box,KEY,MARKER,defaults,{auto:"auto"});
 assert(boot.save.run);
 const resumed=new R.Game(4,boot.save.run.data);
 assert.equal(resumed.lotusDelivered,1);
 assert.deepEqual(resumed.board,game.board);
});

check("A legacy level-61 Hanabi pilot still validates without an authored recipe",()=>{
 const game=new R.Game(60,null,{seed:42691});
 assert.equal(game.hanabiVersion,2);
 assert.equal(game.lotusVersion,1);
 assert.equal(H.validRun(runFor(game)),true);
 const old=new R.Game(24,null,{seed:461});
 assert.equal(H.validRun(runFor(old)),true);
});

check("The Hanabi exception rejects tampered recipes, crates and deliveries",()=>{
 const good=runFor(gameFor(24,20261105)); // Level 25 has two Hanabi routes
 assert(H.validRun(good));
 const invalid=mutate=>{const x=clone(good);mutate(x.data);assert.equal(H.validRun(x),false);};
 invalid(d=>{delete d.levelRecipe;});
 invalid(d=>{d.levelArchitectureVersion=999;});
 invalid(d=>{d.levelRecipe.index=23;});
 invalid(d=>{d.levelRecipe.mechanics.hanabi.crates[0]=48;});
 invalid(d=>{d.lotus.exits[0]=48;});
 invalid(d=>{d.lotusDelivered=d.lotus.starts.length+1;});
 invalid(d=>{d.hanabiVersion=1;});
 invalid(d=>{const crate=d.lotus.exits[0];d.board[crate]={family:"sakura",id:100001,stage:1};});
 invalid(d=>{d.roundTrace.seed=999;});
 const unknown=runFor(new R.Game(30,null,{seed:500}));
 unknown.level=29;
 assert.equal(H.validRun(unknown),false,"Cross-level save must not be accepted");
});

check("Invalid stored rounds receive a full recoverable backup without losing achievements",()=>{
 const good=runFor(gameFor(4,123));const broken=clone(good);
 broken.data.lotusDelivered=999;
 const old={...defaults,unlocked:23,bestStars:{20:3},run:broken,
  economy:{version:1,coins:800,paidStars:{20:3},owned:["koi"]},
  omamoriCards:{version:2,counts:{grandBloom:3},discovered:["grandBloom"]}};
 const raw=JSON.stringify(old),box=storage({[KEY]:raw,[MARKER]:"done",
  "another-game":"leave intact"});
 const boot=H.bootstrap(()=>box,KEY,MARKER,defaults,{auto:"auto"});
 assert.equal(boot.warning,"invalid-run");
 assert.equal(boot.writable,true);
 assert.equal(boot.save.run,null,"Invalid run must not crash the game");
 assert.equal(boot.save.unlocked,23);
 assert.deepEqual(boot.save.bestStars,{20:3});
 assert.equal(boot.save.economy.coins,800);
 assert.deepEqual(boot.save.omamoriCards.counts,{grandBloom:3});
 assert.equal(box.getItem(KEY+"-invalid-run-backup"),raw);
 assert.equal(box.getItem(KEY),raw,"Startup must not replace the original");
 assert.equal(box.getItem("another-game"),"leave intact");
 assert(H.persist(()=>box,KEY,boot.save));
 assert.notEqual(box.getItem(KEY),raw);
 assert.equal(box.getItem(KEY+"-invalid-run-backup"),raw,
  "Recovery backup survives future successful writes");
});

check("Occupied or unwritable backup never silently replaces the only bad save",()=>{
 const broken=clone(runFor(gameFor(4,123)));
 broken.data.lotusDelivered=777;
 const raw=JSON.stringify({...defaults,run:broken});
 const box=storage({[KEY]:raw,[MARKER]:"done",
  [KEY+"-invalid-run-backup"]:"a different older recovery"});
 const result=H.bootstrap(()=>box,KEY,MARKER,defaults,{auto:"auto"});
 assert.equal(result.warning,"invalid-run-unbacked");
 assert.equal(result.writable,false);
 assert.equal(box.getItem(KEY),raw);
 assert.equal(box.getItem(KEY+"-invalid-run-backup"),"a different older recovery");
 const locked={
  getItem:box.getItem,setItem(){throw Error("QuotaExceededError");},
  removeItem:box.removeItem
 };
 const denied=H.bootstrap(()=>locked,KEY,MARKER,defaults,{auto:"auto"});
 assert.equal(denied.writable,false);
 assert.equal(denied.warning,"invalid-run-unbacked");
 assert.equal(box.getItem(KEY),raw);
});

check("Only an explicitly requested reset clears the new recovery backup",()=>{
 const box=storage({[KEY]:"{}",[MARKER]:"done",
  [KEY+"-invalid-run-backup"]:"old broken snapshot",
  [KEY+"-corrupt-backup"]:"old broken JSON",
  "another-game":"keep"});
 const result=H.resetProgress(()=>box,KEY,defaults);
 assert(result.ok);
 assert.equal(box.getItem(KEY+"-invalid-run-backup"),null);
 assert.equal(box.getItem(KEY+"-corrupt-backup"),null);
 assert.equal(box.getItem("another-game"),"keep");
});

console.log("Save Integrity 2.0 · all production and recovery contracts passed.");
