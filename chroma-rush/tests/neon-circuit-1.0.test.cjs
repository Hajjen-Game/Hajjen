/* CHROMA RUSH — Neon Circuit 2.4 Track Architecture & Banked Racing regression */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../src/gameplay/neon-circuit-core.js');
const Camera=require('../src/gameplay/neon-circuit-camera.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function guide(r){
  const p=r.racers[0],track=r.track;
  const s=C.closest(p.x,p.y,track).s;
  const a=C.pointAt(s+Math.max(55,p.speed*.42),track);
  const near=C.pointAt(s+27,track),far=C.pointAt(s+130,track);
  const bend=Math.abs(C.angleDelta(near.angle,far.angle));
  return {x:a.x-p.x,y:a.y-p.y,
    brake:bend>.58&&p.speed>161,
    dash:p.dashCooldown<=0&&bend<.1&&r.elapsed>5};
}
function run(seed=42,limit=145,damage=false){
  const m=C.seededRace(seed);m.phase='running';
  let corrupted=false;
  for(let i=0;i<limit*60&&!m.finished;i++){
    if(damage&&!corrupted&&m.elapsed>8){
      m.racers[0].progress-=950;corrupted=true;
    }
    C.tick(m,guide(m),C.STEP);
  }
  return m;
}
test('2.1 replaces tiny arena with one physical multi-screen world course',()=>{
  assert.equal(C.TRACKS.length,1);
  assert.equal(C.TRACK.layout,'multi-screen-world-track');
  assert.equal(C.TRACK.courseId,'spectral-highway');
  assert.ok(C.TRACK.length>4600&&C.TRACK.length<5500);
  assert.ok(C.TRACK.bounds.maxX-C.TRACK.bounds.minX>1800);
  assert.ok(C.TRACK.bounds.maxY-C.TRACK.bounds.minY>900);
  assert.ok(C.TRACK.pointCount>550);
  const a=C.TRACK.samples[0],b=C.TRACK.samples.at(-1);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-5);
  assert.ok(C.WORLD_BOUNDS.minX<C.TRACK.bounds.minX);
  assert.ok(C.WORLD_BOUNDS.maxY>C.TRACK.bounds.maxY);
  assert.deepEqual(C.TRACK.segmentKinds,
    ['straight','constant-radius-arc','banked-hairpin']);
});
test('2.4 road has exact circular turns, an extended straight and no wobbling Bézier bends',()=>{
  const t=C.TRACK;
  const straights=t.sections.filter(s=>s.kind==='straight');
  const arcs=t.sections.filter(s=>s.kind==='arc');
  const straightDistance=straights.reduce((n,s)=>n+s.length,0);
  assert.ok(straightDistance/t.length>.50,'not enough true straight road');
  assert.ok(Math.max(...straights.map(s=>s.length))>680);
  assert.ok(arcs.length>=7);
  for(const arc of arcs){
    assert.ok(Number.isFinite(arc.cx)&&Number.isFinite(arc.cy));
    assert.ok(arc.radius>150);
    const p=C.pointAt((arc.start+arc.end)*.5,t);
    const radial=Math.hypot(p.x-arc.cx,p.y-arc.cy);
    assert.ok(Math.abs(radial-arc.radius)<.11,
      'arc has nonconstant radius: '+radial+' vs '+arc.radius);
    assert.ok(Math.abs(arc.curvature-arc.sign/arc.radius)<1e-10);
  }
  assert.ok(t.rimSamples.length>350);
});
test('2.4 banked corners have a taller outer lip and recoverable ramp',()=>{
  const sharp=C.TRACK.sections.find(s=>s.kind==='arc'&&s.radius<240);
  assert.ok(sharp);
  const mid=(sharp.start+sharp.end)*.5;
  const outside=C.edgeAt(mid,-sharp.sign);
  const inside=C.edgeAt(mid,sharp.sign);
  assert.ok(outside.limit>inside.limit+5);
  assert.ok(outside.limit>C.FALL_EDGE+8);
  assert.ok(C.edgeAt(C.TRACK.sections[0].start+55,1).limit===C.FALL_EDGE);
  const race=C.seededRace(54);race.phase='running';
  for(const p of race.racers.slice(1))p.finished=true;
  const me=race.racers[0],at=C.pointAt(mid),sign=-sharp.sign;
  me.x=at.x+at.nx*sign*(C.FALL_EDGE-3);
  me.y=at.y+at.ny*sign*(C.FALL_EDGE-3);
  me.angle=at.angle;me.speed=120;
  me.vx=at.tx*120;me.vy=at.ty*120;
  for(let i=0;i<100;i++)C.tick(race,{
    x:at.tx-at.nx*sign*.7,y:at.ty-at.ny*sign*.7},C.STEP);
  assert.equal(me.falls,0,'a banked turn should permit recovery');
  assert.ok(me.bankRides>.15);
  assert.ok(me.bankSaves>=1);
});
test('2.4 three in-road boost pads trigger without collecting a power-up',()=>{
  const pads=C.TRACK.boosts;
  assert.equal(pads.length,3);
  assert.deepEqual(pads.map(p=>p.id),[0,1,2]);
  for(const pad of pads){
    const section=C.TRACK.sections.find(s=>s.start<=pad.s&&s.end>=pad.s);
    assert.equal(section.kind,'straight');
    assert.ok(pad.halfWidth>=12&&pad.halfLength>=30);
  }
  const race=C.seededRace(94);race.phase='running';
  for(const opponent of race.racers.slice(1))opponent.finished=true;
  const me=race.racers[0],pad=pads[0],at=C.pointAt(pad.s-55);
  me.x=at.x+at.nx*pad.lane;me.y=at.y+at.ny*pad.lane;
  me.angle=at.angle;me.speed=185;
  me.vx=at.tx*185;me.vy=at.ty*185;
  for(let i=0;i<42;i++)C.tick(race,{x:at.tx,y:at.ty},C.STEP);
  assert.equal(me.boosts,1);
  assert.equal(me.boostPadId,0);
  assert.ok(me.speed>185&&me.boostTime>0);
  assert.ok(race.events.some(e=>e.type==='boost'&&e.pad===0&&e.player===0));
});
test('2.1 neutral joystick never secretly drives or steers the cube',()=>{
  const r=C.seededRace(42);r.phase='running';
  const p=r.racers[0],x=p.x,y=p.y,heading=p.angle;
  for(let i=0;i<120;i++)C.tick(r,{},C.STEP);
  assert.equal(p.speed,0);
  assert.ok(Math.hypot(p.x-x,p.y-y)<.01);
  assert.equal(p.angle,heading);
  assert.equal(p.gatePasses,0);
  assert.ok(p.coastSeconds>1.9);
  // Aiming right now provides all propulsion; release decelerates.
  for(let i=0;i<60;i++)C.tick(r,{x:1,y:0},C.STEP);
  assert.ok(p.speed>140,'hold-stick speed: '+p.speed);
  assert.ok(p.x>x+50,'manual acceleration failed');
  assert.ok(p.driveSeconds>.9);
  const headingDriven=p.angle;
  for(let i=0;i<65;i++)C.tick(r,{},C.STEP);
  assert.equal(p.speed,0,'neutral must coast to a stop');
  assert.equal(p.angle,headingDriven,'no invisible corner tracking');
});
test('2.1 player can turn against the line and cannot dash from rest',()=>{
  const r=C.seededRace(54);r.phase='running';
  const p=r.racers[0],start=p.angle;
  C.tick(r,{dash:true},C.STEP);
  assert.equal(p.dashes,0,'idle dash is not propulsion');
  for(let i=0;i<30;i++)C.tick(r,{x:0,y:1},C.STEP);
  assert.ok(C.angleDelta(start,p.angle)>1,'joystick controls heading');
  assert.ok(p.speed>40);
  C.tick(r,{x:0,y:1,dash:true},C.STEP);
  assert.equal(p.dashes,1);
});
test('2.2 the road edge is fallable with momentum, not invisible autopilot',()=>{
  const r=C.seededRace(19);r.phase='running';
  for(const other of r.racers.slice(1))other.finished=true;
  const me=r.racers[0],at=C.pointAt(500);
  me.x=at.x+at.nx*(C.RAMP_START-3);
  me.y=at.y+at.ny*(C.RAMP_START-3);
  me.angle=Math.atan2(at.ny,at.nx);me.speed=200;
  for(let i=0;i<35;i++)C.tick(r,{x:at.nx,y:at.ny},C.STEP);
  assert.equal(me.falls,1,'player must genuinely leave the track');
  assert.ok(r.events.some(e=>e.type==='fall'&&e.player===0));
  assert.ok(me.fallTimer>0,'fall should visibly take time');
  for(let i=0;i<80;i++)C.tick(r,{},C.STEP);
  assert.ok(me.respawns>=1);
  assert.equal(me.speed,0,'respawn must not restore autopilot');
  assert.ok(me.invulnerable>=0&&Number.isFinite(me.x));
});
test('2.2 intentional non-Dash contact can eject an opponent and credit KO',()=>{
  const r=C.seededRace(10);r.phase='running';r.elapsed=5;
  for(const other of r.racers.slice(2))other.finished=true;
  const a=r.racers[0],b=r.racers[1],road=C.pointAt(540);
  a.x=road.x-road.nx*12;a.y=road.y-road.ny*12;
  a.angle=Math.atan2(road.ny,road.nx);a.speed=210;
  b.x=road.x+road.nx*9;b.y=road.y+road.ny*9;
  b.angle=road.angle;b.speed=20;
  for(let i=0;i<120;i++)C.tick(r,i<2?
    {x:road.nx,y:road.ny}:
    {x:road.tx,y:road.ty,brake:i<25},C.STEP);
  assert.equal(b.falls,1,'victim should fall from shove');
  assert.equal(a.knockouts,1,'shove should credit attacker');
  assert.equal(a.falls,0,'attacker should be able to steer to safety');
  assert.ok(r.events.some(e=>e.type==='fall'&&e.player===1&&e.attacker===0));
});
test('2.2 enemy momentum can shove a stationary player off the road',()=>{
  const r=C.seededRace(8);r.phase='running';r.elapsed=8;
  for(const other of r.racers.slice(2))other.finished=true;
  const player=r.racers[0],enemy=r.racers[1],road=C.pointAt(540);
  player.x=road.x+road.nx*20;player.y=road.y+road.ny*20;
  player.speed=0;player.angle=road.angle;
  enemy.x=road.x-road.nx;enemy.y=road.y-road.ny;
  enemy.angle=Math.atan2(road.ny,road.nx);enemy.speed=220;
  for(let i=0;i<60;i++)C.tick(r,{},C.STEP);
  assert.equal(player.falls,1);
  assert.equal(enemy.knockouts,1);
  assert.ok(r.events.some(e=>e.type==='fall'&&e.player===0&&e.attacker===1));
});
test('2.2 closer zoom preserves distant road visibility at higher speed',()=>{
  const v={width:812,height:375};
  const slow=Camera.desiredZoom(v.height,170);
  const fast=Camera.desiredZoom(v.height,260);
  assert.ok(slow>1.03,'needs a considerably closer camera than 2.1');
  assert.ok(fast>.78,'higher speed must remain closer than 2.1');
  assert.ok(fast<slow*.87,'speed-related zoom-out must remain');
  const p={x:700,y:350,angle:0,speed:170,respawns:0};
  const cam=Camera.create(C.WORLD_BOUNDS,v,p);
  p.fallTimer=.5;p.fallAnchorX=p.x;p.fallAnchorY=p.y;
  p.x+=150;
  for(let i=0;i<40;i++)Camera.step(cam,p,v,1/60);
  const holding=Camera.worldToScreen(cam,p.fallAnchorX,p.fallAnchorY);
  assert.ok(Math.abs(holding.x-v.width*.5)<150);
  p.fallTimer=0;p.respawns=1;p.x=1600;
  Camera.step(cam,p,v,1/60);
  const followed=Camera.worldToScreen(cam,p.x,p.y);
  assert.ok(Math.abs(followed.x-v.width*.5)<170);
});
test('2.3 AI seeks real rival contact and can eject other AI racers',()=>{
  const seeds=[18,27,42,77],outcomes=[];
  for(const seed of seeds){
    const m=run(seed,110),events=m.events;
    const attacks=events.filter(e=>e.type==='ai_attack'&&e.attacker>0);
    const aiCollisions=events.filter(e=>e.type==='impact'&&e.a>0&&e.b>0);
    const aiFalls=events.filter(e=>e.type==='fall'&&e.player>0);
    outcomes.push({attacks:attacks.length,
      collisions:aiCollisions.length,falls:aiFalls.length});
    assert.ok(m.racers[0].laps===3,'guided lap path must survive rival AI');
    assert.ok(attacks.length>=4,'passive AI: '+JSON.stringify(outcomes));
    assert.ok(aiCollisions.length>=2,'no AI-versus-AI pressure');
  }
  assert.ok(outcomes.some(o=>o.falls>=1),
    'AI attacks never create track ejections');
});
test('2.3 spectral wave begins fully offscreen, follows player and feathers',()=>{
  const m=C.seededRace(91);m.phase='running';m.elapsed=9.995;
  C.tick(m,{},C.STEP);
  const a=C.waveState(m);
  assert.ok(a.active&&a.reach<100);
  assert.ok(a.behind>650&&a.feather>=60);
  const start=a.start,playerStart=a.playerStart;
  assert.ok(Math.abs((playerStart-start+C.TRACK.length)%
    C.TRACK.length-a.behind)<1);
  for(let i=0;i<85;i++)C.tick(m,{},C.STEP);
  const b=C.waveState(m);
  assert.ok(b.reach>a.behind*2,'front must travel visibly along the track');
  assert.equal(a.start,b.start,'source of wave should never follow player');
  assert.ok(b.reach<C.TRACK.length,'a longer and slower Rush-like sweep');
});
test('Path lookup is continuous, tangent-normal and physically projected',()=>{
  for(let i=0;i<35;i++){
    const s=(i+.33)/35*C.TRACK.length;
    const p=C.pointAt(s),q=C.closest(p.x,p.y);
    assert.ok(q.dist<.003);
    assert.ok(Math.abs(q.s-s)<1.5);
    assert.ok(Math.abs(p.tx*p.nx+p.ty*p.ny)<.001);
    assert.ok(Math.hypot(p.tx,p.ty)>.98);
  }
  assert.ok(C.TRACK.length>C.WIDTH*4);
});
test('Long race geometry has a safe corridor and broad corners',()=>{
  const s=C.TRACK.samples;
  let shortest=Infinity,rad=Infinity;
  for(let i=1;i<s.length-1;i++){
    const a=s[i-1],b=s[i],d=s[i+1];
    const aa=Math.atan2(b.y-a.y,b.x-a.x);
    const ab=Math.atan2(d.y-b.y,d.x-b.x);
    const turn=Math.abs(C.angleDelta(aa,ab));
    if(turn>.0001)rad=Math.min(rad,Math.hypot(d.x-b.x,d.y-b.y)/turn);
    for(let j=i+1;j<s.length-1;j++){
      const dist=Math.abs(s[j].s-b.s);
      if(Math.min(dist,C.TRACK.length-dist)<200)continue;
      shortest=Math.min(shortest,Math.hypot(s[j].x-b.x,s[j].y-b.y));
    }
  }
  assert.ok(rad>110,'radius: '+rad);
  assert.ok(shortest>2*C.TRACK_HALF+60,'separation: '+shortest);
});
test('Four racers use identical physical gates and start behind the line',()=>{
  const r=C.seededRace(91);
  assert.equal(r.racers.length,4);
  assert.equal(r.gates.length,4);
  assert.ok(r.racers.every(p=>p.progress<0));
  assert.ok(r.racers.every(p=>p.gatePasses===0));
  assert.equal(r.ready,C.READY_SECONDS);
  assert.equal(C.MAX_RACE_SECONDS,165);
});
test('Countdown is non-lethal and GO starts the physical race',()=>{
  const r=C.seededRace(19);
  C.tick(r,{x:1,y:0,dash:true},C.STEP);
  assert.equal(r.elapsed,0);
  assert.equal(r.racers[0].dashes,0);
  r.ready=.01;C.tick(r,{},C.STEP);
  assert.equal(r.phase,'running');
  assert.ok(r.events.some(e=>e.type==='go'));
});
test('Guided actual world race completes three genuine laps, thirteen gates',()=>{
  const r=run(42);
  const p=r.racers[0];
  assert.equal(r.phase,'result');
  assert.equal(p.laps,3);
  assert.equal(p.gatePasses,13);
  assert.equal(p.lapTimes.length,3);
  assert.ok(r.elapsed>45&&r.elapsed<105,'duration '+r.elapsed);
  assert.deepEqual(r.events.filter(e=>e.type==='checkpoint'&&e.player===0)
    .map(e=>e.gate),[0,1,2,3,0,1,2,3,0,1,2,3,0]);
  assert.deepEqual(r.events.filter(e=>e.type==='lap'&&e.player===0)
    .map(e=>e.lap),[1,2,3]);
  assert.ok(r.zone>=4,'multiple 10s zones must be seen');
  assert.ok(p.bestFlow>.6);
});
test('Physical checkpoints still count after the exact stale-projection bug',()=>{
  const r=run(27,145,true);
  assert.equal(r.racers[0].laps,3);
  assert.equal(r.racers[0].gatePasses,13);
  assert.equal(r.racers[0].lapTimes.length,3);
});
test('Seeded rivals are deterministic and can compete on the long course',()=>{
  const a=run(18),b=run(18);
  assert.deepEqual(a.racers.map(p=>[p.laps,p.gatePasses,p.edgeHits]),
    b.racers.map(p=>[p.laps,p.gatePasses,p.edgeHits]));
  assert.equal(a.racers[0].laps,3);
  assert.ok(a.racers.slice(1).some(p=>p.gatePasses>=12));
  assert.ok(a.finishPlace>=1&&a.finishPlace<=4);
});
test('Wrong-way and sideways shortcut gate crossings do not score laps',()=>{
  const gate=C.GATES[0];
  const at=(along,across)=>({
    x:gate.x+gate.tx*along+gate.nx*across,
    y:gate.y+gate.ty*along+gate.ny*across
  });
  assert.equal(C.gateCrossed(at(-3,0),at(3,0),gate),true);
  assert.equal(C.gateCrossed(at(3,0),at(-3,0),gate),false);
  assert.equal(C.gateCrossed(at(-3,70),at(3,70),gate),false);
  const r=C.seededRace(34);r.phase='running';
  const far=C.pointAt(C.TRACK.length*.63);
  r.racers[0].x=far.x;r.racers[0].y=far.y;
  for(let i=0;i<12;i++)C.tick(r,{},C.STEP);
  assert.equal(r.racers[0].laps,0);
  assert.equal(r.racers[0].gatePasses,0);
});
test('Edge scrape recovers speed rather than stalling at almost zero',()=>{
  const r=C.seededRace(51);r.phase='running';
  const p=r.racers[0],at=C.pointAt(p.progress);
  p.x=at.x+at.nx*(C.RAMP_START-2);
  p.y=at.y+at.ny*(C.RAMP_START-2);
  p.angle=Math.atan2(at.ny,at.nx);p.speed=C.zoneSpeed(0);
  C.tick(r,{x:at.nx,y:at.ny},1/30);
  assert.ok(p.edgeHits>=1);
  assert.ok(p.speed>=C.zoneSpeed(0)*.68);
  assert.equal(p.falls,0);
});
test('Dash, BRAKE and ramp ejection retain their recovery gameplay',()=>{
  const r=C.seededRace(314);r.phase='running';r.elapsed=6;
  const a=r.racers[0],b=r.racers[1],at=C.pointAt(180);
  // In WORLD coordinates this is a deliberate high-energy side impact
  // near the track lip, not a coincidental overlap in the old arena.
  a.x=at.x-at.nx*29;a.y=at.y-at.ny*29;
  a.angle=at.angle;a.speed=95;a.progress=180;
  b.x=at.x-at.nx*11;b.y=at.y-at.ny*11;
  b.angle=at.angle-Math.PI/2;b.speed=165;
  b.progress=180;b.dashTime=.30;a.gatePasses=b.gatePasses=1;
  for(let i=0;i<115;i++)C.tick(r,{x:1,y:-1},C.STEP);
  assert.ok(a.falls>=1);
  assert.ok(a.respawns>=1);
  assert.equal(a.laps,0);
  assert.ok(r.events.some(e=>e.type==='impact'));
  assert.ok(r.events.some(e=>e.type==='respawn'));
  const t=C.seededRace(33);t.phase='running';
  C.tick(t,{x:1,y:0,dash:true,brake:true},C.STEP);
  assert.equal(t.racers[0].dashes,1);
  assert.ok(t.racers[0].dashCooldown>0);
  assert.ok(t.racers[0].brakeSeconds>0);
});
test('Track Tide still changes zones each ten seconds and follows the road',()=>{
  const r=C.seededRace(817);r.phase='running';r.elapsed=9.995;
  C.tick(r,{},C.STEP);
  assert.equal(r.zone,1);
  assert.equal(C.zoneSpeed(0),172);
  assert.equal(C.zoneSpeed(1),186);
  const start=C.waveState(r);
  assert.equal(start.scope,'track-only');
  assert.equal(start.direction,'forward');
  assert.equal(start.style,'spectral-feather-prismatic-front');
  assert.equal(start.behind,C.WAVE_START_BACK);
  assert.ok(C.WAVE_START_BACK>650);
  const startSeparation=((start.playerStart-start.start+C.TRACK.length)%
    C.TRACK.length);
  assert.ok(Math.abs(startSeparation-C.WAVE_START_BACK)<.1);
  assert.ok(start.reach<40,'first physics tick advances the wave slightly');;
  assert.equal(C.COLOR_WAVE_SECONDS,3.15);
  assert.ok(start.active);
  for(let i=0;i<43;i++)C.tick(r,{},C.STEP);
  const later=C.waveState(r);
  assert.ok(later.reach>start.reach);
  assert.equal(later.start,start.start);
  assert.ok(r.events.some(e=>e.type==='zone'&&
    e.waveScope==='track-only'&&e.waveDirection==='forward'));
});
test('Camera tracks world player and previews forward path without rotation',()=>{
  const player={x:700,y:350,angle:0,speed:170};
  const viewport={width:960,height:540};
  const cam=Camera.create(C.WORLD_BOUNDS,viewport,player);
  const origin={x:cam.x,y:cam.y};
  player.x+=250;player.y+=70;
  Camera.step(cam,player,viewport,1/60);
  assert.ok(cam.x>origin.x&&cam.x<player.x+165);
  assert.ok(cam.y>origin.y);
  assert.ok(cam.lookAhead>60);
  const p=Camera.worldToScreen(cam,player.x,player.y);
  const roundTrip=Camera.screenToWorld(cam,p.x,p.y);
  assert.ok(Math.hypot(roundTrip.x-player.x,roundTrip.y-player.y)<1e-6);
  const view=Camera.viewBounds(cam);
  assert.ok(view.maxX-view.minX>600&&view.maxX-view.minX<1700);
});
test('Dynamic zoom shows more road at speed while keeping the cube square',()=>{
  const v={width:812,height:375},low={x:700,y:350,angle:0,speed:170};
  const cam=Camera.create(C.WORLD_BOUNDS,v,low);
  const z=cam.zoom;low.speed=260;
  for(let i=0;i<90;i++)Camera.step(cam,low,v,1/60);
  assert.ok(cam.zoom<z*.87,'camera did not zoom out: '+cam.zoom+'/'+z);
  assert.ok(Math.abs(cam.targetZoom-Camera.desiredZoom(v.height,260))<.02);
  assert.ok(Camera.viewBounds(cam).maxX-Camera.viewBounds(cam).minX>
    v.width/z,'higher speed must reveal a longer stretch of road');
  const wide={width:1536,height:691};
  const normalized=Camera.desiredZoom(wide.height,170)*540/wide.height;
  assert.ok(normalized>1.4&&normalized<1.65,'close view across mobile aspect ratios');
});
test('Camera snaps safely on respawn and stays within world bounds',()=>{
  const viewport={width:960,height:540};
  const p={x:600,y:400,angle:1.3,speed:210};
  const cam=Camera.create(C.WORLD_BOUNDS,viewport,p);
  p.x=2100;p.y=1100;
  Camera.step(cam,p,viewport,.016);
  const target=Camera.confine(p.x+Camera.lookAhead(p).x,
    p.y+Camera.lookAhead(p).y,cam.zoom,viewport,C.WORLD_BOUNDS);
  assert.ok(Math.hypot(cam.x-target.x,cam.y-target.y)<1,'respawn camera should snap');
  assert.ok(Number.isFinite(cam.zoom)&&cam.zoom>0);
  assert.ok(cam.updates===1);
});
test('Renderer has visible tile cache, world transform and no monolithic world raster',()=>{
  const js=read('src/gameplay/neon-circuit.js');
  assert.ok(js.includes('const TILE=448'));
  assert.ok(js.includes('const tileCache=new Map()'));
  assert.ok(js.includes('TILE_LIMIT=36'));
  assert.ok(js.includes('function drawRoadTiles'));
  assert.ok(js.includes('function drawWorldBackdrop'));
  assert.ok(js.includes('ctx.scale(camera.zoom,camera.zoom)'));
  assert.ok(js.includes('CAMERA.viewBounds(camera'));
  assert.ok(js.includes('clipWaveRepaint(ctx,track,wave)'));
  assert.ok(js.includes('drawWaveFront(ctx,track,wave'));
  assert.ok(js.includes('function waveRibbon'));
  assert.ok(js.includes('function drawBankedEdges'));
  assert.ok(js.includes('function drawBoostPads'));
  assert.ok(js.includes('track.rimSamples'));
  assert.ok(js.includes('boostTime>0'));
  assert.ok(!js.includes('getStatic(z,track)'));
  assert.ok(js.includes('const shimmer=side'));
  assert.ok(js.includes('clipWaveRepaint(ctx,track,wave,offset)'));;
  assert.ok(!js.includes('getStatic(z,track)'));
  assert.ok(!js.includes('panoWidth'));
  assert.ok(!js.includes('scaleX=viewW/WIDTH'));
});
test('Phone joystick/Brake/Dash, pause, fullscreen and local logs are still wired',()=>{
  const html=read('neon-circuit.html'),js=read('src/gameplay/neon-circuit.js');
  for(const id of ['circuit-canvas','circuit-zone','circuit-lap',
    'circuit-place','circuit-flow','circuit-joystick','circuit-stick',
    'circuit-brake','circuit-dash','circuit-pause','circuit-fullscreen',
    'circuit-export','circuit-export-pause'])
      assert.ok(html.includes('id="'+id+'"'),id);
  assert.ok(html.includes('neon-circuit-camera.js?v=neon-circuit-2.4'));
  assert.ok(js.includes("requestFullscreen"));
  assert.ok(js.includes('JSON.stringify(CORE.audit(race)'));
  assert.ok(js.includes('getInput()'));
});
test('Run audit 2.3 includes falls, AI aggression and the spectral wave without private input history',()=>{
  const r=run(77);
  const a=C.audit(r);
  assert.equal(a.schema,'neon-circuit-run-audit/2.4');
  assert.equal(a.build,'neon-circuit-2.4');
  assert.equal(a.courseId,'spectral-highway');
  assert.ok(a.trackLength>4600);
  assert.equal(a.summary.cameraMode,'close-follow-damped-zoom');
  assert.equal(a.summary.edgeMode,'physical-cambered-bank-and-recoverable-ramp');
  assert.equal(a.summary.trackArchitecture,'tangent-circular-arcs-straights');
  assert.equal(a.summary.boostPads,3);
  assert.equal(a.summary.controlMode,'hold-to-drive-manual-steering');
  assert.ok(a.summary.driveSeconds>20);
  assert.equal(a.summary.lapValidation,'four-ordered-physical-gates');
  assert.equal(a.summary.waveMode,'spectral-feather-offscreen-origin');
  assert.ok(a.summary.aiAttacks>1);
  assert.equal(a.summary.lapsCompleted,3);
  assert.ok(a.events.some(e=>e.type==='checkpoint'));
  assert.ok(!JSON.stringify(a).match(/deviceId|fingerprint|rawJoystick/));
});
