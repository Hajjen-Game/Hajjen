const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {SpectralWave}=require('../src/render/spectral-wave.js');
const {drawBackground}=require('../src/render/world-background.js');
const {drawTerrain}=require('../src/render/terrain-renderer.js');
const {PALETTES,GAME}=require('../src/core/config.js');
const from=PALETTES[0],to=PALETTES[1];
function canvas(){
  const calls={fills:0,strokes:0,clips:0,linears:[],radials:[],texts:0,lines:0};
  const ctx={
    save(){},restore(){},beginPath(){},closePath(){},moveTo(){},lineTo(){calls.lines++},
    clip(){calls.clips++},fill(){},stroke(){calls.strokes++},fillRect(){calls.fills++},
    fillText(){calls.texts++},setTransform(){},
    createLinearGradient(...args){
      const stops=[];calls.linears.push({args,stops});
      return {addColorStop:(at,color)=>stops.push([at,color])};
    },
    createRadialGradient(...args){
      const stops=[];calls.radials.push({args,stops});
      return {addColorStop:(at,color)=>stops.push([at,color])};
    },
    arc(){throw Error('No 2D ring pulses allowed')},
    ellipse(){throw Error('No 2D ring pulses allowed')}
  };
  return {ctx,calls};
}
function tide(quality={density:1,glow:1}){
  const wave=new SpectralWave();
  wave.start({from,to,width:1280,duration:.86,chargeDuration:.19});
  wave.tick(.48,{playerX:340,playerY:500,height:720});
  return {wave,quality};
}
const segments=[
  {type:'flat',start:0,end:620,y0:515,y1:515},
  {type:'gap',start:620,end:760,y0:515,y1:515},
  {type:'flat',start:760,end:1700,y0:515,y1:515}
];
const glowLine=()=>{};
test('perceptual LUT is prepared once per zone change and remains bounded for EVERY palette',()=>{
  const w=new SpectralWave();
  for(let i=0;i<PALETTES.length;i++){
    const a=PALETTES[i],b=PALETTES[(i+1)%PALETTES.length];
    w.start({from:a,to:b,width:1280,duration:.86,chargeDuration:.19});
    assert.equal(w.ramps.primary.length,65);
    for(const channel of ['primary','secondary','shadow']){
      assert.equal(w.ramps[channel][0],a[channel]);
      assert.equal(w.ramps[channel][64],b[channel]);
      for(const color of w.ramps[channel])assert.match(color,/^#[0-9a-f]{6}$/);
    }
    w.tick(.55,{playerX:340,playerY:515});
    const old=w.colorAt(0,'primary',515,720);
    const next=w.colorAt(1250,'primary',515,720);
    assert.equal(old,a.primary);
    assert.equal(next,b.primary);
  }
});
test('the spatial tint has exact old and new sides, and 0–1 ordered gradient stops',()=>{
  const {wave}=tide();
  const {ctx,calls}=canvas();
  const gradient=wave.gradient(ctx,1280,'primary',515,720);
  assert.ok(gradient&&typeof gradient.addColorStop==='function');
  const stops=calls.linears.at(-1).stops;
  assert.equal(stops[0][1],from.primary);
  assert.equal(stops.at(-1)[1],to.primary);
  assert.ok(stops.every(([x],i)=>x>=0&&x<=1&&(i===0||x>=stops[i-1][0])));
  assert.equal(wave.gradient(ctx,1280,'secondary',515,720)!==null,true);
});
test('charge previews only ambient hue — no ground marker, cue box or camera flash',()=>{
  const w=new SpectralWave();
  w.start({from,to,width:1280,duration:.86,chargeDuration:.19});
  w.tick(.12,{playerX:340,playerY:515});
  assert.equal(w.charging,true);
  assert.equal(w.colorAt(1200,'primary'),from.primary);
  const {ctx,calls}=canvas();
  w.draw(ctx,{width:1280,height:720,groundY:515});
  assert.equal(calls.fills,0);
  assert.equal(calls.strokes,0);
  drawBackground({ctx,width:1280,height:720,primary:to.primary,
    secondary:to.secondary,shadow:to.shadow,time:10,speed:500,
    glowLine,quality:{density:.36,glow:.24},tide:w});
  assert.ok(calls.fills>8,'only the original full-width atmosphere is painted');
  assert.equal(calls.clips,0,'no old/new double-paint clipping');
  assert.equal(calls.texts,0,'no word-like obstruction');
});
test('both world and track render exactly once while wave changes their palette',()=>{
  const {wave}=tide();
  const {ctx,calls}=canvas();
  drawBackground({ctx,width:1280,height:720,primary:to.primary,
    secondary:to.secondary,shadow:to.shadow,time:8,speed:600,glowLine,
    quality:{density:.65,glow:.64},tide:wave});
  drawTerrain({ctx,width:1280,height:720,baseY:515,
    terrain:{segments},distance:0,flow:40,
    primary:to.primary,secondary:to.secondary,glowLine,
    quality:{density:.65,glow:.64,terrainStep:24,gridStep:145},tide:wave});
  assert.equal(calls.clips,3,
    'two lightweight atmospheric palette clips plus ONE real ground mask');
  assert.ok(calls.linears.some(x=>x.stops.length===4&&x.stops[0][1]===from.primary),
    'single-pass horizontal gradient carries both palettes');
  assert.ok(calls.strokes>0);
  assert.ok(calls.fills>4);
  assert.equal(calls.texts,1,'existing hazard/gap cue is preserved');
});
test('the wave itself uses a fixed low-cost glow budget even in forced High',()=>{
  const h=tide({density:1,glow:1});
  const high=canvas(),low=canvas();
  h.wave.draw(high.ctx,{width:1280,height:720,groundY:515,quality:{density:1,glow:1}});
  h.wave.draw(low.ctx,{width:1280,height:720,groundY:515,quality:{density:.36,glow:.24}});
  assert.ok(high.calls.strokes>low.calls.strokes);
  assert.ok(high.calls.strokes<=16,'bounded front draw calls in High');
  assert.ok(high.calls.fills<=2,'two localized translucent front veils, no full-screen flash');
  assert.equal(high.calls.clips,0,'no expensive duplicated scene clip');
  assert.equal(high.calls.texts,0,'never write a floating JUMP-like label');
});
test('crossing triggers exactly one music cue and short linear resonance with no rings',()=>{
  const w=new SpectralWave();w.start({from,to,width:1280,duration:.86,chargeDuration:.19});
  let hits=0;
  for(let i=0;i<70;i++)hits+=Number(w.tick(1/60,{playerX:330,playerY:515,height:720}));
  assert.equal(hits,1);
  assert.equal(w.playerCrossed,true);
  assert.equal(w.active,false);
  assert.ok(w.afterglow>0,'brief bounded afterglow now follows the completed tide');
  w.tick(.9);assert.equal(w.afterglow,0,'afterglow always expires');
  assert.equal(GAME.zoneSeconds,12);
});
test('reduced-motion bypasses all visual tide rendering, not zone rules',()=>{
  const w=new SpectralWave();
  assert.equal(w.start({from,to,width:1280,reducedMotion:true}),false);
  assert.equal(w.colorAt(0,'primary'),to.primary);
  const {ctx,calls}=canvas();
  w.draw(ctx,{width:1280,height:720,groundY:515});
  assert.equal(calls.strokes,0);
  assert.equal(calls.fills,0);
});
test('arcade render calls scenery exactly ONCE per frame, not old and new twice',()=>{
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  const world=game.slice(game.indexOf('  function drawWorld(t){'),game.indexOf('  function drawObstacle('));
  assert.equal((world.match(/worldBackground\.drawBackground\(/g)||[]).length,1);
  assert.equal((world.match(/terrainRender\.drawTerrain\(/g)||[]).length,1);
  assert.doesNotMatch(world,/spectralWave\.drawLayer\(/);
  assert.match(world,/tide:spectralWave\.active\?spectralWave:null/);
  assert.match(game,/spectralWave\.tick\(dt/);
  assert.match(game,/spectralWave\.draw\(ctx/);
  assert.match(game,/sound\('zone-charge'\)/);
});
