/* Action Density & Extended Peaks 2.0 — demand-based density, no unsafe compression. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {AdaptiveRushDirector,PHASE,actionRamp,actionPressure,lateRamp}=require('../src/director/adaptive-director.js');
const {GAME}=require('../src/core/config.js');
const {MovementAwareness,minimumGap,patternDemand}=require('../src/director/movement-awareness.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {UnifiedTerrainDirector}=require('../src/director/unified-terrain-director.js');
const healthy={hp:100,confidence:1,stress:0};
test('earlier action density ramps after zone 6 but not in onboarding or by changing speed',()=>{
  assert.equal(actionRamp(1),0);
  assert.equal(actionRamp(6),0);
  assert.ok(actionRamp(12)>.4);
  assert.equal(actionRamp(19),1);
  assert.equal(actionRamp(35),1);
  assert.equal(lateRamp(19),0,'existing Endurance Mastery remains independent');
  assert.equal(actionPressure({zone:19,...healthy}),1);
  const wounded=actionPressure({zone:19,hp:20,confidence:1,stress:.70});
  assert.ok(wounded>0&&wounded<.53,'keep basic rhythm but respect damage pressure');
  for(const t of [60,180,240,414]){
    assert.equal(GAME.speedAt(t,Math.floor(t/12)+1),GAME.speedAt(t,50));
  }
});

test('real PEAK lasts longer from midgame while physical damage recovery stays longer',()=>{
  const d=new AdaptiveRushDirector(()=>.5);d.confidence=1;
  const early=d.durationFor(PHASE.PEAK,{zone:6,hp:100});
  const mid=d.durationFor(PHASE.PEAK,{zone:19,hp:100});
  assert.ok(mid>=early+2.4,JSON.stringify({early,mid}));
  assert.ok(mid>=13.5&&mid<=14.1,mid);
  assert.ok(mid>early+4,'Rush Chain phase must exceed prior phase duration, not just rename it');
  assert.ok(d.durationFor(PHASE.BUILD,{zone:19,hp:100})<
    d.durationFor(PHASE.BUILD,{zone:6,hp:100})-.7);
  assert.ok(d.durationFor(PHASE.RELAX,{zone:19,hp:100})<=1.65);
  d.stress=.70;
  const stressed=d.durationFor(PHASE.PEAK,{zone:19,hp:20});
  assert.equal(stressed,mid,
    'after a brief recovery the permanent attack difficulty does not roll back');
  assert.ok(d.durationFor(PHASE.RELAX,{zone:19,hp:20})<=1.2,
    'a low shield never turns every phase into an extended breather');
});

test('densification respects previous action travel envelopes and still admits safe multi-input motifs',()=>{
  const d=new AdaptiveRushDirector(()=>.5);d.phase=PHASE.PEAK;d.confidence=1;
  const early=d.gapFor({zone:6,hp:100,speed:800});
  const mid=d.gapFor({zone:19,hp:100,speed:1750});
  assert.ok(mid<early-.1,{mid,early});
  const physical=minimumGap('jump','jump',1750);
  assert.ok(physical>mid,'minimum safe jump recovery, NOT newly shortened, is the authority');
  assert.ok(physical>=2*Math.abs(GAME.jumpVelocity)/GAME.gravity,
    'keep complete normal jump airborne commitment');
  const ma=new MovementAwareness();
  assert.ok(ma.maxEffort({zone:19,hp:100,phase:'BUILD',stress:0,
    confidence:1,actionPressure:1})>=patternDemand(['jump','duck','jump']),
    'capable player can get varied action triplets during BUILD');
  assert.ok(ma.maxEffort({zone:19,hp:20,phase:'BUILD',stress:.7,
    confidence:.8,actionPressure:.5})<patternDemand(['jump','duck','jump']),
    'critical health never forces a three-input pattern');
});

test('terrain leaves more physically valid obstacle lanes without removing hills, gaps or safety vetoes',()=>{
  const d=new AdaptiveRushDirector(()=>.5),terrain=new TerrainSystem({random:()=>.5});
  d.phase='PEAK';d.phaseElapsed=0;d.phaseDuration=8;d.confidence=1;
  d.dashIntroduced.ground=true;
  const u=new UnifiedTerrainDirector({terrain,director:d});
  const base={playerWorld:100000,speed:1450,hp:100,surface:'floor'};
  const before=u.policyAt(100800,{...base,zone:6});
  const after=u.policyAt(100800,{...base,zone:19});
  assert.ok(after.slopeChance<before.slopeChance*.8,
    JSON.stringify({before:before.slopeChance,after:after.slopeChance}));
  assert.equal(after.rushRunway,true,
    'advanced PEAK now reserves real action space for continuous Rush sequences');
  assert.equal(after.slopeChance,0);
  assert.equal(after.gapChance,0);
  const outsideRush=u.policyAt(100800,{...base,zone:19,hp:20});
  assert.equal(outsideRush.rushRunway,true,
    'low HP no longer disables ordinary Rush once timed recovery ends');
  d.cycle=1;
  const varied=u.policyAt(100800,{...base,zone:19,hp:100});
  assert.equal(varied.rushRunway,false);
  assert.ok(varied.slopeChance>0,
    'one out of three PEAK cycles retains varied terrain');
  assert.equal(after.actionPressure,1);
  terrain.segments=[{type:'gap',start:100000,end:103000,y0:515,y1:515}];
  assert.equal(terrain.canSpawnObstacle(101000,90,1450),false,
    'a real gap still blocks any obstacle or unsafe takeoff');
});

test('multiple seeded arcade simulations spend substantially more midgame time in actual PEAK',()=>{
  const seeded=seed=>{let x=seed>>>0;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296)};
  for(const seed of [1,7,23,184,950]){
    const d=new AdaptiveRushDirector(seeded(seed));
    d.confidence=.9;d.dashIntroduced.ground=true;d.lastDashHazardAt=0;
    let intense=0,elapsed=0,actions=0,lateActions=0;
    for(let frame=0;frame<360*30;frame++){
      const t=frame/30,zone=Math.floor(t/12)+1,speed=GAME.speedAt(t,zone);
      let spawned=null;
      d.tick(1/30,{zone,hp:100,speed,zoneElapsed:t%12,
        surface:'floor',gravityPending:false,playerX:340,
        spawnXFor:()=>340+speed*2.1},step=>{spawned=step;actions++;if(t>=120)lateActions++;return true;});
      if(spawned)d.registerClear({action:spawned.type});
      if(t>=120){elapsed+=1/30;if(d.phase===PHASE.PEAK)intense+=1/30;}
    }
    assert.ok(intense/elapsed>.37,
      JSON.stringify({seed,peakShare:intense/elapsed,actions}));
    assert.ok(lateActions>80,{seed,lateActions});
    assert.equal(d.insight.variety.maxSimpleChain,6);
  }
});

test('Director audit exposes early action-pressure ramp independently from late endurance',()=>{
  const d=new AdaptiveRushDirector(()=>.5);
  d.tick(.1,{zone:19,hp:100,speed:1600,surface:'floor',
    zoneElapsed:5,spawnXFor:()=>3200,playerX:340},()=>true);
  assert.ok(d.insight.actionDensity.ramp===1);
  assert.ok(d.insight.actionDensity.pressure>0);
  const src=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(src,/exported\.directorExperience=director\.insight/);
});
