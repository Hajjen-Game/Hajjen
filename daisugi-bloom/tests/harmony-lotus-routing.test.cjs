"use strict";
/* Lotus Stream 1.1 · routing and difficulty framework.
 * All four recipes are opt-in diagnostics. Live level 61 and levels 62+ stay unchanged.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const L=require("../harmony/lotus-stream.js"),
 LR=require("../harmony/lotus-routing.js"),
 R=require("../harmony/rules.js"),
 H=require("../harmony/save-health.js"),
 P=require("../harmony/powers.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};

check("Production Lotus pilot and levels beyond it remain untouched",()=>{
 for(const seed of [53,185,20261030]){
  const g=new R.Game(60,null,{seed,directorMode:"v4"});
  assert.equal(g.config.name,"First Lotus Stream");
  assert.equal(g.config.moves,38);
  assert.equal(g.lotusPrototype,null);
  assert.deepEqual(g.lotus.starts,[36,40]);
  assert.deepEqual(g.lotus.exits,[43,47]);
  assert.equal(R.validSwaps(g.board).length>=3,true);
  assert(H.validRun({level:60,data:g.save()}));
 }
 assert(R.levelConfig(61).name.startsWith("Endless · "));
 assert.equal(R.levelConfig(61).goal.type!=="lotus",true);
 assert.throws(()=>new R.Game(61,null,{seed:1,lotusPrototype:"long-drop"}),/fresh diagnostic level 61/);
});

check("Four prototype recipes cover long descent, multiple lanes, one shared gate and stones",()=>{
 assert.deepEqual(Object.keys(LR.prototypes),
  ["long-drop","three-lanes","shared-gate","garden-route"]);
 const names=Object.keys(LR.prototypes);
 const expected=[[[15,19],[43,47],0],[[22,24,26],[43,45,47],0],
  [[8,22,12],[43,47],0],[[15,19],[43,47],2]];
 for(let i=0;i<names.length;i++){
  const cfg=LR.get(names[i]);
  assert.deepEqual(cfg.lotus.starts,expected[i][0]);
  assert.deepEqual(cfg.lotus.exits,expected[i][1]);
  assert.equal(cfg.boardMechanics.blocked.length,expected[i][2]);
  assert.equal(cfg.lotus.starts.length>=cfg.lotus.exits.length,true);
  assert.equal(cfg.starPar<cfg.moves,true);
 }
 const twin=LR.get("shared-gate");
 assert.equal(twin.lotus.starts.filter(n=>n%7===1).length,2);
 assert.equal(twin.lotus.exits.filter(n=>n%7===1).length,1);
});

check("Validate routes and prevent impossible barriers and unserved gates",()=>{
 assert.throws(()=>LR.get("missing"),/Unknown Lotus prototype/);
 assert.throws(()=>LR.validate({version:1,starts:[15],exits:[44]},{}),/reachable exit/);
 assert.throws(()=>LR.validate({version:1,starts:[15],exits:[43]},
  {blocked:[29]}),/route blocked/);
 assert.throws(()=>LR.validate({version:1,starts:[15],exits:[43]},
  {blocked:[43]}),/route blocked/);
 assert.throws(()=>LR.validate({version:1,starts:[15,19],exits:[43]},{}),
  /reachable exit/);
 assert.throws(()=>L.normalize({version:1,starts:[15],exits:[43,47]}),
  /reachable exit/);
});

check("Diagnostics produce fair seedable openings with no match, consistent progress and safe reload",()=>{
 for(const key of Object.keys(LR.prototypes)){
  for(let seed=1;seed<=24;seed++){
   const g=new R.Game(60,null,{seed:seed*9949+171,lotusPrototype:key,directorMode:"v4"});
   const cfg=LR.get(key);
   assert.equal(g.lotusPrototype,key);
   assert.equal(g.lotusVersion,1);
   assert.deepEqual(g.config.goal,{type:"lotus",count:cfg.lotus.starts.length});
   assert.deepEqual(g.lotus,cfg.lotus);
   assert.deepEqual(g.boardMechanics,cfg.boardMechanics);
   assert.equal(g.progress(),0);
   assert.equal(R.scan(g.board).length,0);
   assert(R.validSwaps(g.board).length>=3);
   assert.deepEqual(g.board.flatMap((p,i)=>L.isSeed(p)?[i]:[]).sort((a,b)=>a-b),
    cfg.lotus.starts.slice().sort((a,b)=>a-b));
   assert(H.validRun({level:60,data:g.save()}));
   const original=g.save(),hint=R.bestHint(g);
   assert(hint&&Number.isInteger(hint.from)&&Number.isInteger(hint.to));
   assert.deepEqual(g.save(),original,"Hint previews may not mutate cargo or RNG");
   const continued=new R.Game(60,original,{fastRestore:true});
   assert.deepEqual(continued.save(),original,"Prototype saves must round-trip losslessly");
   assert.deepEqual(continued.board,g.board);
   assert.equal(continued.lotusPrototype,key);
   const before=LR.distance(g.board,g.lotus),after=continued.swap(hint.from,hint.to);
   assert(after.ok);
   assert(continued.lotusDelivered>=0);
   assert(continued.lotusDelivered<=cfg.lotus.starts.length);
   assert(LR.distance(continued.board,continued.lotus)<=before,
    "Lotus cargo cannot drift away from its own gate");
   assert(H.validRun({level:60,data:continued.save()}));
   for(const at of cfg.boardMechanics.blocked)
    assert.equal(continued.board[at].family,"terrain");
  }
 }
});

check("New hint priorities favor actual downward movement without inventing moves",()=>{
 const long=new R.Game(60,null,{seed:135,lotusPrototype:"long-drop",directorMode:"v4"});
 const before=long.board.map(p=>({...p}));
 const hint=R.bestHint(long);
 assert(hint);
 const trial=new R.Game(60,long.save(),{fastRestore:true});
 const result=trial.swap(hint.from,hint.to);
 assert(result.ok);
 assert(LR.advance(before,trial.board,long.lotus)>0||trial.lotusDelivered>0,
  "A guided opening should make real delivery progress");
 assert.deepEqual(long.board,before);
 assert.equal(long.moves,long.config.moves);
 assert(LR.hintBonus(before,trial.board,long.lotus,trial.lotusDelivered)>0);
 const score=LR.opportunity(long.board,long.lotus,R.validSwaps);
 assert(Number.isFinite(score)&&score>=0&&score<=3.3);
 const copy=JSON.stringify(long.board);
 LR.opportunity(long.board,long.lotus,R.validSwaps);
 assert.equal(JSON.stringify(long.board),copy,"Routing metric must never move objects");
});

check("Two seeds can use the same gate sequentially without being fused or lost",()=>{
 const g=new R.Game(60,null,{seed:13044,lotusPrototype:"shared-gate"});
 const gate=g.lotus.exits.find(at=>at%7===1);
 assert.equal(gate,43);
 assert.equal(g.board.filter(L.isSeed).length,3);
 const bottom=g.board.find(p=>L.isSeed(p)&&p.id===-2022);
 const top=g.board.find(p=>L.isSeed(p)&&p.id===-2008);
 g.board[gate]=bottom;
 let batch=L.collect(g.board,g.lotus.exits);
 assert.deepEqual(batch.map(p=>p.id),[-2022]);
 assert.equal(g.board.some(p=>p?.id===-2008),true);
 g.board[gate]=top;
 batch=L.collect(g.board,g.lotus.exits);
 assert.deepEqual(batch.map(p=>p.id),[-2008]);
 assert.notEqual(batch[0].id,-2022);
});

check("Long-route fixed stones stay fixed, and Omamori cannot target cargo",()=>{
 const g=new R.Game(60,null,{seed:80101,lotusPrototype:"garden-route"});
 assert.equal(g.boardMechanics.blocked.length,2);
 assert.equal(g.board[15].family,"lotusSeed");
 assert.equal(g.grow(15,new Set(),true),false);
 assert.equal(P.apply(g,"sakura",15).ok,false);
 assert.equal(g.swap(15,16).ok,false);
 const serial=g.board.filter(p=>L.isSeed(p)).map(p=>p.id).sort((a,b)=>a-b);
 let seed=1979;
 const shuffled=R.fairShuffle(g.board,()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;});
 assert.deepEqual(shuffled.filter(p=>L.isSeed(p)).map(p=>p.id).sort((a,b)=>a-b),serial);
 for(const at of g.lotus.starts)assert.deepEqual(shuffled[at],g.board[at]);
 for(const at of g.boardMechanics.blocked)assert.deepEqual(shuffled[at],g.board[at]);
});

check("Corrupted or mismatched prototype saves are rejected",()=>{
 const g=new R.Game(60,null,{seed:17,lotusPrototype:"three-lanes"});
 const run={level:60,data:g.save()},corrupt=()=>JSON.parse(JSON.stringify(run));
 assert(H.validRun(run));
 for(const [field,value] of [["lotusPrototype","missing"],["lotusPrototype","long-drop"]]){
  const x=corrupt();x.data[field]=value;
  assert.equal(H.validRun(x),false,"Invalid "+field+" should be rejected");
 }
 const invalid=corrupt();invalid.data.lotus.starts=[8,10,12];
 assert.equal(H.validRun(invalid),false);
 const invalidTerrain=corrupt();invalidTerrain.data.boardMechanics={...invalidTerrain.data.boardMechanics,blocked:[24]};
 assert.equal(H.validRun(invalidTerrain),false);
});

check("Routing support ships only as diagnostics; no production levels 62-70",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert(html.includes("lotus-routing.js?v="));
 assert(html.indexOf("lotus-routing.js?v=")<html.indexOf("rules.js?v="));
 const s=fs.readFileSync(path.join(__dirname,"../harmony/lotus-routing.js"),"utf8");
 assert(s.includes("DIAGNOSTIC ONLY"));
 for(let level=61;level<70;level++){
  const c=R.levelConfig(level);
  assert.equal(c.goal.type==="lotus",false);
  assert(c.name.startsWith("Endless · "));
 }
});
console.log("Lotus Stream 1.1 four-prototype routing validation passed.");
