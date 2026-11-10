const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {GAME}=require('../src/core/config.js');
const {AdaptiveRushDirector,PHASE,lateRamp,enduranceIntensity,enduranceDensity,
  MAX_SIMPLE_CHAIN}=require('../src/director/adaptive-director.js');
const {PATTERNS,candidates}=require('../src/director/patterns.js');
const {MovementAwareness,minimumGap}=require('../src/director/movement-awareness.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {UnifiedTerrainDirector}=require('../src/director/unified-terrain-director.js');

const full={hp:100,stress:0,confidence:1};
test('late intensity ramps AFTER zone 24 and NEVER increases locked speed',()=>{
  assert.equal(lateRamp(24),0);
  assert.equal(lateRamp(50),1);
  assert.ok(lateRamp(35)>lateRamp(30));
  assert.ok(lateRamp(45)>lateRamp(35));
  assert.equal(enduranceIntensity({zone:50,...full}),1);
  assert.equal(enduranceIntensity({zone:15,...full}),0);
  assert.ok(enduranceIntensity({zone:50,hp:20,stress:.65,confidence:1})<
    enduranceIntensity({zone:50,...full})*.20);
  assert.ok(enduranceDensity({zone:50,hp:20,stress:.65,confidence:1})>
    enduranceIntensity({zone:50,hp:20,stress:.65,confidence:1})*2,
    'late basic-action density survives low HP; advanced eligibility stays gated');
  assert.ok(enduranceIntensity({zone:50,hp:75,stress:.2,confidence:.75})<
    enduranceIntensity({zone:50,...full}));
  assert.ok(GAME.speedAt(604)>2600&&GAME.speedAt(604)<2750);
  assert.equal(GAME.speedAt(604,24),GAME.speedAt(604,50),
    'Director endurance changes density only, never the shared speed curve');
  assert.equal(GAME.zoneSeconds,12);
});

test('late confident BUILD gets denser spacing and wider combinations; low HP remains safer',()=>{
  const d=new AdaptiveRushDirector(()=>.5);
  d.phase=PHASE.BUILD;d.stress=0;d.confidence=1;
  const mid=d.gapFor({zone:24,hp:100,speed:1800});
  const late=d.gapFor({zone:50,hp:100,speed:2200});
  assert.ok(late<mid-.20,{mid,late});
  const effort=new MovementAwareness();
  assert.ok(effort.maxEffort({phase:'BUILD',zone:50,hp:100,
    stress:0,confidence:1,enduranceIntensity:1})>
    effort.maxEffort({phase:'BUILD',zone:25,hp:100,
      stress:0,confidence:1,enduranceIntensity:0})+.8);
  assert.equal(candidates('BUILD',50,3).some(p=>p.tier===2),false);
  assert.equal(candidates('BUILD',50,3,{buildTier:2}).some(p=>p.tier===2),true);
  const allowed=PATTERNS.find(p=>p.id==='up-down-up');
  const readiness={zone:50,hp:100,stress:0,confidence:1,phase:'BUILD',
    speed:2200,enduranceIntensity:1};
  assert.equal(effort.allowPattern(allowed,readiness,200),true);
  assert.equal(effort.allowPattern(allowed,{...readiness,hp:25,stress:.65},200),false);
  d.stress=.65;
  const woundedLate=d.gapFor({zone:50,hp:25,speed:2200});
  assert.ok(woundedLate>late,'a wounded runner still receives longer recovery');
  assert.ok(woundedLate<d.gapFor({zone:24,hp:25,speed:2200})-.08,
    'wounded zone-50 basic actions stay denser than wounded zone-24 play');
  d.stress=0;
  assert.equal(d.gapFor({zone:18,hp:100,speed:1300}),
    d.gapFor({zone:18,hp:100,speed:1300}));
});

test('PEAK duration gets a bounded late mastery extension, never a no-spawn removal',()=>{
  const d=new AdaptiveRushDirector(()=>.5);
  d.confidence=1;d.stress=0;
  const before=d.durationFor(PHASE.PEAK,{zone:24,hp:100});
  const after=d.durationFor(PHASE.PEAK,{zone:50,hp:100});
  assert.ok(after>before+.4,{before,after});
  assert.equal(d.durationFor(PHASE.RELAX,{zone:50,hp:100}),
    d.durationFor(PHASE.RELAX,{zone:24,hp:100}));
});

test('terrain gives masters genuine high-speed safe flats without erasing all hills/gaps',()=>{
  const d=new AdaptiveRushDirector(()=>.5);
  d.phase='BUILD';d.phaseElapsed=0;d.phaseDuration=7;d.confidence=1;d.stress=0;
  const t=new TerrainSystem({random:()=>.5});
  const u=new UnifiedTerrainDirector({terrain:t,director:d});
  const ctx={playerWorld:100000,zone:50,speed:2200,hp:100,surface:'floor'};
  const late=u.policyAt(ctx.playerWorld+2000,ctx);
  assert.equal(late.challengeRunway,true);
  assert.ok(late.slopeChance>0,'landscapes stay dynamic');
  assert.ok(late.slopeChance<.52,'some high-speed terrain makes room for hazards');
  assert.ok(late.gapChance>=0,'gaps remain governed by existing safety');
  assert.equal(u.policyAt(ctx.playerWorld+2000,{...ctx,zone:24}).challengeRunway,false);
  const wounded=u.policyAt(ctx.playerWorld+2000,{...ctx,hp:20});
  assert.equal(wounded.challengeRunway,true,
    'a skilled wounded player still gets flat corridors for basic inputs');
  assert.equal(wounded.gapChance,0,
    'low HP does NOT re-enable dangerous gaps');
  d.stress=.9;
  assert.equal(u.policyAt(ctx.playerWorld+2000,{...ctx,hp:20}).challengeRunway,false,
    'severe stress still disables density corridors');
  d.stress=0;
  const created=t._choose(50,2200,{...late,gapChance:0,slopeChance:0,allowGap:false});
  assert.equal(created.type,'flat');
  assert.ok(created.end-created.start>=7000);
  assert.ok(t.canSpawnObstacle(created.start+2200,110,2200),
    'flat corridor has physical takeoff, collider, and landing clearance');
  const old=new TerrainSystem({random:()=>.5});
  const normal=old._choose(24,1800,{allowGap:false,gapChance:0,slopeChance:0,
    challengeRunway:false});
  assert.ok(normal.end-normal.start<=740,
    'early and weaker-run flat sizes are unchanged');
});

const rng=seed=>{let x=seed>>>0;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296)};
function directorRun(seed){
  const d=new AdaptiveRushDirector(rng(seed));
  d.echoIntroduced=true;d.dashIntroduced={air:true,ground:true};
  d.movement.echoClears=3;d.lastDashHazardType='dash-duck';d.lastDashHazardAt=0;
  d.confidence=1;
  const samples=[];const dt=1/30;
  for(let i=0;i<18000;i++){
    const time=i*dt;
    const zone=Math.floor(time/12)+1;
    const speed=GAME.speedAt(time,zone);
    d.tick(dt,{zone,hp:100,speed,zoneElapsed:time%12,
      playerX:340,spawnXFor:()=>340+speed*2.1,
      gravityPending:false,surface:'floor'},step=>{
        samples.push({time,type:step.type});
        d.registerClear({action:step.type});
        return true;
      });
  }
  return {samples,d};
}
test('multiple 10-minute seeded Directors intensify late healthy play without speed changes or unfair chains',()=>{
  for(const seed of [1,7,23,184,950]){
    const {samples,d}=directorRun(seed);
    const early=samples.filter(s=>s.time>=180&&s.time<300);
    const late=samples.filter(s=>s.time>=480&&s.time<600);
    // Rush Chains now create intense play from zone 8, so minutes 3–5
    // are already active. The former +10% relative *total spawn count*
    // target is no longer a valid proxy for a hard late game; keep a
    // modest actual late density gain and test full 10+ action sequences
    // independently in rush-chains-3.0.test.cjs.
    assert.ok(late.length>early.length*1.03,
      JSON.stringify({seed,early:early.length,late:late.length}));
    let max=0,chain=0,prev='';
    for(const s of samples){
      chain=(s.type===prev&&(prev==='jump'||prev==='duck'))?chain+1:1;
      max=Math.max(max,chain);prev=s.type;
    }
    assert.ok(max<=MAX_SIMPLE_CHAIN,{seed,max});
    assert.ok(d.insight.endurance.zone>=50);
    assert.ok(d.insight.endurance.intensity>=.99);
    assert.ok(d.insight.endurance.density>=.99);
    assert.equal(d.insight.endurance.shield,100);
  }
});

test('game and exported Director insight expose late endurance, retaining old physics',()=>{
  const root=path.join(__dirname,'..');
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const d=require('../src/director/adaptive-director.js');
  assert.match(game,/exported\.directorExperience=director\.insight/);
  assert.ok(d.enduranceIntensity({zone:50,...full})>0);
  assert.equal(minimumGap('jump','jump',2200)>=2*Math.abs(GAME.jumpVelocity)/GAME.gravity,true);
  const s=new AdaptiveRushDirector(()=>.5);
  assert.equal(s.insight.endurance.zone,1);
});
