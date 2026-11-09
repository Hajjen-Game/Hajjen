const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {RoundAudit}=require('../src/diagnostics/round-audit.js');
const {ContextualDash}=require('../src/gameplay/contextual-dash.js');
const {DASH,GAME}=require('../src/core/config.js');

function state(time,hp=100){return {time,zone:1+Math.floor(time/12),
  hp,score:time*120,flow:40,speed:GAME.speedAt(time),distance:time*500,
  phase:'PEAK'};}

test('first minute is measured in four real 15-second windows, with input and clear timestamps',()=>{
  const a=new RoundAudit();a.reset({mode:'arcade',startingZone:1});
  a.record('start',state(0));
  a.record('spawn',state(1),{obstacle:'jump'});
  a.record('jump_input',state(2),{action:'jump'});
  a.record('obstacle_clear',state(5),{obstacle:'jump'});
  a.record('duck_input',state(16),{desired:'duck'});
  a.record('obstacle_hit',state(23,75),{obstacle:'duck'});
  a.record('ground_dash',state(37),{});
  a.record('gap_clear',state(45),{width:260});
  a.record('dash_blocked',state(54),{reason:'air_spent'});
  for(let i=0;i<55;i++)a.tick(1,state(i),{stress:0,confidence:.6});
  a.finish(state(55,75));
  const f=a.snapshot().summary.firstMinute;
  assert.equal(f.firstInputSeconds,2);
  assert.equal(f.firstClearSeconds,5);
  assert.equal(f.firstDamageSeconds,23);
  assert.equal(f.firstDashSeconds,37);
  assert.equal(f.observedSeconds,55);
  assert.equal(f.survivedFirstMinute,false);
  assert.equal(f.endedBeforeFirstMinute,true);
  assert.equal(f.windows.length,4);
  assert.deepEqual(f.windows.map(w=>w.inputs),[1,1,0,0]);
  assert.deepEqual(f.windows.map(w=>w.clears),[1,0,0,1]);
  assert.deepEqual(f.windows.map(w=>w.dashActions),[0,0,1,0]);
  assert.deepEqual(f.windows.map(w=>w.hits),[0,1,0,0]);
  assert.deepEqual(f.windows.map(w=>w.blockedDashes),[0,0,0,1]);
});

test('long runs report surviving the first minute without claiming player retention',()=>{
  const a=new RoundAudit();
  a.tick(61,state(60),{stress:0,confidence:0});
  const f=a.snapshot().summary.firstMinute;
  assert.equal(f.survivedFirstMinute,true);
  assert.equal(f.observedSeconds,60);
  assert.equal(f.endedBeforeFirstMinute,false);
  assert.ok(!('day1Retention' in f));
});

test('Dash near a real upcoming jump can be followed by a clear, without a causal rescue claim',()=>{
  const a=new RoundAudit();
  assert.equal(a.noteDashTiming({mode:'air',targetKind:'jump',
    targetWorld:750,secondsToChallenge:.48},state(6)),true);
  a.tick(.8,state(6.8));
  assert.equal(a.noteChallengeOutcome({targetKind:'jump',targetWorld:750,cleared:true},
    state(6.8)),1);
  const d=a.snapshot();
  assert.equal(d.summary.dashTiming.air.nearby,1);
  assert.equal(d.summary.dashTiming.air.cleared,1);
  assert.equal(d.summary.dashTiming.air.hit,0);
  assert.equal(d.summary.dashTiming.air.unresolved,0);
  assert.equal(d.events.find(e=>e.type==='dash_timing').target,'jump');
  assert.equal(d.events.find(e=>e.type==='dash_followthrough').outcome,'cleared');
  assert.ok(!JSON.stringify(d).includes('wasRescued'));
});

test('Ground Dash can correlate to a Duck Gate hit; no-nearby Dashes stay neutral',()=>{
  const a=new RoundAudit();
  a.noteDashTiming({mode:'ground',targetKind:'dash-duck',
    targetWorld:1250,secondsToChallenge:.14},state(11));
  a.tick(.2,state(11.2));
  a.noteChallengeOutcome({targetKind:'dash-duck',targetWorld:1250,cleared:false},
    state(11.2));
  a.noteDashTiming({mode:'air',targetKind:'none'},state(13));
  const d=a.snapshot();
  assert.equal(d.summary.dashTiming.ground.nearby,1);
  assert.equal(d.summary.dashTiming.ground.hit,1);
  assert.equal(d.summary.dashTiming.air.noNearby,1);
  assert.equal(d.summary.dashTiming.air.hit,0);
  assert.equal(d.summary.dashTiming.air.unresolved,0);
});

test('Dash proximity does not fabricate a successful outcome for a different target or stale time',()=>{
  const a=new RoundAudit();
  a.noteDashTiming({mode:'air',targetKind:'gap',targetWorld:1500,
    secondsToChallenge:.3},state(4));
  assert.equal(a.noteChallengeOutcome({targetKind:'gap',targetWorld:1800,
    cleared:true},state(4.4)),0);
  a.tick(3.3,state(7.3));
  assert.equal(a.noteChallengeOutcome({targetKind:'gap',targetWorld:1500,
    cleared:true},state(7.3)),0);
  const d=a.snapshot();
  assert.equal(d.summary.dashTiming.air.unresolved,1);
  assert.equal(d.summary.dashTiming.air.cleared,0);
});

test('Dash physics remain unchanged in Core Gameplay Excellence diagnostics pass',()=>{
  const dash=new ContextualDash();
  const mode=dash.request({zone:1,grounded:false,ducking:false});
  assert.equal(mode,'air');
  assert.ok(dash.tick(.1,700)>0);
  assert.equal(DASH.unlockZone,1);
  assert.equal(DASH.duration,.30);
  assert.equal(GAME.jumpVelocity,-870);
  assert.equal(GAME.duckDuration,.55);
});

test('game connects timing telemetry to actual Jump, Duck and Gap outcomes, not simulated clears',()=>{
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(game,/function dashTimingTarget\(mode\)/);
  assert.match(game,/runAudit\.noteDashTiming\(/);
  assert.match(game,/runAudit\.noteChallengeOutcome\(/);
  assert.match(game,/runAudit\.noteChallengeOutcome\(\{targetKind:gap\.echoChallenge/);
  assert.match(game,/if\(!o\.hit\)\{\s*runAudit\.noteChallengeOutcome/);
  assert.doesNotMatch(game,/dash\.active\s*&&\s*player\.invulnerable/);
});
