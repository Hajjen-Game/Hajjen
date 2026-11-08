const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME,DASH,JUMP_FEEL,ECHO_SPIRE}=require('../src/core/config.js');
const {ContextualDash}=require('../src/gameplay/contextual-dash.js');
const {PlayerMotion,dashBodyPath,dashStrength}=require('../src/render/player-motion.js');
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
test('air dash morphs cube dramatically and ends without affecting hitbox',()=>{
  const m=new PlayerMotion();
  const p={x:330,feet:515,vy:-200,landed:false,duck:false};
  const box=playerBox(p);
  const before=m.sample(p);
  m.dashStart(false);
  m.tick(.08);
  const active=m.sample(p);
  assert.ok(active.dash>.95);
  assert.ok(active.scaleX>before.scaleX+.48,'air body stretches visibly');
  assert.ok(active.scaleY<before.scaleY-.10,'body becomes lower and faster');
  assert.ok(active.glow>before.glow+.65);
  assert.equal(active.dashMode,'air');
  assert.deepEqual(playerBox(p),box,'morph never widens the collider');
  m.tick(.27);
  assert.equal(m.sample(p).dash,0);
});
test('ground dash becomes a distinct low skid-body, cancels at duck release',()=>{
  const m=new PlayerMotion();
  m.duckStart();
  m.dashStart(true);
  m.tick(.09);
  const pose=m.sample({landed:true,duck:true,vy:0});
  assert.ok(pose.scaleX>1.6);
  assert.ok(pose.scaleY<.9);
  assert.equal(pose.dashMode,'ground');
  assert.ok(dashStrength(.15)>.99);
  m.duckRelease();
  assert.equal(m.sample({landed:true,duck:false}).dash,undefined);
  assert.equal(m.dashTime,0);
});
test('air and ground polygon contours have different forward-facing geometry',()=>{
  function record(mode){
    const points=[];
    const ctx={beginPath(){points.push(['begin'])},moveTo(x,y){points.push(['M',x,y])},
      lineTo(x,y){points.push(['L',x,y])},closePath(){points.push(['close'])}};
    dashBodyPath(ctx,100,50,70,30,mode);
    return points;
  }
  const a=record('air'),g=record('ground');
  assert.ok(a.length>=10&&g.length>=9);
  assert.notDeepEqual(a,g,'dash must not just be a scaled rounded rectangle');
  for(const [type,x,y] of a.concat(g)){
    if(type==='M'||type==='L'){
      assert.ok(x>=100&&x<=170);
      assert.ok(y>=50&&y<=80);
    }
  }
  assert.deepEqual(a.find(([type,x])=>type==='L'&&x===170),['L',170,65]);
  assert.notEqual(g.find(([type,x])=>type==='L'&&x===170)[2],65);
});
test('release includes versioned assets and a real non-circular silhouette pass',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(html,/LATEST UPDATE · DASH IMPACT & MORPH 2\.2/);
  assert.match(html,/contextual-dash\.js\?v=contextual-dash-2\.2/);
  assert.match(html,/player-motion\.js\?v=duck-effects-1\.0-movement-1\.0-dash-morph-2\.2/);
  assert.match(html,/ALL MOVES AVAILABLE FROM ZONE 01/);
  assert.match(game,/window\.ChromaMotion\.dashBodyPath\(ctx,rx,ry,rw,rh/);
  assert.match(game,/const worldStep=speed\*dt\+dash\.tick\(dt,speed\)/);
  assert.match(game,/o\.x-=worldStep/);
});
