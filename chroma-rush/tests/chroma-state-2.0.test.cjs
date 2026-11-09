const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {ChromaStateVisuals,IN_SECONDS,OUT_SECONDS,ENTRY_SECONDS}=
  require('../src/render/chroma-state-vfx.js');
const {FlowSystem}=require('../src/gameplay/flow.js');
const {ReactiveAudioSystem}=require('../src/audio/reactive-audio.js');

const paint=()=>{
  const calls={strokes:0,rects:0,gradients:0,moves:0,lines:0};
  const ctx={
    save(){},restore(){},beginPath(){},closePath(){},
    fillRect(){calls.rects++},stroke(){calls.strokes++},
    moveTo(){calls.moves++},lineTo(){calls.lines++},
    createLinearGradient(){calls.gradients++;return{addColorStop(){}}},
    arc(){throw Error('Chroma VFX cannot draw rings')},
    ellipse(){throw Error('Chroma VFX cannot draw rings')}
  };
  return {ctx,calls};
};
const options={width:950,height:720,groundY:515,primary:'#a06bff',
  secondary:'#e265ff',speed:850,quality:{name:'high',density:1,glow:1}};
const player={...options,x:253,y:515,width:44,height:44,duck:false};
function render(v,ctx,q=options.quality,reducedMotion=false){
  v.drawEnvironment(ctx,{...options,quality:q,reducedMotion});
  v.drawBehindPlayer(ctx,{...player,quality:q,reducedMotion});
  v.drawAfterPlayer(ctx,{...player,quality:q,reducedMotion});
}

test('Chroma activates once, enters smoothly, and does not restart each frame',()=>{
  const fx=new ChromaStateVisuals();
  assert.equal(fx.visible,false);assert.equal(fx.setActive(true),'enter');
  assert.equal(fx.setActive(true),null);
  fx.tick(IN_SECONDS/2);
  assert.ok(fx.intensity>.45&&fx.intensity<.55);
  fx.tick(IN_SECONDS);
  assert.equal(fx.intensity,1);
  assert.equal(fx.entryCount,1);assert.equal(fx.arrival,0);
  fx.tick(1);assert.equal(fx.entryCount,1);
});

test('leaving Chroma smoothly fades every layer without lingering FX',()=>{
  const fx=new ChromaStateVisuals();
  fx.setActive(true);fx.tick(1);
  assert.equal(fx.setActive(false),'exit');
  assert.equal(fx.setActive(false),null);
  fx.tick(OUT_SECONDS/2);
  assert.ok(fx.intensity>.45&&fx.intensity<.55);
  fx.tick(OUT_SECONDS);
  assert.equal(fx.visible,false);assert.equal(fx.intensity,0);
  assert.equal(fx.exitCount,1);
  const {ctx,calls}=paint();render(fx,ctx);
  assert.equal(calls.strokes,0);assert.equal(calls.rects,0);
});

test('reduced motion retains actual game state but suppresses animated VFX',()=>{
  const fx=new ChromaStateVisuals();
  assert.equal(fx.setActive(true),'enter');
  fx.tick(.01,{reducedMotion:true});assert.equal(fx.intensity,1);
  const {ctx,calls}=paint();render(fx,ctx,options.quality,true);
  assert.equal(calls.strokes,0);assert.equal(calls.rects,0);
  assert.equal(fx.setActive(false),'exit');
  fx.tick(.01,{reducedMotion:true});assert.equal(fx.intensity,0);
});

test('state change relies on Flow Balance 1.2 hysteresis, not raw meter',()=>{
  const flow=new FlowSystem(),fx=new ChromaStateVisuals();
  for(let i=0;i<18;i++)flow.registerClear(); // Exactly 90%
  assert.equal(flow.tier,3);assert.equal(fx.setActive(flow.tier===3),'enter');
  flow.tick(1);assert.ok(flow.value<90&&flow.value>87);
  assert.equal(flow.tier,3);assert.equal(fx.setActive(flow.tier===3),null);
  flow.registerDamage();assert.ok(flow.value<87);
  assert.equal(flow.tier,1);assert.equal(fx.setActive(flow.tier===3),'exit');
  assert.equal(flow.multiplier,1.25);
});

test('cosmetic ambient, wake, prismatic corners have no circular/ring geometry',()=>{
  const fx=new ChromaStateVisuals(),p=paint();
  fx.setActive(true);fx.tick(.20);
  render(fx,p.ctx);
  assert.ok(p.calls.gradients>0);
  assert.ok(p.calls.rects>0);
  assert.ok(p.calls.strokes>=10);
  assert.ok(p.calls.lines>=p.calls.strokes);
  assert.ok(fx.arrival>0);
  assert.equal(ENTRY_SECONDS,.62);
});

test('active Chroma wake is canvas-state balanced for ceiling or floor and every graphics mode',()=>{
  const fx=new ChromaStateVisuals();fx.setActive(true);fx.tick(.5);
  for(const density of [1,.65,.36]){
    let depth=0,saves=0,restores=0;
    const {ctx}=paint();
    ctx.save=()=>{depth++;saves++};
    ctx.restore=()=>{depth--;restores++;assert.ok(depth>=0,'FX cannot pop the caller transform')};
    ctx.save();const parentDepth=depth;
    fx.drawBehindPlayer(ctx,{...player,quality:{density,glow:density}});
    assert.equal(depth,parentDepth,'Chroma wake restores only its own style');
    assert.equal(saves,2);
    assert.equal(restores,1);
    fx.drawAfterPlayer(ctx,{...player,quality:{density,glow:density}});
    assert.equal(depth,parentDepth,'detached neon corners also preserve parent transform');
    ctx.restore();assert.equal(depth,0);
  }
  const low=paint();let count=0;
  low.ctx.restore=()=>{count++};
  fx.drawBehindPlayer(low.ctx,{...player,reducedMotion:true});
  assert.equal(count,0,'reduced motion has no unmatched canvas operation');
});

test('performance graphics creates fewer draw strokes but preserves recognizable layers',()=>{
  const a=new ChromaStateVisuals();a.setActive(true);a.tick(.65);
  const high=paint(),low=paint();
  render(a,high.ctx,{name:'high',density:1,glow:1});
  render(a,low.ctx,{name:'performance',density:.36,glow:.24});
  assert.ok(high.calls.strokes>low.calls.strokes);
  assert.ok(low.calls.strokes>=7,'the core square outline stays visible');
});

test('all VFX motion is deterministic and follows game time, not frame count',()=>{
  const a=new ChromaStateVisuals(),b=new ChromaStateVisuals();
  a.setActive(true);b.setActive(true);a.tick(.35);
  for(let i=0;i<21;i++)b.tick(1/60);
  assert.ok(Math.abs(a.intensity-b.intensity)<1e-10);
  assert.ok(Math.abs(a.elapsed-b.elapsed)<1e-10);
  assert.equal(a.entryCount,b.entryCount);
});

test('jump/duck poses and pause/reset cannot create an extra activation',()=>{
  const fx=new ChromaStateVisuals();
  fx.setActive(true);fx.tick(.2);
  const {ctx,calls}=paint();
  fx.drawBehindPlayer(ctx,{...player,width:66,height:21,duck:true});
  fx.drawAfterPlayer(ctx,{...player,width:66,height:21,duck:true});
  assert.ok(calls.strokes>0);
  const age=fx.elapsed;
  fx.tick(0);assert.equal(fx.elapsed,age);
  fx.reset();assert.equal(fx.entryCount,0);assert.equal(fx.visible,false);
});

test('Chroma entry has an original three-voice synth cue, separate from other FX',()=>{
  const audio=new ReactiveAudioSystem({scope:{},enabled:false});
  const played=[];
  audio.enabled=true;audio.playing=true;audio.effectsEnabled=true;audio.context={state:'running',currentTime:0};
  audio._voice=(...args)=>played.push(args);
  audio.effect('chroma');
  assert.equal(played.length,3);
  assert.ok(played[0][0].hz<played[1][0].hz);
  assert.ok(played[1][0].hz<played[2][0].hz);
  assert.ok(played[2][1]>played[0][1]);
});

test('game composition attaches all layers behind the hazards and keeps existing rules',()=>{
  const code=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.ok(code.includes("chromaVfx.setActive(flow.tier===3)"));
  assert.ok(code.includes("chromaVfx.drawBehindPlayer(ctx"));
  assert.ok(code.includes("chromaVfx.drawAfterPlayer(ctx"));
  const env=code.indexOf("chromaVfx.drawEnvironment(ctx");
  const obstacles=code.indexOf("for(const o of hurdles)drawObstacle(o)");
  assert.ok(env>=0&&obstacles>env,'ambient effects cannot cover incoming hazards');
  assert.ok(html.indexOf('src/render/chroma-state-vfx.js?v=speed-trails-2.0')<
    html.indexOf('src/gameplay/game.js?v=arcade-animation-2.0'));
  assert.match(html,/LATEST UPDATE · (?:PREMIUM ARCADE UI 4\.0|ARCADE SIMPLIFICATION 1\.0|CORE PACE 1\.1)/);
});
