const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname,'..');
const director = require('../src/director/adaptive-director.js');
const movementAwareness=require('../src/director/movement-awareness.js');
const highSpeedFairness=require('../src/director/high-speed-fairness.js');
const config = require('../src/core/config.js');
const geometry = require('../src/core/geometry.js');
const hud = require('../src/ui/hud.js');
const flow = require('../src/gameplay/flow.js');
const audio = require('../src/audio/reactive-audio.js');
const progression = require('../src/progression/arcade-progress.js');
const arcadeUI = require('../src/ui/arcade-ui.js');
const terrain = require('../src/terrain/terrain-system.js');
const jump = require('../src/gameplay/jump-controller.js');
const motion = require('../src/render/player-motion.js');
const effects = require('../src/render/effect-language.js');
const terrainRender = require('../src/render/terrain-renderer.js');
const worldBackground = require('../src/render/world-background.js');
const spectralWave = require('../src/render/spectral-wave.js');
const chromaVfx = require('../src/render/chroma-state-vfx.js');
const speedTrails = require('../src/render/speed-trails.js');
const gravityShift = require('../src/gameplay/gravity-shift.js');
const runAudit = require('../src/diagnostics/round-audit.js');
const unified = require('../src/director/unified-terrain-director.js');
const perf = require('../src/performance/quality-manager.js');
const clock = require('../src/performance/frame-clock.js');
const mobilePreferences = require('../src/ui/mobile-preferences.js');
const replay = require('../src/progression/replay-challenge.js');
const replayUI = require('../src/ui/replay-ui.js');

function setup(initialStorage={}) {
  const objects=new Map();
  function get(id){
    if(!objects.has(id)) {
      const events={};const classes=new Set(['hidden']);
      objects.set(id, {id, textContent:'',style:{},dataset:{}, setAttribute(name,value){this[name]=value},clientWidth:1280,clientHeight:720,
        classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle:(k,val)=>val?classes.add(k):classes.delete(k)},
        addEventListener:(name,fn)=>{(events[name]??=[]).push(fn)},
        click(){for(const fn of events.click??[])fn()},setPointerCapture(){},
        events});
    }
    return objects.get(id);
  }
  const draw={fillRect(){},strokeRect(){},setTransform(){},save(){},restore(){},translate(){},scale(){},
    beginPath(){},clip(){},moveTo(){},lineTo(){},arcTo(){},closePath(){},fill(){},stroke(){},arc(){},ellipse(){},fillText(){},
    createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}};
  get('game').getContext=()=>draw;
  let requested;
  const local={...initialStorage};
  const windowEvents={};
  const world={ChromaDirector:director,ChromaMovementAwareness:movementAwareness,ChromaHighSpeedFairness:highSpeedFairness,ChromaConfig:config,ChromaGeometry:geometry,ChromaHud:hud,ChromaFlow:flow,ChromaAudio:audio,ChromaProgress:progression,ChromaArcadeUI:arcadeUI,ChromaTerrain:terrain,ChromaJump:jump,ChromaMotion:motion,ChromaEffects:effects,ChromaTerrainRender:terrainRender,ChromaWorldBackground:worldBackground,ChromaSpectralWave:spectralWave,ChromaStateVFX:chromaVfx,ChromaSpeedTrails:speedTrails,ChromaGravityShift:gravityShift,ChromaRoundAudit:runAudit,ChromaUnifiedTerrainDirector:unified,ChromaQuality:perf,ChromaFrameClock:clock,ChromaMobilePreferences:mobilePreferences,ChromaReplay:replay,ChromaReplayUI:replayUI,devicePixelRatio:1,
    addEventListener:(name,fn)=>{(windowEvents[name]??=[]).push(fn)},setTimeout(){},
    AudioContext:undefined};
  const document={getElementById:get,addEventListener(){},hidden:false};
  const context=vm.createContext({window:world,document,navigator:{},localStorage:{getItem:k=>local[k],setItem:(k,v)=>local[k]=v},
    requestAnimationFrame:f=>{requested=f},performance:{now:()=>0},setTimeout:()=>{},Math,console});
  const gameCode=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const ending='  requestAnimationFrame(frame);\n})();';
  assert.ok(gameCode.includes(ending));
  vm.runInContext(gameCode.replace(ending,
    "  window.__gravityHarness={gravityShift,terrain,terrainDirector,director,chromaVfx,effects,jumpControl,motion,hurdles:()=>hurdles,hp:()=>hp,player:()=>player,render:draw,zone:()=>zone};\\n".replace('\\n','\n')+ending),
    context,{filename:'game.js'});
  return {get,local,step:(time)=>{assert.ok(requested);requested(time)},context,
    fireWindow:(type,event)=>{for(const fn of windowEvents[type]??[])fn(event)}};
}

test('game initializes, starts, advances zones and updates HUD without runtime exceptions',()=>{
  const g=setup();
  g.step(0);g.get('start-btn').click();
  assert.ok(!g.get('hud').classList.contains('hidden'));
  for(let i=1;i<=1300;i++)g.step(i*16.667);
  assert.match(g.get('zone-display').textContent,/ZONE 0[1-9]/);
  assert.match(g.get('speed-display').textContent,/SPEED \d+\.\d+×/);
  assert.ok(+g.get('hp-number').textContent<=100);
  assert.match(g.get('flow-number').textContent,/^\d+%$/);
  assert.match(g.get('flow-multiplier').textContent,/^\d+(?:\.\d+)?×$/);
});

function duckHarness(){
  const game=setup();let ms=0,pointer=9;
  game.step(0);game.get('start-btn').click();
  return {game,
    advance(frames){for(let i=0;i<frames;i++){ms+=1000/60;game.step(ms)}},
    press(){const id=++pointer;for(const fn of game.get('duck-btn').events.pointerdown??[])fn({pointerId:id,preventDefault(){}});return id},
    release(id){for(const fn of game.get('duck-btn').events.pointerup??[])fn({pointerId:id})},
    active(){return game.get('duck-btn').classList.contains('is-down')},
    keydown(code,repeat=false){game.fireWindow('keydown',{code,repeat,preventDefault(){}})},
    keyup(code){game.fireWindow('keyup',{code})}
  };
}

test('duck tap is a fixed-duration action even if touch stays held',()=>{
  const h=duckHarness();
  const pointer=h.press();assert.equal(h.active(),true);
  h.advance(20);assert.equal(h.active(),true);
  h.advance(20);assert.equal(h.active(),false);
  // No automatic re-duck even when the pointer remains captured/held.
  h.advance(40);assert.equal(h.active(),false);
  h.release(pointer);
  const second=h.press();assert.equal(h.active(),true);
  // Releasing immediately must not cancel the pulse early.
  h.release(second);h.advance(5);assert.equal(h.active(),true);
  h.advance(30);assert.equal(h.active(),false);
});

test('duck has a short recovery and cannot be spammed continuously',()=>{
  const h=duckHarness();
  const first=h.press();h.release(first);
  h.advance(34);assert.equal(h.active(),false);
  const second=h.press();h.release(second);assert.equal(h.active(),false);
  h.advance(9);
  const third=h.press();h.release(third);assert.equal(h.active(),true);
});

test('keyboard hold and key repeat never extend duck; a new keypress works after release',()=>{
  const h=duckHarness();
  h.keydown('ArrowDown');assert.equal(h.active(),true);
  h.advance(35);assert.equal(h.active(),false);
  h.keydown('ArrowDown',true);h.advance(20);assert.equal(h.active(),false);
  h.keyup('ArrowDown');h.keydown('ArrowDown');assert.equal(h.active(),true);
  h.keyup('ArrowDown');
});

test('airborne duck input is not queued for landing',()=>{
  const h=duckHarness();
  h.keydown('Space');
  const p=h.press();assert.equal(h.active(),false);
  h.advance(56);assert.equal(h.active(),false);
  h.release(p);
  const p2=h.press();assert.equal(h.active(),true);
  h.release(p2);
});

test('sound toggle works during play and pause without an AudioContext',()=>{
  const g=setup();g.step(0);g.get('start-btn').click();
  const button=g.get('sound-btn');
  assert.equal(button['aria-pressed'],'true');
  button.click();assert.equal(button['aria-pressed'],'false');
  button.click();assert.equal(button['aria-pressed'],'true');
  g.get('pause-btn').click();
  assert.ok(!g.get('pause-menu').classList.contains('hidden'));
  g.get('resume-btn').click();
  assert.ok(g.get('pause-menu').classList.contains('hidden'));
  for(let i=1;i<=90;i++)g.step(i*16.667);
  assert.ok(g.get('flow-number').textContent.endsWith('%'));
});

test('arcade menu displays records and the milestone gallery can be opened and closed',()=>{
  const g=setup({chromaRushBestFlow1:'8200'});g.step(0);
  assert.equal(g.get('record-score').textContent,'8,200');
  assert.equal(g.get('practice-start-btn').disabled,true);
  g.get('milestone-view-btn').click();
  assert.ok(g.get('menu').classList.contains('hidden'));
  assert.ok(!g.get('milestone-panel').classList.contains('hidden'));
  assert.match(g.get('milestone-grid').innerHTML,/IGNITION/);
  g.get('milestone-back-btn').click();
  assert.ok(!g.get('menu').classList.contains('hidden'));
});

test('practice starts at unlocked zone speed, is marked unranked and never writes records',()=>{
  const profile={bestScore:3800,bestZone:6,bestStreak:11,perfectZones:2,completedRuns:2};
  const stored=JSON.stringify(profile);
  const g=setup({chromaRushArcadeV1:stored,chromaRushBestFlow1:'3800'});
  g.step(0);
  assert.equal(g.get('practice-start-btn').disabled,false);
  assert.match(g.get('practice-zone').innerHTML,/ZONE 06/);
  g.get('practice-zone').value='5';
  g.get('practice-start-btn').click();
  assert.equal(g.get('zone-display').textContent,'ZONE 05');
  assert.equal(g.get('mode-indicator').classList.contains('hidden'),false);
  assert.match(g.get('mode-indicator').textContent,/PRACTICE/);
  assert.notEqual(g.get('speed-display').textContent,'SPEED 1.00×');
  for(let i=1;i<=950;i++)g.step(i*16.667);
  assert.equal(g.local.chromaRushArcadeV1,stored);
  assert.equal(g.local.chromaRushBestFlow1,'3800');
  g.get('pause-btn').click();g.get('menu-paused-btn').click();
  assert.equal(g.get('milestone-panel').classList.contains('hidden'),true);
  assert.equal(g.get('menu').classList.contains('hidden'),false);
  assert.equal(g.get('record-zone').textContent,'06');
  assert.equal(g.get('record-streak').textContent,'11');
});

test('arcade run can return to menu and resets to zone 01 without practice tag',()=>{
  const g=setup({chromaRushArcadeV1:JSON.stringify({bestZone:4})});
  g.step(0);g.get('start-btn').click();
  assert.equal(g.get('zone-display').textContent,'ZONE 01');
  assert.equal(g.get('mode-indicator').classList.contains('hidden'),true);
  g.get('pause-btn').click();g.get('menu-paused-btn').click();
  assert.equal(g.get('menu').classList.contains('hidden'),false);
});


test('graphics picker stores a rendering mode and changes backing pixels only',()=>{
 const g=setup({chromaRushGraphicsV1:'high'});g.step(0);
 const canvas=g.get('game'),original=canvas.width;
 assert.ok(original>0);
 assert.equal(g.get('graphics-mode').value,'high');
 g.get('graphics-mode').value='performance';
 for(const fn of g.get('graphics-mode').events.change??[])fn();
 assert.equal(g.local.chromaRushGraphicsV1,'performance');
 assert.ok(canvas.width<original,'render backing pixel width should change');
 assert.equal(g.get('graphics-active').textContent,'PERFORMANCE · PERFORMANCE');
 g.get('start-btn').click();
 assert.equal(g.get('graphics-btn').classList.contains('hidden'),true);
 for(let i=1;i<100;i++)g.step(i*16.667);
 assert.equal(g.get('zone-display').textContent,'ZONE 01');
});

test('settings panel persists independent audio and vibration options without changing game rules',()=>{
 const g=setup();g.step(0);
 g.get('graphics-btn').click();
 assert.equal(g.get('graphics-panel').classList.contains('hidden'),false);
 const music=g.get('music-enabled'),fx=g.get('effects-enabled'),haptic=g.get('haptics-enabled');
 music.checked=false;for(const cb of music.events.change??[])cb();
 fx.checked=false;for(const cb of fx.events.change??[])cb();
 haptic.checked=false;for(const cb of haptic.events.change??[])cb();
 g.get('effects-volume').value='35';for(const cb of g.get('effects-volume').events.input??[])cb();
 const saved=JSON.parse(g.local.chromaRushMobilePolishV1);
 assert.equal(saved.music,false);assert.equal(saved.effects,false);assert.equal(saved.haptics,false);
 assert.equal(saved.effectsVolume,35);
 assert.equal(g.get('effects-volume-value').textContent,'35%');
 g.get('start-btn').click();
 for(let i=1;i<200;i++)g.step(i*16.667);
 assert.match(g.get('zone-display').textContent,/ZONE/);
 assert.ok(g.get('run-launch').classList.contains('run-launch-active'));
});

test('dual-thumb input is pointer-id aware and a second jump pointer cannot cancel first',()=>{
 const h=duckHarness(),jump=h.game.get('jump-btn');
 const d=h.press();
 const down={pointerId:88,preventDefault(){}};
 for(const cb of jump.events.pointerdown??[])cb(down);
 assert.ok(jump.classList.contains('is-down'));
 for(const cb of jump.events.pointerdown??[])cb({pointerId:89,preventDefault(){}});
 for(const cb of jump.events.pointerup??[])cb({pointerId:89});
 assert.ok(jump.classList.contains('is-down'));
 for(const cb of jump.events.pointerup??[])cb({pointerId:88});
 assert.equal(jump.classList.contains('is-down'),false);
 assert.equal(h.active(),true);
 h.release(d);h.advance(40);
 assert.equal(h.active(),false);
});

test('fullscreen button degrades gracefully when browser lacks fullscreen API',()=>{
 const g=setup();g.step(0);g.get('graphics-btn').click();
 assert.equal(g.get('fullscreen-btn').disabled,true);
 assert.match(g.get('fullscreen-status').textContent,/not available/);
 g.get('fullscreen-btn').click();
 assert.equal(g.get('fullscreen-btn').disabled,true);
});

test('replay PB HUD survives a paused restart without writing stats',()=>{
 const prior=JSON.stringify({bestScore:1500,bestZone:4,bestStreak:3,perfectZones:0,completedRuns:1});
 const g=setup({chromaRushArcadeV1:prior,chromaRushReplayV1:JSON.stringify({bestDistance:13000})});
 g.step(0);g.get('start-btn').click();
 assert.equal(g.get('replay-progress').classList.contains('hidden'),false);
 assert.match(g.get('replay-target').textContent,/PB 1,500/);
 for(let i=1;i<=60;i++)g.step(i*16.667);
 g.get('pause-btn').click();g.get('restart-paused-btn').click();
 assert.match(g.get('replay-target').textContent,/PB 1,500/);
 assert.equal(g.local.chromaRushArcadeV1,prior);
});


test('actual zone 3 turns the course onto the ceiling and zone 5 restores the floor',()=>{
  const g=setup();g.step(0);g.get('start-btn').click();
  const state=g.context.window.__gravityHarness;
  assert.ok(state);
  // No random hazards/gaps: isolate gravity timing in the real game loop.
  state.director.tick=()=>{};
  state.terrain.segments=[{type:'flat',start:0,end:10000000,y0:515,y1:515}];
  state.terrain.gaps=[];state.terrain.generated=10000000;
  for(let i=1;i<=1620;i++)g.step(i*1000/60);
  assert.equal(state.zone(),3);
  assert.equal(state.gravityShift.ceiling,true,'zone 3 must be a real ceiling run');
  assert.equal(state.gravityShift.phase,'idle');
  for(let i=1621;i<=3150;i++)g.step(i*1000/60);
  assert.equal(state.zone(),5);
  assert.equal(state.gravityShift.ceiling,false,'zone 5 must return to floor');
  assert.equal(state.gravityShift.count,2);
});

test('ceiling Chroma State retains one canvas mirror for cube, corner FX, dust and ground contact',()=>{
  const g=setup(),state=g.context.window.__gravityHarness;
  g.step(0);g.get('start-btn').click();
  // Reproduce the screenshot: ceiling running with Chroma Flow's player wake active.
  state.gravityShift.ceiling=true;
  state.chromaVfx.setActive(true);state.chromaVfx.tick(.5);
  const ctx=g.get('game').getContext(),stack=[];
  let sy=1,ty=0;
  ctx.setTransform=(_a,_b,_c,d,_e,f)=>{sy=d;ty=f};
  ctx.save=()=>{stack.push([sy,ty])};
  ctx.restore=()=>{assert.ok(stack.length>0,'unbalanced canvas restore');[sy,ty]=stack.pop()};
  ctx.translate=(_x,y)=>{ty+=sy*y};
  ctx.scale=(_x,y)=>{sy*=y};
  const observed={};
  const behind=state.chromaVfx.drawBehindPlayer.bind(state.chromaVfx);
  state.chromaVfx.drawBehindPlayer=(canvas,args)=>{
    observed.before=sy;const count=stack.length;
    behind(canvas,args);
    observed.afterBehind=sy;
    assert.equal(stack.length,count,'Chroma behind-player FX must own its save/restore');
  };
  const after=state.chromaVfx.drawAfterPlayer.bind(state.chromaVfx);
  state.chromaVfx.drawAfterPlayer=(canvas,args)=>{
    observed.afterPlayer=sy;
    after(canvas,args);
  };
  const fx=state.effects.draw.bind(state.effects);
  state.effects.draw=(canvas,args)=>{observed.particles=sy;fx(canvas,args)};
  const overlay=state.gravityShift.drawOverlay.bind(state.gravityShift);
  state.gravityShift.drawOverlay=(canvas,args)=>{observed.hud=sy;overlay(canvas,args)};
  state.render();
  assert.equal(observed.before,-1,'course is mirrored onto the ceiling');
  assert.equal(observed.afterBehind,-1,'player wake must not cancel ceiling mirror');
  assert.equal(observed.afterPlayer,-1,'post-player brackets use ceiling position');
  assert.equal(observed.particles,-1,'gameplay dust and cue geometry follow the cube');
  assert.equal(observed.hud,1,'upright gravity HUD is not mirrored');
  assert.equal(stack.length,0,'all render-state frames return to baseline');
  assert.equal(sy,1);
  // Round-trip back to the floor with exactly the same draw-state integrity.
  state.gravityShift.ceiling=false;
  observed.before=undefined;state.render();
  assert.equal(observed.before,1);
  assert.equal(observed.afterPlayer,1);
  assert.equal(observed.particles,1);
  assert.equal(stack.length,0);
});

test('real arcade loop introduces Echo Jump in zone 2, allows one new press and keeps ceiling mirror',()=>{
  const g=setup(),state=g.context.window.__gravityHarness;
  g.step(0);g.get('start-btn').click();
  // Same safe level geometry at either quality. Isolate the new input semantics.
  state.director.tick=()=>{};
  state.terrain.segments=[{type:'flat',start:0,end:10000000,y0:515,y1:515}];
  state.terrain.gaps=[];state.terrain.generated=10000000;
  for(let i=1;i<=733;i++)g.step(i*1000/60);
  assert.equal(state.zone(),2,'Echo ability must be introduced early');
  assert.equal(g.get('jump-btn')['aria-label'],
    'Jump; tap again in the air for Echo Jump');
  const jump=g.get('jump-btn');
  const tap=(id)=>{
    for(const cb of jump.events.pointerdown??[])cb({pointerId:id,preventDefault(){}});
    for(const cb of jump.events.pointerup??[])cb({pointerId:id});
  };
  tap(31);assert.equal(state.jumpControl.echoAvailable,true);
  for(let i=734;i<=742;i++)g.step(i*1000/60);
  tap(32);
  assert.equal(state.jumpControl.echoUsed,true);
  assert.equal(state.jumpControl.echoAvailable,false);
  assert.ok(state.player().vy<=config.GAME.echoJumpVelocity);
  assert.ok(state.player().vy>=config.GAME.jumpVelocity);
  tap(33);
  assert.equal(state.jumpControl.echoUsed,true,'no third airborne impulse');
  // The physics remain canonical while gravity mirror is active.
  state.gravityShift.ceiling=true;
  assert.doesNotThrow(()=>state.render());
  // Return to the floor and verify no permanent orientation/audio side effects.
  state.gravityShift.ceiling=false;
  assert.doesNotThrow(()=>state.render());
});

test('real zone-4 PEAK introduces a standalone Echo Spire: single jump fails, Echo Jump clears',()=>{
  function play({secondJump=false,ceiling=false}={}){
    const g=setup({chromaRushArcadeV1:JSON.stringify({bestZone:6,bestScore:1800})});
    g.step(0);g.get('practice-zone').value='4';g.get('practice-start-btn').click();
    const state=g.context.window.__gravityHarness;
    assert.equal(state.zone(),4);
    state.terrain.segments=[{type:'flat',start:0,end:10000000,y0:515,y1:515}];
    state.terrain.gaps=[];state.terrain.generated=10000000;
    state.director.phase='PEAK';state.director.phaseDuration=6;state.director.phaseElapsed=0;
    state.director.spawnCountdown=0;state.director.stress=0;state.director.confidence=.85;
    if(ceiling)state.gravityShift.ceiling=true;
    g.step(1000/60);
    const first=state.hurdles()[0];
    assert.ok(first,'Director must introduce a visible obstacle');
    assert.equal(first.type,'echo','safe first encounter is a double-jump pillar');
    assert.equal(state.director.echoIntroduced,true);
    const tap=id=>{
      for(const fn of g.get('jump-btn').events.pointerdown??[])fn({pointerId:id,preventDefault(){}});
      for(const fn of g.get('jump-btn').events.pointerup??[])fn({pointerId:id});
    };
    for(let i=2;i<=114;i++){
      // The obstacle starts ~1.25s ahead. Launch ~.7s before arrival,
      // then use the second impulse ~.32s after first takeoff.
      if(i===33)tap(61);
      if(i===53&&secondJump)tap(62);
      g.step(i*1000/60);
    }
    assert.equal(first.cleared,true);
    return {hit:first.hit,hp:state.hp(),echoUsed:state.jumpControl.echoUsed,
      introduced:state.director.echoIntroduced};
  }
  const ordinary=play(),echo=play({secondJump:true}),ceiling=play({secondJump:true,ceiling:true});
  assert.equal(ordinary.hit,true,'one jump cannot cross a real Echo Spire');
  assert.ok(ordinary.hp<100);
  assert.equal(echo.hit,false,'two correctly timed jumps must clear');
  assert.equal(echo.hp,100);
  assert.equal(ceiling.hit,false,'same valid double jump works under inverted gravity');
  assert.equal(ceiling.hp,100);
});
