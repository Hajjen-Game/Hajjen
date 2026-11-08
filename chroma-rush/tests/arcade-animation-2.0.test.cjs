const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {EffectLanguage,MAX_EFFECTS,CUES}=
  require('../src/render/effect-language.js');
const {GAME}=require('../src/core/config.js');
function recorder(){
  const out={lines:[],strokes:0,fills:0,saves:0};
  const ctx={
    save(){out.saves++},restore(){},beginPath(){this._start=null},
    moveTo(x,y){this._start=[x,y]},
    lineTo(x,y){out.lines.push([this._start,[x,y]])},
    stroke(){out.strokes++},fill(){out.fills++},
    arc(){throw Error('Animation Language 2.0 must not use rings')},
    ellipse(){throw Error('Animation Language 2.0 must not use ellipses')},
    fillRect(){throw Error('Cue graphics must not flash an overlay')}
  };
  return {ctx,out};
}
const C1='#38efff',C2='#e877ff';
function draw(kind,{quality={glow:1,density:1},age=.1,speed=780}={}){
  const fx=new EffectLanguage(),p=recorder();
  assert.equal(fx.cue(kind,260,500,C1,C2,{speed}),true);
  fx.tick(age);fx.draw(p.ctx,quality);
  return {fx,...p};
}
test('9 clear events, each with a unique bound lifetime and cooldown',()=>{
  assert.deepEqual(Object.keys(CUES).sort(),
    ['jump','echo','land','duck','release','precision','combo','speed','perfect'].sort());
  assert.ok(Object.values(CUES).every(x=>x.life>=.20&&x.life<=.75));
  assert.ok(Object.values(CUES).every(x=>x.cooldown>=.08&&x.cooldown<=.85));
});
test('every cue renders as straight strokes, no circles or full-screen flash',()=>{
  for(const kind of Object.keys(CUES)){
    const {out}=draw(kind);
    assert.ok(out.lines.length>=2,kind);
    assert.ok(out.strokes>=1,kind);
    assert.equal(out.fills,0,kind);
    assert.ok(out.lines.every(([a,b])=>a.every(Number.isFinite)&&b.every(Number.isFinite)));
  }
});
test('jump, duck, speed, precision and perfect draw strictly behind player',()=>{
  for(const kind of ['jump','duck','release','speed','precision','perfect']){
    const {out}=draw(kind);
    assert.ok(out.lines.every(([a,b])=>a[0]<=260&&b[0]<=260),
      kind+' must not mask an incoming obstacle');
  }
});
test('land spreads on the ground plane and has shorter time than perfect-zone cue',()=>{
  const {out}=draw('land',{age:.12});
  assert.ok(out.lines.every(([a,b])=>Math.abs(a[1]-b[1])<.01));
  assert.ok(CUES.land.life<CUES.perfect.life);
});
test('animation geometry respects actual speed and gets longer as speed increases',()=>{
  const quick=draw('speed',{speed:800}).out;
  const fast=draw('speed',{speed:1950}).out;
  const reach=out=>Math.max(...out.lines.map(([a,b])=>Math.abs(a[0]-b[0])));
  assert.ok(reach(fast)>reach(quick));
});
test('graphics presets reduce energy stroke count, but important cues remain visible',()=>{
  for(const kind of ['jump','precision','speed','perfect']){
    const high=draw(kind,{quality:{density:1,glow:1}}).out.strokes;
    const low=draw(kind,{quality:{density:.36,glow:.24}}).out.strokes;
    assert.ok(high>=low,kind);
    assert.ok(low>=2,kind);
  }
});
test('reduced motion skips new cues but retains existing gameplay state',()=>{
  const fx=new EffectLanguage();
  assert.equal(fx.cue('precision',260,500,C1,C2,{reducedMotion:true}),false);
  assert.equal(fx.active.length,0);
  assert.equal(fx.cue('land',260,500,C1,C2),true);
  const {ctx,out}=recorder();
  fx.draw(ctx,{reducedMotion:true});
  assert.equal(out.strokes,0);
});
test('cooldowns avoid duplicate celebrations on simultaneous precision clears',()=>{
  const fx=new EffectLanguage();
  assert.equal(fx.cue('precision',250,470,C1,C2),true);
  assert.equal(fx.cue('precision',250,470,C1,C2),false);
  assert.equal(fx.active.length,1);
  fx.tick(.15);
  assert.equal(fx.cue('precision',250,470,C1,C2),false);
  fx.tick(.06);
  assert.equal(fx.cue('precision',250,470,C1,C2),true);
  assert.equal(fx.active.filter(e=>e.kind==='cue-precision').length,2);
});
test('bounded pool evicts lower-priority cues before critical precision',()=>{
  const fx=new EffectLanguage();
  for(let i=0;i<MAX_EFFECTS;i++)fx.ground(i,500,C1);
  assert.equal(fx.active.length,MAX_EFFECTS);
  assert.equal(fx.cue('precision',260,470,C1,C2),true);
  assert.equal(fx.active.length,MAX_EFFECTS);
  assert.ok(fx.active.some(e=>e.kind==='cue-precision'));
  fx.tick(1);
  assert.equal(fx.active.length,0);
  fx.reset();
  assert.equal(Object.keys(fx.cooldowns).length,0);
});
test('existing ground and bracket cues still work with new animation grammar',()=>{
  const fx=new EffectLanguage(),r=recorder();
  fx.ground(250,515,C1);fx.frame(250,485,C2);
  fx.cue('jump',250,515,C1,C2);
  fx.draw(r.ctx,{density:.36,glow:.24});
  assert.ok(r.out.strokes>=3);
});
test('fixed-step time deterministically advances/expunges effects across frame divisions',()=>{
  const a=new EffectLanguage(),b=new EffectLanguage();
  a.cue('speed',250,515,C1,C2);b.cue('speed',250,515,C1,C2);
  a.tick(.25);
  for(let i=0;i<15;i++)b.tick(1/60);
  assert.ok(Math.abs(a.active[0].age-b.active[0].age)<1e-10);
  a.tick(.45);b.tick(.45);
  assert.equal(a.active.length,0);assert.equal(b.active.length,0);
});
test('game triggers on real physics, timing and obstacle-clear events, not simulated buttons',()=>{
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  for(const kind of Object.keys(CUES))assert.ok(game.includes("effects.cue('"+kind+"'"),kind);
  const precision=game.indexOf("effects.cue('precision'");
  const nearMiss=game.indexOf('director.registerNearMiss()');
  assert.ok(nearMiss>=0&&precision>nearMiss);
  assert.match(game,/SPEED_MARKS=Object\.freeze\(\[1\.5,2,3,4,6,8\]\)/);
  assert.match(game,/nextSpeedMark\+\+/);
  assert.equal(GAME.jumpVelocity,-870);
  assert.equal(GAME.gravity,2140);
});
test('engine effects module loads before game, uses new version marker and no RNG',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/name="chroma-build" content="original-background-restored-1\.0-chroma-pulse-1\.0-gravity-1\.0-ceiling-sync-1\.0-movement-1\.0-duck-gate-1\.0-echo-spire-1\.0-aware-1\.0-fairness-1\.0-jump-visual-1\.0-combo-1\.0-speed-curve-2\.0-echo-polish-1\.1-echo-zone2-1\.2-no-scout-1\.1-tide-2\.0-spectacle-1\.0-dash-2\.5-shield-core-1\.0-dash-hazards-1\.0"/);
  const i=html.indexOf('src/render/effect-language.js?v=arcade-animation-2.0');
  const j=html.indexOf('src/gameplay/game.js?v=arcade-animation-2.0');
  assert.ok(i>=0&&j>i);
  assert.match(html,/LATEST UPDATE · DASH CHALLENGE 1\.0/);
  const s=fs.readFileSync(path.join(__dirname,'../src/render/effect-language.js'),'utf8');
  assert.doesNotMatch(s,/Math\.random|setTimeout|setInterval|createRadialGradient|ellipse\(/);
});
