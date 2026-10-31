"use strict";
/* Moon Mirrors 1.1: real fixed fixtures in the production rules engine. */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const I=require("../harmony/player-insight.js");
function check(name,fn){fn();console.log("OK "+name);}
function preview(key,seed=20261031){
 return new R.Game(2,null,{seed,directorMode:"v4",moonMirrorPreview:key});
}
const turn=g=>g.swap(17,24);
const keys=["first","mist","chain"];
check("all three scenarios use standalone, fixed mirrors with no family object",()=>{
 for(const key of keys){
  const g=preview(key);
  assert.equal(R.scan(g.board).length,0);
  assert(R.validSwaps(g.board).some(([a,b])=>a===17&&b===24));
  assert(R.validSwaps(g.board).length>=3);
  assert.equal(g.board[17].stage,4);
  assert.equal(g.board[24].stage,1);
  for(const {at} of g.moonMirrors){
   assert.deepEqual(g.board[at],{family:"moonMirror",stage:0,id:-(3000+at)});
   assert(!g.families.includes(g.board[at].family));
   assert(!R.validSwaps(g.board).some(pair=>pair.includes(at)));
  }
 }
});
check("fixed mirror cannot be swapped, matched, upgraded or counted as a Pulse hit",()=>{
 const g=preview("first");
 const before=g.save(),rejected=g.swap(24,25);
 assert.equal(rejected.ok,false);
 assert.match(rejected.reason,/Mirror/);
 assert.equal(g.moves,before.moves);
 assert.deepEqual(g.board,before.board);
 assert.equal(g.roundTrace.rejected.length,1);
 assert.equal(turn(g).ok,true);
 assert.deepEqual(g.board[25],{family:"moonMirror",stage:0,id:-3025});
 const first=g.roundTrace.moves[0].events.find(x=>x.type==="pulse");
 assert(first.mirrorTargets?.some(x=>x.to===25));
 assert.equal(first.targets?.some(x=>x.to===25),false);
});
check("reflected light reaches remote treasure beyond ordinary four-cell Pulse",()=>{
 const g=preview("first"),before=g.board[26].stage,evt=turn(g);
 assert.equal(evt.ok,true);assert.equal(g.complete,true);
 const pulse=evt.events.find(x=>x.type==="pulse");
 assert(pulse.reflections.some(r=>r.from===25&&r.to===26&&r.source===24));
 assert(pulse.targets.some(x=>x.to===26&&x.via==="mirror"));
 assert(g.board[26]?.stage!==before||g.masterpieces>0);
 assert(g.roundTrace.moves[0].events.some(x=>x.type==="pulse"&&x.reflections?.some(r=>r.to===26)));
});
check("mirror forwards to distant Mist even when its target cell is empty",()=>{
 const g=preview("mist");g.board[26]=null;
 const evt=turn(g);assert.equal(evt.ok,true);
 assert.equal(g.mist[26],0);assert.equal(g.mist[38],0);
 assert.equal(g.mistCleared,2);assert.equal(g.complete,true);
 assert(evt.events.some(e=>e.type==="pulse"&&e.reflections.some(r=>r.from===31&&r.to===38)));
 for(const {at} of g.moonMirrors)assert.equal(g.board[at].family,"moonMirror");
});
check("second stage-five masterpiece creates a genuine next Pulse and second reflection",()=>{
 const g=preview("chain"),res=turn(g);
 assert.equal(res.ok,true);assert.equal(g.complete,true);
 const pulses=res.events.filter(e=>e.type==="pulse");
 assert(pulses.length>=2);
 assert(pulses[0].reflections.some(r=>r.from===25&&r.to===26));
 assert(pulses[1].reflections.some(r=>r.from===33&&r.to===40));
 assert(g.masterpieces>=2);
 assert.equal(g.board[25].family,"moonMirror");
 assert.equal(g.board[33].family,"moonMirror");
});
check("reflected Daruma hit damages precisely once",()=>{
 const g=preview("first");
 g.board[26]={family:"daruma",stage:0,id:-27};g.daruma[26]=2;g.darumaVersion=1;
 assert.equal(turn(g).ok,true);
 assert.equal(g.daruma[26],1);
});
check("reflected Sealed Stone hit damages precisely once",()=>{
 const g=preview("first");
 g.board[26]={family:"sealedStone",stage:0,id:-126};g.sealed[26]=4;g.sealedStoneVersion=1;
 assert.equal(turn(g).ok,true);
 assert.equal(g.sealed[26],3);
});
check("fixed mirrors survive gravity, cascade and shuffled subsequent moves",()=>{
 const g=preview("mist");
 const fixtureIds=g.moonMirrors.map(x=>g.board[x.at].id);
 assert.equal(turn(g).ok,true);
 for(let i=0;i<8&&g.moves>0&&!g.failed;i++){
  const pair=R.validSwaps(g.board)[0];
  if(!pair)break;
  assert.equal(g.swap(...pair).ok,true);
  assert.deepEqual(g.moonMirrors.map(x=>g.board[x.at].id),fixtureIds);
  assert(!R.validSwaps(g.board).some(([a,b])=>g.moonMirrors.some(m=>m.at===a||m.at===b)));
 }
});
check("saved preview keeps exact mirrors, stage states, move history and RNG",()=>{
 const g=preview("chain"),saved=JSON.parse(JSON.stringify(g.save()));
 assert.equal(saved.moonMirrorVersion,2);
 const restored=new R.Game(2,saved);
 assert.deepEqual(restored.moonMirrors,g.moonMirrors);
 assert.deepEqual(restored.board,g.board);
 assert.deepEqual(restored.config.goal,g.config.goal);
 assert.equal(restored.rolls,g.rolls);
 assert.equal(turn(g).ok,true);assert.equal(turn(restored).ok,true);
 assert.deepEqual(JSON.parse(JSON.stringify(restored.save())),JSON.parse(JSON.stringify(g.save())));
});
check("legacy disposable preview snapshots alone upgrade former overlays to fixtures",()=>{
 const g=preview("first"),old=g.save();
 old.moonMirrorVersion=1;
 old.board[25]={family:g.families[0],stage:2,id:26};
 const restored=new R.Game(2,old);
 assert.equal(restored.board[25].family,"moonMirror");
 assert.equal(restored.board[25].id,-3025);
});
check("ordinary level contracts remain entirely unchanged",()=>{
 const original=R.levelConfig(2),g=new R.Game(2,null,{seed:20261031,directorMode:"v4"});
 assert.deepEqual(g.moonMirrors,[]);
 assert.equal(g.moonMirrorPreview,null);
 assert.deepEqual(g.config.goal,original.goal);
 assert.equal(g.config.moves,original.moves);
 for(const i of [0,20,30,50,60])assert.deepEqual(new R.Game(i,null,{seed:20261031,directorMode:"v4"}).moonMirrors,[]);
});
check("player-exported telemetry distinguishes fixed mirror and reflected hit",()=>{
 const g=preview("mist");turn(g);
 const report=I.last(g,g.roundTrace,null,null);
 assert.equal(report.result.unranked,true);assert.equal(report.result.stars,0);
 assert.equal(report.preview,"mist");assert.equal(report.moonMirrors.length,2);
 const pulse=report.round.moves[0].events.find(e=>e.type==="pulse");
 assert.equal(pulse.reflections?.length,2);
 assert.equal(pulse.mirrorTargets?.length,2);
});
console.log("Moon Mirrors 1.1 fixed-object integration: all checks passed");
