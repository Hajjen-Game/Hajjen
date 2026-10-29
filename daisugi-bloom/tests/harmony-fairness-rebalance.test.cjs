"use strict";
// Fairness Rebalance 1.0: deliberately small, versioned difficulty adjustment.
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const check=(label,fn)=>{fn();console.log("PASS "+label);};
const game=i=>new R.Game(i,null,{seed:20261025,directorMode:"v3"});

check("Levels 28 and 30 award stars on realistic fixed move deadlines",()=>{
 const a=R.levelConfig(27),b=R.levelConfig(29);
 assert.deepEqual(a.goal,{type:"mist",count:14});
 assert.deepEqual(b.goal,{type:"mist",count:15});
 assert.equal(a.moves,40);
 assert.equal(b.moves,40);
 assert.deepEqual(R.moveStarTargets(a),{three:19,two:30});
 assert.deepEqual(R.moveStarTargets(b),{three:23,two:32});
 assert.equal(R.missionStars(a,19),3);
 assert.equal(R.missionStars(a,20),2);
 assert.equal(R.missionStars(a,31),1);
 assert.equal(R.missionStars(b,23),3);
 assert.equal(R.missionStars(b,24),2);
 assert.equal(R.missionStars(b,33),1);
});
check("Only intended stage move/star requirements change",()=>{
 for(let i=0;i<40;i++)if(i!==27&&i!==29){
  const cfg=R.levelConfig(i);
  assert.notEqual(cfg.starPar,19,"Unexpected explicit special star threshold at "+(i+1));
  assert.notEqual(cfg.starPar,23,"Unexpected explicit special star threshold at "+(i+1));
 }
 assert.deepEqual(R.moveStarTargets(R.levelConfig(28)),
  R.moveStarTargets(R.endlessConfig(28)));
 assert.equal(R.levelConfig(38).goal.type,"sealedStone");
 assert.equal(R.levelConfig(38).moves,49); // Difficulty Calibration 2.0, not the pre-calibration budget
 assert.deepEqual(R.sealedPositions(38),[10,24,38]);
});
check("Old saved levels 28 and 30 keep the original star/move contract",()=>{
 for(const level of [27,29]){
  const current=game(level);
  const old=current.save();delete old.fairnessBalanceVersion;
  old.moves=11;old.score=5000;old.mistCleared=2;
  const restored=new R.Game(level,old,{fastRestore:true});
  assert.equal(restored.fairnessBalanceVersion,0);
  assert.equal(restored.moves,11);
  assert.equal(restored.config.moves,level===29?36:40);
  assert.deepEqual(R.moveStarTargets(restored.config),
    level===29?{three:13,two:25}:{three:13,two:27});
  assert.equal(restored.score,5000);
  assert.equal(restored.mistCleared,2);
  assert.deepEqual(restored.board,current.board);
  assert.deepEqual(restored.save().bag,old.bag);
  assert.equal(restored.rolls,old.rolls);
  const again=new R.Game(level,restored.save(),{fastRestore:true});
  assert.equal(again.fairnessBalanceVersion,0);
  assert.equal(again.moves,11);
  assert.deepEqual(R.moveStarTargets(again.config),
    R.moveStarTargets(restored.config));
 }
});
check("Fresh and resumed rounds use the new contract without doubling moves",()=>{
 for(const level of [27,29]){
  const g=game(level);
  assert.equal(g.fairnessBalanceVersion,1);
  assert.equal(g.moves,40);
  const a=g.save();
  assert.equal(a.fairnessBalanceVersion,1);
  const b=new R.Game(level,a,{fastRestore:true});
  assert.equal(b.fairnessBalanceVersion,1);
  assert.equal(b.moves,g.moves);
  assert.deepEqual(R.moveStarTargets(b.config),R.moveStarTargets(g.config));
  assert.deepEqual(b.board,g.board);
  assert.deepEqual(b.save(),a);
 }
});
check("Previously earned completed level rewards remain unchanged on reload",()=>{
 const g=game(29);
 const old=g.save();delete old.fairnessBalanceVersion;
 old.complete=true;old.failed=false;old.starsAtGoal=2;old.goalMove=25;
 old.moves=11;old.mistCleared=15;
 const loaded=new R.Game(29,old,{fastRestore:true});
 assert.equal(loaded.starsAtGoal,2);
 assert.equal(loaded.goalMove,25);
 assert.equal(loaded.complete,true);
 assert.equal(loaded.moves,11);
 assert.equal(loaded.config.moves,36);
 assert.equal(loaded.stars(),2);
});
console.log("Fairness Rebalance 1.0 regression contracts passed.");
