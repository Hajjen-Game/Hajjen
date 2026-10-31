"use strict";
/* Mechanic Balance 1.0 — protect the original puzzle engine, reduce ONLY
 * automatic opportunities added by optional Moon Mirrors and Wind Garden. */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const W=require("../harmony/wind-garden.js");
const M=require("../harmony/moon-mirrors.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
const make=(scenario,seed=13)=>new R.Game(2,null,{seed,directorMode:"v4",
 ...(W.SCENARIOS[scenario]?{windGardenPreview:scenario}:{moonMirrorPreview:scenario})});
const choose=g=>{
 for(const p of R.validSwaps(g.board)){const result=g.swap(...p);if(result.ok)return result;}
 throw Error("No real legal swap");
};
const count=(result,type)=>result.events.filter(e=>e.type===type);
const fusions=result=>count(result,"fusion").reduce((n,e)=>n+e.groups.length,0);
check("a genuine first move now gives one fusion, not seven scripted rewards",()=>{
 const g=make("breeze"),result=g.swap(17,24);
 assert.equal(result.ok,true);assert.equal(fusions(result),1);
 assert.equal(g.progress(),1);assert.equal(g.target(),18);
 assert.equal(count(result,"wind-shift").length,0);
 assert.equal(R.scan(g.board).length,0);
});
check("no automatic Mirror Echo from falling/Director fusion waves",()=>{
 const g=make("first",20261031),result=g.swap(17,24);
 assert(result.events.filter(e=>e.type==="fusion").length>1);
 assert.equal(count(result,"mirror-resonance").length,1);
 assert.equal(count(result,"mirror-resonance")[0].round,1);
 assert.equal(R.scan(g.board).length,0);
});
check("two neighboring mirrors cost two player decisions, not one",()=>{
 const g=make("obstacle"),result=g.swap(17,24);
 assert.equal(result.ok,true);
 assert.equal(count(result,"mirror-resonance").length,1);
 assert.equal(g.sealed[26],3);
 assert.equal(g.mist[38],1);
 assert.equal(g.complete,false);
});
check("earned remote stage-five still emits the original full-strength Pulse",()=>{
 const g=make("spark"),result=g.swap(17,24);
 const echoes=count(result,"mirror-resonance"),pulses=count(result,"pulse");
 assert.equal(echoes.length,1);
 assert(echoes[0].targets.some(t=>t.to===26&&t.stage===5));
 assert(pulses.some(x=>x.sources.includes(26)));
 assert(pulses.some(x=>x.reflections.some(r=>r.from===33&&r.to===40)));
 assert.equal(g.complete,true);
});
check("Wind shifts at predictable, calmer two-/three-move intervals",()=>{
 assert.equal(W.descriptor("breeze").schedule.every,2);
 assert.equal(W.descriptor("tide").schedule.every,2);
 assert.equal(W.descriptor("crossing").schedule.every,3);
 const g=make("breeze");
 const first=g.swap(17,24);assert.equal(count(first,"wind-shift").length,0);
 const second=choose(g);assert.equal(count(second,"wind-shift").length,1);
 assert.equal(count(second,"wind-shift")[0].direction,"right");
 assert.equal(R.scan(g.board).length,0);
});
check("the controlled wind still causes a genuine extra Fusion",()=>{
 const g=make("breeze");g.swap(17,24);
 const x=choose(g),start=x.events.findIndex(e=>e.type==="wind-shift");
 assert(start>=0);assert(fusions(x)>0);
 const fromWind=x.events.slice(start+1).filter(e=>e.type==="fusion");
 assert.equal(fromWind.length,1,"Expected seed 13 to use a single controlled wind wave");
 assert.equal(fromWind[0].groups.length,1);
 assert.equal(R.scan(g.board).length,0);
});
check("no frozen matches, fixed-cell damage or lost IDs across seeded turns",()=>{
 let scheduled=0;
 for(const scenario of ["breeze","crossing","tide"])for(let seed=1;seed<=35;seed++){
  const g=make(scenario,seed);
  for(let n=0;n<Math.min(g.windGarden.every,3);n++){
   const move=n===0?g.swap(17,24):choose(g);
   assert.equal(move.ok,true);
   if(count(move,"wind-shift").length)scheduled++;
   assert.equal(R.scan(g.board).length,0,
    "Unresolved match after "+scenario+"/"+seed+"/turn"+n);
   assert.equal(g.board.length,49);
   const ids=g.board.filter(Boolean).map(p=>p.id);
   assert.equal(new Set(ids).size,ids.length,"Board piece identities must stay unique");
   if(g.complete||g.failed)break;
  }
 }
 assert(scheduled>=65,"Wind must remain actually playable in the tested seeds");
});
check("save/replay deterministic after capped Echo and scheduled wind",()=>{
 for(const key of ["spark","breeze","crossing"]){
  const a=make(key);a.swap(17,24);
  const b=new R.Game(2,JSON.parse(JSON.stringify(a.save())));
  const pair=R.validSwaps(a.board)[0];
  assert(pair);
  assert.equal(a.swap(...pair).ok,true);
  assert.equal(b.swap(...pair).ok,true);
  assert.deepEqual(JSON.parse(JSON.stringify(a.save())),
   JSON.parse(JSON.stringify(b.save())),key);
 }
});
check("all regular levels keep their original stage-five and cascade behavior",()=>{
 for(const level of [0,2,10,20,30,50,60]){
  const g=new R.Game(level,null,{seed:13,directorMode:"v4"});
  const cfg=R.levelConfig(level);
  assert.equal(g.windGarden,null);assert.deepEqual(g.moonMirrors,[]);
  assert.deepEqual(g.config.goal,cfg.goal);
  const result=choose(g);
  assert.equal(count(result,"wind-shift").length,0);
  assert.equal(count(result,"mirror-resonance").length,0);
 }
});
console.log("Mechanic Balance 1.0: all real-engine safety and agency checks passed");
