const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const original=require('../src/render/world-background.js');
const {PALETTES,GAME}=require('../src/core/config.js');
// The drawing layout from the original scenery remains stable; the renderer
// now includes intentional per-color spatial tinting for Chroma Tide 2.0.

function paint(overrides={}){
  const ops=[];
  const log=k=>(...args)=>ops.push([k,...args]);
  const ctx={
    fillRect:log('rect'),save:log('save'),restore:log('restore'),
    createLinearGradient(...args){ops.push(['linear',...args]);return{addColorStop:log('stop')}},
    createRadialGradient(...args){ops.push(['radial',...args]);return{addColorStop:log('stop')}}
  };
  const p=PALETTES[3];
  original.drawBackground({ctx,width:900,height:720,time:7,speed:850,flow:67,
    primary:p.primary,secondary:p.secondary,shadow:p.shadow,
    quality:{density:.65},glowLine:log('line'),...overrides});
  return ops;
}
test('original scene composition and single public render entry remain preserved',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../src/render/world-background.js'),'utf8');
  assert.match(source,/Full Background Continuity 1\.0/);
  assert.match(source,/const horizon=H\*\.47/);
  assert.match(source,/facadeStride/);
  assert.match(source,/Math\.round\(58\*quality\.density\)/);
  assert.match(source,/const sky=ctx\.createLinearGradient\(0,0,0,H\)/);
  assert.match(source,/const lower=ctx\.createRadialGradient/);
  assert.match(source,/tide\.ambientColor/,'only palette tinting changes');
  assert.deepEqual(Object.keys(original),['drawBackground']);
});
test('original starfield, faint columns and horizontal streaks remain; no mountains or towers from 2.0/2.1',()=>{
  const ops=paint();
  assert.ok(ops.filter(x=>x[0]==='rect').length>16);
  assert.ok(ops.filter(x=>x[0]==='line').length>=8);
  assert.equal(ops.filter(x=>x[0]==='linear').length,2);
  assert.equal(ops.filter(x=>x[0]==='radial').length,2);
  const text=fs.readFileSync(path.join(__dirname,'../src/render/world-background.js'),'utf8');
  assert.doesNotMatch(text,/ridgeProfile|drawLandscape|drawArchitecture|landscapeHeight|THEMES|PARALLAX/);
});
test('original atmospheric gradient still covers all gap pixels without terrain inputs',()=>{
  for(const [width,height] of [[720,720],[900,560],[1536,720]]){
    const ops=paint({width,height});
    assert.deepEqual(ops.filter(x=>x[0]==='rect').slice(0,4),
      Array.from({length:4},()=>['rect',0,0,width,height]));
  }
});
test('time animates the original scene and quality budget adjusts details',()=>{
  const start=paint({time:0}),moved=paint({time:6});
  assert.notDeepEqual(start,moved);
  assert.ok(paint({quality:{density:1}}).length>paint({quality:{density:.36}}).length);
  assert.deepEqual(paint({time:6}),paint({time:6}));
});
test('Spectral Wave and all new Arcade Animation assets remain wired unchanged',()=>{
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.doesNotMatch(game,/spectralWave\.drawLayer\(ctx,W,H,/,
    'visual compositing no longer double-paints the scene');
  assert.match(game,/worldBackground\.drawBackground\(/);
  assert.match(game,/terrainRender\.drawTerrain\(/);
  assert.match(game,/tide:spectralWave\.active\?spectralWave:null/);
  assert.match(game,/effects\.cue\('precision'/);
  assert.match(game,/speedTrails\.draw\(ctx/);
  assert.match(html,/name="chroma-build" content="original-background-restored-1\.0-chroma-pulse-1\.0-gravity-1\.0-ceiling-sync-1\.0-movement-1\.0-duck-gate-1\.0-echo-spire-1\.0-aware-1\.0-fairness-1\.0-jump-visual-1\.0-combo-1\.0-speed-curve-2\.0-echo-polish-1\.1-echo-zone2-1\.2-no-scout-1\.1-tide-2\.0-spectacle-1\.0-dash-2\.5"/);
  assert.match(html,/world-background\.js\?v=original-background-restored-1\.0/);
  assert.match(html,/src\/gameplay\/game\.js\?v=arcade-animation-2\.0/);
  assert.equal(GAME.baseSpeed,370);
});
