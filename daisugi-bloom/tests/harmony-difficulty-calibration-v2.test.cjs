"use strict";
/* Difficulty Calibration 2.0: reproducible, non-destructive level contracts. */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const D=require("../harmony/diagnostics.js").create(R);
const revisions={
 11:{moves:25,count:24},12:{moves:29,count:10},
 25:{moves:31,count:17},36:{moves:48,count:2},
 39:{moves:49,count:3},41:{moves:32,count:5},
 42:{moves:33,count:10},44:{moves:35,count:4},
 45:{moves:37,count:7},46:{moves:42,count:12},
 47:{moves:42,count:4},48:{moves:42,count:9}
};
const adjusted=new Set(Object.keys(revisions).map(Number));
for(let i=0;i<50;i++){
 const n=i+1,fresh=R.levelConfig(i),before=R.levelConfig(i,false);
 const expected=revisions[n];
 if(expected){
  assert.equal(fresh.moves,expected.moves,"New move budget at level "+n);
  assert.equal(fresh.goal.count,expected.count,"New goal at level "+n);
  assert(fresh.intro.length>24,"Explain calibrated challenge "+n);
  assert.notDeepEqual(fresh,before,"A calibrated level must change");
 }else{
  assert.deepEqual(fresh,before,"Unselected level "+n+" must be untouched");
 }
 assert.deepEqual({type:fresh.goal.type,family:fresh.goal.family},
  {type:before.goal.type,family:before.goal.family},"Preserve objective type and family");
 const game=new R.Game(i,null,{seed:D.sampleSeed(20261029,i,0),directorMode:"v4"});
 assert.equal(game.difficultyCalibrationVersion,2);
 assert.equal(R.validSwaps(game.board).length>=3,true,"Playable start "+n);
 assert.deepEqual(game.config,fresh);
 const snap=game.save();
 assert.equal(snap.difficultyCalibrationVersion,2);
 const unchanged=new R.Game(i,snap,{fastRestore:true});
 assert.deepEqual(unchanged.config,fresh,"New run contract survives reload");
 assert.deepEqual(unchanged.board,game.board);
 assert.equal(unchanged.moves,game.moves);
 assert.deepEqual(R.moveStarTargets(unchanged.config),R.moveStarTargets(fresh));
 if(expected){
  const old={...snap};
  delete old.difficultyCalibrationVersion;
  old.moves=Math.max(1,before.moves-7);
  old.score=2475;
  const legacy=new R.Game(i,old,{fastRestore:true});
  assert.equal(legacy.difficultyCalibrationVersion,0);
  assert.deepEqual(legacy.config,before,"Old active level retains former goals, star limits and moves");
  assert.equal(legacy.moves,old.moves,"Do not reset active progress");
  assert.equal(legacy.score,2475);
  assert.deepEqual(legacy.board,game.board);
  const again=new R.Game(i,legacy.save(),{fastRestore:true});
  assert.deepEqual(again.config,before,"Legacy contract must persist through repeated reloads");
  assert.equal(again.difficultyCalibrationVersion,0);
  assert.equal(again.moves,old.moves);
 }
}
// A few real independent seeded plays: bot performance is not a proxy for
// human completion rates and must never alter a live session or a Director.
for(const level of [10,11,24,35,40,43,44,46,47]){
 const cfg=R.levelConfig(level);
 const run=D.play(level,D.sampleSeed(20261029,level,0),"goal","director4");
 assert(run.movesUsed<=cfg.moves);
 assert(run.progress>=0&&run.target===cfg.goal.count);
 assert(run.stars>=0&&run.stars<=3);
}
assert.equal(R.levelConfig(0).moves,18,"Do not stretch the tutorial");
assert.equal(R.levelConfig(3).goal.type,"mist");
assert.equal(R.levelConfig(20).goal.type,"daruma");
assert.equal(R.levelConfig(30).goal.type,"sealedStone");
assert.equal(R.levelConfig(49).goal.count,2,"Lantern finale keeps its chapter identity");
console.log("PASS Difficulty Calibration 2.0: 12 level adjustments, 38 unaffected levels, safe legacy saves, real seeded games");
