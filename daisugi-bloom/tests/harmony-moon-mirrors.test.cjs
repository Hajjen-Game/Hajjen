"use strict";
/* Moon Mirrors 1.2: all assertions exercise the real HarmonyRules Game. */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const I=require("../harmony/player-insight.js");
const M=require("../harmony/moon-mirrors.js");
const check=(name,run)=>{run();console.log("PASS "+name);};
const scenarios=["first","mist","chain","echo","obstacle","spark"];
const preview=(key,seed=20261031)=>new R.Game(2,null,{
 seed,directorMode:"v4",moonMirrorPreview:key
});
const play=g=>g.swap(17,24);
const event=(result,type)=>result.events.filter(e=>e.type===type);
check("all six authored previews use fixed independent mirror objects and fair real swaps",()=>{
 for(const key of scenarios){
  const g=preview(key),legal=R.validSwaps(g.board);
  assert.equal(R.scan(g.board).length,0,key);
  assert(legal.length>=3,key);
  assert(legal.some(([a,b])=>a===17&&b===24),key);
  assert.equal(g.board[24].stage,1);
  for(const {at} of g.moonMirrors){
   assert.deepEqual(g.board[at],{family:"moonMirror",stage:0,id:-(3000+at)});
   assert(!legal.some(pair=>pair.includes(at)));
  }
  assert.equal(play(g).ok,true,key);
  for(const {at} of g.moonMirrors)assert.equal(g.board[at]?.family,"moonMirror",key);
 }
});
check("Mirror Resonance pure planner uses landing destination, not whole match group",()=>{
 const mirrors=[{at:25,direction:"right"}];
 assert.deepEqual(M.planFusionResonance([{at:24}],mirrors),
  [{from:24,mirrorAt:25,to:26,direction:"right"}]);
 assert.deepEqual(M.planFusionResonance([{at:23}],mirrors),[]);
 assert.deepEqual(M.planFusionResonance([{at:24},{at:24}],mirrors),
  [{from:24,mirrorAt:25,to:26,direction:"right"}]);
 assert.deepEqual(M.planFusionResonance([{at:24}],mirrors,{used:[25]}),[]);
 assert.deepEqual(M.planFusionResonance([{at:24}],mirrors,{targeted:[26]}),[]);
 assert.deepEqual(M.planFusionResonance([{at:24}],mirrors,{blocked:[26]}),[]);
 assert.deepEqual(M.planFusionResonance([{at:24}],[{at:25,direction:"left"}]),[]);
 assert.deepEqual(M.planFusionResonance([{at:24}],[{at:25,direction:"right"},{at:26,direction:"right"}]).map(x=>x.to),[26]);
});
check("normal fusion makes a one-step remote Echo without any Harmony Pulse",()=>{
 const g=preview("echo"),before=g.board[26].stage,result=play(g);
 assert.equal(result.ok,true);
 const echoes=event(result,"mirror-resonance");
 assert.equal(echoes.length,1);
 assert.deepEqual(echoes[0].reflections,[{from:25,to:26,direction:"right",source:24}]);
 assert.equal(echoes[0].mirrorTargets[0].from,24);
 assert.equal(echoes[0].mirrorTargets[0].to,25);
 assert.equal(echoes[0].targets[0].stage,4);
 assert.equal(echoes[0].scoreDelta,50);
 assert.equal(before,3);
 assert.equal(event(result,"pulse").length,0);
 assert.equal(g.masterpieces,0);
 assert.equal(g.pulseHits,0);
 assert.equal(g.complete,true);
});
check("empty mist clears from a normal Fusion Echo without granting Pulse hit",()=>{
 const g=preview("echo");
 g.board[26]=null;g.mist[26]=1;
 const result=play(g);
 assert.equal(result.ok,true);
 assert.equal(g.mist[26],0);
 assert.equal(g.mistCleared,1);
 const echo=event(result,"mirror-resonance")[0];
 assert.deepEqual(echo.clearedMist,[26]);
 assert.equal(echo.targets.length,0);
 assert.equal(echo.scoreDelta,0);
 assert.equal(g.pulseHits,0);
});
check("Fusion Echo hits Daruma once and retains second eye",()=>{
 const g=preview("echo");
 g.board[26]={family:"daruma",stage:0,id:-27};g.daruma[26]=2;g.darumaVersion=1;
 const result=play(g);
 assert.equal(result.ok,true);
 assert.equal(g.daruma[26],1);
 assert.equal(event(result,"mirror-resonance")[0].darumaTargets.length,1);
 assert.equal(event(result,"daruma").some(e=>e.hits.some(h=>h.at===26)),true);
 assert.equal(g.pulseHits,0);
});
check("one Fusion Echo hits Sealed Stone; a second nearby mirror does not fire for free",()=>{
 const g=preview("obstacle"),before=g.sealed[26];
 assert.equal(before,4);
 const result=play(g);
 assert.equal(result.ok,true);
 assert.equal(g.sealed[26],3);
 assert.equal(g.mist[38],1,"Second mirror must wait for another player-placed fusion");
 assert.equal(g.mistCleared,0);
 assert.equal(g.pulseHits,0);
 assert.equal(event(result,"pulse").length,0);
 assert.equal(event(result,"mirror-resonance").length,1);
 assert(event(result,"mirror-resonance")[0].stoneTargets.some(t=>t.to===26));
 assert.equal(g.complete,false);
});
check("all ordinary refill cascades retain normal power without farming extra Mirror Echos",()=>{
 const g=preview("first"),result=play(g);
 assert(result.events.filter(x=>x.type==="fusion").length>=2);
 assert.equal(event(result,"mirror-resonance").length,1);
 const echo=event(result,"mirror-resonance")[0];
 assert.equal(echo.round,1,"Only the player's first fusion wave may activate a mirror");
 assert.equal(R.scan(g.board).length,0,"Game board must always settle normally");
});
check("ordinary fusion creates a true stage-five Masterpiece and one authentic Pulse",()=>{
 const g=preview("spark");assert.equal(g.board[17].stage,2);
 assert.equal(g.board[26].stage,4);
 const result=play(g);
 assert.equal(result.ok,true);
 const echoes=event(result,"mirror-resonance");
 assert(echoes.some(e=>e.targets.some(t=>t.to===26&&t.stage===5)));
 assert.equal(event(result,"fusion")[0].groups[0].to<5,true,
  "The original fusion must NOT create stage five");
 const pulses=event(result,"pulse");
 assert(pulses.some(e=>e.sources.includes(26)),"A real Pulse must originate at newly created stage five");
 assert(pulses.some(e=>e.reflections.some(r=>r.from===33&&r.to===40)));
 assert(g.masterpieces>=1);
 assert.equal(g.mist[40],0);
 assert.equal(g.complete,true);
});
check("full Harmony Pulse remains stronger and fixed mirrors are not upgraded",()=>{
 const g=preview("first");
 const before=g.save(),bad=g.swap(24,25);
 assert.equal(bad.ok,false);assert.match(bad.reason,/Mirror/);
 assert.equal(g.moves,before.moves);
 assert.deepEqual(g.board,before.board);
 const result=play(g);
 assert.equal(result.ok,true);
 assert(event(result,"pulse").some(e=>e.reflections.some(r=>r.from===25&&r.to===26)));
 assert(event(result,"mirror-resonance").length>=1);
 assert.deepEqual(g.board[25],{family:"moonMirror",stage:0,id:-3025});
 assert.equal(event(result,"pulse").some(e=>e.targets.some(t=>t.to===25)),false);
});
check("a Mirror Echo does not recurse into another mirror or loop",()=>{
 const g=preview("spark"),result=play(g);
 assert.equal(result.ok,true);
 assert.equal(event(result,"mirror-resonance").length,1);
 assert(event(result,"pulse").some(e=>e.reflections.some(r=>r.to===40)));
 assert.equal(g.board[33].family,"moonMirror");
});
check("one targeted reflection cannot upgrade a target twice in the same move",()=>{
 const mirrors=[{at:25,direction:"right"},{at:19,direction:"down"}];
 // Source 24 is adjacent to both, but duplicate target 26 is only reached
 // by the right-facing mirror. A matching second mirror is suppressed by
 // the targeted set or its position and direction.
 assert.equal(M.planFusionResonance([{at:24},{at:24}],mirrors).filter(e=>e.to===26).length,1);
});
check("real Stone and mirror locations survive falling cascades and later swaps",()=>{
 const g=preview("obstacle"),mirrorIds=g.moonMirrors.map(m=>g.board[m.at].id);
 assert.equal(play(g).ok,true);
 for(let i=0;i<6&&g.moves>0&&!g.failed;i++){
  const pair=R.validSwaps(g.board)[0];if(!pair)break;
  assert.equal(g.swap(...pair).ok,true);
  assert.deepEqual(g.moonMirrors.map(m=>g.board[m.at].id),mirrorIds);
  assert(!R.validSwaps(g.board).some(([a,b])=>g.moonMirrors.some(m=>m.at===a||m.at===b)));
 }
});
check("exact Mirror Echo trace survives genuine save and resume",()=>{
 const g=preview("spark"),save=JSON.parse(JSON.stringify(g.save()));
 const resume=new R.Game(2,save);
 assert.deepEqual(resume.moonMirrors,g.moonMirrors);
 assert.deepEqual(resume.board,g.board);
 assert.equal(play(g).ok,true);assert.equal(play(resume).ok,true);
 assert.deepEqual(JSON.parse(JSON.stringify(resume.save())),JSON.parse(JSON.stringify(g.save())));
 const report=I.last(g,g.roundTrace,null,null);
 assert.equal(report.preview,"spark");
 assert.equal(report.result.unranked,true);
 assert.equal(report.result.stars,0);
 const e=report.round.moves[0].events.find(e=>e.type==="mirror-resonance");
 assert.deepEqual(e.reflections,[{from:25,to:26,direction:"right",source:24}]);
 assert.equal(e.source,24);
 assert.equal(e.mirrorAt,25);
 assert.equal(e.direction,"right");
 assert(e.targets.some(t=>t.to===26&&t.stage===5));
});
check("older preview snapshot converts old overlay to a standalone fixture",()=>{
 const g=preview("first"),old=g.save();old.moonMirrorVersion=1;
 old.board[25]={family:g.families[0],stage:2,id:26};
 const restored=new R.Game(2,old);
 assert.deepEqual(restored.board[25],{family:"moonMirror",stage:0,id:-3025});
});
check("existing live levels, Director and objectives have no mirror changes",()=>{
 const original=R.levelConfig(2),g=new R.Game(2,null,{seed:20261031,directorMode:"v4"});
 assert.deepEqual(g.moonMirrors,[]);assert.equal(g.moonMirrorPreview,null);
 assert.deepEqual(g.config.goal,original.goal);assert.equal(g.config.moves,original.moves);
 const pair=R.validSwaps(g.board)[0],res=g.swap(...pair);
 assert.equal(res.ok,true);
 assert.equal(event(res,"mirror-resonance").length,0);
 for(const i of [0,20,30,50,60])
  assert.deepEqual(new R.Game(i,null,{seed:20261031,directorMode:"v4"}).moonMirrors,[]);
});
check("seeded openings are playable and fixture-stable across 18 samples per variant",()=>{
 for(const key of scenarios)for(let seed=1;seed<=18;seed++){
  const g=preview(key,seed);
  assert(R.validSwaps(g.board).some(([a,b])=>a===17&&b===24),key+" "+seed);
  const res=play(g);
  assert.equal(res.ok,true);
  for(const m of g.moonMirrors)assert.equal(g.board[m.at]?.family,"moonMirror");
 }
});
console.log("Moon Mirrors 1.2 Fusion Resonance: all rule contracts passed");
