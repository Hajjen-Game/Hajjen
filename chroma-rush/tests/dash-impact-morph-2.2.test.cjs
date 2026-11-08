const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME,DASH,JUMP_FEEL,ECHO_SPIRE}=require('../src/core/config.js');
const {ContextualDash}=require('../src/gameplay/contextual-dash.js');
const {PlayerMotion,dashStrength}=require('../src/render/player-motion.js');
const {playerBox}=require('../src/core/geometry.js');

function distanceFor(speed){
  const dash=new ContextualDash();
  assert.equal(dash.request({zone:1,grounded:false}),'air');
  let total=0;
  for(let i=0;i<40;i++)total+=dash.tick(1/60,speed);
  assert.equal(dash.active,false);
  assert.equal(dash.tick(.03,speed),0);
  return total;
}
test('all movement abilities usable in zone 1; Echo Spire still teaches in zone 2',()=>{
  assert.equal(DASH.unlockZone,1);
  assert.equal(JUMP_FEEL.echoUnlockZone,1);
  assert.equal(ECHO_SPIRE.firstZone,2);
  assert.equal(GAME.jumpVelocity,-870);
  assert.equal(GAME.gravity,2140);
});
test('2.2 Dash delivers a clearly stronger finite surge on both early and later zones',()=>{
  assert.equal(DASH.duration,.30);
  assert.equal(DASH.bonusFactor,1.05);
  const launch=distanceFor(370);
  const later=distanceFor(680);
  assert.ok(launch>110&&launch<140,'start-zone extra distance is visible, not a teleport');
  assert.ok(later>190&&later<240,'faster-zone dash remains capped and deterministic');
  assert.ok(launch>64.8*1.6,'stronger than previous 2.1 extra travel');
  const d=new ContextualDash();
  d.onDuckStart();
  assert.equal(d.request({zone:1,grounded:true,ducking:true}),'ground');
  assert.ok(d.tick(1/60,370)>7);
  assert.equal(d.request({zone:1,grounded:true,ducking:true}),null);
});
test('air dash uses a rounded cube with soft forward lean, never a pointed glider',()=>{
  const m=new PlayerMotion();
  const p={x:330,feet:515,vy:-200,landed:false,duck:false};
  const box=playerBox(p);
  const before=m.sample(p);
  m.dashStart(false);
  m.tick(.08);
  const active=m.sample(p);
  assert.ok(active.dash>.95);
  assert.ok(active.scaleX>before.scaleX+.10&&active.scaleX<before.scaleX+.20,
    'air stretches gently, not into an arrow');
  assert.ok(active.scaleY<before.scaleY-.03&&active.scaleY>before.scaleY-.08,
    'air keeps the original squash/stretch scale');
  assert.ok(active.tilt>.20&&active.tilt<.22,'air gently leans about 12 degrees');
  assert.ok(active.glow>before.glow+.65);
  assert.equal(active.dashMode,'air');
  assert.deepEqual(playerBox(p),box,'morph never widens the collider');
  m.tick(.27);
  assert.equal(m.sample(p).dash,0);
});
test('ground dash keeps compact duck silhouette and only a small forward lean',()=>{
  const m=new PlayerMotion();
  m.duckStart();
  m.dashStart(true);
  m.tick(.09);
  const pose=m.sample({landed:true,duck:true,vy:0});
  assert.ok(pose.scaleX>1.1&&pose.scaleX<1.25,
    'ground Dash stays almost the same width as duck');
  assert.ok(pose.scaleY>.9&&pose.scaleY<=1,
    'ground Dash stays compact instead of becoming a low arrow');
  assert.ok(pose.tilt>.049&&pose.tilt<.054,'duck has only about 3 degrees lean');
  assert.equal(pose.dashMode,'ground');
  assert.ok(dashStrength(.15)>.99);
  m.duckRelease();
  assert.equal(m.sample({landed:true,duck:false}).dash,undefined);
  assert.equal(m.dashTime,0);
});
test('dash lean fades smoothly in and out; normal movement stays upright',()=>{
  assert.equal(dashStrength(0),0);
  assert.equal(dashStrength(.30),0);
  assert.ok(dashStrength(.29)>0&&dashStrength(.29)<.5);
  assert.ok(dashStrength(.27)>dashStrength(.29));
  assert.equal(dashStrength(.20),1);
  assert.ok(dashStrength(.05)>0&&dashStrength(.05)<1);
  const motion=new PlayerMotion();
  assert.equal(motion.sample({landed:false,vy:-330}).tilt,0);
  assert.equal(motion.sample({landed:true,duck:true}).tilt,0);
  motion.dashStart(false);
  motion.tick(.1);
  const air=motion.sample({landed:false,vy:-330});
  motion.duckStart();
  motion.dashStart(true);
  motion.tick(.1);
  const ground=motion.sample({landed:true,duck:true});
  assert.ok(air.tilt>ground.tilt*3.5,
    'air lean should be prominent while ground lean is subtle');
  motion.duckCancel();
  assert.equal(motion.sample({landed:true,duck:true}).tilt,0);
});
test('release renders original rounded cube with rotation, no arrow path',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(html,/LATEST UPDATE · DASH SOFT LEAN 2\.3/);
  assert.match(html,/contextual-dash\.js\?v=contextual-dash-2\.2/);
  assert.match(html,/player-motion\.js\?v=duck-effects-1\.0-movement-1\.0-dash-soft-lean-2\.3/);
  assert.match(html,/ALL MOVES AVAILABLE FROM ZONE 01/);
  assert.match(game,/ctx\.rotate\(reducedMotion\?shape\.tilt\*\.25:shape\.tilt\)/);
  assert.match(game,/roundRectPath\(rx,ry,rw,rh,8\)/);
  assert.doesNotMatch(game,/dashBodyPath|pointed aerial glider|forward-facing wedge/);
  assert.match(game,/const worldStep=speed\*dt\+dash\.tick\(dt,speed\)/);
  assert.match(game,/o\.x-=worldStep/);
});
