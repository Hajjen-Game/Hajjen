const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const R=require('../src/gameplay/reality-engine-2.3.js');
const Prior=require('../src/gameplay/reality-engine-2.2.js');
const {GAME}=require('../src/core/config.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {playerBox}=require('../src/core/geometry.js');

test('Route Flow fills the pre-fork runway and lower route with fair variety',()=>{
 const p=R.createPlan(),old=Prior.createPlan();
 assert.ok(R.validatePlan(p));
 assert.equal(p.bridge.time,31.38);
 assert.equal(p.bridge.route,undefined);
 assert.ok(p.bridge.worldX<p.markers.start);
 const lo=p.obstacles.filter(x=>x.route==='lower');
 const hi=p.obstacles.filter(x=>x.route==='upper');
 assert.deepEqual(lo.map(x=>x.time),[38.75,40.22,41.69,43.16,44.63,46.1]);
 assert.deepEqual(lo.map(x=>x.type),['jump','duck','jump','duck','duck','jump']);
 assert.equal(hi.length,7);
 assert.equal(old.obstacles.filter(x=>x.route==='lower').length,4);
 assert.ok(R.LOWER.cadence>R.UPPER.cadence);
 assert.ok(lo[0].time-37.7<1.1);
 assert.equal(p.signature,R.createPlan().signature);
 assert.notEqual(p.signature,old.signature);
 assert.deepEqual(p.gaps,old.gaps);
});
test('route timing and genuine terrain support pass physical Arcade safety checks',()=>{
 const p=R.createPlan();
 for(const route of ['lower','upper']){
  const terrain=new TerrainSystem();
  R.installTerrain(terrain,p,515,route);
  const events=p.obstacles.filter(o=>!o.bossPhase&&(!o.route||o.route===route));
  for(let i=0;i<events.length;i++){
   const o=events[i];
   assert.ok(terrain.canSpawnObstacle(o.worldX,o.width,GAME.speedAt(o.time,1)),
      'real terrain clearance '+route+' '+o.time);
   if(i){
    const prev=events[i-1];
    const budget=prev.type==='jump'?
      Math.abs(2*GAME.jumpVelocity/GAME.gravity):
      GAME.duckDuration+GAME.duckRecovery;
    const min=budget+(prev.width+36)/GAME.speedAt(prev.time,1)+.12;
    assert.ok(o.time-prev.time>=min,'movement budget '+prev.time+' → '+o.time);
   }
  }
 }
});
test('Sentinel shot starts charging inside actual symmetric core, then travels downward',()=>{
 const engine=new R.RealityEngine(),p=R.createPlan();
 engine.tick(1/60,{time:62,plan:p,playerWorld:35000,playerX:340,
   spawnX:1000,bossY:230,baseY:515,speed:770});
 const shot=engine.projectiles[0];
 assert.ok(shot);
 assert.equal(shot.x,1000);
 assert.equal(shot.y,230);
 assert.equal(shot.originX,1000);
 assert.equal(shot.originY,230);
 assert.equal(shot.laneY,515-R.SHOT[shot.kind].offset);
 assert.equal(engine.muzzleFires,1);
 const box=playerBox({x:340,feet:515,landed:true,duck:false});
 const step=dt=>engine.tickProjectiles(dt,{playerBox:box,speed:770,leftBound:-100});
 step(.2);
 assert.equal(shot.x,1000);assert.equal(shot.y,230);
 step(.21);
 assert.ok(shot.x<1000);
 assert.ok(shot.y>230);
 for(let i=0;i<12;i++)step(1/60);
 assert.ok(shot.y>230&&shot.y<=shot.laneY);
 assert.ok(engine.bossFlightTrails>3);
});
test('a low shot requires Jump and a high shot requires Duck',()=>{
 function result(kind,pose){
  const e=new R.RealityEngine(),y=515-R.SHOT[kind].offset;
  e.projectiles=[{id:1,kind,bossPhase:1,x:780,previousX:780,
    y,age:.43,charging:false,speed:350,
    originX:780,originY:200,laneY:y,descentEndX:550,
    trail:[],resolved:false,hit:false}];
  for(let i=0;i<80;i++){
   const events=e.tickProjectiles(1/60,{
     playerBox:playerBox({x:340,...pose}),speed:750,leftBound:-100});
   if(events.length)return events[0].type;
  }
 }
 const stand={feet:515,landed:true,duck:false};
 const duck={feet:515,landed:true,duck:true};
 const jump={feet:420,landed:false,duck:false};
 assert.equal(result('low',stand),'hit');
 assert.equal(result('low',duck),'hit');
 assert.equal(result('low',jump),'clear');
 assert.equal(result('high',stand),'hit');
 assert.equal(result('high',duck),'clear');
});
test('HIGH duck shot cannot be bypassed by single or double jump at any reachable height',()=>{
 // Unlike Reality 2.3's old floating horizontal band, HIGH extends to the
 // same upper world bound as the established hanging Duck gates.
 const {DUCK_GATE_TOP,DUCK_CLEARANCE}=require('../src/core/geometry.js');
 const y=515-R.SHOT.high.offset;
 const shot={kind:'high',x:460,y,age:.43,charging:false,
   previousX:460,speed:350,resolved:false,id:1,bossPhase:1};
 const rect=R.projectileBox(shot);
 assert.equal(rect.y,DUCK_GATE_TOP);
 assert.equal(rect.y+rect.h,y+R.SHOT.high.height/2);
 assert.ok(rect.y+rect.h<=515-DUCK_CLEARANCE,
   'a ducked player always has an actual passage below the visible rail');
 assert.ok(rect.h>400,
   'high attack must visibly block the overhead escape corridor');
 function encounter(pose){
  const e=new R.RealityEngine();
  e.projectiles=[{...shot,x:760,previousX:760,y,
    worldX:760,hit:false}];
  for(let frame=0;frame<90;frame++){
    const result=e.tickProjectiles(1/60,{playerBox:playerBox({
      x:340,...pose}),playerWorldX:40000,speed:850,leftBound:-100});
    if(result.length)return result[0].type;
  }
  throw Error('projectile failed to reach player');
 }
 const duck={feet:515,landed:true,duck:true};
 assert.equal(encounter(duck),'clear','duck MUST stay safe');
 const jumpFeets=[510,490,470,435,390,330,275,200,115,40,0];
 for(const feet of jumpFeets){
  assert.equal(encounter({feet,landed:false,duck:false}),'hit',
    'jumping over HIGH must fail even at feet='+feet);
 }
 assert.equal(encounter({feet:515,landed:true,duck:false}),'hit',
   'standing must not bypass HIGH');
 const low=R.projectileBox({kind:'low',x:460,y:515-R.SHOT.low.offset});
 assert.ok(low.h<35,'LOW stays a low cutter safely jumpable');
});

test('avoided shot crosses the player and travels left offscreen',()=>{
 const e=new R.RealityEngine();
 const p=playerBox({x:340,feet:515,landed:true,duck:true});
 e.projectiles=[{id:1,kind:'high',bossPhase:1,
  x:800,previousX:800,y:515-R.SHOT.high.offset,
  age:.42,charging:false,speed:380,resolved:false,hit:false}];
 let previous;
 for(let i=0;i<80;i++){
  const events=e.tickProjectiles(1/60,{playerBox:p,speed:760,leftBound:-100});
  if(events.some(x=>x.type==='clear')){
    assert.equal(e.projectiles.length,1);
    previous=e.projectiles[0].x;break;
  }
 }
 assert.ok(previous<340);
 for(let i=0;i<8;i++)e.tickProjectiles(1/60,{playerBox:p,speed:760,leftBound:-100});
 assert.ok(e.projectiles[0].x<previous-90);
 for(let i=0;i<100;i++)e.tickProjectiles(1/60,{playerBox:p,speed:760,leftBound:-100});
 assert.equal(e.projectiles.length,0);
 assert.equal(e.shotsCleared,1);
});
test('Sentinel geometry is fully symmetric and extra route overlays are retired',()=>{
 const e=new R.RealityEngine(),calls=[];
 const ctx={save(){},restore(){},translate(){},scale(){},beginPath(){},
  moveTo(){},lineTo(){},closePath(){calls.push('closed')},
  fill(){calls.push('filled')},stroke(){calls.push('stroke')},
  fillRect(){calls.push('rect')},strokeRect(){calls.push('box')},
  fillText(s){calls.push(s)}};
 e.drawBackdrop(ctx,{time:65,width:1280,height:720});
 assert.ok(calls.includes('closed'));
 assert.equal(calls.filter(x=>x==='box').length,2);
 assert.ok(calls.filter(x=>x==='rect').length>=5);
 const before=calls.length;
 e.drawOverlay(ctx,{time:40,width:1280,height:720});
 assert.equal(calls.length,before,'no Overdrive text duplicates the central HUD');
});
test('Reality 2.3 has independent records and is loaded before game.js',()=>{
 const storageData={chromaRushRealityV22:'{"bestScore":2500}'};
 const store={getItem:k=>storageData[k]??null,setItem:(k,v)=>storageData[k]=v};
 const records=new R.RealityRecords(store);
 assert.equal(records.bestScore,0);
 records.finish({score:3400,completed:true});
 assert.equal(new R.RealityRecords(store).bestScore,3400);
 assert.equal(JSON.parse(storageData.chromaRushRealityV22).bestScore,2500);
 const root=path.join(__dirname,'..');
 const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(game,/bossY:camera\.worldY\(H\*\.31,floorY\)/);
 assert.match(game,/if\(runMode==='reality'\)reality\.drawProjectiles/);
 assert.match(game,/const gravityEvent=fixedCourse\(\)\?null:/);
 assert.match(html,/src\/gameplay\/reality-engine-2\.3\.js\?v=reality-engine-2\.3/);
 assert.ok(html.indexOf('src/gameplay/reality-engine-2.3.js')<
  html.indexOf('src/gameplay/game.js'));
});
