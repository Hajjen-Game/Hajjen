const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME,ECHO_SPIRE}=require('../src/core/config.js');
const GEO=require('../src/core/geometry.js');
const {PATTERNS,candidates}=require('../src/director/patterns.js');
const {AdaptiveRushDirector,minimumGap}=require('../src/director/adaptive-director.js');

const player=(feet,landed=false)=>GEO.playerBox({x:300,feet,landed,duck:false});
const spire=(height=194,ground=515,width=49)=>GEO.obstacleBox({
  type:'echo',x:300,width,height},ground);

// Deterministic real physics, swept-world x and the exact collision geometry.
// The obstacle arrives ~.7 seconds after takeoff; this gives time to press
// Jump, Echo Jump, and sail past its width at increasingly high speeds.
function flight({speed=900,height=210,echoAt=null,lead=.7,width=54,ground=515}={}){
  let feet=ground,vy=GAME.jumpVelocity,echoed=false;
  let contacts=0,collisions=0,clearFrames=0,minimum=feet;
  const dt=1/240;
  for(let i=0;i<330;i++){
    const t=i*dt;
    if(echoAt!==null&&!echoed&&t>=echoAt){
      vy=Math.max(GAME.jumpVelocity,Math.min(GAME.echoJumpVelocity,
        vy-GAME.echoUpwardBoost));
      echoed=true;
    }
    vy+=GAME.gravity*dt;feet+=vy*dt;minimum=Math.min(minimum,feet);
    const o={type:'echo',x:300+speed*(lead-t),width,height};
    const p=player(feet);
    if(GEO.sweptXOverlap(p,o.x,o)){
      contacts++;
      if(GEO.verticalOverlap(p,GEO.obstacleBox(o,ground)))collisions++;
      else clearFrames++;
    }
  }
  return {contacts,collisions,clearFrames,minimum};
}

test('Echo Spire must exceed single-jump apex, but stay well below Echo apex',()=>{
  const singleRise=GAME.jumpVelocity**2/(2*GAME.gravity);
  const echo=flight({echoAt:.34});
  assert.ok(ECHO_SPIRE.minHeight>singleRise+12);
  assert.ok(ECHO_SPIRE.maxHeight<515-echo.minimum-50);
  assert.ok(ECHO_SPIRE.minWidth>=45&&ECHO_SPIRE.maxWidth<=52);
  assert.equal(ECHO_SPIRE.firstZone,5);
  assert.ok(ECHO_SPIRE.introMaxHeight<ECHO_SPIRE.maxHeight);
  assert.ok(ECHO_SPIRE.introMaxWidth<ECHO_SPIRE.maxWidth);
});

test('ordinary jump always hits; one timed Echo Jump clears all pillar heights',()=>{
  for(const speed of [550,650,780,1050,1700]){
    for(const height of [ECHO_SPIRE.minHeight,ECHO_SPIRE.maxHeight]){
      const ordinary=flight({speed,height});
      const echo=flight({speed,height,echoAt:.34});
      assert.ok(ordinary.contacts>0&&ordinary.collisions>0,
        'single jump must hit at speed '+speed);
      assert.ok(echo.contacts>0&&echo.clearFrames===echo.contacts,
        'Echo Jump must safely clear at speed '+speed+', height '+height);
      assert.equal(echo.collisions,0,'no invisible mid-flight collision');
    }
  }
});

test('duck cannot pass beneath the spire; the original ground and duck rules remain',()=>{
  const b=spire();
  const duck=GEO.playerBox({x:300,feet:515,duck:true,landed:true});
  assert.equal(GEO.verticalOverlap(duck,b),true);
  assert.equal(b.y,321);assert.equal(b.y+b.h,515);
  const low=GEO.obstacleBox({type:'jump',x:300,height:60,width:54},515);
  assert.equal(low.y,455);assert.equal(low.y+low.h,515);
  const overhead=GEO.obstacleBox({type:'duck',x:300,height:145,width:54},515);
  assert.equal(overhead.y+overhead.h,487);
  assert.equal(GEO.verticalOverlap(duck,overhead),false);
});

test('ceilings mirror the whole collision box; the same double-jump trajectory works',()=>{
  const H=720,b=spire(),mirror=a=>({...a,y:H-a.y-a.h});
  const floor=flight({echoAt:.34});
  assert.equal(floor.collisions,0);
  for(const feet of [515,340,250]){
    const p=player(feet);
    assert.equal(GEO.verticalOverlap(mirror(p),mirror(b)),GEO.verticalOverlap(p,b));
  }
  assert.equal(mirror(b).y,H-515);
  assert.equal(mirror(b).y+mirror(b).h,H-b.y);
});

test('Director introduces a solo Echo Spire in a safe PEAK, not during damage recovery',()=>{
  assert.ok(PATTERNS.some(p=>p.id==='single-echo'));
  assert.ok(candidates('PEAK',4,3).every(p=>!p.steps.includes('echo')));
  assert.ok(candidates('PEAK',8,3,{allowEcho:false}).every(p=>!p.steps.includes('echo')));
  const d=new AdaptiveRushDirector(()=>.5);
  d.phase='PEAK';d.phaseElapsed=0;d.phaseDuration=6;d.spawnCountdown=0;
  d.confidence=.8;
  const inputs={zone:5,hp:100,speed:820,surface:'floor'};
  const preview=d.selectPattern(inputs);
  assert.equal(preview.id,'single-echo');
  assert.equal(d.echoIntroduced,false,'not counted as introduced until actual spawn');
  let type;
  d.tick(1/60,inputs,step=>{type=step.type;return true});
  assert.equal(type,'echo');
  assert.equal(d.echoIntroduced,true);
  d.reset();d.confidence=.8;d.phase='PEAK';
  const noHealth=d.selectPattern({...inputs,hp:25});
  assert.ok(noHealth.steps.every(s=>s!=='echo'));
  d.stress=.65;
  assert.ok(d.selectPattern(inputs).steps.every(s=>s!=='echo'));
  assert.equal(minimumGap('echo','jump',820)>1.5,true);
  assert.equal(minimumGap('duck','echo',820)>1.1,true);
});

test('echo intro is deferred rather than fabricated if terrain vetoes the spawn',()=>{
  const d=new AdaptiveRushDirector(()=>.5);d.confidence=.8;
  d.phase='PEAK';d.phaseDuration=6;d.spawnCountdown=0;
  d.tick(1/60,{zone:5,hp:100,speed:900,surface:'floor'},()=>false);
  assert.equal(d.totalSpawned,0);assert.equal(d.echoIntroduced,false);
  assert.equal(d.pending[0]?.type,'echo');
  d.spawnCountdown=0;
  d.tick(1/60,{zone:5,hp:100,speed:900,surface:'floor'},()=>true);
  assert.equal(d.echoIntroduced,true);
});

test('Echo has twin chambers inside the shared Low Neon Barrier visual shell',()=>{
  const s=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(s,/data\.type==='echo'\?/);
  assert.match(s,/firstEcho\?spire\.introMinHeight:spire\.minHeight/);
  assert.match(s,/const b=GEO\.obstacleBox\(o,o\.groundY\)/);
  assert.match(s,/if\(isEcho\)/);
  assert.doesNotMatch(s,/ctx\.fillText\('2× JUMP',cx,b\.y-20\)/);
  assert.match(s,/for\(let k=0;k<2;k\+\+\)/);
  assert.match(s,/ctx\.fillRect\(x\+8,yy-2,w-16,18\)/);
  assert.match(s,/if\(isEcho\|\|isLow\)/);
  assert.match(s,/o\.type==='echo'/);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/id="jump-btn"/);assert.match(html,/id="duck-btn"/);
  assert.doesNotMatch(html,/id="dash-btn"/);
});

test('slower Speed Curve 2.0 still gives a broad Echo timing window on the floor',()=>{
  for(const speed of [550,650,800]){
    for(const lead of [.57,.61,.65,.69]){
      const ordinary=flight({speed,height:ECHO_SPIRE.introMinHeight,
        width:ECHO_SPIRE.introMaxWidth,lead});
      const double=flight({speed,height:ECHO_SPIRE.introMaxHeight,
        width:ECHO_SPIRE.introMaxWidth,lead,echoAt:.34});
      assert.ok(ordinary.collisions>0,
        'ordinary jump cannot pass intro Spire even at ' + speed);
      assert.equal(double.collisions,0,
        'Echo must clear at speed '+speed+' and lead '+lead);
      assert.ok(double.contacts>0);
    }
  }
});

test('floor-only introductory Echo is deferred without allowing a ceiling shortcut',()=>{
  const d=new AdaptiveRushDirector(()=>.5);
  d.phase='PEAK';d.phaseElapsed=0;d.phaseDuration=7;
  d.confidence=.9;d.spawnCountdown=0;
  const ceiling={zone:5,hp:100,speed:690,surface:'ceiling'};
  const floor={...ceiling,surface:'floor'};
  assert.ok(d.selectPattern(ceiling).steps.every(s=>s!=='echo'));
  assert.equal(d.selectPattern(floor).id,'single-echo');
  d.pending=[{type:'echo',pattern:'single-echo',step:1}];
  let calls=0;
  d.tick(1/60,ceiling,()=>{calls++;return true});
  assert.equal(calls,0);
  assert.equal(d.echoIntroduced,false);
  assert.equal(d.pending.length,0,'ceiling veto should not deadlock ordinary motifs');
  d.pending=[{type:'echo',pattern:'single-echo',step:1}];
  d.spawnCountdown=0;
  d.tick(1/60,{...floor,gravityPending:true},()=>{calls++;return true});
  assert.equal(calls,0);
  d.pending=[{type:'echo',pattern:'single-echo',step:1}];
  d.spawnCountdown=0;
  d.tick(1/60,floor,()=>{calls++;return true});
  assert.equal(calls,1);
  assert.equal(d.echoIntroduced,true);
  // Once taught on the ground, later ceiling Spires are still allowed.
  assert.equal(d.movement.echoReady({...ceiling,phase:'PEAK',stress:0,
    confidence:.9},d.time+10,false),true);
});
