const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME}=require('../src/core/config.js');
const {AdaptiveCamera,MIN_ZOOM,START_SPEED,FULL_ZOOM_SPEED}=
  require('../src/camera/adaptive-camera.js');
const FAIR=require('../src/director/high-speed-fairness.js');
const {SpectralWave}=require('../src/render/spectral-wave.js');
const {drawTerrain}=require('../src/render/terrain-renderer.js');
const {GravityShift}=require('../src/gameplay/gravity-shift.js');

const approx=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<=epsilon,
  'expected '+a+' ~= '+b);

test('camera is neutral until meaningful speed and eases to 80% without ever zooming in',()=>{
  const c=new AdaptiveCamera();
  assert.equal(c.zoom,1);
  assert.equal(c.targetForSpeed(GAME.baseSpeed),1);
  assert.equal(c.targetForSpeed(START_SPEED),1);
  assert.equal(c.targetForSpeed(FULL_ZOOM_SPEED),.8);
  assert.equal(c.targetForSpeed(50000),MIN_ZOOM);
  for(const t of [0,60,120,180,300,420,600]){
    const v=GAME.speedAt(t,1+Math.floor(t/12));
    assert.ok(c.targetForSpeed(v)<=1&&c.targetForSpeed(v)>=.8);
  }
  assert.ok(c.targetForSpeed(GAME.speedAt(180,16))<.90,
    'zoom must improve visibility when the user reports difficulty in zone 15');
  assert.equal(c.targetForSpeed(GAME.speedAt(0,1)),1);
});

test('smoothing is monotone, frame-rate independent and has no hard-camera snap',()=>{
  const a=new AdaptiveCamera(),b=new AdaptiveCamera();
  let last=1;
  for(let i=0;i<60;i++){
    const z=a.tick(1/60,1900);
    assert.ok(z<=last&&z>=MIN_ZOOM);
    last=z;
  }
  b.tick(1,1900);
  approx(a.zoom,b.zoom,1e-6);
  assert.ok(a.zoom>.8,'a single second should not teleport to full zoom');
  for(let i=0;i<200;i++)a.tick(1/60,1900);
  assert.ok(a.zoom<.81);
  assert.ok(a.lowestZoom<=a.zoom);
  a.tick(.5,1000);
  assert.ok(a.zoom<1&&a.zoom>.8);
  a.tick(1,1900,{reducedMotion:true});
  assert.equal(a.zoom,.8,'reduced-motion setting disables animated zoom smoothing');
  a.reset(370);
  assert.equal(a.zoom,1);
  assert.equal(a.lowestZoom,1);
});

test('zoom is player anchored and exposes real world units on all view sizes',()=>{
  const c=new AdaptiveCamera();c.reset(2000);
  for(const [w,px] of [[900,238.5],[1280,339.2],[1600,424]]){
    const b=c.view(w,720,px,515);
    const expectedLeft=px-px/.8;
    const expectedRight=px+(w-px)/.8;
    approx(b.left,expectedLeft);
    approx(b.right,expectedRight);
    approx(b.bottom,515+(720-515)/.8);
    approx(c.screenX(px,px),px);
    approx(c.screenY(515,515),515);
    approx(c.screenX(b.right,px),w);
    approx(c.screenX(b.left,px),0);
    approx(c.screenY(b.bottom,515),720);
    for(const x of [-50,0,px,900,2000])approx(c.worldX(c.screenX(x,px),px),x);
    for(const y of [-160,0,200,515,700])approx(c.worldY(c.screenY(y,515),515),y);
  }
  assert.ok(c.extraVisibleFraction>.249&&c.extraVisibleFraction<.251);
});

test('normal and inverted course produce correct mirror without moving the HUD anchor',()=>{
  const camera=new AdaptiveCamera();camera.reset(2000);
  const floor=new GravityShift(),ceiling=new GravityShift();
  ceiling.ceiling=true;
  const w=1280,px=339,ground=515,H=720;
  const x=1000,y=475;
  const sx=camera.screenX(x,px),sy=camera.screenY(y,ground);
  approx(sx,px+(x-px)*.8);
  approx(floor.screenY(sy,H),sy);
  approx(ceiling.screenY(sy,H),H-sy);
  approx(floor.screenY(camera.screenY(ground,ground),H),ground);
  approx(ceiling.screenY(camera.screenY(ground,ground),H),H-ground);
  const operations=[];
  camera.apply({translate:(...args)=>operations.push(['translate',...args]),
    scale:(...args)=>operations.push(['scale',...args])},px,ground);
  assert.deepEqual(operations.map(op=>op[0]),['translate','scale']);
  approx(operations[0][1],px*.2);
  approx(operations[0][2],ground*.2);
  approx(operations[1][1],.8);
  approx(operations[1][2],.8);
});

test('obstacle, Echo, Dash and gap fairness budgets use the real expanded horizon',()=>{
  const camera=new AdaptiveCamera();camera.reset(2000);
  const px=339,width=1280,speed=2000;
  const right=camera.visibleRight(width,px);
  assert.ok(right>width+200);
  for(const type of ['jump','duck','echo','gap','echo-gap','dash-jump','dash-duck']){
    const x=FAIR.horizonFor(type,{speed,playerX:px,viewportWidth:right});
    const m=FAIR.metrics(type,{x,playerX:px,viewportWidth:right,speed});
    assert.ok(m.fair,'reaction budget failed '+type);
    assert.ok(m.leadSeconds>=FAIR.rule(type).lead);
    assert.ok(x>=right+FAIR.STANDARD_PAD,'spawn inside viewport '+type);
  }
  const jumpX=FAIR.horizonFor('jump',{speed,playerX:px,viewportWidth:right});
  const jump=FAIR.metrics('jump',{x:jumpX,playerX:px,viewportWidth:right,speed});
  assert.equal(jump.needsCue,false,'new visible runway should remove redundant jump warning');
  const echoX=FAIR.horizonFor('echo',{speed,playerX:px,viewportWidth:right});
  assert.ok(FAIR.metrics('echo',{x:echoX,playerX:px,viewportWidth:right,speed}).needsCue,
    'advanced Echo needs a true early warning at high speed');
  const cue=FAIR.warning({hurdles:[{x:echoX,worldX:85000,type:'echo'}],
    playerX:px,viewportWidth:right,speed});
  assert.equal(cue.type,'echo');
  const screenVisibleX=camera.screenX(right,px);
  approx(screenVisibleX,width);
});

test('Chroma Tide projected onto zoomed terrain stays aligned to the screen front',()=>{
  const camera=new AdaptiveCamera();camera.reset(2100);
  const tide=new SpectralWave();
  const from={primary:'#18cfff',secondary:'#52deff',shadow:'#050b24'};
  const to={primary:'#f65ad9',secondary:'#ff93ff',shadow:'#150725'};
  tide.start({from,to,width:1280,duration:1,reducedMotion:false});
  tide.tick(.36,{playerX:339,playerY:515,height:720});
  const projected=camera.setTide(tide,{width:1280,anchorX:339,anchorY:515});
  assert.equal(projected.active,true);
  for(const [x,y] of [[400,300],[600,515],[1100,460]]){
    assert.equal(projected.colorAt(x,'primary',y,720),
      tide.colorAt(camera.screenX(x,339),'primary',camera.screenY(y,515),720));
  }
  const front=projected.frontAt(450,720);
  approx(camera.screenX(front,339),tide.frontAt(camera.screenY(450,515),720));
  const stops=[];
  const g=projected.gradient({createLinearGradient:(...coords)=>{
    const result={coords,addColorStop:(at,color)=>stops.push({at,color})};
    return result;
  }},1280,'primary',450,720);
  assert.equal(g.coords[0],camera.visibleLeft(1280,339));
  assert.equal(g.coords[2],camera.visibleRight(1280,339));
  assert.equal(stops[0].color,from.primary);
  assert.equal(stops.at(-1).color,to.primary);
  assert.ok(stops.every(s=>s.at>=0&&s.at<=1));
});

test('zoomed terrain is filled beyond bottom and left screen edges without fake gap geometry',()=>{
  const camera=new AdaptiveCamera();camera.reset(2000);
  const view=camera.view(1280,720,339,515);
  const terrain={baseY:515,segments:[{type:'flat',start:0,end:1900,
    y0:515,y1:515}]};
  const calls={moves:[],lines:[],fills:[],clips:0};
  const ctx={
    save(){},restore(){},beginPath(){},closePath(){},stroke(){},fillText(){},
    moveTo(x,y){calls.moves.push([x,y])},
    lineTo(x,y){calls.lines.push([x,y])},
    clip(){calls.clips++},
    fillRect(...args){calls.fills.push(args)},
    createLinearGradient(){return {addColorStop(){}}}
  };
  drawTerrain({ctx,terrain,distance:0,width:1280,height:720,
    baseY:515,primary:'#00ffff',secondary:'#ffffff',
    flow:0,glowLine(){},
    quality:{glow:1,density:.35,terrainStep:16,gridStep:105},
    cameraView:view});
  assert.ok(calls.clips>0);
  assert.ok(calls.moves.some(([x])=>x<-80),
    'late-zone practice must not expose a vertical terrain seam at world zero');
  assert.ok(calls.lines.some(([,y])=>y>=view.bottom),
    'floor must extend below the display; inverted ceiling uses the same geometry');
  assert.ok(calls.fills.some(([x,,width])=>x<view.left&&width>1280));
});

test('HTML order and gameplay integration keep only the course transformed',()=>{
  const root=path.join(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const idx=prefix=>scripts.findIndex(s=>s.startsWith(prefix));
  assert.ok(idx('src/camera/adaptive-camera.js?v=adaptive-camera-horizon-1.0')>0);
  assert.ok(idx('src/camera/adaptive-camera.js?v=')<idx('src/gameplay/game.js?v='));
  assert.ok(idx('src/gameplay/gravity-shift.js?v=')<idx('src/camera/adaptive-camera.js?v='));
  assert.match(html,/meta name="chroma-build"[^>]*adaptive-camera-horizon-1\.0/);
  assert.match(game,/camera\.tick\(dt,speed,\{reducedMotion\}\)/);
  assert.match(game,/camera\.reset\(speed\)/);
  assert.match(game,/camera\.visibleRight\(W,player\.x\)/);
  assert.match(game,/camera\.view\(W,H,player\.x,floorY\)/);
  assert.match(game,/camera\.setTide\(spectralWave/);
  assert.match(game,/FAIR\.warning\(\{hurdles,gaps:terrain\.gaps,distance,/);
  assert.match(game,/shieldCores\.startFlight\(camera\.screenX\(reward\.x,player\.x\)/);
  assert.ok(game.indexOf('gravityShift.applyCourseTransform(ctx,H)')<
    game.indexOf('camera.apply(ctx,player.x,floorY)'));
  assert.ok(game.indexOf('ctx.restore(); \/\/ HUD and warnings are upright')<
    game.indexOf('FAIR.drawWarning(ctx,cue'));
  assert.doesNotMatch(game,/ctx\.scale\([^)]*camera\.zoom[^)]*\)[\s\S]*HUD\.update/);
});
