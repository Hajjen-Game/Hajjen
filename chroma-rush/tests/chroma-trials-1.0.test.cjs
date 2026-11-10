const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME}=require('../src/core/config.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const TRIAL=require('../src/gameplay/chroma-trials.js');
const {TrialRecords,createPlan,validatePlan,installTerrain}=TRIAL;
const root=path.join(__dirname,'..');

test('Trial 001 is a hand-audited, deterministic 90s course with no adaptive RNG',()=>{
  assert.equal(TRIAL.ID,'001');assert.equal(TRIAL.DURATION,90);
  const a=createPlan({playerX:340}),b=createPlan({playerX:340});
  assert.ok(validatePlan(a));
  assert.deepEqual(a,b);
  assert.ok(Object.isFrozen(a));
  assert.equal(a.obstacles.length,28);
  assert.equal(a.gaps.length,3);
  assert.equal(new Set(a.obstacles.map(o=>o.type)).size,2);
  assert.ok(a.obstacles.every(o=>o.time<90&&['jump','duck'].includes(o.type)));
  assert.ok(!a.obstacles.some(o=>o.mechanicIntro||o.type.includes('dash')));
  assert.equal(a.seed,TRIAL.SEED);
  assert.equal(a.signature,b.signature);
  const moved=createPlan({playerX:415});
  assert.deepEqual(moved.obstacles.map((o,i)=>o.worldX-a.obstacles[i].worldX),
    Array(a.obstacles.length).fill(75));
  assert.deepEqual(moved.gaps.map((o,i)=>o.start-a.gaps[i].start),
    Array(a.gaps.length).fill(75));
  assert.deepEqual(moved.obstacles.map(o=>[o.type,o.time,o.width,o.height]),
    a.obstacles.map(o=>[o.type,o.time,o.width,o.height]));
});

test('fixed seed preserves layout across graphics/FPS/damage and supports later seeded trials',()=>{
  const a=createPlan({playerX:320,seed:TRIAL.SEED});
  const b=createPlan({playerX:320,seed:TRIAL.SEED});
  const c=createPlan({playerX:320,seed:TRIAL.SEED+1});
  assert.deepEqual(a,b);
  assert.notEqual(a.signature,c.signature);
  assert.deepEqual(a.obstacles.map(o=>[o.time,o.type,o.worldX,o.width]),
    c.obstacles.map(o=>[o.time,o.type,o.worldX,o.width]),
    'fixed authored geometry and type schedule are independent of cosmetic height seed');
  assert.ok(validatePlan(c));
  for(const o of a.obstacles){
    const speed=GAME.speedAt(o.time,Math.floor(o.time/GAME.zoneSeconds)+1);
    const x=Math.max(0,Math.min(1,(speed-550)/1650));
    const width=71+15*Math.floor(x*x*(3-2*x)*10+1e-9);
    assert.equal(o.width,width,'identical 71+ per-speed size tiers as Arcade');
    assert.ok(o.height>= (o.type==='jump'?59:115));
    assert.ok(o.height<= (o.type==='jump'?73:158));
  }
});

test('fairness audit rejects overlaps and keeps enough time around three short gaps',()=>{
  const plan=createPlan();
  assert.equal(validatePlan(plan),true);
  for(let i=0;i<plan.obstacles.length;i++){
    const o=plan.obstacles[i],prev=plan.obstacles[i-1];
    if(prev)assert.ok(o.time-prev.time>=2.5);
    for(const g of plan.gaps)assert.ok(Math.abs(o.time-g.time)>=1.6,
      'give >=1.6s breathing room around gap');
  }
  for(const g of plan.gaps){
    const speed=GAME.speedAt(g.time,1);
    assert.ok(g.width/speed>=.28&&g.width/speed<=.34);
    assert.ok(g.time>30&&g.time<80);
  }
  const corrupted={...plan,gaps:[{...plan.gaps[0],width:2000},...plan.gaps.slice(1)]};
  assert.equal(validatePlan(corrupted),false,'unsafe gap width must fail validation');
  const jammed={...plan,obstacles:[plan.obstacles[0],{...plan.obstacles[1],time:5.8},...plan.obstacles.slice(2)]};
  assert.equal(validatePlan(jammed),false,'clustered obstacles must fail validation');
});

test('Trial installs exactly three physical gaps and no procedural slopes',()=>{
  const t=new TerrainSystem();
  const plan=createPlan({playerX:320});
  installTerrain(t,plan,515);
  assert.equal(t.generated,plan.finish);
  assert.equal(t.gaps.length,3);
  assert.equal(t.segments.length,7);
  assert.equal(t.segments.filter(x=>x.type==='flat').length,4);
  assert.ok(t.segments.every(x=>x.type!=='slope'));
  for(const [i,g] of plan.gaps.entries()){
    assert.equal(t.gapAt(g.start+3),t.gaps[i]);
    assert.equal(t.groundAt(g.start-5),515);
    assert.equal(t.groundAt(g.start+g.width/2),null);
    assert.equal(t.groundAt(g.start+g.width+5),515);
    assert.equal(t.gaps[i].resolved,false);
    assert.equal(t.gaps[i].missed,false);
  }
  assert.equal(t.groundAt(plan.finish-500),515);
  assert.equal(t.groundAt(400),515);
  assert.ok(t.canSpawnObstacle(plan.obstacles[0].worldX,
    plan.obstacles[0].width,GAME.speedAt(5.4,1)));
});

test('Trial records persist completed personal best ONLY, separate from Arcade',()=>{
  const storeData={chromaRushArcadeV1:'{"bestScore":500000}'};
  const storage={getItem:k=>storeData[k]??null,setItem:(k,v)=>{storeData[k]=v}};
  const t=new TrialRecords(storage);
  assert.equal(t.bestScore,0);
  let r=t.finish({score:3500,completed:false});
  assert.equal(r.newBest,false);
  assert.equal(t.bestScore,0);
  r=t.finish({score:5000,completed:true});
  assert.equal(r.bestScore,5000);assert.equal(r.newBest,true);
  r=t.finish({score:4800,completed:true});
  assert.equal(r.bestScore,5000);assert.equal(r.newBest,false);
  const restored=new TrialRecords(storage);
  assert.equal(restored.bestScore,5000);
  assert.equal(restored.completions,2);
  assert.equal(restored.snapshot().attempts,3);
  assert.equal(storeData.chromaRushArcadeV1,'{"bestScore":500000}',
    'Trial never reads or overwrites Arcade achievements');
  assert.match(storeData[TRIAL.KEY],/"bestScore":5000/);
  const blocked=new TrialRecords({getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}});
  assert.equal(blocked.finish({score:12,completed:true}).bestScore,12);
});

test('Trial is integrated into the existing UI/physics without changing Arcade director path',()=>{
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(game,/trialPlan=runMode==='trial'\?trialsModule\.createPlan/);
  assert.match(game,/trialsModule\.installTerrain\(terrain,trialPlan,floorY\)/);
  assert.match(game,/if\(!trialPlan\)terrainDirector\.prepare/);
  assert.match(game,/}else terrainDirector\.tick\(dt,/);
  assert.match(game,/const gravityEvent=runMode==='trial'\?null:gravityShift\.tick/);
  assert.match(game,/if\(runMode!=='trial'&&gravityShift\.requestForZone\(zone\)\)/);
  assert.match(game,/const shieldEvents=runMode==='trial'\?\{\}:shieldCores\.tick/);
  assert.match(game,/if\(runMode==='trial'&&time>=trialsModule\.DURATION-1e-6&&status==='running'\)endRun\(\)/);
  assert.match(game,/replay\.start\(\{practice:runMode!=='arcade'/);
  assert.match(game,/trialRecords\.finish\(\{score:total,/);
  assert.match(game,/if\(runMode==='arcade'\)\{/);
  assert.match(html,/id="trial-toggle-btn"/);
  assert.match(html,/id="menu-trials"/);
  assert.match(html,/id="trial-start-btn"/);
  assert.match(html,/id="trial-result-stats"/);
  assert.match(html,/src\/gameplay\/chroma-trials\.js\?v=chroma-trials-1\.0/);
  assert.ok(html.indexOf('src/gameplay/chroma-trials.js')<
    html.indexOf('src/gameplay/game.js'));
  assert.match(html,/chroma-trials-1\.0/);
  assert.match(css,/#menu #menu-trials/);
  assert.match(css,/#trial-timer/);
  assert.match(css,/#gameover \.trial-result-stats/);
});