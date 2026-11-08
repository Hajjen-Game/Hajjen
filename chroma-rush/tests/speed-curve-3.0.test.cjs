const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME,DASH,ECHO_SPIRE}=require('../src/core/config.js');
const FAIR=require('../src/director/high-speed-fairness.js');
const {simulate}=require('../scripts/high-speed-fairness-audit.cjs');
const zoneAt=t=>1+Math.floor(t/GAME.zoneSeconds);
const speedV2=(t,z)=>370+Math.min(t,120)*7+Math.max(0,t-120)*4.5+7*(z-1);

test('Speed Curve 3.0 retains launch speed and zone cadence but not instant zone boosts',()=>{
  assert.equal(GAME.baseSpeed,370);
  assert.equal(GAME.zoneSeconds,12);
  assert.equal(GAME.speedRise,620);
  assert.equal(GAME.speedEaseSeconds,180);
  assert.equal(GAME.cruiseAcceleration,.55);
  assert.equal(GAME.zoneSpeedBonus,0);
  assert.equal(GAME.speedAt(0,1),370);
  assert.equal(GAME.speedAt(-10,1),370);
});

test('checkpoints from launch through ten minutes match the long-run plan',()=>{
  const checkpoints=[
    [0,370],[12,417],[30,482],[60,579],[90,663],[120,738],
    [180,861],[240,959],[300,1038],[360,1104],[420,1161],[600,1298]
  ];
  for(const [t,expected] of checkpoints){
    const got=GAME.speedAt(t,zoneAt(t));
    assert.equal(Math.round(got),expected,'wrong speed at t='+t);
    if(t)assert.ok(got<speedV2(t,zoneAt(t)),'not slowed vs v2 at t='+t);
  }
});

test('smooth taper: acceleration decreases without speed drops or two-minute seam',()=>{
  const slope=t=>(GAME.speedAt(t+.01,zoneAt(t))-GAME.speedAt(t,zoneAt(t)))/.01;
  const derivs=[0,60,120,180,300,420,600].map(slope);
  for(let i=1;i<derivs.length;i++)assert.ok(derivs[i]<derivs[i-1]);
  assert.ok(derivs[0]>3.9&&derivs[0]<4.1);
  assert.ok(derivs.at(-1)>.55&&derivs.at(-1)<.75);
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
  assert.match(html,/speed-curve-3\.0/);
  assert.match(html,/id="jump-btn"/);
  assert.match(html,/id="duck-btn"/);
  assert.doesNotMatch(html,/id="dash-btn"/);
});

test('seven-minute deterministic narrow-screen run respects Director fairness invariants',()=>{
  const run=simulate({seed:42,seconds:420,viewportWidth:900,damageEvery:17});
  assert.equal(Math.round(run.finalSpeed),1161);
  assert.ok(run.cleared>10);
  assert.equal(run.underBudget,0);
  assert.equal(run.lateGaps,0);
  assert.equal(run.transitionViolations,0);
});
