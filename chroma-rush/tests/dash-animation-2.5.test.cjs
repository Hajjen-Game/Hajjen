const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {PlayerMotion,dashShear,dashFeel,elasticBodyPath,FRONT_BEND_RATIO}=require('../src/render/player-motion.js');
const {SpeedTrails,MAX_DASH_ECHOES}=require('../src/render/speed-trails.js');
const {ReactiveAudioSystem}=require('../src/audio/reactive-audio.js');
const {playerBox}=require('../src/core/geometry.js');
const {DASH,GAME}=require('../src/core/config.js');

test('Dash 2.5 retains the approved back/forward curve and finite 2.2 movement',()=>{
  assert.equal(DASH.duration,.30);
  assert.equal(DASH.bonusFactor,1.05);
  assert.equal(DASH.unlockZone,1);
  assert.equal(FRONT_BEND_RATIO,1.28);
  assert.ok(dashShear(.255)<-.999);
  assert.ok(Math.abs(dashShear(.20)-1.28)<1e-8);
  assert.equal(dashShear(0),0);
  assert.equal(dashFeel(.255).burst,false);
  assert.equal(dashFeel(.20).burst,true);
  assert.ok(dashFeel(.255).windup>.99);
  assert.ok(dashFeel(.20).release>.99);
  assert.equal(GAME.gravity,2140);
});
test('Air Dash squashes in anticipation and releases into a supple stretch without rotation',()=>{
  const m=new PlayerMotion();
  const p={x:330,feet:515,vy:-200,landed:false,duck:false};
  const collider=playerBox(p);
  const rest=m.sample(p);
  m.dashStart(false);m.tick(.045);
  const back=m.sample(p);
  assert.ok(back.shear<-.99);
  assert.ok(back.scaleX<rest.scaleX-.07);
  assert.ok(back.scaleY>rest.scaleY+.055);
  m.tick(.055);
  const launch=m.sample(p);
  assert.ok(launch.shear>1.25);
  assert.ok(launch.scaleX>rest.scaleX+.13);
  assert.ok(launch.scaleY<rest.scaleY-.075);
  assert.equal('tilt' in launch,false);
  assert.deepEqual(playerBox(p),collider);
  m.tick(.20);
  assert.equal(m.sample(p).shear,0);
});
test('Ground Dash remains compact with a smaller matching squash/stretch',()=>{
  const m=new PlayerMotion();
  m.duckStart();m.dashStart(true);m.tick(.045);
  const back=m.sample({landed:true,duck:true});
  assert.ok(back.scaleX>1&&back.scaleX<1.15);
  assert.ok(back.shear<-.99);
  m.tick(.055);
  const front=m.sample({landed:true,duck:true});
  assert.ok(front.shear>1.25);
  assert.ok(front.scaleX>1.10&&front.scaleX<1.20);
  assert.ok(front.scaleY<1);
  assert.equal('tilt' in front,false);
  m.duckRelease();
  assert.equal(m.dashTime,0);
});
test('Dash afterimages capture previous feet and real distance; pool stays strictly bounded',()=>{
  const trails=new SpeedTrails();
  for(let i=0;i<13;i++){
    trails.tick(1/60,{playerX:300,feet:500-i*2,
      width:40,height:49,distance:800+i*20,speed:930,
      primary:'#3feeff',secondary:'#53b5ff',
      quality:{density:1,glow:1},
      dashPose:{shear:1.28,mode:'air'}});
  }
  assert.ok(trails.dashEchoes.length>0&&trails.dashEchoes.length<=MAX_DASH_ECHOES);
  assert.ok(trails.dashEchoes.some(s=>s.feet!==trails.current.feet));
  assert.ok(trails.dashEchoes.every(s=>s.topShift>0&&s.distance<=trails.current.distance));
  const calls={paths:0,curves:0,fills:0};
  const ctx={save(){},restore(){},beginPath(){},closePath(){},
    moveTo(){},lineTo(){},quadraticCurveTo(){},
    bezierCurveTo(){calls.curves++},fill(){calls.fills++},
    stroke(){},fillRect(){},strokeRect(){}};
  trails.draw(ctx,{quality:{density:1,glow:1},
    dashPath:(...args)=>{calls.paths++;elasticBodyPath(...args)}});
  assert.ok(calls.paths>0&&calls.paths<=MAX_DASH_ECHOES);
  assert.ok(calls.curves>=2&&calls.fills>=1,'actual curved historical shapes render');
  const before=trails.dashEchoes.length;
  trails.tick(.3,{playerX:300,feet:470,distance:1500,speed:950,quality:{density:1}});
  assert.equal(trails.dashEchoes.length,0,'old dashed poses expire without timers');
  assert.ok(before>0);
  trails.disrupt();
  assert.equal(trails.dashEchoes.length,0);
});
test('Reduced-motion and low-end graphics keep dash ghosts inexpensive',()=>{
  const slow=new SpeedTrails(),fast=new SpeedTrails();
  for(let i=0;i<12;i++){
    const args={playerX:300,feet:490,width:64,height:23,
      distance:850+i*22,speed:830,dashPose:{shear:1.28,mode:'ground'}};
    slow.tick(1/30,{...args,quality:{density:.36,glow:.24}});
    fast.tick(1/30,{...args,quality:{density:1,glow:1}});
  }
  assert.ok(slow.dashEchoes.length<=MAX_DASH_ECHOES);
  const tally=trails=>{
    let count=0;
    const ctx={save(){},restore(){},beginPath(){},closePath(){},moveTo(){},lineTo(){},
      stroke(){},fill(){},fillRect(){},strokeRect(){}};
    trails.draw(ctx,{quality:{density:trails===slow?.36:1,glow:.24},
      dashPath(){count++}});
    return count;
  };
  assert.ok(tally(slow)<=1);
  assert.ok(tally(fast)<=3);
  const reduced=new SpeedTrails();
  reduced.tick(1/30,{playerX:300,feet:490,distance:100,speed:830,
    dashPose:{shear:1.28,mode:'air'},reducedMotion:true});
  assert.equal(reduced.dashEchoes.length,0);
  assert.equal(reduced.current,null);
});
test('Audio separates the short charge from the dash whoosh; existing music unaffected',()=>{
  const a=new ReactiveAudioSystem({scope:{},enabled:false}),notes=[];
  a.enabled=true;a.effectsEnabled=true;a.effectsVolume=1;
  a.context={state:'running',currentTime:0};
  a._voice=(...args)=>notes.push(args);
  a.effect('dash-charge');
  assert.equal(notes.length,1);
  assert.ok(notes[0][2]<=.07);
  a.effect('dash-air');
  assert.equal(notes.length,4);
  a.effect('dash-ground');
  assert.equal(notes.length,7);
});
test('Release VFX is synchronized to elastic forward motion, and versioned assets are fresh',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(html,/LATEST UPDATE · DASH GAMEPLAY POLISH 2\.0/);
  assert.match(html,/player-motion\.js\?v=duck-effects-1\.0-movement-1\.0-dash-squash-stretch-2\.5/);
  assert.match(html,/speed-trails\.js\?v=speed-trails-2\.5-dash-echoes/);
  assert.match(game,/dashReleasePending=action/);
  assert.match(game,/phase\.dashFeel\?\.burst/);
  assert.match(game,/sound\('dash-charge'\)/);
  assert.match(game,/dashPath:window\.ChromaMotion\.elasticBodyPath/);
  assert.match(game,/dashPose:dash\.active&&trailPose\.dashFeel\?\.burst/);
  assert.doesNotMatch(game,/ctx\.rotate\(/);
  assert.match(game,/const worldStep=speed\*dt\+dash\.tick\(dt,speed\)/);
  assert.match(game,/o\.x-=worldStep/);
});
