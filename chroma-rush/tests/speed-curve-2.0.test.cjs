const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME}=require('../src/core/config.js');
const oldSpeedAt=(t,zone)=>370+11.5*t+12*Math.max(0,zone-1);
const zoneAt=t=>1+Math.floor(t/GAME.zoneSeconds);

test('Speed Curve 2.0 retains original launch but lowers acceleration and zone boost',()=>{
  assert.equal(GAME.baseSpeed,370);
  assert.equal(GAME.acceleration,7);
  assert.equal(GAME.zoneSpeedBonus,7);
  assert.equal(GAME.lateAccelerationAfterSeconds,120);
  assert.equal(GAME.lateAcceleration,4.5);
  assert.equal(GAME.zoneSeconds,12);
  assert.equal(GAME.speedAt(0,1),370);
});
test('published checkpoints match the approved gradual two-stage curve',()=>{
  const checkpoints=[
    [0,1,370],[30,3,594],[60,6,825],
    [90,8,1049],[120,11,1280],[180,16,1585]
  ];
  for(const [time,zone,speed] of checkpoints)
    assert.equal(GAME.speedAt(time,zone),speed,`t=${time}s, zone=${zone}`);
  assert.equal(GAME.speedAt(120,11),1280);
  assert.equal(oldSpeedAt(120,11),1870);
  assert.equal(oldSpeedAt(180,16),2620);
  assert.ok(GAME.speedAt(180,16)<oldSpeedAt(180,16)*.62);
});
test('the 120-second taper is continuous, never a speed drop or abrupt cap',()=>{
  const zone=11,eps=1e-5;
  const at=GAME.speedAt(120,zone);
  assert.ok(Math.abs(GAME.speedAt(120-eps,zone)-at)<.0001);
  assert.ok(Math.abs(GAME.speedAt(120+eps,zone)-at)<.0001);
  assert.ok(Math.abs(GAME.speedAt(91,8)-GAME.speedAt(90,8)-7)<1e-8);
  assert.ok(Math.abs(GAME.speedAt(121,11)-GAME.speedAt(120,11)-4.5)<1e-8);
  assert.ok(GAME.speedAt(600,51)>GAME.speedAt(300,26));
  assert.ok(GAME.speedAt(600,51)<oldSpeedAt(600,51));
});
test('at every zone crossing the speed rises modestly instead of jumping downward',()=>{
  for(let z=2;z<=50;z++){
    const t=(z-1)*GAME.zoneSeconds;
    const before=GAME.speedAt(t-1e-5,z-1);
    const after=GAME.speedAt(t,z);
    assert.ok(after>before,`zone ${z} must still accelerate`);
    assert.ok(after-before<7.01,`zone ${z} must not get a speed spike`);
  }
});
test('constant-zone time interpolation grows at only the declared slopes',()=>{
  for(const z of [1,3,8,11,25]){
    for(const t of [0,12,60,100]){
      assert.ok(Math.abs(GAME.speedAt(t+.5,z)-GAME.speedAt(t,z)-3.5)<1e-8);
    }
    for(const t of [120,128,180,240]){
      assert.ok(Math.abs(GAME.speedAt(t+.5,z)-GAME.speedAt(t,z)-2.25)<1e-8);
    }
  }
});
test('entire arcade run stays monotonic while growing more gently after two minutes',()=>{
  let previous=GAME.baseSpeed;
  for(let i=1;i<=60*360;i++){
    const t=i/60;
    const speed=GAME.speedAt(t,zoneAt(t));
    assert.ok(speed>previous,`unexpected slowdown at t=${t}`);
    assert.ok(Number.isFinite(speed)&&speed>0);
    previous=speed;
  }
  assert.ok(GAME.speedAt(360,zoneAt(360))>GAME.speedAt(180,16));
});
test('practice mode starts at the same clock-derived speed as ordinary runs',()=>{
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(game,/time=\(startZone-1\)\*GAME\.zoneSeconds/);
  assert.match(game,/speed=GAME\.speedAt\(time,zone\)/);
  for(const zone of [1,2,4,8,11,16,25]){
    const startTime=(zone-1)*GAME.zoneSeconds;
    assert.equal(GAME.speedAt(startTime,zone),
      GAME.speedAt(startTime,zoneAt(startTime)));
  }
});
test('physics, controls, fairness and Director source stay unchanged',()=>{
  assert.equal(GAME.jumpVelocity,-870);
  assert.equal(GAME.echoJumpVelocity,-650);
  assert.equal(GAME.gravity,2140);
  assert.equal(GAME.duckDuration,.55);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/id="jump-btn"/);
  assert.match(html,/id="duck-btn"/);
  assert.doesNotMatch(html,/id="dash-btn"/);
  assert.ok(html.includes('src/core/config.js?v=flow-1.2-movement-1.0-echo-spire-1.0-combo-1.0-speed-curve-2.0-echo-polish-1.1'));
});
