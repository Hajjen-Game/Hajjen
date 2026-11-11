const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME}=require('../src/core/config.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const OLD=require('../src/gameplay/reality-engine.js');
const R=require('../src/gameplay/reality-engine-2.0.js');

test('Reality 002 is new gameplay: two collidable route heights, not scripted Gravity Shift',()=>{
  const plan=R.createPlan({playerX:340});
  assert.equal(R.ID,'REALITY-002');assert.equal(R.COURSE_REVISION,2);
  assert.equal(R.DURATION,90);assert.equal(R.KEY,'chromaRushRealityV2');
  assert.notEqual(R.KEY,OLD.KEY);assert.ok(R.validatePlan(plan));
  assert.deepEqual(plan,R.createPlan({playerX:340}),'full deterministic geometry');
  assert.ok(plan.obstacles.some(o=>o.route==='upper'));
  assert.ok(plan.obstacles.some(o=>o.route==='lower'));
  assert.deepEqual(R.PHASES.map(x=>x.name),['SCAN','REWRITE','OVERLOAD']);
  assert.equal(plan.obstacles.filter(o=>o.bossPhase).length,17);
  assert.ok(plan.obstacles.every(o=>!o.type.includes('dash')));
  assert.deepEqual(R.createPlan({playerX:400}).markers,
    Object.fromEntries(Object.entries(plan.markers).map(([k,v])=>[k,v+60])));
});

test('both physical route surfaces remain continuous, actually different, and merge safely',()=>{
  const plan=R.createPlan(),high=new TerrainSystem(),low=new TerrainSystem();
  R.installTerrain(high,plan,515,'upper');
  R.installTerrain(low,plan,515,'lower');
  const m=plan.markers;
  assert.equal(high.groundAt(m.start-1),515);
  assert.equal(high.groundAt(m.crest),345);
  assert.equal(high.groundAt(m.descent-1),345);
  assert.equal(high.groundAt(m.end),515);
  assert.equal(low.groundAt(m.crest),515);
  assert.equal(high.groundAt(m.start),low.groundAt(m.start));
  assert.equal(high.groundAt(m.end),low.groundAt(m.end));
  assert.equal(high.segments.filter(s=>s.type==='slope').length,2);
  assert.equal(low.segments.filter(s=>s.type==='slope').length,0);
  assert.equal(high.gaps.length,2);
  for(const terrain of [high,low])for(const gap of plan.gaps){
    assert.equal(terrain.groundAt(gap.start+gap.width/2),null,
      'the existing real collision gap persists on both paths');
  }
  for(const route of ['lower','upper']){
    const terrain=route==='upper'?high:low;
    for(const o of plan.obstacles.filter(o=>!o.route||o.route===route)){
      assert.ok(terrain.canSpawnObstacle(o.worldX,o.width,GAME.speedAt(o.time,1)),
        'the actual real terrain clearance checks must accept '+o.time+' '+route);
    }
  }
});

test('jump is a real input-controlled route choice, with a safe automatic lower default',()=>{
  const plan=R.createPlan(),terrain=new TerrainSystem(),engine=new R.RealityEngine();
  R.installTerrain(terrain,plan,515);
  assert.equal(engine.onJump({time:29.8,grounded:true,terrain,plan}),false);
  assert.equal(engine.onJump({time:30.5,grounded:false,terrain,plan}),false);
  assert.equal(engine.onJump({time:30.5,grounded:true,terrain,plan}),true);
  assert.equal(engine.route,'upper');assert.equal(engine.upperChoices,1);
  assert.equal(terrain.groundAt(plan.markers.crest),345);
  assert.equal(engine.routeAllows('upper'),true);
  assert.equal(engine.routeAllows('lower'),false);
  assert.equal(engine.routeAllows(),true);
  assert.equal(engine.onJump({time:31.6,grounded:true,terrain,plan}),false,
    'route is locked after choice');
  const oldGap=terrain.gaps[0];assert.equal(terrain.markGap(oldGap,false),true);
  R.installTerrain(terrain,plan,515,'upper');
  assert.equal(terrain.gaps[0].resolved,true,'route rebuild preserves gap progress');
  const alt=new R.RealityEngine(),t2=new TerrainSystem();
  R.installTerrain(t2,plan,515);
  assert.equal(alt.tick(1/60,{time:32.98,terrain:t2,plan}),null);
  const event=alt.tick(1/60,{time:33.02,terrain:t2,plan});
  assert.equal(event.type,'route_selected');assert.equal(event.route,'lower');
  assert.equal(alt.route,'lower');assert.equal(t2.groundAt(plan.markers.crest),515);
});

test('Sentinel attack phases own real obstacles, award armor damage on achieved clears',()=>{
  const engine=new R.RealityEngine(),plan=R.createPlan(),terrain=new TerrainSystem();
  R.installTerrain(terrain,plan,515);
  engine.tick(.016,{time:33.1,terrain,plan});
  const events=[];
  for(let second=60;second<90;second+=.016){
    const event=engine.tick(.016,{time:second,terrain,plan});
    if(event)events.push(event);
    for(const o of plan.obstacles.filter(o=>o.bossPhase&&
      o.time>=second-.008&&o.time<second+.008)){
      engine.onClear({time:o.time,precision:true,bossPhase:o.bossPhase});
    }
  }
  assert.deepEqual(engine.phaseClears,[5,5,7]);
  assert.deepEqual(engine.phaseResults,[true,true,true]);
  assert.equal(engine.bossHealth,0);assert.equal(engine.bossDefeated,true);
  assert.ok(events.filter(e=>e.type==='boss_armor_break').length===3);
  assert.ok(events.some(e=>e.type==='boss_defeated'));
  assert.ok(engine.resonance>=0);
});

test('boss damage is based on real successes; missed phase stops armor break',()=>{
  const e=new R.RealityEngine(),plan=R.createPlan(),terrain=new TerrainSystem();
  R.installTerrain(terrain,plan,515);
  e.tick(.016,{time:33.2,terrain,plan});
  for(const o of plan.obstacles.filter(o=>o.bossPhase===1)){
    if(o.time<65)e.onBossHit(1);
    else e.onClear({time:o.time,bossPhase:1});
  }
  e.tick(.016,{time:69.5,terrain,plan});
  assert.equal(e.phaseResults[0],false);
  assert.equal(e.bossHealth,3);
  for(const o of plan.obstacles.filter(o=>o.bossPhase===2))
    e.onClear({time:o.time,bossPhase:2});
  e.tick(.016,{time:78.1,terrain,plan});
  assert.equal(e.phaseResults[1],true);
  assert.equal(e.bossHealth,2);
  e.onClear({time:83,protectedClear:true,bossPhase:3});
  assert.equal(e.phaseClears[2],0,'free invulnerable clears cannot damage the boss');
});

test('route and boss visuals reflect actual state, preserve the hitbox-only renderer',()=>{
  const e=new R.RealityEngine(),p=R.createPlan(),t=new TerrainSystem();
  R.installTerrain(t,p,515);
  const calls=[];
  const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},
    closePath(){},stroke(){calls.push('stroke')},fill(){calls.push('fill')},
    scale(){},translate(){},rotate(){},fillRect(){calls.push('rect')},
    strokeRect(){},fillText(x){calls.push(x)},setLineDash(){}};
  e.drawRoute(ctx,{plan:p,distance:p.markers.start-400,time:32,width:1280,baseY:515});
  assert.ok(calls.includes('stroke'));
  e.onJump({time:31,terrain:t,plan:p,grounded:true});
  e.drawRoute(ctx,{plan:p,distance:p.markers.crest-300,time:38,width:1280,baseY:515});
  assert.ok(calls.filter(x=>x==='stroke').length>=2);
  const enemy=p.obstacles.find(o=>o.bossPhase);
  const before=calls.filter(x=>x==='stroke').length;
  e.drawAttack(ctx,{obstacle:{...enemy,groundY:515,x:500},box:{x:500,y:450,w:enemy.width,h:65}});
  assert.ok(calls.filter(x=>x==='stroke').length>before,
    'boss attacks have clear geometric signatures, not unreadable gate text');
  e.drawBackdrop(ctx,{time:65,width:1280,height:720,quality:{density:1}});
  assert.ok(calls.includes('fill'),'drawn enemy is larger than a mere text icon');
  e.drawOverlay(ctx,{time:65,width:1280,height:720});
  assert.ok(calls.some(x=>x.includes?.('SENTINEL')));
});

test('separate Reality 002 PBs never overwrite Arcade, Mastery or the old Reality 001',()=>{
  const data={
    chromaRushTrialsV2:'{"bestScore":10000}',
    chromaRushRealityV1:'{"bestScore":20000}',
    chromaRushArcadeV1:'{"bestScore":30000}'
  };
  const storage={getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v}};
  const records=new R.RealityRecords(storage);
  records.finish({score:5000,completed:false});
  assert.equal(records.bestScore,0);
  records.finish({score:6000,completed:true});
  assert.equal(new R.RealityRecords(storage).bestScore,6000);
  assert.equal(JSON.parse(data.chromaRushRealityV1).bestScore,20000);
  assert.equal(JSON.parse(data.chromaRushTrialsV2).bestScore,10000);
  assert.equal(JSON.parse(data.chromaRushArcadeV1).bestScore,30000);
});

test('Reality 002 no longer calls Gravity Shift in gameplay but leaves Arcade unchanged',()=>{
  const root=path.join(__dirname,'..');
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/src\/gameplay\/reality-engine-2\.0\.js\?v=reality-engine-2\.0/);
  assert.ok(html.indexOf('src/gameplay/reality-engine-2.0.js')<
    html.indexOf('src/gameplay/game.js'));
  assert.match(game,/realityModule\.canLandUpper\(/);
  assert.match(game,/reality\.captureUpper\(/);
  assert.match(game,/reality\.routeAllows\(fixed\.route\)/);
  assert.match(game,/terrain\.groundAt\(fixed\.worldX\)/);
  assert.match(game,/reality\.onBossHit\(o\.bossPhase\)/);
  assert.match(game,/reality\.drawAttack\(ctx/);
  assert.match(game,/reality\.drawRoute\(ctx/);
  assert.match(game,/const gravityEvent=fixedCourse\(\)\?null:/);
  assert.match(game,/if\(!fixedCourse\(\)&&gravityShift\.requestForZone/);
  assert.match(game,/reality\.bossDefeated/);
});
