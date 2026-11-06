const test=require('node:test');
const assert=require('node:assert/strict');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {AdaptiveRushDirector}=require('../src/director/adaptive-director.js');
const {UnifiedTerrainDirector}=require('../src/director/unified-terrain-director.js');
const {GAME,TERRAIN}=require('../src/core/config.js');
function seeded(seed){
  let s=seed>>>0;
  return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296};
}
function harness(seed=42){
  const terrain=new TerrainSystem({random:seeded(seed)});
  const director=new AdaptiveRushDirector(seeded(seed+99));
  const unified=new UnifiedTerrainDirector({terrain,director});
  terrain.reset(515); director.reset(); unified.reset();
  return {terrain,director,unified};
}
test('arrival-based planning forecasts PEAK instead of using phase at generation',()=>{
  const {unified,director}=harness();
  director.phase='BUILD';director.phaseElapsed=7.1;director.phaseDuration=7.4;
  director.confidence=.8;
  const playerWorld=2000,speed=600;
  const near=unified.policyAt(2000+600*1,{playerWorld,zone:5,speed,hp:100});
  assert.equal(near.phase,'PEAK');
  assert.equal(near.allowGap,true);
  assert.ok(near.gapChance>0);
  director.phase='PEAK';director.phaseElapsed=4.85;director.phaseDuration=5;
  const late=unified.policyAt(2000+600*1.5,{playerWorld,zone:5,speed,hp:100});
  assert.notEqual(late.phase,'PEAK');
  assert.equal(late.gapChance,0,'do not prepare an abyss for a projected RELAX/FADE phase');
});
test('gap planning is suppressed for low shield and high stress without changing speed',()=>{
  const {unified,director}=harness();
  director.phase='PEAK';director.phaseElapsed=0;director.phaseDuration=5.4;
  const context={zone:7,speed:720,playerWorld:800};
  assert.ok(unified.policyAt(1400,{...context,hp:100}).gapChance>0);
  assert.equal(unified.policyAt(1400,{...context,hp:25}).gapChance,0);
  director.stress=.75;
  assert.equal(unified.policyAt(1400,{...context,hp:100}).gapChance,0);
  assert.equal(GAME.speedAt(60,6),GAME.baseSpeed+60*GAME.acceleration+5*GAME.zoneSpeedBonus);
});
test('an obstacle deferred near a chasm remains pending and is not counted as spawned',()=>{
  const {unified,director,terrain}=harness();
  const gap={type:'gap',start:1800,end:2100,y0:515,y1:515,id:1,resolved:false};
  terrain.segments=[{type:'flat',start:0,end:1800,y0:515,y1:515},gap,
    {type:'flat',start:2100,end:9000,y0:515,y1:515}];
  terrain.gaps=[gap];terrain.generated=9000;
  director.spawnCountdown=0;director.phase='PEAK';director.phaseDuration=5;
  let called=0;
  unified.tick(.04,{zone:4,speed:600,hp:100,distance:900,spawnX:1010},()=>{called++;return true});
  assert.equal(called,0);assert.equal(director.totalSpawned,0);
  assert.ok(director.pending.length>0,'the action must be queued rather than silently discarded');
  assert.ok(unified.insight.spawnsDeferred>=1);
  // The same queued action is allowed through after reaching safe ground.
  director.spawnCountdown=0;
  unified.tick(.04,{zone:4,speed:600,hp:100,distance:2300,spawnX:1010},()=>{called++;return true});
  assert.equal(called,1);assert.equal(director.totalSpawned,1);
});
test('a failed gap gives a finite recovery window and postpones future gaps',()=>{
  const {unified,director}=harness();
  director.phase='PEAK';director.phaseElapsed=0;director.phaseDuration=5.3;
  unified.noteGapOutcome({missed:true,worldX:2000,speed:650});
  assert.equal(unified.insight.gapFails,1);
  const p=unified.policyAt(2900,{zone:5,speed:650,playerWorld:2400,hp:100});
  assert.equal(p.allowGap,false);
  assert.equal(p.gapChance,0);
  const future=unified.policyAt(5000,{zone:5,speed:650,playerWorld:4400,hp:100});
  assert.equal(future.allowGap,true);
});
test('terrain generator remains geometric authority even if the Director asks for gaps',()=>{
  const {terrain}=harness();
  const policy=()=>({allowGap:true,gapChance:1,slopeChance:0,phase:'PEAK',leadSeconds:1,
    gapSecondsMin:.30,gapSecondsMax:.33});
  const all=terrain.ensure(11500,5,690,policy);
  const gaps=all.filter(s=>s.type==='gap');
  assert.ok(gaps.length>0);
  for(const g of gaps){
    assert.ok(g.end-g.start>=TERRAIN.minGapWidth&&g.end-g.start<=TERRAIN.maxGapWidth);
    assert.equal(g.plannedPhase,'PEAK');
    assert.ok(g.start>TERRAIN.firstGapWorld);
  }
  for(let i=1;i<gaps.length;i++)assert.ok(gaps[i].start-gaps[i-1].end>=Math.max(TERRAIN.minGapSeparation,690*2.2));
  for(const g of gaps){
    assert.ok(terrain.canSpawnObstacle(g.start-400,60,690)===false,
      'hazards must be excluded around takeoff/landing');
  }
});
function simulate(seed){
  const {terrain,director,unified}=harness(seed);
  let time=0,distance=0,shield=100,spawned=0;
  const planned=[],phases=new Set();
  const dt=1/30;
  while(time<180){
    time+=dt;
    const zone=Math.floor(time/12)+1;
    const speed=GAME.speedAt(time,zone);
    distance+=speed*dt;
    const playerWorld=distance+340;
    const added=unified.prepare({right:distance+1280+800,playerWorld,zone,speed,hp:shield});
    for(const s of added){if(s.type!=='flat')planned.push(s)}
    terrain.prune(playerWorld,speed);
    phases.add(director.phase);
    unified.tick(dt,{zone,speed,hp:shield,distance,spawnX:1370},step=>{
      const spawnWorld=distance+1370;
      if(!terrain.canSpawnObstacle(spawnWorld,65,speed))return false;
      spawned++;return true;
    });
    for(const gap of terrain.visibleGaps(playerWorld-50,playerWorld+50)){
      if(!gap.resolved&&playerWorld>=gap.end+26){
        terrain.markGap(gap,false);
        unified.noteGapOutcome({missed:false,worldX:playerWorld,speed});
      }
    }
  }
  return {planned,spawned,phases,insight:unified.insight};
}
test('three-minute seeded runs retain both terrain variety and real obstacle pacing',()=>{
  for(const seed of [1,7,42,101,909]){
    const run=simulate(seed);
    const gaps=run.planned.filter(x=>x.type==='gap'),slopes=run.planned.filter(x=>x.type==='slope');
    assert.ok(slopes.length>5,`seed ${seed}: too little slope variation`);
    assert.ok(gaps.length>=1,`seed ${seed}: no gap challenges`);
    assert.ok(run.spawned>20,`seed ${seed}: obstacle starvation`);
    assert.ok(run.phases.has('PEAK')&&run.phases.has('RELAX'));
    assert.ok(gaps.every(g=>g.plannedPhase==='PEAK'||g.plannedPhase==='BUILD'),
      `seed ${seed}: gap planned for an intended break`);
    for(let i=1;i<gaps.length;i++){
      assert.ok(gaps[i].start-gaps[i-1].end>=Math.max(TERRAIN.minGapSeparation,370*2.2),
        `seed ${seed}: back-to-back gaps`);
    }
  }
});
