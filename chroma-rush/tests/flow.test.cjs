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
  assert.equal(f.value,6);assert.equal(f.streak,1);assert.equal(f.zoneClears,1);
  f.registerClear({precision:true});
  assert.equal(f.value,16);assert.equal(f.totalPrecision,1);assert.equal(f.bestStreak,2);
  assert.equal(f.tier,0);
});

test('flow tiers, score bonuses and CHROMA STATE require successful clears',()=>{
  const f=new FlowSystem();
  clears(f,5);assert.equal(f.value,30);assert.equal(f.tier,1);assert.equal(f.multiplier,1.25);
  clears(f,6);assert.equal(f.value,66);assert.equal(f.tier,2);assert.equal(f.multiplier,1.5);
  clears(f,4);assert.equal(f.value,90);assert.equal(f.tier,3);assert.equal(f.multiplier,2);
  assert.equal(f.stateName,'CHROMA STATE');
  assert.equal(f.registerClear().earnedPoints,270);
  clears(f,40);assert.equal(f.value,100);
});

test('flow decays slowly in long gaps, pauses in time are not simulated, and never goes negative',()=>{
  const f=new FlowSystem();f.registerClear();
  f.tick(2);assert.equal(f.value,6);
  f.tick(1.49);assert.equal(f.value,6);
  f.tick(.02);assert.ok(f.value<6);
  f.tick(1000);assert.equal(f.value,0);
  f.tick(0);assert.equal(f.value,0);
});

test('damage disrupts streak and flow and disqualifies the current zone',()=>{
  const f=new FlowSystem();clears(f,7);
  f.registerDamage();assert.equal(f.value,7);assert.equal(f.streak,0);assert.equal(f.bestStreak,7);
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
  const f=new FlowSystem();clears(f,3);assert.equal(f.value,18);
  const first=f.completeZone({hp:70});assert.equal(first.bonusPoints,350);
  assert.equal(f.value,26);assert.equal(f.streak,3);
  const empty=f.completeZone({hp:70});assert.equal(empty.perfect,false);
  assert.equal(f.value,26);assert.equal(f.streak,3);
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

test('static entry point loads Flow before HUD and engine with cache-busted shared config',()=>{
  const fs=require('node:fs');const path=require('node:path');
  const root=path.join(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(refs.indexOf('src/core/config.js?v=flow-1.0')>=0);
  assert.ok(refs.indexOf('src/gameplay/flow.js?v=flow-1.0')>refs.indexOf('src/core/config.js?v=flow-1.0'));
  assert.ok(refs.indexOf('src/ui/hud.js?v=flow-1.0')>refs.indexOf('src/gameplay/flow.js?v=flow-1.0'));
  assert.ok(refs.indexOf('src/gameplay/game.js?v=flow-1.0')>refs.indexOf('src/ui/hud.js?v=flow-1.0'));
  for(const src of refs) assert.ok(fs.existsSync(path.join(root,src.split('?')[0])),`missing script ${src}`);
  for(const name of ['flow-inner','flow-number','flow-state','flow-outer','flow-multiplier','flow-streak','zone-perfect','final-perfect'])assert.ok(html.includes(`id="${name}"`),name);
});
