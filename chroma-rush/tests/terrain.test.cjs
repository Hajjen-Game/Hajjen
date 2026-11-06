const test=require('node:test');
const assert=require('node:assert/strict');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {GAME,TERRAIN}=require('../src/core/config.js');
function generator(seed=321){let n=seed;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
function sections(zone,seed=321,speed=800){const terrain=new TerrainSystem({random:generator(seed)});for(let x=2500;x<=24000;x+=1000)terrain.ensure(x,zone,speed);return terrain}

test('zone 1 stays flat; slopes start zone 2 and voids never appear until zone 3',()=>{
  for(const z of [1,2,3]){
    const t=sections(z);assert.ok(t.segments.length>20);
    assert.equal(t.segments[0].start,0);
    for(let i=1;i<t.segments.length;i++) assert.ok(Math.abs(t.segments[i].start-t.segments[i-1].end)<1e-6);
    if(z===1)assert.ok(t.segments.every(s=>s.type==='flat'));
    if(z===2){assert.ok(t.segments.some(s=>s.type==='slope'));assert.equal(t.gaps.length,0)}
    if(z===3)assert.ok(t.gaps.length>0);
  }
});
test('slope height is continuous and limited; gap has null ground',()=>{
  const t=sections(3);
  for(const s of t.segments){
    if(s.type==='slope'){
      assert.ok(Math.abs(t.groundAt(s.start)-s.y0)<1e-5);
      assert.ok(Math.abs(t.groundAt(s.end-.01)-s.y1)<.03);
      assert.ok(Math.abs(s.y1-t.baseY)<=TERRAIN.maxOffset);
      assert.ok(Math.abs(s.y1-s.y0)<=TERRAIN.maxHeightChange);
    }
    if(s.type==='gap'){
      assert.equal(t.groundAt(s.start+s.end>>1),null);
      assert.equal(t.groundAt((s.start+s.end)*.5),null);
      assert.equal(t.gapAt((s.start+s.end)*.5),s);
    }
  }
});
test('gaps have jumpable widths, runway and landing flats',()=>{
  const speed=950,t=sections(3,777,speed);
  assert.ok(t.gaps.length>0);
  const airTime=2*Math.abs(GAME.jumpVelocity)/GAME.gravity;
  for(const gap of t.gaps){
    const width=gap.end-gap.start;
    assert.ok(width>=TERRAIN.minGapWidth&&width<=TERRAIN.maxGapWidth);
    assert.ok(width/speed<airTime*.7);
    const next=t.segments[t.segments.indexOf(gap)+1];
    assert.ok(next&&next.type==='flat'&&next.end-next.start>=TERRAIN.minLandingFlat);
    assert.equal(t.canSpawnObstacle(gap.start-80,65,speed),false);
    assert.equal(t.canSpawnObstacle(gap.end+60,65,speed),false);
  }
});
test('randomness is reproducible under injected RNG, not a handcrafted level',()=>{
  const a=sections(3,56),b=sections(3,56),c=sections(3,57);
  const serial=t=>t.segments.map(s=>[s.type,Math.round(s.start),Math.round(s.end),Math.round(s.y1)]);
  assert.deepEqual(serial(a),serial(b));assert.notDeepEqual(serial(a),serial(c));
});
test('no gap is rewarded twice or simultaneously counted as missed',()=>{
  const t=sections(3),gap=t.gaps[0];
  assert.equal(t.markGap(gap,false),true);
  assert.equal(t.markGap(gap,true),false);
  assert.equal(gap.missed,false);
});
test('late-speed pruning keeps gap metadata through a full jump',()=>{
  const speed=2400,t=sections(3,60,speed);const gap=t.gaps[0];
  t.prune(gap.end+speed*.95,speed);
  assert.ok(t.visibleGaps(gap.end-20,gap.end+10).includes(gap));
});
test('obstacles only spawn on flat ground, not on slopes, gaps or their approaches',()=>{
  const t=sections(3,113,750);
  for(const s of t.segments){
    if(s.type==='slope'||s.type==='gap'){
      assert.equal(t.canSpawnObstacle((s.start+s.end)*.5,55,750),false);
    }
  }
  assert.equal(t.canSpawnObstacle(450,55,370),true);
});
test('Director postpones forbidden hazards instead of counting an impossible spawn',()=>{
  const {AdaptiveRushDirector}=require('../src/director/adaptive-director.js');
  const d=new AdaptiveRushDirector(()=>.45);
  let attempts=0;
  for(let i=0;i<140;i++)d.tick(.05,{zone:3,speed:650,hp:100},()=>{attempts++;return false});
  assert.ok(attempts>=4);
  assert.equal(d.totalSpawned,0);
  assert.ok(d.pending.length>0);
  const accepted=[];
  for(let i=0;i<90;i++)d.tick(.05,{zone:3,speed:650,hp:100},step=>{accepted.push(step);return true});
  assert.ok(accepted.length>=1);
  assert.ok(d.totalSpawned>=1);
});
test('long runs prune old geometry without losing nearby gaps',()=>{
  const t=new TerrainSystem({random:generator(55)}),speed=2100;
  for(let x=0;x<65000;x+=1000){t.ensure(x+2000,8,speed);t.prune(x,speed)}
  assert.ok(t.segments.length<40,'segment list should stay bounded');
  assert.ok(t.gaps.length<12,'gap metadata should stay bounded');
  assert.ok(t.groundAt(64500)!==undefined);
});
