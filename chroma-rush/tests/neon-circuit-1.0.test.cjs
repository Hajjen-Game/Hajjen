const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const c=require('../src/gameplay/neon-circuit-core.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const EPS=1e-5;

test('Neon Circuit is a distinct closed-track racing game, not trail-survival',()=>{
  assert.equal(c.LAPS_TO_WIN,3);
  assert.equal(c.ZONE_SECONDS,10);
  assert.equal(c.NAMES.length,4);
  assert.equal(c.NODES.length,12);
  assert.ok(c.TRACK.length>1200&&c.TRACK.length<1900,c.TRACK.length);
  assert.equal(c.TRACK.pointCount,12*20+1);
  const a=c.TRACK.samples[0],b=c.TRACK.samples.at(-1);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<EPS);
  assert.equal(c.TRACK_HALF,48);
  assert.equal(c.zoneSpeed(0),118);
  assert.equal(c.zoneSpeed(1),130);
  assert.ok(c.zoneSpeed(10)<=187);
  assert.equal(c.zoneAt(9.999),0);assert.equal(c.zoneAt(10),1);
  const css=read('neon-circuit.css');
  const js=read('src/gameplay/neon-circuit.js');
  const html=read('neon-circuit.html');
  assert.match(js,/TIDE\.clipNewColor/);
  assert.match(js,/IDENTITY\.paintPlayer/);
  assert.match(css,/circuit-actions/);
  assert.match(html,/id="circuit-brake"/);
  assert.match(html,/id="circuit-dash"/);
  assert.doesNotMatch(js,/hitsTrail|trailLife|tailblazer/i);
});
test('Route coordinates are continuous and nearest projection stays close',()=>{
  for(let n=0;n<30;n++){
    const s=(n+.39)/30*c.TRACK.length;
    const p=c.pointAt(s),q=c.closest(p.x,p.y);
    assert.ok(q.dist<.001,q.dist);
    assert.ok(Math.abs(q.s-s)<1.0,[q.s,s]);
    assert.ok(Math.hypot(p.tx,p.ty)>.98);
    const next=c.pointAt(s+4);
    assert.ok(Math.hypot(p.x-next.x,p.y-next.y)>1);
  }
  assert.ok(c.angleDelta(3,-3)>0);
});
test('Countdown starts safely and 10-second color zones increase real racing speed',()=>{
  const m=c.seededRace(123),p=m.racers[0];
  assert.equal(m.phase,'ready');
  assert.equal(m.racers.length,4);
  assert.ok(p.progress<0);
  c.tick(m,{x:1,y:0},1/60);
  assert.equal(m.elapsed,0);
  m.ready=.01;c.tick(m,{},1/60);
  assert.equal(m.phase,'running');
  assert.ok(m.events.some(e=>e.type==='go'));
  m.elapsed=9.995;c.tick(m,{},1/60);
  assert.equal(m.zone,1);
  assert.ok(m.tide>0);
  assert.ok(m.events.some(e=>e.type==='zone'&&e.speed===130));
});
test('Joystick steering, braking and Dash modify speed without instant death',()=>{
  const m=c.seededRace(19),p=m.racers[0];
  m.phase='running';
  const a=c.pointAt(p.progress+36);
  c.tick(m,{x:a.x-p.x,y:a.y-p.y,dash:true},1/60);
  assert.equal(p.dashes,1);
  assert.ok(p.dashTime>0&&p.dashCooldown>0);
  assert.ok(p.speed>0);
  c.tick(m,{x:1,y:0,dash:true,brake:true},1/60);
  assert.equal(p.dashes,1);
  assert.ok(p.brakeSeconds>0);
  assert.ok(m.events.some(e=>e.type==='dash'));
  assert.equal(m.finished,false);
});
test('Track edges cost momentum, never kill or teleport the racer',()=>{
  const m=c.seededRace(42),p=m.racers[0];
  m.phase='running';
  const q=c.pointAt(p.progress);
  p.x=q.x+q.nx*(c.TRACK_HALF-2);
  p.y=q.y+q.ny*(c.TRACK_HALF-2);
  p.angle=Math.atan2(q.ny,q.nx);
  p.speed=130;
  c.tick(m,{x:q.nx,y:q.ny},1/30);
  assert.ok(p.edgeHits>=1,p.edgeHits);
  assert.equal(p.finished,false);
  assert.ok(c.closest(p.x,p.y).dist<=c.TRACK_HALF-c.PLAYER_RADIUS+.1);
  assert.ok(m.events.some(e=>e.type==='edge_scrape'));
});
test('AI competitors follow the winding circuit, using steering and braking',()=>{
  const m=c.seededRace(299);
  m.phase='running';
  const p=m.racers[2],d=c.desiredAI(m,p);
  assert.ok(Number.isFinite(d.angle));
  assert.ok(d.curvature>=0);
  for(let i=0;i<120;i++)c.tick(m,{},1/60);
  assert.ok(m.racers.every(r=>Number.isFinite(r.x)&&Number.isFinite(r.y)));
  assert.ok(m.racers.slice(1).some(r=>r.progress>-.01));
  for(const r of m.racers){
    assert.ok(c.closest(r.x,r.y).dist<=c.TRACK_HALF-c.PLAYER_RADIUS+1);
  }
});
test('Seeded AI physics are deterministic, and contact never removes a cube',()=>{
  const a=c.seededRace(770),b=c.seededRace(770);
  a.phase='running';b.phase='running';
  for(let i=0;i<65;i++){c.tick(a,{x:1,y:0},1/60);c.tick(b,{x:1,y:0},1/60)}
  assert.deepEqual(a.racers.map(r=>[+r.x.toFixed(3),+r.y.toFixed(3),r.edgeHits]),
    b.racers.map(r=>[+r.x.toFixed(3),+r.y.toFixed(3),r.edgeHits]));
  const p=a.racers[0],q=a.racers[1];
  q.x=p.x+6;q.y=p.y;p.edgeCooldown=0;q.edgeCooldown=0;
  c.tick(a,{x:0,y:0},1/60);
  assert.ok(p.contacts>=1||q.contacts>=1);
  assert.equal(a.racers.length,4);
  assert.equal(a.finished,false);
});
test('Three genuine laps finish only when the cube crosses the lap boundary',()=>{
  const m=c.seededRace(20),p=m.racers[0];
  m.phase='running';m.elapsed=51;
  p.progress=c.TRACK.length*3-4;
  const at=c.pointAt(p.progress);
  p.x=at.x;p.y=at.y;p.angle=at.angle;p.speed=155;
  c.tick(m,{x:at.tx,y:at.ty},1/30);
  assert.ok(p.finished,p.progress+' / '+c.TRACK.length*3);
  assert.equal(p.laps,3);
  assert.equal(m.phase,'result');
  assert.ok(m.events.some(e=>e.type==='race_end'));
  assert.equal(m.finishPlace,c.currentPosition(m));
});
test('Shortcuts do not grant laps and results can be exported for arcade cup later',()=>{
  const m=c.seededRace(72),p=m.racers[0];
  m.phase='running';
  const far=c.pointAt(c.TRACK.length*.58);
  p.x=far.x;p.y=far.y;p.angle=far.angle;
  const before=p.progress;
  c.tick(m,{x:far.tx,y:far.ty},1/60);
  assert.equal(p.laps,0);
  assert.ok(p.progress<=before+12);
  const data=c.audit(m);
  assert.equal(data.schema,'neon-circuit-run-audit/1.0');
  assert.equal(data.summary.lapsCompleted,0);
  assert.equal(data.racers.length,4);
  assert.ok(Object.hasOwn(data.summary,'brakeSeconds'));
  assert.ok(Object.hasOwn(data.summary,'lineSeconds'));
  assert.ok(Object.hasOwn(data.summary,'edgeHits'));
  assert.doesNotMatch(JSON.stringify(data),/deviceId|fingerprint|rawJoystick/);
});
test('Menu, fullscreen, pause, mobile quality and both control buttons are wired',()=>{
  const page=read('neon-circuit.html'),
    ui=read('src/gameplay/neon-circuit.js'),
    menu=read('index.html');
  for(const id of ['circuit-canvas','circuit-zone','circuit-lap',
    'circuit-place','circuit-flow','circuit-joystick','circuit-stick',
    'circuit-brake','circuit-dash','circuit-pause',
    'circuit-fullscreen','circuit-export','circuit-export-pause'])
    assert.ok(page.includes('id="'+id+'"'),id);
  assert.match(page,/src\/core\/config\.js/);
  assert.match(page,/src\/render\/chroma-center-pulse\.js/);
  assert.match(page,/src\/render\/chroma-identity\.js/);
  assert.match(ui,/const BUDGET=750000/);
  assert.match(ui,/requestFullscreen/);
  assert.match(ui,/JSON\.stringify\(CORE\.audit\(race\)/);
  assert.match(menu,/id="neon-circuit-link"/);
  assert.match(menu,/href="\.\/neon-circuit\.html"/);
});
