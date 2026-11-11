const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const R=require('../src/gameplay/reality-engine-2.2.js');
const Prior=require('../src/gameplay/reality-engine-2.1.js');
const {GAME}=require('../src/core/config.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {playerBox}=require('../src/core/geometry.js');

test('2.2 upper Overdrive has seven distinct, fair faster gates vs four low gates',()=>{
  const p=R.createPlan({playerX:340});
  assert.ok(R.validatePlan(p));
  assert.equal(p.obstacles.filter(o=>o.route==='upper').length,7);
  assert.equal(p.obstacles.filter(o=>o.route==='lower').length,4);
  assert.deepEqual(p.obstacles.filter(o=>o.route==='upper').map(o=>o.type),
    ['jump','jump','duck','jump','jump','duck','duck']);
  assert.equal(R.UPPER.multiplier,2);
  assert.equal(R.UPPER.cleanBonus,1800);
  assert.equal(p.signature,R.createPlan({playerX:340}).signature);
  assert.notEqual(p.signature,Prior.createPlan({playerX:340}).signature);
  const upper=p.obstacles.filter(o=>o.route==='upper');
  for(let i=1;i<upper.length;i++){
    const prev=upper[i-1],now=upper[i];
    const min=(prev.type==='jump'?
      Math.abs(2*GAME.jumpVelocity/GAME.gravity):
      GAME.duckDuration+GAME.duckRecovery)+
      (prev.width+36)/GAME.speedAt(prev.time,1)+.12;
    assert.ok(now.time-prev.time>=min, 'real physics timing margin '+now.time);
    assert.ok(now.worldX>prev.worldX+prev.width);
  }
  const terrain=new TerrainSystem();
  R.installTerrain(terrain,p,515);
  for(const o of upper)assert.ok(terrain.canSpawnObstacle(o.worldX,o.width,
    GAME.speedAt(o.time,1)),'valid upper deck hurdle '+o.time);
  assert.deepEqual(p.gaps,Prior.createPlan().gaps);
});

test('clean-route bonus is earned only when seven real upper hazards cleared',()=>{
  const p=R.createPlan(),e=new R.RealityEngine();
  assert.equal(e.captureUpper({time:35,worldX:p.markers.start+200}),true);
  for(let i=0;i<6;i++)
    e.onClear({route:'upper',time:40+i});
  e.tick(.016,{time:52,plan:p,playerWorld:p.markers.end+20});
  assert.equal(e.routeBonus,0,'six clears do not reward');
  const perfect=new R.RealityEngine();
  perfect.captureUpper({time:35,worldX:p.markers.start+200});
  for(let i=0;i<7;i++)perfect.onClear({route:'upper',time:40+i});
  perfect.tick(.016,{time:52,plan:p,playerWorld:p.markers.end+20});
  assert.equal(perfect.routeBonus,1800);
  const events=perfect.eventQueue.filter(e=>e.type==='upper_route_clean');
  assert.equal(events.length,1,'only one bonus event');
  perfect.tick(.016,{time:53,plan:p,playerWorld:p.markers.end+500});
  assert.equal(perfect.routeBonus,1800,'cannot duplicate bonus');
  const hit=new R.RealityEngine();
  hit.captureUpper({time:35,worldX:p.markers.start+200});
  for(let i=0;i<7;i++)hit.onClear({route:'upper',time:40+i});
  hit.onRouteHit('upper');
  hit.tick(.016,{time:52,plan:p,playerWorld:p.markers.end+20});
  assert.equal(hit.routeBonus,0,'one actual contact spoils clean bonus');
  assert.equal(hit.snapshot.routeHits,1);
  const safe=new R.RealityEngine();
  safe.onClear({route:'upper',protectedClear:true});
  assert.equal(safe.routeClears,0);
});

test('projectile silhouettes have separate true collision bounds and matching visual categories',()=>{
  assert.ok(R.SHOT.low.width<R.SHOT.high.width);
  assert.ok(R.SHOT.low.offset<R.SHOT.high.offset);
  assert.equal(R.SHOT.low.action,'JUMP');
  assert.equal(R.SHOT.high.action,'DUCK');
  const low=R.projectileBox({x:450,y:503,kind:'low'});
  const high=R.projectileBox({x:450,y:466,kind:'high'});
  assert.ok(low.y>high.y+high.h);
  assert.equal(low.w,R.SHOT.low.width);
  assert.equal(high.w,R.SHOT.high.width);
});

function shot(kind){
  return {id:1,kind,bossPhase:2,x:720,previousX:720,
    y:515-R.SHOT[kind].offset,age:.41,charging:false,
    resolved:false,speed:340,type:'sentinel-'+kind,
    worldX:720,hit:false};
}
function chase(kind,pose){
  const e=new R.RealityEngine();e.projectiles=[shot(kind)];
  const p=playerBox({x:340,...pose}),events=[];
  let at=-1;
  for(let i=0;i<120;i++){
    const r=e.tickProjectiles(1/60,{playerBox:p,playerWorldX:5000,
      speed:810,leftBound:-90});
    if(r.length&&at<0){events.push(...r);at=i;}
  }
  return {e,events,at};
}
test('high sweep ducks under, low cutter jumps over: predictable physics',()=>{
  const grounded={feet:515,landed:true,duck:false};
  const duck={feet:515,landed:true,duck:true};
  const jump={feet:420,landed:false,duck:false};
  assert.equal(chase('low',grounded).events[0].type,'hit');
  assert.equal(chase('low',duck).events[0].type,'hit');
  assert.equal(chase('low',jump).events[0].type,'clear');
  assert.equal(chase('high',grounded).events[0].type,'hit');
  assert.equal(chase('high',duck).events[0].type,'clear');
});

test('a DODGED projectile continues visibly after passing the cube and only disappears offscreen',()=>{
  const e=new R.RealityEngine();e.projectiles=[shot('high')];
  const p=playerBox({x:340,feet:515,landed:true,duck:true});
  let firstX=null,remainingX=null;
  for(let i=0;i<80;i++){
    const ev=e.tickProjectiles(1/60,{playerBox:p,
      playerWorldX:5000,speed:810,leftBound:-90});
    if(ev.some(x=>x.type==='clear')){
      assert.equal(e.projectiles.length,1,'projectile remains after score');
      firstX=e.projectiles[0].x;break;
    }
  }
  assert.ok(firstX<340);
  for(let i=0;i<12;i++)e.tickProjectiles(1/60,{playerBox:p,
    playerWorldX:5000,speed:810,leftBound:-90});
  assert.equal(e.projectiles.length,1,'bolt visible long after cube passed');
  remainingX=e.projectiles[0].x;
  assert.ok(remainingX<firstX-100,'bolt keeps physically moving left');
  for(let i=0;i<65;i++)e.tickProjectiles(1/60,{playerBox:p,
    playerWorldX:5000,speed:810,leftBound:-90});
  assert.equal(e.projectiles.length,0);
  assert.equal(e.shotsCleared,1);
  assert.equal(e.shotsHit,0);
  assert.equal(e.shotVisualRemovals,1);
});

test('real impact is located INSIDE the player body, charged once and shown briefly',()=>{
  const e=new R.RealityEngine();e.projectiles=[shot('low')];
  const p=playerBox({x:340,feet:515,landed:true,duck:false});
  let outcome;
  for(let i=0;i<100;i++){
    const result=e.tickProjectiles(1/60,{playerBox:p,playerWorldX:5000,
      speed:900,leftBound:-90});
    if(result.length){outcome=result[0];break;}
  }
  assert.equal(outcome.type,'hit');
  assert.ok(outcome.impactX>=p.x&&outcome.impactX<=p.x+p.w);
  assert.ok(outcome.impactY>=p.y&&outcome.impactY<=p.y+p.h);
  assert.equal(e.projectiles.length,1,'fracture visible at true impact for 280ms');
  assert.equal(e.shotsHit,1);
  for(let i=0;i<12;i++){
    const more=e.tickProjectiles(1/60,{playerBox:p,playerWorldX:5000,speed:900,leftBound:-90});
    assert.equal(more.length,0,'hit counted only once');
  }
  assert.equal(e.projectiles.length,1);
  for(let i=0;i<8;i++)
    e.tickProjectiles(1/60,{playerBox:p,playerWorldX:5000,speed:900,leftBound:-90});
  assert.equal(e.projectiles.length,0);
  assert.equal(e.shotsHit,1);
});

test('simple Sentinel core renders without using legacy character body or gate arrows',()=>{
  const e=new R.RealityEngine(),calls=[];
  const c={save(){},restore(){},beginPath(){},closePath(){},moveTo(){},lineTo(){},
    stroke(){calls.push('stroke')},fill(){calls.push('fill')},
    translate(){},scale(){},rotate(){},fillRect(){calls.push('rect')},
    strokeRect(){},fillText(t){calls.push(t)},arc(){calls.push('arc')},
    setLineDash(){}};
  e.tick(.016,{time:63,plan:R.createPlan(),playerWorld:40000,
    spawnX:900,speed:850});
  e.drawBackdrop(c,{time:64,width:1280,height:720,
    primary:'#3feeff',secondary:'#e265ff'});
  assert.ok(calls.filter(x=>x==='stroke').length>=2,
    'two clean continuous energy contours, no multi-limb boss silhouette');
  assert.ok(calls.filter(x=>x==='rect').length>=5);
  e.drawProjectiles(c,{});
  assert.ok(calls.includes('fill'));
  e.drawOverlay(c,{time:64,width:1280,height:720});
  assert.ok(calls.some(x=>x.includes?.('SENTINEL')));
  assert.ok(calls.some(x=>x.includes?.('LOW')||x.includes?.('HIGH')));
});

test('2.2 isolates PB, checks app wiring, keeps Arcade and old Trials safe',()=>{
  const data={chromaRushRealityV21:'{"bestScore":12000}'};
  const store={getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v}};
  const records=new R.RealityRecords(store);
  assert.equal(records.bestScore,0);
  records.finish({score:13000,completed:true});
  assert.equal(new R.RealityRecords(store).bestScore,13000);
  assert.equal(JSON.parse(data.chromaRushRealityV21).bestScore,12000);
  const root=path.join(__dirname,'..');
  const g=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(g,/realityModule\.UPPER\.multiplier/);
  assert.match(g,/reality\.onRouteHit\('upper'\)/);
  assert.match(g,/reality\.tickProjectiles/);
  assert.match(g,/leftBound:camera\.visibleLeft/);
  assert.match(g,/frameEcho\(result\.impactX,result\.impactY/);
  assert.match(g,/if\(runMode==='reality'&&fixed\.bossPhase\)continue/);
  assert.match(g,/runMode==='reality'&&o\.route==='upper'/);
  assert.match(html,/src\/gameplay\/reality-engine-2\.2\.js\?v=reality-engine-2\.2/);
  assert.ok(html.indexOf('reality-engine-2.2.js')<html.indexOf('src/gameplay/game.js'));
});
