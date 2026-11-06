const test=require('node:test');
const assert=require('node:assert/strict');
const {EffectLanguage,MAX_EFFECTS}=require('../src/render/effect-language.js');
const {PlayerMotion}=require('../src/render/player-motion.js');
const GEO=require('../src/core/geometry.js');
const GAME=require('../src/core/config.js').GAME;

function context(){
  const ops=[];
  const ctx={save(){ops.push('save')},restore(){ops.push('restore')},beginPath(){ops.push('begin')},
    moveTo(){ops.push('move')},lineTo(){ops.push('line')},stroke(){ops.push('stroke')},
    ellipse(){throw Error('Ellipse must not be used for an effect-language pulse')}};
  return {ctx,ops};
}
test('duck entry snaps down immediately then settles while held',()=>{
  const m=new PlayerMotion();m.duckStart();
  const first=m.sample({landed:true,duck:true});
  assert.ok(first.scaleY<.85,'duck entry should have visible low compression');
  assert.ok(first.scaleX>1.15,'duck entry should feel wide and fast');
  m.tick(.12);
  const settled=m.sample({landed:true,duck:true});
  assert.ok(settled.scaleY>=.99);
  assert.equal(GAME.duckDuration,.55);
  assert.equal(GAME.duckRecovery,.12);
});
test('duck release springs upright and completely returns to neutral',()=>{
  const m=new PlayerMotion();m.duckStart();m.tick(.55);m.duckRelease();
  assert.ok(m.sample({landed:true,duck:false}).scaleY<.9);
  m.tick(.06);
  assert.ok(m.sample({landed:true,duck:false}).scaleY>.9);
  m.tick(.2);
  assert.equal(m.sample({landed:true,duck:false}).scaleY,1);
  m.duckStart();m.duckCancel();
  assert.equal(m.sample({landed:true,duck:false}).scaleY,1);
});
test('all duck deformation is presentational and cannot modify the hitbox',()=>{
  const m=new PlayerMotion(),p={x:240,feet:510,duck:true,landed:true};
  m.duckStart();m.sample(p);
  assert.deepEqual(GEO.playerBox(p),{x:207,y:489,w:66,h:21});
  m.tick(.15);m.sample(p);
  assert.deepEqual(GEO.playerBox(p),{x:207,y:489,w:66,h:21});
  p.duck=false;m.duckRelease();m.sample(p);
  assert.deepEqual(GEO.playerBox(p),{x:218,y:466,w:44,h:44});
});
test('linear ground pulses and corner frame echoes never draw circular rings',()=>{
  const fx=new EffectLanguage(),{ctx,ops}=context();
  fx.ground(110,420,'#23eeff',18);
  fx.frame(110,394,'#fd54bb',28);
  fx.draw(ctx,{glow:.25,density:.4});
  assert.equal(ops.filter(x=>x==='stroke').length,2);
  assert.equal(ops.filter(x=>x==='line').length,2+8);
  assert.ok(!ops.includes('ellipse'));
});
test('effects expire and queue remains bounded at all times',()=>{
  const fx=new EffectLanguage();
  for(let i=0;i<MAX_EFFECTS+30;i++)fx.ground(i,200,'#ffffff');
  assert.equal(fx.active.length,MAX_EFFECTS);
  fx.tick(.5);assert.equal(fx.active.length,0);
  fx.frame(100,100,'#ffffff');fx.reset();assert.equal(fx.active.length,0);
});
test('game uses geometric VFX and no legacy ripple or ellipse pulse code',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(game,/motion\.duckStart\(\)/);
  assert.match(game,/motion\.duckRelease\(\)/);
  assert.match(game,/effects\.draw\(ctx/);
  assert.doesNotMatch(game,/\bripple\(/);
  assert.doesNotMatch(game,/\brings\b/);
  assert.doesNotMatch(game,/ctx\.ellipse\(/);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.ok(html.includes('src/render/effect-language.js?v=duck-effects-1.0'));
  assert.ok(html.indexOf('src/render/effect-language.js')<html.indexOf('src/gameplay/game.js'));
});
