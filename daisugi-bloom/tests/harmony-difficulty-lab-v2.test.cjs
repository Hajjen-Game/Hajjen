"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const A=require("../harmony/puzzle-architect.js");
const Lab=require("../harmony/difficulty-lab-v2.js");
const D=require("../harmony/journey-levels-v2.js");
const O=require("../harmony/journey-authored-openings.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};

check("Every one of 40 released levels opens the exact approved Journey 2.0 puzzle",()=>{
 let authored=0,seeded=0;
 assert.equal(D.COUNT,40);
 assert.equal(Lab.COUNT,40);
 for(let index=0;index<40;index++){
  const entry=Lab.descriptor(index),g=Lab.officialGame(entry,20261105+index*197,"v62");
  assert.equal(g.level,index);
  assert.equal(g.levelRecipe.id,D.get(index).id);
  assert.equal(g.config.moves,D.get(index).moves);
  assert.equal(g.directorMode,"v62");
  assert.equal(R.scan(g.board).length,0,"Free initial Fusion on level "+(index+1));
  assert(R.validSwaps(g.board).length>=3,"Unsafe opening "+(index+1));
  if(O.get(index)){
   authored++;
   assert.equal(entry.opening,"hand-authored");
   const shape=g.board.map(p=>p&&["daruma","sealedStone","lotusSeed","hanabiCrate","moonMirror","terrain"].includes(p.family)?null:p?.family??null);
   assert.deepEqual(shape,O.get(index).opening.grid);
  }else{
   seeded++;
   assert.equal(entry.opening,"seeded");
  }
 }
 assert.equal(authored,35);assert.equal(seeded,5);
 assert.throws(()=>Lab.descriptor(40),/1–40/);
 assert.throws(()=>Lab.descriptor(-1),/1–40/);
});

check("A partial Daruma or Sealed Stone hit is measurable work before a target completion",()=>{
 const fake={
  daruma:[2,1],sealed:[4,3],
  config:{goal:{type:"daruma",count:2}},
  goalParts:()=>[
   {type:"daruma",count:2,progress:0},
   {type:"sealedStone",count:2,progress:0}
  ]};
 const m=Lab.fractions(fake,{daruma:4,sealedStone:8});
 assert.equal(m.completed,0);
 assert(m.work>0,"Partial damage must count as objective work");
 assert.equal(m.parts[0].workRatio,.25);
 assert.equal(m.parts[1].workRatio,.125);
 assert.equal(m.work,.188);
 assert.equal(m.health.daruma,3);
 assert.equal(m.health.sealedStone,7);
});

check("A smoke scan really executes one swap on ALL 40 production boards",()=>{
 const original=JSON.stringify(D.summary());
 const report=Lab.audit({seeds:1,strategies:["random"],maxCandidates:3,maxTurns:1});
 assert.equal(report.scope.levels,40);
 assert.equal(report.scope.blueprints,35);
 assert.equal(report.totals.runs,40);
 assert.equal(report.chapters.length,4);
 assert.equal(report.totals.noLegal,0);
 for(const level of report.levels){
  assert.equal(level.runs.length,1);
  const result=level.runs[0];
  assert.equal(result.movesUsed,1);
  assert.equal(result.openingMatches,0);
  assert(result.initialLegal>=3);
  assert(result.objectiveDetails.work>=0&&result.objectiveDetails.work<=1);
  assert(result.partialBlockerHits>=0);
  assert(result.nearDeadlockTurns>=0);
  assert.equal(result.mode,"v62");
  assert.equal(result.recipeId,D.get(level.level-1).id);
 }
 assert.equal(JSON.stringify(D.summary()),original,
  "Audit must not mutate published recipes or official boards");
});

check("Multiple real seeds and strategies are paired and deterministic",()=>{
 const opts={from:21,to:21,seeds:2,strategies:["random","objective"],
  maxCandidates:3,maxTurns:4,baseSeed:20261105};
 const a=Lab.audit(opts),b=Lab.audit(opts);
 assert.deepEqual(a,b);
 assert.equal(a.levels.length,1);
 const runs=a.levels[0].runs;
 assert.equal(runs.length,4);
 assert.equal(runs[0].seed,runs[1].seed);
 assert.equal(runs[2].seed,runs[3].seed);
 assert.notEqual(runs[0].seed,runs[2].seed);
 assert.equal(runs[0].openingSignature,runs[1].openingSignature,
  "Same seed and board across bots");
 assert.equal(a.levels[0].byStrategy.random.attempts,2);
 assert.equal(a.levels[0].byStrategy.objective.attempts,2);
 assert.equal(a.levels[0].opening,"hand-authored");
});

check("Director 6.2 and Standard use paired openings, never pretend unpaired samples are controlled",()=>{
 const result=Lab.audit({from:5,to:5,seeds:1,strategies:["random"],
  maxTurns:3,maxCandidates:3,compareStandard:true});
 const level=result.levels[0];
 assert.equal(level.runs.length,2);
 assert.equal(level.runs[0].mode,"v62");
 assert.equal(level.runs[1].mode,"standard");
 assert.equal(level.comparison.paired,true);
 assert.equal(level.runs[0].openingSignature,level.runs[1].openingSignature);
 assert.equal(result.totals.runs,1,"Main summary must not double-count Standard baseline");
});

check("Invalid audit bounds and strategies fail rather than mislabel partial coverage",()=>{
 assert.throws(()=>Lab.audit({from:0,to:1}),/First level/);
 assert.throws(()=>Lab.audit({from:2,to:1}),/Last level/);
 assert.throws(()=>Lab.audit({from:1,to:1,seeds:0}),/Seeds/);
 assert.throws(()=>Lab.audit({from:1,to:1,strategies:["random","random"]}),/unique/);
 assert.throws(()=>Lab.audit({from:1,to:1,maxCandidates:1}),/Candidate/);
});
console.log("Difficulty Lab 2.0 · full Journey audit contracts passed.");
