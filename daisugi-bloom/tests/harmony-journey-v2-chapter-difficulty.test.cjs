"use strict";
// First-pass automated playtest, not an estimate of human win rate.
// The real Rules.Game, refills and Director 6.2 are used for every move.
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const A=require("../harmony/puzzle-architect.js");
const O=require("../harmony/journey-authored-openings.js");
const Lab=require("../harmony/difficulty-lab.js");
const D=require("../harmony/journey-levels-v2.js");
let totalShuffles=0,quickWins=0,totalRuns=0;
for(let i=20;i<40;i++){
 const bp=O.get(i),rows=[];
 for(const seed of [20261104+i*197]){
  // Small deterministic smoke probe; extended spatial analysis belongs in the offline lab.
  for(const strategy of ["objective"]){
   const run=Lab.play(R,A,bp,{seed,strategy,directorMode:"v62",maxCandidates:3,maxTurns:D.get(i).moves});
   rows.push(run);totalRuns++;
   assert(run.initialLegal>=3,"Unsafe opening at level "+(i+1));
   assert(!run.limitedByTurnCap||run.movesUsed>=D.get(i).moves,
    "Unexpected early test termination at "+(i+1));
   totalShuffles+=run.shuffles;
   if(run.won&&run.movesUsed<=3)quickWins++;
  }
 }
 const summary=Lab.summarize(rows);
 console.log(JSON.stringify({level:i+1,name:D.get(i).name,
  budget:D.get(i).moves,attempts:summary.attempts,
  diagnosticWins:summary.wins,medianWinMoves:summary.winningMoves.p50,
  goalProgress:summary.avgGoalCompletion,avgShuffles:summary.avgShuffles,
  earlyGoalProgress:summary.avgFirstProgressTurn,
  noLegalMoves:summary.zeroLegalRuns}));
}
console.log(JSON.stringify({totalRuns,totalShuffles,quickWins}));
console.log("PASS Journey 21–40 seeded real-game difficulty diagnostics (not a human win-rate estimate)");
