const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {AdaptiveRushDirector,DASH_REPEAT_SECONDS}=require('../src/director/adaptive-director.js');
const {safeToSpawn,AIR,GROUND}=require('../src/gameplay/dash-hazards.js');
const {PALETTES,GAME}=require('../src/core/config.js');
const {MovementAwareness}=require('../src/director/movement-awareness.js');
const root=path.join(__dirname,'..');

function floorAt(zone){
  // Gravity Shift now begins in zone 8 and returns every eight zones.
  return zone<8||Math.floor((zone-8)/8)%2===1;
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

test('new Ground Dash scheduling never displaces a queued ordinary Jump',()=>{
  const d=new AdaptiveRushDirector(()=>.45),seen=[];
  d.phase='PEAK';d.phaseDuration=100;d.confidence=.9;d.spawnCountdown=0;
  d.pending=[{type:'jump',pattern:'single-jump',step:1}];
  d.tick(.05,{zone:5,zoneElapsed:4,hp:100,speed:900,playerX:300,
    spawnX:1370,surface:'floor',gravityPending:false},
    step=>{seen.push(step.type);return true});
  assert.deepEqual(seen,['jump']);
  assert.equal(d.dashIntroduced.ground,false);
});

test('unavailable long Duck Gate terrain yields the queue back to regular obstacles',()=>{
  const d=new AdaptiveRushDirector(()=>.47),attempts=[];
  d.phase='PEAK';d.phaseDuration=100;d.confidence=.88;d.spawnCountdown=0;
  const ctx={zone:5,zoneElapsed:4,hp:100,speed:700,playerX:300,
    spawnX:1450,surface:'floor',gravityPending:false};
  for(let i=0;i<25;i++)d.tick(.28,ctx,step=>{
    attempts.push(step.type);return step.type!==GROUND;
  });
  assert.ok(attempts.includes(GROUND),'attempt a first safe Ground Dash lesson');
  assert.ok(d.dashRetryAfter>0,'temporarily suspend repeated blocked attempts');
  assert.ok(attempts.some(t=>t!==GROUND),'ordinary actions continue while deferred');
  assert.equal(d.dashIntroduced.ground,false,'do not fake a successful lesson');
});

test('a queued first long Duck lesson is withdrawn if the course turns upside down',()=>{
  const d=new AdaptiveRushDirector(()=>.47),spawned=[];
  d.pending=[{type:GROUND,pattern:'single-dash-duck',step:1,guided:true}];
  d.spawnCountdown=0;d.phase='PEAK';
  d.tick(.12,{zone:8,zoneElapsed:5,surface:'ceiling',
    hp:100,speed:600,gravityPending:false},x=>{spawned.push(x.type);return true});
  assert.equal(spawned.length,0);
  assert.equal(d.dashIntroduced.ground,false);
  assert.equal(d.pending.some(x=>x.type===GROUND),false);
});

test('the retained long Duck Gate is taught on the floor and recurs without spamming',()=>{
  const {dash,d}=simulate();
  assert.ok(dash.length>=2,JSON.stringify(dash));
  assert.ok(dash.every(x=>x.type===GROUND),'retired Twin Vault never generated');
  assert.equal(dash[0].surface,'floor');
  assert.ok(dash[0].zone>=4);
  assert.equal(d.dashIntroduced.air,false);
  assert.equal(d.dashIntroduced.ground,true);
  for(let i=1;i<dash.length;i++){
    assert.ok(dash[i].time-dash[i-1].time>=DASH_REPEAT_SECONDS-.05);
    assert.equal(dash[i].hp,100);
  }
  assert.equal(d.dashHazardRepeats,dash.length-1);
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
  assert.match(game,/window\.ChromaConfig\.paletteForZone\(zone\)/);
  assert.match(html,/LATEST UPDATE · (?:ARCADE SIMPLIFICATION 1\.0|CORE PACE 1\.1|CHROMA SURGE 1\.0|ACTION DENSITY 2\.0)/);
  assert.match(html,/palette-24-2\.0/);
  assert.match(game,/!hurdles\.some\(o=>o\.mechanicIntro&&!o\.hit&&!o\.cleared\)/);
  assert.match(game,/surface:gravityShift\.ceiling\?'ceiling':'floor'/);
  assert.match(game,/guided:Boolean\(data\.guided\)/);
  assert.match(game,/mechanicIntro:Boolean\(firstEcho\|\|firstDash\)/);
});
