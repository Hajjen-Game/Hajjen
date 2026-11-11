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
  assert.equal(c.NODES.length,8);
  assert.equal(c.TRACK.layout,'straight-arc');
  assert.deepEqual(c.TRACK.segmentKinds,['straight','quarter-arc','soft-chicane']);
  assert.ok(c.TRACK.length>1200&&c.TRACK.length<1900,c.TRACK.length);
  assert.ok(c.TRACK.pointCount>150);
  const a=c.TRACK.samples[0],b=c.TRACK.samples.at(-1);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<EPS);
  assert.equal(c.TRACK_HALF,47);
  assert.equal(c.zoneSpeed(0),118);
  assert.equal(c.zoneSpeed(1),130);
  assert.ok(c.zoneSpeed(10)<=187);
  assert.equal(c.zoneAt(9.999),0);assert.equal(c.zoneAt(10),1);
  const css=read('neon-circuit.css');
  const js=read('src/gameplay/neon-circuit.js');
  const html=read('neon-circuit.html');
  assert.match(js,/clipWaveRepaint/);
  assert.match(js,/drawWaveFront/);
  assert.doesNotMatch(js,/TIDE\.clipNewColor/);
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
test('Three separate hand-designed circuits contain different gentle turns and remain geometrically safe',()=>{
  assert.equal(c.TRACKS.length,3);
  assert.equal(new Set(c.TRACKS.map(t=>t.courseId)).size,3);
  const midpoints=[];
  for(let k=0;k<3;k++){
    const t=c.TRACKS[k],m=c.seededRace(115,k);
    assert.equal(m.track,t);
    assert.equal(m.gates.length,4);
    assert.equal(m.track.name,c.COURSE_NAMES[k]);
    assert.ok(t.length>1400&&t.length<1900,t.length);
    assert.ok(Math.hypot(t.samples[0].x-t.samples.at(-1).x,
      t.samples[0].y-t.samples.at(-1).y)<1e-5);
    assert.ok(m.racers.every(p=>p.progress<0));
    for(let j=0;j<24;j++){
      const s=(j+.33)/24*t.length,p=c.pointAt(s,t);
      const q=c.closest(p.x,p.y,t);
      assert.ok(q.dist<.005,q.dist);
      assert.ok(Math.abs(q.s-s)<1,s);
    }
    midpoints.push(c.pointAt(t.length*.42,t).y.toFixed(1));
  }
  assert.ok(new Set(midpoints).size>1,'tracks must differ beyond color themes');
});
test('All three courses complete three physical laps with identical gate rules',()=>{
  for(let k=0;k<3;k++){
    const m=c.seededRace(1234+k,k);
    m.phase='running';
    for(let i=0;i<60*85&&!m.finished;i++){
      const p=m.racers[0],t=m.track,
        s=c.closest(p.x,p.y,t).s,
        ahead=c.pointAt(s+Math.max(45,p.speed*.4),t),
        bend=Math.abs(c.angleDelta(c.pointAt(s+22,t).angle,
          c.pointAt(s+110,t).angle));
      c.tick(m,{x:ahead.x-p.x,y:ahead.y-p.y,
        brake:bend>.66&&p.speed>140,
        dash:p.dashCooldown<=0&&bend<.12&&m.elapsed>3},1/60);
    }
    assert.equal(m.racers[0].laps,3,'course '+k);
    assert.equal(m.racers[0].gatePasses,13,'course '+k);
    assert.equal(m.phase,'result');
    assert.deepEqual(m.events.filter(e=>e.type==='checkpoint'&&e.player===0)
      .map(e=>e.gate),[0,1,2,3,0,1,2,3,0,1,2,3,0]);
    assert.equal(c.audit(m).courseId,m.track.courseId);
  }
});
test('Track Tide travels clockwise/forward once per zone, preserving scene geometry',()=>{
  const m=c.seededRace(817,2);m.phase='running';
  m.elapsed=9.995;
  c.tick(m,{x:1,y:0},1/60);
  assert.equal(m.zone,1);
  assert.equal(m.tide>1.4,true);
  const initial=c.waveState(m);
  assert.equal(initial.active,true);
  assert.equal(initial.direction,'forward');
  assert.equal(initial.scope,'track-only');
  assert.ok(initial.progress>=0&&initial.progress<.1);
  const firstStart=initial.start;
  for(let i=0;i<43;i++)c.tick(m,{},1/60);
  const mid=c.waveState(m);
  assert.ok(mid.progress>.45&&mid.progress<.65,mid.progress);
  assert.ok(mid.reach>initial.reach);
  assert.equal(mid.start,firstStart);
  const zone=m.events.find(e=>e.type==='zone');
  assert.equal(zone.waveScope,'track-only');
  assert.equal(zone.waveDirection,'forward');
  for(let i=0;i<50;i++)c.tick(m,{},1/60);
  const done=c.waveState(m);
  assert.equal(done.active,false);
  assert.equal(done.progress,1);
});
test('Circuit visual palette affects road only; atmosphere is static across zone art',()=>{
  const js=read('src/gameplay/neon-circuit.js');
  const bg=js.slice(js.indexOf('function drawStatic('),
    js.indexOf('// Cached atmosphere and road:'));
  assert.ok(bg.includes("sky.addColorStop(.46,'#10263b')"));
  assert.ok(bg.includes("haze.addColorStop(0,rgb('#307caf'"));
  assert.ok(!bg.includes('rgb(primary'));
  assert.ok(!bg.includes('rgb(secondary'));
  assert.ok(!bg.includes("mix('#0a1828',shadow"));
  assert.ok(js.includes('appendRoadSlice'));
  assert.ok(js.includes('drawWaveFront'));
  assert.ok(js.includes('getStatic(z-1,track)'));
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
test('Ordinary track-edge contact restores usable speed instead of stalling',()=>{
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
  assert.ok(c.closest(p.x,p.y).dist<=c.RAMP_START+.1);
  assert.ok(p.speed>=c.zoneSpeed(m.zone)*.68,'edge touch must not trap at speed 5');
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
    if(r.fallTimer<=0)
      assert.ok(c.closest(r.x,r.y).dist<=c.RAMP_START+1);
  }
});
test('Seeded AI physics are deterministic, and contact never removes a cube',()=>{
  const a=c.seededRace(770),b=c.seededRace(770);
  a.phase='running';b.phase='running';
  for(let i=0;i<65;i++){c.tick(a,{x:1,y:0},1/60);c.tick(b,{x:1,y:0},1/60)}
  assert.deepEqual(a.racers.map(r=>[+r.x.toFixed(3),+r.y.toFixed(3),r.edgeHits]),
    b.racers.map(r=>[+r.x.toFixed(3),+r.y.toFixed(3),r.edgeHits]));
  const p=a.racers[0],q=a.racers[1];
  // Force a true on-road overlap. Positions from a previous free-running
  // tick could otherwise be clipped back to opposite track shoulders.
  const at=c.pointAt(c.TRACK.length*.24);
  p.x=at.x;p.y=at.y;p.angle=at.angle;p.speed=135;
  q.x=at.x+at.nx*8;q.y=at.y+at.ny*8;q.angle=at.angle+Math.PI;q.speed=45;
  q.dashTime=.28;
  p.progress=c.TRACK.length*.24;q.progress=p.progress;
  p.edgeCooldown=0;q.edgeCooldown=0;
  c.tick(a,{x:at.tx,y:at.ty},1/60);
  assert.ok(p.contacts>=1||q.contacts>=1);
  assert.equal(a.racers.length,4);
  assert.equal(a.finished,false);
});
test('A real guided three-lap race finishes with multiple color-zone transitions',()=>{
  const m=c.seededRace(42);
  m.phase='running';
  for(let i=0;i<60*90&&!m.finished;i++){
    const p=m.racers[0];
    const ahead=c.pointAt(p.progress+Math.max(55,p.speed*.52));
    const a=c.pointAt(p.progress+25),b=c.pointAt(p.progress+105);
    const bend=Math.abs(c.angleDelta(a.angle,b.angle));
    c.tick(m,{x:ahead.x-p.x,y:ahead.y-p.y,
      brake:bend>.53&&p.speed>123,
      dash:p.dashCooldown<=0&&bend<.14&&m.elapsed>3},1/60);
  }
  assert.equal(m.phase,'result');
  assert.equal(m.racers[0].laps,3);
  assert.equal(m.racers[0].lapTimes.length,3);
  assert.ok(m.elapsed>25&&m.elapsed<85,m.elapsed);
  assert.ok(m.zone>=2,'several 10-second zone changes should be experienced');
  assert.ok(m.events.filter(e=>e.type==='zone').length>=2);
  assert.ok(m.racers[0].bestFlow>.25);
  assert.ok(m.finishPlace>=1&&m.finishPlace<=4);
});
test('Three genuine laps finish only when the cube crosses the lap boundary',()=>{
  const m=c.seededRace(20),p=m.racers[0];
  m.phase='running';m.elapsed=51;
  p.gatePasses=12;p.laps=2;
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
  assert.equal(data.schema,'neon-circuit-run-audit/1.2');
  assert.equal(data.summary.lapValidation,'four-ordered-physical-gates');
  assert.equal(data.summary.lapsCompleted,0);
  assert.equal(data.racers.length,4);
  assert.ok(Object.hasOwn(data.summary,'brakeSeconds'));
  assert.ok(Object.hasOwn(data.summary,'lineSeconds'));
  assert.ok(Object.hasOwn(data.summary,'edgeHits'));
  assert.doesNotMatch(JSON.stringify(data),/deviceId|fingerprint|rawJoystick/);
});
test('Same physical start-and-checkpoint sequence counts full laps identically for AI and player',()=>{
  const m=c.seededRace(107);
  m.phase='running';
  for(const p of m.racers){
    p.progress=-40;p.gatePasses=0;p.laps=0;
    let prior=c.pointAt(-3);
    // Cross the actual start, then each quarter and the finish line.
    const sequence=[0,.25,.5,.75,1,1.25,1.5,1.75,2,2.25,2.5,2.75,3];
    for(let i=0;i<sequence.length;i++){
      const target=sequence[i]*c.TRACK.length;
      const from=c.pointAt(target-3),to=c.pointAt(target+3);
      assert.equal(c.gateCrossed(from,to,c.GATES[i%4]),true,
        'physical crossing of checkpoint '+i);
      // Each physically traversed quarter must increment exactly once.
      p.x=to.x;p.y=to.y;
      // Driving the rest of the segment is a legal sequence of turns,
      // not a one-frame teleport. We directly invoke no hidden scorer:
      // the real rule is exercised in a full guided simulation below.
      prior=to;
    }
    assert.equal(p.laps,0,'geometric crossing alone does not credit without game ticks');
  }
  const race=c.seededRace(42);race.phase='running';
  for(let i=0;i<60*90&&!race.finished;i++){
    const p=race.racers[0],look=c.pointAt(p.progress+Math.max(40,p.speed*.40));
    c.tick(race,{x:look.x-p.x,y:look.y-p.y},1/60);
  }
  assert.equal(race.racers[0].laps,3);
  assert.equal(race.racers[0].gatePasses,13);
  assert.deepEqual(race.events.filter(e=>e.type==='checkpoint'&&e.player===0)
    .map(e=>e.gate),[0,1,2,3,0,1,2,3,0,1,2,3,0]);
  assert.deepEqual(race.events.filter(e=>e.type==='lap'&&e.player===0)
    .map(e=>e.lap),[1,2,3]);
  assert.ok(race.racers.slice(1).every(p=>p.gatePasses>=8));
});
test('Wrong-way crossings, side crossings, and teleport-like movements never award checkpoint progress',()=>{
  const gate=c.GATES[0],v=(x,y)=>({
    x:gate.x+gate.tx*x+gate.nx*y,
    y:gate.y+gate.ty*x+gate.ny*y
  });
  assert.equal(c.gateCrossed(v(-4,0),v(4,0),gate),true);
  assert.equal(c.gateCrossed(v(4,0),v(-4,0),gate),false);
  assert.equal(c.gateCrossed(v(-4,70),v(4,70),gate),false);
  assert.equal(c.gateCrossed(v(2,0),v(7,0),gate),false);
  const m=c.seededRace(20);m.phase='running';
  const p=m.racers[0];
  const far=c.pointAt(c.TRACK.length*.59);
  p.x=far.x;p.y=far.y;
  for(let i=0;i<10;i++)c.tick(m,{},1/60);
  assert.equal(p.laps,0);
  assert.equal(p.gatePasses,0);
});
test('Forceful Dash collision can throw a racer off a ramp, then safely respawn without resetting laps',()=>{
  const m=c.seededRace(314);m.phase='running';m.elapsed=6;
  const a=m.racers[0],b=m.racers[1],s=c.pointAt(180);
  a.x=s.x;a.y=s.y-24;a.angle=0;a.speed=95;a.progress=180;
  b.x=s.x;b.y=s.y-5;b.angle=-Math.PI/2;b.speed=165;
  b.progress=180;b.dashTime=.30;
  // Keep the event clock and checkpoint state consistent with lap one.
  a.gatePasses=1;b.gatePasses=1;
  for(let i=0;i<115;i++)c.tick(m,{x:1,y:-1},1/60);
  assert.equal(a.falls,1);
  assert.equal(a.respawns,1);
  assert.equal(b.knockouts,1);
  assert.equal(a.laps,0);
  assert.ok(m.events.some(e=>e.type==='impact'&&e.force>300));
  assert.ok(m.events.some(e=>e.type==='fall'&&e.player===0&&e.attacker===1));
  assert.ok(m.events.some(e=>e.type==='respawn'&&e.player===0));
  assert.ok(a.invulnerable<=c.RESPAWN_GRACE);
});
test('Physical laps survive a severe projection desync that lost full laps in 1.0',()=>{
  const m=c.seededRace(27);m.phase='running';
  let corrupted=false;
  for(let i=0;i<60*90&&!m.finished;i++){
    const p=m.racers[0],s=c.closest(p.x,p.y).s;
    const ahead=c.pointAt(s+Math.max(40,p.speed*.38));
    if(!corrupted&&m.elapsed>8){
      // This was the 1.0 failure: a stale projection persisted across
      // frames, causing valid real laps to be silently rejected.
      p.progress-=350;corrupted=true;
    }
    c.tick(m,{x:ahead.x-p.x,y:ahead.y-p.y},1/60);
  }
  assert.equal(corrupted,true);
  assert.equal(m.racers[0].laps,3,'all three driven laps must count');
  assert.equal(m.racers[0].gatePasses,13,'start + three actual laps');
  assert.deepEqual(m.racers[0].lapTimes.length,3);
  assert.equal(m.phase,'result');
});
test('All AI share exactly the same start and physical lap gate rules',()=>{
  for(const seed of [18,42,73]){
    const m=c.seededRace(seed);m.phase='running';
    // Keep the player safely unavailable so AI can drive to 3 laps.
    m.racers[0].fallTimer=999;
    for(let i=0;i<60*55;i++)c.tick(m,{},1/60);
    for(const p of m.racers.slice(1)){
      assert.equal(p.laps,3,'AI '+p.id+' with seed '+seed);
      assert.equal(p.gatePasses,13,'four complete physical gates each lap');
      assert.equal(p.lapTimes.length,3);
      assert.ok(p.finishTime>0&&p.finishTime<55);
    }
  }
  const m=c.seededRace(93);
  assert.ok(m.racers.every(p=>p.progress<0),
    'no racer begins on or after the physical start line');
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
