const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {AdaptiveRushDirector,DASH_REPEAT_SECONDS}=require('../src/director/adaptive-director.js');
const {safeToSpawn,AIR,GROUND}=require('../src/gameplay/dash-hazards.js');
const {PALETTES,GAME}=require('../src/core/config.js');
const {MovementAwareness}=require('../src/director/movement-awareness.js');
const root=path.join(__dirname,'..');

function floorAt(zone){
  // Gravity Shift begins at zone 3 and changes every two zones:
  // 1–2 floor, 3–4 ceiling, 5–6 floor, 7–8 ceiling, etc.
  return zone<3||Math.floor((zone-3)/2)%2===1;
}
function simulate(untilSeconds=14*GAME.zoneSeconds,{hpAt=()=>100,stressAt=()=>0}={}){
  const d=new AdaptiveRushDirector(()=>.47),spawns=[],dt=.05;
  for(let step=0;step<untilSeconds/dt;step++){
    const time=step*dt,zone=1+Math.floor(time/GAME.zoneSeconds);
    const zoneElapsed=time-(zone-1)*GAME.zoneSeconds;
    const surface=floorAt(zone)?'floor':'ceiling';
    const ctx={zone,zoneElapsed,hp:hpAt(time),speed:GAME.speedAt(time,zone),
      surface,gravityPending:false,playerX:320,viewportWidth:1280};
    d.stress=stressAt(time);
    d.tick(dt,ctx,step=>{
      spawns.push({type:step.type,guided:Boolean(step.guided),zone,
        surface,time:d.time,hp:ctx.hp,stress:d.stress});
      return true;
    });
    // A controlled, skilled player makes real clears; no artificial
    // invulnerability or forced Dash successes are needed for the planner.
    if(step>0&&step%30===0)d.registerClear({action:'jump'});
  }
  return {d,spawns,dash:spawns.filter(s=>s.type===AIR||s.type===GROUND)};
}

test('a new special obstacle cannot have its first appearance in ceiling mode',()=>{
  for(const type of [AIR,GROUND]){
    for(const zone of [3,4,5,8,10]){
      assert.equal(safeToSpawn(type,{zone,hp:100,stress:0,
        first:true,guided:true,surface:'ceiling'}),false);
    }
  }
  assert.equal(safeToSpawn(AIR,{zone:5,first:true,surface:'floor'}),true);
  assert.equal(safeToSpawn(GROUND,{zone:5,first:true,surface:'floor'}),true);
  // After the grounded lesson, a known familiar action CAN occur in the sky.
  assert.equal(safeToSpawn(AIR,{zone:8,first:false,guided:true,
    surface:'ceiling',confidence:.38}),true);
});

test('long playtime alone never emits Dash before either family is taught',()=>{
  const d=new AdaptiveRushDirector(()=>.46),seen=[];
  d.phase='PEAK';d.phaseDuration=100;d.time=100;d.spawnCountdown=0;
  d.tick(.08,{zone:2,zoneElapsed:4,hp:100,speed:600,surface:'floor'},
    step=>{seen.push(step.type);return true});
  assert.equal(seen.some(t=>t===AIR||t===GROUND),false);
  assert.equal(d.dashIntroduced.air,false);
  assert.equal(d.dashIntroduced.ground,false);
});

test('new Dash scheduler never displaces a queued Echo lesson',()=>{
  const d=new AdaptiveRushDirector(()=>.45),seen=[];
  d.phase='PEAK';d.phaseDuration=100;d.confidence=.9;d.spawnCountdown=0;
  d.pending=[{type:'echo',pattern:'single-echo',step:1}];
  d.tick(.05,{zone:5,zoneElapsed:4,hp:100,speed:900,playerX:300,
    spawnX:1370,surface:'floor',gravityPending:false},
    step=>{seen.push(step.type);return true});
  assert.deepEqual(seen,['echo']);
  assert.equal(d.echoIntroduced,true);
  assert.equal(d.dashIntroduced.air,false);
});

test('unavailable Dash terrain yields the queue back to regular obstacles',()=>{
  const d=new AdaptiveRushDirector(()=>.47),attempts=[];
  d.echoIntroduced=true;
  d.phase='PEAK';d.phaseDuration=100;d.confidence=.88;d.spawnCountdown=0;
  const ctx={zone:5,zoneElapsed:4,hp:100,speed:700,playerX:300,
    spawnX:1450,surface:'floor',gravityPending:false};
  for(let i=0;i<12;i++){
    d.tick(.28,ctx,step=>{
      attempts.push(step.type);
      return step.type!==AIR;
    });
  }
  assert.ok(attempts.includes(AIR),'attempt a first safe lesson');
  assert.ok(d.dashRetryAfter>0,'suspend after repeated safety vetoes');
  assert.ok(attempts.some(t=>t!==AIR),'ordinary actions continue while deferred');
  assert.equal(d.dashIntroduced.air,false,'never invent a successful lesson');
});

test('a queued first-lesson is withdrawn if the course is now in ceiling mode',()=>{
  const d=new AdaptiveRushDirector(()=>.47),spawned=[];
  d.pending=[{type:AIR,pattern:'single-dash-jump',step:1,guided:true}];
  d.spawnCountdown=0;
  d.phase='PEAK';
  d.tick(.12,{zone:5,zoneElapsed:5,surface:'ceiling',
    hp:100,speed:600,gravityPending:false},x=>{spawned.push(x.type);return true});
  assert.equal(spawned.length,0);
  assert.equal(d.dashIntroduced.air,false);
  assert.equal(d.pending.some(s=>s.type===AIR),false);
});

test('first lessons are postponed from zones 3–4 and introduced separately on floor',()=>{
  const {dash,d}=simulate();
  assert.ok(dash.length>=4,'Dash must recur several times by zone 14');
  const air=dash.find(s=>s.type===AIR);
  const ground=dash.find(s=>s.type===GROUND);
  assert.ok(air&&ground,'both variants must be encountered');
  assert.equal(air.surface,'floor');
  assert.equal(ground.surface,'floor');
  assert.ok(air.zone>=5,'Air Dash must wait for a safe floor after zone 3 ceiling');
  assert.ok(ground.zone>=5,'Ground Dash must wait for a safe floor after zone 4 ceiling');
  assert.ok(ground.time>air.time,'Ground Dash is introduced after Air Dash');
  assert.ok(d.dashIntroduced.air&&d.dashIntroduced.ground);
});

test('Dash returns after the lessons, alternating on safe 24s+ opportunities',()=>{
  const {dash,d}=simulate();
  const firstAir=dash.findIndex(s=>s.type===AIR);
  const firstGround=dash.findIndex(s=>s.type===GROUND);
  assert.ok(firstGround>firstAir);
  const repeats=dash.slice(firstGround+1);
  assert.ok(repeats.length>=2,JSON.stringify(dash));
  assert.ok(repeats.some(s=>s.type===AIR)&&repeats.some(s=>s.type===GROUND),
    'both Air Dash and Ground Dash should return before zone 14');
  let prior=dash[firstGround];
  for(const next of repeats){
    assert.ok(next.time-prior.time>=DASH_REPEAT_SECONDS-.05,
      'do not spam an advanced hazard just after another');
    assert.notEqual(next.type,prior.type,'alternate action families');
    assert.equal(next.hp,100);
    prior=next;
  }
  assert.equal(d.dashHazardRepeats,repeats.length);
  assert.equal(d.insight.dashHazards.repeats,repeats.length);
});

test('a vulnerable player gets a pause, then can still see Dash later',()=>{
  const {dash}=simulate(17*GAME.zoneSeconds,{
    hpAt:t=>t>=76&&t<144?50:100
  });
  assert.ok(dash.length>=2,'introductions should remain available');
  assert.ok(dash.every(x=>x.time<76||x.time>=144),
    'no Dash challenge in the low-shield recovery window');
  assert.ok(dash.some(x=>x.time>=144),'Dash returns once recovery ends');
});

test('movement pressure for Dash is independent from Echo Spire cooldown',()=>{
  const m=new MovementAwareness();
  m.onSpawn(AIR,32);
  assert.equal(m.lastEchoTime,-Infinity,
    'a Dash barrier is not a fake Echo obstacle');
  m.onSpawn(GROUND,37);
  assert.equal(m.lastEchoTime,-Infinity);
  m.onSpawn('echo',41);
  assert.equal(m.lastEchoTime,41);
});

test('Chroma Spectrum 2.0 has 24 hand-picked nonrepeating zone identities',()=>{
  assert.equal(PALETTES.length,24);
  assert.deepEqual(PALETTES.slice(0,8).map(p=>p.name),[
    'CYAN','VIOLET','MAGENTA','LIME','AMBER','ELECTRIC','REDLINE','WHITEOUT']);
  assert.equal(PALETTES[8].name,'ROSESHIFT');
  assert.equal(PALETTES[13].name,'JADE'); // zone 14, previously recycled ELECTRIC
  assert.equal(PALETTES[23].name,'PLASMA');
  const signatures=PALETTES.map(p=>p.primary+'/'+p.secondary);
  assert.equal(new Set(PALETTES.map(p=>p.name)).size,24);
  assert.equal(new Set(signatures).size,24);
  for(let i=0;i<24;i++){
    const p=PALETTES[i];
    assert.match(p.primary,/^#[0-9a-f]{6}$/i);
    assert.match(p.secondary,/^#[0-9a-f]{6}$/i);
    assert.match(p.shadow,/^#[0-9a-f]{6}$/i);
    assert.notEqual(p.primary,p.secondary);
    assert.notEqual(p.shadow,p.primary);
  }
});

test('palette lookup is still constant-time and the old eight colors remain in order',()=>{
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(game,/PALETTES\[\(zone-1\)%PALETTES\.length\]/);
  assert.match(html,/LATEST UPDATE · PERFORMANCE STABILITY 2\.0/);
  assert.match(html,/palette-24-2\.0/);
  assert.match(game,/!hurdles\.some\(o=>o\.mechanicIntro&&!o\.hit&&!o\.cleared\)/);
  assert.match(game,/surface:gravityShift\.ceiling\?'ceiling':'floor'/);
  assert.match(game,/guided:Boolean\(data\.guided\)/);
  assert.match(game,/mechanicIntro:Boolean\(firstEcho\|\|firstDash\)/);
});
