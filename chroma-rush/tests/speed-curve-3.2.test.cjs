const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME,DASH,ECHO_SPIRE}=require('../src/core/config.js');
const FAIR=require('../src/director/high-speed-fairness.js');
const {simulate}=require('../scripts/high-speed-fairness-audit.cjs');
const zoneAt=t=>1+Math.floor(t/GAME.zoneSeconds);
const speedV31=t=>370+1000*(1-Math.exp(-t/180))+.75*t;
const speedV2=(t,z)=>370+Math.min(t,120)*7+Math.max(0,t-120)*4.5+7*(z-1);

test('Speed Curve 3.2 retains launch speed and zone cadence but not instant zone boosts',()=>{
  assert.equal(GAME.baseSpeed,370);
  assert.equal(GAME.zoneSeconds,12);
  assert.equal(GAME.speedRise,1350);
  assert.equal(GAME.speedEaseSeconds,170);
  assert.equal(GAME.cruiseAcceleration,.9);
  assert.equal(GAME.zoneSpeedBonus,0);
  assert.equal(GAME.speedAt(0,1),370);
  assert.equal(GAME.speedAt(-10,1),370);
});

test('Endless 4.0 retains Core Pace early but continues accelerating after four minutes',()=>{
  const checkpoints=[
    [0,370],[12,473],[30,615],[45,724],[60,835],[90,1078],
    [120,1335],[180,1802],[225,2023],[240,2067],
    [300,2256],[360,2465],[420,2679],[600,3305]
  ];
  for(const [t,expected] of checkpoints){
    const got=GAME.speedAt(t,zoneAt(t));
    assert.equal(Math.round(got),expected,'wrong speed at t='+t);
  }
  const original=t=>GAME.baseSpeed+GAME.speedRise*(1-Math.exp(-t/GAME.speedEaseSeconds))+
    t*GAME.cruiseAcceleration;
  for(const t of [0,12,30,45])assert.ok(Math.abs(GAME.speedAt(t)-original(t))<1e-9,
    'the first 45 seconds must stay unchanged');
  assert.ok(GAME.speedAt(180)-original(180)>380);
  assert.ok(GAME.speedAt(240)-original(240)>450);
  assert.ok(GAME.speedAt(240)>2000&&GAME.speedAt(240)<2200);
});

test('pace boost is monotonic and has no acceleration seam at 45s or 225s',()=>{
  const slope=t=>(GAME.speedAt(t+.001)-GAME.speedAt(t))/.001;
  for(const t of [0,30,44.9,45,45.1,60,120,180,224.9,225,225.1,300,420,600]){
    assert.ok(slope(t)>0&&slope(t)<10,'unfair acceleration at '+t);
  }
  for(const t of [12,45,60,120,180,225,240,420]){
    const left=(GAME.speedAt(t)-GAME.speedAt(t-.001))/.001;
    const right=(GAME.speedAt(t+.001)-GAME.speedAt(t))/.001;
    assert.ok(Math.abs(left-right)<.001,'acceleration seam at t='+t);
  }
  assert.equal(GAME.midgameSpeedStart,45);
  assert.equal(GAME.midgameSpeedFull,225);
  assert.equal(GAME.midgameSpeedGain,460);
});

test('zone boundaries never add extra speed steps',()=>{
  for(let z=2;z<=101;z++){
    const t=(z-1)*GAME.zoneSeconds;
    assert.equal(GAME.speedAt(t,z-1),GAME.speedAt(t,z));
    assert.ok(GAME.speedAt(t,z)>GAME.speedAt(t-.001,z-1));
  }
});

test('speed keeps increasing with no ceiling through twenty minutes',()=>{
  let prev=GAME.baseSpeed;
  for(let i=1;i<=60*1200;i++){
    const t=i/60,v=GAME.speedAt(t,zoneAt(t));
    assert.ok(v>prev&&Number.isFinite(v),'non-increasing speed at t='+t);
    prev=v;
  }
  assert.ok(GAME.speedAt(1200,101)>GAME.speedAt(600,51));
});

test('practice zone entry uses the exact same clock-derived speed as arcade',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(src,/time=\(startZone-1\)\*GAME\.zoneSeconds/);
  assert.match(src,/speed=GAME\.speedAt\(time,zone\)/);
  for(const z of [1,2,4,8,16,26,36,51]){
    const t=(z-1)*GAME.zoneSeconds;
    assert.equal(GAME.speedAt(t,z),GAME.speedAt(t,zoneAt(t)));
  }
});

test('reaction-time budgets remain fair at 3, 5, 7 and 10 minutes',()=>{
  for(const t of [180,300,420,600]){
    const speed=GAME.speedAt(t,zoneAt(t));
    for(const width of [900,1280,1600]){
      const playerX=width*.265;
      for(const type of ['jump','duck','echo','gap','echo-gap','dash-jump','dash-duck']){
        const x=FAIR.horizonFor(type,{speed,viewportWidth:width,playerX});
        const m=FAIR.metrics(type,{x,speed,viewportWidth:width,playerX});
        assert.ok(m.fair&&m.leadSeconds+1e-8>=FAIR.rule(type).lead,
          'insufficient warning for '+type+' at '+t+'s');
      }
    }
  }
});

test('movement and two-thumb controls are unchanged in this pass',()=>{
  assert.equal(GAME.jumpVelocity,-870);
  assert.equal(GAME.echoJumpVelocity,-650);
  assert.equal(GAME.gravity,2140);
  assert.equal(GAME.duckDuration,.55);
  assert.equal(DASH.duration,.30);
  assert.equal(ECHO_SPIRE.firstZone,2);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/src\/core\/config\.js\?v=[^\"]*speed-curve-3\.2/);
  assert.match(html,/id="jump-btn"/);
  assert.match(html,/id="duck-btn"/);
  assert.doesNotMatch(html,/id="dash-btn"/);
});

test('seven-minute deterministic narrow-screen run respects Director safety under restored pace',()=>{
  const run=simulate({seed:42,seconds:420,viewportWidth:900,damageEvery:17});
  assert.equal(Math.round(run.finalSpeed),2679);
  assert.ok(run.cleared>10);
  assert.equal(run.underBudget,0);
  assert.equal(run.lateGaps,0);
  assert.equal(run.transitionViolations,0);
});

test('speed target is supported by player log without scripting a six-minute death',()=>{
  const log=JSON.parse(fs.readFileSync(
    path.join(__dirname,'../docs/speed-curve-3.1-player-audit.json'),'utf8'));
  assert.equal(log.elapsedSeconds,413.2);
  assert.equal(log.finalZone,35);
  assert.ok(Math.abs(log.observedSpeed-1154.84)<.1);
  const revised=GAME.speedAt(log.elapsedSeconds,log.finalZone);
  assert.ok(revised>2600&&revised<2700,
    'Endless 4.0 keeps adding speed without setting a death clock');
});

test('historic 4m29.68 player log anchors the new faster Core Pace curve',()=>{
  // Logged Speed Curve 3.1 result: 269.68 seconds, zone 23, 1348.77 world units/s.
  const elapsed=269.68,zone=23,observed=1348.77;
  assert.equal(zoneAt(elapsed),zone);
  assert.ok(Math.abs(speedV31(elapsed)-observed)<.1);
  const upgraded=GAME.speedAt(elapsed,zone);
  assert.ok(upgraded>2120&&upgraded<2170);
  assert.ok(upgraded/observed>1.57&&upgraded/observed<1.62);
  // A faster speed at the *same time* is not a claim about human survival time.
});
