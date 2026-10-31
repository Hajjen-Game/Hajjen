"use strict";
/* Moon Mirrors 1.0: use the REAL game engine, not a synthetic beam-only model. */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const I=require("../harmony/player-insight.js");
function check(name,fn){fn();console.log("OK "+name);}
function preview(key,seed=20261031){
 return new R.Game(2,null,{seed,directorMode:"v4",moonMirrorPreview:key});
}
const turn=g=>g.swap(23,24);
check("all three authored scenarios open on a legitimate, unforced swap",()=>{
 for(const key of ["first","mist","chain"]){
  const game=preview(key);
  assert.equal(R.scan(game.board).length,0);
  assert(R.validSwaps(game.board).some(([a,b])=>a===23&&b===24));
  assert.equal(game.board[23].stage,4);
  assert(game.moonMirrors.length>=1);
 }
});
check("one-hop reflection upgrades a target outside the ordinary four-cell Pulse",()=>{
 const game=preview("first"),before=game.board[26].stage,evt=turn(game);
 assert.equal(evt.ok,true);assert.equal(game.complete,true);
 const pulses=evt.events.filter(x=>x.type==="pulse");
 assert.equal(pulses.length>=1,true);
 assert(pulses[0].reflections.some(r=>r.from===25&&r.to===26&&r.source===24));
 assert(pulses[0].targets.some(x=>x.to===26&&x.via==="mirror"));
 assert(game.board[26]?.stage!==before||game.masterpieces>0);
 const logged=game.roundTrace.moves[0].events.filter(x=>x.type==="pulse");
 assert(logged[0].reflections.some(x=>x.to===26));
 assert(logged[0].targets.some(x=>x.to===26&&x.via==="mirror"));
});
check("mist-only tiles are cleansed by real reflected energy, even when empty",()=>{
 const game=preview("mist");game.board[26]=null;
 const {ok,events}=turn(game);assert.equal(ok,true);
 assert.equal(game.mist[26],0);assert.equal(game.mist[22],0);
 assert(game.mistCleared>=2);
 assert(events.some(e=>e.type==="pulse"&&e.reflections.some(r=>r.to===26)));
});
check("a reflected stage-five object starts a second genuine Harmony Pulse wave",()=>{
 const game=preview("chain"),result=turn(game);
 assert.equal(result.ok,true);
 const pulses=result.events.filter(e=>e.type==="pulse");
 assert(pulses.length>=2);
 assert(pulses[0].reflections.some(r=>r.to===26));
 assert(pulses[1].reflections.some(r=>r.to===40));
 assert(game.masterpieces>=2);
 assert.equal(game.complete,true);
});
check("reflected Daruma target receives exactly one eye hit",()=>{
 const game=preview("first");
 game.board[26]={family:"daruma",stage:0,id:-27};game.daruma[26]=2;game.darumaVersion=1;
 assert.equal(turn(game).ok,true);
 assert.equal(game.daruma[26],1);
 assert(game.roundTrace.moves[0].events.some(e=>e.type==="daruma"&&e.hits===undefined));
});
check("reflected Sealed Stone receives exactly one damage",()=>{
 const game=preview("first");
 game.board[26]={family:"sealedStone",stage:0,id:-126};game.sealed[26]=4;game.sealedStoneVersion=1;
 assert.equal(turn(game).ok,true);
 assert.equal(game.sealed[26],3);
});
check("mirror overlay survives save/restore without changing board, RNG, or results",()=>{
 const game=preview("chain"),saved=JSON.parse(JSON.stringify(game.save()));
 const restored=new R.Game(2,saved,{fastRestore:true});
 assert.deepEqual(restored.moonMirrors,game.moonMirrors);
 assert.deepEqual(restored.config.goal,game.config.goal);
 assert.equal(restored.moonMirrorPreview,"chain");
 assert.deepEqual(restored.board,game.board);
 assert.equal(restored.rolls,game.rolls);
 const a=turn(game),b=turn(restored);
 assert.equal(a.ok,true);assert.equal(b.ok,true);
 assert.deepEqual(JSON.parse(JSON.stringify(restored.save())),JSON.parse(JSON.stringify(game.save())));
});
check("ordinary level 3 and other live chapters have no mirrors or altered goals",()=>{
 const before=R.levelConfig(2),ordinary=new R.Game(2,null,{seed:20261031,directorMode:"v4"});
 assert.deepEqual(ordinary.moonMirrors,[]);
 assert.equal(ordinary.moonMirrorPreview,null);
 assert.deepEqual(ordinary.config.goal,before.goal);
 assert.equal(ordinary.config.moves,before.moves);
 for(const i of [0,20,30,50,60]){
  const game=new R.Game(i,null,{seed:20261031,directorMode:"v4"});
  assert.deepEqual(game.moonMirrors,[]);
 }
});
check("voluntary exported round identifies the unranked preview and reflected hits",()=>{
 const game=preview("mist");turn(game);
 const report=I.last(game,game.roundTrace,null,null);
 assert.equal(report.result.unranked,true);assert.equal(report.result.stars,0);
 assert.equal(report.preview,"mist");
 assert.equal(report.moonMirrors.length,2);
 assert(report.round.moves[0].events.some(e=>e.type==="pulse"&&e.reflections?.length===2));
});
console.log("Moon Mirrors 1.0 engine integration: all tests passed");
