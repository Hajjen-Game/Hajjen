/* Premium World Lighting & Cohesion 3.0 — MATERIAL, not particle passes. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {evaluate,shellGradient}=require('../src/render/world-lighting.js');
const {drawBackground}=require('../src/render/world-background.js');
const {drawTerrain}=require('../src/render/terrain-renderer.js');
const {paintPlayer}=require('../src/render/chroma-identity.js');
const {PALETTES,GAME}=require('../src/core/config.js');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function recorder(){
  const trace={gradients:[],rects:[],strokes:0,fills:0,clips:0,paths:0,lines:0};
  let body=[];
  const ctx={
    save(){},restore(){},beginPath(){trace.paths++},
    moveTo(x,y){body.push([x,y])},lineTo(x,y){trace.lines++;body.push([x,y])},
    closePath(){},clip(){trace.clips++},stroke(){trace.strokes++},
    fill(){trace.fills++},fillRect(...v){trace.rects.push(v)},fillText(){},
    createLinearGradient(...args){const g={type:'linear',args,stops:[]};trace.gradients.push(g);
      return {addColorStop(stop,color){g.stops.push([stop,color])}};},
    createRadialGradient(...args){const g={type:'radial',args,stops:[]};trace.gradients.push(g);
      return {addColorStop(stop,color){g.stops.push([stop,color])}};}
  };
  return {ctx,trace};
}
const high={glow:1,density:1,gridStep:105,terrainStep:16};
const performance={glow:.24,density:.36,gridStep:210,terrainStep:36};

test('one deterministic light envelope brightens sky, terrain, cube and hazards together',()=>{
  const low=evaluate({flow:0,surge:0,quality:high});
  const highFlow=evaluate({flow:100,surge:1,quality:high});
  const weak=evaluate({flow:100,surge:1,quality:performance});
  assert.ok(highFlow.energy>low.energy);
  for(const [part,key] of [['sky','key'],['sky','bounce'],['terrain','surface'],
    ['terrain','bounce'],['player','ambient'],['hazard','shell'],['hazard','border']])
    assert.ok(highFlow[part][key]>low[part][key],part+'.'+key);
  assert.ok(highFlow.sky.key>weak.sky.key);
  assert.ok(highFlow.hazard.border>.70,'hazard edge stays legible on all tiers');
  assert.ok(weak.hazard.border>.70,'Performance may remove bloom, not the edge');
  assert.ok(weak.hazard.shell>=.30&&weak.hazard.veil>=.10);
  assert.deepEqual(evaluate({flow:75,surge:.3,quality:high}),
    evaluate({flow:75,surge:.3,quality:high}),
    'lighting does not use gameplay randomness or timers');
});

test('real palettes receive the same material roles without modifying Chroma Tide',()=>{
  for(const palette of PALETTES){
    const a=evaluate({flow:80,surge:.8,quality:high});
    const rec=recorder();
    shellGradient(rec.ctx,palette.primary,300,50,a);
    assert.equal(rec.trace.gradients.length,1);
    const g=rec.trace.gradients[0];
    assert.deepEqual(g.args,[0,300,0,350]);
    assert.deepEqual(g.stops.map(v=>v[0]),[0,.25,.75,1]);
    assert.ok(g.stops[0][1].startsWith('rgba(255,255,255,'));
    assert.ok(g.stops[1][1].startsWith('rgba('));
    assert.ok(g.stops.every(([t,c])=>Number.isFinite(t)&&!c.includes('NaN')));
  }
  assert.match(src('src/gameplay/game.js'),/spectralWave\.colorAt\(camera\.screenX\(o\.x,player\.x\)/);
  assert.match(src('src/render/spectral-wave.js'),/class SpectralWave/);
});

test('background changes light color in original gradients, not draw count or geometry',()=>{
  const p=PALETTES[2],base={width:1200,height:720,time:30,
    speed:1300,flow:80,primary:p.primary,secondary:p.secondary,
    shadow:p.shadow,quality:high};
  const a=recorder(),b=recorder();let linesA=0,linesB=0;
  drawBackground({...base,ctx:a.ctx,glowLine(){linesA++}});
  drawBackground({...base,ctx:b.ctx,lightRig:evaluate({flow:80,quality:high}),
    glowLine(){linesB++}});
  assert.equal(a.trace.rects.length,b.trace.rects.length);
  assert.equal(a.trace.gradients.length,b.trace.gradients.length);
  assert.equal(linesA,linesB);
  assert.equal(a.trace.gradients.filter(g=>g.type==='radial').length,2);
  assert.notDeepEqual(a.trace.gradients[1].stops,b.trace.gradients[1].stops);
  assert.ok(b.trace.gradients.every(g=>g.stops.every(([x])=>x>=0&&x<=1)));
});

test('track uses the exact existing solid clip, transparent gap, grid count and surface stroke',()=>{
  const p=PALETTES[4],terrain={segments:[
    {type:'flat',start:0,end:500,y0:515,y1:515},
    {type:'gap',start:500,end:610,y0:515,y1:515},
    {type:'flat',start:610,end:2500,y0:515,y1:515}]};
  const base={terrain,distance:0,width:1200,height:720,baseY:515,
    primary:p.primary,secondary:p.secondary,flow:75,quality:high};
  const a=recorder(),b=recorder();let linesA=0,linesB=0;
  drawTerrain({...base,ctx:a.ctx,glowLine(){linesA++}});
  drawTerrain({...base,ctx:b.ctx,lightRig:evaluate({flow:75,quality:high}),
    glowLine(){linesB++}});
  assert.equal(a.trace.clips,1);assert.equal(b.trace.clips,1);
  assert.equal(a.trace.strokes,b.trace.strokes);
  assert.equal(linesA,linesB);
  assert.deepEqual(a.trace.rects,b.trace.rects,'lighting adds no geometry or fake gap bridge');
  assert.equal(a.trace.gradients.length,b.trace.gradients.length);
  assert.notDeepEqual(a.trace.gradients[0].stops,b.trace.gradients[0].stops);
});

test('runner glass catches scene light with exactly the old fills and contour',()=>{
  const p=PALETTES[0],base={x:100,y:400,w:44,h:44,
    primary:p.primary,secondary:p.secondary,pose:{glow:0},
    motion:{},quality:high};
  const a=recorder(),b=recorder();let pathsA=0,pathsB=0;
  paintPlayer(a.ctx,{...base,ambientLight:0,bodyPath(){pathsA++}});
  paintPlayer(b.ctx,{...base,lightRig:evaluate({flow:60,quality:high}),
    bodyPath(){pathsB++}});
  assert.equal(pathsA,pathsB);
  assert.equal(a.trace.strokes,b.trace.strokes);
  assert.equal(a.trace.fills,b.trace.fills);
  assert.equal(a.trace.gradients.length,b.trace.gradients.length);
  assert.notDeepEqual(a.trace.gradients[0].stops,b.trace.gradients[0].stops);
});

test('all obstacle families share one body material without introducing new hazard shapes',()=>{
  const game=src('src/gameplay/game.js');
  const section=game.slice(game.indexOf('  function drawObstacle('),
    game.indexOf('  function drawPlayer('));
  assert.ok(section.length>2000);
  assert.match(section,/const material=typeof frameLighting==='undefined'\?null:frameLighting\?\.hazard/);
  assert.match(section,/worldLighting\.shellGradient\(ctx,color,y,h,frameLighting\)/);
  assert.match(section,/shell\(cap\.y,cap\.h,\.34\)/,'jump cap gets lit');
  assert.match(section,/shell\(y,h,\.30\)/,'large jump body gets lit');
  assert.match(section,/shell\(core\.y,core\.h,\.30\)/,'duck and long duck share the same light');
  assert.match(section,/material\?\.border\?\?\.68/);
  assert.match(section,/ctx\.shadowBlur=material\?\.bloom\?\?21\*quality\.profile\.glow/);
  assert.match(section,/const color=spectralWave\.colorAt/);
  assert.match(section,/GEO\.obstacleBox\(o,o\.groundY\)/);
  assert.doesNotMatch(section,/o\.width\s*=|o\.groundY\s*=|GEO\.obstacleBox\s*=/);
  assert.equal((section.match(/const material=typeof frameLighting/g)||[]).length,1);
});

test('game evaluates one shared rig per frame for sky, real track, hazards and runner',()=>{
  const game=src('src/gameplay/game.js'),html=src('index.html');
  assert.match(game,/frameLighting=worldLighting\?\.evaluate\(/);
  assert.match(game,/drawWorld\(worldTime\)/);
  assert.match(game,/drawTerrain\(\)/);
  assert.match(game,/for\(const o of hurdles\)drawObstacle\(o\)/);
  assert.match(game,/drawPlayer\(\)/);
  assert.match(game,/lightRig:frameLighting,bodyPath:playerPath/);
  assert.match(html,/src\/render\/world-lighting\.js\?v=premium-world-lighting-3\.0/);
  assert.match(html,/LATEST UPDATE · PREMIUM WORLD LIGHTING 3\.0/);
  assert.ok(html.indexOf('src/render/world-lighting.js')<
    html.indexOf('src/gameplay/game.js'));
  assert.doesNotMatch(game,/surge\.draw\(|surge\.drawRunner\(/);
  assert.match(game,/spectralWave\.draw\(ctx/);
  assert.equal(GAME.lateAcceleration,2.3);
  assert.equal(GAME.zoneSeconds,12);
});
