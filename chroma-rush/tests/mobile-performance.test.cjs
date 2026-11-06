const test=require('node:test');
const assert=require('node:assert/strict');
const {QualityManager,PROFILES,initialTier,KEY}=require('../src/performance/quality-manager.js');
const {FixedStepClock}=require('../src/performance/frame-clock.js');

test('quality presets reduce ONLY visual work and pixel density',()=>{
 assert.deepEqual(Object.keys(PROFILES).sort(),['balanced','high','performance']);
 assert.ok(PROFILES.high.density>PROFILES.balanced.density&&PROFILES.balanced.density>PROFILES.performance.density);
 assert.ok(PROFILES.high.glow>PROFILES.balanced.glow&&PROFILES.balanced.glow>PROFILES.performance.glow);
 assert.ok(PROFILES.high.dprCap>PROFILES.balanced.dprCap&&PROFILES.balanced.dprCap>PROFILES.performance.dprCap);
 assert.ok(Object.keys(PROFILES).every(k=>!('speed'in PROFILES[k])&&!('gravity'in PROFILES[k])&&!('difficulty'in PROFILES[k])));
});
test('AUTO defaults safely on older phones and HIGH can be explicitly selected',()=>{
 assert.equal(initialTier({deviceMemory:2,hardwareConcurrency:8}),'performance');
 assert.equal(initialTier({deviceMemory:8,hardwareConcurrency:8}),'high');
 assert.equal(initialTier({deviceMemory:4,hardwareConcurrency:8}),'balanced');
 assert.equal(initialTier({}),'balanced');
 const saved={},store={getItem:k=>saved[k],setItem:(k,v)=>saved[k]=v};
 const q=new QualityManager({storage:store,device:{deviceMemory:2,hardwareConcurrency:4}});
 assert.equal(q.tier,'performance');q.setMode('high');assert.equal(q.tier,'high');
 assert.equal(saved[KEY],'high');
 assert.equal(new QualityManager({storage:store,device:{deviceMemory:2}}).tier,'high');
 assert.equal(q.setMode('banana'),false);
});
test('DPR and total pixel budgets bound GPU fill cost without altering layout dimensions',()=>{
 const q=new QualityManager({device:{deviceMemory:8,hardwareConcurrency:8}});
 const high=q.effectiveDpr(3,1440,720);assert.ok(high<=2);assert.ok(high*high*1440*720<=PROFILES.high.pixels+1);
 q.setMode('balanced');const balanced=q.effectiveDpr(3,1440,720);
 q.setMode('performance');const low=q.effectiveDpr(3,1440,720);
 assert.ok(high>balanced&&balanced>low);
 assert.ok(low*low*1440*720<=PROFILES.performance.pixels+1);
});
test('AUTO eventually downgrades under sustained slow frames, not single stutters',()=>{
 const q=new QualityManager({device:{deviceMemory:8,hardwareConcurrency:8}});
 assert.equal(q.tier,'high');
 q.observe(120);assert.equal(q.tier,'high');
 let downgraded=false;
 for(let i=0;i<250;i++)downgraded=q.observe(40)||downgraded;
 assert.equal(downgraded,true);
 assert.equal(q.tier,'balanced');
 assert.equal(q.mode,'auto');
});
test('AUTO upgrades only after long stable delivery and respects cooldown/manual setting',()=>{
 const q=new QualityManager({device:{deviceMemory:2,hardwareConcurrency:2}});
 assert.equal(q.tier,'performance');
 for(let i=0;i<500;i++)q.observe(16.667);
 assert.equal(q.tier,'performance','8s of stability should not promote');
 for(let i=0;i<1700;i++)q.observe(16.667);
 assert.ok(['balanced','high'].includes(q.tier),'37s of stability promotes at least once');
 q.setMode('performance');for(let i=0;i<3000;i++)q.observe(16.667);
 assert.equal(q.tier,'performance','manual setting must never be overridden');
 const state=q.snapshot();assert.equal(state.mode,'performance');assert.ok(state.fps>55);
});
test('fixed simulation keeps comparable distance at 30, 60 and 120Hz display refresh',()=>{
 const run=(hz)=>{
  const c=new FixedStepClock();let count=0,distance=0;
  c.reset(0);
  for(let i=1;i<=hz*3;i++)c.advance(i*1000/hz,true,dt=>{count++;distance+=370*dt;});
  return {count,distance};
 };
 const a=run(30),b=run(60),c=run(120);
 assert.equal(a.count,b.count);assert.equal(b.count,c.count);
 assert.ok(Math.abs(a.distance-1110)<.01);
});
test('frame clock discards long background stalls instead of teleporting player',()=>{
 const c=new FixedStepClock();let steps=0;c.reset(0);
 c.advance(16.667,true,()=>steps++);const before=steps;
 let result=c.advance(6000,true,()=>steps++);
 assert.ok(steps-before<=6);assert.ok(result.dropped>5);
 result=c.advance(6100,false,()=>steps++);
 assert.equal(result.steps,0);
 c.reset(6500);result=c.advance(6516.667,true,()=>steps++);
 assert.equal(result.steps,1);
});
test('frame clock halts catch-up when a hit ends the run',()=>{
 const c=new FixedStepClock();c.reset(0);let updates=0;
 c.advance(100,true,()=>{updates++;return false;});
 assert.equal(updates,1);
});
