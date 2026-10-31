"use strict";
/* Harmony Director 5.1 – observable player intent and round friction ONLY.
 * Never tune RNG, missions, move budgets, rewards or commercial offers.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const J=require("../harmony/player-intent.js");
const I=require("../harmony/player-insight.js");
const R=require("../harmony/rules.js");
const check=(label,fn)=>{fn();console.log("PASS "+label)};
const mock=(level,seed,won=false,chain=0)=>({
 level,seed,complete:won,failed:!won,assisted:false,
 bestChain:chain,stars:()=>won?3:0,progress:()=>won?7:1,
 target:()=>7,config:{goal:{type:"fusion",count:7}}
});
const trace=(n,{progress=false,invalid=0,drought=0,partial=false}={})=>({
 version:1,partial,goal:{type:"fusion",count:7},
 moves:Array.from({length:n},(_,i)=>({
  before:{progress:progress?i:0},after:{progress:progress?i+1:0},
  director:{objectiveDrought:drought},decisionMs:45000
 })),
 rejected:Array.from({length:invalid},()=>({reason:"The swap must match at least three"}))
});
check("Single slow turn, first failure and isolated signals are NOT labeled frustration",()=>{
 const failed=mock(21,1,false);
 const a=J.analyzeRound(failed,trace(1,{invalid:5}),0);
 assert.equal(a.friction.classification,"none");
 assert.equal(a.confidence,"insufficient");
 const b=J.analyzeRound(failed,trace(6,{progress:true}),0);
 assert.equal(b.friction.classification,"none");
 const won=mock(21,2,true);
 const c=J.analyzeRound(won,trace(6,{drought:0}),0);
 assert.equal(c.friction.classification,"none","One long objective stall alone is ambiguous");
 assert.equal(c.coverage.validMoves,6);
 assert(!JSON.stringify(c).includes("45000"),"A slow decision must never become a friction input");
});
check("Multiple independent obstacles raise a tentative ROUND flag only",()=>{
 const round=J.analyzeRound(mock(21,3,false),trace(6,{invalid:4,drought:5}),0);
 assert.equal(round.friction.classification,"watch");
 assert(round.friction.signals.includes("repeated-invalid-swaps"));
 assert(round.friction.signals.includes("extended-goal-stall"));
 assert(round.friction.signals.includes("director-observed-drought"));
 assert(round.friction.signals.includes("goal-not-reached"));
 assert.equal(round.friction.invalidSwaps,4);
 assert.equal(round.friction.longestGoalStall,6);
 assert.equal(round.intent.preference,"undetermined");
 assert.equal(round.status,"observational-only");
 assert.equal(J.analyzeRound(mock(21,4,true),trace(6,{invalid:4}),0).friction.classification,"watch",
  "Two independent obstacle signals may occur even in a won round");
 const partial=J.analyzeRound(mock(21,5,false),trace(6,{invalid:4,drought:5,partial:true}),0);
 assert.equal(partial.confidence,"partial");
});
check("First clears, real star replays and long chains are separate observations",()=>{
 const first=J.analyzeRound(mock(5,10,true,1),trace(6,{progress:true}),0);
 assert(first.intent.signals.includes("completed-new-level"));
 assert(!first.intent.signals.includes("improved-existing-star-record"));
 const replay=J.analyzeRound(mock(5,11,true,6),trace(6,{progress:true}),2);
 assert(replay.intent.signals.includes("replayed-completed-level"));
 assert(replay.intent.signals.includes("improved-existing-star-record"));
 assert(replay.intent.signals.includes("built-long-chain"));
 const same=J.analyzeRound(mock(5,12,false,1),trace(6,{progress:true}),3);
 assert(!same.intent.signals.includes("improved-existing-star-record"));
});
check("Only finished rounds are saved; multiple result displays cannot inflate history",()=>{
 const save={};
 const won=mock(21,123,true,6);
 const t=trace(6,{progress:true});
 assert.equal(J.observeRound(save,won,t,0),true);
 assert.equal(J.observeRound(save,won,t,0),false);
 assert.equal(save.playerIntentAwareness.observed,1);
 assert.equal(save.playerIntentAwareness.wins,1);
 assert.equal(save.playerIntentAwareness.losses,0);
 assert.equal(save.playerIntentAwareness.starImprovements,0);
 assert.equal(save.playerIntentAwareness.comboRounds,1);
 const ongoing={...mock(21,200,false),failed:false};
 assert.equal(J.observeRound(save,ongoing,t,0),false);
 const lost=mock(21,201,false),hard=trace(6,{invalid:4,drought:5});
 assert.equal(J.observeRound(save,lost,hard,0),true);
 assert.equal(save.playerIntentAwareness.observed,2);
 assert.equal(save.playerIntentAwareness.possibleFriction,1);
 assert.equal(save.playerIntentAwareness.losses,1);
 assert.equal(J.aggregate(save).confidence,"insufficient");
 assert.equal(J.aggregate(save).friction.trend,"not-established");
});
check("Intent is a cautious repeated-evidence hypothesis, never a purchase prediction",()=>{
 const save={};
 for(let n=0;n<9;n++){
  const g=mock(8,410+n,true,0);
  assert(J.observeRound(save,g,trace(6,{progress:true}),n===0?0:1));
 }
 const agg=J.aggregate(save);
 assert.equal(agg.observedRounds,9);
 assert.equal(agg.intent.hypothesis,"possible-star-improvement-interest");
 assert.equal(agg.intent.confidence,"tentative");
 assert.equal(agg.personalizationActive,false);
 assert.equal(agg.affectsDifficulty,false);
 assert.equal(agg.affectsOmamori,false);
 assert(!JSON.stringify(agg).includes("purchase"));
 assert(!JSON.stringify(agg).includes("spend"));
 const old=J.normalize({version:4,observed:1000,recent:[]});
 assert.equal(old.observed,0);
});
check("Round report preserves real previous-star context after result archive changes",()=>{
 const save={},g=mock(7,2026,true,6),t=trace(6,{progress:true});
 assert(J.observeRound(save,g,t,2));
 const report=J.report(save,g,t);
 assert.equal(report.observedInHistory,true);
 assert(report.round.intent.signals.includes("improved-existing-star-record"));
 assert.equal(report.round.coverage.validMoves,6);
 assert.equal(report.profile.intent.improvedStarRecords,1);
 assert.equal(report.profile.personalizationActive,false);
 const exported=I.last({
  ...g,config:{name:"Test",goal:{type:"fusion",count:7}},
  moves:2,score:100,assisted:false,stars:()=>3
 },t,{},report);
 assert.equal(exported.intentAwareness.profile.observedRounds,1);
 assert.equal(exported.intentAwareness.round.friction.classification,"none");
});
check("Bounded observations and repeated obstacles require multiple complete rounds",()=>{
 const save={};
 for(let n=0;n<40;n++){
  const g=mock(21,8000+n,false);
  assert(J.observeRound(save,g,trace(6,{invalid:4,drought:5}),0));
 }
 assert.equal(save.playerIntentAwareness.recent.length,30);
 assert.equal(save.playerIntentAwareness.observed,40);
 assert.equal(J.aggregate(save).friction.trend,"recurring-round-obstacles");
 assert.equal(J.aggregate(save).confidence,"moderate");
 assert.equal(J.normalize(save.playerIntentAwareness).recent.length,30);
});
check("Real game swaps and Directors behave exactly as before; report is observational",()=>{
 for(const level of [0,9,21,40,50,60]){
  const g=new R.Game(level,null,{seed:990+level,directorMode:"v4"});
  const original=g.save(),before=JSON.stringify(g.board);
  const hint=R.bestHint(g);
  assert(hint);
  assert.deepEqual(g.save(),original);
  assert.equal(J.analyzeRound(g,g.roundTrace,0).friction.classification,"none");
  assert.equal(JSON.stringify(g.board),before);
  const start=J.aggregate({});
  assert.equal(start.personalizationActive,false);
  assert.equal(start.affectsDifficulty,false);
  assert.equal(start.affectsOmamori,false);
 }
});
check("No separate test mode, no network upload, retry and victory export are local",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../harmony/player-insight.css"),"utf8");
 assert(html.indexOf("player-intent.js?v=")>0);
 assert(html.indexOf("player-intent.js?v=")<html.indexOf("app.js?v="));
 assert(app.includes("J.observeRound(save,game,game.roundTrace,rewardStarsAtLevelStart)"));
 assert(app.includes("J.report(save,game,game.roundTrace)"));
 assert(app.includes("panel.append(makeRoundExport(make))"));
 assert(css.includes("#modal .jh-round-export"));
 assert(!app.includes('fetch("/api/intent'));
 assert(!app.includes('fetch("/api/friction'));
});
console.log("Director 5.1 observational awareness contracts passed.");
