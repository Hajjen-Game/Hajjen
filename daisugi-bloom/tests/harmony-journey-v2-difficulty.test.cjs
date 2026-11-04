"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const D=require("../harmony/journey-levels-v2.js");
const O=require("../harmony/onboarding.js");
const Q=require("../harmony/objective-feedback.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
check("Every stage has few visible requirements, no Mirror counters, and real board targets",()=>{
 for(let i=0;i<20;i++){
  const x=D.get(i),m=x.mechanics,targets=[x.goal,...(x.goal.requires||[])];
  assert(targets.length<=2,"Avoid grind-only multi-counter missions");
  assert(!targets.some(t=>t.type==="mirrorResonances"));
  assert.equal(m.mirrors.length,0);
  assert(!m.hanabi||targets.some(t=>t.type==="lotus"));
  assert(!m.daruma.length||targets.some(t=>t.type==="daruma"));
  assert(!m.sealedStones.length||targets.some(t=>t.type==="sealedStone"));
  if(targets.length>1)assert(O.objective(x).includes(" + "));
  const g=new R.Game(i,null,{seed:20261104+i,journeyDiagnostic:true,
   directorMode:"v62",levelRecipe:x});
  assert.deepEqual(g.config.goal,x.goal);
  assert.equal(g.goalParts().length,targets.length);
  assert(g.goalParts().every(p=>p.progress===0));
  assert(!g.fulfilled());
  assert(R.validSwaps(g.board).length>=3);
  const restore=new R.Game(i,g.save(),{fastRestore:true});
  assert.deepEqual(restore.goalParts(),g.goalParts());
 }
});
check("Finale needs genuine Stone breaks AND rocket deliveries",()=>{
 const x=D.get(19);
 assert.deepEqual(x.goal,{type:"sealedStone",count:2,
  requires:[{type:"lotus",count:2}]});
 const g=new R.Game(19,null,{seed:42,journeyDiagnostic:true,
  directorMode:"v62",levelRecipe:x});
 assert.equal(g.goalParts().length,2);
 assert.equal(g.sealed.filter(Boolean).length,4);
 g.lotusDelivered=2;assert(!g.fulfilled(),"Rockets alone must not finish");
 g.lotusDelivered=0;g.sealedCleared=2;assert(!g.fulfilled(),"Stones alone must not finish");
 g.lotusDelivered=2;assert(g.fulfilled());
 assert(Q.detail(g).includes("Hanabi"));
});
check("Retained Koi finale asks for actual Koi Masterpieces",()=>{
 const x=D.get(9),g=new R.Game(9,null,{seed:311,journeyDiagnostic:true,
  directorMode:"v62",levelRecipe:x});
 g.masterpieces=4;g.familyMasterpieces={koi:0,sushi:4};
 assert(!g.fulfilled());g.familyMasterpieces.koi=2;assert(g.fulfilled());
});
check("No current Journey 1–100 goal inherits draft requirements",()=>{
 for(let i=0;i<100;i++)assert.equal(R.levelConfig(i).goal.requires,undefined);
});
console.log("PASS focused Journey 2.0 difficulty contracts");
