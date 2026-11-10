/* CHROMA RUSH — Rush Chains 3.0: measurable continuous skill sequences. */
const test=require('node:test');
const assert=require('node:assert/strict');
const {GAME}=require('../src/core/config.js');
const {AdaptiveRushDirector,PHASE,MAX_SIMPLE_CHAIN,
  violatesSimpleChain}=require('../src/director/adaptive-director.js');
const {PATTERNS}=require('../src/director/patterns.js');
const {MovementAwareness,minimumGap}=require('../src/director/movement-awareness.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {UnifiedTerrainDirector}=require('../src/director/unified-terrain-director.js');
const rush=PATTERNS.filter(p=>p.rush);
const rng=seed=>{let x=seed>>>0;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296)};
const prepared={zone:18,hp:100,stress:0,confidence:1,phase:'PEAK',
  gravityPending:false,surface:'floor'};
test('rush variants really carry 9–12 alternating ordinary physical actions, never retired families',()=>{
  assert.ok(rush.length>=3);
  assert.ok(rush.every(p=>p.minZone>=8&&p.steps.length>=9&&
    p.steps.length<=12&&p.steps.every(x=>x==='jump'||x==='duck')));
  assert.ok(rush.every(p=>!p.steps.some((t,i)=>i>=3&&
    t===p.steps[i-1]&&t===p.steps[i-2]&&t===p.steps[i-3])));
  assert.ok(rush.every(p=>!violatesSimpleChain(p.steps,[])));
  assert.equal(MAX_SIMPLE_CHAIN,3);
});
test('healthy PEAK admits real Rush, but tutorial, damage, stress, ceiling transition and recovery forbid it',()=>{
  const m=new MovementAwareness(),p=rush[0];
  assert.equal(m.allowPattern(p,prepared,30),true);
  for(const changed of [
    {zone:7},{hp:25},{hp:50},{stress:.45},{confidence:.5},
    {phase:'BUILD'},{phase:'FADE'},{gravityPending:true},{surface:'unknown'}]){
    assert.equal(m.allowPattern(p,{...prepared,...changed},30),false,
      JSON.stringify(changed));
  }
  m.onDamage(29);
  assert.equal(m.allowPattern(p,prepared,30),false,'actual damage recovery gate');
});
test('skilled PEAK lasts long enough for a sustained 10+ beat riff and damage shortens it',()=>{
  const d=new AdaptiveRushDirector(()=>.5);d.confidence=1;
  const healthy=d.durationFor(PHASE.PEAK,{zone:19,hp:100});
  assert.ok(healthy>=12.8&&healthy<=13.8,healthy);
  d.phase=PHASE.PEAK;d.phaseElapsed=4;d.phaseDuration=healthy;
  d.registerDamage();
  assert.ok(d.phaseDuration<=5.8,'real damage exits the extended attack');
  const injured=d.durationFor(PHASE.PEAK,{zone:19,hp:25});
  assert.ok(injured<8,'wounded runner has no compulsory long rush');
});
test('long PEAK flat lanes truly permit many independent fair obstacles, while other terrain still exists',()=>{
  const d=new AdaptiveRushDirector(()=>.5);d.phase=PHASE.PEAK;
  d.phaseElapsed=0;d.phaseDuration=13;d.confidence=1;d.dashIntroduced.ground=true;
  const t=new TerrainSystem({random:()=>.5});
  const u=new UnifiedTerrainDirector({terrain:t,director:d});
  const ctx={playerWorld:100000,zone:18,speed:1550,hp:100,surface:'floor'};
  const policy=u.policyAt(ctx.playerWorld+1550,ctx);
  assert.equal(policy.rushRunway,true);
  assert.equal(policy.gapChance,0);
  assert.equal(policy.slopeChance,0);
  const lane=t._choose(18,1550,policy);
  assert.equal(lane.type,'flat');
  assert.ok(lane.end-lane.start>=1550*12.6,lane.end-lane.start);
  for(let i=1;i<=11;i++){
    const world=lane.start+1550*(.8+i*.85);
    assert.equal(t.canSpawnObstacle(world,95,1550),true,
      'each rapid action has independent physical takeoff and landing clearance');
  }
  assert.equal(u.policyAt(ctx.playerWorld+1550,{...ctx,hp:20}).rushRunway,false);
  d.phase=PHASE.BUILD;d.phaseDuration=6;d.phaseElapsed=0;
  assert.equal(u.policyAt(ctx.playerWorld+1550,ctx).rushRunway,false);
});
function simulate(seed){
  const d=new AdaptiveRushDirector(rng(seed));
  d.dashIntroduced.ground=true;d.lastDashHazardAt=0;
  d.confidence=1;
  const samples=[],dt=1/30;
  for(let frame=0;frame<270*30;frame++){
    const t=frame*dt,zone=Math.floor(t/12)+1;
    const speed=GAME.speedAt(t,zone);
    d.tick(dt,{zone,hp:100,speed,zoneElapsed:t%12,
      gravityPending:false,surface:'floor',playerX:340,
      spawnXFor:()=>340+speed*2.1},step=>{
      samples.push({t,type:step.type,pattern:step.pattern,rush:step.rush,speed});
      d.registerClear({action:step.type});
      return true;
    });
  }
  return {d,samples};
}
test('seeded gameplay makes actual completed 9+ input chains at rapid but physics-safe cadence',()=>{
  let completed=0,longest=0,rapidIntervals=0;
  for(const seed of [1,7,23,184,950]){
    const {d,samples}=simulate(seed),insight=d.insight.rush;
    completed+=insight.completed;longest=Math.max(longest,insight.longest);
    let streak=0,prev='';
    for(let i=0;i<samples.length;i++){
      const step=samples[i];
      streak=(step.type===prev&&(prev==='jump'||prev==='duck'))?streak+1:1;
      assert.ok(streak<=MAX_SIMPLE_CHAIN,{seed,t:step.t,streak});
      prev=step.type;
      const prior=samples[i-1];
      if(!prior||!step.rush||prior.pattern!==step.pattern)continue;
      const diff=step.t-prior.t;
      assert.ok(diff+1e-5>=minimumGap(prior.type,step.type,step.speed)-.065,
        JSON.stringify({seed,prior,step,diff}));
      assert.ok(diff<=1.14,JSON.stringify({seed,prior,step,diff}));
      rapidIntervals++;
    }
    assert.ok(insight.started>=1,{seed,insight});
    assert.ok(insight.completed>=1,{seed,insight});
  }
  assert.ok(completed>=5,{completed});
  assert.ok(longest>=10,{longest});
  assert.ok(rapidIntervals>=35,{rapidIntervals});
});
