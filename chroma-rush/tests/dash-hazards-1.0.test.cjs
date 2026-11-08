const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {AIR,GROUND,isDashHazard,requiredMode,baseType,unlockZone,widthFor,
  heightFor,sealX,sealWorldX,mayCharge,reachedSeal,safeToSpawn}=require('../src/gameplay/dash-hazards.js');
const {GAME,DASH}=require('../src/core/config.js');
const GEO=require('../src/core/geometry.js');
const {AdaptiveRushDirector}=require('../src/director/adaptive-director.js');
const {ACTIONS,metrics,horizonFor}=require('../src/director/high-speed-fairness.js');
const {minimumGap,PROFILES}=require('../src/director/movement-awareness.js');
const {PATTERNS}=require('../src/director/patterns.js');
const {PrecisionComboSystem,FAMILY}=require('../src/gameplay/precision-combo.js');
const {RoundAudit}=require('../src/diagnostics/round-audit.js');
const {ReactiveAudioSystem}=require('../src/audio/reactive-audio.js');
const root=path.join(__dirname,'..');
const vault={type:AIR,x:560,worldX:1560,width:220,height:62,hit:false,cleared:false,dashSatisfied:false};
const slip={...vault,type:GROUND,width:238,height:146};
test('Both are distinct real obstacles requiring the correct dash action',()=>{
  assert.equal(requiredMode(AIR),'air');
  assert.equal(requiredMode(GROUND),'ground');
  assert.equal(baseType(AIR),'jump');
  assert.equal(baseType(GROUND),'duck');
  assert.equal(isDashHazard('jump'),false);
  assert.equal(unlockZone(AIR),3);
  assert.equal(unlockZone(GROUND),4);
  assert.equal(DASH.unlockZone,1);
  assert.equal(DASH.duration,.30);
  assert.equal(GAME.duckDuration,.55);
  for(const speed of [370,530,890,1800]){
    const airW=widthFor(AIR,speed),groundW=widthFor(GROUND,speed);
    assert.ok(airW>=180&&airW<=290);
    assert.ok(groundW>=200&&groundW<=320);
    assert.ok(airW<groundW+1);
  }
  assert.equal(heightFor(AIR),62);
  assert.equal(heightFor(GROUND),146);
  const air=GEO.obstacleBox(vault,515),duck=GEO.obstacleBox(slip,515);
  assert.equal(air.y,453);
  assert.equal(air.h,62);
  assert.equal(duck.y,GEO.DUCK_GATE_TOP);
  assert.equal(duck.y+duck.h,515-GEO.DUCK_CLEARANCE);
  assert.ok(GEO.verticalOverlap({x:560,y:472,w:36,h:52},air));
  assert.equal(GEO.verticalOverlap({x:560,y:494,w:66,h:21},duck),false);
});
test('Seal requires a local AIR Dash during an actual airborne jump',()=>{
  const seal=sealWorldX(vault),pose={action:'air',speed:520,airborne:true,ducking:false};
  assert.equal(sealX(vault),vault.x+vault.width*.55);
  assert.equal(seal,1681);
  assert.equal(mayCharge(vault,{...pose,playerWorld:seal-145}),true);
  assert.equal(mayCharge(vault,{...pose,playerWorld:seal-450}),false);
  assert.equal(mayCharge(vault,{...pose,playerWorld:seal+40}),false);
  assert.equal(mayCharge(vault,{...pose,playerWorld:seal-60,airborne:false}),false);
  assert.equal(mayCharge(vault,{...pose,playerWorld:seal-60,action:'ground'}),false);
  assert.equal(mayCharge({...vault,hit:true},{...pose,playerWorld:seal-45}),false);
  assert.equal(mayCharge({...vault,dashSatisfied:true},{...pose,playerWorld:seal-45}),false);
});
test('Ground slip seal accepts only a second grounded duck press nearby',()=>{
  const at=sealWorldX(slip);
  const pose={action:'ground',playerWorld:at-86,speed:650,airborne:false,ducking:true};
  assert.equal(mayCharge(slip,pose),true);
  assert.equal(mayCharge(slip,{...pose,ducking:false}),false);
  assert.equal(mayCharge(slip,{...pose,action:'air'}),false);
  assert.equal(mayCharge(slip,{...pose,playerWorld:at-560}),false);
});
test('Swept seal crossing is frame-rate safe, and zero action cannot unlock it',()=>{
  assert.equal(reachedSeal(vault,{priorX:560,playerFront:300}),false);
  const before=350,world={...vault,x:160};
  assert.equal(reachedSeal(world,{priorX:before,playerFront:300}),true,
    'crossing is detected across a large 30 fps world step');
  assert.equal(reachedSeal(world,{priorX:before,playerFront:800}),false);
  assert.equal(reachedSeal(world,{priorX:80,playerFront:300}),false);
});
test('Dash-only obstacles are held back for low shield, stress and gravity transition',()=>{
  assert.equal(safeToSpawn(AIR,{zone:2,first:true}),false);
  assert.equal(safeToSpawn(GROUND,{zone:3,first:true}),false);
  assert.equal(safeToSpawn(AIR,{zone:3,first:true}),true);
  assert.equal(safeToSpawn(GROUND,{zone:4,first:true}),true);
  assert.equal(safeToSpawn(GROUND,{zone:4,hp:50,first:true}),false);
  assert.equal(safeToSpawn(GROUND,{zone:4,stress:.5,first:true}),false);
  assert.equal(safeToSpawn(GROUND,{zone:4,gravityBusy:true,first:true}),false);
  assert.equal(safeToSpawn(GROUND,{zone:4,confidence:.3}),false);
  assert.equal(safeToSpawn(GROUND,{zone:4,confidence:.6}),true);
  for(const speed of [370,750,1400,2400]){
    for(const type of [AIR,GROUND]){
      const horizon=horizonFor(type,{speed,playerX:340,viewportWidth:1280});
      const m=metrics(type,{x:horizon,speed,playerX:340,viewportWidth:1280});
      assert.ok(m.fair&&m.leadSeconds>=ACTIONS[type].lead);
      assert.ok(ACTIONS[type].lead>=1.1);
      assert.ok(m.visibleSeconds+m.earlyCueSeconds+1e-6>=m.leadSeconds);
    }
  }
});
test('Director teaches the two new types singly and maintains longer recovery gaps',()=>{
  assert.ok(PATTERNS.some(p=>p.steps.length===1&&p.steps[0]===AIR));
  assert.ok(PATTERNS.some(p=>p.steps.length===1&&p.steps[0]===GROUND));
  assert.ok(PROFILES[AIR].effort>2);
  assert.ok(minimumGap(AIR,'jump',800)>=1.7);
  assert.ok(minimumGap('duck',GROUND,800)>=1.7);
  const d=new AdaptiveRushDirector(()=>.5);
  d.echoIntroduced=true; // Double Jump is taught before Dash barriers.
  const context={zone:3,zoneElapsed:4,hp:100,speed:550,
    confidence:.55,stress:0,playerX:330,gravityPending:false,surface:'floor'};
  const seen=[];
  for(let i=0;i<16&&!seen.length;i++)d.tick(.1,context,o=>{seen.push(o.type);return true});
  assert.deepEqual(seen,[AIR]);
  assert.equal(d.dashIntroduced.air,true);
  assert.equal(d.dashIntroduced.ground,false);
  const next=new AdaptiveRushDirector(()=>.5);
  next.echoIntroduced=true;
  next.dashIntroduced.air=true;
  const seen2=[];
  for(let i=0;i<16&&!seen2.length;i++)next.tick(.1,{...context,zone:4},o=>{seen2.push(o.type);return true});
  assert.deepEqual(seen2,[GROUND]);
  assert.equal(next.dashIntroduced.ground,true);
  assert.equal(FAMILY[AIR],'jump');
  assert.equal(FAMILY[GROUND],'duck');
  const chain=new PrecisionComboSystem();
  assert.equal(chain.onClear({action:AIR,time:1}),null);
  assert.equal(chain.onClear({action:GROUND,time:2}).length,2);
});
test('Audit logs successful and failed seals without inventing ordinary clears',()=>{
  const log=new RoundAudit();
  log.record('dash_hazard_clear',{zone:4,hp:100},{obstacle:AIR,requiredDash:'air'});
  log.record('dash_hazard_clear',{zone:5,hp:100},{obstacle:GROUND,requiredDash:'ground'});
  log.record('dash_hazard_miss',{zone:5,hp:75},{obstacle:GROUND,sealBroken:false});
  assert.deepEqual(log.summary.dashHazards,{spawned:{air:0,ground:0},charged:{air:0,ground:0},cleared:{air:1,ground:1},missed:{air:0,ground:1},deferred:{total:0,byReason:{}}});
  assert.equal(log.summary.obstaclesCleared,0);
  assert.equal(log.snapshot().build,'chroma-identity-visual-polish-1.0');
});
test('Momentum-seal feedback is audible but never grants invulnerability',()=>{
  const a=new ReactiveAudioSystem({scope:{},enabled:false}),notes=[];
  a.enabled=true;a.effectsEnabled=true;a.effectsVolume=1;
  a.context={state:'running',currentTime:0};
  a._voice=(...args)=>notes.push(args);
  a.effect('dash-seal');
  assert.equal(notes.length,2);
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  assert.match(game,/if\(sweptX&&yOverlap\)onHit\(o\)/);
  assert.match(game,/if\(!o.dashSatisfied\)onHit\(o\)/);
  assert.match(game,/DASH_HAZARDS\.reachedSeal\(o/);
  assert.match(game,/DASH_HAZARDS\.mayCharge\(o/);
  assert.doesNotMatch(game,/dash\.active\s*&&\s*player\.invulnerable/);
});
test('Build scripts, visible unobtrusive seal labels and action cues are connected',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const meta=html.indexOf('CHROMA IDENTITY 1.0');
  const dash=html.indexOf('src/gameplay/dash-hazards.js?v=dash-hazards-1.0');
  const engine=html.indexOf('src/gameplay/game.js?v=');
  assert.ok(meta>0&&dash>0&&engine>dash);
  assert.match(game,/AIR DASH · JUMP THEN TAP DUCK/);
  assert.match(game,/GROUND DASH · TAP DUCK TWICE/);
  const portion=game.slice(game.indexOf('  function drawObstacle(o){'),
    game.indexOf('  function drawPlayer(){'));
  assert.doesNotMatch(portion,/fillText\s*\(/,'obstacle visuals stay text-free');
  assert.match(game,/gravityShift\.mix>\.5/);
  assert.match(game,/shieldCores\.blocksHazard/);
  assert.match(game,/terrain\.canSpawnObstacle\(worldX,width,speed\)/);
});
