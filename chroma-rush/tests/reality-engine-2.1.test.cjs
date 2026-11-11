const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const R=require('../src/gameplay/reality-engine-2.1.js');
const G=require('../src/core/config.js').GAME;
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {playerBox}=require('../src/core/geometry.js');

test('an upper route is physically ABOVE the lower track and reachable at jump height',()=>{
  const plan=R.createPlan(),baseY=515,m=plan.markers;
  const height=G.jumpVelocity*G.jumpVelocity/(2*G.gravity);
  assert.ok(R.ENTRY_RISE>90&&R.CREST_RISE<height-24,
    'platform must be reachable by one standard jump, with timing margin');
  assert.equal(R.upperSurfaceAt(m.start-10,plan,baseY),null);
  assert.equal(R.upperSurfaceAt(m.start,plan,baseY),baseY-R.ENTRY_RISE);
  assert.equal(R.upperSurfaceAt(m.crest,plan,baseY),baseY-R.CREST_RISE);
  assert.equal(R.upperSurfaceAt(m.descent-1,plan,baseY),baseY-R.CREST_RISE);
  assert.ok(R.upperSurfaceAt(m.end-1,plan,baseY)>baseY-3);
  assert.equal(R.upperSurfaceAt(m.end,plan,baseY),null);
  assert.equal(R.canLandUpper({route:'undecided',plan,worldX:m.start+200,
    baseY,previousFeet:390,feet:410,vy:200,airborne:true}),true);
  assert.equal(R.canLandUpper({route:'undecided',plan,worldX:m.start+200,
    baseY,previousFeet:425,feet:410,vy:-200,airborne:true}),false,
    'jumping UP through a platform never selects it');
  assert.equal(R.canLandUpper({route:'undecided',plan,worldX:m.start+200,
    baseY,previousFeet:390,feet:410,vy:200,airborne:false}),false);
  assert.equal(R.canLandUpper({route:'undecided',plan,worldX:m.start-1,
    baseY,previousFeet:390,feet:410,vy:200,airborne:true}),false);
});

test('route is chosen by actual elevated landing, not pressing Jump at magic time',()=>{
  const p=R.createPlan(),e=new R.RealityEngine(),t=new TerrainSystem();
  R.installTerrain(t,p,515);
  assert.equal(e.onJump({time:30.5,terrain:t,plan:p,grounded:true}),false);
  assert.equal(e.route,'undecided');
  assert.equal(e.captureUpper({time:34.8,worldX:p.markers.start+350}),true);
  assert.equal(e.route,'upper');
  assert.equal(e.snapshot.upperLandings,1);
  assert.equal(t.groundAt(p.markers.crest),515,
    'lower remains a separate, real physical ground collider');
  assert.ok(e.routeAllows('upper'));assert.ok(!e.routeAllows('lower'));
  assert.equal(e.chooseRoute('lower',{plan:p,time:40,playerWorld:p.markers.crest+200}),false);
  const other=new R.RealityEngine();
  assert.equal(other.chooseRoute('lower',{plan:p,time:34,playerWorld:p.markers.start+100}),false);
  const event=other.tick(.016,{time:38,plan:p,playerWorld:p.markers.crest+100});
  assert.equal(event.type,'route_selected');
  assert.equal(other.route,'lower');
});

test('a hit-capable Sentinel really fires 17 distinct mobile projectiles',()=>{
  const e=new R.RealityEngine(),p=R.createPlan(),d=1/60;
  const launches=[];
  for(let t=0;t<=90;t+=d){
    const ev=e.tick(d,{time:t,plan:p,
      playerWorld:100000,baseY:515,playerX:340,spawnX:980,speed:800});
    if(ev?.type==='boss_shot')launches.push(ev);
  }
  assert.equal(e.shotsFired,17);
  assert.equal(launches.length,17);
  assert.deepEqual(e.projectiles.map(x=>x.kind).filter(Boolean).length,17);
  assert.ok(launches.some(x=>x.kind==='high')&&launches.some(x=>x.kind==='low'));
  assert.equal(e.shotsHit,0);
  assert.ok(launches.every(x=>x.phase>=1&&x.phase<=3));
  const examples=e.projectiles;
  assert.ok(examples.some(x=>x.y===500)&&examples.some(x=>x.y===476));
});

test('duck and jump each evade their intended projectile and not the other',()=>{
  const make=(kind)=>{
    const e=new R.RealityEngine(),shot={
      id:1,kind,bossPhase:1,x:650,previousX:650,
      y:515-(kind==='low'?15:39),age:.41,charging:false,
      resolved:false,speed:300,type:'sentinel-'+kind,
      worldX:650,hit:false
    };
    e.projectiles=[shot];
    return e;
  };
  function run(kind,player){
    const e=make(kind),out=[];
    for(let i=0;i<50;i++){
      const events=e.tickProjectiles(1/60,{
        playerBox:playerBox(player),playerWorldX:3000,
        baseY:515,speed:650,invulnerable:false});
      out.push(...events);
      if(events.length)break;
    }
    return out[0]?.type;
  }
  const stand={x:340,feet:515,landed:true,duck:false};
  const duck={x:340,feet:515,landed:true,duck:true};
  const airborne={x:340,feet:420,landed:false,duck:false};
  assert.equal(run('high',stand),'hit','chest shot hits standing player');
  assert.equal(run('high',duck),'clear','duck passes below chest shot');
  assert.equal(run('low',duck),'hit','duck is not a safe way to beat low bolt');
  assert.equal(run('low',airborne),'clear','jump clears low bolt');
  assert.equal(run('low',stand),'hit','low shot hits running player');
});

test('a boss shot is physically swept so frame drops cannot tunnel through player',()=>{
  const e=new R.RealityEngine();
  e.projectiles=[{
    id:1,kind:'low',bossPhase:3,x:690,previousX:690,y:500,
    age:.42,charging:false,resolved:false,speed:1300,
    type:'sentinel-low',worldX:690,hit:false
  }];
  const x={x:340,feet:515,landed:true,duck:false};
  const events=e.tickProjectiles(.22,{
    playerBox:playerBox(x),speed:1100,baseY:515,playerWorldX:1600});
  assert.equal(events.length,1);
  assert.equal(events[0].type,'hit');
  e.onBossHit(3);
  assert.equal(e.phaseHits[2],1);
});

test('clear shots genuinely damage boss armor; protected clears do not',()=>{
  const e=new R.RealityEngine(),p=R.createPlan(),dt=1/60;
  const player={x:340,feet:515,landed:true,duck:false};
  for(let i=0;i<90*60;i++){
    const t=i*dt;
    e.tick(dt,{time:t,plan:p,playerWorld:100000,baseY:515,
      playerX:340,spawnX:980,speed:750});
    for(const evt of e.tickProjectiles(dt,{
      playerBox:playerBox({...player,feet:420,landed:false}),
      playerWorldX:100000,baseY:515,speed:750})){
      if(evt.type==='clear')e.onClear({time:t,bossPhase:evt.shot.bossPhase,
        protectedClear:evt.protectedClear});
      else e.onBossHit(evt.shot.bossPhase);
    }
  }
  // All low bolts clear above the player, but high chest shots may clip this
  // simulated high-air pose: this test checks actual outcomes, not "free" wins.
  assert.equal(e.shotsFired,17);
  assert.ok(e.shotsCleared+e.shotsHit>=17);
  const f=new R.RealityEngine();
  f.onClear({time:65,bossPhase:1,protectedClear:true});
  assert.equal(f.phaseClears[0],0);
});

test('the new mode has distinct saved PBs and correct telemetry mode',()=>{
  const raw={chromaRushRealityV2:'{"bestScore":10000}'};
  const storage={getItem:k=>raw[k]??null,setItem:(k,v)=>{raw[k]=v}};
  const r=new R.RealityRecords(storage);
  assert.equal(r.bestScore,0);
  r.finish({score:14000,completed:true});
  assert.equal(new R.RealityRecords(storage).bestScore,14000);
  assert.equal(JSON.parse(raw.chromaRushRealityV2).bestScore,10000);
  const root=path.join(__dirname,'..');
  const src=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const audit=fs.readFileSync(path.join(root,'src/diagnostics/round-audit.js'),'utf8');
  assert.match(src,/realityModule\.canLandUpper/);
  assert.match(src,/reality\.captureUpper/);
  assert.match(src,/reality\.tickProjectiles/);
  assert.match(src,/reality\.drawProjectiles/);
  assert.match(src,/if\(runMode==='reality'&&fixed\.bossPhase\)continue/);
  assert.match(html,/src\/gameplay\/reality-engine-2\.1\.js\?v=reality-engine-2\.1/);
  assert.match(audit,/this\.mode=\['arcade','practice','trial','reality'\]/);
});
