const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {SpectralWave,blendHex}=require('../src/render/spectral-wave.js');
const {PALETTES,GAME}=require('../src/core/config.js');
const A=PALETTES[0],B=PALETTES[1];

function scene(){
  const w=new SpectralWave();
  w.start({from:A,to:B,width:1000,duration:.9});
  return w;
}
function mockCanvas(){
  const calls={moveTo:0,lineTo:0,clip:0,stroke:0,fillRect:0};
  const ctx={
    save(){},restore(){},beginPath(){},closePath(){},clip(){calls.clip++},
    moveTo(){calls.moveTo++},lineTo(){calls.lineTo++},
    stroke(){calls.stroke++},fillRect(){calls.fillRect++},
    createLinearGradient(){return {addColorStop(){}}},
    arc(){throw Error('Spectral Wave may not draw circular rings')},
    ellipse(){throw Error('Spectral Wave may not draw circular rings')}
  };
  return {ctx,calls};
}
test('right-to-left color-front enters offscreen and leaves fully offscreen',()=>{
  const wave=scene();
  assert.ok(wave.frontAt(360)>1000,'the old zone is intact when the new zone begins');
  const first=wave.frontAt(360);
  wave.tick(.2,{playerX:300,playerY:360});
  const second=wave.frontAt(360);
  assert.ok(second<first,'the wave must travel right to left');
  wave.tick(.69,{playerX:300,playerY:360});
  assert.ok(wave.frontAt(360)<0);
  assert.equal(wave.active,true);
  wave.tick(.01,{playerX:300,playerY:360});
  assert.equal(wave.active,false);
});

test('world colors change by spatial position instead of a full-screen fade',()=>{
  const wave=scene();
  wave.tick(.45,{playerX:300,playerY:360});
  assert.equal(wave.colorAt(100,'primary',360),A.primary);
  assert.equal(wave.colorAt(900,'primary',360),B.primary);
  const front=wave.frontAt(360);
  const middle=wave.colorAt(front,'primary',360);
  assert.notEqual(middle,A.primary);
  assert.notEqual(middle,B.primary);
  assert.equal(wave.colorAt(100,'shadow',360),A.shadow);
  assert.equal(wave.colorAt(900,'shadow',360),B.shadow);
});

test('the color front passes the runner once and only once per zone',()=>{
  const wave=scene();
  let pulses=0;
  for(let i=0;i<70;i++)pulses+=Number(wave.tick(1/60,{playerX:265,playerY:515}));
  assert.equal(pulses,1);
  assert.equal(wave.playerCrossed,true);
  assert.equal(wave.active,false);
});

test('spectral timing and crossing are based on game time, not FPS',()=>{
  const coarse=scene(),fine=scene();
  coarse.tick(.25,{playerX:300,playerY:515});
  for(let i=0;i<15;i++)fine.tick(1/60,{playerX:300,playerY:515});
  assert.ok(Math.abs(coarse.frontAt(515)-fine.frontAt(515))<.00001);
  assert.equal(coarse.colorAt(900,'secondary',515),fine.colorAt(900,'secondary',515));
});

test('clip passes render old and new world in separate regions only while active',()=>{
  const wave=scene(),{ctx,calls}=mockCanvas(),frames=[];
  wave.drawLayer(ctx,1000,720,()=>frames.push('old'),()=>frames.push('new'));
  assert.deepEqual(frames,['old']);
  wave.tick(.45,{playerX:300,playerY:515});
  wave.drawLayer(ctx,1000,720,()=>frames.push('old'),()=>frames.push('new'));
  assert.deepEqual(frames,['old','old','new']);
  assert.equal(calls.clip,2);
  assert.ok(calls.lineTo>20,'a warped vertical edge defines each clip region');
  wave.tick(.45,{playerX:300,playerY:515});
  wave.drawLayer(ctx,1000,720,()=>frames.push('old'),()=>frames.push('new'));
  assert.equal(frames.at(-1),'new');
});

test('spectral glow is a restrained line-based effect without rings or dark masks',()=>{
  const wave=scene(),{ctx,calls}=mockCanvas();
  wave.tick(.4,{playerX:300,playerY:515});
  assert.doesNotThrow(()=>wave.draw(ctx,{width:1000,height:720,groundY:515,quality:{density:1,glow:1}}));
  const high=calls.stroke;
  assert.ok(high>=10);
  assert.ok(calls.fillRect>0);
  const reduced={ctx:mockCanvas().ctx};
  assert.doesNotThrow(()=>wave.draw(reduced.ctx,{width:1000,height:720,groundY:515,quality:{density:.36,glow:.24}}));
  const low=mockCanvas();
  wave.draw(low.ctx,{width:1000,height:720,quality:{density:.36,glow:.24}});
  assert.ok(low.calls.stroke<high,'Performance graphics should use fewer streaks');
});

test('zone charge has no in-world scout, square, ground mark or premature flash',()=>{
  const wave=new SpectralWave();
  wave.start({from:A,to:B,width:1000,duration:.9,chargeDuration:.23});
  wave.tick(.16,{playerX:300,playerY:515});
  assert.equal(wave.charging,true);
  assert.equal(wave.progress,0,'palette front does not travel during audio charge');
  assert.equal(wave.colorAt(950,'primary',515),A.primary);
  const {ctx,calls}=mockCanvas(),passes=[];
  wave.draw(ctx,{width:1000,height:720,groundY:515,quality:{density:1,glow:1}});
  assert.equal(calls.stroke,0,'NO physical-looking vertical tip or parallel ground rails');
  assert.equal(calls.fillRect,0,'NO grounded luminous rectangle or separate scout');
  wave.drawLayer(ctx,1000,720,()=>passes.push('old'),()=>passes.push('new'));
  assert.deepEqual(passes,['old']);
  wave.tick(.08,{playerX:300,playerY:515});
  assert.equal(wave.charging,false);
  assert.ok(wave.progress>0);
  assert.ok(wave.frontAt(515)<wave.width+150);
});

test('delayed color front still crosses player once at either frame rate',()=>{
  const coarse=new SpectralWave(),fine=new SpectralWave();
  for(const wave of [coarse,fine])
    wave.start({from:A,to:B,width:1000,duration:.9,chargeDuration:.23});
  coarse.tick(.5,{playerX:300,playerY:515});
  for(let i=0;i<30;i++)fine.tick(1/60,{playerX:300,playerY:515});
  assert.ok(Math.abs(coarse.frontAt(515)-fine.frontAt(515))<1e-5);
  let crossings=0;
  for(let i=0;i<45;i++)crossings+=Number(fine.tick(1/60,{playerX:300,playerY:515}));
  assert.equal(crossings,1);
  assert.equal(fine.active,false);
  assert.equal(fine.playerCrossed,true);
  const {ctx,calls}=mockCanvas();
  fine.draw(ctx,{width:1000,height:720,groundY:515});
  assert.ok(calls.stroke>0,'Spectacle leaves a short finite visual afterglow');
  fine.tick(1);
  const ended=mockCanvas();
  fine.draw(ended.ctx,{width:1000,height:720,groundY:515});
  assert.equal(ended.calls.stroke,0,'afterglow expires instead of persisting forever');
});

test('reduced motion disables the pre-pulse, just as it disables the wave',()=>{
  const wave=new SpectralWave();
  wave.start({from:A,to:B,width:1000,chargeDuration:.23,reducedMotion:true});
  assert.equal(wave.charging,false);
  assert.equal(wave.active,false);
  assert.equal(wave.colorAt(950,'primary'),B.primary);
});

test('reduced-motion immediately chooses the next palette and never animates',()=>{
  const wave=new SpectralWave();
  assert.equal(wave.start({from:A,to:B,reducedMotion:true}),false);
  assert.equal(wave.colorAt(100,'primary'),B.primary);
  assert.equal(wave.tick(.5),false);
  const {ctx,calls}=mockCanvas(),layers=[];
  wave.drawLayer(ctx,1000,720,()=>layers.push('old'),()=>layers.push('new'));
  wave.draw(ctx,{width:1000,height:720,groundY:515});
  assert.deepEqual(layers,['new']);
  assert.equal(calls.stroke,0);
});

test('wave reset and restart cannot leak the previous zone transition',()=>{
  const wave=scene();wave.tick(.65,{playerX:300,playerY:500});
  wave.reset();assert.equal(wave.active,false);
  wave.start({from:B,to:A,width:1000});
  assert.equal(wave.colorAt(100,'primary'),B.primary);
  assert.equal(wave.colorAt(900,'primary'),B.primary);
});

test('colors preserve gamut endpoints and the wave leaves game rules untouched',()=>{
  assert.equal(blendHex(A.primary,B.primary,0),A.primary);
  assert.equal(blendHex(A.primary,B.primary,1),B.primary);
  assert.equal(GAME.zoneSeconds,12);
  assert.equal(GAME.baseSpeed,370);
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(game,/spectralWave\.tick\(dt/);
  assert.doesNotMatch(game,/spectralWave\.drawLayer\(/,
    'Chroma Tide 2.0 renders each world/terrain layer once');
  assert.match(game,/spectralWave\.colorAt\(/);
  assert.match(game,/spectralWave\.draw\(ctx/);
});
test('release HTML loads spectral module before game and advertises its build',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const wave=html.indexOf('src/render/spectral-wave.js?v=spectral-wave-1.0');
  const game=html.indexOf('src/gameplay/game.js?v=arcade-animation-2.0');
  assert.ok(wave>0&&game>wave);
  assert.match(html,/<meta name="chroma-build" content="original-background-restored-1\.0-chroma-pulse-1\.0-gravity-1\.0-ceiling-sync-1\.0-movement-1\.0-duck-gate-1\.0-echo-spire-1\.0-aware-1\.0-fairness-1\.0-jump-visual-1\.0-combo-1\.0-speed-curve-3\.2-echo-polish-1\.1-echo-zone2-1\.2-no-scout-1\.1-tide-2\.0-spectacle-1\.0-dash-2\.5-shield-core-1\.0-dash-hazards-1\.0-dash-pacing-1\.1-spectrum-2\.0-dash-reliability-1\.2-ui-calm-1\.0-dash-polish-2\.0-director-flow-2\.0-performance-stability-2\.0-chroma-identity-visual-polish-1\.0-player-identity-2\.0-chroma-tide-energy-3\.0-premium-arcade-ui-4\.0-dash-hazard-zigzag-geometry-2\.1-adaptive-camera-horizon-1\.1-advanced-spacing-2\.2-echo-rail-1\.0-twin-vault-2\.3-energy-veil-1\.1-raised-jump-1\.2-gate-unification-1\.3-obstacle-director-balance-3\.0-endurance-mastery-4\.0(?:-arcade-simplification-1\.0)?(?:-core-gameplay-excellence-1\.0)?(?:-core-pace-gravity-1\.1)?(?:-phase-2-chroma-surge-1\.0)?(?:-action-density-2\.0)?(?:-rush-chains-3\.0)?(?:-endless-escalation-4\.0)?(?:-visual-signature-2\.0)?"/);
  assert.match(html,/LATEST UPDATE · (?:PREMIUM ARCADE UI 4\.0|ARCADE SIMPLIFICATION 1\.0|CORE PACE 1\.1|CHROMA SURGE 1\.0|ACTION DENSITY 2\.0|RUSH CHAINS 3\.0|ENDLESS ESCALATION 4\.0|VISUAL SIGNATURE 2\.0)/);
});
