/* CHROMA RUSH — Neon Circuit 2.8 Multi-Circuit Architecture & Track Diversity regression */
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
test('2.8 original world GP remains intact in the three-course architecture',()=>{
  assert.equal(C.TRACKS.length,3);
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
test('2.8 three distinctly authored world courses and configurable lap targets',()=>{
  const [gp,skyline,canyon]=C.TRACKS;
  assert.deepEqual(C.COURSE_IDS,
    ['spectral-highway','skyline-rift','pulse-canyon']);
  assert.deepEqual(C.TRACKS.map(t=>t.laps),[3,2,2]);
  assert.ok(skyline.length>7500&&skyline.length<8500);
  assert.ok(canyon.length>8000&&canyon.length<9000);
  assert.ok(skyline.length>gp.length*1.4&&canyon.length>gp.length*1.5);
  assert.ok(skyline.bounds.maxX-skyline.bounds.minX>3000);
  assert.ok(canyon.bounds.maxY-canyon.bounds.minY>1600);
  assert.deepEqual(C.TRACKS.map(t=>t.boosts.length),[3,4,4]);
  for(const t of C.TRACKS){
    assert.ok(t.worldBounds.minX<t.bounds.minX);
    assert.ok(t.worldBounds.maxY>t.bounds.maxY);
    assert.ok(t.samples.length>500);
    assert.equal(t.samples[0].x,t.samples.at(-1).x);
    assert.equal(t.samples[0].y,t.samples.at(-1).y);
    assert.ok(t.sections.filter(p=>p.kind==='straight').length>=10);
    assert.ok(t.sections.filter(p=>p.kind==='arc')
      .every(p=>p.radius>150));
  }
});
test('2.8 new circuit reserved launch areas never activate before 2.9',()=>{
  const gp=C.TRACKS[0];
  assert.equal(gp.jumpSites.length,0);
  for(const t of C.TRACKS.slice(1)){
    assert.equal(t.jumpSites.length,2);
    for(const site of t.jumpSites){
      const section=t.sections.find(p=>p.start<=site.entryS&&
        site.landingS<=p.end);
      assert.ok(section&&section.kind==='straight');
      assert.ok(site.landingS-site.entryS>65);
      assert.equal(site.active,false);
    }
    assert.ok(!t.sections.some(s=>s.kind==='jump'));
  }
});
test('2.8 world tile indices cover nearby road, rim and studs exactly',()=>{
  for(const t of C.TRACKS){
    assert.ok(t.renderTileSegments.size>16);
    assert.ok(t.renderTileRims.size>16);
    assert.ok(t.renderTileStuds.size>16);
    for(let i=1;i<t.samples.length;i+=17){
      const a=t.samples[i-1],b=t.samples[i],x=(a.x+b.x)/2,
        y=(a.y+b.y)/2;
      const key=Math.floor(x/C.RENDER_TILE)+','+
        Math.floor(y/C.RENDER_TILE);
      assert.ok(t.renderTileSegments.get(key)?.includes(i),
        'unindexed segment '+t.name+' '+i);
    }
    for(let i=0;i<t.rimSamples.length;i+=11){
      const p=t.rimSamples[i];
      const key=Math.floor(p.x/C.RENDER_TILE)+','+
        Math.floor(p.y/C.RENDER_TILE);
      assert.ok(t.renderTileRims.get(key)?.includes(i));
    }
    for(let i=0;i<t.studs.length;i+=7){
      const p=t.studs[i];
      const key=Math.floor(p.x/C.RENDER_TILE)+','+
        Math.floor(p.y/C.RENDER_TILE);
      assert.ok(t.renderTileStuds.get(key)?.includes(i));
    }
  }
});
test('2.8 longer courses have distinct banks and no crossing shortcuts',()=>{
  for(const t of C.TRACKS){
    const p=t.samples;let closest=Infinity;
    for(let i=0;i<p.length-1;i+=4)for(let j=i+4;j<p.length-1;j+=4){
      const along=Math.abs(p[i].s-p[j].s);
      if(Math.min(along,t.length-along)<220)continue;
      closest=Math.min(closest,Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y));
    }
    assert.ok(closest>2*C.TRACK_HALF+65,
      'track is self-adjacent or crosses: '+t.name+' '+closest);
    assert.ok(Math.max(...t.sections.filter(s=>s.kind==='straight')
      .map(s=>s.length))>650);
  }
});
test('2.8 two-lap world circuits finish with nine ordered physical gates',()=>{
  for(const course of ['skyline-rift','pulse-canyon']){
    for(const seed of [19,42,77]){
      const r=C.seededRace(seed,course);r.phase='running';
      for(let i=0;i<140*60&&!r.finished;i++)
        C.tick(r,guide(r),C.STEP);
      const p=r.racers[0];
      assert.equal(r.track.courseId,course);
      assert.equal(r.lapsToWin,2);
      assert.equal(p.laps,2,course+' seed '+seed+' laps '+p.laps);
      assert.equal(p.gatePasses,9,course+' gate count');
      assert.equal(p.lapTimes.length,2);
      assert.equal(r.phase,'result');
      assert.ok(r.elapsed>47&&r.elapsed<95,'bad duration '+r.elapsed);
      const audit=C.audit(r);
      assert.equal(audit.lapsTarget,2);
      assert.equal(audit.courseId,course);
      assert.equal(audit.jumpSectionsReserved,2);
      assert.equal(audit.summary.boostPads,4);
      assert.ok(audit.events.filter(e=>e.type==='checkpoint'&&
        e.player===0).length>=9);
    }
  }
});
test('2.8 menu and camera use selected track without auto-cycling',()=>{
  const js=read('src/gameplay/neon-circuit.js');
  const html=read('neon-circuit.html');
  const css=read('neon-circuit.css');
  assert.ok(js.includes('const course=selectedCourse;'));
  assert.ok(js.includes('CAMERA.create(race.track.worldBounds'));
  assert.ok(js.includes('CAMERA.create(track.worldBounds'));
  assert.ok(js.includes('const candidates=track.renderTileSegments.get(tileKey)'));
  assert.ok(js.includes('track.renderTileRims.get(tileKey)'));
  assert.ok(js.includes('track.renderTileStuds.get(tileKey)'));
  assert.ok(!js.includes('nextCourse++'));
  for(const id of [0,1,2])
    assert.ok(html.includes('data-circuit-course="'+id+'"'));
  assert.ok(html.includes('circuit-selected-description'));
  assert.ok(html.includes('id="circuit-change-course"'));
  assert.ok(html.includes('id="circuit-change-course-pause"'));
  assert.ok(js.includes('function backToCourseMenu()'));
  assert.ok(css.includes('.circuit-course-picker'));
});
test('2.7 premium presentation is graphics-only and preserves auto throttle',()=>{
  const r=C.seededRace(45);r.phase='running';
  const p=r.racers[0];
  for(const q of r.racers.slice(1))q.finished=true;
  for(let i=0;i<25;i++)C.tick(r,{},C.STEP);
  const prior=p.speed;
  p.speed=218;
  p.vx=Math.cos(p.angle)*p.speed;
  p.vy=Math.sin(p.angle)*p.speed;
  for(let i=0;i<10;i++)C.tick(r,{brake:true},C.STEP);
  assert.equal(p.braking,true,'racer publishes brake state to renderer');
  assert.ok(p.speed<218,'actual braking remains functional');
  assert.ok(prior>0,'auto throttle continues before braking');
  for(let i=0;i<10;i++)C.tick(r,{},C.STEP);
  assert.equal(p.braking,false);
  assert.equal(C.audit(r).summary.controlMode,'auto-throttle-manual-steering');
});
test('2.7 finish flare comes from physical validated finish line',()=>{
  const r=C.seededRace(12);r.phase='running';
  for(const other of r.racers.slice(1))other.finished=true;
  const p=r.racers[0];r.elapsed=74;r.zone=6;
  p.gatePasses=12;p.laps=2;p.progress=r.track.length*3-4;
  const pos=C.pointAt(p.progress,r.track);
  p.x=pos.x;p.y=pos.y;p.angle=pos.angle;p.speed=230;
  p.vx=pos.tx*230;p.vy=pos.ty*230;
  C.tick(r,{x:pos.tx,y:pos.ty},1/30);
  assert.equal(p.finished,true);
  assert.ok(r.spectacles.some(f=>f.kind==='finish'&&f.owner===0));
  for(let i=0;i<60;i++){
    // The race stops stepping after results; lifespan is a render-only value.
    for(const fx of r.spectacles)fx.life-=C.STEP;
    r.spectacles=r.spectacles.filter(fx=>fx.life>0);
  }
  assert.equal(r.spectacles.length,0,'all finish effects are time-bounded');
});
test('2.7 respawn flare is attached to recovered racer',()=>{
  const r=C.seededRace(19);r.phase='running';
  for(const other of r.racers.slice(1))other.finished=true;
  const p=r.racers[0];
  p.fallTimer=.005;p.falls=1;
  C.tick(r,{},C.STEP);
  assert.equal(p.respawns,1);
  assert.ok(r.spectacles.some(f=>f.kind==='respawn'&&
    f.owner===0&&Math.abs(f.x-p.x)<.01&&Math.abs(f.y-p.y)<.01));
});
test('2.7 premium UI is timed and reduced-motion safe',()=>{
  const js=read('src/gameplay/neon-circuit.js');
  const css=read('neon-circuit.css');
  assert.ok(js.includes('const motionStates=new WeakMap()'));
  assert.ok(js.includes('function motionPose(p,r)'));
  assert.ok(js.includes('finishPendingAt=now+(reduced()?0:760)'));
  assert.ok(js.includes('announce.dataset.moment=moment'));
  assert.ok(js.includes('premiumMotion:motionSnapshot'));
  assert.ok(css.includes('@keyframes circuit-moment-enter'));
  assert.ok(css.includes('@keyframes circuit-zone-surge'));
  assert.ok(css.includes('@keyframes circuit-result-arrive'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});
test('2.6 rivals compete without baseline speed cheating or HEX defense spam',()=>{
  const r=C.seededRace(4133670780);
  assert.deepEqual(r.racers.slice(1).map(x=>x.aiStyle),
    ['precision','aggressive','opportunist']);
  for(const p of r.racers.slice(1)){
    assert.ok(p.aiTempo>=.97&&p.aiTempo<1.06,
      'rival has an outsized hidden speed bonus: '+p.aiTempo);
  }
  assert.ok(C.AI_STYLES[2].attackCooldown<C.AI_STYLES[3].attackCooldown);
  const race=run(27,115);
  assert.ok(race.racers[0].finished);
  assert.ok(race.events.some(e=>e.type==='ai_defend'));
  assert.ok(race.events.some(e=>e.type==='ai_attack'));
  const hex=race.racers[3];
  assert.ok(hex.aiDefenses<16,'HEX is repeatedly spamming evasive defense');
});
test('2.6 real boost triggers a single bounded world light event and expires',()=>{
  const r=C.seededRace(94);r.phase='running';
  for(const racer of r.racers.slice(1))racer.finished=true;
  const p=r.racers[0],pad=r.track.boosts[0],at=C.pointAt(pad.s-55);
  p.x=at.x+at.nx*pad.lane;p.y=at.y+at.ny*pad.lane;
  p.angle=at.angle;p.speed=205;p.vx=at.tx*205;p.vy=at.ty*205;
  for(let i=0;i<25;i++)C.tick(r,{x:at.tx,y:at.ty},C.STEP);
  assert.equal(p.boosts,1);
  assert.equal(r.spectacles.length,1);
  const fx=r.spectacles[0];
  assert.equal(fx.kind,'boost');
  assert.equal(fx.owner,0);
  assert.ok(fx.life>0&&fx.life<=fx.duration);
  assert.ok(Number.isFinite(fx.x)&&Number.isFinite(fx.y));
  for(let i=0;i<70;i++)C.tick(r,{x:at.tx,y:at.ty},C.STEP);
  assert.equal(r.spectacles.length,0,'boost light should never persist');
});
test('2.6 successful player Dash registers a hit and eject light',()=>{
  const r=C.seededRace(10);r.phase='running';r.elapsed=5;
  for(const other of r.racers.slice(2))other.finished=true;
  const a=r.racers[0],b=r.racers[1],road=C.pointAt(540);
  a.x=road.x-road.nx*12;a.y=road.y-road.ny*12;
  a.angle=Math.atan2(road.ny,road.nx);a.speed=210;a.dashTime=.3;
  b.x=road.x+road.nx*9;b.y=road.y+road.ny*9;
  b.angle=road.angle;b.speed=20;
  for(let i=0;i<7;i++)C.tick(r,i<2?
    {x:road.nx,y:road.ny}:{x:road.tx,y:road.ty},C.STEP);
  assert.ok(a.dashHits>=1);
  assert.ok(r.impacts.some(e=>e.charged&&e.strength>=400));
  assert.ok(r.spectacles.some(e=>e.kind==='eject'&&e.owner===1));
  assert.ok(r.events.some(e=>e.type==='impact'&&e.dash));
  assert.equal(C.audit(r).summary.dashHits,a.dashHits);
});
test('2.5 fast opening pace, high-energy pads and lasting speed reward',()=>{
  assert.equal(C.zoneSpeed(0),191);
  assert.ok(C.zoneSpeed(6)>=275);
  for(const pad of C.TRACK.boosts){
    assert.equal(pad.factor,1.34);
    assert.ok(pad.duration>=1.2);
  }
  const r=C.seededRace(94);r.phase='running';
  r.racers.slice(1).forEach(p=>p.finished=true);
  const p=r.racers[0],pad=C.TRACK.boosts[0],at=C.pointAt(pad.s-55);
  p.x=at.x+at.nx*pad.lane;p.y=at.y+at.ny*pad.lane;
  p.angle=at.angle;p.speed=205;p.vx=at.tx*205;p.vy=at.ty*205;
  for(let i=0;i<35;i++)C.tick(r,{x:at.tx,y:at.ty},C.STEP);
  assert.equal(p.boosts,1);
  assert.equal(p.boostFactor,1.34);
  assert.ok(p.boostTime>.5);
  assert.ok(p.boostPeak>250,'boost punch should be immediately obvious');
  assert.ok(r.events.some(e=>e.type==='boost'&&e.factor===1.34));
});
test('2.5 brake improves turning authority and lateral grip',()=>{
  const simulate=brake=>{
    const r=C.seededRace(33);r.phase='running';
    for(const other of r.racers.slice(1))other.finished=true;
    const p=r.racers[0],at=C.pointAt(460);
    p.x=at.x;p.y=at.y;p.angle=at.angle;p.speed=225;
    p.vx=at.tx*225;p.vy=at.ty*225;
    for(let i=0;i<8;i++)C.tick(r,{x:0,y:1,brake},C.STEP);
    return {heading:p.angle,speed:p.speed,vx:p.vx,vy:p.vy};
  };
  const normal=simulate(false),braked=simulate(true);
  assert.ok(braked.heading>normal.heading+.10,
    'brake should turn faster');
  assert.ok(braked.speed<normal.speed,'brake should slow somewhat');
  assert.ok(braked.speed>normal.speed*.72,'brake must remain useful');
});
test('2.5 three deterministic rivals have distinct combat and defense',()=>{
  const m=C.seededRace(19);
  assert.deepEqual(m.racers.map(p=>p.aiStyle),
    ['player','precision','aggressive','opportunist']);
  assert.ok(C.AI_STYLES[2].attackCooldown<C.AI_STYLES[1].attackCooldown);
  assert.ok(C.AI_STYLES[3].attackCooldown>C.AI_STYLES[2].attackCooldown);
  const race=run(18,110);
  assert.ok(race.events.some(e=>e.type==='ai_attack'&&e.style));
  assert.ok(race.events.some(e=>e.type==='ai_defend'));
  assert.ok(race.racers.slice(1).some(p=>p.aiDefenses>0));
});
test('2.5 spatial road lookup matches brute force including off-track falls',()=>{
  const track=C.TRACK;
  assert.ok(track.spatialBuckets.size>45);
  function brute(x,y){
    let best=Infinity;
    for(let i=0;i<track.samples.length-1;i++){
      const a=track.samples[i],b=track.samples[i+1];
      const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy||1;
      const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/den));
      best=Math.min(best,(x-a.x-dx*t)**2+(y-a.y-dy*t)**2);
    }
    return Math.sqrt(best);
  }
  for(let i=0;i<120;i++){
    const at=C.pointAt(i*track.length/120);
    for(const offset of [-105,-30,0,35,125]){
      const x=at.x+at.nx*offset,y=at.y+at.ny*offset;
      assert.ok(Math.abs(C.closest(x,y).dist-brute(x,y))<.001,
        'nearest-road index error at '+i+', offset '+offset);
    }
  }
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
test('2.6.1 centered joystick accelerates automatically without steering',()=>{
  const r=C.seededRace(42);r.phase='running';
  for(const other of r.racers.slice(1))other.finished=true;
  const p=r.racers[0],at=C.pointAt(250,r.track);
  p.x=at.x;p.y=at.y;p.angle=at.angle;p.speed=0;p.vx=0;p.vy=0;
  for(let i=0;i<48;i++)C.tick(r,{},C.STEP);
  assert.ok(p.speed>100,'neutral stick must accelerate: '+p.speed);
  assert.ok(Math.hypot(p.x-at.x,p.y-at.y)>40,'auto drive must move cube');
  assert.equal(p.angle,at.angle,'no hidden line-following autopilot');
  assert.ok(p.driveSeconds>.7);
  assert.ok(p.neutralSteerSeconds>.7);
  assert.equal(C.audit(r).summary.controlMode,'auto-throttle-manual-steering');
});
test('2.6.1 release preserves last heading and Brake works without steering',()=>{
  const setup=()=>{
    const r=C.seededRace(54);r.phase='running';
    for(const other of r.racers.slice(1))other.finished=true;
    const p=r.racers[0],at=C.pointAt(250,r.track);
    p.x=at.x;p.y=at.y;p.angle=at.angle;p.speed=165;
    p.vx=at.tx*165;p.vy=at.ty*165;
    return {r,p};
  };
  const first=setup();
  for(let i=0;i<7;i++)C.tick(first.r,{x:0,y:1},C.STEP);
  assert.ok(first.p.angle>.25,'joystick must change heading');
  const angle=first.p.angle;
  for(let i=0;i<7;i++)C.tick(first.r,{},C.STEP);
  assert.equal(first.p.angle,angle,'releasing stick must keep last heading');
  assert.ok(first.p.speed>130,'releasing stick should not stop throttle');
  const normal=setup(),braked=setup();
  for(let i=0;i<7;i++){
    C.tick(normal.r,{},C.STEP);
    C.tick(braked.r,{brake:true},C.STEP);
  }
  assert.ok(braked.p.speed<normal.p.speed,'brake should slow auto throttle');
  assert.ok(braked.p.brakeSeconds>.10,'brake works with neutral joystick');
});
test('2.6.1 Dash works hands-free after accelerating, not from rest',()=>{
  const r=C.seededRace(54);r.phase='running';
  for(const other of r.racers.slice(1))other.finished=true;
  const p=r.racers[0],at=C.pointAt(250);
  p.x=at.x;p.y=at.y;p.angle=at.angle;p.speed=0;
  C.tick(r,{dash:true},C.STEP);
  assert.equal(p.dashes,0,'cannot dash when virtually stationary');
  for(let i=0;i<28;i++)C.tick(r,{},C.STEP);
  assert.ok(p.speed>65);
  C.tick(r,{dash:true},C.STEP);
  assert.equal(p.dashes,1,'Dash button should work without touching joystick');
});
test('2.6.1 GO enables automatic acceleration, countdown remains still',()=>{
  const r=C.seededRace(91);
  const p=r.racers[0],x=p.x,y=p.y;
  for(let i=0;i<100;i++)C.tick(r,{},C.STEP);
  assert.equal(p.speed,0);
  assert.equal(p.x,x);assert.equal(p.y,y);
  for(let i=0;i<50;i++)C.tick(r,{},C.STEP);
  assert.equal(r.phase,'running');
  for(let i=0;i<25;i++)C.tick(r,{},C.STEP);
  assert.ok(p.speed>30,'auto throttle should engage after GO');
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
  assert.ok(me.speed>45,'auto throttle must resume after respawn');
  assert.ok(me.neutralSteerSeconds>0);
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
  for(let i=0;i<20;i++)C.tick(t,{},C.STEP);
  C.tick(t,{x:1,y:0,dash:true,brake:true},C.STEP);
  assert.equal(t.racers[0].dashes,1);
  assert.ok(t.racers[0].dashCooldown>0);
  assert.ok(t.racers[0].brakeSeconds>0);
});
test('Track Tide still changes zones each ten seconds and follows the road',()=>{
  const r=C.seededRace(817);r.phase='running';r.elapsed=9.995;
  C.tick(r,{},C.STEP);
  assert.equal(r.zone,1);
  assert.equal(C.zoneSpeed(0),191);
  assert.equal(C.zoneSpeed(1),206.5);
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
  assert.ok(cam.zoom<z*.91,'camera should zoom out gently: '+cam.zoom+'/'+z);
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
  assert.ok(js.includes('function arenaLighting'));
  assert.ok(js.includes('function drawWorldSpectacles'));
  assert.ok(js.includes('function drawWaveWorldHalo'));
  assert.ok(js.includes('function drawCombatOpportunity'));
  assert.ok(js.includes('function luminousPool'));
  assert.ok(js.includes("g.translate(0,15)"));
  assert.ok(js.includes('drawWorldBackdrop(ctx,camera,m)'));
  assert.ok(js.includes('drawVelocityRails(m,view)'));
  assert.ok(js.includes("m.spectacles||[]"));
  assert.ok(js.includes('ctx.scale(camera.zoom,camera.zoom)'));
  assert.ok(js.includes('CAMERA.viewBounds(camera'));
  assert.ok(js.includes('clipWaveRepaint(ctx,track,wave)'));
  assert.ok(js.includes('drawWaveFront(ctx,track,wave'));
  assert.ok(js.includes('function waveRibbon'));
  assert.ok(js.includes('function drawBankedEdges'));
  assert.ok(js.includes('function strip(run,side,inner,outer,color)'));
  assert.ok(js.includes('function motionPose(p,r)'));
  assert.ok(js.includes('ctx.drawImage(sprite(p.color),-45,-45)'));
  assert.ok(js.includes('p.boostTime>0&&!reduced()'));
  assert.ok(js.includes('function drawImpacts(r)'));
  assert.ok(js.includes('fx.kind===\'respawn\''));
  assert.ok(js.includes('fx.kind===\'lap\'||fx.kind===\'finish\''));
  assert.ok(js.includes('[[ -17')===false);
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
  assert.ok(html.includes('neon-circuit-camera.js?v=neon-circuit-2.8'));
  assert.ok(html.includes('AUTO THROTTLE'));
  assert.ok(html.includes('ACCELERATION IS AUTOMATIC'));
  assert.ok(js.includes('dash.disabled=me.dashCooldown>.08||me.speed<45;'));
  assert.ok(js.includes("requestFullscreen"));
  assert.ok(js.includes('JSON.stringify(CORE.audit(race)'));
  assert.ok(js.includes('getInput()'));
});
test('Run audit 2.3 includes falls, AI aggression and the spectral wave without private input history',()=>{
  const r=run(77);
  const a=C.audit(r);
  assert.equal(a.schema,'neon-circuit-run-audit/2.8');
  assert.equal(a.build,'neon-circuit-2.8');
  assert.equal(a.courseId,'spectral-highway');
  assert.ok(a.trackLength>4600);
  assert.equal(a.summary.cameraMode,'close-follow-damped-zoom');
  assert.equal(a.summary.edgeMode,'physical-cambered-bank-and-recoverable-ramp');
  assert.equal(a.summary.trackArchitecture,'multi-circuit-tangent-arcs-v2.8');
  assert.equal(a.summary.renderIndex,'precomputed-course-tile-buckets');
  assert.equal(a.summary.boostPads,3);
  assert.deepEqual(a.summary.rivalStyles,['precision','aggressive','opportunist']);
  assert.equal(a.summary.spectacleMode,'premium-motion-impact-lap-2.7');
  assert.ok(a.summary.boostPeak>=0);
  assert.equal(a.summary.controlMode,'auto-throttle-manual-steering');
  assert.ok(a.summary.neutralSteerSeconds>=0);
  assert.ok(a.summary.driveSeconds>20);
  assert.equal(a.summary.lapValidation,'four-ordered-physical-gates');
  assert.equal(a.summary.waveMode,'spectral-feather-offscreen-origin');
  assert.ok(a.summary.aiAttacks>1);
  assert.equal(a.summary.lapsCompleted,3);
  assert.ok(a.events.some(e=>e.type==='checkpoint'));
  assert.ok(!JSON.stringify(a).match(/deviceId|fingerprint|rawJoystick/));
});
