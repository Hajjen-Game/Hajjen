const test=require('node:test');
const assert=require('node:assert/strict');
const {FlowSystem}=require('../src/gameplay/flow.js');
const {FLOW}=require('../src/core/config.js');

function clears(model,n,precision=false){
  for(let i=0;i<n;i++)model.registerClear({precision});
}

test('flow begins empty and basic clears increase it while tracking streaks',()=>{
  const f=new FlowSystem();
  assert.equal(f.value,0);assert.equal(f.multiplier,1);
  const a=f.registerClear();assert.equal(a.earnedPoints,135);
  assert.equal(f.value,5);assert.equal(f.streak,1);assert.equal(f.zoneClears,1);
  f.registerClear({precision:true});
  assert.equal(f.value,13);assert.equal(f.totalPrecision,1);assert.equal(f.bestStreak,2);
  assert.equal(f.tier,0);
});

test('flow tiers, score bonuses and CHROMA STATE require successful clears',()=>{
  const f=new FlowSystem();
  clears(f,6);assert.equal(f.value,30);assert.equal(f.tier,1);assert.equal(f.multiplier,1.25);
  clears(f,7);assert.equal(f.value,65);assert.equal(f.tier,2);assert.equal(f.multiplier,1.5);
  clears(f,5);assert.equal(f.value,90);assert.equal(f.tier,3);assert.equal(f.multiplier,2);
  assert.equal(f.stateName,'CHROMA STATE');
  assert.equal(f.registerClear().earnedPoints,270);
  clears(f,40);assert.equal(f.value,100);
});

test('flow decays slowly in long gaps, pauses in time are not simulated, and never goes negative',()=>{
  const f=new FlowSystem();f.registerClear();
  f.tick(2);assert.equal(f.value,5);
  f.tick(1.49);assert.equal(f.value,5);
  f.tick(.02);assert.ok(f.value<5);
  f.tick(1000);assert.equal(f.value,0);
  f.tick(0);assert.equal(f.value,0);
});

test('damage disrupts streak and flow and disqualifies the current zone',()=>{
  const f=new FlowSystem();clears(f,8);
  f.registerDamage();assert.equal(f.value,5);assert.equal(f.streak,0);assert.equal(f.bestStreak,8);
  clears(f,4);const z=f.completeZone({hp:50});
  assert.equal(z.perfect,false);assert.equal(z.heal,0);assert.equal(z.bonusPoints,0);
  assert.equal(f.perfectZones,0);assert.equal(f.zoneClears,0);
});

test('an empty zone or only two clears never grants perfect zone or healing',()=>{
  const f=new FlowSystem();
  assert.equal(f.completeZone({hp:50}).perfect,false);
  clears(f,2);
  assert.equal(f.completeZone({hp:50}).perfect,false);
  assert.equal(f.perfectZones,0);
});

test('perfect zone requires three successful clears and rewards capped shield recovery',()=>{
  const f=new FlowSystem();clears(f,FLOW.minPerfectClears);
  const result=f.completeZone({hp:95,maxHP:100});
  assert.equal(result.perfect,true);assert.equal(result.heal,5);
  assert.ok(result.bonusPoints>0);
  assert.equal(f.currentZone,2);assert.equal(f.perfectZones,1);
  assert.equal(f.zoneClears,0);assert.equal(f.zoneDamage,0);
  clears(f,3);
  const full=f.completeZone({hp:100});
  assert.equal(full.perfect,true);assert.equal(full.heal,0);
  assert.equal(f.perfectZones,2);
});

test('a perfect zone grants fixed flow and no recursive zone bonus',()=>{
  const f=new FlowSystem();clears(f,3);assert.equal(f.value,15);
  const first=f.completeZone({hp:70});assert.equal(first.bonusPoints,350);
  assert.equal(f.value,20);assert.equal(f.streak,3);
  const empty=f.completeZone({hp:70});assert.equal(empty.perfect,false);
  assert.equal(f.value,20);assert.equal(f.streak,3);
});

test('the flow state resets fully between runs',()=>{
  const f=new FlowSystem();clears(f,20,true);f.completeZone({hp:90});f.registerDamage();
  f.reset();
  assert.equal(f.value,0);assert.equal(f.streak,0);assert.equal(f.bestStreak,0);
  assert.equal(f.perfectZones,0);assert.equal(f.currentZone,1);
  assert.equal(f.totalPrecision,0);
});

test('collisions during invulnerability still disqualify a Perfect Zone without double flow penalty',()=>{
  const f=new FlowSystem();clears(f,3);const before=f.value;
  f.registerCollision();
  assert.equal(f.value,before);assert.equal(f.streak,0);
  assert.equal(f.completeZone({hp:75}).perfect,false);
});

test('high Flow pressure ramps continuously, preserving low and midrange meter',()=>{
  const f=new FlowSystem();
  clears(f,12);assert.equal(f.value,60);
  f.tick(2);assert.equal(f.value,60,'below pressure threshold, normal gap remains free');
  clears(f,2);assert.equal(f.value,70);
  const before=f.value;f.tick(1);
  const expected=before-FLOW.highFlowPressurePerSecond*((before-FLOW.highFlowPressureStart)/(100-FLOW.highFlowPressureStart));
  assert.ok(Math.abs(f.value-expected)<.4);
  assert.ok(f.value>65,'not a hard reset or cap');
  f.tick(2.5);assert.ok(f.value<before);
});

test('damage, Perfect Zone healing and precise clears remain independent of pressure',()=>{
  const f=new FlowSystem();clears(f,20);
  f.tick(1);
  const before=f.value;assert.ok(before<100);
  const precise=f.registerClear({precision:true});
  assert.ok(f.value>before);
  assert.ok(precise.earnedPoints>0);
  const perfect=f.completeZone({hp:65,maxHP:100});
  assert.equal(perfect.perfect,true);assert.equal(perfect.heal,10);
  assert.equal(f.value,Math.min(100,before+FLOW.precisionGain+FLOW.perfectFlowGain));
  f.registerDamage();assert.equal(f.value,Math.max(0,Math.min(100,before+FLOW.precisionGain+FLOW.perfectFlowGain)-FLOW.damagePenalty));
});

test('no frame-rate-dependent pressure and no after-pause recovery',()=>{
  const a=new FlowSystem(),b=new FlowSystem();
  clears(a,20);clears(b,20);
  a.tick(1);
  for(let i=0;i<60;i++)b.tick(1/60);
  assert.ok(Math.abs(a.value-b.value)<.25,`pressure should not vary much with tick rate: ${a.value} vs ${b.value}`);
  const before=a.value;a.tick(0);assert.equal(a.value,before);
});

test('static entry point loads Flow before HUD and engine with cache-busted shared config',()=>{
  const fs=require('node:fs');const path=require('node:path');
  const root=path.join(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(refs.indexOf('src/core/config.js?v=flow-1.2-movement-1.0-echo-spire-1.0-combo-1.0-speed-curve-2.0-echo-polish-1.1-echo-zone2-1.2-dash-impact-2.2-shield-core-1.0-palette-24-2.0-director-flow-2.0-performance-stability-2.0')>=0);
  assert.ok(refs.indexOf('src/gameplay/flow.js?v=flow-1.2-combo-1.0-director-flow-2.0-performance-stability-2.0')>refs.indexOf('src/core/config.js?v=flow-1.2-movement-1.0-echo-spire-1.0-combo-1.0-speed-curve-2.0-echo-polish-1.1-echo-zone2-1.2-dash-impact-2.2-shield-core-1.0-palette-24-2.0-director-flow-2.0-performance-stability-2.0'));
  assert.ok(refs.indexOf('src/ui/hud.js?v=flow-multiplier-1.0-combo-1.0')>refs.indexOf('src/gameplay/flow.js?v=flow-1.2-combo-1.0-director-flow-2.0-performance-stability-2.0'));
  assert.ok(refs.indexOf('src/gameplay/game.js?v=arcade-animation-2.0-chroma-pulse-1.0-gravity-1.0-ceiling-sync-1.0-movement-1.0-duck-gate-1.0-echo-spire-1.0-aware-1.0-fairness-1.0-jump-visual-1.0-combo-1.0-echo-polish-1.1-echo-zone2-1.2-tide-2.0-dash-2.5-shield-core-1.0-dash-hazards-1.0-dash-pacing-1.1-spectrum-2.0-dash-reliability-1.2-ui-calm-1.0-dash-polish-2.0-director-flow-2.0-performance-stability-2.0')>refs.indexOf('src/ui/hud.js?v=flow-multiplier-1.0-combo-1.0'));
  for(const src of refs) assert.ok(fs.existsSync(path.join(root,src.split('?')[0])),`missing script ${src}`);
  for(const name of ['flow-inner','flow-number','flow-state','flow-outer','flow-multiplier','flow-streak','zone-perfect','final-perfect'])assert.ok(html.includes(`id="${name}"`),name);
});
