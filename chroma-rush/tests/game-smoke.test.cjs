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
const precisionCombo=require('../src/gameplay/precision-combo.js');
const audio = require('../src/audio/reactive-audio.js');
const progression = require('../src/progression/arcade-progress.js');
const arcadeUI = require('../src/ui/arcade-ui.js');
const terrain = require('../src/terrain/terrain-system.js');
const jump = require('../src/gameplay/jump-controller.js');
const dashModule = require('../src/gameplay/contextual-dash.js');
const shieldCore = require('../src/gameplay/shield-core.js');
const dashHazards=require('../src/gameplay/dash-hazards.js');
const obstacleBalance=require('../src/gameplay/obstacle-balance.js');
const shieldCoreRender = require('../src/render/shield-core-renderer.js');
const motion = require('../src/render/player-motion.js');
const effects = require('../src/render/effect-language.js');
const terrainRender = require('../src/render/terrain-renderer.js');
const worldBackground = require('../src/render/world-background.js');
const spectralWave = require('../src/render/spectral-wave.js');
const chromaVfx = require('../src/render/chroma-state-vfx.js');
const speedTrails = require('../src/render/speed-trails.js');
const identity = require('../src/render/chroma-identity.js');
const gravityShift = require('../src/gameplay/gravity-shift.js');
const adaptiveCamera = require('../src/camera/adaptive-camera.js');
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
  const rotations=[],bends=[];
  const draw={fillRect(){},strokeRect(){},setTransform(){},save(){},restore(){},translate(){},rotate(angle){rotations.push(angle)},scale(){},
    beginPath(){},clip(){},moveTo(){},lineTo(){},arcTo(){},quadraticCurveTo(){},
    bezierCurveTo(...points){bends.push(points)},closePath(){},fill(){},stroke(){},arc(){},ellipse(){},fillText(){},
    createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}};
  get('game').getContext=()=>draw;
  let requested;
  const local={...initialStorage};
  const windowEvents={};
  const world={ChromaDirector:director,ChromaMovementAwareness:movementAwareness,ChromaHighSpeedFairness:highSpeedFairness,ChromaConfig:config,ChromaGeometry:geometry,ChromaHud:hud,ChromaFlow:flow,ChromaPrecisionCombo:precisionCombo,ChromaAudio:audio,ChromaProgress:progression,ChromaArcadeUI:arcadeUI,ChromaTerrain:terrain,ChromaJump:jump,ChromaDash:dashModule,ChromaShieldCore:shieldCore,ChromaShieldCoreRender:shieldCoreRender,ChromaDashHazards:dashHazards,ChromaObstacleBalance:obstacleBalance,ChromaMotion:motion,ChromaEffects:effects,ChromaTerrainRender:terrainRender,ChromaWorldBackground:worldBackground,ChromaSpectralWave:spectralWave,ChromaStateVFX:chromaVfx,ChromaSpeedTrails:speedTrails,ChromaIdentity:identity,ChromaGravityShift:gravityShift,ChromaAdaptiveCamera:adaptiveCamera,ChromaRoundAudit:runAudit,ChromaUnifiedTerrainDirector:unified,ChromaQuality:perf,ChromaFrameClock:clock,ChromaMobilePreferences:mobilePreferences,ChromaReplay:replay,ChromaReplayUI:replayUI,devicePixelRatio:1,
    addEventListener:(name,fn)=>{(windowEvents[name]??=[]).push(fn)},setTimeout(){},
    AudioContext:undefined};
  const document={getElementById:get,addEventListener(){},hidden:false};
  const context=vm.createContext({window:world,document,navigator:{},localStorage:{getItem:k=>local[k],setItem:(k,v)=>local[k]=v},
    requestAnimationFrame:f=>{requested=f},performance:{now:()=>0},setTimeout:()=>{},Math,console});
  const gameCode=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const ending='  requestAnimationFrame(frame);\n})();';
  assert.ok(gameCode.includes(ending));
  vm.runInContext(gameCode.replace(ending,
    "  window.__gravityHarness={gravityShift,camera,terrain,terrainDirector,director,chromaVfx,effects,jumpControl,dash,shieldCores,DASH_HAZARDS,runAudit,motion,spectralWave,combo,flow,comboAward:awardCombo,score:()=>score,distance:()=>distance,forceZone:z=>{zone=z;time=(z-1)*GAME.zoneSeconds},hurdles:()=>hurdles,testSpawn:spawn,lastPlaced:()=>lastPlacedHazard,speed:()=>speed,hp:()=>hp,setHP:n=>{hp=n},player:()=>player,render:draw,zone:()=>zone};\\n".replace('\\n','\n')+ending),
    context,{filename:'game.js'});
  return {get,local,rotations,bends,step:(time)=>{assert.ok(requested);requested(time)},context,
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


test('contextual dash consumes one distinct press and actually moves world further',()=>{
  const h=duckHarness(),g=h.game.context.window.__gravityHarness;
  g.forceZone(4);
  // Ground: first press ducks, second press during the pulse dashes forward.
  const first=h.press();h.release(first);h.advance(5);
  assert.equal(g.dash.groundCount,0);
  const second=h.press();h.release(second);
  assert.equal(g.dash.groundCount,1);
  const before=g.distance();h.advance(6);
  assert.ok(g.distance()-before>6*370/60,'dash adds world-space displacement');
  assert.equal(g.dash.groundCount,1);
  // Let the duck and recovery finish, then launch into a safe air dash.
  h.advance(55);
  const jump=h.game.get('jump-btn');
  const jpress={pointerId:971,preventDefault(){}};
  for(const cb of jump.events.pointerdown??[])cb(jpress);
  for(const cb of jump.events.pointerup??[])cb(jpress);
  h.advance(5);
  assert.equal(g.player().landed,false);
  const air=h.press();h.release(air);
  assert.equal(g.dash.airCount,1);
  const repeated=h.press();h.release(repeated);
  assert.equal(g.dash.airCount,1,'cannot gain a second dash in one flight');
});

test('dash is cancelled on pause and never extends a held duck automatically',()=>{
  const h=duckHarness(),g=h.game.context.window.__gravityHarness;
  g.forceZone(4);
  const first=h.press();h.release(first);const second=h.press();
  assert.equal(g.dash.groundCount,1);
  h.advance(25);
  assert.equal(g.dash.groundCount,1);
  h.game.get('pause-btn').click();
  assert.equal(g.dash.active,false);
  h.release(second);
  h.game.get('resume-btn').click();
  h.advance(15);
  assert.equal(g.dash.groundCount,1);
});


test('zone 1: real touch taps trigger ground and air dashes, and audit records both',()=>{
  const h=duckHarness(),g=h.game.context.window.__gravityHarness;
  // No artificial zone advance: these interactions MUST work from launch.
  const first=h.press();h.release(first);
  assert.equal(g.player().duck,true);
  const second=h.press();h.release(second);
  assert.equal(g.dash.groundCount,1);
  assert.equal(g.runAudit.summary.movement.groundDashes,1);
  assert.equal(g.runAudit.summary.movement.duckPresses,2);
  h.advance(65);
  const before=g.dash.travel;
  const jump=h.game.get('jump-btn');
  for(const fn of jump.events.pointerdown??[])fn({pointerId:701,preventDefault(){}});
  for(const fn of jump.events.pointerup??[])fn({pointerId:701});
  assert.equal(g.player().landed,false);
  const air=h.press();h.release(air);
  assert.equal(g.dash.airCount,1);
  h.advance(8);
  assert.ok(g.dash.travel>before);
  assert.equal(g.runAudit.summary.movement.airDashes,1);
  assert.equal(g.runAudit.summary.movement.echoJumps,0);
  assert.equal(g.runAudit.snapshot().build,'core-pace-gravity-1.1');
});

test('fast double-tap is buffered, then truly launches the second impulse',()=>{
  const h=duckHarness(),g=h.game.context.window.__gravityHarness;
  g.forceZone(2);
  const jump=h.game.get('jump-btn');
  const tap=id=>{
    for(const fn of jump.events.pointerdown??[])fn({pointerId:id,preventDefault(){}});
    for(const fn of jump.events.pointerup??[])fn({pointerId:id});
  };
  tap(711);
  assert.equal(g.player().vy,-870);
  tap(712); // same simulation frame; previously was silently ignored
  assert.equal(g.jumpControl.pendingEcho,true);
  assert.equal(g.runAudit.summary.movement.echoJumps,0);
  h.advance(7);
  assert.equal(g.jumpControl.echoUsed,true);
  assert.equal(g.jumpControl.pendingEcho,false);
  assert.equal(g.runAudit.summary.movement.echoJumps,1);
  assert.ok(g.player().vy<-650,'buffered second beat creates a REAL upward impulse');
  const jumps=g.runAudit.events.filter(x=>x.type==='jump_input');
  assert.equal(jumps[0].action,'jump');
  assert.equal(jumps[1].action,'echo-buffered');
  tap(713);
  assert.equal(g.runAudit.summary.movement.echoJumps,1,'third tap cannot add Echo');
});

test('global pointer release clears stale touch capture before rapid second press',()=>{
  const h=duckHarness(),g=h.game.context.window.__gravityHarness;
  const first=h.press();
  h.game.fireWindow('pointerup',{pointerId:first});
  const second=h.press();
  assert.equal(g.dash.groundCount,1);
  h.game.fireWindow('pointercancel',{pointerId:second});
  assert.equal(g.runAudit.summary.movement.duckPresses,2);
});

test('Dash 2.4 actually draws curved elastic wind-up and forward bend without rotating',()=>{
  const h=duckHarness(),g=h.game.context.window.__gravityHarness;
  const first=h.press();h.release(first);h.advance(3);
  const second=h.press();h.release(second);
  h.game.bends.length=0;h.advance(1);
  assert.ok(g.motion.sample({landed:true,duck:true}).shear<0,
    'first physical frames bend the crouched cube backwards');
  assert.ok(h.game.bends.length>=2,'Canvas draws smooth curved sides');
  h.advance(5);
  assert.ok(g.motion.sample({landed:true,duck:true}).shear>1,
    'ground Dash bends forward harder than its wind-up');
  assert.equal(h.game.rotations.length,0,'no whole-cube rotation');

  h.advance(60);
  const jump=h.game.get('jump-btn');
  const click={pointerId:876,preventDefault(){}};
  for(const fn of jump.events.pointerdown??[])fn(click);
  for(const fn of jump.events.pointerup??[])fn(click);
  h.advance(3);
  const air=h.press();h.release(air);
  h.game.bends.length=0;h.advance(1);
  assert.ok(g.motion.sample({landed:false,duck:false,vy:g.player().vy}).shear<0,
    'Air Dash charges backwards first');
  h.advance(6);
  assert.ok(g.motion.sample({landed:false,duck:false,vy:g.player().vy}).shear>1,
    'Air Dash springs further forward');
  assert.ok(h.game.bends.length>4,'curved pose also renders during air dash');
  assert.equal(g.dash.airCount,1);
  assert.equal(g.dash.groundCount,1);
  assert.equal(g.runAudit.summary.movement.airDashes,1);
  h.advance(24);
  assert.equal(g.motion.dashTime,0,'elastic pose ends with dash');
  h.game.bends.length=0;h.advance(4);
  assert.equal(h.game.bends.length,0,'normal jump / duck still use original shape');
  assert.equal(h.game.rotations.length,0);
});

test('Shield Core pickup integrates with real game physics, audit and HUD without extra jump input',()=>{
  const h=duckHarness(),g=h.game.context.window.__gravityHarness;
  g.director.tick=()=>{};
  g.forceZone(2);
  h.advance(1);
  g.setHP(75);
  const p=g.player();
  const base=515,coreY=base-config.SHIELD_CORE.rise;
  p.landed=false;p.vy=0;p.feet=coreY+28;
  g.shieldCores.active={worldX:g.distance()+p.x,x:p.x,y:coreY,displayY:coreY,
    ground:base,age:0,radius:12};
  g.jumpControl.echoUsed=false;
  h.advance(1);
  assert.equal(g.hp(),75,'no Echo Jump means no collectible');
  assert.ok(g.shieldCores.active);
  g.jumpControl.echoUsed=true;
  h.advance(1);
  assert.equal(g.hp(),100);
  assert.equal(h.game.get('hp-number').textContent,'100');
  assert.equal(h.game.get('shield-gain').textContent,'+25');
  assert.equal(h.game.get('shield-gain').classList.contains('hidden'),false);
  assert.equal(g.runAudit.summary.shieldCores.collected,1);
  assert.equal(g.runAudit.summary.shieldCores.shieldRestored,25);
  assert.equal(g.shieldCores.active,null,'pickup cannot be re-collected');
  h.advance(70);
  assert.equal(h.game.get('shield-gain').classList.contains('hidden'),true,
    'shield feedback fades without a second action');
});


test('long overhead gate can be cleared by ordinary Duck without Ground Dash',()=>{
  const h=duckHarness(),g=h.game.context.window.__gravityHarness;
  g.director.tick=()=>{};g.gravityShift.requestForZone=()=>false;
  g.forceZone(4);h.advance(1);
  const p=g.player();p.duck=true;p.duckTime=4;
  const w=180,x=p.x+70;
  const o={type:'dash-duck',x,worldX:g.distance()+x,groundY:515,
    width:w,height:146,hit:false,cleared:false,closestClearance:Infinity,
    entryDuckTime:null,dashAssisted:false,pulse:0};
  g.hurdles().push(o);h.advance(38);
  assert.equal(o.hit,false,'a valid plain Duck clears the entire physical gate');
  assert.equal(o.cleared,true);
  assert.equal(g.hp(),100);
  assert.equal(g.runAudit.summary.dashHazards.missed.ground,0);
  assert.equal(g.runAudit.summary.dashHazards.cleared.ground,1);
  assert.equal(g.runAudit.summary.dashHazards.assisted.ground,0);
  const clear=g.runAudit.events.find(e=>e.type==='dash_hazard_clear');
  assert.equal(clear.method,'geometry');
});

test('Ground Dash optionally assists the exact same long gate, never unlocking it',()=>{
  const h=duckHarness(),g=h.game.context.window.__gravityHarness;
  g.director.tick=()=>{};g.gravityShift.requestForZone=()=>false;
  g.forceZone(4);h.advance(1);
  const p=g.player(),first=h.press();h.release(first);
  const boxBefore=geometry.playerBox(p);
  const w=190,x=p.x+24;
  const o={type:'dash-duck',x,worldX:g.distance()+x,groundY:515,
    width:w,height:146,hit:false,cleared:false,closestClearance:Infinity,
    entryDuckTime:null,dashAssisted:false,pulse:0};
  g.hurdles().push(o);h.advance(2);
  const second=h.press();h.release(second);
  assert.equal(g.dash.mode,'ground');
  assert.equal(o.dashAssisted,true,'a local Ground Dash is attributed as optional aid');
  assert.equal(g.runAudit.summary.dashHazards.assisted.ground,1);
  assert.equal(g.runAudit.events.filter(e=>e.type==='dash_hazard_assist').length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(geometry.playerBox(p))),
    JSON.parse(JSON.stringify(boxBefore)),'Dash never changes the physical collider');
  h.advance(28);
  assert.equal(g.hp(),100);
  assert.equal(o.hit,false);
  assert.equal(g.runAudit.summary.dashHazards.cleared.ground,1);
  assert.equal(g.runAudit.summary.dashHazards.missed.ground,0);
  assert.equal(g.runAudit.events.find(e=>e.type==='dash_hazard_clear').method,
    'dash-assisted');
});

test('Echo-level height clears both separate low boxes WITHOUT Air Dash',()=>{
  const h=duckHarness(),g=h.game.context.window.__gravityHarness;
  g.director.tick=()=>{};g.gravityShift.requestForZone=()=>false;
  g.forceZone(4);h.advance(1);
  const p=g.player();p.landed=false;p.feet=260;p.vy=-250;
  const w=210,x=p.x+75;
  const o={type:'dash-jump',x,worldX:g.distance()+x,groundY:515,
    width:w,height:62,hit:false,cleared:false,closestClearance:Infinity,
    entryDuckTime:null,dashAssisted:false,pulse:0};
  g.hurdles().push(o);h.advance(34);
  assert.equal(o.hit,false,'height above both physical boxes is a valid clear');
  assert.equal(o.cleared,true);
  assert.equal(g.hp(),100);
  assert.equal(g.runAudit.summary.dashHazards.missed.air,0);
  assert.equal(g.runAudit.summary.dashHazards.assisted.air,0);
  assert.equal(g.runAudit.summary.dashHazards.cleared.air,1);
});

test('Air Dash may assist the two-box vault, with identical physical collision',()=>{
  const h=duckHarness(),g=h.game.context.window.__gravityHarness;
  g.director.tick=()=>{};g.gravityShift.requestForZone=()=>false;
  g.forceZone(4);h.advance(1);
  const p=g.player();p.landed=false;p.feet=310;p.vy=-300;
  const w=210,x=p.x+70;
  const o={type:'dash-jump',x,worldX:g.distance()+x,groundY:515,
    width:w,height:62,hit:false,cleared:false,closestClearance:Infinity,
    entryDuckTime:null,dashAssisted:false,pulse:0};
  g.hurdles().push(o);
  const press=h.press();h.release(press);
  assert.equal(g.dash.mode,'air');
  assert.equal(o.dashAssisted,true);
  assert.equal(g.runAudit.summary.dashHazards.assisted.air,1);
  h.advance(29);
  assert.equal(o.hit,false);
  assert.equal(g.hp(),100);
  assert.equal(g.runAudit.summary.dashHazards.cleared.air,1);
  assert.equal(g.runAudit.events.find(e=>e.type==='dash_hazard_clear').method,
    'dash-assisted');
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


test('real game makes the zone-8 ceiling set-piece short and safely returns to floor',()=>{
  const g=setup();g.step(0);g.get('start-btn').click();
  const state=g.context.window.__gravityHarness;
  state.director.tick=()=>{};
  state.terrain.segments=[{type:'flat',start:0,end:10000000,y0:515,y1:515}];
  state.terrain.gaps=[];state.terrain.generated=10000000;
  for(let i=1;i<=60*97;i++)g.step(i*1000/60);
  assert.ok(state.zone()>=8);
  assert.equal(state.gravityShift.ceiling,true,'first zone-8 shift reached ceiling');
  assert.equal(state.gravityShift.count,1);
  for(let i=60*97+1;i<=60*125;i++)g.step(i*1000/60);
  assert.equal(state.gravityShift.ceiling,false,'auto-return must finish well before zone 16');
  assert.equal(state.gravityShift.count,2,'entry and return are distinct safe shifts');
  for(let i=60*125+1;i<=60*193;i++)g.step(i*1000/60);
  assert.equal(state.gravityShift.ceiling,true,'next ceiling event begins at zone 16');
  assert.equal(state.gravityShift.count,3);
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
    'Jump; tap again in the air for Double Jump');
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

test('simplified arcade uses short Jump instead of a raised Echo lesson',()=>{
  const g=setup({chromaRushArcadeV1:JSON.stringify({bestZone:6,bestScore:1800})});
  g.step(0);g.get('practice-zone').value='2';g.get('practice-start-btn').click();
  const state=g.context.window.__gravityHarness;
  state.terrain.segments=[{type:'flat',start:0,end:10000000,y0:515,y1:515}];
  state.terrain.gaps=[];state.terrain.generated=10000000;
  state.director.tick=()=>{};
  assert.equal(state.testSpawn({type:'echo'}),false);
  assert.equal(state.testSpawn({type:'dash-jump'}),false);
  assert.equal(state.hurdles().length,0);
  assert.equal(state.testSpawn({type:'jump'}),true);
  assert.equal(state.hurdles()[0].type,'jump');
  assert.doesNotThrow(()=>state.render());
  state.gravityShift.ceiling=true;
  assert.doesNotThrow(()=>state.render(),'short Jump geometry remains valid upside down');
});
test('live arcade Flow integration awards only verified alternating clear chains',()=>{
  const g=setup(),state=()=>g.context.window.__gravityHarness;
  g.step(0);g.get('start-btn').click();
  g.step(1000/60);
  const h=state();
  h.flow.registerClear({precision:true});
  const start=h.score();
  h.comboAward('jump',{precision:true,master:true});
  assert.equal(h.score(),start,'first movement does not pay a combo');
  g.step(2000/60);
  h.flow.registerClear({precision:false});
  h.comboAward('duck');
  assert.equal(h.combo.totalCombos,1);
  assert.equal(h.combo.displayTier,2);
  assert.ok(h.score()>start);
  g.step(3000/60);
  assert.match(g.get('flow-streak').textContent,/CHAIN ×2/);
  h.flow.registerClear({precision:true});
  const prior=h.score();
  h.comboAward('echo',{precision:true});
  assert.equal(h.combo.bestChain,3);
  assert.ok(h.score()-prior>=35);
  assert.equal(h.director.insight.combo.best,3);
  assert.ok(h.effects.active.some(e=>e.kind==='cue-combo'));
  assert.equal(h.flow.zoneClears,3,'combo bonuses cannot fake an extra clear');
  assert.equal(h.flow.totalPrecision,2,'combo reward does not fake precision');
  h.combo.breakChain();
  assert.equal(h.combo.chain.length,0);
  g.step(4000/60);
  assert.match(g.get('flow-streak').textContent,/3 STREAK/);
});

test('first arcade zones generate no retired Echo Rail or Twin Vault',()=>{
  const g=setup();g.step(0);g.get('start-btn').click();
  const state=g.context.window.__gravityHarness;
  const seen=new Set(),types=[];
  for(let i=1;i<=60*34;i++){
    state.player().invulnerable=4;
    g.step(i*1000/60);
    for(const o of state.hurdles())if(!seen.has(o.worldX)){
      seen.add(o.worldX);types.push({type:o.type,zone:state.zone()});
    }
  }
  assert.ok(types.length>=3,'real Director continues generating normal hazards');
  assert.ok(types.every(x=>x.type!=='echo'&&x.type!=='dash-jump'));
  assert.ok(types.filter(x=>x.zone===2).every(x=>x.type==='jump'||x.type==='duck'));
});
test('real game frames draw ONE background and ONE terrain during Chroma Tide 2.0',()=>{
  const g=setup();
  g.step(0);g.get('start-btn').click();
  const state=g.context.window.__gravityHarness;
  // This measures the actual zone render, not survival skills of a simulated
  // player with no controls. Keep the procedural game clock/zone real but
  // supply a flat test runway and harmless contacts until the first crossing.
  state.terrain.segments=[{type:'flat',start:0,end:10000000,y0:515,y1:515}];
  state.terrain.gaps=[];state.terrain.generated=10000000;
  let timestamp=0;
  for(let i=1;i<=60*25;i++){
    state.player().invulnerable=9;
    timestamp=i*1000/60;g.step(timestamp);
    if(state.spectralWave.active&&!state.spectralWave.charging)break;
  }
  assert.ok(state.spectralWave.active,'the live game should be transitioning zones');
  let backgrounds=0,terrains=0;
  const oldBg=worldBackground.drawBackground,oldTerrain=terrainRender.drawTerrain;
  try{
    worldBackground.drawBackground=(opts)=>{backgrounds++;return oldBg(opts)};
    terrainRender.drawTerrain=(opts)=>{terrains++;return oldTerrain(opts)};
    g.step(timestamp+1000/60);
    assert.equal(backgrounds,1,'no duplicate background on an active zone wave');
    assert.equal(terrains,1,'no duplicate terrain on an active zone wave');
  }finally{
    worldBackground.drawBackground=oldBg;
    terrainRender.drawTerrain=oldTerrain;
  }
});

test('UI Calm keeps a one-tap primary run and accessible optional menus',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/id="menu-practice" class="menu-drawer hidden"/);
  assert.match(html,/id="menu-controls" class="menu-drawer hidden"/);
  assert.match(html,/id="result-details" class="result-details hidden"/);
  assert.match(html,/id="record-score"/);
  assert.match(html,/id="record-zone"/);
  assert.match(html,/id="final-score"/);
  assert.match(html,/id="final-best"/);
  assert.match(html,/id="final-perfect"/);
  assert.match(html,/id="final-distance"/);
  assert.match(html,/id="export-run-btn"/);
  const g=setup({chromaRushArcadeV1:JSON.stringify({bestZone:6,bestScore:8000})});
  g.step(0);
  assert.equal(g.get('menu-practice').classList.contains('hidden'),true);
  assert.equal(g.get('menu-controls').classList.contains('hidden'),true);
  g.get('practice-toggle-btn').click();
  assert.equal(g.get('menu-practice').classList.contains('hidden'),false);
  assert.equal(g.get('practice-toggle-btn')['aria-expanded'],'true');
  g.get('help-toggle-btn').click();
  assert.equal(g.get('menu-controls').classList.contains('hidden'),false);
  assert.equal(g.get('menu-practice').classList.contains('hidden'),true);
  g.get('help-toggle-btn').click();
  assert.equal(g.get('menu-controls').classList.contains('hidden'),true);
  g.get('result-details-btn').click();
  assert.equal(g.get('result-details').classList.contains('hidden'),false);
  assert.equal(g.get('result-details-btn').textContent,'HIDE DETAILS');
  g.get('start-btn').click();
  assert.equal(g.get('result-details').classList.contains('hidden'),false,
    'run start must not remove the actual results data');
  g.get('result-details-btn').click();
  assert.equal(g.get('result-details').classList.contains('hidden'),true);
});

test('REAL arcade generation produces long Duck Gates and never Twin Vaults',()=>{
  const g=setup();g.step(0);g.get('start-btn').click();
  const st=g.context.window.__gravityHarness;
  let seed=20261108;
  const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  st.terrain.random=rng;st.director.random=rng;
  const known=new Set(),dash=[];
  for(let i=1;i<=60*150;i++){
    st.player().invulnerable=5;st.setHP(100);
    g.step(i*1000/60);
    for(const o of st.hurdles())if(!known.has(o.worldX)){
      known.add(o.worldX);
      if(o.type==='dash-jump'||o.type==='dash-duck')
        dash.push({type:o.type,zone:st.zone(),ceiling:st.gravityShift.ceiling,at:i/60});
    }
    if(dash.length>=3)break;
  }
  assert.ok(dash.length>=2,'long Duck Gate should recur: '+JSON.stringify(dash));
  assert.ok(dash.every(x=>x.type==='dash-duck'));
  assert.equal(dash[0].ceiling,false,'first long Duck Gate taught on floor');
  assert.ok(dash[0].zone>=4);
  assert.ok(dash[1].at-dash[0].at>=20,'advanced gates should not spam');
});
test('blocked ordinary obstacle cannot starve the retained Ground Dash lesson',()=>{
  const d=new director.AdaptiveRushDirector(()=>.5);
  d.phase='BUILD';d.phaseDuration=40;
  d.pending=[{type:'jump',pattern:'single-jump',step:1}];d.spawnCountdown=0;
  const attempts=[],defers=[];
  const context={zone:5,zoneElapsed:5,surface:'floor',gravityPending:false,
    hp:100,speed:620,playerX:300,spawnX:1750,
    noteDashDefer:(reason,type)=>defers.push({reason,type})};
  for(let i=0;i<240&&!d.dashIntroduced.ground;i++)d.tick(1/60,context,step=>{
    attempts.push(step.type);return step.type!=='jump';
  });
  assert.equal(d.dashIntroduced.ground,true);
  assert.equal(d.totalSpawned,1);
  assert.ok(attempts.includes('dash-duck'));
  assert.ok(defers.some(x=>x.reason==='stalled_ordinary_pattern'));
});
test('long Duck Gate enforces world-edge recovery and remains spawnable on clean runway',()=>{
  const h=duckHarness(),g=h.game.context.window.__gravityHarness;
  g.director.tick=()=>{};g.gravityShift.requestForZone=()=>false;
  h.advance(1);g.forceZone(5);
  g.director.stress=0;g.director.confidence=.9;
  g.terrain.canSpawnObstacle=()=>true;
  g.terrain.groundAt=()=>515;
  g.terrainDirector.prepare=()=>[];
  g.shieldCores.blocksHazard=()=>false;
  assert.equal(g.testSpawn({type:'jump'}),true);
  const first={...g.lastPlaced()};
  assert.equal(g.testSpawn({type:'dash-duck',guided:true}),false,
    'long Duck Gate cannot start before the normal Jump recovery ends');
  const speed=g.speed();
  const early=dashHazards.placementAfter(first,'dash-duck',{
    worldX:first.endWorld+speed*.5,speed,intro:true});
  assert.equal(early.allowed,false);
  const late=dashHazards.placementAfter(first,'dash-duck',{
    worldX:first.endWorld+speed*2,speed,intro:true});
  assert.equal(late.allowed,true,'safe world-edge distance must make the gate eligible');
  const fresh=duckHarness(),other=fresh.game.context.window.__gravityHarness;
  fresh.advance(1);other.forceZone(5);
  other.director.stress=0;other.director.confidence=.9;
  other.terrain.canSpawnObstacle=()=>true;other.terrain.groundAt=()=>515;
  other.shieldCores.blocksHazard=()=>false;
  assert.equal(other.testSpawn({type:'dash-duck',guided:true}),true,
    'the retained long Duck Gate must be spawnable on a safe floor');
});

test('optional Dash assist is counted separately from an ordinary physical clear',()=>{
  const audit=new runAudit.RoundAudit();
  audit.record('spawn',{zone:5},{obstacle:'dash-jump'});
  audit.record('dash_hazard_assist',{zone:5},{obstacle:'dash-jump',mode:'air',source:'press'});
  audit.record('dash_hazard_clear',{zone:5},{obstacle:'dash-jump',method:'dash-assisted'});
  assert.deepEqual(JSON.parse(JSON.stringify(audit.summary.dashHazards.assisted)),
    {air:1,ground:0});
  assert.equal(audit.summary.dashHazards.cleared.air,1);
  assert.equal(audit.summary.obstaclesCleared,0,'assist is not a phantom clear');
});

test('adaptive camera responds to a later practice-speed timeline while physics player X stays anchored',()=>{
  const g=setup();
  g.step(0);g.get('start-btn').click();
  const harness=g.context.window.__gravityHarness;
  const px=harness.player().x;
  assert.equal(harness.camera.zoom,1);
  harness.forceZone(16);
  for(let i=1;i<=45;i++)g.step(i*1000/60);
  assert.ok(harness.camera.zoom<1,'zoom must start helping in the challenging zones');
  assert.equal(harness.player().x,px,'zoom must not modify runner physics coordinates');
  assert.ok(harness.camera.visibleRight(1280,px)>1280);
  assert.ok(harness.camera.lowestZoom<=harness.camera.zoom);
});
