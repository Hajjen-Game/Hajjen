const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const FAIR=require('../src/director/high-speed-fairness.js');
const {GAME}=require('../src/core/config.js');
const {RoundAudit}=require('../src/diagnostics/round-audit.js');
const {AdaptiveRushDirector}=require('../src/director/adaptive-director.js');
const {QualityManager}=require('../src/performance/quality-manager.js');
const {FixedStepClock}=require('../src/performance/frame-clock.js');
const {simulate,matrix}=require('../scripts/high-speed-fairness-audit.cjs');

test('at ordinary speeds the established spawn distance and two-thumb scheme are unchanged',()=>{
  for(const type of ['jump','duck','echo']){
    const x=FAIR.horizonFor(type,{speed:370,playerX:339,viewportWidth:1280});
    assert.equal(x,1370);
  }
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/id="jump-btn"/);
  assert.match(html,/id="duck-btn"/);
  assert.doesNotMatch(html,/id="dash-btn"/);
});
test('high-speed reaction budget is measured in seconds, not fixed pixels',()=>{
  for(const viewportWidth of [900,1280,1600]){
    const playerX=viewportWidth*.265;
    for(const speed of [650,1200,1800,2500,3600]){
      for(const type of ['jump','duck','echo']){
        const row=FAIR.scenario(type,{speed,playerX,viewportWidth});
        assert.equal(row.planned.fair,true,JSON.stringify(row));
        assert.ok(row.planned.marginSeconds>=0);
        assert.ok(row.planned.leadSeconds>=row.old.leadSeconds-1e-9);
      }
    }
  }
  const high=FAIR.scenario('echo',{speed:2600,viewportWidth:1280,playerX:339});
  assert.ok(high.old.marginSeconds<-.4,'previous fixed-screen Echo was unreadably late');
  assert.ok(high.planned.earlyCueSeconds>.4);
  assert.ok(high.planned.leadSeconds>=1.0);
});
test('exact action planned is the exact action validated by terrain and warned on screen',()=>{
  const w=1280,speed=2650,playerX=339;
  const hazards=['jump','duck','echo'].map((type,i)=>{
    const x=FAIR.horizonFor(type,{speed,playerX,viewportWidth:w});
    return {type,x,worldX:10000+x+20*i,width:55};
  });
  assert.ok(hazards.every(h=>h.x>w));
  const earliest=FAIR.warning({hurdles:hazards,playerX,viewportWidth:w,speed});
  assert.ok(earliest);
  assert.equal(earliest.type,'duck');
  assert.equal(earliest.label,'DUCK');
  const fromGaps=FAIR.warning({hurdles:[],gaps:[
    {id:1,start:10600,echoChallenge:true,resolved:false}],
    distance:8500,playerX,viewportWidth:w,speed});
  assert.equal(fromGaps.type,'echo-gap');
  assert.equal(fromGaps.label,'2× GAP');
  assert.equal(FAIR.warning({hurdles:[],gaps:[],playerX,viewportWidth:w,speed}),null);
  assert.equal(FAIR.warning({hurdles:[{type:'echo',x:700,worldX:9000}],
    playerX,viewportWidth:w,speed}),null);
});
test('warnings render as short upright text cues without changing HUD, collision or RNG',()=>{
  const operations=[];
  const ctx={save(){operations.push('save')},restore(){operations.push('restore')},
    fillRect(...a){operations.push(['fillRect',...a])},
    beginPath(){operations.push('beginPath')},moveTo(){},lineTo(){},stroke(){operations.push('stroke')},
    fillText(...a){operations.push(['fillText',...a])}};
  assert.equal(FAIR.drawWarning(ctx,null),false);
  assert.equal(FAIR.drawWarning(ctx,{mark:'↑↑',label:'2× JUMP',seconds:1.02},
    {width:900,height:720,glow:.24,reducedMotion:true}),true);
  assert.equal(operations.filter(x=>x==='save').length,1);
  assert.equal(operations.filter(x=>x==='restore').length,1);
  assert.ok(operations.some(x=>Array.isArray(x)&&x[0]==='fillText'&&
    x[1].includes('2× JUMP')));
  assert.equal(operations.some(x=>Array.isArray(x)&&x[0]==='arc'),false);
});
test('export captures actual minimum warning time, offscreen cue reliance and frame stalls',()=>{
  const a=new RoundAudit();a.reset();
  const ctx={time:10,zone:10,hp:100,score:1000,flow:80,speed:2450,
    phase:'PEAK',distance:12000};
  const m=FAIR.scenario('echo',{speed:2450,viewportWidth:1280,playerX:339}).planned;
  a.record('spawn',ctx,{obstacle:'echo',leadSeconds:m.leadSeconds,
    requiredSeconds:m.requiredSeconds,visibleSeconds:m.visibleSeconds,
    earlyCueSeconds:m.earlyCueSeconds,fair:m.fair});
  a.record('spawn',ctx,{obstacle:'duck',leadSeconds:.61,
    requiredSeconds:.56,visibleSeconds:.38,earlyCueSeconds:.23,fair:true});
  for(const frame of [16.7,16.7,48.5,88])a.noteFrame(frame,frame===88?.044:0);
  a.finish(ctx);
  const doc=a.snapshot();
  assert.equal(doc.summary.reaction.measured,2);
  assert.equal(doc.summary.reaction.earlyCues,2);
  assert.equal(doc.summary.reaction.underBudget,0);
  assert.ok(doc.summary.reaction.minVisibleSeconds<.5);
  assert.equal(doc.highSpeedPerformance.slowFrames,2);
  assert.equal(doc.highSpeedPerformance.stalls,1);
  assert.equal(doc.highSpeedPerformance.droppedSimulationSeconds,.04);
  a.reset();assert.equal(a.snapshot().summary.reaction.measured,0);
});
test('graphics optimization and dropped-frame capping do not alter game speed',()=>{
  const q=new QualityManager({device:{deviceMemory:2,hardwareConcurrency:2}});
  assert.equal(q.profile.name,'performance');
  const runSpeed=GAME.speedAt(170,15);
  const clock=new FixedStepClock();
  clock.advance(0,true,()=>{});
  let updates=0;
  const sample=clock.advance(180,true,()=>{updates++});
  assert.ok(sample.dropped>0);
  assert.ok(updates<=6);
  assert.equal(GAME.speedAt(170,15),runSpeed);
  assert.equal(q.profile.name,'performance');
});
test('twenty-four deterministic three-minute sweeps cover fast phones, narrow viewports and recovery',()=>{
  const report=matrix();
  assert.equal(report.runs,24);
  assert.equal(report.totalSeconds,4320);
  assert.ok(report.obstacles>80);
  assert.equal(report.underBudget,0,JSON.stringify(report.results.filter(r=>r.underBudget)));
  assert.equal(report.lateGaps,0,JSON.stringify(report.results.filter(r=>r.lateGaps)));
  assert.equal(report.transitionViolations,0,
    JSON.stringify(report.results.filter(r=>r.transitionViolations)));
  assert.equal(report.cuesChecked,report.warnings);
  assert.ok(report.warnings>0);
  assert.ok(report.results.every(r=>r.gravityFlips>0));
  // Speed Curve 2.0 deliberately caps acceleration (not speed). Every
  // zone-one three-minute reference run now ends near 1,585 rather than 2,620.
  assert.ok(report.results.every(r=>r.finalSpeed===GAME.speedAt(180,16)));
  assert.ok(report.results.every(r=>r.finalSpeed===1585));
  console.log('high-speed-fairness audit summary: '+JSON.stringify({
    runs:report.runs,simulatedSeconds:report.totalSeconds,
    obstacles:report.obstacles,offscreenCues:report.warnings,
    gapRiskCount:report.lateGaps,belowReactionBudget:report.underBudget,
    unsafeTransitions:report.transitionViolations}));
});
test('late-zone practice still exercises high-speed fairness with the new curve',()=>{
  const r=simulate({seed:42,seconds:180,startingZone:12,viewportWidth:900,damageEvery:17});
  assert.ok(r.finalSpeed>2000,'higher-zone practice remains fast');
  assert.ok(r.finalSpeed<GAME.speedAt(300,26)+300);
  assert.ok(r.cleared>10);
  assert.equal(r.underBudget,0);
  assert.equal(r.lateGaps,0);
  assert.equal(r.transitionViolations,0);
});
test('strain simulation still has recovery phases and does not block all hazards',()=>{
  const r=simulate({seed:101,seconds:180,viewportWidth:900,damageEvery:17});
  assert.ok(r.cleared>10);
  assert.ok(r.director.deferred>0);
  assert.equal(r.underBudget,0);
  assert.equal(r.lateGaps,0);
});
test('scripts load before gameplay and exact fair hazard positions feed the Director',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const fairness=html.indexOf('src/director/high-speed-fairness.js?v=high-speed-fairness-1.0');
  const game=html.indexOf('src/gameplay/game.js?v=');
  assert.ok(fairness>0&&fairness<game);
  const s=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(s,/const x=spawnXFor\(data\.type\)/);
  assert.match(s,/spawnXFor,playerX:player\.x/);
  assert.match(s,/FAIR\.warning\(\{hurdles,gaps:terrain\.gaps/);
  assert.match(s,/FAIR\.drawWarning\(ctx,cue/);
  assert.match(s,/runAudit\.noteFrame\?\.\(frameElapsed,timing\.dropped\)/);
});

test('arrival-time safety is protected when Echo warning begins much farther offscreen',()=>{
  const speed=2200,viewportWidth=1280,playerX=339;
  const spawnXFor=type=>FAIR.horizonFor(type,{speed,playerX,viewportWidth});
  const d=new AdaptiveRushDirector(()=>.5);
  d.phase='PEAK';d.phaseElapsed=0;d.phaseDuration=100;
  d.confidence=.9;d.spawnCountdown=0;
  const ctx={zone:8,hp:100,speed,spawnXFor,spawnX:viewportWidth+90,playerX};
  const spawned=[];
  d.pending=[{type:'echo',step:1,pattern:'solo'}];
  d.tick(1/60,ctx,step=>{spawned.push(step.type);return true});
  assert.deepEqual(spawned,['echo']);
  const oldTime=d.lastSpawnTime;
  assert.ok(d.lastSpawnLead>=FAIR.rule('echo').lead);
  d.pending=[{type:'duck',step:1,pattern:'followup'}];
  d.spawnCountdown=0;
  d.time=oldTime+1.54;
  d.tick(1/60,ctx,step=>{spawned.push(step.type);return true});
  assert.deepEqual(spawned,['echo'],
    'spawn-time gap alone passes, but physical arrival spacing is unsafe');
  assert.ok(d.spawnCountdown>.15);
  d.time=oldTime+2.15;d.spawnCountdown=0;
  d.tick(1/60,ctx,step=>{spawned.push(step.type);return true});
  assert.deepEqual(spawned,['echo','duck']);
});
