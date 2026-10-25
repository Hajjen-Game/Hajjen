"use strict";
// Audit 3.0 contract: fixed seeds, all actual rules, no mutation of live design.
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const Lab=require("../harmony/diagnostics.js").create(R);
const A=require("../tools/harmony-difficulty-fairness-audit.cjs");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
check("CLI is strict and defaults to all 40 live stages",()=>{
 const o=A.options([]);
 assert.equal(o.levels.length,40);
 assert.equal(o.levels[0],0);assert.equal(o.levels[39],39);
 assert.deepEqual(A.options(["--levels","21-40","--trials","2"]).levels,
  Array.from({length:20},(_,i)=>i+20));
 for(const args of [["--trials","0"],["--levels","0-40"],["--levels","22-41"],
   ["--levels","31"],["--mode","invented"],["--seed","-1"]]){
  assert.throws(()=>A.options(args),Error);
 }
});
check("Version 6.39.0 objectives / moves / stars remain read-only",()=>{
 const allBefore=Array.from({length:40},(_,i)=>R.levelConfig(i));
 const opts=A.options(["--levels","21-21","--trials","1"]);
 const audit=A.analyze(opts);
 assert.deepEqual(Array.from({length:40},(_,i)=>R.levelConfig(i)),allBefore);
 assert.equal(audit.summary.length,1);
 assert.equal(audit.summary[0].objective,"daruma");
 assert.equal(audit.summary[0].darumaPositions.length,1);
 assert.equal(audit.allRuns.length,2);
 assert.deepEqual(audit.allRuns.map(r=>r.seed),Array(2).fill(Lab.sampleSeed(opts.seed,20,0)));
});
check("Separate runs cover Stone objectives; paired seeds, goals and star contracts",()=>{
 const opts=A.options(["--levels","31-31","--trials","1"]);
 const audit=A.analyze(opts),s=audit.summary[0];
 assert.equal(s.level,31);assert.equal(s.chapter,4);
 assert.equal(s.objective,"sealedStone");assert.equal(s.target,1);
 assert.deepEqual(s.stonePositions,[24]);
 assert.equal(s.moves,R.levelConfig(30).moves);
 assert.deepEqual(s.starThresholds,R.moveStarTargets(R.levelConfig(30)));
 assert.deepEqual(audit.allRuns.map(r=>r.seed),[Lab.sampleSeed(opts.seed,30,0),Lab.sampleSeed(opts.seed,30,0)]);
 for(const r of audit.allRuns){
  assert(r.initialLegalMoves>=3);
  assert.equal(r.zeroLegalTurns,0);
  assert(r.progress>=0&&r.progress<=1);
  assert(r.stars>=0&&r.stars<=3);
 }
});
check("Human-independent flags cannot be interpreted as actual win rates",()=>{
 const row={level:14,chapter:2,objective:"fourTurns",moves:30,stonePositions:[],
  randomBot:{wins:0},goalBot:{wins:0,medianWinningMoves:null,stars:{three:0},
   avgLongestProgressDrought:14}};
 assert(A.flags(row,8).includes("LOW_GOAL_BOT_COMPLETION"));
 assert(A.flags(row,8).includes("LONG_GOAL_STAGNATION"));
 assert(!A.flags(row,8).includes("VERY_EARLY_COMPLETION"));
 row.goalBot={...row.goalBot,wins:8,medianWinningMoves:2,stars:{three:8},avgLongestProgressDrought:0};
 assert(A.flags(row,8).includes("VERY_EARLY_COMPLETION"));
});
check("Machine-readable CSV and Markdown contain all sampled levels",()=>{
 const audit=A.analyze(A.options(["--levels","1-2","--trials","1"]));
 const csv=A.makeCsv(audit),md=A.makeMarkdown(audit);
 assert.equal(csv.trim().split("\n").length,3);
 assert(md.includes("Difficulty & Fairness Audit 3.0"));
 assert(md.includes("Not a human-playtest"));
 assert(md.includes("Slump"));
 assert.deepEqual(audit.allRuns.map(r=>r.seed),[
  Lab.sampleSeed(20261025,0,0),Lab.sampleSeed(20261025,0,0),
  Lab.sampleSeed(20261025,1,0),Lab.sampleSeed(20261025,1,0)
 ]);
});
console.log("Difficulty & Fairness Audit 3.0 regression contract passed.");
