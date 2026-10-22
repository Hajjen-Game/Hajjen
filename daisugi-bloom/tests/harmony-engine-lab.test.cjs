"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const Lab=require("../harmony/diagnostics.js").create(R);

function check(title,fn){fn();console.log("PASS "+title);}
async function main(){
 check("The four bots and their strategy labels are present",()=>{
  assert.deepEqual(Lab.STRATEGIES,["random","score","goal","lookahead"]);
  assert(Lab.STRATEGIES.every(k=>Lab.LABELS[k]));
 });
 check("A fixed seed produces exactly the same board and legal first moves",()=>{
  const a=new R.Game(7,null,{seed:20261022});
  const b=new R.Game(7,null,{seed:20261022});
  assert.deepEqual(a.save(),b.save());
  assert.deepEqual(R.validSwaps(a.board),R.validSwaps(b.board));
 });
 check("Diagnostic snapshot fast-restore matches normal save/load",()=>{
  const game=new R.Game(4,null,{seed:114});
  const first=R.validSwaps(game.board)[0];
  assert(game.swap(...first).ok);
  const saved=game.save();
  const normal=new R.Game(4,saved);
  const optimized=new R.Game(4,saved,{fastRestore:true});
  assert.deepEqual(optimized.save(),normal.save());
  assert.deepEqual(optimized.board,game.board);
 });
 check("The same (level,trial) always maps to the same seed",()=>{
  for(const level of [0,1,5,9]){
   assert.equal(Lab.sampleSeed(18,level,7),Lab.sampleSeed(18,level,7));
   assert.notEqual(Lab.sampleSeed(18,level,7),Lab.sampleSeed(18,level,8));
  }
 });
 const player=new R.Game(3,null,{seed:5555});
 const before=player.save();
 const sync=Lab.run({levels:[0,5],strategies:["random","score","goal","lookahead"],trials:1,seed:20261022});
 check("Four strategies can complete real game simulations with correct metrics",()=>{
  assert.equal(sync.results.length,8);
  assert.equal(sync.runs.length,8);
  for(const trial of sync.runs){
   assert(trial.movesUsed>=1&&trial.movesUsed<=trial.movesBudget);
   assert(trial.score>=0);
   assert(trial.avgLegalMoves>=0);
   assert(trial.minLegalMoves>=0);
   assert(trial.goalRatio>=0&&trial.goalRatio<=1);
   assert.equal(trial.goalType,R.levels[trial.level].goal.type);
   assert.equal(trial.won,trial.progress>=trial.target);
   assert(trial.cascadeTurns<=trial.movesUsed);
   assert(trial.extraWaves>=0);
   assert(trial.maxGoalDrought<=trial.movesUsed);
  }
  for(const level of [0,5]){
   const seeds=sync.runs.filter(r=>r.level===level).map(r=>r.seed);
   assert.equal(new Set(seeds).size,1,"All bots must compare the same test board seed");
  }
  for(const row of sync.results){
   assert.equal(row.samples,1);
   assert(row.winRate>=0&&row.winRate<=1);
   assert(row.avgGoalRatio>=0&&row.avgGoalRatio<=1);
  }
 });
 check("The laboratory never mutates an existing player save",()=>{
  assert.deepEqual(player.save(),before);
 });
 const same=Lab.run({levels:[0,5],strategies:["random","score","goal","lookahead"],trials:1,seed:20261022});
 check("Complete experiments are fully deterministic",()=>{
  assert.deepEqual(same.runs,sync.runs);
  assert.deepEqual(same.results,sync.results);
 });
 const progress=[];
 const asyncResult=await Lab.runAsync({levels:[0],strategies:["random","score"],trials:1,seed:932,yieldEvery:1},x=>progress.push(x.completed));
 check("On-device async tests report progress and match synchronous metrics",()=>{
  const identical=Lab.run({levels:[0],strategies:["random","score"],trials:1,seed:932});
  assert.deepEqual(asyncResult.runs,identical.runs);
  assert.deepEqual(progress,[1,2]);
 });
 const stopped=await Lab.runAsync({levels:[0],trials:2,cancel:()=>true});
 check("Cancellation returns promptly without partially committed game state",()=>{
  assert.equal(stopped.cancelled,true);
  assert.equal(stopped.completed,0);
 });
 check("Invalid diagnostics inputs are rejected instead of silently biasing data",()=>{
  assert.throws(()=>Lab.run({levels:[20]}),RangeError);
  assert.throws(()=>Lab.run({trials:0}),RangeError);
  assert.throws(()=>Lab.run({strategies:["magic"]}),RangeError);
 });
 console.log("Japanese Harmony Engine Lab 1.0 contracts passed");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
