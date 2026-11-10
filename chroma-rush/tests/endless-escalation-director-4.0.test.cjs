/* Endless Escalation Director 4.0 — monotone difficulty / procedural action rhythm. */
const test=require('node:test'),assert=require('node:assert/strict');
const {GAME}=require('../src/core/config.js');
const {PATTERNS,composeRush}=require('../src/director/patterns.js');
const {AdaptiveRushDirector,PHASE,MAX_SIMPLE_CHAIN,
  escalationFloor,violatesSimpleChain}=require('../src/director/adaptive-director.js');
const {minimumGap}=require('../src/director/movement-awareness.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {UnifiedTerrainDirector}=require('../src/director/unified-terrain-director.js');
const rng=seed=>{let x=seed>>>0;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296)};
const maxStreak=arr=>{
  let type=null,len=0,max=0;
  for(const x of arr){len=x===type?len+1:1;type=x;max=Math.max(max,len)}
  return max;
};

test('Rush patterns are generated anew, contain both random six-Jump and six-Duck volleys, never force alternation',()=>{
  assert.equal(MAX_SIMPLE_CHAIN,6);
  const shells=PATTERNS.filter(p=>p.rush);
  assert.equal(shells.length,3);
  assert.ok(shells.every(p=>p.steps.length===2),'no predefined 10-step riffs');
  let sixJump=0,sixDuck=0,alternating=0;
  const variants=new Set();
  for(let seed=1;seed<=300;seed++){
    const phrase=composeRush(rng(seed),{zone:40,attack:20,maxActions:24,
      style:shells[seed%shells.length].id});
    assert.ok(phrase.length>=12&&phrase.length<=24);
    assert.ok(phrase.every(t=>t==='jump'||t==='duck'));
    assert.ok(maxStreak(phrase)<=6);
    if(phrase.join(',').includes('jump,jump,jump,jump,jump,jump'))sixJump++;
    if(phrase.join(',').includes('duck,duck,duck,duck,duck,duck'))sixDuck++;
    if(phrase.every((t,i)=>i===0||t!==phrase[i-1]))alternating++;
    variants.add(phrase.join(','));
    assert.equal(violatesSimpleChain(phrase,[]),false);
  }
  assert.ok(sixJump>=25,{sixJump});
  assert.ok(sixDuck>=25,{sixDuck});
  assert.ok(variants.size>=200,variants.size);
  assert.ok(alternating<5,{alternating});
});

test('six consecutive actions are allowed across motif boundaries, a seventh is vetoed',()=>{
  const history=['jump','jump','jump','jump'];
  assert.equal(violatesSimpleChain(['jump','jump'],history),false);
  assert.equal(violatesSimpleChain(['jump','jump','jump'],history),true);
  assert.equal(violatesSimpleChain(['duck','duck','duck','duck','duck','duck'],[]),false);
  assert.equal(violatesSimpleChain(['duck','duck','duck','duck','duck','duck','duck'],[]),true);
  for(const seed of [1,4,13,57,101]){
    const r=composeRush(rng(seed),{zone:70,attack:50,maxActions:28,
      style:'rush-volley',history:history.map(type=>({type}))});
    assert.ok(!violatesSimpleChain(r,history),{seed,r});
  }
});

test('challenge floor and attack lengths keep growing independently of HP and recovery',()=>{
  assert.equal(escalationFloor(1,0),0);
  for(const z of [8,20,35,50,80,120]){
    assert.ok(escalationFloor(z+1,0)>escalationFloor(z,0));
    assert.ok(escalationFloor(z,10)>escalationFloor(z,9));
  }
  const d=new AdaptiveRushDirector(()=>.5);
  d.escalation.attacks=12;
  const m=d.durationFor(PHASE.PEAK,{zone:18,hp:100});
  const l=d.durationFor(PHASE.PEAK,{zone:50,hp:25});
  assert.ok(l>m+4,{m,l});
  assert.equal(d.durationFor(PHASE.PEAK,{zone:50,hp:100}),l,
    'a low-shield player still faces the achieved difficulty after recovery');
  assert.ok(d.durationFor(PHASE.RELAX,{zone:50,hp:100})<=.9);
  assert.ok(d.durationFor(PHASE.FADE,{zone:50,hp:25})<=.4);
  assert.ok(d.durationFor(PHASE.BUILD,{zone:50,hp:100})<=1.5);
});

test('damage only pauses an active phrase; it does not reset a reached attack floor',()=>{
  const d=new AdaptiveRushDirector(()=>.5);
  d.escalation.attacks=20;d.escalation.floor=7;
  d.phase=PHASE.PEAK;d.phaseElapsed=5;d.phaseDuration=20;
  d.registerDamage();
  assert.ok(d.phaseDuration<=6.8);
  assert.equal(d.escalation.floor,7);
  assert.equal(d.escalation.attacks,20);
  d.phase=PHASE.RELAX;d.phaseElapsed=d.phaseDuration=1;
  d.advance({zone:55,hp:25});
  assert.equal(d.phase,PHASE.BUILD);
  d.advance({zone:55,hp:25});
  assert.equal(d.phase,PHASE.PEAK);
  assert.equal(d.escalation.attacks,21);
  assert.ok(d.escalation.floor>7);
  assert.equal(d.durationFor(PHASE.PEAK,{zone:55,hp:25}),
    d.durationFor(PHASE.PEAK,{zone:55,hp:100}));
});

test('late speed has a seamless handoff at 240s and remains ever increasing after 20min',()=>{
  const values=[0,60,180,225,240,240.01,300,420,600,900,1200,1500]
    .map(t=>GAME.speedAt(t,Math.floor(t/12)+1));
  for(let i=1;i<values.length;i++)
    assert.ok(values[i]>values[i-1],{i,before:values[i-1],after:values[i]});
  assert.ok(Math.abs(GAME.speedAt(240)-GAME.speedAt(240.01))<.1);
  assert.ok(GAME.speedAt(600)>GAME.speedAt(420)+600);
  assert.ok(GAME.speedAt(1200)>GAME.speedAt(900)+600);
  assert.equal(GAME.speedAt(600,1),GAME.speedAt(600,1000),
    'zones and the Director never insert velocity spikes');
});

function run(seed,seconds=720){
  const d=new AdaptiveRushDirector(rng(seed));
  d.dashIntroduced.ground=true;d.lastDashHazardAt=1e9;
  const events=[],dt=1/30;let prev=0,breathers=0;
  for(let frame=0;frame<seconds*30;frame++){
    const t=frame*dt,zone=Math.floor(t/12)+1,speed=GAME.speedAt(t,zone);
    d.tick(dt,{zone,hp:100,speed,zoneElapsed:t%12,gravityPending:false,
      surface:'floor',playerX:340,spawnXFor:()=>340+speed*2.1},
      step=>{events.push({time:d.time,type:step.type,pattern:step.pattern,
        rush:step.rush,speed});d.registerClear({action:step.type});return true;});
    if(frame%30===0){
      assert.ok(d.insight.escalation.floor+1e-9>=prev);
      prev=d.insight.escalation.floor;
    }
    if(d.phase===PHASE.RELAX&&d.phaseElapsed<dt*2)breathers++;
  }
  return {d,events,breathers};
}
test('a simulated twelve-minute survivor never resets escalation and performs many procedural rushes',()=>{
  for(const seed of [7,23,184]){
    const {d,events,breathers}=run(seed);
    assert.ok(d.insight.escalation.attacks>15,{seed,attack:d.insight.escalation});
    assert.ok(d.insight.escalation.floor>10);
    assert.ok(d.rush.completed>=5,{seed,rush:d.rush});
    assert.ok(d.rush.longest>=9,{seed,rush:d.rush});
    assert.ok(breathers>=15,{seed,breathers});
    // No physics minimum is shortened just because speed is high.
    for(let i=1;i<events.length;i++){
      const prev=events[i-1],curr=events[i];
      assert.ok(curr.time-prev.time>=minimumGap(prev.type,curr.type,curr.speed)-.066,
        {seed,prev,curr});
    }
    assert.ok(events.length>100,{seed,n:events.length});
  }
});

test('real terrain keeps long Rush lanes and still reserves every third PEAK for gaps',()=>{
  const d=new AdaptiveRushDirector(()=>.5);
  d.phase=PHASE.PEAK;d.phaseElapsed=0;d.phaseDuration=20;
  d.cycle=0;d.confidence=.22;d.stress=0;d.lastDamageAt=-999;
  d.dashIntroduced.ground=true;
  const t=new TerrainSystem({random:()=>.5});
  const u=new UnifiedTerrainDirector({director:d,terrain:t});
  const ctx={playerWorld:50000,speed:3100,zone:60,hp:25,surface:'floor'};
  const rush=u.policyAt(50000+3100,ctx);
  assert.equal(rush.rushRunway,true,'HP 25 may not erase achieved difficulty');
  assert.equal(rush.gapChance,0);
  const flat=t._choose(60,3100,rush);
  assert.equal(flat.type,'flat');
  assert.ok(flat.end-flat.start>=3100*20,'high speed lanes must not be capped at 36k units');
  for(let i=1;i<=18;i++){
    const x=flat.start+3100*(1+i*.85);
    assert.ok(t.canSpawnObstacle(x,65,3100),{i,x});
  }
  d.cycle=1;d.confidence=.95;u.gapSuccesses=2;
  const gaps=u.policyAt(50000+3100,{...ctx,hp:100});
  assert.equal(gaps.rushRunway,false);
  assert.ok(gaps.gapChance>0&&gaps.echoGapChance>0);
});
