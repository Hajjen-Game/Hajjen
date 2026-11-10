const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {AdaptiveRushDirector}=require('../src/director/adaptive-director.js');
const {FlowSystem}=require('../src/gameplay/flow.js');
const {GAME,FLOW}=require('../src/core/config.js');

const fill=(f,n=20)=>{for(let i=0;i<n;i++)f.registerClear()};

test('successful precision is mastery, not a near-miss stress penalty',()=>{
  const d=new AdaptiveRushDirector(()=>.5);
  d.stress=.31;d.confidence=.50;
  d.registerClear({action:'jump'});
  const confident=d.confidence;
  d.registerPrecisionClear();
  assert.ok(d.stress<.31,'precision should relieve stress, not increase it');
  assert.ok(d.confidence>confident,'precision should reinforce confidence');
  assert.equal(d.insight.precisionClears,1);
  assert.ok(d.insight.precisionStressRelief>0);
  const before=d.stress;
  d.registerNearMiss();
  assert.ok(d.stress>before,'real danger still increases stress');
  d.registerDamage({action:'jump'});
  assert.ok(d.stress>before,'a real collision still triggers recovery');
  assert.equal(GAME.baseSpeed,370);
});

test('precision clearance cannot double-count Director spawns, streaks or Flow',()=>{
  const d=new AdaptiveRushDirector(()=>.5);
  const f=new FlowSystem();
  d.registerClear({action:'jump'});
  d.registerPrecisionClear();
  const r=f.registerClear({precision:true});
  assert.equal(d.totalCleared,1);
  assert.equal(d.streak,1);
  assert.equal(f.zoneClears,1);
  assert.equal(f.streak,1);
  assert.equal(f.value,FLOW.precisionGain);
  assert.equal(r.earnedPoints,135);
  assert.equal(d.insight.precisionClears,1);
});

test('FADE ages the idle clock more gently than active gameplay',()=>{
  const normal=new FlowSystem(),fade=new FlowSystem();
  normal.registerClear();fade.registerClear();
  normal.tick(4,{phase:'BUILD'});fade.tick(4,{phase:'FADE'});
  assert.ok(normal.balance.idleLoss>0);
  assert.equal(fade.balance.idleLoss,0);
  assert.equal(fade.insight.fadeSeconds,4);
});

test('RELAX preserves idle decay and returns one second of grace',()=>{
  const f=new FlowSystem();fill(f,18);
  f.tick(3.8,{phase:'BUILD'});
  const lostBefore=f.balance.idleLoss;
  assert.ok(lostBefore>0);
  const before=f.value;
  f.tick(3.2,{phase:'RELAX'});
  assert.equal(f.balance.idleLoss,lostBefore,'no idle tax during Director no-spawn break');
  assert.ok(f.value<before,'high Flow still loses gentle pressure, no free refill');
  assert.ok(f.timeSinceClear<=FLOW.decayDelay-FLOW.relaxReturnGraceSeconds+1e-8);
  f.tick(.9,{phase:'BUILD'});
  assert.equal(f.balance.idleLoss,lostBefore,'a brief post-RELAX grace is real');
  f.tick(.2,{phase:'BUILD'});
  assert.ok(f.balance.idleLoss>lostBefore,'idle loss eventually resumes without clears');
  assert.ok(f.insight.relaxSeconds>=3);
});

test('multiple frame step sizes have equivalent Director recovery Flow pressure',()=>{
  const coarse=new FlowSystem(),fine=new FlowSystem();
  fill(coarse);fill(fine);
  const phases=[['BUILD',1],['FADE',1.4],['RELAX',2],['BUILD',.7]];
  for(const [phase,seconds] of phases){
    coarse.tick(seconds,{phase});
    for(let i=0;i<Math.round(seconds*100);i++)fine.tick(.01,{phase});
  }
  assert.ok(Math.abs(coarse.value-fine.value)<.1,
    'Flow should not depend on rendering FPS');
  assert.ok(Math.abs(coarse.balance.idleLoss-fine.balance.idleLoss)<.1);
});

test('RELAX does not permanently lock 2x Chroma or alter Perfect Zone requirements',()=>{
  const f=new FlowSystem();fill(f,20);
  f.tick(25,{phase:'RELAX'});
  assert.equal(f.chromaActive,false,'prolonged no-clear run still loses Chroma');
  const empty=new FlowSystem();
  empty.tick(5,{phase:'RELAX'});
  assert.equal(empty.completeZone({hp:75}).perfect,false);
  empty.registerClear();empty.registerClear();
  assert.equal(empty.completeZone({hp:75}).perfect,false);
  assert.equal(FLOW.damagePenalty,35);
  assert.deepEqual(FLOW.thresholds,[30,65,90]);
});

test('run export is wired to the same on-device Director and Flow diagnostics',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(source,/director\.registerPrecisionClear\(\)/);
  assert.doesNotMatch(source,/director\.registerNearMiss\(\)/);
  assert.match(source,/exported\.directorExperience=director\.insight/);
  assert.match(source,/exported\.flowBalance=flow\.insight/);
  assert.match(source,/flow\.tick\(dt,\{phase:director\.phase\}\)/);
  const audit=require('../src/diagnostics/round-audit.js');
  assert.equal(new audit.RoundAudit().snapshot().build,'endless-escalation-director-4.0');
});
