const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME}=require('../src/core/config.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {GravityShift,WARNING_SECONDS,SHIFT_SECONDS}=require('../src/gameplay/gravity-shift.js');
const REALITY=require('../src/gameplay/reality-engine.js');

test('Reality is a separate deterministic, curated 90s mode with two safe fold windows',()=>{
  const a=REALITY.createPlan({playerX:340}),b=REALITY.createPlan({playerX:340});
  assert.deepEqual(a,b);assert.equal(a.duration,90);
  assert.equal(a.id,'REALITY-001');assert.equal(a.revision,1);
  assert.ok(REALITY.validatePlan(a),'the approved course must validate');
  assert.equal(a.obstacles.length,50);assert.equal(a.gaps.length,2);
  assert.deepEqual(REALITY.FOLDS.map(x=>[x.at,x.ceiling]),[[34,true],[55,false]]);
  assert.ok(a.obstacles.every(o=>['jump','duck'].includes(o.type)));
  for(const fold of REALITY.FOLDS){
    assert.ok(a.obstacles.every(o=>Math.abs(o.time-fold.at)>=2.4));
    assert.ok(a.gaps.every(g=>Math.abs(g.time-fold.at)>=3.15));
  }
  const shifted=REALITY.createPlan({playerX:410});
  assert.deepEqual(shifted.obstacles.map((x,i)=>x.worldX-a.obstacles[i].worldX),
    Array(50).fill(70));
  assert.deepEqual(shifted.gaps.map((x,i)=>x.start-a.gaps[i].start),
    Array(2).fill(70));
});

test('real gaps and every hurdle obey the shared terrain and movement budget',()=>{
  const p=REALITY.createPlan(),t=new TerrainSystem();
  REALITY.installTerrain(t,p,515);
  assert.equal(t.gaps.length,2);
  assert.equal(t.segments.filter(s=>s.type==='slope').length,0);
  for(const [i,g] of p.gaps.entries()){
    assert.equal(t.gapAt(g.start+3),t.gaps[i]);
    assert.equal(t.groundAt(g.start+g.width/2),null);
    const s=GAME.speedAt(g.time,1);
    assert.ok(g.width/s>.36&&g.width/s<.41);
  }
  for(const [i,o] of p.obstacles.entries()){
    assert.ok(t.canSpawnObstacle(o.worldX,o.width,GAME.speedAt(o.time,1)),
      'the real terrain planner should accept obstacle at '+o.time);
    if(!i)continue;
    const old=p.obstacles[i-1],flight=Math.abs(2*GAME.jumpVelocity/GAME.gravity);
    const recovery=old.type==='jump'?flight:GAME.duckDuration+GAME.duckRecovery;
    const gap=Math.max(1.04,recovery+(old.width+36)/GAME.speedAt(old.time,1)+.14);
    assert.ok(o.time-old.time+1e-6>=gap,'physical timing for obstacle '+o.time);
  }
  const badGap={...p,gaps:[{...p.gaps[0],width:1000},...p.gaps.slice(1)]};
  assert.equal(REALITY.validatePlan(badGap),false);
  const badFold={...p,obstacles:p.obstacles.map((o,i)=>
    i===19?{...o,time:34}:o)};
  assert.equal(REALITY.validatePlan(badFold),false);
});

test('World Fold uses existing safe Gravity Shift physics, no Arcade auto-return',()=>{
  const engine=new REALITY.RealityEngine(),gravity=new GravityShift();
  let begins=0,completes=0,warnings=0;
  for(let step=1;step<=90*60;step++){
    const t=step/60;
    const event=engine.tick(1/60,{time:t,gravity,safe:true});
    if(event==='fold_warning')warnings++;
    if(event==='fold_begin')begins++;
    if(event==='fold_complete')completes++;
    if(t>36&&t<50)assert.equal(gravity.ceiling,true,'first fold reaches the ceiling');
    if(t>58)assert.equal(gravity.ceiling,false,'second fold returns to floor');
  }
  assert.equal(warnings,2);assert.equal(begins,2);assert.equal(completes,2);
  assert.equal(engine.foldsCompleted,2);
  assert.equal(gravity.count,2,'not automatically returned in the middle');
  assert.equal(engine.sentinelTriggered,true);
  const blocked=new GravityShift(),r2=new REALITY.RealityEngine();
  r2.tick(1/60,{time:34,gravity:blocked,safe:false});
  assert.equal(blocked.pending,true);
  r2.tick(WARNING_SECONDS+.2,{time:35,gravity:blocked,safe:false});
  assert.equal(blocked.ceiling,false,'unsafe runway is never flipped');
  assert.equal(r2.tick(.016,{time:35.1,gravity:blocked,safe:true}),'fold_begin');
  assert.equal(r2.tick(SHIFT_SECONDS+.01,{time:35.7,gravity:blocked,safe:true}),'fold_complete');
});

test('Sentinel is non-collidable scenery; Symphony triggers on real clears only',()=>{
  const e=new REALITY.RealityEngine(),g=new GravityShift();
  const shapes=[];
  const ctx={
    save(){},restore(){},translate(){},scale(){},beginPath(){},
    moveTo(){},lineTo(){},closePath(){},fill(){shapes.push('fill')},
    stroke(){shapes.push('stroke')},fillRect(){shapes.push('bar')},
    fillText(x){shapes.push(x)}
  };
  e.onClear({time:60,protectedClear:true});
  assert.equal(e.resonance,0);assert.equal(e.successfulClears,0);
  e.onClear({time:66,precision:true});e.onClear({time:67,master:true});
  assert.equal(e.successfulClears,2);assert.equal(e.sentinelClears,2);
  assert.ok(e.resonance>.4);
  e.drawBackdrop(ctx,{time:65,width:900,height:520,quality:{density:.4}});
  assert.ok(shapes.includes('fill'),'Sentinel has geometry');
  assert.ok(shapes.includes('bar'),'Symphony lights environment');
  assert.ok(!('damage' in e)&&!('spawnObstacle' in e),
    'scenery has no hitbox or additional spawner');
  e.tick(.5,{time:67,gravity:g,safe:true});
  assert.ok(e.resonance<.57);
});

test('Reality records never reuse Arcade or original Trial personal best',()=>{
  const data={chromaRushTrialsV2:'{"bestScore":123456}',chromaRushArcadeV1:'{"bestScore":654321}'};
  const store={getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v}};
  const records=new REALITY.RealityRecords(store);
  assert.equal(records.bestScore,0);
  assert.equal(records.finish({score:9000,completed:false}).newBest,false);
  assert.equal(records.bestScore,0);
  assert.equal(records.finish({score:9000,completed:true}).newBest,true);
  assert.equal(records.bestScore,9000);
  assert.equal(new REALITY.RealityRecords(store).bestScore,9000);
  assert.equal(data.chromaRushTrialsV2,'{"bestScore":123456}');
  assert.equal(data.chromaRushArcadeV1,'{"bestScore":654321}');
  assert.notEqual(REALITY.KEY,'chromaRushTrialsV2');
});

test('Reality lives only in the opt-in Trials drawer, Arcade and Mastery retain distinct branches',()=>{
  const root=path.join(__dirname,'..');
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const gravity=fs.readFileSync(path.join(root,'src/gameplay/gravity-shift.js'),'utf8');
  assert.match(html,/id="reality-start-btn"/);
  assert.match(html,/id="reality-export-btn"/);
  assert.match(html,/src\/gameplay\/reality-engine\.js\?v=reality-engine-1\.0/);
  assert.ok(html.indexOf('src/gameplay/reality-engine.js')<html.indexOf('src/gameplay/game.js'));
  assert.match(game,/requestedMode==='reality'&&realityModule/);
  assert.match(game,/requestedMode==='trial'&&trialsModule/);
  assert.match(game,/runMode==='reality'\?realityModule:trialsModule/);
  assert.match(game,/if\(!fixedCourse\(\)\)terrainDirector\.prepare/);
  assert.match(game,/if\(!fixedCourse\(\)&&gravityShift\.requestForZone/);
  assert.match(game,/const shieldEvents=fixedCourse\(\)\?\{\}:shieldCores\.tick/);
  assert.match(game,/reality\.drawBackdrop\(ctx/);
  assert.match(game,/reality\.onClear\(\{time,precision,master:graded\.master\}\)/);
  assert.match(game,/runMode==='reality'\?\s*reality\.tick/);
  assert.match(gravity,/requestScripted\(ceiling\)/);
  assert.match(gravity,/autoReturn=true/);
});
