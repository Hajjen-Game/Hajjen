const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const DASH_H=require('../src/gameplay/dash-hazards.js');
const {AIR,GROUND,AIR_BOX_WIDTH,boxGapFor,isDashHazard,requiredMode,
  baseType,unlockZone,widthFor,heightFor,mayAssist,
  needsDashFor,safeToSpawn}=DASH_H;
const {GAME,DASH}=require('../src/core/config.js');
const GEO=require('../src/core/geometry.js');
const {AdaptiveRushDirector}=require('../src/director/adaptive-director.js');
const FAIR=require('../src/director/high-speed-fairness.js');
const {minimumGap,PROFILES}=require('../src/director/movement-awareness.js');
const {PATTERNS}=require('../src/director/patterns.js');
const {PrecisionComboSystem,FAMILY}=require('../src/gameplay/precision-combo.js');
const {RoundAudit}=require('../src/diagnostics/round-audit.js');
const root=path.join(__dirname,'..');

test('Air and Ground advanced families are fully physical, never Dash-gated',()=>{
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
  assert.equal(heightFor(AIR),62);
  assert.equal(heightFor(GROUND),146);
  assert.equal(typeof DASH_H.sealX,'undefined');
  assert.equal(typeof DASH_H.reachedSeal,'undefined');
  assert.equal(typeof DASH_H.mayCharge,'undefined');
  const v=GAME.speedAt(36,4);
  const air={type:AIR,x:560,width:widthFor(AIR,v),height:62};
  const low=GEO.obstacleBoxes(air,515);
  assert.equal(low.length,3);
  assert.equal(low[0].w,AIR_BOX_WIDTH);
  assert.equal(low[2].w,AIR_BOX_WIDTH);
  assert.equal(low[1].w,boxGapFor(v));
  assert.equal(low[1].x,low[0].x+AIR_BOX_WIDTH);
  assert.equal(low[2].x,low[1].x+low[1].w);
  assert.equal(low[1].h,DASH_H.AIR_BRIDGE_HEIGHT);
  assert.ok(low[1].h<low[0].h,'zigzag bed is low but physically dangerous');
  const between={x:low[1].x+30,y:480,w:36,h:30};
  assert.ok(GEO.verticalOverlap(between,low[1]),
    'landing on the visible low-energy floor is a real collision');
  const gate={type:GROUND,x:300,width:widthFor(GROUND,v),height:146};
  const duck=GEO.obstacleBox(gate,515);
  assert.equal(duck.y,GEO.DUCK_GATE_TOP);
  assert.equal(duck.y+duck.h,515-GEO.DUCK_CLEARANCE);
  assert.equal(GEO.verticalOverlap({x:310,y:494,w:66,h:21},duck),false);
});

test('long ground gate needs Dash at low speed, becomes plain-duckable as speed rises',()=>{
  for(const z of [4,5,6,8,12,16,20,25,35,45,65]){
    const speed=GAME.speedAt((z-1)*GAME.zoneSeconds,z);
    const groundW=widthFor(GROUND,speed);
    const crossing=(groundW+66)/speed;
    assert.ok(groundW>=160&&groundW<=DASH_H.GROUND_MAX_WIDTH,JSON.stringify({z,groundW}));
    assert.equal(needsDashFor(GROUND,speed),crossing>GAME.duckDuration);
    if(z<=5)assert.ok(needsDashFor(GROUND,speed));
    if(z>=16)assert.equal(needsDashFor(GROUND,speed),false);
  }
  assert.equal(widthFor(GROUND,4000),DASH_H.GROUND_MAX_WIDTH);
});

test('two Air plinths are connected by a visible colliding zigzag bed',()=>{
  for(const z of [3,5,8,12,16,20,24,30,40]){
    const speed=GAME.speedAt((z-1)*GAME.zoneSeconds,z);
    const width=widthFor(AIR,speed),gap=boxGapFor(speed);
    assert.equal(width,100+gap);
    assert.ok(gap>=180&&gap<=1100,JSON.stringify({speed,gap}));
    const o={type:AIR,x:460,width,height:62};
    const boxes=GEO.obstacleBoxes(o,515);
    assert.equal(boxes.length,3);
    assert.equal(boxes[0].x,460);
    assert.equal(boxes[1].x,460+AIR_BOX_WIDTH);
    assert.equal(boxes[2].x,460+AIR_BOX_WIDTH+gap);
    assert.equal(boxes[1].w,gap);
    assert.equal(boxes[1].y,515-DASH_H.AIR_BRIDGE_HEIGHT);
    const right=1280;
    const x=FAIR.horizonFor(AIR,{speed,viewportWidth:right,playerX:339});
    assert.ok(FAIR.metrics(AIR,{x,speed,viewportWidth:right,playerX:339}).fair);
  }
});

test('Dash assistance is optional, local and NEVER a pass requirement',()=>{
  const speed=850;
  const air={type:AIR,worldX:1500,width:widthFor(AIR,speed),hit:false,
    cleared:false,dashAssisted:false};
  const ground={type:GROUND,worldX:1500,width:widthFor(GROUND,speed),
    hit:false,cleared:false,dashAssisted:false};
  assert.equal(mayAssist(air,{action:'air',playerWorld:1350,speed,airborne:true}),true);
  assert.equal(mayAssist(air,{action:'air',playerWorld:1350,speed,airborne:false}),false);
  assert.equal(mayAssist(air,{action:'ground',playerWorld:1350,speed,airborne:true}),false);
  assert.equal(mayAssist(air,{action:'air',playerWorld:500,speed,airborne:true}),false);
  assert.equal(mayAssist({...air,cleared:true},{action:'air',playerWorld:1400,speed,airborne:true}),false);
  assert.equal(mayAssist(ground,{action:'ground',playerWorld:1400,speed,ducking:true}),true);
  assert.equal(mayAssist(ground,{action:'ground',playerWorld:1400,speed,ducking:false}),false);
  assert.equal(mayAssist(ground,{action:'air',playerWorld:1400,speed,ducking:true}),false);
});

test('ground-first introductions, Director cooldown and gravity safeguards remain',()=>{
  assert.equal(safeToSpawn(AIR,{zone:2,first:true}),false);
  assert.equal(safeToSpawn(GROUND,{zone:3,first:true}),false);
  assert.equal(safeToSpawn(AIR,{zone:3,first:true,surface:'ceiling'}),false);
  assert.equal(safeToSpawn(AIR,{zone:3,first:true,surface:'floor'}),true);
  assert.equal(safeToSpawn(GROUND,{zone:4,first:true,surface:'floor'}),true);
  assert.equal(safeToSpawn(GROUND,{zone:4,first:true,hp:50}),false);
  assert.equal(safeToSpawn(GROUND,{zone:4,first:true,stress:.5}),false);
  assert.equal(safeToSpawn(GROUND,{zone:4,first:true,gravityBusy:true}),false);
  assert.equal(safeToSpawn(GROUND,{zone:4,confidence:.3}),false);
  assert.equal(safeToSpawn(GROUND,{zone:4,confidence:.6}),true);
  assert.ok(PATTERNS.some(p=>p.steps.length===1&&p.steps[0]===AIR));
  assert.ok(PATTERNS.some(p=>p.steps.length===1&&p.steps[0]===GROUND));
  assert.ok(PROFILES[AIR].effort>2);
  assert.ok(minimumGap(AIR,'jump',800)>=1.7);
  assert.ok(minimumGap('duck',GROUND,800)>=1.7);
  const d=new AdaptiveRushDirector(()=>.5);
  d.echoIntroduced=true;
  const ctx={zone:3,zoneElapsed:4,hp:100,speed:550,
    confidence:.55,stress:0,playerX:330,gravityPending:false,surface:'floor'};
  const seen=[];
  for(let i=0;i<16&&!seen.length;i++)d.tick(.1,ctx,o=>{seen.push(o.type);return true});
  assert.deepEqual(seen,[AIR]);
  assert.equal(d.dashIntroduced.air,true);
  const next=new AdaptiveRushDirector(()=>.5);
  next.echoIntroduced=true;next.dashIntroduced.air=true;
  const seen2=[];
  for(let i=0;i<16&&!seen2.length;i++)next.tick(.1,{...ctx,zone:4},o=>{seen2.push(o.type);return true});
  assert.deepEqual(seen2,[GROUND]);
  assert.equal(next.dashIntroduced.ground,true);
  assert.equal(FAMILY[AIR],'jump');assert.equal(FAMILY[GROUND],'duck');
  const chain=new PrecisionComboSystem();
  assert.equal(chain.onClear({action:AIR,time:1}),null);
  assert.equal(chain.onClear({action:GROUND,time:2}).length,2);
});

test('run audit distinguishes geometric clear and optional dash assist',()=>{
  const log=new RoundAudit();
  log.record('spawn',{zone:4,hp:100},{obstacle:AIR});
  log.record('dash_hazard_clear',{zone:4,hp:100},{obstacle:AIR,method:'geometry'});
  log.record('spawn',{zone:5,hp:100},{obstacle:GROUND});
  log.record('dash_hazard_assist',{zone:5,hp:100},{obstacle:GROUND,mode:'ground',source:'press'});
  log.record('dash_hazard_clear',{zone:5,hp:100},{obstacle:GROUND,method:'dash-assisted'});
  log.record('dash_hazard_miss',{zone:5,hp:75},{obstacle:GROUND,assisted:false});
  assert.equal(log.summary.dashHazards.assisted.ground,1);
  assert.equal(log.summary.dashHazards.assisted.air,0);
  assert.equal(log.summary.dashHazards.cleared.air,1);
  assert.equal(log.summary.dashHazards.cleared.ground,1);
  assert.equal(log.summary.dashHazards.missed.ground,1);
  assert.equal(log.summary.obstaclesCleared,0,'dash audit cannot forge ordinary clears');
  assert.equal(log.snapshot().version,3);
  assert.equal(log.events.filter(e=>e.type==='dash_hazard_assist').length,1);
  assert.equal(log.events.find(e=>e.type==='dash_hazard_clear').method,'geometry');
});

test('game uses only physical swept collision with no seal checkpoint',()=>{
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(game,/const hitBoxes=GEO\.obstacleBoxes\(o,o\.groundY\)/);
  assert.match(game,/const sweptX=hitBoxes\.some\(overlapsX\)/);
  assert.match(game,/if\(sweptX&&yOverlap\)onHit\(o\)/);
  assert.doesNotMatch(game,/reachedSeal|sealPassed|dashSatisfied|mayCharge|chargeFlash/);
  assert.match(game,/method:o\.dashAssisted\?'dash-assisted':'geometry'/);
  assert.doesNotMatch(game,/if\(!o\.dashAssisted\)onHit\(o\)/);
  assert.match(game,/terrain\.canSpawnObstacle\(worldX,width,speed\)/);
  assert.match(game,/shieldCores\.blocksHazard/);
  assert.match(game,/gravityShift\.mix>\.5/);
  assert.match(html,/src\/gameplay\/dash-hazards\.js\?v=[^"]*zigzag-geometry-2\.1/);
  const body=game.slice(game.indexOf('  function drawObstacle(o){'),
    game.indexOf('  function drawPlayer(){'));
  assert.doesNotMatch(body,/fillText\s*\(/,'no instructions on the obstacle itself');
  assert.match(body,/zigzag/);
  assert.match(body,/const wire=GEO\.obstacleBoxes\(o,o\.groundY\)\[1\]/);
  assert.doesNotMatch(body,/sealX\(|momentum seal|charged/);
});
