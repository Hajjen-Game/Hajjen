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
  assert.equal(a.revision,2);
  assert.equal(a.obstacles.length,57);
  assert.equal(a.gaps.length,4);
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

test('Mastery course fairness rejects unsafe physics timing and preserves recovery around four gaps',()=>{
  const plan=createPlan();
  assert.equal(validatePlan(plan),true);
  for(let i=0;i<plan.obstacles.length;i++){
    const o=plan.obstacles[i],prev=plan.obstacles[i-1];
    if(prev){
      const min=(prev.type==='jump'?Math.abs(2*GAME.jumpVelocity/GAME.gravity):
        GAME.duckDuration+GAME.duckRecovery)+
        (prev.width+36)/GAME.speedAt(prev.time,1)+.15;
      assert.ok(o.time-prev.time+1e-6>=Math.max(1.03,min),
        'at any speed a next input follows the full previous action');
    }
    for(const g of plan.gaps)assert.ok(Math.abs(o.time-g.time)>=1.72,
      'give >=1.72s breathing room around gap');
  }
  for(const g of plan.gaps){
    const speed=GAME.speedAt(g.time,1);
    assert.ok(g.width/speed>=.37&&g.width/speed<=.43);
    assert.ok(g.time>20&&g.time<80);
  }
  const corrupted={...plan,gaps:[{...plan.gaps[0],width:2000},...plan.gaps.slice(1)]};
  assert.equal(validatePlan(corrupted),false,'unsafe gap width must fail validation');
  const jammed={...plan,obstacles:[plan.obstacles[0],{...plan.obstacles[1],time:plan.obstacles[0].time+.2},...plan.obstacles.slice(2)]};
  assert.equal(validatePlan(jammed),false,'clustered obstacles must fail validation');
});

test('Mastery Trial installs exactly four physical gaps and no procedural slopes',()=>{
  const t=new TerrainSystem();
  const plan=createPlan({playerX:320});
  installTerrain(t,plan,515);
  assert.equal(t.generated,plan.finish);
  assert.equal(t.gaps.length,4);
  assert.equal(t.segments.length,9);
  assert.equal(t.segments.filter(x=>x.type==='flat').length,5);
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
    plan.obstacles[0].width,GAME.speedAt(4.4,1)));
});

test('Trial records persist completed personal best ONLY, separate from Arcade',()=>{
  const storeData={chromaRushArcadeV1:'{"bestScore":500000}',
    chromaRushTrialsV1:'{"bestScore":999999,"completions":15}'};
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
  assert.equal(storeData.chromaRushTrialsV1,'{"bestScore":999999,"completions":15}',
    'the new harder Trial must not overwrite records from the easier course');
  assert.equal(TRIAL.KEY,'chromaRushTrialsV2');
  assert.match(storeData[TRIAL.KEY],/"bestScore":5000/);
  const blocked=new TrialRecords({getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}});
  assert.equal(blocked.finish({score:12,completed:true}).bestScore,12);
});

test('Trial is integrated into the existing UI/physics without changing Arcade director path',()=>{
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(game,/trialPlan=fixedCourse\(\)\?courseModule\(\)\.createPlan/);
  assert.match(game,/courseModule\(\)\.installTerrain\(terrain,trialPlan,floorY\)/);
  assert.match(game,/if\(!trialPlan\)terrainDirector\.prepare/);
  assert.match(game,/}else terrainDirector\.tick\(dt,/);
  assert.match(game,/const gravityEvent=fixedCourse\(\)\?null:\s*gravityShift\.tick/);
  assert.match(game,/if\(!fixedCourse\(\)&&gravityShift\.requestForZone\(zone\)\)/);
  assert.match(game,/const shieldEvents=fixedCourse\(\)\?\{\}:shieldCores\.tick/);
  assert.match(game,/if\(fixedCourse\(\)&&time>=courseModule\(\)\.DURATION-1e-6&&status==='running'\)endRun\(\)/);
  assert.match(game,/replay\.start\(\{practice:runMode!=='arcade'/);
  assert.match(game,/records\.finish\(\{score:total,/);
  assert.match(game,/if\(runMode==='arcade'\)\{/);
  assert.match(html,/id="trial-toggle-btn"/);
  assert.match(html,/id="menu-trials"/);
  assert.match(html,/id="trial-start-btn"/);
  assert.match(html,/id="trial-result-stats"/);
  assert.match(html,/src\/gameplay\/chroma-trials\.js\?v=chroma-trials-1\.1-mastery/);
  assert.ok(html.indexOf('src/gameplay/chroma-trials.js')<
    html.indexOf('src/gameplay/game.js'));
  assert.match(html,/chroma-trials-1\.0/);
  assert.match(css,/#menu #menu-trials/);
  assert.match(css,/#trial-timer/);
  assert.match(css,/#gameover \.trial-result-stats/);
});
test('Mastery Trial 1.1 doubles action density with six escalating phrases and varied streaks',()=>{
  const p=createPlan({playerX:340});
  assert.equal(TRIAL.PHRASES.length,6);
  assert.deepEqual(TRIAL.PHRASES.map(x=>x.cadence),[1.65,1.35,1.28,1.25,1.2,1.14]);
  assert.equal(p.obstacles.length,57);
  assert.ok(p.obstacles.length>=2*28);
  assert.equal(p.gaps.length,4);
  assert.equal(p.duration,90);
  assert.ok(p.obstacles[0].time>=4.2&&p.obstacles[0].time<=4.5);
  assert.ok(p.obstacles.at(-1).time<88);
  const stageCounts=TRIAL.PHRASES.map(phrase=>p.obstacles.filter(o=>
    o.time>=phrase.start-1e-6&&
    o.time<=phrase.start+(phrase.actions.length-1)*phrase.cadence+1e-6).length);
  assert.deepEqual(stageCounts,[7,7,10,13,13,7]);
  for(let i=0;i<TRIAL.PHRASES.length-1;i++)
    assert.ok(TRIAL.PHRASES[i].cadence>TRIAL.PHRASES[i+1].cadence,
      'each phase accelerates the action cadence');
  let same=0,alternations=0,run=1,longest=1;
  for(let i=1;i<p.obstacles.length;i++){
    const prev=p.obstacles[i-1],cur=p.obstacles[i];
    if(cur.type===prev.type){same++;run++;longest=Math.max(longest,run)}
    else{alternations++;run=1}
  }
  assert.ok(same>20,'not locked into Jump / Duck alternation');
  assert.ok(alternations>15,'still varied with real movement combos');
  assert.ok(longest>=4&&longest<=6,'clusters of four Jump or Duck, no tedious long repeats');
  assert.ok(validatePlan(p));
});

test('every Mastery obstacle has a flat approach and landing even after gap installation',()=>{
  const plan=createPlan({playerX:340}),t=new TerrainSystem();
  installTerrain(t,plan,515);
  for(const o of plan.obstacles){
    const speed=GAME.speedAt(o.time,1);
    assert.ok(t.canSpawnObstacle(o.worldX,o.width,speed),
      'each scripted obstacle must pass the ACTUAL game terrain clearance contract: '+o.time);
    assert.equal(t.groundAt(o.worldX),515);
  }
  for(const g of plan.gaps){
    const near=plan.obstacles.reduce((closest,o)=>
      Math.min(closest,Math.abs(o.time-g.time)),Infinity);
    assert.ok(near>=1.72);
    const speed=GAME.speedAt(g.time,1);
    assert.ok(g.width<speed*.45,
      'single jump clears the gap; no Dash or Double Jump requirement');
  }
});

test('a tightened unfair segment or widened gap is rejected before a Trial launches',()=>{
  const plan=createPlan({playerX:340});
  const crowded=plan.obstacles.map(o=>({...o}));
  crowded[42].time=crowded[41].time+.2;
  assert.equal(validatePlan({...plan,obstacles:crowded}),false);
  const nearGap=plan.obstacles.map(o=>({...o}));
  nearGap[16].worldX=plan.gaps[0].start+10;
  assert.equal(validatePlan({...plan,obstacles:nearGap}),false);
  const large=plan.gaps.map(x=>({...x}));
  large[1].width=GAME.speedAt(large[1].time,1)*.8;
  assert.equal(validatePlan({...plan,gaps:large}),false);
});
