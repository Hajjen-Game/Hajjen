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

test('checkpoints from launch through ten minutes match the long-run plan',()=>{
  const checkpoints=[
    [0,370],[12,473],[30,615],[60,825],[90,1006],[120,1162],
    [180,1414],[240,1607],[300,1759],[360,1882],[420,1984],[600,2220]
  ];
  for(const [t,expected] of checkpoints){
    const got=GAME.speedAt(t,zoneAt(t));
    assert.equal(Math.round(got),expected,'wrong speed at t='+t);
    if(t){
      assert.ok(got>speedV31(t),'v3.2 must be faster than the v3.1 player-tested curve at t='+t);
      if(t===60)assert.ok(Math.abs(got-speedV2(t,zoneAt(t)))<2,'one-minute speed near original 2.0');
      if(t>=90)assert.ok(got<speedV2(t,zoneAt(t)),'v3.2 must remain gentler than v2.0 after 90s');
    }
  }
});

test('smooth taper: acceleration decreases without speed drops or two-minute seam',()=>{
  const slope=t=>(GAME.speedAt(t+.01,zoneAt(t))-GAME.speedAt(t,zoneAt(t)))/.01;
  const derivs=[0,60,120,180,300,420,600].map(slope);
  for(let i=1;i<derivs.length;i++)assert.ok(derivs[i]<derivs[i-1]);
  assert.ok(derivs[0]>8.8&&derivs[0]<8.9);
  assert.ok(derivs.at(-1)>1.1&&derivs.at(-1)<1.2);
  for(const t of [12,60,120,180,300,420,600]){
    const left=(GAME.speedAt(t,zoneAt(t))-GAME.speedAt(t-.001,zoneAt(t-.001)))/.001;
    const right=(GAME.speedAt(t+.001,zoneAt(t+.001))-GAME.speedAt(t,zoneAt(t)))/.001;
    assert.ok(Math.abs(left-right)<.001,'acceleration seam at t='+t);
  }
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

test('seven-minute deterministic narrow-screen run respects Director fairness invariants',()=>{
  const run=simulate({seed:42,seconds:420,viewportWidth:900,damageEvery:17});
  assert.equal(Math.round(run.finalSpeed),1984);
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
  assert.ok(revised>1900&&revised<2050,
    'v3.2 should substantially raise late speed without approaching v2.0 extremes');
  assert.ok(revised<speedV2(log.elapsedSeconds,log.finalZone));
});

test('recent 4m29.68 player run produces the approved 3.2 speed gain',()=>{
  // Logged Speed Curve 3.1 result: 269.68 seconds, zone 23, 1348.77 world units/s.
  const elapsed=269.68,zone=23,observed=1348.77;
  assert.equal(zoneAt(elapsed),zone);
  assert.ok(Math.abs(speedV31(elapsed)-observed)<.1);
  const upgraded=GAME.speedAt(elapsed,zone);
  assert.ok(upgraded>1670&&upgraded<1700);
  assert.ok(upgraded/observed>1.24&&upgraded/observed<1.27);
  // A faster speed at the *same time* is not a claim about human survival time.
});
