const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME}=require('../src/core/config.js');
const {MovementAwareness,PROFILES,minimumGap,patternDemand}=require('../src/director/movement-awareness.js');
const {AdaptiveRushDirector,PHASE}=require('../src/director/adaptive-director.js');
const {PATTERNS,candidates}=require('../src/director/patterns.js');
const {UnifiedTerrainDirector}=require('../src/director/unified-terrain-director.js');

const ready={zone:8,hp:100,stress:0,confidence:.85,phase:'PEAK',speed:950,surface:'floor'};
test('movement envelopes track actual jump, duck and Echo commitments',()=>{
  const flight=2*Math.abs(GAME.jumpVelocity)/GAME.gravity;
  assert.ok(Math.abs(PROFILES.jump.commit-flight)<.00001);
  assert.equal(PROFILES.duck.commit,GAME.duckDuration+GAME.duckRecovery);
  assert.ok(PROFILES.echo.commit>PROFILES.jump.commit+.3);
  assert.ok(PROFILES.echo.effort>PROFILES.jump.effort*2);
  assert.ok(patternDemand(['echo','jump'])>patternDemand(['jump','jump']));
  assert.ok(patternDemand(['jump','echo'])>patternDemand(['jump','duck']));
});
test('time-based transition spacing remains safe and adapts to varying speed',()=>{
  for(const speed of [370,760,1200,2500]){
    const flight=PROFILES.jump.commit,ducker=PROFILES.duck.commit;
    assert.ok(minimumGap('jump','duck',speed)>=flight);
    assert.ok(minimumGap('duck','jump',speed)>=ducker);
    assert.ok(minimumGap('echo','jump',speed)>=PROFILES.echo.commit);
    assert.ok(minimumGap('echo','echo',speed)>=PROFILES.echo.commit);
    assert.ok(minimumGap('duck','echo',speed)>minimumGap('duck','jump',speed));
  }
  assert.ok(minimumGap('echo','jump',370)>minimumGap('echo','jump',2500));
});
test('initial Echo Spire is isolated; combos require demonstrated success',()=>{
  const d=new AdaptiveRushDirector(()=>.5);
  d.phase=PHASE.PEAK;d.confidence=.85;d.time=20;
  assert.equal(d.selectPattern({zone:2,hp:100,speed:480,surface:'floor',zoneElapsed:2}).id,'single-echo');
  d.echoIntroduced=true;
  const choices=candidates('PEAK',8,3).filter(p=>d.movement.allowPattern(p,ready,20));
  assert.ok(choices.some(p=>p.id==='single-echo'));
  assert.ok(choices.every(p=>!p.steps.includes('echo')||p.steps.length===1),
    'first advanced Echo combo must wait until player clears a Spire');
  d.movement.onClear('echo',20);
  const advanced=candidates('PEAK',8,3).filter(p=>d.movement.allowPattern(p,ready,22));
  assert.ok(advanced.some(p=>p.id==='echo-then-jump'));
  assert.ok(advanced.some(p=>p.id==='jump-then-echo'));
});
test('pressure creates easier phrases and decays without slowing the game',()=>{
  const m=new MovementAwareness(),normal=GAME.speedAt(72,7);
  const heavy=PATTERNS.find(p=>p.id==='echo-then-jump');
  // A multi-action Echo combo needs one completed Echo to be eligible.
  assert.equal(m.allowPattern(heavy,ready,10),false);
  m.onClear('echo',0);
  assert.equal(m.allowPattern(heavy,ready,10),true);
  m.onSpawn('echo',10);
  assert.ok(m.pressure>1.4);
  assert.equal(m.allowPattern(heavy,ready,11),false,'Echo cooldown');
  m.onDamage(11,'echo');
  assert.ok(m.echoMisses>0);
  assert.equal(m.allowPattern(heavy,ready,12),false);
  const p=m.pressure;m.tick(5);
  assert.ok(m.pressure<p);
  assert.equal(GAME.speedAt(72,7),normal,'movement intelligence never modifies speed');
  assert.ok(m.maxEffort({...ready,hp:25})<m.maxEffort(ready));
});
test('Echo cooldown stops successive heavy barriers but not jump/duck recovery',()=>{
  const m=new MovementAwareness();
  assert.equal(m.echoReady(ready,10),true);
  m.onSpawn('echo',10);
  assert.equal(m.echoReady(ready,11),false);
  assert.equal(m.echoReady(ready,17.1),false);
  assert.equal(m.echoReady(ready,17.5),true);
  const common={steps:['jump'],weight:1};
  assert.equal(m.allowPattern(common,ready,11),true);
  m.onGravityShift(18);
  assert.equal(m.echoReady(ready,19),false);
  assert.equal(m.echoReady(ready,19.5),true);
});
test('gap outcome informs BOTH Directors and postpones heavy hazards after misses',()=>{
  const m=new MovementAwareness();
  m.onGapOutcome({missed:true,echo:true,now:10});
  assert.ok(m.pressure>=1.4&&m.recoveryUntil>=12.6);
  assert.equal(m.echoReady(ready,11),false);
  assert.equal(m.echoReady(ready,13),true);
  const terrain={visibleGaps:()=>[],ensure:()=>[]};
  const director=new AdaptiveRushDirector(()=>.5);
  const unified=new UnifiedTerrainDirector({terrain,director});
  unified.noteGapOutcome({missed:true,echo:true,worldX:2000,speed:900});
  assert.ok(unified.noHazardsBefore>=2000+900*2.05);
  assert.ok(director.movement.pressure>0);
  unified.noteGapOutcome({missed:false,echo:false,worldX:4000,speed:900});
  assert.ok(unified.gapSuccesses>0);
});
test('terrain veto keeps an Echo Spire queued and forbids crowding an Echo Gap',()=>{
  const terrain={visibleGaps:(from,to)=> {
    const gap={start:2900,end:3400,echoChallenge:true};
    return gap.start<=to&&gap.end>=from?[gap]:[];
  }};
  const d=new AdaptiveRushDirector(()=>.5),u=new UnifiedTerrainDirector({terrain,director:d});
  d.phase='PEAK';d.phaseDuration=5;d.confidence=.85;d.spawnCountdown=0;
  let calls=0;
  const ctx={zone:5,hp:100,speed:900,playerX:300,distance:1300,spawnX:1370,surface:'floor'};
  u.tick(.016,ctx,()=>{calls++;return true});
  assert.equal(calls,0);
  assert.equal(d.echoIntroduced,false);
  assert.equal(d.pending[0].type,'echo');
  assert.ok(u.spawnsDeferred>=1);
  d.spawnCountdown=0;
  u.tick(.016,{...ctx,distance:4800},()=>{calls++;return true});
  assert.equal(calls,1);
  assert.equal(d.echoIntroduced,true);
});
test('at extreme speed Director substitutes fair hazards instead of starving on Echo',()=>{
  const d=new AdaptiveRushDirector(()=>.5);
  d.phase='PEAK';d.phaseDuration=5;d.confidence=.88;d.spawnCountdown=0;
  const ctx={zone:12,hp:100,speed:2700,playerX:340,spawnX:1370};
  assert.notEqual(d.selectPattern(ctx).id,'single-echo');
  d.pending=[{type:'echo',pattern:'single-echo',step:1}];
  d.spawnCountdown=0;
  let called=0;
  d.tick(.016,ctx,()=>{called++;return true});
  assert.equal(called,0);
  assert.equal(d.pending.length,0,'obsolete late-action must never deadlock the spawn queue');
  d.spawnCountdown=0;
  d.tick(.016,ctx,()=>{called++;return true});
  assert.ok(called>=1,'ordinary hazards continue at high speed');
});
test('no Echo is introduced during low shield, relax, recovery or after gravity flip',()=>{
  const m=new MovementAwareness();
  assert.equal(m.echoReady({...ready,hp:25},10,true),false);
  assert.equal(m.echoReady({...ready,phase:'RELAX'},10,true),false);
  assert.equal(m.echoReady({...ready,stress:.7},10,true),false);
  m.onGravityShift(10);
  assert.equal(m.echoReady(ready,11,true),false);
  assert.equal(m.echoReady(ready,12,true),true);
});
test('browser loads movement model before Director, and game reports movement state',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const first=html.indexOf('src/director/movement-awareness.js?v=movement-aware-1.0-echo-polish-1.1-echo-zone2-1.2');
  const next=html.indexOf('src/director/adaptive-director.js?v=');
  const game=html.indexOf('src/gameplay/game.js?v=');
  assert.ok(first>0&&first<next&&next<game);
  const source=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(source,/director\.registerClear\(\{action:o\.type\}\)/);
  assert.match(source,/director\.noteGravityShift\(\)/);
  assert.match(source,/terrainDirector\.noteGapOutcome\(\{missed:false,echo:Boolean\(gap\.echoChallenge\)/);
  assert.match(source,/movementPressure:director\.movement\.pressure/);
});
