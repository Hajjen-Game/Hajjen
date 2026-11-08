const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME,SHIELD_CORE,JUMP_FEEL}=require('../src/core/config.js');
const {ShieldCoreSystem,distToRect}=require('../src/gameplay/shield-core.js');
const {drawCore,drawTransfer}=require('../src/render/shield-core-renderer.js');
const {RoundAudit}=require('../src/diagnostics/round-audit.js');
const {ReactiveAudioSystem}=require('../src/audio/reactive-audio.js');
const {GravityShift}=require('../src/gameplay/gravity-shift.js');
const root=path.join(__dirname,'..');
const terrain={generated:18000,groundAt(){return 515},canSpawnObstacle(){return true}};
const context=(o={})=>({time:17,zone:2,hp:75,playerWorld:300,playerBox:{x:277,y:463,w:46,h:52},
  echoUsed:false,landed:true,terrain,hurdles:[],speed:410,distance:0,playerX:300,
  viewportWidth:1280,gravityBusy:false,...o});
const drawMock=()=>{const calls={paths:0,draws:0,texts:[],transforms:[],arcs:0};
 const ctx={save(){},restore(){},beginPath(){calls.paths++},closePath(){},moveTo(){},lineTo(){},
   quadraticCurveTo(){},fill(){calls.draws++},stroke(){},fillRect(){},translate(...args){calls.transforms.push(args)},
   scale(...args){calls.transforms.push(args)},fillText(...args){calls.texts.push(args)},
   arc(){calls.arcs++},ellipse(){calls.arcs++}};
 return {ctx,calls};
};
test('Shield Core opportunity starts only from zone 2 and below 75 shield',()=>{
  assert.equal(SHIELD_CORE.firstZone,2);
  assert.equal(SHIELD_CORE.restore,25);
  assert.equal(SHIELD_CORE.maxShield,100);
  assert.equal(SHIELD_CORE.rise,268);
  assert.equal(GAME.damagePerHit,25);
  const m=new ShieldCoreSystem();
  assert.equal(m.tick(1/60,context({time:11,zone:1})).spawned,null);
  assert.equal(m.tick(1/60,context({time:18,hp:100})).spawned,null);
  assert.equal(m.tick(1/60,context({time:18,hp:76})).spawned,null);
  assert.equal(m.tick(1/60,context({time:18,hp:75,gravityBusy:true})).spawned,null);
  const event=m.tick(1/60,context());
  assert.ok(event.spawned);
  assert.equal(m.active.y,515-SHIELD_CORE.rise);
  assert.equal(m.spawnCount,1);
  assert.ok(m.nextAt-17>=SHIELD_CORE.minCooldown);
  assert.ok(m.nextAt-17<=SHIELD_CORE.maxCooldown);
});
test('A regular jump cannot reach the crystal even with magnet, and echo is required',()=>{
  const m=new ShieldCoreSystem();
  m.tick(1/60,context());
  const center=m.active.y;
  const singleTop=515-GAME.jumpVelocity**2/(2*GAME.gravity)-52;
  // Center is above the normal jump's TOP, even accounting for its radius.
  assert.ok(center+SHIELD_CORE.radius<singleTop);
  const distance=m.active.worldX-300;
  const singleFrame=context({distance,playerWorld:m.active.worldX,
    playerBox:{x:281,y:singleTop,w:38,h:52},echoUsed:false,landed:false,time:18});
  assert.equal(m.tick(1/60,singleFrame).picked,null);
  assert.equal(m.visible,true);
  const fakeHigh={...singleFrame,playerBox:{x:281,y:center-8,w:38,h:52}};
  assert.equal(m.tick(1/60,fakeHigh).picked,null,'even a manually high single jump cannot collect');
  assert.ok(!m.active.x||Math.abs(m.active.x-300)<25);
  const echoFrame={...fakeHigh,echoUsed:true};
  const pickup=m.tick(1/60,echoFrame).picked;
  assert.equal(pickup.restored,25);
  assert.equal(pickup.before,75);
  assert.equal(pickup.after,100);
  assert.equal(m.visible,false);
  assert.equal(m.picked,1);
  assert.equal(m.tick(1/60,echoFrame).picked,null,'one pickup cannot be doubled');
});
test('Reachability respects buffered Echo Jump, cooldown and shield cap',()=>{
  const m=new ShieldCoreSystem();m.tick(1/60,context());
  const c=m.active,screen=c.worldX-1100;
  const high=context({time:18,distance:1100,playerWorld:c.worldX,echoUsed:true,
    landed:false,hp:75,playerBox:{x:screen-22,y:c.y-10,w:44,h:52}});
  assert.equal(m.tick(1/60,high).picked.restored,25);
  assert.equal(m.tick(1/60,context({time:20,hp:50})).spawned,null,'never instantly refill');
  assert.equal(m.spawnCount,1);
  const n=new ShieldCoreSystem();
  n.tick(1/60,context());
  const v=n.active,x=v.worldX-1100;
  // A core already on screen can award only the actually missing shield.
  const award=n.tick(1/60,context({time:18,hp:90,distance:1100,playerWorld:v.worldX,
    echoUsed:true,landed:false,playerBox:{x:x-20,y:v.y-5,w:40,h:52}})).picked;
  assert.equal(award.restored,10);
  assert.equal(award.after,100);
});
test('Placement vetoes nearby hazards, gaps, slopes, unfinished terrain and gravity shifts',()=>{
  const x=1400,speed=430,m=new ShieldCoreSystem();
  assert.equal(m.safePlacement(x,{terrain,hurdles:[],speed}),true);
  assert.equal(m.safePlacement(x,{terrain,hurdles:[{worldX:x-100,width:50,hit:false,cleared:false}],speed}),false);
  assert.equal(m.safePlacement(x,{terrain,hurdles:[],speed,gravityBusy:true}),false);
  assert.equal(m.safePlacement(x,{terrain:{...terrain,generated:1500},speed}),false);
  assert.equal(m.safePlacement(x,{terrain:{...terrain,groundAt:t=>t>x+60?485:515},speed}),false);
  assert.equal(m.safePlacement(x,{terrain:{...terrain,groundAt:t=>t<x-200?null:515},speed}),false);
  assert.equal(m.safePlacement(x,{terrain:{...terrain,canSpawnObstacle:()=>false},speed}),false);
});
test('Active Shield Core blocks NEW hurdles, but never changes a seeded Director decision',()=>{
  const m=new ShieldCoreSystem();m.tick(1/60,context());
  const at=m.active.worldX;
  assert.equal(m.blocksHazard(at+400,45,410),true);
  assert.equal(m.blocksHazard(at+1050,45,410),false);
  const source=fs.readFileSync(path.join(root,'src/gameplay/shield-core.js'),'utf8');
  assert.doesNotMatch(source,/Math\.random\(|director\.tick|director\.register/);
  m.tick(1/60,context({time:19,playerWorld:at+150,distance:at-150}));
  assert.equal(m.missed,1);
  assert.equal(m.blocksHazard(at,45,410),false);
});
test('The same world coordinates support ceiling mode while the energy flies to upright HUD',()=>{
  const g=new GravityShift();g.ceiling=true;
  const m=new ShieldCoreSystem();m.tick(1/60,context());
  const first=m.active.y;
  assert.equal(g.screenY(first,720),720-first);
  m.startFlight(300,g.screenY(first,720),25);
  assert.equal(m.flight.y,720-first);
  assert.equal(m.flight.amount,25);
  m.tick(.28,context({time:18,hp:100}));
  assert.ok(m.flight.life>0&&m.flight.life<.54);
  const {ctx,calls}=drawMock();
  drawTransfer(ctx,m.flight,{width:1280,quality:{density:.65,glow:.64}});
  assert.ok(calls.draws>0);
  m.tick(.4,context({time:19,hp:100}));
  assert.equal(m.flight,null);
});
test('Core is distinguishable, uses no rings and respects graphic quality/reduced motion',()=>{
  const obj={worldX:1600,x:300,y:240,displayY:240,radius:12};
  const hi=drawMock(),lo=drawMock(),ceil=drawMock();
  drawCore(hi.ctx,obj,{time:12,quality:{glow:1,density:1}});
  drawCore(lo.ctx,obj,{time:12,quality:{glow:.24,density:.36},reducedMotion:true});
  drawCore(ceil.ctx,obj,{time:12,quality:{glow:.6,density:.6},ceiling:true});
  assert.ok(hi.calls.draws>=2&&lo.calls.draws>=2);
  assert.equal(hi.calls.arcs,0);
  assert.equal(lo.calls.arcs,0);
  assert.ok(hi.calls.texts.some(t=>t[0]==='×2'));
  assert.ok(ceil.calls.transforms.some(t=>t[0]===1&&t[1]===-1));
  assert.ok(lo.calls.draws<=hi.calls.draws);
});
test('New pickup sound and local round audit count exact shield recovery',()=>{
  const audio=new ReactiveAudioSystem({scope:{},enabled:false}),notes=[];
  audio.enabled=true;audio.effectsEnabled=true;audio.effectsVolume=1;
  audio.context={state:'running',currentTime:0};
  audio._voice=(...args)=>notes.push(args);
  audio.effect('shield-core');assert.equal(notes.length,2);
  const a=new RoundAudit();
  a.record('shield_core_spawn',{hp:75,zone:2},{worldX:1400,restore:25});
  a.record('shield_core_pickup',{hp:100,zone:2},{amount:25,before:75,after:100});
  a.record('shield_core_miss',{hp:50,zone:3},{worldX:2000});
  const stats=a.summary.shieldCores;
  assert.deepEqual(stats,{spawned:1,collected:1,missed:1,shieldRestored:25});
  assert.equal(a.summary.obstaclesSpawned,0,'pickup does not count as an obstacle');
});
test('Build loads collectible system before game and shows a compact HUD feedback',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(html,/LATEST UPDATE · CHROMA IDENTITY 1\.0/);
  assert.match(html,/id="shield-gain" class="shield-gain hidden"/);
  const logic=html.indexOf('src/gameplay/shield-core.js?v=shield-core-1.0');
  const render=html.indexOf('src/render/shield-core-renderer.js?v=shield-core-renderer-1.0');
  const engine=html.indexOf('src/gameplay/game.js?v=');
  assert.ok(logic>0&&render>logic&&engine>render);
  assert.match(game,/shieldCores\.blocksHazard\(worldX,width,speed\)/);
  assert.match(game,/shieldCores\.startFlight\(/);
  assert.match(game,/echoUsed:jumpControl\.echoUsed/);
  assert.match(css,/\.shield-gain\.hidden \{display:none!important\}/);
});
