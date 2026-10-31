"use strict";
/* Director 5.0 · local observations, real move/refill evidence, voluntary exports. */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js"),I=require("../harmony/player-insight.js"),
 G=require("../harmony/goshuincho.js"),H=require("../harmony/save-health.js"),
 P=require("../harmony/powers.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};

check("A real legal move records both boards, cascades and ACTUAL Director candidates",()=>{
 for(const level of [0,21,50,60]){
  const g=new R.Game(level,null,{seed:1303+level,directorMode:"v4"});
  const initial=I.snapshot(g);
  assert.equal(g.roundTrace.moves.length,0);
  assert.deepEqual(g.roundTrace.start,initial);
  const legal=R.validSwaps(g.board)[0];
  const move=g.swap(...legal,{decisionMs:3870});
  assert.equal(move.ok,true);
  const trace=g.roundTrace;
  assert(I.valid(trace));
  assert.equal(trace.partial,false);
  assert.equal(trace.moves.length,1);
  assert.equal(trace.moves[0].from,legal[0]);
  assert.equal(trace.moves[0].to,legal[1]);
  assert.equal(trace.moves[0].decisionMs,3870);
  assert.deepEqual(trace.moves[0].before,initial);
  assert.deepEqual(trace.moves[0].after,I.snapshot(g));
  assert(trace.moves[0].events.some(e=>e.type==="fusion"));
  assert.equal(trace.moves[0].refills.length,g.directorRefills);
  for(const decision of trace.moves[0].refills){
   assert.equal(decision.mode,"v4");
   assert(decision.candidateCount>=1);
   assert(decision.chosen>=0&&decision.chosen<decision.candidateCount);
   assert.equal(decision.candidates.length>0||decision.baselineAutoMatches>0,true);
   assert(["baseline","stronger-legal-opportunities","preserved-natural-cascade"].includes(decision.reason));
   assert(decision.threshold===null||Number.isFinite(decision.threshold));
  }
  assert(H.validRun({level,data:g.save()}));
 }
});
check("Invalid swaps are recorded separately, never spend turns, and are not success moves",()=>{
 const g=new R.Game(21,null,{seed:908, directorMode:"v4"});
 const before=I.snapshot(g);
 const r=g.swap(-1,100);
 assert.equal(r.ok,false);
 assert.deepEqual(I.snapshot(g),before);
 assert.equal(g.roundTrace.moves.length,0);
 assert.equal(g.roundTrace.rejected.length,1);
 assert.equal(g.roundTrace.rejected[0].from,-1);
 assert.equal(g.roundTrace.rejected[0].to,100);
 assert(H.validRun({level:21,data:g.save()}));
});
check("Returning to an unfinished saved round preserves all prior moves without duplication",()=>{
 const g=new R.Game(21,null,{seed:5193,directorMode:"v4"});
 let pair=R.validSwaps(g.board)[0];
 assert(g.swap(...pair).ok);
 const saved=g.save(),copy=new R.Game(21,saved,{fastRestore:false});
 assert.deepEqual(copy.roundTrace,saved.roundTrace);
 pair=R.validSwaps(copy.board)[0];
 assert(copy.swap(...pair).ok);
 assert.equal(copy.roundTrace.moves.length,2);
 assert.deepEqual(copy.roundTrace.moves[0],saved.roundTrace.moves[0]);
 assert.equal(saved.roundTrace.moves.length,1);
 const old={...saved};delete old.roundTrace;
 assert(H.validRun({level:21,data:old}));
 const historic=new R.Game(21,old,{fastRestore:false});
 assert.equal(historic.roundTrace.partial,true);
 assert.equal(historic.roundTrace.moves.length,0);
});
check("BestHint trial clones do not record imaginary moves into real round logs",()=>{
 const g=new R.Game(21,null,{seed:41502,directorMode:"v4"});
 const before=g.save();
 const hint=R.bestHint(g);
 assert(hint);
 assert.deepEqual(g.save(),before);
 const trial=new R.Game(21,before,{fastRestore:true});
 assert.equal(trial.traceEnabled,false);
 assert(trial.swap(hint.from,hint.to).ok);
 assert.deepEqual(trial.roundTrace,before.roundTrace);
});
check("Omamori effects and Afterglow are represented in the exported round",()=>{
 const g=new R.Game(21,null,{seed:60007,directorMode:"v4"});
 const target=g.board.findIndex(p=>p.stage===1);
 const before=I.snapshot(g);
 assert(P.apply(g,"sakura",target).ok);
 assert(g.activateOmamoriAfterglow());
 g.recordOmamoriUse("sakura",before);
 assert.equal(g.roundTrace.cards.length,1);
 assert.equal(g.roundTrace.cards[0].card,"sakura");
 assert.equal(g.roundTrace.cards[0].afterglow,2);
 const [a,b]=R.validSwaps(g.board)[0];
 assert(g.swap(a,b).ok);
 const exportData=I.last(g,g.roundTrace,I.readProfile({},G));
 assert.equal(exportData.format,"japanese-harmony-round");
 assert.equal(exportData.round.cards.length,1);
 assert.equal(exportData.round.moves.length,1);
 assert.equal(exportData.level,22);
 assert.equal(exportData.result.movesUsed,1);
 assert.equal(exportData.privacy.includes("No account"),true);
 assert.equal(Object.hasOwn(exportData,"balance"),false);
});
check("Omamori-made cascades are traced with their real refill candidates",()=>{
 const g=new R.Game(21,null,{seed:2323,directorMode:"v4"});
 const at=g.board.findIndex(p=>p.stage===1);
 g.board[at].stage=4;
 const before=I.snapshot(g);
 g.beginOmamoriTrace();
 const effect=P.apply(g,"sakura",at);
 assert(effect.ok);
 assert(g.activateOmamoriAfterglow());
 g.recordOmamoriUse("sakura",before,effect.events);
 const entry=g.roundTrace.cards[0];
 assert(entry.events.some(x=>x.type==="power"));
 assert(entry.events.some(x=>x.type==="pulse"||x.type==="hero"));
 assert(entry.refills.length>=1,"A card-triggered fusion should record the Director refill");
 assert.equal(entry.refills[0].candidateCount>=1,true);
 assert.equal(g.traceCurrentTurn,null);
 const g2=new R.Game(21,null,{seed:3323,directorMode:"v4"});
 g2.beginOmamoriTrace();
 g2.discardOmamoriTrace();
 assert.equal(g2.roundTrace.cards.length,0,"Cancelled card must not appear");
});
check("Local Goshuincho observation gives evidence, not inferred purchase preferences",()=>{
 const save={unlocked:26,bestStars:{21:2,22:3},bestScores:{21:2500},
  fourFamilyStars:{0:3},fourFamilyScores:{}};
 const g=new R.Game(21,null,{seed:909,directorMode:"v4"});
 g.complete=true;g.goalMove=8;g.bestChain=6;g.masterpieces=2;g.fusions=9;
 assert.equal(I.recordRound(save,g,0),true);
 assert.equal(I.recordRound(save,g,0),false);
 assert.equal(save.playerInsight.rounds,1);
 assert.equal(save.playerInsight.largeChains,1);
 assert.equal(save.playerInsight.masterpieces,2);
 assert.equal(I.readProfile(save,G).confidence,"insufficient");
 assert.equal(I.readProfile(save,G).preference,"undetermined");
 assert.equal(I.readProfile(save,G).personalizationActive,false);
 assert.equal(Object.hasOwn(save.playerInsight,"purchaseIntent"),false);
});
check("Telemetry has bounded length and rejects malformed round snapshots",()=>{
 const g=new R.Game(21,null,{seed:4557});
 const trace=g.roundTrace;
 for(let i=0;i<I.MAX_MOVES+3;i++){
  const turn=I.beginMove(g,14,21,null);
  I.finishMove(trace,turn,g,[]);
 }
 assert.equal(trace.moves.length,I.MAX_MOVES);
 assert.equal(trace.truncated,true);
 const bad=g.save();bad.roundTrace={version:1,moves:[{fake:true}]};
 assert.equal(H.validRun({level:21,data:bad}),false);
});
check("Victory has a small, voluntary export; no separate test mode or auto-upload",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../harmony/player-insight.css"),"utf8");
 assert(html.indexOf("player-insight.js?v=")>0);
 assert(html.indexOf("player-insight.js?v=")<html.indexOf("rules.js?v="));
 assert(app.includes("Export round · JSON"));
 assert(app.includes('a.download="japanese-harmony-level-"'));
 assert(app.includes("I.readProfile(save,G)"));
 assert(app.includes("I.recordRound(save,game,rewardStarsAtLevelStart)"));
 assert(css.includes("jh-round-export"));
 assert(!app.includes("fetch(" + '"/api/director-insights'));
});
console.log("Director 5.0 Player Insight Foundation checks passed.");
