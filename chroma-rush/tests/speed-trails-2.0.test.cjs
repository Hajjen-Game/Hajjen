const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {SpeedTrails,MAX_ECHOES,MAX_FRAGMENTS,BASE_SPEED,trailReach,speedCharge}=
  require('../src/render/speed-trails.js');
const {FlowSystem}=require('../src/gameplay/flow.js');

function paint(){
  const calls={strokes:0,rects:0,lines:[],ghosts:[],passes:0};
  const context={
    save(){calls.passes++},restore(){},beginPath(){},closePath(){},
    moveTo(x,y){this._start=[x,y]},
    lineTo(x,y){calls.lines.push([this._start,[x,y]])},
    stroke(){calls.strokes++},
    fillRect(x,y,w,h){calls.rects++;calls.ghosts.push([x,y,w,h])},
    strokeRect(x,y,w,h){calls.strokes++;calls.ghosts.push([x,y,w,h])},
    arc(){throw Error('Speed Trails must not create circular rings')},
    ellipse(){throw Error('Speed Trails must not create elliptical halos')},
    createRadialGradient(){throw Error('Speed Trails must not use radial masks')}
  };
  return {ctx:context,calls};
}
const HIGH={name:'high',density:1,glow:1};
const BALANCED={name:'balanced',density:.65,glow:.64};
const LOW={name:'performance',density:.36,glow:.24};
function runFor(seconds,{speed=800,flow=55,chromaActive=false,quality=HIGH,
  duck=false,jump=false,reducedMotion=false}={}){
  const trails=new SpeedTrails(),dt=1/60,x=260;
  let distance=0;
  for(let i=0;i<Math.round(seconds/dt);i++){
    distance+=speed*dt;
    const progress=i/Math.max(1,Math.round(seconds/dt)-1);
    const feet=jump?515-155*Math.sin(progress*Math.PI*.84):515;
    trails.tick(dt,{playerX:x,feet,width:duck?66:44,height:duck?23:44,
      distance,speed,flow,chromaActive,primary:'#3feeff',
      secondary:'#9e7bff',quality,reducedMotion});
  }
  return trails;
}
test('base speed starts with restrained trails; faster speed increases reach',()=>{
  assert.equal(BASE_SPEED,370);
  assert.equal(speedCharge(370),0);
  assert.ok(speedCharge(1700)>.9);
  assert.ok(trailReach(370)<trailReach(900));
  assert.ok(trailReach(900)<trailReach(1900));
  assert.ok(trailReach(20000)<=410);
});
test('afterimages sample previous poses at fixed intervals and move left with distance',()=>{
  const trails=new SpeedTrails();
  for(let i=1;i<=18;i++){
    const feet=515-i*5;
    trails.tick(1/60,{playerX:260,feet,width:44,height:44,
      distance:i*19,speed:1140,quality:HIGH});
  }
  assert.ok(trails.samples.length>=5);
  assert.ok(trails.samples.some(s=>s.feet!==trails.current.feet),
    'afterimages must retain old jump heights');
  const samples=trails.samples;
  assert.ok(samples.every((s,i)=>i===0||s.at>=samples[i-1].at));
  const last=trails.current;
  const oldest=samples[0];
  assert.ok(oldest.distance<last.distance);
  const renderedX=oldest.x-(last.distance-oldest.distance);
  assert.ok(renderedX<last.playerX);
});
test('extra fast runs still have strictly bounded sample and particle pools',()=>{
  const trails=runFor(18,{speed:3400,flow:100,chromaActive:true});
  assert.ok(trails.samples.length>0&&trails.samples.length<=MAX_ECHOES);
  assert.ok(trails.fragments.length>0&&trails.fragments.length<=MAX_FRAGMENTS);
  assert.ok(trails.fragments.every(p=>p.vx<0&&p.life>0));
  assert.ok(trails.diagnostics.reach<=410);
});
test('quality profiles visibly scale echo density, fragment count and glow costs',()=>{
  const a=runFor(.32,{speed:1300}),b=runFor(.32,{speed:1300});
  const high=paint(),balanced=paint(),low=paint();
  a.draw(high.ctx,{quality:HIGH});
  a.draw(balanced.ctx,{quality:BALANCED});
  b.draw(low.ctx,{quality:LOW});
  assert.ok(high.calls.strokes>balanced.calls.strokes);
  assert.ok(balanced.calls.strokes>low.calls.strokes);
  assert.ok(low.calls.strokes>=2,'performance retains visible speed rails');
  assert.ok(high.calls.rects>=low.calls.rects);
});
test('Chroma State augments the same speed trails without inventing a second trail system',()=>{
  const normal=runFor(.27,{speed:1300,flow:70});
  const chroma=runFor(.27,{speed:1300,flow:95,chromaActive:true});
  const n=paint(),c=paint();
  normal.draw(n.ctx,{quality:HIGH});
  chroma.draw(c.ctx,{quality:HIGH});
  assert.ok(c.calls.strokes>=n.calls.strokes);
  assert.ok(chroma.current.chromaActive);
  assert.ok(chroma.fragments.length>=normal.fragments.length);
  assert.ok(chroma.samples.every(s=>s.x===chroma.current.playerX));
});
test('trail geometry only extends backward and cannot mask incoming hazards',()=>{
  const trails=runFor(.35,{speed:920,flow:75});
  const {ctx,calls}=paint();
  trails.draw(ctx,{quality:HIGH});
  assert.ok(calls.lines.length>0);
  for(const [a,b] of calls.lines){
    assert.ok(b[0]<=a[0]+1e-9,'directional light strokes must not lead the player');
    assert.ok(a[0]<trails.current.playerX,'speed rails must stay behind the runner');
  }
  for(const [x,y,w,h] of calls.ghosts){
    assert.ok(x+w<trails.current.playerX+20);
    assert.ok(w>0&&h>0);
  }
});
test('damage breaks visual streak but cannot change actual Flow or health',()=>{
  const flow=new FlowSystem();
  for(let i=0;i<15;i++)flow.registerClear();
  const old=flow.value;
  const trails=runFor(.28,{speed:900});
  assert.ok(trails.samples.length>0&&trails.fragments.length>0);
  trails.disrupt();
  assert.equal(trails.samples.length,0);assert.equal(trails.fragments.length,0);
  assert.equal(flow.value,old);
  trails.tick(1/60,{playerX:260,feet:515,distance:400,speed:900,quality:HIGH});
  assert.equal(trails.samples.length,0);
});
test('reduced motion disables all sampled echoes and animated fragments',()=>{
  const trails=runFor(.45,{speed:1500,quality:HIGH,reducedMotion:true});
  assert.equal(trails.samples.length,0);
  assert.equal(trails.fragments.length,0);
  const {ctx,calls}=paint();
  trails.draw(ctx,{quality:HIGH,reducedMotion:true});
  assert.equal(calls.strokes,0);
  assert.equal(calls.rects,0);
});
test('reset between runs/rotations clears history without changing speed tier',()=>{
  const t=runFor(.26,{speed:1400});
  assert.ok(t.samples.length);
  t.reset();
  assert.equal(t.current,null);
  assert.equal(t.diagnostics.samples,0);
  assert.equal(t.diagnostics.fragments,0);
  const {ctx,calls}=paint();t.draw(ctx,{quality:HIGH});
  assert.equal(calls.strokes,0);
});
test('no randomness in the visual module; deterministic positions at same fixed-step time',()=>{
  const a=runFor(.31,{speed:1100}),b=runFor(.31,{speed:1100});
  assert.deepEqual(a.samples,b.samples);
  assert.deepEqual(a.fragments,b.fragments);
  const code=fs.readFileSync(path.join(__dirname,'../src/render/speed-trails.js'),'utf8');
  assert.doesNotMatch(code,/Math\.random\(/);
});
test('HTML loads speed trails before game, with isolated cache versions',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/<meta name="chroma-build" content="original-background-restored-1\.0-chroma-pulse-1\.0-gravity-1\.0-ceiling-sync-1\.0-movement-1\.0-duck-gate-1\.0-echo-spire-1\.0-aware-1\.0-fairness-1\.0-jump-visual-1\.0-combo-1\.0-speed-curve-3\.2-echo-polish-1\.1-echo-zone2-1\.2-no-scout-1\.1-tide-2\.0-spectacle-1\.0-dash-2\.5-shield-core-1\.0-dash-hazards-1\.0-dash-pacing-1\.1-spectrum-2\.0-dash-reliability-1\.2-ui-calm-1\.0-dash-polish-2\.0-director-flow-2\.0-performance-stability-2\.0-chroma-identity-visual-polish-1\.0-player-identity-2\.0-chroma-tide-energy-3\.0-premium-arcade-ui-4\.0-dash-hazard-zigzag-geometry-2\.1-adaptive-camera-horizon-1\.1-advanced-spacing-2\.2-echo-rail-1\.0-twin-vault-2\.3-energy-veil-1\.1-raised-jump-1\.2-gate-unification-1\.3-obstacle-director-balance-3\.0-endurance-mastery-4\.0(?:-arcade-simplification-1\.0)?(?:-core-gameplay-excellence-1\.0)?(?:-core-pace-gravity-1\.1)?(?:-phase-2-chroma-surge-1\.0)?(?:-action-density-2\.0)?(?:-rush-chains-3\.0)?(?:-endless-escalation-4\.0)?(?:-visual-signature-2\.0)?(?:-ambient-lighting-2\.1)?(?:-premium-world-lighting-3\.0)?(?:-[a-z0-9.]+)*"/);
  const trail=html.indexOf('src/render/speed-trails.js?v=speed-trails-2.5-dash-echoes');
  const game=html.indexOf('src/gameplay/game.js?v=arcade-animation-2.0');
  assert.ok(trail>0&&game>trail);
  assert.match(html,/LATEST UPDATE · (?:PREMIUM ARCADE UI 4\.0|ARCADE SIMPLIFICATION 1\.0|CORE PACE 1\.1|CHROMA SURGE 1\.0|ACTION DENSITY 2\.0|RUSH CHAINS 3\.0|ENDLESS ESCALATION 4\.0|VISUAL SIGNATURE 2\.0|AMBIENT LIGHTING 2\.1|PREMIUM WORLD LIGHTING 3\.0)/);
  const source=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(source,/speedTrails\.tick\(dt,/);
  assert.match(source,/speedTrails\.draw\(ctx,/);
  assert.match(source,/speedTrails\.disrupt\(\)/);
  const actors=source.indexOf('for(const o of hurdles)drawObstacle(o)');
  const trails=source.indexOf('speedTrails.draw(ctx,');
  assert.ok(actors>trails&&trails>0,'draw new speed trails under obstacles');
});
