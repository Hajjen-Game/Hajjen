const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {SpectralWave}=require('../src/render/spectral-wave.js');
const {PALETTES,GAME}=require('../src/core/config.js');
const from=PALETTES[0],to=PALETTES[1];
function canvas(){
  const calls={fills:[],strokes:[],clips:0};
  const ctx={
    save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},
    stroke(){calls.strokes.push({alpha:this.globalAlpha,width:this.lineWidth})},
    fillRect(x,y,w,h){calls.fills.push({x,y,w,h,alpha:this.globalAlpha})},
    createLinearGradient(){return{addColorStop(){}}},
    arc(){throw Error('Tide cannot draw a ring')},
    ellipse(){throw Error('Tide cannot draw a circular burst')},
    clip(){calls.clips++}
  };
  return {ctx,calls};
}
function started({reducedMotion=false}={}){
  const w=new SpectralWave();
  w.start({from,to,width:1280,duration:.86,chargeDuration:.19,reducedMotion});
  return w;
}
test('the visible front has two bounded veils, more streaks on High and no false obstacle',()=>{
  const w=started();w.tick(.55,{playerX:350,playerY:500,height:720});
  const high=canvas(),low=canvas();
  w.draw(high.ctx,{width:1280,height:720,groundY:515,quality:{density:1,glow:1}});
  w.draw(low.ctx,{width:1280,height:720,groundY:515,quality:{density:.36,glow:.24}});
  assert.equal(high.calls.fills.length,2);
  assert.ok(high.calls.fills.every(fill=>fill.w>0&&fill.w<=600));
  assert.ok(high.calls.strokes.length>low.calls.strokes.length);
  assert.ok(high.calls.strokes.length<=16);
  assert.ok(low.calls.strokes.length<=9);
  assert.equal(high.calls.clips,0,'the front does not force extra world redraws');
});
test('accent excites only existing terrain behind the same spatial front',()=>{
  const w=started();w.tick(.51,{playerX:350,playerY:500,height:720});
  const f=w.frontAt(515,720);
  assert.equal(w.accentAt(f-110,515,720),0);
  assert.ok(w.accentAt(f+45,515,720)>.6);
  assert.equal(w.accentAt(f+260,515,720),0);
  const a=canvas();w.draw(a.ctx,{width:1280,height:720,groundY:515});
  assert.ok(a.calls.strokes.length>0);
});
test('resonance and afterglow persist briefly AFTER wave exit, then fully expire',()=>{
  const w=started();let crossings=0;
  for(let i=0;i<70;i++)crossings+=Number(w.tick(1/60,{playerX:350,playerY:515,height:720}));
  assert.equal(crossings,1);
  assert.equal(w.active,false);
  assert.ok(w.afterglow>0);
  const lingering=canvas();w.draw(lingering.ctx,{width:1280,height:720,groundY:515});
  assert.ok(lingering.calls.strokes.length>=3);
  assert.equal(lingering.calls.fills.length,0,'afterglow never paints a screen fade');
  w.tick(.95);
  assert.equal(w.afterglow,0);
  assert.equal(w.resonance,0);
  const done=canvas();w.draw(done.ctx,{width:1280,height:720,groundY:515});
  assert.equal(done.calls.strokes.length,0);
  assert.equal(done.calls.fills.length,0);
});
test('a new tide resets the previous trail and reduced motion never draws it',()=>{
  const w=started();
  for(let i=0;i<65;i++)w.tick(1/60,{playerX:360,playerY:515});
  assert.ok(w.afterglow>0);
  w.start({from:to,to:from,width:1280,reducedMotion:true});
  assert.equal(w.afterglow,0);
  assert.equal(w.resonance,0);
  assert.equal(w.active,false);
  const c=canvas();w.draw(c.ctx,{width:1280,height:720,groundY:515});
  assert.equal(c.calls.strokes.length,0);
  assert.equal(c.calls.fills.length,0);
  assert.equal(w.colorAt(600,'primary'),from.primary);
});
test('release label and versioned assets expose the actual Spectacle build',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/LATEST UPDATE · PREMIUM ARCADE UI 4\.0/);
  assert.match(html,/name="chroma-build" content="[^"]*tide-2\.0-spectacle-1\.0-dash-2\.5-shield-core-1\.0-dash-hazards-1\.0-dash-pacing-1\.1-spectrum-2\.0-dash-reliability-1\.2-ui-calm-1\.0-dash-polish-2\.0-director-flow-2\.0-performance-stability-2\.0-chroma-identity-visual-polish-1\.0-player-identity-2\.0-chroma-tide-energy-3\.0-premium-arcade-ui-4\.0-dash-hazard-pure-geometry-2\.0-adaptive-camera-horizon-1\.1"/);
  for(const file of ['spectral-wave','terrain-renderer','world-background'])
    assert.match(html,new RegExp('src/render/'+file+'\\.js\\?v=[^"]*spectacle-1\\.0'));
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  const world=game.slice(game.indexOf('  function drawWorld(t){'),game.indexOf('  function drawObstacle('));
  assert.equal((world.match(/worldBackground\.drawBackground\(/g)||[]).length,1);
  assert.equal((world.match(/terrainRender\.drawTerrain\(/g)||[]).length,1);
  assert.equal(GAME.zoneSeconds,12);
});
