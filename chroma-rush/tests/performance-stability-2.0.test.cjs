const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {QualityManager,PROFILES}=require('../src/performance/quality-manager.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {GAME}=require('../src/core/config.js');
const root=path.join(__dirname,'..');

test('manual HIGH preserves its full premium rendering profile regardless of frame pacing',()=>{
  const q=new QualityManager({device:{deviceMemory:2,hardwareConcurrency:2}});
  q.setMode('high');
  const original=q.profile;
  for(let i=0;i<1200;i++)q.observe(48,{total:32,background:12,terrain:8,actors:8,effects:4});
  q.suspend();
  for(let i=0;i<1200;i++)q.observe(16.667);
  assert.equal(q.mode,'high');
  assert.equal(q.tier,'high');
  assert.strictEqual(q.profile,original);
  assert.strictEqual(q.profile,PROFILES.high);
  assert.equal(q.profile.glow,1);
  assert.equal(q.profile.particles,1);
  assert.equal(q.profile.density,1);
  assert.equal(q.profile.dprCap,2);
});

test('AUTO eventually restores HIGH on a stable device with unknown browser hardware hints',()=>{
  const q=new QualityManager({device:{}});
  assert.equal(q.tier,'balanced');
  for(let i=0;i<180;i++)q.observe(16.667);
  assert.equal(q.tier,'balanced','do not upgrade on only 3 seconds of smooth play');
  let upgraded=false;
  for(let i=0;i<1800;i++)if(q.observe(16.667))upgraded=true;
  assert.equal(upgraded,true);
  assert.equal(q.tier,'high');
  assert.strictEqual(q.profile,PROFILES.high);
});

test('AUTO avoids reacting to transient stalls and resets its sampling window on pause',()=>{
  const q=new QualityManager({device:{deviceMemory:8,hardwareConcurrency:8}});
  for(let i=0;i<120;i++)q.observe(40);
  assert.equal(q.tier,'high','a brief slow period should not trigger a downgrade');
  const before=q.tier;
  q.suspend();
  assert.equal(q.tier,before,'suspension never silently changes quality');
  assert.equal(q.history.length,0);
  assert.equal(q.slowSeconds,0);
  assert.equal(q.frameP90,0);
  for(let i=0;i<150;i++)q.observe(16.667);
  assert.equal(q.tier,'high');
});

test('AUTO ring buffer is bounded and stabilizes a long late-session frame window',()=>{
  const q=new QualityManager({device:{deviceMemory:2,hardwareConcurrency:2}});
  q.setMode('high'); // Never trigger automatic profile switches.
  for(let i=0;i<5000;i++)q.observe(16.667);
  assert.equal(q.history.length,180);
  assert.ok(q.cursor>=0&&q.cursor<180);
  assert.ok(q.fps>59);
  assert.ok(q.frameP90<20);
  assert.equal(q.mode,'high');
});

test('terrain fast lookup agrees with a linear oracle at all real segment boundaries',()=>{
  let seed=19;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const t=new TerrainSystem({random});
  t.ensure(90000,18,GAME.speedAt(180,16),()=>({allowGap:true,
    gapChance:.29,slopeChance:.45,maxHeightChange:60,phase:'PEAK',leadSeconds:1}));
  const linear=x=>{
    if(x<0)return t.segments[0];
    for(const s of t.segments)if(x>=s.start&&x<s.end)return s;
    return x>=t.generated?t.segments[t.segments.length-1]:null;
  };
  for(const s of t.segments){
    for(const x of [s.start-0.001,s.start,s.start+0.001,
      (s.start+s.end)/2,s.end-0.001,s.end,s.end+0.001]){
      assert.strictEqual(t._segmentAt(x),linear(x),
        'world-space terrain boundaries must retain exact collider semantics at '+x);
      assert.equal(t.groundAt(x),linear(x)?.type==='gap'?null:
        linear(x)===null?null:t.groundAt(x));
    }
  }
  t.prune(65000,900);
  for(const x of [0,1000,40000,64000,65000,t.generated,t.generated+200]){
    assert.strictEqual(t._segmentAt(x),linear(x));
  }
});

test('rendering defers HUD updates until a completed physics frame and skips offscreen hazards',()=>{
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const update=game.slice(game.indexOf('  function update(dt){'),game.indexOf('  function draw(){'));
  assert.doesNotMatch(update,/\n    updateHud\(\);/);
  assert.doesNotMatch(update,/\n    syncSoundButton\(\);/);
  assert.match(game,/if\(status==='running'&&timing\.steps>0\)\{[\s\S]*?updateHud\(\);[\s\S]*?syncSoundButton\(\);/);
  assert.match(game,/if\(o\.x>W\+100\|\|o\.x\+o\.width<-100\)return;/);
  assert.equal(GAME.baseSpeed,370);
});
